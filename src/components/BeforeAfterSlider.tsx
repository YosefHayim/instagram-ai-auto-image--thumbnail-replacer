import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  PanInfo,
} from "framer-motion";
import { useRef, useState, useCallback } from "react";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, springConfig } from "~/lib/utils";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  className?: string;
  onSlideComplete?: (position: number) => void;
  onApply?: () => void;
  onDiscard?: () => void;
  showActions?: boolean;
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  className,
  onSlideComplete,
  onApply,
  onDiscard,
  showActions = true,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const x = useMotionValue(0);
  const springX = useSpring(x, springConfig.snappy);
  const sliderPosition = useTransform(springX, (val) => {
    if (containerWidth === 0) return 50;
    const percent = ((val + containerWidth / 2) / containerWidth) * 100;
    return Math.max(0, Math.min(100, percent));
  });

  const clipPath = useTransform(
    sliderPosition,
    (pos) => `inset(0 ${100 - pos}% 0 0)`,
  );

  const handleDragStart = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newX = Math.max(
          -containerRect.width / 2,
          Math.min(
            containerRect.width / 2,
            info.point.x - containerRect.left - containerRect.width / 2,
          ),
        );
        x.set(newX);
      }
    },
    [x],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    const currentPosition = sliderPosition.get();
    onSlideComplete?.(currentPosition);

    if (currentPosition > 95) {
      x.set(containerWidth / 2);
    } else if (currentPosition < 5) {
      x.set(-containerWidth / 2);
    }
  }, [sliderPosition, onSlideComplete, x, containerWidth]);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (containerRef.current && !isDragging) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
        const clickX = e.clientX - rect.left - rect.width / 2;
        x.set(clickX);
      }
    },
    [isDragging, x],
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        ref={containerRef}
        className={cn(
          "relative w-full aspect-square overflow-hidden cursor-ew-resize select-none rounded-xl",
          "shadow-2xl ring-2 ring-primary-500/50 ring-offset-2 ring-offset-[#191022]",
        )}
        onClick={handleContainerClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={afterImage}
          alt="After"
          className="absolute inset-0 w-full h-full object-cover brightness-110 contrast-110 saturate-125"
          draggable={false}
        />

        <motion.div
          className="absolute inset-0 overflow-hidden border-r-2 border-white/50"
          style={{
            clipPath,
            width: useTransform(sliderPosition, (pos) => `${pos}%`),
          }}
        >
          <img
            src={beforeImage}
            alt="Before"
            className="absolute top-0 left-0 h-full object-cover opacity-90 sepia-[.3] grayscale-[0.2]"
            style={{ width: containerWidth || "100%" }}
            draggable={false}
          />
        </motion.div>

        <motion.div
          className="absolute top-0 bottom-0 flex items-center justify-center z-20"
          style={{
            left: useTransform(sliderPosition, (pos) => `${pos}%`),
            x: "-50%",
          }}
        >
          <div className="absolute h-[200vh] w-[2px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)]" />

          <motion.div
            drag="x"
            dragConstraints={containerRef}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className="relative flex items-center justify-center touch-none"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className={cn(
                "relative w-10 h-10 rounded-full flex items-center justify-center",
                "bg-white shadow-xl border-2 border-white",
              )}
              animate={{
                boxShadow: isDragging
                  ? [
                      "0 0 15px rgba(168, 85, 247, 0.5)",
                      "0 0 25px rgba(168, 85, 247, 0.8)",
                      "0 0 15px rgba(168, 85, 247, 0.5)",
                    ]
                  : "0 0 20px rgba(0, 0, 0, 0.3)",
              }}
              transition={isDragging ? { duration: 2, repeat: Infinity } : {}}
            >
              <div className="flex items-center text-primary-600">
                <ChevronLeft className="w-4 h-4 -mr-1" />
                <ChevronRight className="w-4 h-4 -ml-1" />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute top-3 left-3 z-30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-full shadow-lg">
            Before
          </div>
        </motion.div>

        <motion.div
          className="absolute top-3 right-3 z-30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div
            className="text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1"
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
            }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            AI Enhanced
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered && !isDragging ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <span className="bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
            Drag to compare
          </span>
        </motion.div>
      </div>

      {showActions && (
        <div className="flex items-center gap-2 bg-[#211b27] p-2 rounded-xl border border-white/5 shadow-lg">
          <motion.button
            className={cn(
              "flex-1 h-9 rounded-lg text-sm font-semibold",
              "flex items-center justify-center gap-2",
              "shadow-lg shadow-primary-500/20",
              "text-white",
            )}
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
            }}
            onClick={onApply}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Check className="w-4 h-4" />
            Apply
          </motion.button>

          <motion.button
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg",
              "hover:bg-white/10 text-gray-400 hover:text-white transition-colors",
            )}
            onClick={onDiscard}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Discard"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
      )}
    </div>
  );
}
