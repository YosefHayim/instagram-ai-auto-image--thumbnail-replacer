import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

export default defineBackground(() => {
  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || "";
  const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || "";

  const convex = new ConvexHttpClient(CONVEX_URL);

  // Helper functions for storage
  const storage = {
    async get<T>(key: string): Promise<T | undefined> {
      const result = await browser.storage.local.get(key);
      return result[key] as T | undefined;
    },
    async set(key: string, value: unknown): Promise<void> {
      await browser.storage.local.set({ [key]: value });
    },
  };

  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
      await storage.set("credits", 1);
      await storage.set("isPremium", false);
      await storage.set("isAuthenticated", false);
      console.log("[Instagram AI Optimizer] Extension installed");
    }
  });

  browser.action.onClicked.addListener((tab) => {
    if (tab.url?.includes("instagram.com") && tab.id) {
      browser.tabs.sendMessage(tab.id, { type: "TOGGLE_PANEL" });
    }
  });

  type MessageType =
    | { type: "GET_AUTH_STATE" }
    | { type: "SET_AUTH_STATE"; payload: { isAuthenticated: boolean; odch123?: string; email?: string } }
    | { type: "GET_CREDITS" }
    | { type: "SET_CREDITS"; payload: number }
    | { type: "DECREMENT_CREDITS" }
    | { type: "SET_PREMIUM"; payload: boolean }
    | { type: "GET_USER_STATE" }
    | { type: "OPTIMIZE_IMAGE"; payload: { imageUrl: string; stylePreset?: string } }
    | { type: "CREATE_CHECKOUT" };

  browser.runtime.onMessage.addListener((message: MessageType, _sender, sendResponse) => {
    handleMessage(message, sendResponse);
    return true;
  });

  async function handleMessage(
    message: MessageType,
    sendResponse: (response: unknown) => void
  ) {
    try {
      switch (message.type) {
        case "GET_AUTH_STATE": {
          const isAuthenticated = await storage.get<boolean>("isAuthenticated");
          const odch123 = await storage.get<string>("odch123");
          sendResponse({ isAuthenticated: isAuthenticated ?? false, odch123 });
          break;
        }

        case "SET_AUTH_STATE": {
          await storage.set("isAuthenticated", message.payload.isAuthenticated);
          if (message.payload.odch123) {
            await storage.set("odch123", message.payload.odch123);
          }
          if (message.payload.isAuthenticated && message.payload.odch123 && message.payload.email) {
            try {
              await convex.mutation(api.profiles.create, {
                odch123: message.payload.odch123,
                email: message.payload.email,
              });
            } catch (e) {
              console.log("[Instagram AI Optimizer] Profile may already exist");
            }
          }
          sendResponse({ success: true });
          break;
        }

        case "GET_CREDITS": {
          const odch123 = await storage.get<string>("odch123");
          if (odch123 && CONVEX_URL) {
            try {
              const profile = await convex.query(api.profiles.getByUserId, { odch123 });
              if (profile) {
                await storage.set("credits", profile.credits);
                await storage.set("isPremium", profile.isPremium);
                sendResponse({ credits: profile.isPremium ? -1 : profile.credits });
                break;
              }
            } catch (e) {
              console.error("[Instagram AI Optimizer] Failed to fetch profile:", e);
            }
          }
          const credits = await storage.get<number>("credits");
          sendResponse({ credits: credits ?? 1 });
          break;
        }

        case "SET_CREDITS": {
          await storage.set("credits", message.payload);
          sendResponse({ success: true });
          break;
        }

        case "DECREMENT_CREDITS": {
          const odch123 = await storage.get<string>("odch123");
          if (odch123 && CONVEX_URL) {
            try {
              const result = await convex.mutation(api.profiles.decrementCredits, { odch123 });
              await storage.set("credits", result.credits);
              sendResponse(result);
              break;
            } catch (e) {
              console.error("[Instagram AI Optimizer] Failed to decrement credits:", e);
            }
          }
          const currentCredits = (await storage.get<number>("credits")) ?? 1;
          const isPremium = await storage.get<boolean>("isPremium");
          if (isPremium) {
            sendResponse({ credits: -1 });
          } else if (currentCredits > 0) {
            const newCredits = currentCredits - 1;
            await storage.set("credits", newCredits);
            sendResponse({ credits: newCredits });
          } else {
            sendResponse({ credits: 0, error: "No credits remaining" });
          }
          break;
        }

        case "SET_PREMIUM": {
          const odch123 = await storage.get<string>("odch123");
          if (odch123 && CONVEX_URL) {
            try {
              await convex.mutation(api.profiles.setPremium, {
                odch123,
                isPremium: message.payload,
              });
            } catch (e) {
              console.error("[Instagram AI Optimizer] Failed to set premium:", e);
            }
          }
          await storage.set("isPremium", message.payload);
          if (message.payload) {
            await storage.set("credits", -1);
          }
          sendResponse({ success: true });
          break;
        }

        case "GET_USER_STATE": {
          const odch123 = await storage.get<string>("odch123");
          if (odch123 && CONVEX_URL) {
            try {
              const profile = await convex.query(api.profiles.getByUserId, { odch123 });
              if (profile) {
                await storage.set("credits", profile.credits);
                await storage.set("isPremium", profile.isPremium);
                sendResponse({
                  isAuthenticated: true,
                  isPremium: profile.isPremium,
                  credits: profile.isPremium ? -1 : profile.credits,
                  odch123,
                });
                break;
              }
            } catch (e) {
              console.error("[Instagram AI Optimizer] Failed to fetch user state:", e);
            }
          }
          const [isAuthenticated, isPremium, credits] = await Promise.all([
            storage.get<boolean>("isAuthenticated"),
            storage.get<boolean>("isPremium"),
            storage.get<number>("credits"),
          ]);
          sendResponse({
            isAuthenticated: isAuthenticated ?? false,
            isPremium: isPremium ?? false,
            credits: isPremium ? -1 : (credits ?? 1),
            odch123,
          });
          break;
        }

        case "OPTIMIZE_IMAGE": {
          if (CONVEX_URL) {
            try {
              // Use chat enhancement with a default prompt based on style preset
              const prompt = message.payload.stylePreset
                ? `Make this image more ${message.payload.stylePreset}`
                : "Enhance this image professionally for Instagram";

              const result = await convex.action(api.chatEnhance.enhanceWithChat, {
                imageUrl: message.payload.imageUrl,
                userPrompt: prompt,
              });
              sendResponse({
                success: result.success,
                aiImageUrl: result.enhancedUrl || message.payload.imageUrl,
                error: result.error,
                processingTimeMs: result.processingTimeMs,
              });
              break;
            } catch (e) {
              console.error("[Instagram AI Optimizer] AI enhancement failed:", e);
              sendResponse({
                success: false,
                aiImageUrl: message.payload.imageUrl,
                error: String(e),
              });
              break;
            }
          }
          sendResponse({
            success: false,
            aiImageUrl: message.payload.imageUrl,
            error: "Convex not configured",
          });
          break;
        }

        case "CREATE_CHECKOUT": {
          const odch123 = await storage.get<string>("odch123");
          if (!odch123) {
            sendResponse({ error: "Not authenticated" });
            break;
          }
          if (CONVEX_URL && STRIPE_PRICE_ID) {
            try {
              const result = await convex.action(api.stripe.createCheckoutSession, {
                odch123,
                priceId: STRIPE_PRICE_ID,
                successUrl: "https://www.instagram.com/?payment=success",
                cancelUrl: "https://www.instagram.com/?payment=cancelled",
              });
              sendResponse(result);
              break;
            } catch (e) {
              console.error("[Instagram AI Optimizer] Failed to create checkout:", e);
              sendResponse({ error: String(e) });
              break;
            }
          }
          sendResponse({ error: "Stripe not configured" });
          break;
        }

        default:
          sendResponse({ error: "Unknown message type" });
      }
    } catch (error) {
      console.error("[Instagram AI Optimizer] Message handling error:", error);
      sendResponse({ error: String(error) });
    }
  }

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url?.includes("instagram.com")) {
      const url = new URL(tab.url);
      if (url.searchParams.get("payment") === "success") {
        storage.set("isPremium", true);
        storage.set("credits", -1);
        browser.tabs.sendMessage(tabId, { type: "PAYMENT_SUCCESS" }).catch(() => {});
      }
      browser.tabs.sendMessage(tabId, { type: "PAGE_LOADED" }).catch(() => {});
    }
  });
});
