import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const createCheckoutSession = action({
  args: {
    odch123: v.string(),
    priceId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const response = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
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
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe error: ${error}`);
    }

    const session = await response.json();
    return { sessionId: session.id, url: session.url };
  },
});

export const fulfillPayment = internalMutation({
  args: {
    odch123: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_odch123", (q) => q.eq("odch123", args.odch123))
      .unique();

    if (!user) {
      console.error("User not found for:", args.odch123);
      return { success: false };
    }

    const CREDITS_PER_PURCHASE = 10;
    await ctx.db.patch(user._id, {
      credits: user.credits + CREDITS_PER_PURCHASE,
      lastActiveAt: Date.now(),
    });

    await ctx.db.insert("creditTransactions", {
      userId: user._id,
      type: "purchase",
      amount: CREDITS_PER_PURCHASE,
      balanceAfter: user.credits + CREDITS_PER_PURCHASE,
      description: `Stripe purchase - ${CREDITS_PER_PURCHASE} credits`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const handleWebhook = action({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
      throw new Error("Stripe configuration missing");
    }

    const event = JSON.parse(args.payload);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const odch123 = session.client_reference_id || session.metadata?.odch123;

      if (odch123) {
        await ctx.runMutation(internal.stripe.fulfillPayment, {
          odch123,
          stripeCustomerId: session.customer || "",
        });
      }
    }

    return { received: true };
  },
});
