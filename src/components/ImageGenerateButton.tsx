import { motion } from "framer-motion";
import { Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageGenerateButtonProps {
  postId: string;
  imageUrl: string;
  onClick: (postId: string, imageUrl: string) => void;
  isProcessing?: boolean;
}

export function ImageGenerateButton({
  postId,
  imageUrl,
  onClick,
  isProcessing = false,
}: ImageGenerateButtonProps) {
  return (
    <motion.button
      className={cn(
        "absolute top-2 right-2 z-20",
        "flex items-center gap-1.5 px-2.5 py-1.5",
        "bg-black/60 backdrop-blur-md rounded-full",
        "text-white text-xs font-semibold",
        "hover:bg-primary-500 transition-all duration-200",
        "shadow-lg border border-white/10",
        "cursor-pointer",
        "pointer-events-auto", // Enable clicks even when parent has pointer-events: none
        isProcessing && "opacity-50 pointer-events-none"
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(postId, imageUrl);
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <motion.div
          className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      ) : (
        <Wand2 className="w-3.5 h-3.5" />
      )}
      <span>{isProcessing ? "..." : "Generate"}</span>
    </motion.button>
  );
}
