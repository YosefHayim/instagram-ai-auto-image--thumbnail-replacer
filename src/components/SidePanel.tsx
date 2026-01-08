import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wand2,
  Lock,
  CreditCard,
  Zap,
  Grid,
  ArrowRight,
  Diamond,
  Download,
  Check,
} from "lucide-react";
import { cn, springConfig } from "~/lib/utils";
import { StylePresetsGrid, type StylePreset } from "./StylePresetsGrid";
import { CreatorInsights } from "./CreatorInsights";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

interface EnhancedImagePreview {
  originalUrl: string;
  enhancedUrl: string;
  postId: string;
}

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  isProcessing: boolean;
  processingMessage?: string;
  selectedStyle: StylePreset;
  onStyleSelect: (style: StylePreset) => void;
  onOptimizeSingle: () => void;
  onOptimizeFull: () => void;
  onUpgrade: () => void;
  creatorInsights?: {
    bestPostingTime: string;
    suggestedCaption: string;
    hashtags: string[];
    engagementTip: string;
  };
  enhancedPreview?: EnhancedImagePreview | null;
  onApplyEnhancement?: () => void;
  onDiscardEnhancement?: () => void;
  onDownloadEnhancement?: () => void;
}

export function SidePanel({
  isOpen,
  onClose,
  credits,
  isProcessing,
  processingMessage = "Analyzing composition...",
  selectedStyle,
  onStyleSelect,
  onOptimizeSingle,
  onOptimizeFull,
  onUpgrade,
  creatorInsights,
  enhancedPreview,
  onApplyEnhancement,
  onDiscardEnhancement,
  onDownloadEnhancement,
}: SidePanelProps) {
  const hasFreeCredits = credits > 0 || credits === -1;
  const isPremium = credits === -1;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            layoutId="fab-panel"
            className={cn(
              "fixed right-4 bottom-4 z-[9999]",
              "w-[340px] rounded-xl overflow-hidden",
              "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
              "border border-gray-100",
              "flex flex-col max-h-[90vh]",
            )}
            initial={{ width: 56, height: 56 }}
            animate={{ width: 340, height: "auto" }}
            exit={{ width: 56, height: 56, opacity: 0 }}
            transition={springConfig.bouncy}
          >
            <header className="bg-gradient-to-r from-primary-500 to-fuchsia-500 px-5 py-4 flex items-center justify-between text-white relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

              <motion.div
                className="flex items-center gap-2.5 relative z-10"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Wand2 className="w-[22px] h-[22px]" />
                <h2 className="text-[17px] font-bold tracking-tight leading-tight">
                  AI Optimizer
                </h2>
              </motion.div>

              <motion.button
                className="relative z-10 flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </header>

            <div className="flex flex-col p-5 gap-5 overflow-y-auto">
              <motion.div
                className="flex flex-wrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-gray-50 border border-gray-100 pl-3 pr-4 shadow-sm">
                  <Zap className="w-[18px] h-[18px] text-primary-500" />
                  <p className="text-slate-800 text-xs font-semibold leading-normal">
                    {isPremium ? (
                      "Premium Plan"
                    ) : (
                      <>
                        Free Plan:{" "}
                        <span className="text-primary-500">
                          {credits} Credits
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <StylePresetsGrid
                  selectedStyle={selectedStyle}
                  onStyleSelect={onStyleSelect}
                  disabled={isProcessing}
                />
              </motion.div>

              {enhancedPreview && (
                <motion.div
                  className="flex flex-col gap-3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">
                      Enhanced Result
                    </p>
                    <motion.button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 text-primary-600 text-xs font-semibold hover:bg-primary-100 transition-colors"
                      onClick={onDownloadEnhancement}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </motion.button>
                  </div>
                  <BeforeAfterSlider
                    beforeImage={enhancedPreview.originalUrl}
                    afterImage={enhancedPreview.enhancedUrl}
                    onApply={onApplyEnhancement}
                    onDiscard={onDiscardEnhancement}
                    showActions={true}
                  />
                </motion.div>
              )}

              <motion.div
                className="flex flex-col gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <button
                  className={cn(
                    "group relative flex items-center w-full p-1.5 rounded-full text-white",
                    "shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40",
                    "transition-all active:scale-[0.98]",
                    isProcessing && "opacity-50 pointer-events-none",
                  )}
                  style={{
                    background:
                      "linear-gradient(135deg, #a855f7 0%, #d946ef 100%)",
                  }}
                  onClick={onOptimizeSingle}
                  disabled={isProcessing || !hasFreeCredits}
                >
                  {hasFreeCredits && !isPremium && (
                    <div className="absolute -top-2 right-4 bg-yellow-400 text-yellow-950 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm z-10 tracking-wide border border-white">
                      Free
                    </div>
                  )}
                  <div className="flex items-center justify-center size-10 bg-white/20 rounded-full text-white shrink-0 backdrop-blur-sm">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start pl-3 text-white flex-1">
                    <span className="font-bold text-[15px] leading-tight">
                      Try 1 Image
                    </span>
                    <span className="text-[11px] opacity-90 font-medium">
                      Enhance latest post
                    </span>
                  </div>
                  <div className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-200">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </button>

                <button
                  className={cn(
                    "flex items-center justify-between w-full p-2 pr-3 rounded-full",
                    "border border-gray-200 bg-white hover:bg-gray-50",
                    "transition-colors group",
                    (isProcessing || !isPremium) && "opacity-75",
                  )}
                  onClick={isPremium ? onOptimizeFull : onUpgrade}
                  disabled={isProcessing}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-full shrink-0 size-10",
                        isPremium
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-500 group-hover:text-primary-500",
                      )}
                    >
                      <Grid className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start">
                      <p className="text-slate-900 text-[14px] font-bold leading-none">
                        Optimize Feed
                      </p>
                      <p className="text-slate-500 text-[11px] font-normal leading-normal mt-0.5">
                        {isPremium
                          ? "Transform all images"
                          : "Requires Premium"}
                      </p>
                    </div>
                  </div>
                  {!isPremium && (
                    <Lock className="w-[18px] h-[18px] text-gray-400" />
                  )}
                </button>
              </motion.div>

              <div className="h-px w-full bg-gray-100" />

              {!isPremium && (
                <motion.div
                  className="relative overflow-hidden rounded-2xl p-0 group shadow-md border border-gray-100"
                  style={{ background: "#191022" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay group-hover:scale-105 transition-transform duration-700"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/90 to-purple-900/90" />

                  <div className="relative z-10 p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="size-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                        <Diamond className="w-[18px] h-[18px]" />
                      </div>
                      <span className="text-[10px] font-bold bg-white text-primary-500 px-2 py-1 rounded-full uppercase tracking-wider">
                        Upgrade
                      </span>
                    </div>
                    <div>
                      <p className="text-white text-lg font-bold leading-tight">
                        Unlimited Access
                      </p>
                      <p className="text-white/80 text-xs font-medium mt-1">
                        Unlock full feed optimization for $1.00
                      </p>
                    </div>
                    <button
                      className="mt-1 flex w-full cursor-pointer items-center justify-center rounded-full h-9 bg-white text-primary-500 text-xs font-bold uppercase tracking-wide hover:bg-gray-50 transition-colors gap-2"
                      onClick={onUpgrade}
                    >
                      <CreditCard className="w-4 h-4" />
                      Upgrade Now
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {creatorInsights && (
              <CreatorInsights
                bestPostingTime={creatorInsights.bestPostingTime}
                suggestedCaption={creatorInsights.suggestedCaption}
                hashtags={creatorInsights.hashtags}
                engagementTip={creatorInsights.engagementTip}
                isReady={!isProcessing}
              />
            )}

            {isProcessing && (
              <motion.div
                className="bg-gray-50 border-t border-gray-100 px-5 py-3 flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="relative size-4 shrink-0">
                  <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-t-primary-500 border-r-transparent border-b-transparent border-l-transparent"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <motion.p
                    className="text-[11px] font-semibold text-primary-500 truncate"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {processingMessage}
                  </motion.p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
