import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { PresetSelector, type Preset, DEFAULT_PRESETS } from "./PresetSelector";
import { ProviderSelector, getSavedProvider } from "./ProviderSelector";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { type ImageProvider, DEFAULT_PROVIDER } from "@/lib/types";

type OverlayMode = "select" | "processing" | "compare";

interface InlineEnhanceOverlayProps {
  originalImage: string;
  postId: string;
  onClose: () => void;
  onApply: (enhancedUrl: string) => void;
  onEnhance: (preset: Preset, provider: ImageProvider) => Promise<string>;
  credits?: number;
  className?: string;
}

export function InlineEnhanceOverlay({
  originalImage,
  postId,
  onClose,
  onApply,
  onEnhance,
  credits = 0,
  className,
}: InlineEnhanceOverlayProps) {
  const [mode, setMode] = useState<OverlayMode>("select");
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(
    DEFAULT_PRESETS.find((p) => p.isDefault) || DEFAULT_PRESETS[0],
  );
  const [selectedProvider, setSelectedProvider] =
    useState<ImageProvider>(DEFAULT_PROVIDER);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSavedProvider().then(setSelectedProvider);
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!selectedPreset) return;

    setMode("processing");
    setError(null);

    try {
      const result = await onEnhance(selectedPreset, selectedProvider);
      setEnhancedImage(result);
      setMode("compare");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enhancement failed");
      setMode("select");
    }
  }, [selectedPreset, selectedProvider, onEnhance]);

  const handleApply = useCallback(() => {
    if (enhancedImage) {
      onApply(enhancedImage);
    }
  }, [enhancedImage, onApply]);

  const handleDiscard = useCallback(() => {
    setEnhancedImage(null);
    setMode("select");
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "absolute inset-0 z-[999999]",
        "bg-black/90 backdrop-blur-sm",
        "flex flex-col",
        className,
      )}
      data-ai-overlay={postId}
    >
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="text-white text-sm font-medium">Enhance Image</span>
        </div>
        <div className="flex items-center gap-3">
          <ProviderSelector
            selectedProvider={selectedProvider}
            onSelect={setSelectedProvider}
          />
          <div className="flex items-center gap-1.5 text-xs">
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-white font-medium">{credits}</span>
            <span className="text-gray-400">credits</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-3 overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 relative rounded-xl overflow-hidden mb-3">
                <img
                  src={originalImage}
                  alt="Original"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2">
                  <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full">
                    Original
                  </span>
                </div>
              </div>

              {error && (
                <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              <PresetSelector
                selectedPreset={selectedPreset}
                onSelect={setSelectedPreset}
                onEnhance={handleEnhance}
                isProcessing={false}
              />

              {credits <= 0 && (
                <p className="mt-2 text-center text-yellow-400 text-xs">
                  No credits remaining. Purchase more to continue.
                </p>
              )}
            </motion.div>
          )}

          {mode === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full flex flex-col items-center justify-center"
            >
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="w-16 h-16 rounded-full border-4 border-white/30 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </div>
              </div>
              <p className="text-white font-medium mb-1">Enhancing Image</p>
              <p className="text-gray-400 text-sm">
                Using {selectedPreset?.name} with{" "}
                {selectedProvider.toUpperCase()}...
              </p>
            </motion.div>
          )}

          {mode === "compare" && enhancedImage && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              <BeforeAfterSlider
                beforeImage={originalImage}
                afterImage={enhancedImage}
                onApply={handleApply}
                onDiscard={handleDiscard}
                showActions={true}
                className="h-full"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
