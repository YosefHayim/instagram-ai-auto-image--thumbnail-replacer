import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getPresets = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("presets").withIndex("by_sortOrder").collect();
  },
});

export const getPresetBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("presets")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const seedPresets = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("presets").first();
    if (existing) return { message: "Presets already seeded" };

    const presets = [
      {
        name: "Vibrant Pop",
        slug: "vibrant",
        description: "Bold colors and high contrast for maximum impact",
        prompt:
          "Enhance with vibrant, saturated colors. Increase contrast and clarity. Make colors pop while maintaining natural skin tones. Add subtle warmth for an inviting feel.",
        category: "color",
        iconName: "Palette",
        isDefault: true,
        sortOrder: 1,
      },
      {
        name: "Professional",
        slug: "professional",
        description: "Clean, polished look for business content",
        prompt:
          "Apply professional color grading with balanced exposure. Enhance sharpness and clarity. Maintain natural colors with slight desaturation. Clean up any imperfections while keeping authenticity.",
        category: "style",
        iconName: "Briefcase",
        isDefault: false,
        sortOrder: 2,
      },
      {
        name: "Moody Dark",
        slug: "moody",
        description: "Deep shadows and cinematic atmosphere",
        prompt:
          "Create a moody atmosphere with deep shadows and rich blacks. Add subtle blue-teal tones to shadows. Reduce highlights for a cinematic look. Enhance contrast in midtones.",
        category: "mood",
        iconName: "Moon",
        isDefault: false,
        sortOrder: 3,
      },
      {
        name: "Golden Hour",
        slug: "golden-hour",
        description: "Warm, sun-kissed glow like magic hour",
        prompt:
          "Add warm golden tones reminiscent of sunset lighting. Enhance with soft orange and yellow highlights. Create a dreamy, warm atmosphere. Add subtle lens flare effect if appropriate.",
        category: "lighting",
        iconName: "Sun",
        isDefault: false,
        sortOrder: 4,
      },
      {
        name: "Clean Minimal",
        slug: "minimal",
        description: "Bright, airy, and minimalist aesthetic",
        prompt:
          "Create a clean, bright aesthetic with lifted shadows. Add slight overexposure for an airy feel. Desaturate colors slightly for minimal look. Enhance whites and maintain soft contrast.",
        category: "style",
        iconName: "Minimize2",
        isDefault: false,
        sortOrder: 5,
      },
      {
        name: "Film Grain",
        slug: "film",
        description: "Vintage film camera aesthetic with grain",
        prompt:
          "Apply vintage film aesthetic with subtle grain texture. Add slight color shifts like expired film. Reduce sharpness slightly for analog feel. Create faded blacks and muted highlights.",
        category: "vintage",
        iconName: "Film",
        isDefault: false,
        sortOrder: 6,
      },
      {
        name: "High Fashion",
        slug: "fashion",
        description: "Editorial style with dramatic lighting",
        prompt:
          "Apply high-fashion editorial treatment. Enhance skin texture while smoothing imperfections. Add dramatic lighting contrast. Create glossy, magazine-quality finish with sharp details.",
        category: "style",
        iconName: "Sparkles",
        isDefault: false,
        sortOrder: 7,
      },
      {
        name: "Nature Fresh",
        slug: "nature",
        description: "Enhanced greens and natural vibrancy",
        prompt:
          "Enhance natural colors, especially greens and blues. Increase clarity for texture details. Add subtle HDR effect for dynamic range. Maintain natural look while boosting vibrancy.",
        category: "color",
        iconName: "Leaf",
        isDefault: false,
        sortOrder: 8,
      },
    ];

    for (const preset of presets) {
      await ctx.db.insert("presets", preset);
    }

    return { message: "Presets seeded successfully", count: presets.length };
  },
});
