import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    odch123: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),

    credits: v.number(),
    freeTrialEndsAt: v.optional(v.number()),
    isTrialActive: v.boolean(),

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

    totalImagesEnhanced: v.number(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index("by_odch123", ["odch123"])
    .index("by_email", ["email"])
    .index("by_lemonSqueezyCustomerId", ["lemonSqueezyCustomerId"]),

  creditTransactions: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("purchase"),
      v.literal("usage"),
      v.literal("trial_credit"),
      v.literal("refund"),
      v.literal("bonus"),
    ),
    amount: v.number(),
    balanceAfter: v.number(),
    description: v.string(),

    lemonSqueezyOrderId: v.optional(v.string()),
    optimizationId: v.optional(v.id("optimizations")),

    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_type", ["type"])
    .index("by_createdAt", ["createdAt"]),

  optimizations: defineTable({
    userId: v.id("users"),
    originalUrl: v.string(),
    enhancedUrl: v.optional(v.string()),

    preset: v.optional(v.string()),
    customPrompt: v.optional(v.string()),

    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),

    processingTimeMs: v.optional(v.number()),
    errorMessage: v.optional(v.string()),

    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  presets: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    prompt: v.string(),
    category: v.string(),
    iconName: v.string(),
    isDefault: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_sortOrder", ["sortOrder"]),
});
