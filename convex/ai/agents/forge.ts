/**
 * FORGE - Image Generation via Replicate API
 *
 * Takes prompts and generates enhanced images using Flux or SDXL models.
 */

export interface ForgeInput {
  imageUrl: string
}

export interface ForgePrompt {
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
  input: ForgeInput,
  prompt: ForgePrompt,
  replicateApiKey: string
): Promise<string> {
  console.log(`[FORGE] Initiating image generation with ${prompt.model}...`)
  console.log(`[FORGE] Main prompt: ${prompt.mainPrompt.slice(0, 100)}...`)

  const modelConfig = MODEL_ENDPOINTS[prompt.model] || MODEL_ENDPOINTS.flux
  const isFlux = prompt.model === "flux"

  const modelInput = isFlux
    ? buildFluxInput(input, prompt)
    : buildSDXLInput(input, prompt)

  console.log("[FORGE] Calling Replicate API...")

  const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${replicateApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelConfig.model,
      version: modelConfig.version,
      input: modelInput,
    }),
  })

  if (!createResponse.ok) {
    const error = await createResponse.text()
    console.error("[FORGE] Replicate API error:", error)
    throw new Error(`[FORGE] Replicate API error: ${error}`)
  }

  const prediction: ReplicateResponse = await createResponse.json()
  console.log(`[FORGE] Generation started. Prediction ID: ${prediction.id}`)

  const result = await pollForCompletion(prediction.id, replicateApiKey)

  if (result.status === "failed") {
    console.error("[FORGE] Generation failed:", result.error)
    throw new Error(`[FORGE] Generation failed: ${result.error || "Unknown error"}`)
  }

  if (!result.output) {
    throw new Error("[FORGE] No output generated")
  }

  const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output

  console.log("[FORGE] Image forged successfully:", outputUrl.slice(0, 60) + "...")

  return outputUrl
}

function buildFluxInput(input: ForgeInput, prompt: ForgePrompt) {
  return {
    prompt: prompt.mainPrompt,
    image: input.imageUrl,
    prompt_upsampling: true,
    output_format: "webp",
    output_quality: 90,
    safety_tolerance: 2,
  }
}

function buildSDXLInput(input: ForgeInput, prompt: ForgePrompt) {
  return {
    prompt: prompt.mainPrompt,
    negative_prompt: prompt.negativePrompt,
    image: input.imageUrl,
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
