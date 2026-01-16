/**
 * OpenAI Integration for Image Generation and Analysis
 *
 * Supports:
 * - GPT-4o for vision analysis (alternative to Gemini)
 * - gpt-image-1 (DALL-E) for image generation/editing
 */

const OPENAI_API_BASE = "https://api.openai.com/v1";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ImageGenerationResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

/**
 * Call GPT-4o for text/vision analysis
 */
export async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageUrl?: string,
): Promise<string> {
  const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];

  if (imageUrl) {
    messages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: imageUrl,
            detail: "high",
          },
        },
        {
          type: "text",
          text: userPrompt,
        },
      ],
    });
  } else {
    messages.push({ role: "user", content: userPrompt });
  }

  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      temperature: 0.4,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data: ChatCompletionResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return content;
}

/**
 * Call GPT-4o with multiple images
 */
export async function callOpenAIWithImages(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageUrls: string[],
): Promise<string> {
  const contentParts: ContentPart[] = imageUrls.map((url) => ({
    type: "image_url" as const,
    image_url: {
      url,
      detail: "high" as const,
    },
  }));

  contentParts.push({
    type: "text",
    text: userPrompt,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: contentParts },
  ];

  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data: ChatCompletionResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return content;
}

export interface OpenAIImageGenerationOptions {
  prompt: string;
  model?: "gpt-image-1" | "dall-e-3" | "dall-e-2";
  size?: "1024x1024" | "1792x1024" | "1024x1792" | "512x512" | "256x256";
  quality?: "standard" | "hd" | "low" | "medium" | "high";
  style?: "vivid" | "natural";
  n?: number;
  responseFormat?: "url" | "b64_json";
}

/**
 * Generate an image using OpenAI's image generation models
 *
 * Models:
 * - gpt-image-1: Latest image generation model with best quality
 * - dall-e-3: High quality text-to-image
 * - dall-e-2: Faster, lower cost option
 */
export async function generateImage(
  apiKey: string,
  options: OpenAIImageGenerationOptions,
): Promise<{ url: string; revisedPrompt?: string }> {
  const {
    prompt,
    model = "gpt-image-1",
    size = "1024x1024",
    quality = "high",
    style = "natural",
    n = 1,
    responseFormat = "url",
  } = options;

  console.log(`[OpenAI] Generating image with ${model}...`);
  console.log(`[OpenAI] Prompt: ${prompt.slice(0, 100)}...`);

  const body: Record<string, unknown> = {
    model,
    prompt,
    n,
    size,
    response_format: responseFormat,
  };

  // dall-e-3 and gpt-image-1 support quality and style
  if (model === "dall-e-3" || model === "gpt-image-1") {
    body.quality = quality;
    if (model === "dall-e-3") {
      body.style = style;
    }
  }

  const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[OpenAI] Image generation error:", error);
    throw new Error(`OpenAI image generation error: ${error}`);
  }

  const data: ImageGenerationResponse = await response.json();
  const result = data.data?.[0];

  if (!result) {
    throw new Error("No image generated by OpenAI");
  }

  const url =
    result.url ||
    (result.b64_json ? `data:image/png;base64,${result.b64_json}` : "");

  if (!url) {
    throw new Error("No image URL in OpenAI response");
  }

  console.log(`[OpenAI] Image generated successfully`);

  return {
    url,
    revisedPrompt: result.revised_prompt,
  };
}

export interface OpenAIImageEditOptions {
  image: string; // URL or base64
  prompt: string;
  mask?: string; // Optional mask for inpainting
  model?: "gpt-image-1" | "dall-e-2";
  size?: "1024x1024" | "512x512" | "256x256";
  n?: number;
  responseFormat?: "url" | "b64_json";
}

/**
 * Edit an image using OpenAI's image editing capabilities
 * Uses gpt-image-1 for best results
 */
export async function editImage(
  apiKey: string,
  options: OpenAIImageEditOptions,
): Promise<{ url: string }> {
  const {
    image,
    prompt,
    mask,
    model = "gpt-image-1",
    size = "1024x1024",
    n = 1,
    responseFormat = "url",
  } = options;

  console.log(`[OpenAI] Editing image with ${model}...`);
  console.log(`[OpenAI] Edit prompt: ${prompt.slice(0, 100)}...`);

  // Fetch image and convert to base64 if it's a URL
  const imageData = await fetchImageAsBase64(image);

  // Create form data for the edit endpoint
  const formData = new FormData();

  // Convert base64 to blob
  const imageBlob = base64ToBlob(imageData.base64, imageData.mimeType);
  formData.append("image", imageBlob, "image.png");
  formData.append("prompt", prompt);
  formData.append("model", model);
  formData.append("size", size);
  formData.append("n", n.toString());
  formData.append("response_format", responseFormat);

  if (mask) {
    const maskData = await fetchImageAsBase64(mask);
    const maskBlob = base64ToBlob(maskData.base64, maskData.mimeType);
    formData.append("mask", maskBlob, "mask.png");
  }

  const response = await fetch(`${OPENAI_API_BASE}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[OpenAI] Image edit error:", error);
    throw new Error(`OpenAI image edit error: ${error}`);
  }

  const data: ImageGenerationResponse = await response.json();
  const result = data.data?.[0];

  if (!result) {
    throw new Error("No edited image from OpenAI");
  }

  const url =
    result.url ||
    (result.b64_json ? `data:image/png;base64,${result.b64_json}` : "");

  if (!url) {
    throw new Error("No image URL in OpenAI edit response");
  }

  console.log(`[OpenAI] Image edited successfully`);

  return { url };
}

/**
 * Forge-style image generation using OpenAI
 * Compatible with the existing forge interface
 */
export interface OpenAIForgeOptions {
  imageUrl: string;
  prompt: string;
  negativePrompt?: string;
  model?: "gpt-image-1" | "dall-e-3";
  quality?: "standard" | "hd" | "high";
  size?: "1024x1024" | "1792x1024" | "1024x1792";
}

export async function openaiForge(
  apiKey: string,
  options: OpenAIForgeOptions,
): Promise<string> {
  const {
    imageUrl,
    prompt,
    model = "gpt-image-1",
    quality = "high",
    size = "1024x1024",
  } = options;

  console.log(`[OpenAI-FORGE] Starting image enhancement...`);
  console.log(`[OpenAI-FORGE] Model: ${model}`);
  console.log(`[OpenAI-FORGE] Prompt: ${prompt.slice(0, 150)}...`);

  // For gpt-image-1, we can use the edit endpoint for better results
  // For dall-e-3, we generate a new image based on the prompt + reference description

  if (model === "gpt-image-1") {
    // Use the edit endpoint for image-to-image transformation
    const editSize: "1024x1024" | "512x512" | "256x256" = "1024x1024";
    try {
      const result = await editImage(apiKey, {
        image: imageUrl,
        prompt: `Transform this image: ${prompt}. Maintain the same composition and subject while applying the requested changes.`,
        model: "gpt-image-1",
        size: editSize,
      });
      return result.url;
    } catch (error) {
      console.log("[OpenAI-FORGE] Edit failed, falling back to generation...");
      // Fall back to generation if edit fails
    }
  }

  // Generate new image with DALL-E 3
  // First, analyze the original image to create a description
  const description = await analyzeImageForRegeneration(
    apiKey,
    imageUrl,
    prompt,
  );

  const result = await generateImage(apiKey, {
    prompt: description,
    model: "dall-e-3",
    quality: quality === "high" ? "hd" : "standard",
    size,
    style: "natural",
  });

  return result.url;
}

/**
 * Analyze an image and create a detailed prompt for regeneration
 */
async function analyzeImageForRegeneration(
  apiKey: string,
  imageUrl: string,
  userPrompt: string,
): Promise<string> {
  const systemPrompt = `You are an expert at describing images for AI image generation.
Analyze the provided image and create a detailed prompt that would recreate a similar image with the requested modifications.
Focus on: composition, subjects, lighting, colors, mood, style, and key details.
Output ONLY the prompt, no explanations.`;

  const userMessage = `Analyze this image and create a detailed prompt that incorporates: "${userPrompt}"
The prompt should:
1. Describe the main subject and composition
2. Include the requested modifications
3. Specify lighting, colors, and mood
4. Be detailed enough for DALL-E 3 to recreate a similar image with improvements`;

  const description = await callOpenAI(
    apiKey,
    systemPrompt,
    userMessage,
    imageUrl,
  );

  return description.trim();
}

// Utility functions

async function fetchImageAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string }> {
  // Handle data URLs
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], base64: match[2] };
    }
    throw new Error("Invalid data URL format");
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);

  return { base64, mimeType: contentType };
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mimeType });
}

export function extractJson<T>(content: string): T {
  const jsonMatch =
    content.match(/```json\s*([\s\S]*?)\s*```/) ||
    content.match(/```\s*([\s\S]*?)\s*```/) ||
    content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from response");
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  return JSON.parse(jsonStr.trim()) as T;
}
