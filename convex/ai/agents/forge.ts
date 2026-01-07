/**
 * FORGE - Layer 4: The Image Foundry
 * 
 * Takes ARTIST's carefully crafted prompts and brings them to life through
 * state-of-the-art image generation models. FORGE is where vision becomes reality.
 */

import type { GenerationPrompt, AgentContext } from "../types"

interface ReplicateResponse {
  id: string
  status: string
  output?: string | string[]
  error?: string
}

const MODEL_ENDPOINTS: Record<string, { model?: string; version?: string }> = {
  flux: { 
    model: "black-forest-labs/flux-1.1-pro" 
  },
  sdxl: { 
    version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b" 
  },
  "stable-diffusion": { 
    version: "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4" 
  },
}

const POLLING_INTERVAL_MS = 2000
const MAX_POLLING_ATTEMPTS = 60

export async function forge(
  ctx: AgentContext,
  prompt: GenerationPrompt,
  replicateApiKey: string
): Promise<string> {
  console.log(`[FORGE] Initiating image generation with ${prompt.model}...`)
  
  const modelConfig = MODEL_ENDPOINTS[prompt.model] || MODEL_ENDPOINTS.flux
  const isFlux = prompt.model === "flux"

  const input = isFlux
    ? buildFluxInput(ctx, prompt)
    : buildSDXLInput(ctx, prompt)

  const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${replicateApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelConfig.model,
      version: modelConfig.version,
      input,
    }),
  })

  if (!createResponse.ok) {
    const error = await createResponse.text()
    throw new Error(`[FORGE] Replicate API error: ${error}`)
  }

  const prediction: ReplicateResponse = await createResponse.json()
  console.log(`[FORGE] Generation started. Prediction ID: ${prediction.id}`)

  const result = await pollForCompletion(prediction.id, replicateApiKey)
  
  if (result.status === "failed") {
    throw new Error(`[FORGE] Generation failed: ${result.error || "Unknown error"}`)
  }

  if (!result.output) {
    throw new Error("[FORGE] No output generated")
  }

  const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
  
  console.log("[FORGE] Image forged successfully")
  
  return outputUrl
}

function buildFluxInput(ctx: AgentContext, prompt: GenerationPrompt) {
  return {
    prompt: prompt.mainPrompt,
    image: ctx.imageUrl,
    prompt_upsampling: true,
    output_format: "webp",
    output_quality: 90,
    safety_tolerance: 2,
  }
}

function buildSDXLInput(ctx: AgentContext, prompt: GenerationPrompt) {
  return {
    prompt: prompt.mainPrompt,
    negative_prompt: prompt.negativePrompt,
    image: ctx.imageUrl,
    prompt_strength: prompt.technicalParameters.strength,
    guidance_scale: prompt.technicalParameters.guidanceScale,
    num_inference_steps: prompt.technicalParameters.steps,
    scheduler: "K_EULER_ANCESTRAL",
    refine: "expert_ensemble_refiner",
    high_noise_frac: 0.8,
  }
}

async function pollForCompletion(
  predictionId: string, 
  apiKey: string
): Promise<ReplicateResponse> {
  let attempts = 0

  while (attempts < MAX_POLLING_ATTEMPTS) {
    const pollResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      { headers: { Authorization: `Token ${apiKey}` } }
    )

    if (!pollResponse.ok) {
      throw new Error("[FORGE] Failed to poll prediction status")
    }

    const result: ReplicateResponse = await pollResponse.json()

    if (result.status === "succeeded" || result.status === "failed") {
      return result
    }

    console.log(`[FORGE] Generation in progress... (${attempts + 1}/${MAX_POLLING_ATTEMPTS})`)
    await new Promise(r => setTimeout(r, POLLING_INTERVAL_MS))
    attempts++
  }

  throw new Error("[FORGE] Generation timed out")
}
