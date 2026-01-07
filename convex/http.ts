import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { api } from "./_generated/api"

const http = httpRouter()

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
