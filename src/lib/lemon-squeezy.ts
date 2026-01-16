import { auth } from "./auth";
import { analytics } from "./analytics";

const CREDITS_PER_DOLLAR = 10;
const CREDIT_PACKAGE_PRICE_CENTS = 100;

interface CheckoutOptions {
  credits: number;
  successUrl?: string;
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

    const response = await chrome.runtime.sendMessage({
      type: "CREATE_LEMON_SQUEEZY_CHECKOUT",
      payload: {
        userId: user.id,
        email: user.email,
        name: user.name,
        credits: options.credits,
        successUrl: options.successUrl,
      },
    });

    if (response.error) {
      throw new Error(response.error);
    }

    try {
      analytics.track("checkout_created", {
        credits: options.credits,
        amount_cents:
          Math.ceil(options.credits / CREDITS_PER_DOLLAR) *
          CREDIT_PACKAGE_PRICE_CENTS,
      });
    } catch {}

    return {
      checkoutUrl: response.checkoutUrl,
      orderId: response.orderId,
    };
  },

  async getCustomerPortal(): Promise<CustomerPortalResponse> {
    const user = await auth.getCurrentUser();

    if (!user) {
      throw new Error("User must be authenticated");
    }

    const response = await chrome.runtime.sendMessage({
      type: "GET_LEMON_SQUEEZY_PORTAL",
      payload: { userId: user.id },
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return { portalUrl: response.portalUrl };
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
