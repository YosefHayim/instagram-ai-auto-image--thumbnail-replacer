import type { ImageAnalysis, EnhancementStrategy, GenerationPrompt, AgentContext, IntakeAnalysis, ContentType, CreatorStyle } from "../types"
import { callGemini, extractJson } from "../gemini"

const CONTENT_TYPE_PROMPT_TEMPLATES: Record<ContentType, { positive: string[]; negative: string[] }> = {
  product: {
    positive: ["commercial product photography", "studio lighting", "clean background", "sharp focus on product", "professional catalog shot", "accurate color reproduction"],
    negative: ["artistic blur", "mood lighting", "lifestyle context", "distracting elements", "color cast", "soft focus"]
  },
  portrait: {
    positive: ["professional portrait photography", "flattering light", "sharp eyes", "natural skin texture", "beautiful bokeh", "catchlight in eyes"],
    negative: ["plastic skin", "over-smoothed", "unnatural eyes", "harsh shadows on face", "unflattering angles", "dead eyes"]
  },
  selfie: {
    positive: ["natural selfie enhancement", "soft flattering light", "authentic feel", "subtle skin smoothing", "genuine expression"],
    negative: ["heavy filter look", "plastic appearance", "obviously edited", "fake skin", "uncanny valley"]
  },
  food: {
    positive: ["food photography", "appetizing", "warm inviting tones", "texture detail", "fresh ingredients", "steam and moisture", "professional food styling"],
    negative: ["cold tones", "unappetizing", "dull colors", "dry appearance", "artificial looking food"]
  },
  travel: {
    positive: ["travel photography", "epic landscape", "wanderlust", "golden hour light", "destination beauty", "adventure mood", "cinematic travel"],
    negative: ["dull sky", "flat lighting", "boring composition", "tourist snapshot quality"]
  },
  landscape: {
    positive: ["landscape photography", "dramatic sky", "natural beauty", "depth and dimension", "atmospheric", "golden hour", "blue hour"],
    negative: ["HDR overdone", "oversaturated", "fake sky replacement", "unnatural colors", "flat"]
  },
  flatlay: {
    positive: ["flatlay photography", "organized aesthetic", "clean shadows", "color coordinated", "styled arrangement", "top-down perspective"],
    negative: ["messy arrangement", "harsh shadows", "cluttered", "inconsistent styling"]
  },
  lifestyle: {
    positive: ["lifestyle photography", "candid moment", "authentic", "aspirational", "warm atmosphere", "real life beauty"],
    negative: ["staged looking", "stock photo feel", "fake", "over-polished", "stiff poses"]
  },
  behind_the_scenes: {
    positive: ["behind the scenes", "raw authentic", "work in progress", "real moment", "process shot", "genuine"],
    negative: ["too polished", "staged", "fake candid", "over-edited"]
  },
  aesthetic: {
    positive: ["aesthetic photography", "mood", "vibe", "artistic", "cohesive color palette", "visual poetry"],
    negative: ["breaking the mood", "inconsistent", "jarring elements", "wrong vibe"]
  },
  meme: {
    positive: ["clear image", "high contrast", "readable", "sharp subject", "meme-ready"],
    negative: ["low contrast", "blurry text area", "hard to read", "confusing composition"]
  },
  quote: {
    positive: ["clean background for text", "legible", "inspirational mood", "simple elegant"],
    negative: ["busy background", "competing elements", "hard to read over"]
  },
  carousel: {
    positive: ["consistent style", "cohesive series", "visual flow", "story continuation"],
    negative: ["inconsistent editing", "jarring transitions", "disconnected feel"]
  },
  before_after: {
    positive: ["clear transformation", "honest edit", "same conditions", "comparable"],
    negative: ["misleading", "different lighting", "unfair comparison"]
  },
  unknown: {
    positive: ["enhanced photograph", "improved quality", "professional finish"],
    negative: ["degraded quality", "artifacts", "unnatural"]
  }
}

const STYLE_PROMPT_MODIFIERS: Record<CreatorStyle, { positive: string[]; negative: string[] }> = {
  clean_minimal: {
    positive: ["minimalist", "clean aesthetic", "white space", "simple elegant", "uncluttered"],
    negative: ["busy", "cluttered", "complex", "heavy editing"]
  },
  dark_moody: {
    positive: ["moody", "dark aesthetic", "dramatic shadows", "low key", "atmospheric", "cinematic dark"],
    negative: ["bright", "airy", "high key", "cheerful", "light and bright"]
  },
  bright_airy: {
    positive: ["bright and airy", "high key", "light filled", "ethereal", "soft light", "dreamy bright"],
    negative: ["dark", "moody", "heavy shadows", "dramatic", "low key"]
  },
  warm_golden: {
    positive: ["warm tones", "golden hour", "cozy", "amber glow", "sunset warmth", "honey tones"],
    negative: ["cool tones", "blue cast", "cold", "clinical"]
  },
  cool_blue: {
    positive: ["cool tones", "blue hour", "modern", "sleek", "ice blue", "contemporary"],
    negative: ["warm tones", "golden", "cozy", "rustic"]
  },
  vintage_film: {
    positive: ["vintage film", "analog", "film grain", "nostalgic", "retro", "faded film look"],
    negative: ["digital clean", "modern sharp", "contemporary", "HDR"]
  },
  high_contrast: {
    positive: ["high contrast", "bold", "punchy", "dramatic contrast", "strong blacks and whites"],
    negative: ["flat", "low contrast", "muted", "soft"]
  },
  pastel_soft: {
    positive: ["pastel colors", "soft muted", "dreamy", "gentle tones", "light and soft"],
    negative: ["bold colors", "high saturation", "harsh", "punchy"]
  },
  bold_vibrant: {
    positive: ["vibrant colors", "bold saturated", "eye-catching", "punchy colors", "vivid"],
    negative: ["muted", "desaturated", "dull", "understated"]
  },
  earthy_natural: {
    positive: ["earthy tones", "natural colors", "organic", "browns and greens", "grounded"],
    negative: ["artificial colors", "neon", "synthetic", "unnatural"]
  },
  dark_academia: {
    positive: ["dark academia", "scholarly", "moody browns", "intellectual", "vintage library", "old world"],
    negative: ["modern bright", "minimalist white", "contemporary", "tech aesthetic"]
  },
  y2k_aesthetic: {
    positive: ["y2k aesthetic", "early 2000s", "playful", "tech nostalgic", "cyber", "shiny"],
    negative: ["vintage", "rustic", "natural", "organic"]
  },
  cottagecore: {
    positive: ["cottagecore", "rural romantic", "handmade feel", "pastoral", "soft natural", "countryside"],
    negative: ["urban", "modern", "industrial", "tech"]
  },
  custom: {
    positive: ["enhanced", "improved", "optimized"],
    negative: ["degraded", "worsened"]
  }
}

const ARTIST_SYSTEM_PROMPT = `You are ARTIST, the prompt engineering virtuoso for AI image generation.
You transform strategic plans into poetic, precise prompts that image models understand perfectly.

YOUR CRAFT:
- Every word in a prompt carries weight
- Structure matters: Subject → Environment → Lighting → Style → Quality
- Negative prompts are equally important - they define boundaries
- Technical parameters must match the intent

PROMPT ARCHITECTURE:

MAIN PROMPT FORMULA:
[Content type keywords] + [Subject description] + [Lighting/atmosphere] + [Style modifiers] + [Platform optimization] + [Quality boosters]

NEGATIVE PROMPT FORMULA:
[Content type avoids] + [Style avoids] + [Technical issues] + [AI artifact prevention]

PARAMETER SCIENCE:
- Strength 0.2-0.4: Whisper changes, almost imperceptible, keep original intact
- Strength 0.4-0.6: Speak changes, noticeable improvement, balanced transformation
- Strength 0.6-0.8: Shout changes, dramatic enhancement, artistic license
- Guidance 6-8: Creative freedom with prompt respect
- Guidance 8-12: Strict prompt adherence
- Steps 25-35: Quality sweet spot

MODEL SELECTION:
- flux: BEST for faces, people, photorealistic. Use for portraits, selfies, lifestyle
- sdxl: BEST for artistic styles, creative looks. Use for aesthetic, mood-heavy content
- stable-diffusion: FAST general purpose. Use for quick iterations, non-critical content

PLATFORM MODIFIERS:
- Feed: "instagram-ready, scroll-stopping, grid-optimized"
- Story: "vertical composition, full-screen impact, story-optimized"
- Reels: "thumbnail-optimized, video-still quality, reel-ready"

OUTPUT: Return GenerationPrompt JSON. Your words become reality.`

export async function artist(
  ctx: AgentContext,
  intakeData: IntakeAnalysis,
  analysis: ImageAnalysis,
  strategy: EnhancementStrategy,
  geminiApiKey: string
): Promise<GenerationPrompt> {
  const contentType = strategy.contentTypeStrategy.type
  const style = ctx.creatorStyle || intakeData.detectedStyle
  const platform = ctx.platformTarget || intakeData.suggestedPlatform

  const contentPrompts = CONTENT_TYPE_PROMPT_TEMPLATES[contentType] || CONTENT_TYPE_PROMPT_TEMPLATES.unknown
  const stylePrompts = STYLE_PROMPT_MODIFIERS[style] || STYLE_PROMPT_MODIFIERS.custom

  const userPrompt = `CRAFT GENERATION PROMPT

STRATEGIST PLAN:
- Priority: ${strategy.priority}
- Target Aesthetic: ${strategy.targetAesthetic}
- Adjustments: ${strategy.adjustments.map(a => `${a.action} (${a.intensity})`).join(", ")}
- Preserve: ${strategy.preserveElements.join(", ")}
- Avoid: ${strategy.avoidChanges.join(", ")}
- Expected Improvement: +${strategy.expectedImprovement}

CONTENT TYPE: ${contentType.toUpperCase()}
- Positive keywords available: ${contentPrompts.positive.join(", ")}
- Negative keywords available: ${contentPrompts.negative.join(", ")}

STYLE: ${style.toUpperCase()}
- Positive modifiers: ${stylePrompts.positive.join(", ")}
- Negative modifiers: ${stylePrompts.negative.join(", ")}

PLATFORM: ${platform.toUpperCase()}
- Strategy: ${strategy.platformStrategy.aspectRatioAdvice}
- Thumbnail needs: ${strategy.platformStrategy.thumbnailOptimizations.join(", ")}

VISION ANALYSIS:
- Current mood: ${analysis.subject.mood}
- Emotional tone: ${analysis.subject.emotionalTone}
- Dominant colors: ${analysis.colors.dominantColors.join(", ")}
- Technical issues to fix: ${analysis.technicalIssues.join(", ") || "None"}

CREATOR INTENT:
${ctx.creatorIntent?.goal ? `- Goal: ${ctx.creatorIntent.goal}` : "- Goal: Maximize engagement"}
${ctx.creatorIntent?.brandCollab ? `- Brand match: ${ctx.creatorIntent.brandCollab}` : ""}

ENHANCEMENT LEVEL: ${ctx.userPreferences?.enhancementLevel || "moderate"}
PRESERVE FACES: ${ctx.userPreferences?.preserveFaces ?? true}
MAINTAIN AUTHENTICITY: ${ctx.userPreferences?.maintainAuthenticity ?? true}

MISSION: Craft the perfect prompt that will:
1. Apply the STRATEGIST's plan precisely
2. Match the content type requirements
3. Honor the creator's style
4. Optimize for the target platform
5. Fix technical issues identified by VISION
6. Set parameters appropriate for the enhancement level

Choose model wisely:
- Has faces/people? → flux
- Artistic/mood-heavy? → sdxl
- Speed priority? → stable-diffusion`

  console.log(`[ARTIST] Crafting prompt for ${contentType} in ${style} style...`)

  const response = await callGemini(
    geminiApiKey,
    ARTIST_SYSTEM_PROMPT,
    userPrompt
  )

  const prompt = extractJson<GenerationPrompt>(response)

  console.log(`[ARTIST] Prompt ready. Model: ${prompt.model}, Strength: ${prompt.technicalParameters.strength}, Style modifiers: ${prompt.styleModifiers.length}`)

  return prompt
}
