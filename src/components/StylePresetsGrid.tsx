import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Film,
  Palette,
  Square,
  Clock,
  Moon,
  Sun,
  Snowflake,
  Wind,
  ChevronDown,
} from "lucide-react";
import { cn, springConfig } from "~/lib/utils";

export type StylePreset =
  | "cinematic"
  | "vibrant"
  | "minimal"
  | "vintage"
  | "moody"
  | "warm"
  | "cool"
  | "bright";

interface StylePresetConfig {
  id: StylePreset;
  label: string;
  icon: React.ReactNode;
}

const primaryPresets: StylePresetConfig[] = [
  {
    id: "cinematic",
    label: "Cinematic",
    icon: <Film className="w-3.5 h-3.5" />,
  },
  {
    id: "vibrant",
    label: "Vibrant",
    icon: <Palette className="w-3.5 h-3.5" />,
  },
  { id: "minimal", label: "Minimal", icon: <Square className="w-3.5 h-3.5" /> },
  { id: "vintage", label: "Vintage", icon: <Clock className="w-3.5 h-3.5" /> },
];

const secondaryPresets: StylePresetConfig[] = [
  { id: "moody", label: "Moody", icon: <Moon className="w-3.5 h-3.5" /> },
  { id: "warm", label: "Warm", icon: <Sun className="w-3.5 h-3.5" /> },
  {
    id: "cool",
    label: "Cool Blue",
    icon: <Snowflake className="w-3.5 h-3.5" />,
  },
  { id: "bright", label: "Bright", icon: <Wind className="w-3.5 h-3.5" /> },
];

interface StylePresetsGridProps {
  selectedStyle: StylePreset;
  onStyleSelect: (style: StylePreset) => void;
  disabled?: boolean;
}

export function StylePresetsGrid({
  selectedStyle,
  onStyleSelect,
  disabled = false,
}: StylePresetsGridProps) {
  const [showMore, setShowMore] = useState(false);

  const renderPresetButton = (preset: StylePresetConfig) => {
    const isSelected = selectedStyle === preset.id;

    return (
      <motion.button
        key={preset.id}
        className={cn(
          "flex items-center justify-center px-3 py-2 rounded-lg text-[11px] font-medium transition-all",
          isSelected
            ? "border-2 border-primary-500 bg-primary-500/5 text-primary-600 font-bold"
            : "border border-gray-200 bg-white hover:border-gray-300 text-gray-600 hover:text-gray-900",
        )}
        onClick={() => onStyleSelect(preset.id)}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
      >
        <span className="mr-1.5">{preset.icon}</span>
        {preset.label}
      </motion.button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[13px] font-bold text-gray-700">
          Style Presets
        </label>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          8 Styles
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {primaryPresets.map(renderPresetButton)}
      </div>

      <div className="relative">
        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={springConfig.snappy}
              className="grid grid-cols-2 gap-2 pt-2 overflow-hidden"
            >
              {secondaryPresets.map(renderPresetButton)}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          className={cn(
            "w-full text-center text-[10px] text-gray-400 font-medium py-1.5",
            "hover:text-primary-500 transition-colors",
            "flex items-center justify-center gap-1",
          )}
          onClick={() => setShowMore(!showMore)}
        >
          {showMore ? "Less Styles" : "More Styles"}
          <motion.span
            animate={{ rotate: showMore ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3 h-3" />
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
}
