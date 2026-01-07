import { ConvexHttpClient } from "convex/browser"
import { api } from "../../convex/_generated/api"

const CONVEX_URL = process.env.PLASMO_PUBLIC_CONVEX_URL || ""

export const convex = new ConvexHttpClient(CONVEX_URL)

export async function getProfile(odch123: string) {
  return await convex.query(api.profiles.getByUserId, { odch123 })
}

export async function createProfile(odch123: string, email: string) {
  return await convex.mutation(api.profiles.create, { odch123, email })
}

export async function decrementCredits(odch123: string) {
  return await convex.mutation(api.profiles.decrementCredits, { odch123 })
}

export async function setPremium(odch123: string, isPremium: boolean) {
  return await convex.mutation(api.profiles.setPremium, { odch123, isPremium })
}

export async function createOptimization(
  odch123: string,
  originalUrl: string,
  stylePreset?: string
) {
  return await convex.mutation(api.optimizations.create, {
    odch123,
    originalUrl,
    stylePreset,
  })
}

export async function getOptimizations(odch123: string) {
  return await convex.query(api.optimizations.getByUserId, { odch123 })
}

export async function createCheckoutSession(
  odch123: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  return await convex.action(api.stripe.createCheckoutSession, {
    odch123,
    priceId,
    successUrl,
    cancelUrl,
  })
}
