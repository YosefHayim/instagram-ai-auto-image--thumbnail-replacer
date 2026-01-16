import { storage } from "wxt/storage";
import { browser } from "wxt/browser";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  convexUserId?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface ConvexUserResponse {
  success: boolean;
  credits?: number;
  isTrialActive?: boolean;
  trialDaysRemaining?: number;
  error?: string;
}

const AUTH_STORAGE_KEY = "local:auth_user";
const TOKENS_STORAGE_KEY = "local:auth_tokens";

export const auth = {
  async signInWithGoogle(): Promise<AuthUser> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError || !token) {
          reject(
            new Error(
              chrome.runtime.lastError?.message || "Failed to get auth token",
            ),
          );
          return;
        }

        try {
          const response = await fetch(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            { headers: { Authorization: `Bearer ${token}` } },
          );

          if (!response.ok) {
            throw new Error("Failed to fetch user info");
          }

          const googleUser = await response.json();

          const user: AuthUser = {
            id: googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            avatarUrl: googleUser.picture,
          };

          const tokens: AuthTokens = {
            accessToken: token,
            expiresAt: Date.now() + 3600 * 1000,
          };

          await storage.setItem(AUTH_STORAGE_KEY, user);
          await storage.setItem(TOKENS_STORAGE_KEY, tokens);

          try {
            const convexResponse = (await browser.runtime.sendMessage({
              type: "CREATE_CONVEX_USER",
              payload: {
                odch123: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
              },
            })) as ConvexUserResponse;

            if (convexResponse?.success) {
              console.log("[Auth] Convex user created/updated successfully");
            }
          } catch (convexError) {
            console.error("[Auth] Failed to create Convex user:", convexError);
          }

          resolve(user);
        } catch (error) {
          chrome.identity.removeCachedAuthToken({ token }, () => {});
          reject(error);
        }
      });
    });
  },

  async signOut(): Promise<void> {
    const tokens = await storage.getItem<AuthTokens>(TOKENS_STORAGE_KEY);

    if (tokens?.accessToken) {
      chrome.identity.removeCachedAuthToken(
        { token: tokens.accessToken },
        () => {},
      );
    }

    await storage.removeItem(AUTH_STORAGE_KEY);
    await storage.removeItem(TOKENS_STORAGE_KEY);
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    return storage.getItem<AuthUser>(AUTH_STORAGE_KEY);
  },

  async getTokens(): Promise<AuthTokens | null> {
    return storage.getItem<AuthTokens>(TOKENS_STORAGE_KEY);
  },

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    const tokens = await this.getTokens();

    if (!user || !tokens) return false;

    return tokens.expiresAt > Date.now();
  },

  async refreshTokenIfNeeded(): Promise<string | null> {
    const tokens = await this.getTokens();

    if (!tokens) return null;

    if (tokens.expiresAt > Date.now() + 5 * 60 * 1000) {
      return tokens.accessToken;
    }

    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, async (token) => {
        if (chrome.runtime.lastError || !token) {
          resolve(null);
          return;
        }

        const newTokens: AuthTokens = {
          accessToken: token,
          expiresAt: Date.now() + 3600 * 1000,
        };

        await storage.setItem(TOKENS_STORAGE_KEY, newTokens);
        resolve(token);
      });
    });
  },

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    const checkAuth = async () => {
      const user = await this.getCurrentUser();
      callback(user);
    };

    checkAuth();

    const unwatchUser = storage.watch<AuthUser>(
      AUTH_STORAGE_KEY,
      (newValue) => {
        callback(newValue ?? null);
      },
    );

    return unwatchUser;
  },
};
