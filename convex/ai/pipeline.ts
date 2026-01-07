import type { AgentContext, PipelineResult, GenerationPrompt } from "./types"
import { intake } from "./agents/intake"
import { vision } from "./agents/vision"
import { strategist } from "./agents/strategist"
import { artist } from "./agents/artist"
import { forge } from "./agents/forge"
import { curator } from "./agents/curator"

const MAX_RETRIES = 2

export async function runEnhancementPipeline(
  ctx: AgentContext,
  geminiApiKey: string,
  replicateApiKey: string
): Promise<PipelineResult> {
  const startTime = Date.now()

  try {
    console.log("═══════════════════════════════════════════════════════════")
    console.log("[Pipeline] INSTAGRAM AI OPTIMIZER - 6-LAYER ENHANCEMENT")
    console.log("═══════════════════════════════════════════════════════════")

    console.log("\n[Pipeline] Layer 0: INTAKE - Processing creator content...")
    const intakeData = await intake(ctx, geminiApiKey)

    console.log("\n[Pipeline] Layer 1: VISION - Deep visual analysis...")
    const analysis = await vision(ctx, intakeData, geminiApiKey)

    console.log("\n[Pipeline] Layer 2: STRATEGIST - Crafting enhancement strategy...")
    const strategy = await strategist(ctx, intakeData, analysis, geminiApiKey)

    console.log("\n[Pipeline] Layer 3: ARTIST - Engineering generation prompt...")
    const prompt = await artist(ctx, intakeData, analysis, strategy, geminiApiKey)

    let enhancedUrl: string | undefined
    let validation: PipelineResult["validation"]
    let retries = 0
    let currentPrompt: GenerationPrompt = { ...prompt }

    while (retries <= MAX_RETRIES) {
      console.log(`\n[Pipeline] Layer 4: FORGE - Generating image (attempt ${retries + 1}/${MAX_RETRIES + 1})...`)
      enhancedUrl = await forge(ctx, currentPrompt, replicateApiKey)

      console.log("\n[Pipeline] Layer 5: CURATOR - Final quality assessment...")
      validation = await curator(
        ctx,
        ctx.imageUrl,
        enhancedUrl,
        intakeData,
        analysis,
        strategy,
        geminiApiKey
      )

      if (validation.passed || validation.recommendation === "accept") {
        console.log("\n[Pipeline] ✓ CURATOR APPROVED - Enhancement complete!")
        break
      }

      if (validation.recommendation === "regenerate") {
        console.log("\n[Pipeline] ✗ CURATOR REJECTED - Regenerating...")
        if (retries < MAX_RETRIES) {
          currentPrompt = {
            ...currentPrompt,
            technicalParameters: {
              ...currentPrompt.technicalParameters,
              strength: Math.max(currentPrompt.technicalParameters.strength - 0.1, 0.2),
              seed: Math.floor(Math.random() * 1000000),
            },
          }
        }
      } else if (validation.recommendation === "adjust_parameters") {
        console.log("\n[Pipeline] ~ CURATOR REQUESTED ADJUSTMENTS - Tweaking parameters...")
        if (retries < MAX_RETRIES) {
          currentPrompt = {
            ...currentPrompt,
            technicalParameters: {
              ...currentPrompt.technicalParameters,
              strength: Math.min(currentPrompt.technicalParameters.strength + 0.1, 0.9),
              guidanceScale: Math.min(currentPrompt.technicalParameters.guidanceScale + 0.5, 12),
            },
          }
        }
      }

      retries++
    }

    const processingTimeMs = Date.now() - startTime

    console.log("\n═══════════════════════════════════════════════════════════")
    console.log(`[Pipeline] COMPLETE - ${(processingTimeMs / 1000).toFixed(1)}s`)
    console.log("═══════════════════════════════════════════════════════════")

    return {
      success: true,
      originalUrl: ctx.imageUrl,
      enhancedUrl,
      intake: intakeData,
      analysis,
      strategy,
      prompt: currentPrompt,
      validation,
      processingTimeMs,
      creatorInsights: generateCreatorInsights(intakeData, analysis, strategy),
    }
  } catch (error) {
    console.error("[Pipeline] Error:", error)

    return {
      success: false,
      originalUrl: ctx.imageUrl,
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: Date.now() - startTime,
    }
  }
}

export async function runQuickEnhancement(
  ctx: AgentContext,
  replicateApiKey: string
): Promise<PipelineResult> {
  const startTime = Date.now()

  try {
    const stylePrompts: Record<string, string> = {
      cinematic: "cinematic color grading, film look, dramatic lighting, professional photography, 8k, masterpiece",
      vibrant: "vibrant colors, high saturation, punchy contrast, eye-catching, professional photography, 8k",
      minimal: "clean aesthetic, soft colors, minimalist, balanced exposure, professional photography, 8k",
      vintage: "vintage film look, warm tones, slight grain, nostalgic, professional photography",
      moody: "moody atmosphere, deep shadows, desaturated highlights, artistic, professional photography, 8k",
      warm_golden: "warm golden hour tones, cozy atmosphere, amber glow, professional photography, 8k",
      cool_blue: "cool blue tones, modern sleek, contemporary, professional photography, 8k",
      bright_airy: "bright and airy, high key, light filled, ethereal, professional photography, 8k",
    }

    const basePrompt = stylePrompts[ctx.stylePreset || ctx.creatorStyle || "vibrant"] || stylePrompts.vibrant
    const negativePrompt = "blur, noise, artifacts, oversaturated, overexposed, underexposed, distorted, low quality, jpeg artifacts, ai artifacts, unnatural"

    const prompt: GenerationPrompt = {
      mainPrompt: `enhance this photo, ${basePrompt}`,
      negativePrompt,
      styleModifiers: [ctx.stylePreset || ctx.creatorStyle || "vibrant"],
      contentTypeModifiers: [],
      platformModifiers: ["instagram-ready"],
      technicalParameters: {
        strength: 0.45,
        guidanceScale: 7.5,
        steps: 30,
      },
      model: "flux",
    }

    console.log("[QuickPipeline] FORGE generating enhanced image...")
    const enhancedUrl = await forge(ctx, prompt, replicateApiKey)

    return {
      success: true,
      originalUrl: ctx.imageUrl,
      enhancedUrl,
      prompt,
      processingTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    console.error("[QuickPipeline] Error:", error)

    return {
      success: false,
      originalUrl: ctx.imageUrl,
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: Date.now() - startTime,
    }
  }
}

function generateCreatorInsights(
  intakeData: PipelineResult["intake"],
  analysis: PipelineResult["analysis"],
  strategy: PipelineResult["strategy"]
): PipelineResult["creatorInsights"] {
  if (!intakeData || !analysis || !strategy) return undefined

  const bestTimes: Record<string, string> = {
    product: "Tuesday-Thursday, 10am-2pm (shopping mindset)",
    portrait: "Monday, Wednesday, Friday evenings 6-9pm",
    selfie: "Daily 12pm-3pm and 7-9pm (lunch and evening scroll)",
    food: "11am-1pm (lunch inspiration) or 5-7pm (dinner planning)",
    travel: "Thursday-Sunday (weekend planning mode)",
    landscape: "Early morning 6-8am or sunset hours 5-7pm",
    lifestyle: "Sunday evenings (week planning) or Wednesday (midweek inspiration)",
    behind_the_scenes: "Weekday afternoons 2-5pm (work break scrolling)",
  }

  const contentType = intakeData.detectedContentType
  const mood = analysis.subject.mood
  const style = intakeData.detectedStyle

  return {
    bestPostingTime: bestTimes[contentType] || "Weekdays 11am-1pm or 7-9pm",
    suggestedCaption: generateCaptionSuggestion(contentType, mood, strategy.targetAesthetic),
    hashtagRecommendations: generateHashtagRecommendations(contentType, style),
    engagementTips: generateEngagementTips(analysis, strategy),
  }
}

function generateCaptionSuggestion(contentType: string, mood: string, aesthetic: string): string {
  const templates: Record<string, string[]> = {
    product: [
      "The details that make the difference ✨",
      "Quality you can see, feel, and trust.",
      "Introducing your new favorite.",
    ],
    portrait: [
      "Moments like these ✨",
      "Captured.",
      "The story behind the smile.",
    ],
    food: [
      "Taste the moment 🍽️",
      "Good food, good mood.",
      "Currently craving: everything in this photo.",
    ],
    travel: [
      "Take me back 🌍",
      "Wanderlust: activated.",
      "The world is yours to explore.",
    ],
    lifestyle: [
      "Living in the moment ✨",
      "This is the life.",
      "Everyday magic.",
    ],
  }

  const options = templates[contentType] || ["✨"]
  return options[Math.floor(Math.random() * options.length)]
}

function generateHashtagRecommendations(contentType: string, style: string): string[] {
  const baseHashtags: Record<string, string[]> = {
    product: ["#productphotography", "#shopsmall", "#newproduct", "#musthave"],
    portrait: ["#portraitphotography", "#portraits", "#portraitmood", "#pursuitofportraits"],
    food: ["#foodphotography", "#foodie", "#instafood", "#foodstagram"],
    travel: ["#travelphotography", "#wanderlust", "#travelgram", "#explore"],
    lifestyle: ["#lifestylephotography", "#lifestyle", "#dailylife", "#liveyourlife"],
    landscape: ["#landscapephotography", "#nature", "#naturephotography", "#earthpix"],
  }

  const styleHashtags: Record<string, string[]> = {
    dark_moody: ["#moodygrams", "#moody", "#darkfeed"],
    bright_airy: ["#brightandairy", "#lightandbright", "#cleanfeed"],
    vintage_film: ["#filmisnotdead", "#35mm", "#analogphotography"],
    minimal: ["#minimalism", "#minimal", "#minimalfeed"],
  }

  const base = baseHashtags[contentType] || ["#photography", "#instagram"]
  const styleSpecific = styleHashtags[style] || []

  return [...base.slice(0, 3), ...styleSpecific.slice(0, 2)]
}

function generateEngagementTips(
  analysis: PipelineResult["analysis"],
  strategy: PipelineResult["strategy"]
): string[] {
  const tips: string[] = []

  if (analysis) {
    if (analysis.engagementPrediction.commentPotential > 70) {
      tips.push("Ask a question in your caption to boost comments")
    }
    if (analysis.engagementPrediction.saveability > 70) {
      tips.push("Add value or tips to encourage saves")
    }
    if (analysis.composition.thumbnailReadability < 60) {
      tips.push("Consider a closer crop for better grid visibility")
    }
  }

  if (strategy) {
    if (strategy.engagementBoostPrediction > 20) {
      tips.push("This enhanced version should significantly outperform the original")
    }
  }

  tips.push("Post when your audience is most active (check Insights)")
  tips.push("Engage with comments in the first hour for algorithm boost")

  return tips.slice(0, 4)
}
