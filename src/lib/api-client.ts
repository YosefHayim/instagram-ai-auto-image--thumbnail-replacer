// Convex URL for chat enhancement
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || "";

import { ImageProvider, DEFAULT_PROVIDER } from "./types";

// Convex HTTP URL (derived from Convex URL)
const getConvexHttpUrl = () => {
  if (!CONVEX_URL) {
    console.warn("[APIClient] VITE_CONVEX_URL not configured, using fallback");
    return "http://localhost:3000"; // Fallback for local development
  }
  // Convert https://xxx.convex.cloud to https://xxx.convex.site
  return CONVEX_URL.replace(".convex.cloud", ".convex.site");
};

interface AgentAnalysis {
  agent_name: string;
  confidence: number;
  observations: string[];
  directive: string;
}

interface ChatEnhanceResponse {
  success: boolean;
  original_url: string;
  enhanced_url: string;
  super_prompt: string;
  agent_analyses: AgentAnalysis[];
  processing_time_ms: number;
  provider: ImageProvider;
  error?: string;
}

interface StreamingUpdate {
  stage: string;
  status: string;
  message?: string;
  confidence?: number;
  enhanced_url?: string;
  super_prompt?: string;
  processing_time_ms?: number;
}

class APIClient {
  // Current provider setting
  private provider: ImageProvider = DEFAULT_PROVIDER;

  /**
   * Set the image generation provider
   */
  setProvider(provider: ImageProvider) {
    this.provider = provider;
    console.log("[APIClient] Provider set to:", provider);
  }

  /**
   * Get current provider
   */
  getProvider(): ImageProvider {
    return this.provider;
  }

  /**
   * Enhance image with AI using chat-based prompt
   * Uses Convex backend with 5 parallel specialist agents
   * @param provider - Optional override for the image generation provider
   */
  async enhanceWithPrompt(
    imageUrl: string,
    userPrompt: string,
    provider?: ImageProvider,
  ): Promise<ChatEnhanceResponse> {
    const convexUrl = getConvexHttpUrl();
    const url = `${convexUrl}/api/agents/enhance`;
    const activeProvider = provider || this.provider;

    console.log("[APIClient] enhanceWithPrompt called");
    console.log("[APIClient] Convex URL:", convexUrl);
    console.log("[APIClient] Full URL:", url);
    console.log("[APIClient] Image URL:", imageUrl.slice(0, 80) + "...");
    console.log("[APIClient] User prompt:", userPrompt);
    console.log("[APIClient] Provider:", activeProvider);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        user_prompt: userPrompt,
        provider: activeProvider,
      }),
    });

    console.log("[APIClient] Response status:", response.status);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("[APIClient] Error response:", error);
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log("[APIClient] Success response:", {
      success: result.success,
      hasEnhancedUrl: !!result.enhanced_url,
      processingTimeMs: result.processing_time_ms,
      provider: result.provider,
    });
    return result;
  }

  /**
   * Enhance image with streaming progress updates
   * Simulates streaming by yielding progress stages while API processes
   * @param provider - Optional override for the image generation provider
   */
  async *enhanceWithStream(
    imageUrl: string,
    userPrompt: string,
    provider?: ImageProvider,
  ): AsyncGenerator<StreamingUpdate> {
    const activeProvider = provider || this.provider;
    console.log("[APIClient] enhanceWithStream started");
    console.log("[APIClient] Image URL:", imageUrl.slice(0, 80) + "...");
    console.log("[APIClient] User prompt:", userPrompt);
    console.log("[APIClient] Provider:", activeProvider);

    // Progress stages shown while waiting for API
    const stages = [
      {
        stage: "composition",
        status: "analyzing",
        message: "Analyzing composition and framing...",
      },
      {
        stage: "lighting",
        status: "analyzing",
        message: "Evaluating lighting and exposure...",
      },
      {
        stage: "color",
        status: "analyzing",
        message: "Enhancing color palette...",
      },
      {
        stage: "mood",
        status: "analyzing",
        message: "Amplifying mood and atmosphere...",
      },
      {
        stage: "detail",
        status: "analyzing",
        message: "Refining details and clarity...",
      },
      {
        stage: "generation",
        status: "processing",
        message: "Generating your enhanced image...",
      },
    ];

    // Yield initial stages with delays to simulate progress
    for (const stage of stages.slice(0, 5)) {
      console.log("[APIClient] Yielding stage:", stage.stage);
      yield stage;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Yield generation stage
    console.log("[APIClient] Yielding generation stage, calling API...");
    yield stages[5];

    // Actually call the API
    try {
      console.log("[APIClient] Calling enhanceWithPrompt...");
      const result = await this.enhanceWithPrompt(
        imageUrl,
        userPrompt,
        activeProvider,
      );
      console.log("[APIClient] Got result, success:", result.success);

      if (result.success) {
        yield {
          stage: "complete",
          status: "success",
          enhanced_url: result.enhanced_url,
          super_prompt: result.super_prompt,
          processing_time_ms: result.processing_time_ms,
        };
      } else {
        yield {
          stage: "error",
          status: "failed",
          message: result.error || "Enhancement failed",
        };
      }
    } catch (error) {
      console.error("[APIClient] Stream error:", error);
      yield {
        stage: "error",
        status: "failed",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Analyze image without generating (for debugging/preview)
   */
  async analyzeOnly(
    imageUrl: string,
    userPrompt: string,
  ): Promise<{ super_prompt: string; agent_summary: Record<string, unknown> }> {
    const convexUrl = getConvexHttpUrl();
    const url = `${convexUrl}/api/agents/analyze-only`;

    console.log("[APIClient] analyzeOnly called");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        user_prompt: userPrompt,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Health check for Convex backend
   */
  async healthCheck(): Promise<{
    status: string;
    version: string;
    services: Record<string, string>;
  }> {
    const convexUrl = getConvexHttpUrl();
    const url = `${convexUrl}/api/health`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  }
}

export const apiClient = new APIClient();

export type {
  ChatEnhanceResponse,
  AgentAnalysis,
  StreamingUpdate,
  ImageProvider,
};
