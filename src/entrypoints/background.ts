import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

export default defineBackground(() => {
  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || "";

  const convex = new ConvexHttpClient(CONVEX_URL);

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
    | {
        type: "SET_AUTH_STATE";
        payload: { isAuthenticated: boolean; odch123?: string; email?: string };
      }
    | { type: "GET_CREDITS" }
    | { type: "SET_CREDITS"; payload: number }
    | { type: "DECREMENT_CREDITS" }
    | { type: "SET_PREMIUM"; payload: boolean }
    | { type: "GET_USER_STATE" }
    | {
        type: "OPTIMIZE_IMAGE";
        payload: { imageUrl: string; stylePreset?: string };
      }
    | { type: "CREATE_CHECKOUT" }
    | {
        type: "CREATE_LEMON_SQUEEZY_CHECKOUT";
        payload: {
          userId: string;
          email: string;
          name?: string;
          credits: number;
          successUrl?: string;
        };
      }
    | {
        type: "GET_LEMON_SQUEEZY_PORTAL";
        payload: { userId: string };
      }
    | {
        type: "CREATE_CONVEX_USER";
        payload: {
          odch123: string;
          email: string;
          name?: string;
          avatarUrl?: string;
        };
      }
    | { type: "SIGN_OUT" };

  browser.runtime.onMessage.addListener(
    (message: unknown, _sender, sendResponse) => {
      handleMessage(message as MessageType, sendResponse);
      return true;
    },
  );

  async function handleMessage(
    message: MessageType,
    sendResponse: (response: unknown) => void,
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
          if (
            message.payload.isAuthenticated &&
            message.payload.odch123 &&
            message.payload.email
          ) {
            try {
              await convex.mutation(api.users.getOrCreateUser, {
                odch123: message.payload.odch123,
                email: message.payload.email,
              });
            } catch (e) {
              console.log("[Instagram AI Optimizer] User creation error:", e);
            }
          }
          sendResponse({ success: true });
          break;
        }

        case "GET_CREDITS": {
          const odch123 = await storage.get<string>("odch123");
          if (odch123 && CONVEX_URL) {
            try {
              const user = await convex.query(api.users.getUserByOdch123, {
                odch123,
              });
              if (user) {
                const hasSubscription = user.subscriptionStatus === "active";
                await storage.set("credits", user.credits);
                await storage.set("isPremium", hasSubscription);
                sendResponse({ credits: user.credits });
                break;
              }
            } catch (e) {
              console.error(
                "[Instagram AI Optimizer] Failed to fetch user:",
                e,
              );
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
              const user = await convex.query(api.users.getUserByOdch123, {
                odch123,
              });
              if (user) {
                const hasSubscription = user.subscriptionStatus === "active";
                const now = Date.now();
                const isTrialExpired =
                  user.freeTrialEndsAt && user.freeTrialEndsAt < now;
                const trialDaysRemaining = user.freeTrialEndsAt
                  ? Math.max(
                      0,
                      Math.ceil(
                        (user.freeTrialEndsAt - now) / (24 * 60 * 60 * 1000),
                      ),
                    )
                  : 0;

                await storage.set("credits", user.credits);
                await storage.set("isPremium", hasSubscription);
                sendResponse({
                  isAuthenticated: true,
                  isPremium: hasSubscription,
                  credits: user.credits,
                  isTrialActive: user.isTrialActive && !isTrialExpired,
                  trialDaysRemaining,
                  totalImagesEnhanced: user.totalImagesEnhanced,
                  odch123,
                });
                break;
              }
            } catch (e) {
              console.error(
                "[Instagram AI Optimizer] Failed to fetch user state:",
                e,
              );
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
            isTrialActive: false,
            trialDaysRemaining: 0,
            totalImagesEnhanced: 0,
            odch123,
          });
          break;
        }

        case "OPTIMIZE_IMAGE": {
          if (CONVEX_URL) {
            try {
              const prompt = message.payload.stylePreset
                ? `Make this image more ${message.payload.stylePreset}`
                : "Enhance this image professionally for Instagram";

              const result = await convex.action(
                api.chatEnhance.enhanceWithChat,
                {
                  imageUrl: message.payload.imageUrl,
                  userPrompt: prompt,
                },
              );
              sendResponse({
                success: result.success,
                aiImageUrl: result.enhancedUrl || message.payload.imageUrl,
                error: result.error,
                processingTimeMs: result.processingTimeMs,
              });
              break;
            } catch (e) {
              console.error(
                "[Instagram AI Optimizer] AI enhancement failed:",
                e,
              );
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

        case "CREATE_CHECKOUT":
        case "CREATE_LEMON_SQUEEZY_CHECKOUT": {
          if (!CONVEX_URL) {
            sendResponse({ error: "Convex not configured" });
            break;
          }

          const payload =
            message.type === "CREATE_LEMON_SQUEEZY_CHECKOUT"
              ? message.payload
              : null;

          if (!payload) {
            const odch123 = await storage.get<string>("odch123");
            if (!odch123) {
              sendResponse({ error: "Not authenticated" });
              break;
            }
            sendResponse({ error: "Use CREATE_LEMON_SQUEEZY_CHECKOUT" });
            break;
          }

          try {
            const result = await convex.action(
              api.lemonSqueezy.createCheckout,
              {
                userId: payload.userId,
                email: payload.email,
                name: payload.name,
                credits: payload.credits,
                successUrl: payload.successUrl,
              },
            );
            sendResponse(result);
          } catch (e) {
            console.error(
              "[Instagram AI Optimizer] Failed to create checkout:",
              e,
            );
            sendResponse({ error: String(e) });
          }
          break;
        }

        case "GET_LEMON_SQUEEZY_PORTAL": {
          if (!CONVEX_URL) {
            sendResponse({ error: "Convex not configured" });
            break;
          }

          try {
            const result = await convex.action(api.lemonSqueezy.getPortalUrl, {
              userId: message.payload.userId,
            });
            sendResponse(result);
          } catch (e) {
            console.error(
              "[Instagram AI Optimizer] Failed to get portal URL:",
              e,
            );
            sendResponse({ error: String(e) });
          }
          break;
        }

        case "CREATE_CONVEX_USER": {
          const { odch123, email, name, avatarUrl } = message.payload;
          console.log("[Instagram AI Optimizer] Creating Convex user:", email);

          await storage.set("isAuthenticated", true);
          await storage.set("odch123", odch123);

          if (CONVEX_URL) {
            try {
              await convex.mutation(api.users.getOrCreateUser, {
                odch123,
                email,
                name,
                avatarUrl,
              });

              const user = await convex.query(api.users.getUserByOdch123, {
                odch123,
              });

              if (user) {
                const now = Date.now();
                const isTrialExpired =
                  user.freeTrialEndsAt && user.freeTrialEndsAt < now;
                const trialDaysRemaining = user.freeTrialEndsAt
                  ? Math.max(
                      0,
                      Math.ceil(
                        (user.freeTrialEndsAt - now) / (24 * 60 * 60 * 1000),
                      ),
                    )
                  : 0;

                await storage.set("credits", user.credits);
                await storage.set(
                  "isPremium",
                  user.subscriptionStatus === "active",
                );

                console.log(
                  "[Instagram AI Optimizer] User created with",
                  user.credits,
                  "credits",
                );

                sendResponse({
                  success: true,
                  credits: user.credits,
                  isTrialActive: user.isTrialActive && !isTrialExpired,
                  trialDaysRemaining,
                });
                break;
              }
            } catch (e) {
              console.error(
                "[Instagram AI Optimizer] Failed to create Convex user:",
                e,
              );
              sendResponse({ success: false, error: String(e) });
              break;
            }
          }
          sendResponse({ success: true, credits: 10 });
          break;
        }

        case "SIGN_OUT": {
          await storage.set("isAuthenticated", false);
          await storage.set("odch123", null);
          await storage.set("credits", 0);
          await storage.set("isPremium", false);
          console.log("[Instagram AI Optimizer] User signed out");
          sendResponse({ success: true });
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
    if (
      changeInfo.status === "complete" &&
      tab.url?.includes("instagram.com")
    ) {
      const url = new URL(tab.url);
      if (url.searchParams.get("payment") === "success") {
        storage.set("isPremium", true);
        storage.set("credits", -1);
        browser.tabs
          .sendMessage(tabId, { type: "PAYMENT_SUCCESS" })
          .catch(() => {});
      }
      browser.tabs.sendMessage(tabId, { type: "PAGE_LOADED" }).catch(() => {});
    }
  });
});
