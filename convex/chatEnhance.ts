"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import {
  runCompositionAgent,
  runLightingAgent,
  runColorAgent,
  runMoodAgent,
  runDetailAgent,
  combineAgentAnalyses,
  type AgentAnalysis,
} from "./ai/agents/specialists";
import { forge } from "./ai/agents/forge";
import { openaiForge } from "./ai/openai";
import { geminiForge } from "./ai/gemini";
import { claudeForge } from "./ai/claude";

export type ImageProvider = "openai" | "gemini" | "claude" | "replicate";

const log = {
  info: (
    component: string,
    message: string,
    data?: Record<string, unknown>,
  ) => {
    const timestamp = new Date().toISOString();
    console.log(
      JSON.stringify({ timestamp, level: "INFO", component, message, ...data }),
    );
  },
  error: (
    component: string,
    message: string,
    error?: unknown,
    data?: Record<string, unknown>,
  ) => {
    const timestamp = new Date().toISOString();
    console.error(
      JSON.stringify({
        timestamp,
        level: "ERROR",
        component,
        message,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : String(error),
        ...data,
      }),
    );
  },
  debug: (
    component: string,
    message: string,
    data?: Record<string, unknown>,
  ) => {
    const timestamp = new Date().toISOString();
    console.log(
      JSON.stringify({
        timestamp,
        level: "DEBUG",
        component,
        message,
        ...data,
      }),
    );
  },
};

export const enhanceWithChat = action({
  args: {
    imageUrl: v.string(),
    userPrompt: v.string(),
    provider: v.optional(
      v.union(
        v.literal("openai"),
        v.literal("gemini"),
        v.literal("claude"),
        v.literal("replicate"),
      ),
    ),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    originalUrl: string;
    enhancedUrl?: string;
    superPrompt?: string;
    agentAnalyses?: AgentAnalysis[];
    processingTimeMs: number;
    provider: ImageProvider;
    error?: string;
  }> => {
    const startTime = Date.now();
    const provider: ImageProvider = args.provider || "openai";

    log.info("ChatEnhance", "Starting enhancement", {
      imageUrl: args.imageUrl.slice(0, 100),
      userPrompt: args.userPrompt,
      provider,
    });

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const replicateApiKey = process.env.REPLICATE_API_TOKEN;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const claudeApiKey = process.env.ANTHROPIC_API_KEY;

    log.debug("ChatEnhance", "Checking API keys", {
      hasGeminiKey: !!geminiApiKey,
      hasReplicateKey: !!replicateApiKey,
      hasOpenAIKey: !!openaiApiKey,
      hasClaudeKey: !!claudeApiKey,
    });

    const missingKeys: string[] = [];
    if (!geminiApiKey) missingKeys.push("GEMINI_API_KEY (for analysis)");

    if (provider === "replicate" && !replicateApiKey) {
      missingKeys.push("REPLICATE_API_TOKEN");
    }
    if (provider === "openai" && !openaiApiKey) {
      missingKeys.push("OPENAI_API_KEY");
    }
    if (provider === "gemini" && !geminiApiKey) {
      missingKeys.push("GEMINI_API_KEY");
    }
    if (provider === "claude" && !claudeApiKey) {
      missingKeys.push("ANTHROPIC_API_KEY");
    }

    if (missingKeys.length > 0) {
      log.error("ChatEnhance", "Missing API keys", undefined, { missingKeys });
      return {
        success: false,
        originalUrl: args.imageUrl,
        error: `Missing API keys: ${missingKeys.join(", ")}. Please configure in Convex environment variables.`,
        processingTimeMs: Date.now() - startTime,
        provider,
      };
    }

    try {
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.log(
        `[ChatEnhance] STARTING ENHANCEMENT WITH ${provider.toUpperCase()}`,
      );
      console.log(`[ChatEnhance] User prompt: "${args.userPrompt}"`);
      console.log(
        "═══════════════════════════════════════════════════════════",
      );

      console.log("\n[ChatEnhance] Running 5 specialist agents in parallel...");
      const [composition, lighting, color, mood, detail] = await Promise.all([
        runCompositionAgent(args.imageUrl, args.userPrompt, geminiApiKey!),
        runLightingAgent(args.imageUrl, args.userPrompt, geminiApiKey!),
        runColorAgent(args.imageUrl, args.userPrompt, geminiApiKey!),
        runMoodAgent(args.imageUrl, args.userPrompt, geminiApiKey!),
        runDetailAgent(args.imageUrl, args.userPrompt, geminiApiKey!),
      ]);

      console.log("\n[ChatEnhance] Agent analyses complete:");
      console.log(
        `  - Composition: ${composition.confidence.toFixed(2)} confidence`,
      );
      console.log(`  - Lighting: ${lighting.confidence.toFixed(2)} confidence`);
      console.log(`  - Color: ${color.confidence.toFixed(2)} confidence`);
      console.log(`  - Mood: ${mood.confidence.toFixed(2)} confidence`);
      console.log(`  - Detail: ${detail.confidence.toFixed(2)} confidence`);

      console.log("\n[ChatEnhance] Combining analyses into super-prompt...");
      const superPrompt = combineAgentAnalyses(
        args.userPrompt,
        composition,
        lighting,
        color,
        mood,
        detail,
      );
      console.log(
        `[ChatEnhance] Super-prompt: ${superPrompt.slice(0, 150)}...`,
      );

      console.log(
        `\n[ChatEnhance] Generating enhanced image with ${provider}...`,
      );
      let enhancedUrl: string;

      switch (provider) {
        case "openai":
          enhancedUrl = await openaiForge(openaiApiKey!, {
            imageUrl: args.imageUrl,
            prompt: superPrompt,
            model: "gpt-image-1",
            quality: "high",
            size: "1024x1024",
          });
          break;

        case "gemini":
          enhancedUrl = await geminiForge(geminiApiKey!, {
            imageUrl: args.imageUrl,
            prompt: superPrompt,
            model: "gemini-2.0-flash",
          });
          break;

        case "claude":
          enhancedUrl = await claudeForge(claudeApiKey!, {
            imageUrl: args.imageUrl,
            prompt: superPrompt,
            model: "claude-3-5-sonnet",
          });
          break;

        case "replicate":
        default:
          enhancedUrl = await forge(
            { imageUrl: args.imageUrl },
            {
              mainPrompt: superPrompt,
              negativePrompt:
                "blur, noise, artifacts, oversaturated, overexposed, underexposed, distorted, low quality",
              styleModifiers: ["instagram-ready"],
              contentTypeModifiers: [],
              platformModifiers: ["feed"],
              technicalParameters: {
                strength: 0.4,
                guidanceScale: 7.5,
                steps: 30,
              },
              model: "flux",
            },
            replicateApiKey!,
          );
          break;
      }

      const processingTimeMs = Date.now() - startTime;

      console.log(
        "\n═══════════════════════════════════════════════════════════",
      );
      console.log(
        `[ChatEnhance] COMPLETE - ${(processingTimeMs / 1000).toFixed(1)}s (Provider: ${provider})`,
      );
      console.log(
        "═══════════════════════════════════════════════════════════",
      );

      return {
        success: true,
        originalUrl: args.imageUrl,
        enhancedUrl,
        superPrompt,
        agentAnalyses: [composition, lighting, color, mood, detail],
        processingTimeMs,
        provider,
      };
    } catch (error) {
      console.error("[ChatEnhance] Error:", error);

      return {
        success: false,
        originalUrl: args.imageUrl,
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: Date.now() - startTime,
        provider,
      };
    }
  },
});

export const analyzeOnly = action({
  args: {
    imageUrl: v.string(),
    userPrompt: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    superPrompt: string;
    agentAnalyses: AgentAnalysis[];
  }> => {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const [composition, lighting, color, mood, detail] = await Promise.all([
      runCompositionAgent(args.imageUrl, args.userPrompt, geminiApiKey),
      runLightingAgent(args.imageUrl, args.userPrompt, geminiApiKey),
      runColorAgent(args.imageUrl, args.userPrompt, geminiApiKey),
      runMoodAgent(args.imageUrl, args.userPrompt, geminiApiKey),
      runDetailAgent(args.imageUrl, args.userPrompt, geminiApiKey),
    ]);

    const superPrompt = combineAgentAnalyses(
      args.userPrompt,
      composition,
      lighting,
      color,
      mood,
      detail,
    );

    return {
      superPrompt,
      agentAnalyses: [composition, lighting, color, mood, detail],
    };
  },
});

export const getAvailableProviders = action({
  args: {},
  handler: async (): Promise<{
    providers: Array<{
      id: ImageProvider;
      name: string;
      available: boolean;
      description: string;
    }>;
    default: ImageProvider;
  }> => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const claudeApiKey = process.env.ANTHROPIC_API_KEY;
    const replicateApiKey = process.env.REPLICATE_API_TOKEN;

    return {
      providers: [
        {
          id: "openai",
          name: "OpenAI GPT-Image",
          available: !!openaiApiKey,
          description: "High quality image generation with DALL-E",
        },
        {
          id: "gemini",
          name: "Google Gemini",
          available: !!geminiApiKey,
          description: "Fast and efficient image analysis",
        },
        {
          id: "claude",
          name: "Anthropic Claude",
          available: !!claudeApiKey,
          description: "Advanced reasoning and image understanding",
        },
        {
          id: "replicate",
          name: "Replicate Flux",
          available: !!replicateApiKey,
          description: "Open-source image generation models",
        },
      ],
      default: "openai",
    };
  },
});
