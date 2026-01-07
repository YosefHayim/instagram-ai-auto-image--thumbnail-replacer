const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

interface GeminiMessage {
  role: "user" | "model"
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>
    }
  }>
}

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageUrl?: string
): Promise<string> {
  const model = "gemini-2.5-pro-preview-06-05"
  
  const parts: GeminiMessage["parts"] = []

  if (imageUrl) {
    const imageData = await fetchImageAsBase64(imageUrl)
    parts.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64,
      },
    })
  }

  parts.push({ text: userPrompt })

  const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data: GeminiResponse = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!content) {
    throw new Error("No response from Gemini")
  }

  return content
}

export async function callGeminiWithImages(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageUrls: string[]
): Promise<string> {
  const model = "gemini-2.5-pro-preview-06-05"
  
  const parts: GeminiMessage["parts"] = []

  for (const imageUrl of imageUrls) {
    const imageData = await fetchImageAsBase64(imageUrl)
    parts.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64,
      },
    })
  }

  parts.push({ text: userPrompt })

  const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data: GeminiResponse = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!content) {
    throw new Error("No response from Gemini")
  }

  return content
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url}`)
  }

  const contentType = response.headers.get("content-type") || "image/jpeg"
  const arrayBuffer = await response.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  let binary = ""
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  const base64 = btoa(binary)

  return { base64, mimeType: contentType }
}

export function extractJson<T>(content: string): T {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                    content.match(/```\s*([\s\S]*?)\s*```/) ||
                    content.match(/\{[\s\S]*\}/)
  
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from response")
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0]
  return JSON.parse(jsonStr.trim()) as T
}
