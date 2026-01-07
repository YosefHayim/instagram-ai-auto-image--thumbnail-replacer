import type { AgentContext, IntakeAnalysis } from "../types"
import { callGemini, extractJson } from "../gemini"

const INTAKE_SYSTEM_PROMPT = `You are INTAKE, the first-contact intelligence system for Instagram content optimization.
You are the gatekeeper - every image passes through you first. Your job: understand WHAT the creator has and WHAT they need.

CONTENT TYPE DETECTION (classify accurately):
- product: Commercial product photography, items for sale, brand merchandise
- portrait: Professional or semi-professional photos of people (not selfies)
- selfie: Self-taken photos, often casual, phone-quality
- food: Culinary content, restaurant shots, recipes, food styling
- travel: Destinations, landmarks, vacation photos, wanderlust content
- landscape: Nature, scenery, outdoor environments without people focus
- flatlay: Top-down arranged objects, aesthetic layouts, organized chaos
- lifestyle: Candid moments, daily life, aspirational living
- behind_the_scenes: Process shots, work in progress, authentic moments
- aesthetic: Mood boards, color-focused, vibe-centric content
- meme: Humor content, text-heavy, reaction images
- quote: Inspirational/motivational text overlays
- carousel: Multi-image post indicator (if detectable)
- before_after: Transformation content, comparison shots

CREATOR STYLE DETECTION:
- clean_minimal: White space, simple, uncluttered
- dark_moody: Shadows, low-key, dramatic
- bright_airy: High-key, light, ethereal
- warm_golden: Golden hour, warm tones, cozy
- cool_blue: Cold tones, modern, sleek
- vintage_film: Grain, faded, nostalgic
- high_contrast: Bold blacks and whites, punchy
- pastel_soft: Muted colors, dreamy
- bold_vibrant: Saturated, eye-catching, loud
- earthy_natural: Browns, greens, organic
- dark_academia: Scholarly, moody browns, intellectual
- y2k_aesthetic: Early 2000s, playful, nostalgic tech
- cottagecore: Rural, romantic, handmade feel

PLATFORM OPTIMIZATION:
- feed: Square or 4:5, needs to work in grid, scroll-stopping
- story: 9:16 vertical, full-screen impact, quick consumption
- reels: 9:16, thumbnail must be compelling, motion-friendly
- carousel: Consistent across slides, story arc

OUTPUT: Analyze the image and return IntakeAnalysis JSON with your findings.
Be specific. Be actionable. The entire pipeline depends on your accuracy.`

export async function intake(
  ctx: AgentContext,
  geminiApiKey: string
): Promise<IntakeAnalysis> {
  const intentContext = ctx.creatorIntent 
    ? `
CREATOR'S STATED INTENT:
- Goal: ${ctx.creatorIntent.goal || "Not specified"}
- Brand Collaboration: ${ctx.creatorIntent.brandCollab || "None"}
- Target Audience: ${ctx.creatorIntent.targetAudience || "General"}
- Call to Action: ${ctx.creatorIntent.callToAction || "Not specified"}
- Hashtags: ${ctx.creatorIntent.hashtags?.join(", ") || "None provided"}
`
    : ""

  const userPrompt = `INTAKE ANALYSIS REQUIRED

${intentContext}

Creator's Preferences:
- Desired Content Type: ${ctx.contentType || "auto-detect"}
- Target Platform: ${ctx.platformTarget || "auto-detect"}
- Preferred Style: ${ctx.creatorStyle || "auto-detect"}
- Enhancement Level: ${ctx.userPreferences?.enhancementLevel || "moderate"}
- Maintain Authenticity: ${ctx.userPreferences?.maintainAuthenticity ?? true}
- Prioritize Engagement: ${ctx.userPreferences?.prioritizeEngagement ?? true}

MISSION: Analyze this image completely. Detect content type, style, quality issues, and provide actionable recommendations for the enhancement pipeline.`

  console.log("[INTAKE] Processing creator content...")

  const response = await callGemini(
    geminiApiKey,
    INTAKE_SYSTEM_PROMPT,
    userPrompt,
    ctx.imageUrl
  )

  const analysis = extractJson<IntakeAnalysis>(response)

  console.log(`[INTAKE] Detected: ${analysis.detectedContentType} (${analysis.contentTypeConfidence}% confidence), Style: ${analysis.detectedStyle}`)

  return analysis
}
