import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const getByUserId = query({
  args: { odch123: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_odch123", (q) => q.eq("odch123", args.odch123))
      .unique()
  },
})

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique()
  },
})

export const create = mutation({
  args: {
    odch123: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_odch123", (q) => q.eq("odch123", args.odch123))
      .unique()

    if (existing) {
      return existing._id
    }

    return await ctx.db.insert("profiles", {
      odch123: args.odch123,
      email: args.email,
      credits: 1,
      isPremium: false,
    })
  },
})

export const decrementCredits = mutation({
  args: { odch123: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_odch123", (q) => q.eq("odch123", args.odch123))
      .unique()

    if (!profile) {
      throw new Error("Profile not found")
    }

    if (profile.isPremium) {
      return { credits: -1 }
    }

    if (profile.credits <= 0) {
      return { credits: 0, error: "No credits remaining" }
    }

    const newCredits = profile.credits - 1
    await ctx.db.patch(profile._id, { credits: newCredits })
    return { credits: newCredits }
  },
})

export const setPremium = mutation({
  args: {
    odch123: v.string(),
    isPremium: v.boolean(),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_odch123", (q) => q.eq("odch123", args.odch123))
      .unique()

    if (!profile) {
      throw new Error("Profile not found")
    }

    await ctx.db.patch(profile._id, {
      isPremium: args.isPremium,
      credits: args.isPremium ? -1 : profile.credits,
      stripeCustomerId: args.stripeCustomerId,
    })

    return { success: true }
  },
})

export const getByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .unique()
  },
})
