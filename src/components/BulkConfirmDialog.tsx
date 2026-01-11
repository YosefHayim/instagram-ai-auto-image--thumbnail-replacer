import { motion, AnimatePresence } from "framer-motion";
import { Wand2, X } from "lucide-react";
import { cn, springConfig } from "@/lib/utils";

interface RemainingImage {
  postId: string;
  imageUrl: string;
}

interface BulkConfirmDialogProps {
  isOpen: boolean;
  remainingImages: RemainingImage[];
  lastPrompt: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BulkConfirmDialog({
  isOpen,
  remainingImages,
  lastPrompt,
  onConfirm,
  onCancel,
}: BulkConfirmDialogProps) {
  const displayCount = Math.min(remainingImages.length, 8);
  const moreCount = remainingImages.length - displayCount;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-[10001] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={cn(
                "bg-white rounded-2xl shadow-2xl",
                "w-full max-w-sm overflow-hidden"
              )}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={springConfig.bouncy}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-primary-500 to-fuchsia-500 px-5 py-4 text-white">
                <button
                  onClick={onCancel}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Apply to More?</h3>
                    <p className="text-xs text-white/80">
                      {remainingImages.length} images remaining
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <p className="text-sm text-gray-600 mb-4">
                  Would you like to apply{" "}
                  <span className="font-medium text-gray-800">"{lastPrompt}"</span>{" "}
                  to your other images?
                </p>

                {/* Image preview grid */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {remainingImages.slice(0, displayCount).map((img, index) => (
                    <motion.div
                      key={img.postId}
                      className="relative aspect-square rounded-lg overflow-hidden"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <img
                        src={img.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20" />
                    </motion.div>
                  ))}
                </div>

                {moreCount > 0 && (
                  <p className="text-xs text-gray-400 text-center mb-4">
                    +{moreCount} more images
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <motion.button
                    onClick={onConfirm}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-semibold text-sm",
                      "bg-gradient-to-r from-primary-500 to-fuchsia-500 text-white",
                      "shadow-lg shadow-primary-500/25",
                      "flex items-center justify-center gap-2"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Wand2 className="w-4 h-4" />
                    Enhance All
                  </motion.button>
                  <motion.button
                    onClick={onCancel}
                    className="px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors text-sm font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Not now
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
