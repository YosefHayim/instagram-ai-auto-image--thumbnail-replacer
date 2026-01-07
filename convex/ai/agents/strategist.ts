import type { ImageAnalysis, EnhancementStrategy, AgentContext, IntakeAnalysis, ContentType, PlatformTarget } from "../types"
import { callGemini, extractJson } from "../gemini"

const CONTENT_TYPE_STRATEGIES: Record<ContentType, { focus: string[]; avoid: string[] }> = {
  product: {
    focus: ["clean background", "accurate colors", "sharp details", "professional lighting", "highlight features"],
    avoid: ["artistic filters", "heavy color grading", "blur effects", "mood alterations"]
  },
  portrait: {
    focus: ["skin quality", "eye enhancement", "flattering light", "background separation", "natural skin tones"],
    avoid: ["over-smoothing", "unnatural skin", "plastic look", "removing character"]
  },
  selfie: {
    focus: ["natural enhancement", "subtle smoothing", "good lighting correction", "authentic feel"],
    avoid: ["heavy retouching", "obvious filters", "fake-looking results"]
  },
  food: {
    focus: ["appetite appeal", "warm tones", "texture pop", "steam/freshness", "color accuracy"],
    avoid: ["cool tones", "desaturation", "artificial colors", "unappetizing modifications"]
  },
  travel: {
    focus: ["epic scale", "vibrant skies", "destination mood", "wanderlust feeling", "golden hour enhancement"],
    avoid: ["over-saturation", "fake skies", "unrealistic colors", "losing authenticity"]
  },
  landscape: {
    focus: ["dynamic range", "sky enhancement", "depth", "natural colors", "atmosphere"],
    avoid: ["HDR overprocessing", "fake elements", "unnatural saturation"]
  },
  flatlay: {
    focus: ["clean shadows", "color coordination", "balanced exposure", "organized aesthetic"],
    avoid: ["harsh shadows", "color casts", "cluttered feel"]
  },
  lifestyle: {
    focus: ["candid feel", "warm atmosphere", "authentic moments", "aspirational but real"],
    avoid: ["over-polishing", "removing authenticity", "stock photo feel"]
  },
  behind_the_scenes: {
    focus: ["authentic feel", "raw energy", "process visibility", "real moments"],
    avoid: ["heavy editing", "polished look", "removing imperfections that add character"]
  },
  aesthetic: {
    focus: ["mood amplification", "color harmony", "visual coherence", "artistic expression"],
    avoid: ["breaking the vibe", "inconsistent editing", "clashing elements"]
  },
  meme: {
    focus: ["text readability", "high contrast", "clear subjects", "shareable quality"],
    avoid: ["artistic filters", "mood changes", "losing humor"]
  },
  quote: {
    focus: ["text legibility", "background simplicity", "brand consistency", "clean design"],
    avoid: ["busy backgrounds", "competing elements", "hard-to-read text"]
  },
  carousel: {
    focus: ["consistency across slides", "visual flow", "cohesive story", "swipe motivation"],
    avoid: ["inconsistent editing", "jarring transitions", "disconnected slides"]
  },
  before_after: {
    focus: ["clear difference", "same lighting conditions", "comparable framing", "honest transformation"],
    avoid: ["misleading edits", "inconsistent conditions", "fake results"]
  },
  unknown: {
    focus: ["general enhancement", "quality improvement", "balanced editing"],
    avoid: ["drastic changes", "style assumptions"]
  }
}

const PLATFORM_STRATEGIES: Record<PlatformTarget, { considerations: string[]; thumbnail: string[] }> = {
  feed: {
    considerations: ["Works in 3-column grid", "Square or 4:5 optimal", "Must be scroll-stopping", "Competes with other posts"],
    thumbnail: ["Clear at 110x110px", "Strong focal point", "High contrast helps", "Recognizable subject"]
  },
  story: {
    considerations: ["Full-screen vertical 9:16", "Quick consumption", "Swipe-up potential", "Text overlay friendly"],
    thumbnail: ["N/A for stories", "Focus on immediate impact"]
  },
  reels: {
    considerations: ["9:16 vertical", "Thumbnail is critical", "Motion-friendly base", "Text overlay space"],
    thumbnail: ["Must compete in Reels tab", "Face or action visible", "Curiosity-inducing", "Clear even when small"]
  },
  carousel: {
    considerations: ["First image is hook", "Consistent across slides", "Story arc", "Swipe motivation"],
    thumbnail: ["First image represents all", "Teases more content", "Clear value proposition"]
  }
}

const STRATEGIST_SYSTEM_PROMPT = `You are STRATEGIST, the tactical enhancement planner for Instagram content.
You receive intelligence from INTAKE and VISION, then craft a battle plan for maximum engagement.

YOUR KNOWLEDGE BASE:
- Content-type specific optimization strategies
- Platform-specific requirements and best practices
- Instagram algorithm preferences (2024)
- Creator brand consistency principles
- Engagement psychology

STRATEGIC FRAMEWORK:

1. CONTENT TYPE STRATEGY
Based on the detected content type, apply specialized optimization rules.
Different content needs different treatment - a product shot vs a selfie are worlds apart.

2. PLATFORM STRATEGY
Each platform surface (Feed, Story, Reels) has unique requirements.
Thumbnail optimization is CRITICAL for Feed and Reels.

3. STYLE STRATEGY
Honor the creator's existing aesthetic while enhancing.
Consistency > individual perfection.

4. ADJUSTMENT PLANNING
Each adjustment must have:
- Category: What aspect are we changing?
- Action: Specific, measurable change
- Intensity: subtle / moderate / significant
- Reason: Why this helps overall
- Content Type Reason: Why this helps THIS type of content specifically

5. ENGAGEMENT BOOST PREDICTION
Estimate how much your strategy will improve engagement metrics.
Be realistic - overpromising destroys trust.

OUTPUT: Return EnhancementStrategy JSON with comprehensive battle plan.`

export async function strategist(
  ctx: AgentContext,
  intakeData: IntakeAnalysis,
  analysis: ImageAnalysis,
  geminiApiKey: string
): Promise<EnhancementStrategy> {
  const contentType = ctx.contentType || intakeData.detectedContentType
  const platform = ctx.platformTarget || intakeData.suggestedPlatform
  const contentStrategy = CONTENT_TYPE_STRATEGIES[contentType] || CONTENT_TYPE_STRATEGIES.unknown
  const platformStrategy = PLATFORM_STRATEGIES[platform] || PLATFORM_STRATEGIES.feed

  const userPrompt = `STRATEGIC ENHANCEMENT PLANNING

INTAKE INTELLIGENCE:
- Content Type: ${contentType} (${intakeData.contentTypeConfidence}% confidence)
- Detected Style: ${intakeData.detectedStyle}
- Enhancement Potential: ${intakeData.enhancementPotential}
- Quality Issues: Resolution=${intakeData.qualityAssessment.resolution}, Noise=${intakeData.qualityAssessment.noise}
- Creator Recommendations from INTAKE: ${intakeData.creatorRecommendations.join("; ")}

VISION ANALYSIS:
- Aesthetic Score: ${analysis.aestheticScore}/100
- Viral Potential: ${analysis.viralPotential}/100
- Thumbnail Readability: ${analysis.composition.thumbnailReadability}/100
- Grid Preview Score: ${analysis.composition.gridPreviewScore}/100
- Engagement Predictions: Like=${analysis.engagementPrediction.likeability}, Share=${analysis.engagementPrediction.shareability}, Save=${analysis.engagementPrediction.saveability}, Comment=${analysis.engagementPrediction.commentPotential}
- Technical Issues: ${analysis.technicalIssues.join(", ") || "None"}
- Subject Mood: ${analysis.subject.mood}
- Emotional Tone: ${analysis.subject.emotionalTone}

CONTENT TYPE STRATEGY FOR "${contentType.toUpperCase()}":
- Focus on: ${contentStrategy.focus.join(", ")}
- Avoid: ${contentStrategy.avoid.join(", ")}

PLATFORM STRATEGY FOR "${platform.toUpperCase()}":
- Considerations: ${platformStrategy.considerations.join(", ")}
- Thumbnail requirements: ${platformStrategy.thumbnail.join(", ")}

CREATOR PREFERENCES:
- Target Style: ${ctx.creatorStyle || intakeData.detectedStyle}
- Enhancement Level: ${ctx.userPreferences?.enhancementLevel || "moderate"}
- Maintain Authenticity: ${ctx.userPreferences?.maintainAuthenticity ?? true}
- Prioritize Engagement: ${ctx.userPreferences?.prioritizeEngagement ?? true}
- Preserve Faces: ${ctx.userPreferences?.preserveFaces ?? true}

${ctx.creatorIntent?.goal ? `CREATOR'S GOAL: ${ctx.creatorIntent.goal}` : ""}
${ctx.creatorIntent?.brandCollab ? `BRAND COLLAB: ${ctx.creatorIntent.brandCollab}` : ""}

MISSION: Create a comprehensive enhancement strategy that:
1. Maximizes engagement for this specific content type
2. Optimizes for the target platform
3. Maintains creator's authentic style
4. Addresses technical issues identified by VISION
5. Predicts realistic engagement improvement`

  console.log(`[STRATEGIST] Crafting strategy for ${contentType} content on ${platform}...`)

  const response = await callGemini(
    geminiApiKey,
    STRATEGIST_SYSTEM_PROMPT,
    userPrompt
  )

  const strategy = extractJson<EnhancementStrategy>(response)

  console.log(`[STRATEGIST] Strategy ready. Priority: ${strategy.priority}, Expected improvement: +${strategy.expectedImprovement}, Engagement boost: +${strategy.engagementBoostPrediction}%`)

  return strategy
}
