import type { ExtendedJsonSchema } from '../registry/definitions';

const DEFAULT_GEMINI_IMAGE_GEN_DESCRIPTION =
  `Generates and edits high-quality images with Gemini image models, using a text prompt and optional image references.

When to use \`gemini_image_gen\`:
- To create entirely new images from detailed text descriptions
- To edit, restyle, expand, or modify an existing image
- To use existing images as visual references, context, or inspiration
- When the user requests image generation, image creation, image editing, or visual design work

When NOT to use \`gemini_image_gen\`:
- For uploading or saving existing images without modification
- For describing an image without producing a new image

Generated image IDs will be returned in the response, so you can refer to them in future requests.` as const;

const getGeminiImageGenDescription = () => {
  return process.env.GEMINI_IMAGE_GEN_DESCRIPTION || DEFAULT_GEMINI_IMAGE_GEN_DESCRIPTION;
};

const DEFAULT_GEMINI_IMAGE_GEN_PROMPT_DESCRIPTION =
  `A direct, detailed prompt for the desired image, up to 32000 characters. For editing requests, state the exact change to apply to the referenced image. Include image type, subject, composition, style, lighting, and any constraints the user gave.` as const;

const getGeminiImageGenPromptDescription = () => {
  return (
    process.env.GEMINI_IMAGE_GEN_PROMPT_DESCRIPTION || DEFAULT_GEMINI_IMAGE_GEN_PROMPT_DESCRIPTION
  );
};

const DEFAULT_GEMINI_IMAGE_IDS_DESCRIPTION = `
Optional array of image IDs to use as visual context for generation.

Guidelines:
- For editing requests: ALWAYS include the image ID being edited
- For new generation with context: include any relevant reference image IDs
- If the user's request references any prior images, include their image IDs in this array
- These images will be used as visual context/inspiration for the new generation
- Never invent or hallucinate IDs; only use IDs that are visible in the conversation
- If no images are relevant, omit this field entirely
`.trim();

const getGeminiImageIdsDescription = () => {
  return process.env.GEMINI_IMAGE_IDS_DESCRIPTION || DEFAULT_GEMINI_IMAGE_IDS_DESCRIPTION;
};

const geminiImageGenJsonSchema: ExtendedJsonSchema = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      maxLength: 32000,
      description: getGeminiImageGenPromptDescription(),
    },
    image_ids: {
      type: 'array',
      items: { type: 'string' },
      description: getGeminiImageIdsDescription(),
    },
    aspectRatio: {
      type: 'string',
      enum: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
      description:
        'The aspect ratio of the generated image. Use 16:9 or 3:2 for landscape, 9:16 or 2:3 for portrait, 21:9 for ultra-wide/cinematic, 1:1 for square. Defaults to 1:1 if not specified.',
    },
    imageSize: {
      type: 'string',
      enum: ['1K', '2K', '4K'],
      description:
        'The resolution of the generated image. Use 1K for standard, 2K for high, 4K for maximum quality. Defaults to 1K if not specified.',
    },
  },
  required: ['prompt'],
};

export const geminiToolkit: {
  readonly gemini_image_gen: {
    readonly name: 'gemini_image_gen';
    readonly description: string;
    readonly description_for_model: string;
    readonly schema: ExtendedJsonSchema;
    readonly responseFormat: 'content_and_artifact';
  };
} = {
  gemini_image_gen: {
    name: 'gemini_image_gen' as const,
    description: getGeminiImageGenDescription(),
    description_for_model: `Use this tool to generate or edit images with Gemini image models.
1. Call it when the user asks to create, generate, draw, design, render, restyle, edit, modify, remove, add, replace, expand, or otherwise produce an image.
2. Make exactly one image per tool call unless the user explicitly requests another turn.
3. For editing requests:
   - ALWAYS include the original image ID in image_ids.
   - Use the user's requested change directly.
   - Example: "remove the background" -> prompt "remove the background from this image".
   - Example: "make the jacket blue" -> prompt "make the jacket blue in this image".
   - Do not invent image IDs.
4. For reference-based generation:
   - Include relevant visible image IDs in image_ids.
   - Explain in the prompt how the reference should influence the new image.
5. For pure text-to-image:
   - Omit image_ids.
   - Begin with the intended image type, such as photo, illustration, logo, icon, 3D render, watercolor, vector, or product mockup.
6. Use aspectRatio when the user requests a shape:
   - 16:9 or 3:2 for landscape
   - 9:16 or 2:3 for portrait
   - 21:9 for cinematic or ultra-wide
   - 1:1 for square
7. Use imageSize only when quality/resolution is requested: 1K standard, 2K high, 4K maximum.
8. Do not narrate the generated image before or after the tool call. The image will be displayed in the chat UI.`,
    schema: geminiImageGenJsonSchema,
    responseFormat: 'content_and_artifact' as const,
  },
} as const;

export type GeminiToolkit = typeof geminiToolkit;
