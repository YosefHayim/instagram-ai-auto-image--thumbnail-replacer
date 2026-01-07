import type { ImageAnalysis, AgentContext, IntakeAnalysis, ContentType } from "../types"
import { callGemini, extractJson } from "../gemini"

const VISION_SYSTEM_PROMPT = `You are VISION, an elite visual intelligence system optimized for Instagram content analysis.
You receive context from INTAKE and perform deep technical + emotional analysis.

TECHNICAL ANALYSIS:

1. COMPOSITION
- Rule of thirds: Is the subject placed on power points?
- Leading lines: Do lines guide the eye to the subject?
- Symmetry: Is there balance (intentional or not)?
- Framing: How is the subject framed within the image?
- Subject placement: Where is the focal point?
- Negative space: How much breathing room exists?
- THUMBNAIL READABILITY (1-100): Will this be clear at 110x110px grid size?
- GRID PREVIEW SCORE (1-100): How well does this work in a 3-column Instagram grid?

2. LIGHTING
- Type: natural / artificial / mixed / low_light
- Direction: front / back / side / diffused
- Quality: harsh / soft / dramatic
- Exposure: underexposed / correct / overexposed
- Contrast: low / medium / high

3. COLORS
- Dominant colors (hex codes preferred)
- Temperature: warm / neutral / cool
- Saturation: desaturated / natural / vibrant / oversaturated
- Harmony: complementary / analogous / triadic / monochromatic / none

4. SUBJECT ANALYSIS
- Type: Match to content type from INTAKE
- Focus: sharp / soft / blurry
- Mood: One-word emotional descriptor
- Emotional tone: What feeling does this evoke?
- Story potential: What narrative could this support?

5. ENGAGEMENT PREDICTION
- Likeability (1-100): Will people double-tap?
- Shareability (1-100): Will people send this to friends?
- Saveability (1-100): Will people bookmark for later?
- Comment potential (1-100): Will this spark conversation?

6. VIRAL POTENTIAL (1-100)
Based on current Instagram trends, algorithm preferences, and content saturation.

OUTPUT: Return ImageAnalysis JSON. Every score must be justified by visual evidence.`

export async function vision(
  ctx: AgentContext,
  intakeData: IntakeAnalysis,
  geminiApiKey: string
): Promise<ImageAnalysis> {
  const userPrompt = `DEEP VISUAL ANALYSIS

INTAKE FINDINGS:
- Content Type: ${intakeData.detectedContentType} (${intakeData.contentTypeConfidence}% confidence)
- Detected Style: ${intakeData.detectedStyle}
- Key Subjects: ${intakeData.keySubjects.join(", ")}
- Faces Detected: ${intakeData.facesDetected}
- Quality Assessment: Resolution=${intakeData.qualityAssessment.resolution}, Noise=${intakeData.qualityAssessment.noise}, Blur=${intakeData.qualityAssessment.blur}
- Enhancement Potential: ${intakeData.enhancementPotential}
- Color Palette: ${intakeData.colorPalette.join(", ")}

CREATOR CONTEXT:
- Target Platform: ${ctx.platformTarget || "feed"}
- Desired Style: ${ctx.creatorStyle || intakeData.detectedStyle}
- Enhancement Level: ${ctx.userPreferences?.enhancementLevel || "moderate"}
- Prioritize Engagement: ${ctx.userPreferences?.prioritizeEngagement ?? true}

MISSION: Perform comprehensive visual analysis. Score everything. Predict engagement. Identify what's working and what needs improvement.

Pay special attention to:
1. Thumbnail readability (critical for Instagram grid)
2. Emotional resonance (what feeling does this create?)
3. Scroll-stopping potential (will this pause the thumb?)
4. Content-type specific quality markers`

  console.log("[VISION] Executing deep visual analysis...")

  const response = await callGemini(
    geminiApiKey,
    VISION_SYSTEM_PROMPT,
    userPrompt,
    ctx.imageUrl
  )

  const analysis = extractJson<ImageAnalysis>(response)

  console.log(`[VISION] Analysis complete. Aesthetic: ${analysis.aestheticScore}/100, Viral Potential: ${analysis.viralPotential}/100, Thumbnail: ${analysis.composition.thumbnailReadability}/100`)

  return analysis
}
