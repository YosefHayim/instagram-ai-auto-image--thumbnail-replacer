import { auth } from "./auth";
import { analytics } from "./analytics";

const LEMON_SQUEEZY_API_URL = "https://api.lemonsqueezy.com/v1";
const CREDITS_PER_DOLLAR = 10;
const CREDIT_PACKAGE_PRICE_CENTS = 100;

interface CheckoutOptions {
  credits: number;
  successUrl?: string;
  cancelUrl?: string;
}

interface CheckoutResponse {
  checkoutUrl: string;
  orderId: string;
}

interface CustomerPortalResponse {
  portalUrl: string;
}

export const lemonSqueezy = {
  async createCheckout(options: CheckoutOptions): Promise<CheckoutResponse> {
    const user = await auth.getCurrentUser();

    if (!user) {
      throw new Error("User must be authenticated to create checkout");
    }

    const variantId = import.meta.env.VITE_LEMON_SQUEEZY_VARIANT_ID;
    const storeId = import.meta.env.VITE_LEMON_SQUEEZY_STORE_ID;

    if (!variantId || !storeId) {
      throw new Error("Lemon Squeezy configuration missing");
    }

    const quantity = Math.ceil(options.credits / CREDITS_PER_DOLLAR);
    const extensionId = chrome.runtime.id;

    const checkoutData = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: user.email,
            name: user.name,
            custom: {
              user_id: user.id,
              credits: options.credits,
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
              options.successUrl ||
              `chrome-extension://${extensionId}/popup.html?payment=success`,
            receipt_link_url: `chrome-extension://${extensionId}/popup.html?receipt=true`,
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

    const response = await fetch(`${LEMON_SQUEEZY_API_URL}/checkouts`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${import.meta.env.VITE_LEMON_SQUEEZY_API_KEY}`,
      },
      body: JSON.stringify(checkoutData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.detail || "Failed to create checkout");
    }

    const result = await response.json();

    analytics.track("checkout_created", {
      credits: options.credits,
      amount_cents: quantity * CREDIT_PACKAGE_PRICE_CENTS,
    });

    return {
      checkoutUrl: result.data.attributes.url,
      orderId: result.data.id,
    };
  },

  async getCustomerPortal(): Promise<CustomerPortalResponse> {
    const user = await auth.getCurrentUser();

    if (!user) {
      throw new Error("User must be authenticated");
    }

    const response = await fetch(
      `${import.meta.env.VITE_CONVEX_URL}/lemonSqueezy/getPortalUrl`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to get customer portal URL");
    }

    const result = await response.json();
    return { portalUrl: result.portalUrl };
  },

  openCheckout(checkoutUrl: string): void {
    chrome.tabs.create({ url: checkoutUrl });
  },

  calculateCreditsFromAmount(amountCents: number): number {
    return Math.floor(
      (amountCents / CREDIT_PACKAGE_PRICE_CENTS) * CREDITS_PER_DOLLAR,
    );
  },

  calculatePriceForCredits(credits: number): {
    dollars: number;
    cents: number;
  } {
    const packages = Math.ceil(credits / CREDITS_PER_DOLLAR);
    const cents = packages * CREDIT_PACKAGE_PRICE_CENTS;
    return {
      dollars: cents / 100,
      cents,
    };
  },
};

export const PRICING = {
  CREDITS_PER_DOLLAR,
  CREDIT_PACKAGE_PRICE_CENTS,
  FREE_TRIAL_CREDITS: 10,
  FREE_TRIAL_DAYS: 14,
} as const;
