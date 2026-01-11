import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { api } from "./_generated/api"

const http = httpRouter()

// CORS headers for browser extension
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

// Handle CORS preflight
http.route({
  path: "/api/agents/enhance",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

// Chat-based enhancement endpoint
http.route({
  path: "/api/agents/enhance",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json()
      const { image_url, user_prompt } = body

      if (!image_url || !user_prompt) {
        return new Response(
          JSON.stringify({ error: "Missing image_url or user_prompt" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const result = await ctx.runAction(api.chatEnhance.enhanceWithChat, {
        imageUrl: image_url,
        userPrompt: user_prompt,
      })

      return new Response(
        JSON.stringify({
          success: result.success,
          original_url: result.originalUrl,
          enhanced_url: result.enhancedUrl,
          super_prompt: result.superPrompt,
          agent_analyses: result.agentAnalyses?.map((a) => ({
            agent_name: a.agentName,
            confidence: a.confidence,
            observations: a.observations,
            directive: a.enhancementDirective,
          })),
          processing_time_ms: result.processingTimeMs,
          error: result.error,
        }),
        {
          status: result.success ? 200 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    } catch (error) {
      console.error("Enhancement error:", error)
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
  }),
})

// Analyze only endpoint (no image generation)
http.route({
  path: "/api/agents/analyze-only",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

http.route({
  path: "/api/agents/analyze-only",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json()
      const { image_url, user_prompt } = body

      if (!image_url || !user_prompt) {
        return new Response(
          JSON.stringify({ error: "Missing image_url or user_prompt" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const result = await ctx.runAction(api.chatEnhance.analyzeOnly, {
        imageUrl: image_url,
        userPrompt: user_prompt,
      })

      return new Response(
        JSON.stringify({
          super_prompt: result.superPrompt,
          agent_summary: result.agentAnalyses.reduce((acc, a) => {
            acc[a.agentName.toLowerCase().replace("agent", "")] = {
              confidence: a.confidence,
              observations: a.observations,
              directive: a.enhancementDirective,
            }
            return acc
          }, {} as Record<string, unknown>),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    } catch (error) {
      console.error("Analysis error:", error)
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
  }),
})

// Health check
http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "healthy",
        version: "2.0.0",
        services: {
          agents: "operational",
          enhancement: "operational",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }),
})

// Stripe webhook
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature")
    if (!signature) {
      return new Response("No signature", { status: 400 })
    }

    const payload = await request.text()

    try {
      await ctx.runAction(api.stripe.handleWebhook, {
        payload,
        signature,
      })

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      console.error("Webhook error:", error)
      return new Response("Webhook error", { status: 400 })
    }
  }),
})

export default http
