import type { StylePreset } from "@/components/StylePresetsGrid";

// Use Convex URL for chat enhancement, fall back to FastAPI for legacy endpoints
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || "";
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

// Convex HTTP URL (derived from Convex URL)
const getConvexHttpUrl = () => {
  if (!CONVEX_URL) return API_BASE_URL;
  // Convert https://xxx.convex.cloud to https://xxx.convex.site
  return CONVEX_URL.replace(".convex.cloud", ".convex.site");
};

interface EnhanceResponse {
  success: boolean;
  original_url: string;
  enhanced_url: string;
  style_applied: string;
  processing_time_ms: number;
}

interface PreviewResponse {
  success: boolean;
  preview_url: string;
  style: string;
}

interface InsightsResponse {
  best_posting_time: string;
  suggested_caption: string;
  hashtags: string[];
  engagement_tip: string;
  confidence_score: number;
}

interface StyleInfo {
  id: string;
  label: string;
  settings: {
    brightness: number;
    contrast: number;
    saturation: number;
    sharpness: number;
    temperature: number;
    vignette: number;
  };
}

interface BatchEnhanceResponse {
  success: boolean;
  total_images: number;
  enhanced_images: Array<{
    original_url: string;
    enhanced_url: string;
  }>;
  failed_images: string[];
  total_processing_time_ms: number;
}

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
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async enhanceImage(
    imageUrl: string,
    style: StylePreset,
    intensity: number = 0.8,
  ): Promise<EnhanceResponse> {
    return this.request<EnhanceResponse>("/api/enhance", {
      method: "POST",
      body: JSON.stringify({
        image_url: imageUrl,
        style,
        intensity,
      }),
    });
  }

  async previewStyle(
    imageUrl: string,
    style: StylePreset,
  ): Promise<PreviewResponse> {
    return this.request<PreviewResponse>("/api/enhance/preview", {
      method: "POST",
      body: JSON.stringify({
        image_url: imageUrl,
        style,
      }),
    });
  }

  async batchEnhance(
    imageUrls: string[],
    style: StylePreset,
    intensity: number = 0.8,
  ): Promise<BatchEnhanceResponse> {
    return this.request<BatchEnhanceResponse>("/api/enhance/batch", {
      method: "POST",
      body: JSON.stringify({
        image_urls: imageUrls,
        style,
        intensity,
      }),
    });
  }

  async getInsights(profileUsername: string): Promise<InsightsResponse> {
    return this.request<InsightsResponse>("/api/insights", {
      method: "POST",
      body: JSON.stringify({
        profile_username: profileUsername,
        recent_posts_count: 9,
      }),
    });
  }

  async getBestPostingTime(): Promise<{ best_time: string }> {
    return this.request<{ best_time: string }>("/api/insights/posting-time");
  }

  async getCaptionSuggestion(context?: string): Promise<{ caption: string }> {
    const params = context ? `?context=${encodeURIComponent(context)}` : "";
    return this.request<{ caption: string }>(`/api/insights/caption${params}`);
  }

  async getHashtagSuggestions(
    count: number = 5,
  ): Promise<{ hashtags: string[] }> {
    return this.request<{ hashtags: string[] }>(
      `/api/insights/hashtags?count=${count}`,
    );
  }

  async getEngagementTip(): Promise<{ tip: string }> {
    return this.request<{ tip: string }>("/api/insights/tip");
  }

  async listStyles(): Promise<{ styles: StyleInfo[] }> {
    return this.request<{ styles: StyleInfo[] }>("/api/styles");
  }

  async getStyleInfo(styleName: string): Promise<StyleInfo> {
    return this.request<StyleInfo>(`/api/styles/${styleName}`);
  }

  async getStyleDescription(
    styleName: string,
  ): Promise<{ style: string; description: string }> {
    return this.request<{ style: string; description: string }>(
      `/api/styles/${styleName}/description`,
    );
  }

  async healthCheck(): Promise<{
    status: string;
    version: string;
    services: Record<string, string>;
  }> {
    return this.request<{
      status: string;
      version: string;
      services: Record<string, string>;
    }>("/api/health");
  }

  async enhanceWithPrompt(
    imageUrl: string,
    userPrompt: string,
    conversationId?: string,
  ): Promise<ChatEnhanceResponse> {
    // Use Convex for chat enhancement
    const convexUrl = getConvexHttpUrl();
    const url = `${convexUrl}/api/agents/enhance`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        user_prompt: userPrompt,
        conversation_id: conversationId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async *enhanceWithStream(
    imageUrl: string,
    userPrompt: string,
  ): AsyncGenerator<StreamingUpdate> {
    // Convex doesn't support streaming, so we simulate it with the regular endpoint
    // Yield progress updates while waiting for the result
    const stages = [
      { stage: "composition", status: "analyzing", message: "Analyzing composition and framing..." },
      { stage: "lighting", status: "analyzing", message: "Evaluating lighting and exposure..." },
      { stage: "color", status: "analyzing", message: "Enhancing color palette..." },
      { stage: "mood", status: "analyzing", message: "Amplifying mood and atmosphere..." },
      { stage: "detail", status: "analyzing", message: "Refining details and clarity..." },
      { stage: "generation", status: "processing", message: "Generating your enhanced image..." },
    ];

    // Yield initial stages with delays to simulate progress
    for (const stage of stages.slice(0, 5)) {
      yield stage;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Yield generation stage
    yield stages[5];

    // Actually call the API
    try {
      const result = await this.enhanceWithPrompt(imageUrl, userPrompt);

      yield {
        stage: "complete",
        status: "success",
        enhanced_url: result.enhanced_url,
        super_prompt: result.super_prompt,
        processing_time_ms: result.processing_time_ms,
      };
    } catch (error) {
      yield {
        stage: "error",
        status: "failed",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async analyzeOnly(
    imageUrl: string,
    userPrompt: string,
  ): Promise<{ super_prompt: string; agent_summary: Record<string, unknown> }> {
    // Use Convex for analysis
    const convexUrl = getConvexHttpUrl();
    const url = `${convexUrl}/api/agents/analyze-only`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        user_prompt: userPrompt,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new APIClient();

export type {
  EnhanceResponse,
  PreviewResponse,
  InsightsResponse,
  StyleInfo,
  BatchEnhanceResponse,
  ChatEnhanceResponse,
  AgentAnalysis,
  StreamingUpdate,
};
