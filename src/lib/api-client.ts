import type { StylePreset } from "@/components/StylePresetsGrid";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

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
    return this.request<ChatEnhanceResponse>("/api/agents/enhance", {
      method: "POST",
      body: JSON.stringify({
        image_url: imageUrl,
        user_prompt: userPrompt,
        conversation_id: conversationId,
      }),
    });
  }

  async *enhanceWithStream(
    imageUrl: string,
    userPrompt: string,
  ): AsyncGenerator<StreamingUpdate> {
    const url = `${this.baseUrl}/api/agents/enhance-stream`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        user_prompt: userPrompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data as StreamingUpdate;
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  async analyzeOnly(
    imageUrl: string,
    userPrompt: string,
  ): Promise<{ super_prompt: string; agent_summary: Record<string, unknown> }> {
    return this.request<{
      super_prompt: string;
      agent_summary: Record<string, unknown>;
    }>("/api/agents/analyze-only", {
      method: "POST",
      body: JSON.stringify({
        image_url: imageUrl,
        user_prompt: userPrompt,
      }),
    });
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
