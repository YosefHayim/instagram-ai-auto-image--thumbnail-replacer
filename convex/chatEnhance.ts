"use node"

import { action } from "./_generated/server"
import { v } from "convex/values"
import {
  runCompositionAgent,
  runLightingAgent,
  runColorAgent,
  runMoodAgent,
  runDetailAgent,
  combineAgentAnalyses,
  type AgentAnalysis,
} from "./ai/agents/specialists"
import { forge } from "./ai/agents/forge"

// Simple structured logging for Convex
const log = {
  info: (component: string, message: string, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString()
    console.log(JSON.stringify({ timestamp, level: "INFO", component, message, ...data }))
  },
  error: (component: string, message: string, error?: unknown, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString()
    console.error(JSON.stringify({
      timestamp,
      level: "ERROR",
      component,
      message,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
      ...data,
    }))
  },
  debug: (component: string, message: string, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString()
    console.log(JSON.stringify({ timestamp, level: "DEBUG", component, message, ...data }))
  },
}

export const enhanceWithChat = action({
  args: {
    imageUrl: v.string(),
    userPrompt: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean
    originalUrl: string
    enhancedUrl?: string
    superPrompt?: string
    agentAnalyses?: AgentAnalysis[]
    processingTimeMs: number
    error?: string
  }> => {
    const startTime = Date.now()

    log.info("ChatEnhance", "Starting enhancement", {
      imageUrl: args.imageUrl.slice(0, 100),
      userPrompt: args.userPrompt,
    })

    const geminiApiKey = process.env.GEMINI_API_KEY
    const replicateApiKey = process.env.REPLICATE_API_TOKEN

    log.debug("ChatEnhance", "Checking API keys", {
      hasGeminiKey: !!geminiApiKey,
      hasReplicateKey: !!replicateApiKey,
    })

    if (!geminiApiKey || !replicateApiKey) {
      log.error("ChatEnhance", "Missing API keys", undefined, {
        hasGeminiKey: !!geminiApiKey,
        hasReplicateKey: !!replicateApiKey,
      })
      return {
        success: false,
        originalUrl: args.imageUrl,
        error: "Missing API keys. Please configure GEMINI_API_KEY and REPLICATE_API_TOKEN in Convex environment variables.",
        processingTimeMs: Date.now() - startTime,
      }
    }

    try {
      console.log("═══════════════════════════════════════════════════════════")
      console.log("[ChatEnhance] STARTING 5-PARALLEL-AGENT ENHANCEMENT")
      console.log(`[ChatEnhance] User prompt: "${args.userPrompt}"`)
      console.log("═══════════════════════════════════════════════════════════")

      // Run all 5 agents in parallel
      console.log("\n[ChatEnhance] Running 5 specialist agents in parallel...")
      const [composition, lighting, color, mood, detail] = await Promise.all([
        runCompositionAgent(args.imageUrl, args.userPrompt, geminiApiKey),
        runLightingAgent(args.imageUrl, args.userPrompt, geminiApiKey),
        runColorAgent(args.imageUrl, args.userPrompt, geminiApiKey),
        runMoodAgent(args.imageUrl, args.userPrompt, geminiApiKey),
        runDetailAgent(args.imageUrl, args.userPrompt, geminiApiKey),
      ])

      console.log("\n[ChatEnhance] Agent analyses complete:")
      console.log(`  - Composition: ${composition.confidence.toFixed(2)} confidence`)
      console.log(`  - Lighting: ${lighting.confidence.toFixed(2)} confidence`)
      console.log(`  - Color: ${color.confidence.toFixed(2)} confidence`)
      console.log(`  - Mood: ${mood.confidence.toFixed(2)} confidence`)
      console.log(`  - Detail: ${detail.confidence.toFixed(2)} confidence`)

      // Combine into super prompt
      console.log("\n[ChatEnhance] Combining analyses into super-prompt...")
      const superPrompt = combineAgentAnalyses(
        args.userPrompt,
        composition,
        lighting,
        color,
        mood,
        detail
      )
      console.log(`[ChatEnhance] Super-prompt: ${superPrompt.slice(0, 150)}...`)

      // Generate enhanced image using forge
      console.log("\n[ChatEnhance] Generating enhanced image...")
      const enhancedUrl = await forge(
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
        replicateApiKey
      )

      const processingTimeMs = Date.now() - startTime

      console.log("\n═══════════════════════════════════════════════════════════")
      console.log(`[ChatEnhance] COMPLETE - ${(processingTimeMs / 1000).toFixed(1)}s`)
      console.log("═══════════════════════════════════════════════════════════")

      return {
        success: true,
        originalUrl: args.imageUrl,
        enhancedUrl,
        superPrompt,
        agentAnalyses: [composition, lighting, color, mood, detail],
        processingTimeMs,
      }
    } catch (error) {
      console.error("[ChatEnhance] Error:", error)

      return {
        success: false,
        originalUrl: args.imageUrl,
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: Date.now() - startTime,
      }
    }
  },
})

export const analyzeOnly = action({
  args: {
    imageUrl: v.string(),
    userPrompt: v.string(),
  },
  handler: async (ctx, args): Promise<{
    superPrompt: string
    agentAnalyses: AgentAnalysis[]
  }> => {
    const geminiApiKey = process.env.GEMINI_API_KEY

    if (!geminiApiKey) {
      throw new Error("Missing GEMINI_API_KEY")
    }

    // Run all 5 agents in parallel
    const [composition, lighting, color, mood, detail] = await Promise.all([
      runCompositionAgent(args.imageUrl, args.userPrompt, geminiApiKey),
      runLightingAgent(args.imageUrl, args.userPrompt, geminiApiKey),
      runColorAgent(args.imageUrl, args.userPrompt, geminiApiKey),
      runMoodAgent(args.imageUrl, args.userPrompt, geminiApiKey),
      runDetailAgent(args.imageUrl, args.userPrompt, geminiApiKey),
    ])

    // Combine into super prompt
    const superPrompt = combineAgentAnalyses(
      args.userPrompt,
      composition,
      lighting,
      color,
      mood,
      detail
    )

    return {
      superPrompt,
      agentAnalyses: [composition, lighting, color, mood, detail],
    }
  },
})
