interface ClaudeForgeOptions {
  imageUrl: string;
  prompt: string;
  model?: "claude-3-5-sonnet" | "claude-3-opus" | "claude-3-sonnet";
}

export async function claudeForge(
  apiKey: string,
  options: ClaudeForgeOptions,
): Promise<string> {
  const { imageUrl, prompt, model = "claude-3-5-sonnet" } = options;

  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");
  const mediaType = imageResponse.headers.get("content-type") || "image/jpeg";

  const modelId =
    model === "claude-3-5-sonnet"
      ? "claude-sonnet-4-20250514"
      : model === "claude-3-opus"
        ? "claude-3-opus-20240229"
        : "claude-3-sonnet-20240229";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: `You are an expert image enhancement AI. Analyze this image and provide detailed enhancement instructions.

Enhancement Request: ${prompt}

Provide a detailed JSON response with the following structure:
{
  "analysis": {
    "currentState": "description of current image qualities",
    "improvements": ["list of specific improvements to make"],
    "colorAdjustments": { "saturation": 0-100, "contrast": 0-100, "brightness": 0-100 },
    "styleRecommendations": ["style recommendations"]
  },
  "enhancedPrompt": "A detailed prompt for image generation that incorporates all improvements"
}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Claude API error: ${error.error?.message || "Unknown error"}`,
    );
  }

  const result = await response.json();
  const content = result.content[0]?.text;

  if (!content) {
    throw new Error("No response content from Claude");
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.enhancedPrompt || prompt;
    }
  } catch {
    console.log("[Claude] Could not parse JSON, using raw response");
  }

  return content;
}

export async function claudeAnalyzeImage(
  apiKey: string,
  imageUrl: string,
  userPrompt: string,
): Promise<{
  analysis: string;
  enhancedPrompt: string;
  confidence: number;
}> {
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");
  const mediaType = imageResponse.headers.get("content-type") || "image/jpeg";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: `Analyze this image for Instagram optimization. User request: "${userPrompt}"

Provide analysis in JSON format:
{
  "analysis": "detailed analysis of composition, lighting, colors, mood",
  "enhancedPrompt": "optimized prompt for image enhancement",
  "confidence": 0.0-1.0
}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Claude analysis failed");
  }

  const result = await response.json();
  const content = result.content[0]?.text || "";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.log("[Claude] Parse error, returning defaults");
  }

  return {
    analysis: content,
    enhancedPrompt: userPrompt,
    confidence: 0.7,
  };
}
