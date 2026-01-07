import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const getByUserId = query({
  args: { odch123: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("optimizations")
      .withIndex("by_odch123", (q) => q.eq("odch123", args.odch123))
      .order("desc")
      .collect()
  },
})

export const create = mutation({
  args: {
    odch123: v.string(),
    originalUrl: v.string(),
    stylePreset: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("optimizations", {
      odch123: args.odch123,
      originalUrl: args.originalUrl,
      status: "pending",
      stylePreset: args.stylePreset,
    })
  },
})

export const updateStatus = mutation({
  args: {
    optimizationId: v.id("optimizations"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    aiUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const update: {
      status: "pending" | "processing" | "completed" | "failed"
      aiUrl?: string
    } = {
      status: args.status,
    }

    if (args.aiUrl) {
      update.aiUrl = args.aiUrl
    }

    await ctx.db.patch(args.optimizationId, update)
    return { success: true }
  },
})

export const getById = query({
  args: { optimizationId: v.id("optimizations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.optimizationId)
  },
})
