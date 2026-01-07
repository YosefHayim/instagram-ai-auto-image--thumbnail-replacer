import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  profiles: defineTable({
    odch123: v.string(),
    email: v.string(),
    credits: v.number(),
    isPremium: v.boolean(),
    stripeCustomerId: v.optional(v.string()),
  })
    .index("by_odch123", ["odch123"])
    .index("by_email", ["email"])
    .index("by_stripeCustomerId", ["stripeCustomerId"]),

  optimizations: defineTable({
    odch123: v.string(),
    originalUrl: v.string(),
    aiUrl: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    stylePreset: v.optional(v.string()),
  })
    .index("by_odch123", ["odch123"])
    .index("by_status", ["status"]),
})
