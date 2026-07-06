const path = require('path');
const sharp = require('sharp');
const { v4 } = require('uuid');
const { GoogleGenAI } = require('@google/genai');
const { logger } = require('@nashm/data-schemas');
const { tool } = require('@librechat/agents/langchain/tools');
const { ContentTypes, EImageOutputType } = require('nashm-data-provider');
const {
  geminiToolkit,
  loadServiceKey,
  getBalanceConfig,
  getEnvProxyDispatcher,
  getTransactionsConfig,
} = require('@nashm/api');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');
const { spendTokens, getFiles } = require('~/models');

/**
 * Configure proxy support for Google APIs
 * This wraps globalThis.fetch to add a proxy dispatcher only for googleapis.com URLs
 * This is necessary because @google/genai SDK doesn't support custom fetch or httpOptions.dispatcher
 */
const googleApiProxyDispatcher = getEnvProxyDispatcher();
if (googleApiProxyDispatcher) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = function (url, options = {}) {
    const urlString = url.toString();
    if (urlString.includes('googleapis.com')) {
      options = { ...options, dispatcher: googleApiProxyDispatcher };
    }
    return originalFetch.call(this, url, options);
  };
}

/**
 * Get the default service key file path (consistent with main Google endpoint)
 * @returns {string} - The default path to the service key file
 */
function getDefaultServiceKeyPath() {
  return (
    process.env.GOOGLE_SERVICE_KEY_FILE || path.join(process.cwd(), 'api', 'data', 'auth.json')
  );
}

const displayMessage =
  "Gemini displayed an image. All generated images are already plainly visible, so don't repeat the descriptions in detail. Do not list download links as they are available in the UI already. The user may download the images by clicking on them, but do not mention anything about downloading to the user.";

const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image';

const safeFailureMessage =
  'Image generation failed. Please verify Gemini image generation is enabled for your account, billing/quota is available, and try again.';

/**
 * Replaces unwanted characters from the input string
 * @param {string} inputString - The input string to process
 * @returns {string} - The processed string
 */
function replaceUnwantedChars(inputString) {
  return (
    inputString
      ?.replace(/\r\n|\r|\n/g, ' ')
      .replace(/"/g, '')
      .trim() || ''
  );
}

/**
 * Convert image buffer to target format if needed
 * @param {Buffer} inputBuffer - The input image buffer
 * @param {string} targetFormat - The target format (png, jpeg, webp)
 * @returns {Promise<{buffer: Buffer, format: string}>} - Converted buffer and format
 */
async function convertImageFormat(inputBuffer, targetFormat) {
  const metadata = await sharp(inputBuffer).metadata();
  const currentFormat = metadata.format;

  // Normalize format names (jpg -> jpeg)
  const normalizedTarget = targetFormat === 'jpg' ? 'jpeg' : targetFormat.toLowerCase();
  const normalizedCurrent = currentFormat === 'jpg' ? 'jpeg' : currentFormat;

  // If already in target format, return as-is
  if (normalizedCurrent === normalizedTarget) {
    return { buffer: inputBuffer, format: normalizedTarget };
  }

  // Convert to target format
  const convertedBuffer = await sharp(inputBuffer).toFormat(normalizedTarget).toBuffer();
  return { buffer: convertedBuffer, format: normalizedTarget };
}

/**
 * Initialize Gemini client (supports both Gemini API and Vertex AI)
 * Priority: API key (from options, resolved by loadAuthValues) > Vertex AI service account
 * @param {Object} options - Initialization options
 * @param {string} [options.GEMINI_API_KEY] - Gemini API key (resolved by loadAuthValues)
 * @param {string} [options.GOOGLE_KEY] - Google API key (resolved by loadAuthValues)
 * @returns {Promise<GoogleGenAI>} - The initialized client
 */
async function initializeGeminiClient(options = {}) {
  const geminiKey = options.GEMINI_API_KEY;
  if (geminiKey) {
    logger.debug('[GeminiImageGen] Using Gemini API with GEMINI_API_KEY');
    return new GoogleGenAI({ apiKey: geminiKey });
  }

  const googleKey = options.GOOGLE_KEY;
  if (googleKey) {
    logger.debug('[GeminiImageGen] Using Gemini API with GOOGLE_KEY');
    return new GoogleGenAI({ apiKey: googleKey });
  }

  logger.debug('[GeminiImageGen] Using Vertex AI with service account');
  const credentialsPath = getDefaultServiceKeyPath();
  const serviceKey = await loadServiceKey(credentialsPath);

  if (!serviceKey || !serviceKey.project_id) {
    throw new Error(
      'Gemini Image Generation requires one of: user-provided API key, GEMINI_API_KEY or GOOGLE_KEY env var, or a valid Google service account. ' +
        `Service account file not found or invalid at: ${credentialsPath}`,
    );
  }

  return new GoogleGenAI({
    vertexai: true,
    project: serviceKey.project_id,
    location: process.env.GOOGLE_CLOUD_LOCATION || process.env.GOOGLE_LOC || 'global',
    googleAuthOptions: { credentials: serviceKey },
  });
}

/**
 * Convert image files to Gemini inline data format
 * @param {Object} params - Parameters
 * @returns {Promise<Array>} - Array of inline data objects
 */
async function convertImagesToInlineData({ imageFiles, image_ids, req, fileStrategy }) {
  if (!image_ids || image_ids.length === 0) {
    return [];
  }

  const streamMethods = {};
  const requestFilesMap = Object.fromEntries(imageFiles.map((f) => [f.file_id, { ...f }]));
  const orderedFiles = new Array(image_ids.length);
  const idsToFetch = [];
  const indexOfMissing = Object.create(null);

  for (let i = 0; i < image_ids.length; i++) {
    const id = image_ids[i];
    const file = requestFilesMap[id];
    if (file) {
      orderedFiles[i] = file;
    } else {
      idsToFetch.push(id);
      indexOfMissing[id] = i;
    }
  }

  if (idsToFetch.length && req?.user?.id) {
    const fetchedFiles = await getFiles(
      {
        user: req.user.id,
        file_id: { $in: idsToFetch },
        height: { $exists: true },
        width: { $exists: true },
      },
      {},
      {},
    );

    for (const file of fetchedFiles) {
      requestFilesMap[file.file_id] = file;
      orderedFiles[indexOfMissing[file.file_id]] = file;
    }
  }

  const inlineDataArray = [];
  for (const imageFile of orderedFiles) {
    if (!imageFile) continue;

    try {
      const source = imageFile.source || fileStrategy;
      if (!source) continue;

      let getDownloadStream = streamMethods[source];
      if (!getDownloadStream) {
        ({ getDownloadStream } = getStrategyFunctions(source));
        streamMethods[source] = getDownloadStream;
      }
      if (!getDownloadStream) continue;

      const stream = await getDownloadStream(req, imageFile.filepath);
      if (!stream) continue;

      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const base64Data = buffer.toString('base64');
      const mimeType = imageFile.type || 'image/png';

      inlineDataArray.push({
        inlineData: { mimeType, data: base64Data },
      });
    } catch (error) {
      logger.error('[GeminiImageGen] Error processing image:', imageFile.file_id, error);
    }
  }

  return inlineDataArray;
}

/**
 * Convert inlineData parts into Interactions API input content blocks
 * @param {Array} inlineDataArray - Gemini inlineData parts
 * @returns {Array} - Interactions image content blocks
 */
function convertInlineDataToInteractionInput(inlineDataArray) {
  return inlineDataArray
    .map((part) => part?.inlineData)
    .filter((inlineData) => inlineData?.data)
    .map((inlineData) => ({
      type: 'image',
      data: inlineData.data,
      mime_type: inlineData.mimeType || 'image/png',
    }));
}

/**
 * Convert output format into a MIME type
 * @param {string} format - Normalized image format
 * @returns {string} - MIME type
 */
function getImageMimeType(format) {
  return format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
}

/**
 * Check if a model uses the legacy Imagen generation endpoint
 * @param {string} model - Model name
 * @returns {boolean}
 */
function isImagenModel(model) {
  return /^imagen(?:-|_|\b)/i.test(model);
}

/**
 * Build image response format for the Interactions API
 * @param {Object} params - Parameters
 * @returns {Object}
 */
function buildImageResponseFormat({ aspectRatio, imageSize }) {
  const format = {
    type: 'image',
    delivery: 'inline',
  };

  if (aspectRatio) {
    format.aspect_ratio = aspectRatio;
  }

  if (imageSize) {
    format.image_size = imageSize;
  }

  return format;
}

/**
 * Extract base64 image data from a Gemini generateContent response
 * @param {Object} response - Gemini response
 * @returns {{ data?: string, mimeType?: string }}
 */
function extractGenerateContentImage(response) {
  const inlineData = response?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
    ?.inlineData;

  return {
    data: inlineData?.data,
    mimeType: inlineData?.mimeType,
  };
}

/**
 * Extract base64 image data from an Interactions API response
 * @param {Object} interaction - Interactions response
 * @returns {{ data?: string, mimeType?: string }}
 */
function extractInteractionImage(interaction) {
  if (interaction?.output_image?.data) {
    return {
      data: interaction.output_image.data,
      mimeType: interaction.output_image.mime_type,
    };
  }

  const outputImage = interaction?.outputs?.find((output) => output?.type === 'image');
  if (outputImage?.data) {
    return {
      data: outputImage.data,
      mimeType: outputImage.mime_type,
    };
  }

  const stepImage = interaction?.steps
    ?.flatMap((step) => step?.content ?? [])
    .find((content) => content?.type === 'image' && content?.data);

  return {
    data: stepImage?.data,
    mimeType: stepImage?.mime_type,
  };
}

/**
 * Extract base64 image data from a generateImages response
 * @param {Object} response - Imagen response
 * @returns {{ data?: string, mimeType?: string }}
 */
function extractGenerateImagesImage(response) {
  const image = response?.generatedImages?.[0]?.image;
  return {
    data: image?.imageBytes,
    mimeType: image?.mimeType,
  };
}

/**
 * Create a user-safe error message without leaking credentials or file paths
 * @param {Error} error - API error
 * @returns {string}
 */
function getSafeGeminiErrorMessage(error) {
  const status = error?.status || error?.code;
  const message = String(error?.message ?? '').toLowerCase();

  if (status === 429 || message.includes('quota') || message.includes('billing')) {
    return 'Gemini image generation quota was exceeded or billing is not enabled for this account.';
  }

  if (status === 401 || status === 403 || message.includes('permission')) {
    return 'Gemini image generation is not authorized. Please verify the Gemini API key or service account permissions.';
  }

  if (message.includes('safety') || message.includes('blocked')) {
    return 'Image blocked by content safety filters. Please try different content.';
  }

  return safeFailureMessage;
}

/**
 * Check for safety blocks in API response
 * @param {Object} response - The API response
 * @returns {Object|null} - Safety block info or null
 */
function checkForSafetyBlock(response) {
  if (!response?.candidates?.length) {
    return { reason: 'NO_CANDIDATES', message: 'No candidates returned' };
  }

  const candidate = response.candidates[0];
  const finishReason = candidate.finishReason;

  if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
    return { reason: finishReason, message: 'Content blocked by safety filters' };
  }

  if (finishReason === 'RECITATION') {
    return { reason: finishReason, message: 'Content blocked due to recitation concerns' };
  }

  if (candidate.safetyRatings) {
    for (const rating of candidate.safetyRatings) {
      if (rating.probability === 'HIGH' || rating.blocked === true) {
        return {
          reason: 'SAFETY_RATING',
          message: `Blocked due to ${rating.category}`,
          category: rating.category,
        };
      }
    }
  }

  return null;
}

/**
 * Record token usage for balance tracking
 * @param {Object} params - Parameters
 * @param {Object} params.usageMetadata - The usage metadata from API response
 * @param {Object} params.req - The request object
 * @param {string} params.userId - The user ID
 * @param {string} params.conversationId - The conversation ID
 * @param {string} params.model - The model name
 * @param {string} [params.messageId] - The response message ID for transaction correlation
 */
async function recordTokenUsage({ usageMetadata, req, userId, conversationId, model, messageId }) {
  if (!usageMetadata) {
    logger.debug('[GeminiImageGen] No usage metadata available for balance tracking');
    return;
  }

  const appConfig = req?.config;
  const balance = getBalanceConfig(appConfig);
  const transactions = getTransactionsConfig(appConfig);

  // Skip if neither balance nor transactions are enabled
  if (!balance?.enabled && transactions?.enabled === false) {
    return;
  }

  const promptTokens = usageMetadata.prompt_token_count || usageMetadata.promptTokenCount || 0;
  const completionTokens =
    usageMetadata.candidates_token_count ||
    usageMetadata.candidatesTokenCount ||
    usageMetadata.responseTokenCount ||
    0;

  const interactionPromptTokens = usageMetadata.total_input_tokens || 0;
  const interactionCompletionTokens = usageMetadata.total_output_tokens || 0;
  const effectivePromptTokens = promptTokens || interactionPromptTokens;
  const effectiveCompletionTokens = completionTokens || interactionCompletionTokens;

  if (effectivePromptTokens === 0 && effectiveCompletionTokens === 0) {
    logger.debug('[GeminiImageGen] No tokens to record');
    return;
  }

  logger.debug('[GeminiImageGen] Recording token usage:', {
    promptTokens: effectivePromptTokens,
    completionTokens: effectiveCompletionTokens,
    model,
    conversationId,
  });

  try {
    await spendTokens(
      {
        user: userId,
        model,
        messageId,
        conversationId,
        context: 'image_generation',
        balance,
        transactions,
      },
      {
        promptTokens: effectivePromptTokens,
        completionTokens: effectiveCompletionTokens,
      },
    );
  } catch (error) {
    logger.error('[GeminiImageGen] Error recording token usage:', error);
  }
}

/**
 * Creates Gemini Image Generation tool
 * @param {Object} fields - Configuration fields
 * @returns {ReturnType<tool>} - The image generation tool
 */
function createGeminiImageTool(fields = {}) {
  const override = fields.override ?? false;

  if (!override && !fields.isAgent) {
    throw new Error('This tool is only available for agents.');
  }

  const { req, imageFiles = [], userId, fileStrategy, GEMINI_API_KEY, GOOGLE_KEY } = fields;

  const imageOutputType = fields.imageOutputType || EImageOutputType.PNG;

  const geminiImageGenTool = tool(
    async ({ prompt, image_ids, aspectRatio, imageSize }, runnableConfig) => {
      if (!prompt) {
        throw new Error('Missing required field: prompt');
      }

      logger.debug('[GeminiImageGen] Generating image', { aspectRatio, imageSize });

      let ai;
      try {
        ai = await initializeGeminiClient({
          GEMINI_API_KEY,
          GOOGLE_KEY,
        });
      } catch (error) {
        logger.error('[GeminiImageGen] Failed to initialize client:', error);
        return [
          [{ type: ContentTypes.TEXT, text: `Failed to initialize Gemini: ${error.message}` }],
          { content: [], file_ids: [] },
        ];
      }

      const sanitizedPrompt = replaceUnwantedChars(prompt);
      const contents = [{ text: sanitizedPrompt }];
      let contextImages = [];

      if (image_ids?.length > 0) {
        contextImages = await convertImagesToInlineData({
          imageFiles,
          image_ids,
          req,
          fileStrategy,
        });
        contents.push(...contextImages);
        logger.debug('[GeminiImageGen] Added', contextImages.length, 'context images');
      }

      let apiResponse;
      let rawImage;
      const geminiModel = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL;
      const config = {
        responseModalities: ['TEXT', 'IMAGE'],
      };

      const supportsImageSize = !geminiModel.includes('gemini-2.5-flash-image');
      if (aspectRatio || (imageSize && supportsImageSize)) {
        config.imageConfig = {};
        if (aspectRatio) {
          config.imageConfig.aspectRatio = aspectRatio;
        }
        if (imageSize && supportsImageSize) {
          config.imageConfig.imageSize = imageSize;
        }
      }

      let derivedSignal = null;
      let abortHandler = null;

      if (runnableConfig?.signal) {
        derivedSignal = AbortSignal.any([runnableConfig.signal]);
        abortHandler = () => logger.debug('[GeminiImageGen] Image generation aborted');
        derivedSignal.addEventListener('abort', abortHandler, { once: true });
        config.abortSignal = derivedSignal;
      }

      try {
        if (isImagenModel(geminiModel)) {
          if (contextImages.length > 0) {
            return [
              [
                {
                  type: ContentTypes.TEXT,
                  text:
                    'This image model only supports text-to-image. Use a Gemini image model to edit or reference existing images.',
                },
              ],
              { content: [], file_ids: [] },
            ];
          }

          apiResponse = await ai.models.generateImages({
            model: geminiModel,
            prompt: sanitizedPrompt,
            config: {
              numberOfImages: 1,
              aspectRatio,
              imageSize,
              abortSignal: derivedSignal,
            },
          });
          rawImage = extractGenerateImagesImage(apiResponse);
        } else if (ai.interactions?.create && !GEMINI_API_KEY && !GOOGLE_KEY) {
          apiResponse = await ai.interactions.create(
            {
              model: geminiModel,
              input: [
                { type: 'text', text: sanitizedPrompt },
                ...convertInlineDataToInteractionInput(contextImages),
              ],
              response_modalities: ['image'],
              response_format: buildImageResponseFormat({ aspectRatio, imageSize }),
            },
            derivedSignal ? { signal: derivedSignal } : undefined,
          );

          if (
            apiResponse?.status &&
            !['completed', 'incomplete'].includes(apiResponse.status) &&
            apiResponse.status !== 'in_progress'
          ) {
            logger.warn('[GeminiImageGen] Interaction ended without completion:', {
              status: apiResponse.status,
              model: geminiModel,
            });
          }

          rawImage = extractInteractionImage(apiResponse);
        } else {
          apiResponse = await ai.models.generateContent({
            model: geminiModel,
            contents,
            config,
          });
          rawImage = extractGenerateContentImage(apiResponse);
        }
      } catch (error) {
        logger.error('[GeminiImageGen] API error:', error);
        return [
          [{ type: ContentTypes.TEXT, text: getSafeGeminiErrorMessage(error) }],
          { content: [], file_ids: [] },
        ];
      } finally {
        if (abortHandler && derivedSignal) {
          derivedSignal.removeEventListener('abort', abortHandler);
        }
      }

      const safetyBlock = isImagenModel(geminiModel) ? null : checkForSafetyBlock(apiResponse);
      if (!rawImage?.data && safetyBlock) {
        logger.warn('[GeminiImageGen] Safety block:', safetyBlock);
        const errorMsg = 'Image blocked by content safety filters. Please try different content.';
        return [[{ type: ContentTypes.TEXT, text: errorMsg }], { content: [], file_ids: [] }];
      }

      if (!rawImage?.data) {
        logger.warn('[GeminiImageGen] No image data in response');
        return [
          [{ type: ContentTypes.TEXT, text: 'No image was generated. Please try again.' }],
          { content: [], file_ids: [] },
        ];
      }

      const rawBuffer = Buffer.from(rawImage.data, 'base64');
      const { buffer: convertedBuffer, format: outputFormat } = await convertImageFormat(
        rawBuffer,
        imageOutputType,
      );
      const imageData = convertedBuffer.toString('base64');
      const mimeType = getImageMimeType(outputFormat);

      const dataUrl = `data:${mimeType};base64,${imageData}`;
      const file_ids = [v4()];
      const content = [
        {
          type: ContentTypes.IMAGE_URL,
          image_url: { url: dataUrl },
        },
      ];

      const textResponse = [
        {
          type: ContentTypes.TEXT,
          text:
            displayMessage +
            `\n\ngenerated_image_id: "${file_ids[0]}"` +
            (image_ids?.length > 0 ? `\nreferenced_image_ids: ["${image_ids.join('", "')}"]` : ''),
        },
      ];

      const conversationId = runnableConfig?.configurable?.thread_id;
      const messageId =
        runnableConfig?.configurable?.run_id ??
        runnableConfig?.configurable?.requestBody?.messageId;
      recordTokenUsage({
        usageMetadata: apiResponse.usageMetadata || apiResponse.usage,
        req,
        userId,
        messageId,
        conversationId,
        model: geminiModel,
      }).catch((error) => {
        logger.error('[GeminiImageGen] Failed to record token usage:', error);
      });

      return [textResponse, { content, file_ids }];
    },
    {
      ...geminiToolkit.gemini_image_gen,
      responseFormat: 'content_and_artifact',
    },
  );

  return geminiImageGenTool;
}

// Export both for compatibility
module.exports = createGeminiImageTool;
module.exports.createGeminiImageTool = createGeminiImageTool;
