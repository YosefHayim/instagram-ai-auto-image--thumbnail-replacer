import { callGemini } from "../gemini"

export interface AgentAnalysis {
  agentName: string
  confidence: number
  observations: string[]
  enhancementDirective: string
  priorityAdjustments: string[]
}

const COMPOSITION_SYSTEM_PROMPT = `You are a composition specialist for image enhancement.
Analyze images for:
- Rule of thirds alignment and balance
- Focal point clarity and placement
- Visual weight distribution
- Leading lines and visual flow
- Framing and cropping opportunities
- Negative space usage
- Subject positioning

Provide specific, actionable enhancement suggestions that preserve the original composition while improving visual impact.

Respond in this exact JSON format:
{
  "observations": ["observation1", "observation2", "observation3"],
  "directive": "single enhancement instruction",
  "priorities": ["priority1", "priority2"],
  "confidence": 0.85
}`

const LIGHTING_SYSTEM_PROMPT = `You are a lighting specialist for image enhancement.
Analyze images for:
- Overall exposure levels
- Shadow detail and depth
- Highlight preservation and recovery
- Light direction and quality
- Time of day lighting characteristics
- Contrast ratios
- Dynamic range utilization

Provide specific lighting enhancement suggestions that improve luminosity while maintaining natural appearance.

Respond in this exact JSON format:
{
  "observations": ["observation1", "observation2", "observation3"],
  "directive": "single enhancement instruction",
  "priorities": ["priority1", "priority2"],
  "confidence": 0.85
}`

const COLOR_SYSTEM_PROMPT = `You are a color specialist for image enhancement.
Analyze images for:
- Color palette and harmony
- Saturation levels
- Color temperature
- Color cast issues
- Skin tone accuracy
- Color contrast and pop
- Dominant vs accent colors

Provide specific color enhancement suggestions that improve visual impact while maintaining natural appearance.

Respond in this exact JSON format:
{
  "observations": ["observation1", "observation2", "observation3"],
  "directive": "single enhancement instruction",
  "priorities": ["priority1", "priority2"],
  "confidence": 0.85
}`

const MOOD_SYSTEM_PROMPT = `You are a mood and atmosphere specialist for image enhancement.
Analyze images for:
- Emotional tone
- Atmospheric qualities
- Storytelling elements
- Visual energy
- Genre/style alignment
- Viewer emotional response
- Overall vibe and feeling

Provide specific mood enhancement suggestions that amplify emotional impact while respecting original intent.

Respond in this exact JSON format:
{
  "observations": ["observation1", "observation2", "observation3"],
  "directive": "single enhancement instruction",
  "priorities": ["priority1", "priority2"],
  "confidence": 0.85
}`

const DETAIL_SYSTEM_PROMPT = `You are a detail and clarity specialist for image enhancement.
Analyze images for:
- Overall sharpness and focus
- Texture definition and micro-contrast
- Noise levels and grain
- Edge definition and clarity
- Fine detail preservation
- Background blur quality
- Artifact detection

Provide specific detail enhancement suggestions that improve clarity while maintaining natural texture.

Respond in this exact JSON format:
{
  "observations": ["observation1", "observation2", "observation3"],
  "directive": "single enhancement instruction",
  "priorities": ["priority1", "priority2"],
  "confidence": 0.85
}`

async function runSpecialistAgent(
  agentName: string,
  systemPrompt: string,
  imageUrl: string,
  userPrompt: string,
  geminiApiKey: string
): Promise<AgentAnalysis> {
  try {
    const response = await callGemini(
      geminiApiKey,
      systemPrompt,
      `Analyze this image and provide enhancement suggestions. User wants: ${userPrompt}`,
      imageUrl
    )

    const parsed = JSON.parse(response)

    return {
      agentName,
      confidence: Math.min(Math.max(parsed.confidence || 0.7, 0), 1),
      observations: parsed.observations || [],
      enhancementDirective: parsed.directive || "",
      priorityAdjustments: parsed.priorities || [],
    }
  } catch (error) {
    console.error(`[${agentName}] Error:`, error)
    return getDefaultAnalysis(agentName, userPrompt)
  }
}

function getDefaultAnalysis(agentName: string, userPrompt: string): AgentAnalysis {
  const defaults: Record<string, Partial<AgentAnalysis>> = {
    CompositionAgent: {
      observations: ["subject positioned in frame", "background elements present"],
      enhancementDirective: "enhance focal point clarity and visual balance",
      priorityAdjustments: ["focal point emphasis", "balanced framing"],
    },
    LightingAgent: {
      observations: ["natural lighting detected", "shadow areas present"],
      enhancementDirective: "balance exposure with natural shadow depth",
      priorityAdjustments: ["balanced exposure", "shadow detail"],
    },
    ColorAgent: {
      observations: ["natural color palette", "moderate saturation"],
      enhancementDirective: "enhance color harmony and saturation",
      priorityAdjustments: ["color harmony", "saturation balance"],
    },
    MoodAgent: {
      observations: ["natural atmosphere present", "authentic mood captured"],
      enhancementDirective: "amplify natural mood with enhanced atmospheric depth",
      priorityAdjustments: ["emotional impact", "atmospheric depth"],
    },
    DetailAgent: {
      observations: ["acceptable sharpness level", "texture detail visible"],
      enhancementDirective: "enhance sharpness and clarity while preserving natural texture",
      priorityAdjustments: ["subject sharpness", "texture definition"],
    },
  }

  const agentDefault = defaults[agentName] || {}

  return {
    agentName,
    confidence: 0.7,
    observations: agentDefault.observations || [],
    enhancementDirective: agentDefault.enhancementDirective || `enhance based on: ${userPrompt}`,
    priorityAdjustments: agentDefault.priorityAdjustments || [],
  }
}

export async function runCompositionAgent(
  imageUrl: string,
  userPrompt: string,
  geminiApiKey: string
): Promise<AgentAnalysis> {
  return runSpecialistAgent(
    "CompositionAgent",
    COMPOSITION_SYSTEM_PROMPT,
    imageUrl,
    userPrompt,
    geminiApiKey
  )
}

export async function runLightingAgent(
  imageUrl: string,
  userPrompt: string,
  geminiApiKey: string
): Promise<AgentAnalysis> {
  return runSpecialistAgent(
    "LightingAgent",
    LIGHTING_SYSTEM_PROMPT,
    imageUrl,
    userPrompt,
    geminiApiKey
  )
}

export async function runColorAgent(
  imageUrl: string,
  userPrompt: string,
  geminiApiKey: string
): Promise<AgentAnalysis> {
  return runSpecialistAgent(
    "ColorAgent",
    COLOR_SYSTEM_PROMPT,
    imageUrl,
    userPrompt,
    geminiApiKey
  )
}

export async function runMoodAgent(
  imageUrl: string,
  userPrompt: string,
  geminiApiKey: string
): Promise<AgentAnalysis> {
  return runSpecialistAgent(
    "MoodAgent",
    MOOD_SYSTEM_PROMPT,
    imageUrl,
    userPrompt,
    geminiApiKey
  )
}

export async function runDetailAgent(
  imageUrl: string,
  userPrompt: string,
  geminiApiKey: string
): Promise<AgentAnalysis> {
  return runSpecialistAgent(
    "DetailAgent",
    DETAIL_SYSTEM_PROMPT,
    imageUrl,
    userPrompt,
    geminiApiKey
  )
}

export function combineAgentAnalyses(
  userPrompt: string,
  composition: AgentAnalysis,
  lighting: AgentAnalysis,
  color: AgentAnalysis,
  mood: AgentAnalysis,
  detail: AgentAnalysis
): string {
  // Sort by confidence
  const agents = [
    { name: "composition", analysis: composition },
    { name: "lighting", analysis: lighting },
    { name: "color", analysis: color },
    { name: "mood", analysis: mood },
    { name: "detail", analysis: detail },
  ].sort((a, b) => b.analysis.confidence - a.analysis.confidence)

  // Build directives
  const priorityDirectives = agents
    .filter((a) => a.analysis.confidence >= 0.8)
    .map((a) => a.analysis.enhancementDirective)

  const secondaryDirectives = agents
    .filter((a) => a.analysis.confidence < 0.8)
    .map((a) => a.analysis.enhancementDirective)

  // Collect priorities
  const allPriorities = agents
    .flatMap((a) => a.analysis.priorityAdjustments.slice(0, 2))
    .slice(0, 8)

  // Build super prompt
  const parts = [`Enhance this image: ${userPrompt}`]

  if (priorityDirectives.length > 0) {
    parts.push(`Primary enhancements: ${priorityDirectives.join(". ")}`)
  }

  if (secondaryDirectives.length > 0) {
    parts.push(`Additional refinements: ${secondaryDirectives.join(". ")}`)
  }

  if (allPriorities.length > 0) {
    parts.push(`Technical focus: ${allPriorities.join(", ")}`)
  }

  parts.push(
    "Output: Instagram-optimized, high quality, preserve subject integrity, maintain authenticity"
  )

  return parts.join(". ")
}
