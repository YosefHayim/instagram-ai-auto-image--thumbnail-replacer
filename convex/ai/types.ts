export type ContentType = 
  | "product"
  | "portrait"
  | "selfie"
  | "food"
  | "travel"
  | "landscape"
  | "flatlay"
  | "lifestyle"
  | "behind_the_scenes"
  | "aesthetic"
  | "meme"
  | "quote"
  | "carousel"
  | "before_after"
  | "unknown"

export type PlatformTarget = "feed" | "story" | "reels" | "carousel"

export type CreatorStyle =
  | "clean_minimal"
  | "dark_moody"
  | "bright_airy"
  | "warm_golden"
  | "cool_blue"
  | "vintage_film"
  | "high_contrast"
  | "pastel_soft"
  | "bold_vibrant"
  | "earthy_natural"
  | "dark_academia"
  | "y2k_aesthetic"
  | "cottagecore"
  | "custom"

export interface CreatorIntent {
  goal?: string
  brandCollab?: string
  targetAudience?: string
  callToAction?: string
  hashtags?: string[]
  competitorReference?: string
}

export interface IntakeAnalysis {
  detectedContentType: ContentType
  contentTypeConfidence: number
  detectedStyle: CreatorStyle
  suggestedPlatform: PlatformTarget
  keySubjects: string[]
  brandElements: string[]
  textOverlays: string[]
  facesDetected: number
  productsDetected: string[]
  moodKeywords: string[]
  colorPalette: string[]
  qualityAssessment: {
    resolution: "low" | "medium" | "high"
    noise: "none" | "minimal" | "moderate" | "severe"
    blur: "sharp" | "slight" | "moderate" | "severe"
    compression: "none" | "minimal" | "moderate" | "severe"
  }
  enhancementPotential: "low" | "medium" | "high"
  creatorRecommendations: string[]
}

export interface ImageAnalysis {
  composition: {
    ruleOfThirds: boolean
    leadingLines: boolean
    symmetry: boolean
    framing: string
    subjectPlacement: string
    negativeSpace: number
    thumbnailReadability: number
    gridPreviewScore: number
  }
  lighting: {
    type: "natural" | "artificial" | "mixed" | "low_light"
    direction: "front" | "back" | "side" | "diffused"
    quality: "harsh" | "soft" | "dramatic"
    exposure: "underexposed" | "correct" | "overexposed"
    contrast: "low" | "medium" | "high"
  }
  colors: {
    dominantColors: string[]
    colorTemperature: "warm" | "neutral" | "cool"
    saturation: "desaturated" | "natural" | "vibrant" | "oversaturated"
    harmony: "complementary" | "analogous" | "triadic" | "monochromatic" | "none"
  }
  subject: {
    type: ContentType
    focus: "sharp" | "soft" | "blurry"
    mood: string
    emotionalTone: string
    storyPotential: string
  }
  technicalIssues: string[]
  aestheticScore: number
  viralPotential: number
  engagementPrediction: {
    likeability: number
    shareability: number
    saveability: number
    commentPotential: number
  }
}

export interface EnhancementStrategy {
  contentTypeStrategy: {
    type: ContentType
    optimizationFocus: string[]
    avoidPitfalls: string[]
  }
  platformStrategy: {
    target: PlatformTarget
    aspectRatioAdvice: string
    compressionConsiderations: string[]
    thumbnailOptimizations: string[]
  }
  styleStrategy: {
    targetStyle: CreatorStyle
    colorGradingDirection: string
    moodAmplification: string
    consistencyNotes: string
  }
  priority: "composition" | "lighting" | "color" | "sharpness" | "mood" | "subject_enhancement"
  adjustments: {
    category: string
    action: string
    intensity: "subtle" | "moderate" | "significant"
    reason: string
    contentTypeReason: string
  }[]
  targetAesthetic: string
  preserveElements: string[]
  avoidChanges: string[]
  expectedImprovement: number
  engagementBoostPrediction: number
}

export interface GenerationPrompt {
  mainPrompt: string
  negativePrompt: string
  styleModifiers: string[]
  contentTypeModifiers: string[]
  platformModifiers: string[]
  technicalParameters: {
    strength: number
    guidanceScale: number
    steps: number
    seed?: number
  }
  model: "sdxl" | "flux" | "stable-diffusion"
}

export interface QualityValidation {
  passed: boolean
  scores: {
    fidelity: number
    enhancement: number
    artifacts: number
    naturalness: number
    brandConsistency: number
    thumbnailImpact: number
    overall: number
  }
  contentTypeAlignment: {
    matchesType: boolean
    typeSpecificScore: number
    suggestions: string[]
  }
  platformReadiness: {
    feedReady: boolean
    storyReady: boolean
    reelsReady: boolean
    gridPreviewScore: number
  }
  issues: string[]
  recommendation: "accept" | "regenerate" | "adjust_parameters"
}

export interface AgentContext {
  imageUrl: string
  brandReferenceUrl?: string
  contentType?: ContentType
  platformTarget?: PlatformTarget
  creatorStyle?: CreatorStyle
  creatorIntent?: CreatorIntent
  stylePreset?: string
  userPreferences?: {
    preserveFaces: boolean
    enhancementLevel: "subtle" | "moderate" | "dramatic"
    colorPreference?: "warm" | "cool" | "vibrant" | "muted"
    maintainAuthenticity: boolean
    prioritizeEngagement: boolean
  }
}

export interface PipelineResult {
  success: boolean
  originalUrl: string
  enhancedUrl?: string
  intake?: IntakeAnalysis
  analysis?: ImageAnalysis
  strategy?: EnhancementStrategy
  prompt?: GenerationPrompt
  validation?: QualityValidation
  error?: string
  processingTimeMs: number
  creatorInsights?: {
    bestPostingTime: string
    suggestedCaption: string
    hashtagRecommendations: string[]
    engagementTips: string[]
  }
}
