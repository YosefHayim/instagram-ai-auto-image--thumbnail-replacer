import { browser } from "wxt/browser";

export type MessageType =
  | { type: "GET_AUTH_STATE" }
  | {
      type: "SET_AUTH_STATE";
      payload: { isAuthenticated: boolean; userId?: string };
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
  | { type: "TOGGLE_PANEL" }
  | { type: "PAGE_LOADED" };

export interface UserState {
  isAuthenticated: boolean;
  isPremium: boolean;
  credits: number;
  userId?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  userId?: string;
}

export interface CreditsResponse {
  credits: number;
  error?: string;
}

export interface OptimizeResponse {
  success: boolean;
  aiImageUrl?: string;
  error?: string;
}

export interface CheckoutResponse {
  url?: string;
  error?: string;
}

export async function sendMessage<T>(message: MessageType): Promise<T> {
  return browser.runtime.sendMessage(message) as Promise<T>;
}

export async function getUserState(): Promise<UserState> {
  return sendMessage<UserState>({ type: "GET_USER_STATE" });
}

export async function getAuthState(): Promise<AuthState> {
  return sendMessage<AuthState>({ type: "GET_AUTH_STATE" });
}

export async function setAuthState(
  isAuthenticated: boolean,
  userId?: string,
): Promise<void> {
  await sendMessage({
    type: "SET_AUTH_STATE",
    payload: { isAuthenticated, userId },
  });
}

export async function getCredits(): Promise<number> {
  const response = await sendMessage<CreditsResponse>({ type: "GET_CREDITS" });
  return response.credits;
}

export async function decrementCredits(): Promise<CreditsResponse> {
  return sendMessage<CreditsResponse>({ type: "DECREMENT_CREDITS" });
}

export async function setPremium(isPremium: boolean): Promise<void> {
  await sendMessage({ type: "SET_PREMIUM", payload: isPremium });
}

export async function optimizeImage(
  imageUrl: string,
  stylePreset?: string,
): Promise<OptimizeResponse> {
  return sendMessage<OptimizeResponse>({
    type: "OPTIMIZE_IMAGE",
    payload: { imageUrl, stylePreset },
  });
}

export async function createCheckout(): Promise<CheckoutResponse> {
  return sendMessage<CheckoutResponse>({ type: "CREATE_CHECKOUT" });
}

export function onMessage(
  callback: (
    message: MessageType,
    sender: chrome.runtime.MessageSender,
  ) => void,
): () => void {
  const listener = (message: unknown, sender: chrome.runtime.MessageSender) => {
    callback(message as MessageType, sender);
    return Promise.resolve({ received: true });
  };

  browser.runtime.onMessage.addListener(
    listener as Parameters<typeof browser.runtime.onMessage.addListener>[0],
  );
  return () =>
    browser.runtime.onMessage.removeListener(
      listener as Parameters<
        typeof browser.runtime.onMessage.removeListener
      >[0],
    );
}
