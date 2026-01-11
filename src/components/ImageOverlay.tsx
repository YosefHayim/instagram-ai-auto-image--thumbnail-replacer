import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { BeforeAfterSlider } from "./BeforeAfterSlider"
import { ScanningOverlay } from "./ScanningOverlay"
import { LockedOverlay } from "./LockedOverlay"
import { ImageGenerateButton } from "./ImageGenerateButton"
import { cn, springConfig } from "@/lib/utils"

export type OverlayState = "idle" | "button" | "scanning" | "ready" | "locked"

interface ImageOverlayProps {
  originalImage: string
  aiImage?: string
  state: OverlayState
  postId?: string
  index?: number
  onUnlock?: () => void
  onGenerateClick?: (postId: string, imageUrl: string) => void
  isProcessing?: boolean
  className?: string
}

export function ImageOverlay({
  originalImage,
  aiImage,
  state,
  postId = "",
  index = 0,
  onUnlock,
  onGenerateClick,
  isProcessing = false,
  className
}: ImageOverlayProps) {
  const [hasInteracted, setHasInteracted] = useState(false)

  const handleSlideComplete = (position: number) => {
    if (position > 90 && !hasInteracted) {
      setHasInteracted(true)
    }
  }

  // For button state, only render the button without full overlay
  if (state === "button") {
    return (
      <ImageGenerateButton
        postId={postId}
        imageUrl={originalImage}
        onClick={onGenerateClick || (() => {})}
        isProcessing={isProcessing}
      />
    )
  }

  // For idle state, render nothing
  if (state === "idle") {
    return null
  }

  return (
    <motion.div
      className={cn(
        "absolute inset-0 z-10",
        "overflow-hidden",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <AnimatePresence mode="wait">
        {state === "scanning" && (
          <ScanningOverlay key="scanning" isScanning={true} />
        )}

        {state === "ready" && aiImage && (
          <motion.div
            key="ready"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={springConfig.smooth}
          >
            <BeforeAfterSlider
              beforeImage={originalImage}
              afterImage={aiImage}
              onSlideComplete={handleSlideComplete}
              showActions={false}
            />
          </motion.div>
        )}

        {state === "locked" && (
          <LockedOverlay
            key="locked"
            isLocked={true}
            onUnlock={onUnlock}
            index={index}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
