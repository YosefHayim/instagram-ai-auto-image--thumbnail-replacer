import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("optimizations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    originalUrl: v.string(),
    preset: v.optional(v.string()),
    customPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("optimizations", {
      userId: args.userId,
      originalUrl: args.originalUrl,
      status: "pending",
      preset: args.preset,
      customPrompt: args.customPrompt,
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    optimizationId: v.id("optimizations"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    enhancedUrl: v.optional(v.string()),
    processingTimeMs: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const update: Record<string, unknown> = {
      status: args.status,
    };

    if (args.enhancedUrl) {
      update.enhancedUrl = args.enhancedUrl;
    }
    if (args.processingTimeMs) {
      update.processingTimeMs = args.processingTimeMs;
    }
    if (args.errorMessage) {
      update.errorMessage = args.errorMessage;
    }
    if (args.status === "completed") {
      update.completedAt = Date.now();
    }

    await ctx.db.patch(args.optimizationId, update);
    return { success: true };
  },
});

export const getById = query({
  args: { optimizationId: v.id("optimizations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.optimizationId);
  },
});
