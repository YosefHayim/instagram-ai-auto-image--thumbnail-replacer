import { v } from "convex/values";
import { action, httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const CREDITS_PER_DOLLAR = 10;

export const handleWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("X-Signature");
  const rawBody = await request.text();

  if (!signature) {
    return new Response("Missing signature", { status: 401 });
  }

  const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing LEMON_SQUEEZY_WEBHOOK_SECRET");
    return new Response("Server configuration error", { status: 500 });
  }

  const isValid = await verifyWebhookSignature(
    rawBody,
    signature,
    webhookSecret,
  );
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[LemonSqueezy] Invalid JSON payload");
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const eventName = payload.meta.event_name;
  const data = payload.data;

  console.log(`[LemonSqueezy] Webhook received: ${eventName}`);

  try {
    switch (eventName) {
      case "order_created":
        await handleOrderCreated(ctx, data, payload.meta.custom_data);
        break;

      case "subscription_created":
        await handleSubscriptionCreated(ctx, data, payload.meta.custom_data);
        break;

      case "subscription_updated":
        await handleSubscriptionUpdated(ctx, data);
        break;

      case "subscription_cancelled":
        await handleSubscriptionCancelled(ctx, data);
        break;

      case "subscription_payment_success":
        await handlePaymentSuccess(ctx, data, payload.meta.custom_data);
        break;

      default:
        console.log(`[LemonSqueezy] Unhandled event: ${eventName}`);
    }
  } catch (error) {
    console.error(`[LemonSqueezy] Error handling ${eventName}:`, error);
    return new Response("Processing error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});

async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === expectedSignature;
}

async function handleOrderCreated(ctx: any, data: any, customData: any) {
  const userId = customData?.user_id;
  const credits = customData?.credits || CREDITS_PER_DOLLAR;
  const orderId = data.id;
  const totalCents = data.attributes.total;

  if (!userId) {
    console.error("[LemonSqueezy] No user_id in custom_data");
    return;
  }

  const user = await ctx.runQuery(api.users.getUserByOdch123, {
    odch123: userId,
  });

  if (!user) {
    console.error(`[LemonSqueezy] User not found: ${userId}`);
    return;
  }

  const calculatedCredits = Math.floor((totalCents / 100) * CREDITS_PER_DOLLAR);
  const creditsToAdd = Math.max(calculatedCredits, credits);

  await ctx.runMutation(api.users.addCredits, {
    userId: user._id,
    amount: creditsToAdd,
    lemonSqueezyOrderId: orderId,
    description: `Purchased ${creditsToAdd} credits`,
  });

  console.log(`[LemonSqueezy] Added ${creditsToAdd} credits to user ${userId}`);
}

async function handleSubscriptionCreated(ctx: any, data: any, customData: any) {
  const userId = customData?.user_id;
  const subscriptionId = data.id;
  const customerId = data.attributes.customer_id;

  if (!userId) return;

  const user = await ctx.runQuery(api.users.getUserByOdch123, {
    odch123: userId,
  });

  if (!user) return;

  await ctx.runMutation(internal.users.updateSubscription, {
    userId: user._id,
    lemonSqueezyCustomerId: customerId.toString(),
    lemonSqueezySubscriptionId: subscriptionId.toString(),
    subscriptionStatus: "active",
  });
}

async function handleSubscriptionUpdated(ctx: any, data: any) {
  const subscriptionId = data.id;
  const status = data.attributes.status;

  const user = await ctx.runQuery(internal.users.getUserBySubscriptionId, {
    subscriptionId: subscriptionId.toString(),
  });

  if (!user) return;

  await ctx.runMutation(internal.users.updateSubscription, {
    userId: user._id,
    subscriptionStatus: mapLemonSqueezyStatus(status),
  });
}

async function handleSubscriptionCancelled(ctx: any, data: any) {
  const subscriptionId = data.id;

  const user = await ctx.runQuery(internal.users.getUserBySubscriptionId, {
    subscriptionId: subscriptionId.toString(),
  });

  if (!user) return;

  await ctx.runMutation(internal.users.updateSubscription, {
    userId: user._id,
    subscriptionStatus: "cancelled",
  });
}

async function handlePaymentSuccess(ctx: any, data: any, customData: any) {
  const userId = customData?.user_id;
  const totalCents = data.attributes.total;

  if (!userId) return;

  const user = await ctx.runQuery(api.users.getUserByOdch123, {
    odch123: userId,
  });

  if (!user) return;

  const credits = Math.floor((totalCents / 100) * CREDITS_PER_DOLLAR);

  await ctx.runMutation(api.users.addCredits, {
    userId: user._id,
    amount: credits,
    description: `Subscription payment - ${credits} credits`,
  });
}

function mapLemonSqueezyStatus(
  status: string,
): "active" | "cancelled" | "expired" | "paused" {
  switch (status) {
    case "active":
    case "on_trial":
      return "active";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    case "paused":
      return "paused";
    default:
      return "active";
  }
}

export const createCheckout = action({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    credits: v.number(),
    successUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
    const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID;

    if (!apiKey || !storeId || !variantId) {
      throw new Error("Lemon Squeezy configuration missing");
    }

    const checkoutData = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: args.email,
            name: args.name,
            custom: {
              user_id: args.userId,
              credits: args.credits,
            },
          },
          checkout_options: {
            embed: false,
            media: false,
            logo: true,
          },
          product_options: {
            enabled_variants: [parseInt(variantId)],
            redirect_url:
              args.successUrl || "https://www.instagram.com/?payment=success",
          },
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: storeId,
            },
          },
          variant: {
            data: {
              type: "variants",
              id: variantId,
            },
          },
        },
      },
    };

    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(checkoutData),
    });

    if (!response.ok) {
      let errorMessage = "Failed to create checkout";
      try {
        const errorData = await response.json();
        errorMessage = errorData.errors?.[0]?.detail || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return {
      checkoutUrl: result.data.attributes.url,
      orderId: result.data.id,
    };
  },
});

export const getPortalUrl = action({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<{ portalUrl: string }> => {
    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    if (!apiKey) {
      throw new Error("Missing LEMON_SQUEEZY_API_KEY");
    }

    const user = await ctx.runQuery(api.users.getUserByOdch123, {
      odch123: args.userId,
    });

    if (!user?.lemonSqueezyCustomerId) {
      throw new Error("User has no Lemon Squeezy customer ID");
    }

    const response: Response = await fetch(
      `https://api.lemonsqueezy.com/v1/customers/${user.lemonSqueezyCustomerId}`,
      {
        headers: {
          Accept: "application/vnd.api+json",
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to get customer data");
    }

    const data: {
      data: { attributes: { urls: { customer_portal: string } } };
    } = await response.json();
    return { portalUrl: data.data.attributes.urls.customer_portal };
  },
});
