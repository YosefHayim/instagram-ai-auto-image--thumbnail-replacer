import { v } from "convex/values"
import { action, internalMutation } from "../_generated/server"
import { internal } from "../_generated/api"
import { runEnhancementPipeline, runQuickEnhancement } from "./pipeline"
import type { AgentContext, ContentType, PlatformTarget, CreatorStyle } from "./types"

const contentTypeValidator = v.union(
  v.literal("product"),
  v.literal("portrait"),
  v.literal("selfie"),
  v.literal("food"),
  v.literal("travel"),
  v.literal("landscape"),
  v.literal("flatlay"),
  v.literal("lifestyle"),
  v.literal("behind_the_scenes"),
  v.literal("aesthetic"),
  v.literal("meme"),
  v.literal("quote"),
  v.literal("carousel"),
  v.literal("before_after"),
  v.literal("unknown")
)

const platformTargetValidator = v.union(
  v.literal("feed"),
  v.literal("story"),
  v.literal("reels"),
  v.literal("carousel")
)

const creatorStyleValidator = v.union(
  v.literal("clean_minimal"),
  v.literal("dark_moody"),
  v.literal("bright_airy"),
  v.literal("warm_golden"),
  v.literal("cool_blue"),
  v.literal("vintage_film"),
  v.literal("high_contrast"),
  v.literal("pastel_soft"),
  v.literal("bold_vibrant"),
  v.literal("earthy_natural"),
  v.literal("dark_academia"),
  v.literal("y2k_aesthetic"),
  v.literal("cottagecore"),
  v.literal("custom")
)

const enhancementLevelValidator = v.union(
  v.literal("subtle"),
  v.literal("moderate"),
  v.literal("dramatic")
)

export const enhanceImage = action({
  args: {
    imageUrl: v.string(),
    brandReferenceUrl: v.optional(v.string()),
    contentType: v.optional(contentTypeValidator),
    platformTarget: v.optional(platformTargetValidator),
    creatorStyle: v.optional(creatorStyleValidator),
    creatorIntent: v.optional(
      v.object({
        goal: v.optional(v.string()),
        brandCollab: v.optional(v.string()),
        targetAudience: v.optional(v.string()),
        callToAction: v.optional(v.string()),
        hashtags: v.optional(v.array(v.string())),
        competitorReference: v.optional(v.string()),
      })
    ),
    stylePreset: v.optional(v.string()),
    enhancementLevel: v.optional(enhancementLevelValidator),
    preserveFaces: v.optional(v.boolean()),
    maintainAuthenticity: v.optional(v.boolean()),
    prioritizeEngagement: v.optional(v.boolean()),
    useFullPipeline: v.optional(v.boolean()),
    optimizationId: v.optional(v.id("optimizations")),
  },
  handler: async (ctx, args) => {
    const geminiApiKey = process.env.GEMINI_API_KEY
    const replicateApiKey = process.env.REPLICATE_API_KEY

    if (!replicateApiKey) {
      throw new Error("REPLICATE_API_KEY not configured")
    }

    if (args.optimizationId) {
      await ctx.runMutation(internal.ai.enhance.updateOptimizationStatus, {
        optimizationId: args.optimizationId,
        status: "processing",
      })
    }

    const context: AgentContext = {
      imageUrl: args.imageUrl,
      brandReferenceUrl: args.brandReferenceUrl,
      contentType: args.contentType as ContentType | undefined,
      platformTarget: args.platformTarget as PlatformTarget | undefined,
      creatorStyle: args.creatorStyle as CreatorStyle | undefined,
      creatorIntent: args.creatorIntent,
      stylePreset: args.stylePreset,
      userPreferences: {
        preserveFaces: args.preserveFaces ?? true,
        enhancementLevel: args.enhancementLevel || "moderate",
        maintainAuthenticity: args.maintainAuthenticity ?? true,
        prioritizeEngagement: args.prioritizeEngagement ?? true,
      },
    }

    let result

    if (args.useFullPipeline) {
      if (!geminiApiKey) {
        throw new Error("GEMINI_API_KEY not configured (required for full 6-layer pipeline)")
      }
      result = await runEnhancementPipeline(context, geminiApiKey, replicateApiKey)
    } else {
      result = await runQuickEnhancement(context, replicateApiKey)
    }

    if (args.optimizationId) {
      await ctx.runMutation(internal.ai.enhance.updateOptimizationStatus, {
        optimizationId: args.optimizationId,
        status: result.success ? "completed" : "failed",
        aiUrl: result.enhancedUrl,
      })
    }

    return result
  },
})

export const updateOptimizationStatus = internalMutation({
  args: {
    optimizationId: v.id("optimizations"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    aiUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const update: Record<string, unknown> = { status: args.status }
    if (args.aiUrl) {
      update.aiUrl = args.aiUrl
    }
    await ctx.db.patch(args.optimizationId, update)
  },
})

export const batchEnhance = action({
  args: {
    images: v.array(
      v.object({
        imageUrl: v.string(),
        optimizationId: v.optional(v.id("optimizations")),
      })
    ),
    contentType: v.optional(contentTypeValidator),
    platformTarget: v.optional(platformTargetValidator),
    creatorStyle: v.optional(creatorStyleValidator),
    stylePreset: v.optional(v.string()),
    enhancementLevel: v.optional(enhancementLevelValidator),
  },
  handler: async (ctx, args) => {
    const replicateApiKey = process.env.REPLICATE_API_KEY

    if (!replicateApiKey) {
      throw new Error("REPLICATE_API_KEY not configured")
    }

    const results = []

    for (const image of args.images) {
      if (image.optimizationId) {
        await ctx.runMutation(internal.ai.enhance.updateOptimizationStatus, {
          optimizationId: image.optimizationId,
          status: "processing",
        })
      }

      const context: AgentContext = {
        imageUrl: image.imageUrl,
        contentType: args.contentType as ContentType | undefined,
        platformTarget: args.platformTarget as PlatformTarget | undefined,
        creatorStyle: args.creatorStyle as CreatorStyle | undefined,
        stylePreset: args.stylePreset,
        userPreferences: {
          preserveFaces: true,
          enhancementLevel: args.enhancementLevel || "moderate",
          maintainAuthenticity: true,
          prioritizeEngagement: true,
        },
      }

      const result = await runQuickEnhancement(context, replicateApiKey)

      if (image.optimizationId) {
        await ctx.runMutation(internal.ai.enhance.updateOptimizationStatus, {
          optimizationId: image.optimizationId,
          status: result.success ? "completed" : "failed",
          aiUrl: result.enhancedUrl,
        })
      }

      results.push({
        originalUrl: image.imageUrl,
        enhancedUrl: result.enhancedUrl,
        success: result.success,
        error: result.error,
      })

      await new Promise((r) => setTimeout(r, 1000))
    }

    return results
  },
})

export const analyzeOnly = action({
  args: {
    imageUrl: v.string(),
    contentType: v.optional(contentTypeValidator),
    platformTarget: v.optional(platformTargetValidator),
    creatorStyle: v.optional(creatorStyleValidator),
  },
  handler: async (ctx, args) => {
    const geminiApiKey = process.env.GEMINI_API_KEY

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured")
    }

    const { intake } = await import("./agents/intake")
    const { vision } = await import("./agents/vision")

    const context: AgentContext = {
      imageUrl: args.imageUrl,
      contentType: args.contentType as ContentType | undefined,
      platformTarget: args.platformTarget as PlatformTarget | undefined,
      creatorStyle: args.creatorStyle as CreatorStyle | undefined,
      userPreferences: {
        preserveFaces: true,
        enhancementLevel: "moderate",
        maintainAuthenticity: true,
        prioritizeEngagement: true,
      },
    }

    const intakeData = await intake(context, geminiApiKey)
    const analysis = await vision(context, intakeData, geminiApiKey)

    return {
      intake: intakeData,
      analysis,
      recommendations: intakeData.creatorRecommendations,
      enhancementPotential: intakeData.enhancementPotential,
      viralPotential: analysis.viralPotential,
      engagementPrediction: analysis.engagementPrediction,
    }
  },
})
