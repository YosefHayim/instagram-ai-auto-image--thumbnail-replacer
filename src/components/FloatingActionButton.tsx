import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { cn, springConfig } from "~/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  isOpen: boolean;
  className?: string;
}

export function FloatingActionButton({
  onClick,
  isOpen,
  className,
}: FloatingActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {!isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[9999] group/fab flex flex-col items-end gap-2",
            className,
          )}
        >
          <motion.div
            className="absolute right-[70px] top-1/2 -translate-y-1/2 pointer-events-none"
            initial={{ opacity: 0, x: 10 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              x: isHovered ? 0 : 10,
            }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap shadow-lg">
              Enhance Grid
            </div>
          </motion.div>

          <div className="relative flex items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #d946ef 100%)",
                opacity: 0.4,
              }}
              animate={{
                scale: [0.95, 1, 0.95],
                boxShadow: [
                  "0 0 0 0 rgba(168, 85, 247, 0.7)",
                  "0 0 0 20px rgba(168, 85, 247, 0)",
                  "0 0 0 0 rgba(168, 85, 247, 0)",
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: [0.215, 0.61, 0.355, 1],
              }}
            />

            <motion.button
              key="fab"
              className={cn(
                "relative z-10 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full text-white",
                "transition-all duration-300 ease-out",
                "focus:outline-none focus:ring-4 focus:ring-purple-300/50",
              )}
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #d946ef 100%)",
                boxShadow:
                  "0 0 20px rgba(168, 85, 247, 0.5), 0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              onClick={onClick}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              initial={{ y: 100, opacity: 0, scale: 0.8 }}
              animate={{
                y: 0,
                opacity: 1,
                scale: isHovered ? 1.05 : 1,
                boxShadow: isHovered
                  ? "0 0 40px rgba(168, 85, 247, 0.7), 0 0 80px rgba(168, 85, 247, 0.4)"
                  : "0 0 20px rgba(168, 85, 247, 0.5), 0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              exit={{
                scale: 0.8,
                opacity: 0,
                transition: { duration: 0.2 },
              }}
              transition={springConfig.bouncy}
              whileTap={{ scale: 0.95 }}
              whileHover={{
                filter: "brightness(1.1)",
              }}
              layoutId="fab-panel"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="w-7 h-7" />
              </motion.div>
            </motion.button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
