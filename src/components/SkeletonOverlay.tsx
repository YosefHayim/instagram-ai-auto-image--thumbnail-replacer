import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonOverlayProps {
  processingStage?: string;
  progress?: number;
  className?: string;
}

const STAGE_LABELS: Record<string, string> = {
  composition: "Analyzing composition...",
  lighting: "Evaluating lighting...",
  color: "Enhancing colors...",
  mood: "Amplifying mood...",
  detail: "Refining details...",
  combining: "Creating recipe...",
  generation: "Generating image...",
};

export function SkeletonOverlay({
  processingStage = "",
  progress = 0,
  className,
}: SkeletonOverlayProps) {
  const stageLabel = STAGE_LABELS[processingStage] || "Processing...";

  return (
    <motion.div
      className={cn(
        "absolute inset-0 z-30 overflow-hidden",
        "bg-gray-900/60 backdrop-blur-sm",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ width: "50%" }}
        />
      </div>

      {/* Pulsing overlay */}
      <motion.div
        className="absolute inset-0 bg-primary-500/10"
        animate={{ opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Progress indicator */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* Progress bar */}
        <div className="h-1 bg-gray-700/50 rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-fuchsia-500"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Stage label */}
        <div className="flex items-center justify-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-primary-500"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.p
            className="text-white text-sm font-medium"
            key={processingStage}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {stageLabel}
          </motion.p>
        </div>
      </div>

      {/* Center spinner */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative w-16 h-16"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-white/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-500" />
        </motion.div>
      </div>
    </motion.div>
  );
}
