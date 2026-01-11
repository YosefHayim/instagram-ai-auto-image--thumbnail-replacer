import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Loader2 } from "lucide-react";
import { cn, springConfig } from "@/lib/utils";

export interface BulkResult {
  postId: string;
  imageUrl: string;
  status: "pending" | "processing" | "success" | "failed";
  enhancedUrl?: string;
}

interface BulkProgressBarProps {
  isActive: boolean;
  results: BulkResult[];
  onAcceptAll: () => void;
  onRejectImage: (postId: string) => void;
  onClose: () => void;
}

export function BulkProgressBar({
  isActive,
  results,
  onAcceptAll,
  onRejectImage,
  onClose,
}: BulkProgressBarProps) {
  const completedCount = results.filter(
    (r) => r.status === "success" || r.status === "failed"
  ).length;
  const successCount = results.filter((r) => r.status === "success").length;
  const totalCount = results.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isComplete = completedCount === totalCount;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed bottom-4 left-4 right-4 z-[9999] max-w-md mx-auto"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={springConfig.bouncy}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!isComplete ? (
                  <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                <span className="text-sm font-semibold text-gray-800">
                  {isComplete ? "Bulk Enhancement Complete" : "Enhancing Images..."}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {completedCount} / {totalCount}
              </span>
            </div>

            {/* Progress bar */}
            <div className="px-4 pt-3">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-fuchsia-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Result thumbnails */}
            <div className="px-4 py-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {results.map((result) => (
                  <motion.div
                    key={result.postId}
                    className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <img
                      src={result.enhancedUrl || result.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />

                    {/* Status overlay */}
                    {result.status === "processing" && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}

                    {result.status === "success" && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}

                    {result.status === "failed" && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                          <X className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Reject button (only for success) */}
                    {result.status === "success" && (
                      <button
                        onClick={() => onRejectImage(result.postId)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 hover:bg-red-500 flex items-center justify-center transition-colors"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {isComplete && (
              <motion.div
                className="px-4 pb-4 flex gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.button
                  onClick={onAcceptAll}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl font-semibold text-sm",
                    "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
                    "shadow-lg shadow-green-500/25",
                    "flex items-center justify-center gap-2"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Check className="w-4 h-4" />
                  Accept All ({successCount})
                </motion.button>
                <motion.button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors text-sm font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Done
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
