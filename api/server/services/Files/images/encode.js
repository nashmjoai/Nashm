const axios = require('axios');
const { logger } = require('@nashm/data-schemas');
const { logAxiosError, validateImage } = require('@nashm/api');
const {
  FileSources,
  VisionModes,
  ImageDetail,
  ContentTypes,
  EModelEndpoint,
  mergeFileConfig,
  getEndpointFileConfig,
} = require('nashm-data-provider');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');

/**
 * Converts a readable stream to a base64 encoded string.
 *
 * @param {NodeJS.ReadableStream} stream - The readable stream to convert.
 * @param {boolean} [destroyStream=true] - Whether to destroy the stream after processing.
 * @returns {Promise<string>} - Promise resolving to the base64 encoded content.
 */
async function streamToBase64(stream, destroyStream = true) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const base64Data = buffer.toString('base64');
        chunks.length = 0; // Clear the array
        resolve(base64Data);
      } catch (err) {
        reject(err);
      }
    });

    stream.on('error', (error) => {
      chunks.length = 0;
      reject(error);
    });
  }).finally(() => {
    // Clean up the stream if required
    if (destroyStream && stream.destroy && typeof stream.destroy === 'function') {
      stream.destroy();
    }
  });
}

/**
 * Fetches an image from a URL and returns its base64 representation.
 *
 * @async
 * @param {string} url The URL of the image.
 * @returns {Promise<string>} The base64-encoded string of the image.
 * @throws {Error} If there's an issue fetching the image or encoding it.
 */
async function fetchImageToBase64(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });
    const base64Data = Buffer.from(response.data).toString('base64');
    response.data = null;
    return base64Data;
  } catch (error) {
    const message = 'Error fetching image to convert to base64';
    throw new Error(logAxiosError({ message, error }));
  }
}

const base64Only = new Set([
  EModelEndpoint.google,
  EModelEndpoint.anthropic,
  'Ollama',
  'ollama',
  EModelEndpoint.bedrock,
]);

const blobStorageSources = new Set([
  FileSources.azure_blob,
  FileSources.s3,
  FileSources.firebase,
  FileSources.cloudfront,
]);

/**
 * Encodes and formats the given files.
 * @param {ServerRequest} req - The request object.
 * @param {Array<MongoFile>} files - The array of files to encode and format.
 * @param {object} params - Object containing provider/endpoint information
 * @param {Providers | EModelEndpoint | string} [params.provider] - The provider for the image
 * @param {string} [params.endpoint] - Optional: The endpoint for the image
 * @param {string} [mode] - Optional: The endpoint mode for the image.
 * @returns {Promise<{ files: MongoFile[]; image_urls: MessageContentImageUrl[] }>} - A promise that resolves to the result object containing the encoded images and file details.
 */
async function encodeAndFormat(req, files, params, mode) {
  const { provider, endpoint } = params;
  const effectiveEndpoint = endpoint ?? provider;
  const promises = [];
  /** @type {Record<FileSources, Pick<ReturnType<typeof getStrategyFunctions>, 'prepareImagePayload' | 'getDownloadStream'>>} */
  const encodingMethods = {};
  /** @type {{ files: MongoFile[]; image_urls: MessageContentImageUrl[] }} */
  const result = {
    files: [],
    image_urls: [],
  };

  if (!files || !files.length) {
    return result;
  }

  for (let file of files) {
    /** @type {FileSources} */
    const source = file.source ?? FileSources.local;

    if (!file.height) {
      promises.push([file, null]);
      continue;
    }

    if (!encodingMethods[source]) {
      const { prepareImagePayload, getDownloadStream } = getStrategyFunctions(source);
      if (!prepareImagePayload) {
        throw new Error(`Encoding function not implemented for ${source}`);
      }

      encodingMethods[source] = { prepareImagePayload, getDownloadStream };
    }

    const preparePayload = encodingMethods[source].prepareImagePayload;
    /* We need to fetch the image and convert it to base64 if we are using S3/Azure Blob/Firebase storage. */
    if (blobStorageSources.has(source)) {
      const downloadStream = encodingMethods[source].getDownloadStream;

      /* Race S3-SDK stream against an HTTP fetch of the signed URL.
         The SDK path is faster when the key exists; the HTTP path
         covers the "key not found" / encoding-mismatch case without
         an extra sequential round-trip.
         Both promises get a .catch() so the loser never causes an
         unhandled-rejection crash. */
      const streamPromise = (async () => {
        let stream = await downloadStream(req, file.filepath);
        const base64Data = await streamToBase64(stream);
        stream = null;
        return [file, base64Data];
      })().catch((err) => {
        logger.error('S3 stream path failed:', err);
        throw err;
      });

      const httpPromise = (async () => {
        const [_file, imageURL] = await preparePayload(req, file);
        if (!imageURL || typeof imageURL !== 'string' || !imageURL.startsWith('http')) {
          throw new Error('No valid signed URL available');
        }
        const base64Data = await fetchImageToBase64(imageURL);
        return [_file, base64Data];
      })().catch((err) => {
        logger.error('HTTP signed-URL path failed:', err);
        throw err;
      });

      try {
        const result = await Promise.any([streamPromise, httpPromise]);
        promises.push(result);
        continue;
      } catch (aggError) {
        logger.error('All image fetch methods failed for blob storage:', aggError);
        throw new Error(`Failed to process image from blob storage: ${file.filename}`);
      }
    } else if (source !== FileSources.local && base64Only.has(effectiveEndpoint)) {
      const [_file, imageURL] = await preparePayload(req, file);
      promises.push([_file, await fetchImageToBase64(imageURL)]);
      continue;
    }
    promises.push(preparePayload(req, file));
  }

  const detail = req.body.imageDetail ?? ImageDetail.auto;

  /** @type {Array<[MongoFile, string]>} */
  const formattedImages = await Promise.all(promises);
  promises.length = 0;

  /** Extract configured file size limit from fileConfig for this endpoint */
  let configuredFileSizeLimit;
  if (req.config?.fileConfig) {
    const fileConfig = mergeFileConfig(req.config.fileConfig);
    const endpointConfig = getEndpointFileConfig({
      fileConfig,
      endpoint: effectiveEndpoint,
    });
    configuredFileSizeLimit = endpointConfig?.fileSizeLimit;
  }

  for (const [file, imageContent] of formattedImages) {
    const fileMetadata = {
      type: file.type,
      file_id: file.file_id,
      filepath: file.filepath,
      filename: file.filename,
      embedded: !!file.embedded,
      metadata: file.metadata,
    };

    if (file.height && file.width) {
      fileMetadata.height = file.height;
      fileMetadata.width = file.width;
    }

    if (!imageContent) {
      result.files.push(fileMetadata);
      continue;
    }

    /** Validate image buffer against size limits */
    if (file.height && file.width) {
      const imageBuffer = imageContent.startsWith('http')
        ? null
        : Buffer.from(imageContent, 'base64');

      if (imageBuffer) {
        const validation = await validateImage(
          imageBuffer,
          imageBuffer.length,
          effectiveEndpoint,
          configuredFileSizeLimit,
        );

        if (!validation.isValid) {
          throw new Error(`Image validation failed for ${file.filename}: ${validation.error}`);
        }
      }
    }

    const imagePart = {
      type: ContentTypes.IMAGE_URL,
      image_url: {
        url: imageContent.startsWith('http')
          ? imageContent
          : `data:${file.type};base64,${imageContent}`,
        detail,
      },
    };

    if (mode === VisionModes.agents) {
      result.image_urls.push({ ...imagePart });
      result.files.push({ ...fileMetadata });
      continue;
    }

    if (
      effectiveEndpoint &&
      effectiveEndpoint === EModelEndpoint.google &&
      mode === VisionModes.generative
    ) {
      delete imagePart.image_url;
      imagePart.inlineData = {
        mimeType: file.type,
        data: imageContent,
      };
    } else if (effectiveEndpoint && effectiveEndpoint === EModelEndpoint.google) {
      imagePart.image_url = imagePart.image_url.url;
    } else if (effectiveEndpoint && effectiveEndpoint === EModelEndpoint.anthropic) {
      imagePart.type = 'image';
      imagePart.source = {
        type: 'base64',
        media_type: file.type,
        data: imageContent,
      };
      delete imagePart.image_url;
    }

    result.image_urls.push({ ...imagePart });
    result.files.push({ ...fileMetadata });
  }
  formattedImages.length = 0;
  return { ...result };
}

module.exports = {
  encodeAndFormat,
};
