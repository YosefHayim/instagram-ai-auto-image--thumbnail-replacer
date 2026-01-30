import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Briefcase,
  Moon,
  Sun,
  Minimize2,
  Film,
  Sparkles,
  Leaf,
  ChevronDown,
  Check,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Preset {
  name: string;
  slug: string;
  description: string;
  prompt: string;
  category: string;
  iconName: string;
  isDefault?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette,
  Briefcase,
  Moon,
  Sun,
  Minimize2,
  Film,
  Sparkles,
  Leaf,
};

const DEFAULT_PRESETS: Preset[] = [
  {
    name: "Vibrant Pop",
    slug: "vibrant",
    description: "Bold colors and high contrast",
    prompt:
      "Enhance with vibrant, saturated colors. Increase contrast and clarity. Make colors pop while maintaining natural skin tones.",
    category: "color",
    iconName: "Palette",
    isDefault: true,
  },
  {
    name: "Professional",
    slug: "professional",
    description: "Clean, polished look",
    prompt:
      "Apply professional color grading with balanced exposure. Enhance sharpness and clarity. Maintain natural colors.",
    category: "style",
    iconName: "Briefcase",
  },
  {
    name: "Moody Dark",
    slug: "moody",
    description: "Deep shadows, cinematic",
    prompt:
      "Create moody atmosphere with deep shadows. Add subtle blue-teal tones. Reduce highlights for cinematic look.",
    category: "mood",
    iconName: "Moon",
  },
  {
    name: "Golden Hour",
    slug: "golden-hour",
    description: "Warm, sun-kissed glow",
    prompt:
      "Add warm golden tones like sunset lighting. Enhance with soft orange highlights. Create dreamy atmosphere.",
    category: "lighting",
    iconName: "Sun",
  },
  {
    name: "Clean Minimal",
    slug: "minimal",
    description: "Bright and airy",
    prompt:
      "Create clean, bright aesthetic with lifted shadows. Add slight overexposure for airy feel. Soft contrast.",
    category: "style",
    iconName: "Minimize2",
  },
  {
    name: "Film Grain",
    slug: "film",
    description: "Vintage film aesthetic",
    prompt:
      "Apply vintage film aesthetic with subtle grain. Add color shifts like expired film. Faded blacks.",
    category: "vintage",
    iconName: "Film",
  },
  {
    name: "High Fashion",
    slug: "fashion",
    description: "Editorial, dramatic",
    prompt:
      "Apply high-fashion editorial treatment. Dramatic lighting contrast. Magazine-quality finish.",
    category: "style",
    iconName: "Sparkles",
  },
  {
    name: "Nature Fresh",
    slug: "nature",
    description: "Enhanced greens, natural",
    prompt:
      "Enhance natural colors, especially greens and blues. Increase clarity for texture. Natural vibrancy.",
    category: "color",
    iconName: "Leaf",
  },
];

interface PresetSelectorProps {
  selectedPreset: Preset | null;
  onSelect: (preset: Preset) => void;
  onEnhance: () => void;
  isProcessing?: boolean;
  presets?: Preset[];
  className?: string;
}

export function PresetSelector({
  selectedPreset,
  onSelect,
  onEnhance,
  isProcessing = false,
  presets = DEFAULT_PRESETS,
  className,
}: PresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentPreset =
    selectedPreset || presets.find((p) => p.isDefault) || presets[0];
  const Icon = iconMap[currentPreset?.iconName || "Sparkles"] || Sparkles;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2",
            "bg-[#1a1a2e] border border-white/10 rounded-lg",
            "text-white text-sm font-medium",
            "hover:bg-[#252542] transition-colors",
          )}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <span>{currentPreset?.name}</span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-400 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute top-full left-0 right-0 mt-1 z-50",
                "bg-[#1a1a2e] border border-white/10 rounded-lg",
                "shadow-xl shadow-black/50 overflow-hidden",
                "max-h-64 overflow-y-auto",
              )}
            >
              {presets.map((preset, index) => {
                const PresetIcon = iconMap[preset.iconName] || Sparkles;
                const isSelected = currentPreset?.slug === preset.slug;

                return (
                  <motion.button
                    key={preset.slug}
                    onClick={() => {
                      onSelect(preset);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5",
                      "hover:bg-white/5 transition-colors text-left",
                      isSelected && "bg-purple-500/10",
                    )}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        "bg-gradient-to-br",
                        preset.category === "color" &&
                          "from-pink-500 to-orange-500",
                        preset.category === "style" &&
                          "from-blue-500 to-purple-500",
                        preset.category === "mood" &&
                          "from-indigo-500 to-slate-500",
                        preset.category === "lighting" &&
                          "from-yellow-500 to-orange-500",
                        preset.category === "vintage" &&
                          "from-amber-600 to-brown-500",
                      )}
                    >
                      <PresetIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">
                        {preset.name}
                      </div>
                      <div className="text-gray-400 text-xs truncate">
                        {preset.description}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        onClick={onEnhance}
        disabled={isProcessing}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-2.5",
          "bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg",
          "text-white font-semibold text-sm",
          "shadow-lg shadow-purple-500/25",
          "hover:shadow-purple-500/40 transition-shadow",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
        whileHover={!isProcessing ? { scale: 1.02 } : {}}
        whileTap={!isProcessing ? { scale: 0.98 } : {}}
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Enhancing...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            <span>Enhance Image</span>
          </>
        )}
      </motion.button>
    </div>
  );
}

export { DEFAULT_PRESETS };
