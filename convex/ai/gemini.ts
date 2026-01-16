const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageUrl?: string,
): Promise<string> {
  const model = "gemini-2.5-pro-preview-06-05";

  const parts: GeminiMessage["parts"] = [];

  if (imageUrl) {
    const imageData = await fetchImageAsBase64(imageUrl);
    parts.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64,
      },
    });
  }

  parts.push({ text: userPrompt });

  const response = await fetch(
    `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data: GeminiResponse = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("No response from Gemini");
  }

  return content;
}

export async function callGeminiWithImages(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageUrls: string[],
): Promise<string> {
  const model = "gemini-2.5-pro-preview-06-05";

  const parts: GeminiMessage["parts"] = [];

  for (const imageUrl of imageUrls) {
    const imageData = await fetchImageAsBase64(imageUrl);
    parts.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64,
      },
    });
  }

  parts.push({ text: userPrompt });

  const response = await fetch(
    `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data: GeminiResponse = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("No response from Gemini");
  }

  return content;
}

async function fetchImageAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string }> {
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

interface GeminiForgeOptions {
  imageUrl: string;
  prompt: string;
  model?: "gemini-2.0-flash" | "gemini-1.5-pro" | "gemini-1.5-flash";
}

export async function geminiForge(
  apiKey: string,
  options: GeminiForgeOptions,
): Promise<string> {
  const { imageUrl, prompt, model = "gemini-2.0-flash" } = options;

  const modelId =
    model === "gemini-2.0-flash"
      ? "gemini-2.0-flash-exp"
      : model === "gemini-1.5-pro"
        ? "gemini-1.5-pro-latest"
        : "gemini-1.5-flash-latest";

  const enhancedPrompt = await callGemini(
    apiKey,
    `You are an expert image enhancement AI for Instagram optimization. 
Analyze images and provide detailed enhancement prompts that will create stunning, 
engagement-optimized visuals.`,
    `Enhancement Request: ${prompt}

Analyze this image and create a detailed enhancement prompt that will:
1. Improve composition and visual balance
2. Optimize colors for Instagram engagement
3. Enhance lighting and contrast
4. Add mood and atmosphere
5. Ensure the image is Instagram-ready

Respond with ONLY a detailed image generation prompt, no explanations.`,
    imageUrl,
  );

  return enhancedPrompt.trim();
}

export async function geminiAnalyzeImage(
  apiKey: string,
  imageUrl: string,
  userPrompt: string,
): Promise<{
  analysis: string;
  enhancedPrompt: string;
  confidence: number;
}> {
  const content = await callGemini(
    apiKey,
    "You are an expert image analyst for Instagram optimization.",
    `Analyze this image for Instagram optimization. User request: "${userPrompt}"

Provide analysis in JSON format:
{
  "analysis": "detailed analysis of composition, lighting, colors, mood",
  "enhancedPrompt": "optimized prompt for image enhancement",
  "confidence": 0.0-1.0
}`,
    imageUrl,
  );

  try {
    return extractJson(content);
  } catch {
    return {
      analysis: content,
      enhancedPrompt: userPrompt,
      confidence: 0.7,
    };
  }
}
