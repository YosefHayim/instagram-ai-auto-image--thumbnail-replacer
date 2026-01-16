import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";

const FREE_TRIAL_DAYS = 14;
const FREE_TRIAL_CREDITS = 10;

export const getOrCreateUser = mutation({
  args: {
    odch123: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_odch123", (q) => q.eq("odch123", args.odch123))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastActiveAt: Date.now(),
        name: args.name || existing.name,
        avatarUrl: args.avatarUrl || existing.avatarUrl,
      });
      return existing._id;
    }

    const now = Date.now();
    const freeTrialEndsAt = now + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000;

    const userId = await ctx.db.insert("users", {
      odch123: args.odch123,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      credits: FREE_TRIAL_CREDITS,
      freeTrialEndsAt,
      isTrialActive: true,
      totalImagesEnhanced: 0,
      createdAt: now,
      lastActiveAt: now,
    });

    await ctx.db.insert("creditTransactions", {
      userId,
      type: "trial_credit",
      amount: FREE_TRIAL_CREDITS,
      balanceAfter: FREE_TRIAL_CREDITS,
      description: `Free trial: ${FREE_TRIAL_CREDITS} credits for ${FREE_TRIAL_DAYS} days`,
      createdAt: now,
    });

    return userId;
  },
});

export const getUserByOdch123 = query({
  args: { odch123: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_odch123", (q) => q.eq("odch123", args.odch123))
      .first();
  },
});

export const getUserCredits = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const now = Date.now();
    const isTrialExpired = user.freeTrialEndsAt && user.freeTrialEndsAt < now;
    const trialDaysRemaining = user.freeTrialEndsAt
      ? Math.max(
          0,
          Math.ceil((user.freeTrialEndsAt - now) / (24 * 60 * 60 * 1000)),
        )
      : 0;

    return {
      credits: user.credits,
      isTrialActive: user.isTrialActive && !isTrialExpired,
      trialDaysRemaining,
      totalImagesEnhanced: user.totalImagesEnhanced,
      hasActiveSubscription: user.subscriptionStatus === "active",
    };
  },
});

export const useCredit = mutation({
  args: {
    userId: v.id("users"),
    optimizationId: v.id("optimizations"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const now = Date.now();
    const isTrialExpired = user.freeTrialEndsAt && user.freeTrialEndsAt < now;

    if (user.credits <= 0) {
      if (isTrialExpired || !user.isTrialActive) {
        throw new Error("No credits remaining. Please purchase more credits.");
      }
    }

    const newBalance = Math.max(0, user.credits - 1);

    await ctx.db.patch(args.userId, {
      credits: newBalance,
      totalImagesEnhanced: user.totalImagesEnhanced + 1,
      lastActiveAt: now,
    });

    await ctx.db.insert("creditTransactions", {
      userId: args.userId,
      type: "usage",
      amount: -1,
      balanceAfter: newBalance,
      description: "Image enhancement",
      optimizationId: args.optimizationId,
      createdAt: now,
    });

    return { newBalance, creditsUsed: 1 };
  },
});

export const addCredits = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    lemonSqueezyOrderId: v.optional(v.string()),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const newBalance = user.credits + args.amount;

    await ctx.db.patch(args.userId, {
      credits: newBalance,
      lastActiveAt: Date.now(),
    });

    await ctx.db.insert("creditTransactions", {
      userId: args.userId,
      type: "purchase",
      amount: args.amount,
      balanceAfter: newBalance,
      description: args.description,
      lemonSqueezyOrderId: args.lemonSqueezyOrderId,
      createdAt: Date.now(),
    });

    return { newBalance };
  },
});

export const getCreditHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);

    return transactions;
  },
});

export const internalGetUserByOdch123 = internalQuery({
  args: { odch123: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_odch123", (q) => q.eq("odch123", args.odch123))
      .first();
  },
});

export const getUserBySubscriptionId = internalQuery({
  args: { subscriptionId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .filter((q) =>
        q.eq(q.field("lemonSqueezySubscriptionId"), args.subscriptionId),
      )
      .first();
  },
});

export const internalAddCredits = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    lemonSqueezyOrderId: v.optional(v.string()),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const newBalance = user.credits + args.amount;

    await ctx.db.patch(args.userId, {
      credits: newBalance,
      lastActiveAt: Date.now(),
    });

    await ctx.db.insert("creditTransactions", {
      userId: args.userId,
      type: "purchase",
      amount: args.amount,
      balanceAfter: newBalance,
      description: args.description,
      lemonSqueezyOrderId: args.lemonSqueezyOrderId,
      createdAt: Date.now(),
    });

    return { newBalance };
  },
});

export const updateSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    lemonSqueezyCustomerId: v.optional(v.string()),
    lemonSqueezySubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("cancelled"),
        v.literal("expired"),
        v.literal("paused"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    );

    await ctx.db.patch(userId, {
      ...filteredUpdates,
      lastActiveAt: Date.now(),
    });
  },
});
