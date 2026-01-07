import { v } from "convex/values"
import { action, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"

export const createCheckoutSession = action({
  args: {
    odch123: v.string(),
    priceId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured")
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "payment_method_types[]": "card",
        "line_items[0][price]": args.priceId,
        "line_items[0][quantity]": "1",
        mode: "payment",
        success_url: args.successUrl,
        cancel_url: args.cancelUrl,
        client_reference_id: args.odch123,
        "metadata[odch123]": args.odch123,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Stripe error: ${error}`)
    }

    const session = await response.json()
    return { sessionId: session.id, url: session.url }
  },
})

export const fulfillPayment = internalMutation({
  args: {
    odch123: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_odch123", (q) => q.eq("odch123", args.odch123))
      .unique()

    if (!profile) {
      console.error("Profile not found for user:", args.odch123)
      return { success: false }
    }

    await ctx.db.patch(profile._id, {
      isPremium: true,
      credits: -1,
      stripeCustomerId: args.stripeCustomerId,
    })

    return { success: true }
  },
})

export const handleWebhook = action({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripeSecretKey || !webhookSecret) {
      throw new Error("Stripe configuration missing")
    }

    const event = JSON.parse(args.payload)

    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      const odch123 = session.client_reference_id || session.metadata?.odch123

      if (odch123) {
        await ctx.runMutation(internal.stripe.fulfillPayment, {
          odch123,
          stripeCustomerId: session.customer || "",
        })
      }
    }

    return { received: true }
  },
})
