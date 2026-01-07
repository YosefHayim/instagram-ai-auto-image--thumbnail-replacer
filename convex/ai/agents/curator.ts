import type { ImageAnalysis, QualityValidation, AgentContext, IntakeAnalysis, EnhancementStrategy } from "../types"
import { callGeminiWithImages, extractJson } from "../gemini"

const CURATOR_SYSTEM_PROMPT = `You are CURATOR, the final quality guardian for Instagram content optimization.
You have the ultimate say on whether an enhancement ships or gets rejected.

YOUR RESPONSIBILITIES:
1. Quality assurance across multiple dimensions
2. Brand/style consistency verification
3. Platform readiness certification
4. Content-type alignment check
5. Grid preview simulation
6. Engagement improvement validation

EVALUATION CRITERIA (score each 1-100):

1. FIDELITY (Weight: 25%)
Does the enhanced image preserve the original subject and key elements?
- 90-100: Perfect preservation, subject instantly recognizable
- 70-89: Minor acceptable changes, essence maintained
- 50-69: Noticeable alterations but acceptable
- Below 50: Subject compromised, identity lost

2. ENHANCEMENT (Weight: 25%)
Has the image actually improved?
- 90-100: Dramatic improvement, professional quality achieved
- 70-89: Clear improvement, noticeably better
- 50-69: Subtle improvement, marginal gains
- Below 50: No improvement or degradation

3. ARTIFACTS (Weight: 15%)
Are there AI artifacts, distortions, or unnatural elements?
- 90-100: Zero artifacts, indistinguishable from professional photography
- 70-89: Minor artifacts, not visible at normal viewing
- 50-69: Visible artifacts, acceptable for casual use
- Below 50: Obvious AI artifacts, unacceptable

4. NATURALNESS (Weight: 15%)
Does the enhancement look natural and believable?
- 90-100: Completely natural, could be in-camera
- 70-89: Natural with subtle enhancement visible
- 50-69: Enhanced but believable
- Below 50: Obviously over-processed

5. BRAND CONSISTENCY (Weight: 10%)
Does this match the creator's established style?
- 90-100: Perfect style match, seamless with their feed
- 70-89: Good match, minor style drift
- 50-69: Acceptable, but noticeable difference
- Below 50: Doesn't match their brand at all

6. THUMBNAIL IMPACT (Weight: 10%)
Will this perform well at thumbnail size in the grid?
- 90-100: Scroll-stopping, clear and impactful at any size
- 70-89: Good thumbnail presence, works well in grid
- 50-69: Acceptable, but could be stronger
- Below 50: Gets lost in the feed

CONTENT TYPE ALIGNMENT:
Verify the enhancement respects the content type requirements.
- Product shots: Did we keep it commercial and accurate?
- Portraits: Are faces natural and flattering?
- Food: Does it look appetizing?
- Travel: Does it inspire wanderlust?

PLATFORM READINESS:
- Feed ready: Works in 3-column grid?
- Story ready: Works full-screen vertical?
- Reels ready: Thumbnail is compelling?
- Grid preview: How does it look alongside other posts?

DECISION THRESHOLDS:
- ACCEPT: overall >= 75 AND artifacts >= 80 AND contentTypeAlignment.matchesType = true
- REGENERATE: artifacts < 70 OR fidelity < 60 OR contentTypeAlignment.matchesType = false
- ADJUST_PARAMETERS: enhancement < 50 OR naturalness < 60 OR brandConsistency < 60

OUTPUT: Return QualityValidation JSON. Your verdict determines if this ships.`

export async function curator(
  ctx: AgentContext,
  originalUrl: string,
  enhancedUrl: string,
  intakeData: IntakeAnalysis,
  analysis: ImageAnalysis,
  strategy: EnhancementStrategy,
  geminiApiKey: string
): Promise<QualityValidation> {
  const userPrompt = `FINAL QUALITY ASSESSMENT

ORIGINAL CONTEXT:
- Content Type: ${intakeData.detectedContentType}
- Detected Style: ${intakeData.detectedStyle}
- Original Quality: Resolution=${intakeData.qualityAssessment.resolution}, Noise=${intakeData.qualityAssessment.noise}

VISION'S ORIGINAL ANALYSIS:
- Aesthetic Score: ${analysis.aestheticScore}/100
- Viral Potential: ${analysis.viralPotential}/100
- Thumbnail Readability: ${analysis.composition.thumbnailReadability}/100
- Emotional Tone: ${analysis.subject.emotionalTone}
- Technical Issues Identified: ${analysis.technicalIssues.join(", ") || "None"}

STRATEGIST'S PLAN:
- Priority: ${strategy.priority}
- Target Aesthetic: ${strategy.targetAesthetic}
- Expected Improvement: +${strategy.expectedImprovement}
- Engagement Boost Target: +${strategy.engagementBoostPrediction}%
- Elements to Preserve: ${strategy.preserveElements.join(", ")}
- Changes to Avoid: ${strategy.avoidChanges.join(", ")}

CREATOR PREFERENCES:
- Target Platform: ${ctx.platformTarget || "feed"}
- Desired Style: ${ctx.creatorStyle || intakeData.detectedStyle}
- Enhancement Level: ${ctx.userPreferences?.enhancementLevel || "moderate"}
- Preserve Faces: ${ctx.userPreferences?.preserveFaces ?? true}
- Maintain Authenticity: ${ctx.userPreferences?.maintainAuthenticity ?? true}

CONTENT TYPE REQUIREMENTS FOR "${intakeData.detectedContentType.toUpperCase()}":
- Did we respect the content type's unique needs?
- Would this perform well for this type of content?

MISSION:
Compare the two images. First is ORIGINAL, second is ENHANCED.

Evaluate:
1. Did we achieve the expected improvement?
2. Did we preserve what needed preserving?
3. Did we avoid what needed avoiding?
4. Does it match the creator's style?
5. Will this perform well on Instagram?
6. Is it ready for the target platform?
7. Does it respect the content type requirements?

Render your final verdict.`

  console.log("[CURATOR] Initiating final quality assessment...")

  const response = await callGeminiWithImages(
    geminiApiKey,
    CURATOR_SYSTEM_PROMPT,
    userPrompt,
    [originalUrl, enhancedUrl]
  )

  const validation = extractJson<QualityValidation>(response)

  console.log(`[CURATOR] Verdict: ${validation.recommendation.toUpperCase()}`)
  console.log(`[CURATOR] Scores - Overall: ${validation.scores.overall}/100, Fidelity: ${validation.scores.fidelity}/100, Enhancement: ${validation.scores.enhancement}/100, Brand: ${validation.scores.brandConsistency}/100, Thumbnail: ${validation.scores.thumbnailImpact}/100`)
  console.log(`[CURATOR] Content Type Match: ${validation.contentTypeAlignment.matchesType ? "YES" : "NO"} (${validation.contentTypeAlignment.typeSpecificScore}/100)`)
  console.log(`[CURATOR] Platform Ready - Feed: ${validation.platformReadiness.feedReady}, Story: ${validation.platformReadiness.storyReady}, Reels: ${validation.platformReadiness.reelsReady}`)

  if (validation.issues.length > 0) {
    console.log(`[CURATOR] Issues: ${validation.issues.join(", ")}`)
  }

  return validation
}
