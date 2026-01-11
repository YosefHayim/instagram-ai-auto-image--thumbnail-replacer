import React from "react";
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
  console.log("🔘 [GenerateButton] Rendering button for post:", postId);

  // Use native DOM event listener to ensure we capture the click
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Aggressive event handler that prevents all propagation
  const stopAllEvents = React.useCallback((e: Event | React.SyntheticEvent) => {
    console.log("🔘 [GenerateButton] Stopping event:", e.type);
    e.preventDefault();
    e.stopPropagation();
    if ('stopImmediatePropagation' in e) {
      e.stopImmediatePropagation();
    }
    if ('nativeEvent' in e && e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
    return false;
  }, []);

  const handleClick = React.useCallback((e: React.MouseEvent) => {
    console.log("🔘 [GenerateButton] React CLICKED! postId:", postId);
    stopAllEvents(e);
    onClick(postId, imageUrl);
    console.log("🔘 [GenerateButton] onClick callback executed");
  }, [postId, imageUrl, onClick, stopAllEvents]);

  React.useEffect(() => {
    const button = buttonRef.current;
    if (!button) {
      console.log("🔘 [GenerateButton] Button ref is null!");
      return;
    }

    console.log("🔘 [GenerateButton] Setting up native event listeners for post:", postId);

    const handleNativeClick = (e: MouseEvent) => {
      console.log("🔘 [GenerateButton] Native click captured!");
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onClick(postId, imageUrl);
      return false;
    };

    const handlePointerDown = (e: PointerEvent) => {
      console.log("🔘 [GenerateButton] Pointer down captured!");
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      console.log("🔘 [GenerateButton] Mouse down captured!");
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    // Add listeners in capture phase to intercept before Instagram's handlers
    button.addEventListener('click', handleNativeClick, true);
    button.addEventListener('pointerdown', handlePointerDown, true);
    button.addEventListener('mousedown', handleMouseDown, true);

    // Also add in bubble phase as backup
    button.addEventListener('click', handleNativeClick, false);

    return () => {
      button.removeEventListener('click', handleNativeClick, true);
      button.removeEventListener('pointerdown', handlePointerDown, true);
      button.removeEventListener('mousedown', handleMouseDown, true);
      button.removeEventListener('click', handleNativeClick, false);
    };
  }, [postId, imageUrl, onClick]);

  // Use regular button instead of motion.button for more reliable ref handling
  return (
    <button
      ref={buttonRef}
      className={cn(
        "absolute top-2 right-2 z-[999999]", // Maximum z-index
        "flex items-center gap-1.5 px-3 py-2",
        "bg-purple-600 backdrop-blur-md rounded-full",
        "text-white text-sm font-bold",
        "hover:bg-purple-500 transition-all duration-200",
        "shadow-xl border-2 border-white",
        "cursor-pointer",
        "pointer-events-auto",
        isProcessing && "opacity-50 pointer-events-none"
      )}
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        zIndex: 999999,
        pointerEvents: 'auto',
        isolation: 'isolate', // Create new stacking context
      }}
      onClick={handleClick}
      onMouseDown={(e) => stopAllEvents(e)}
      onPointerDown={(e) => stopAllEvents(e)}
      onTouchStart={(e) => stopAllEvents(e)}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <div
          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
        />
      ) : (
        <Wand2 className="w-4 h-4" />
      )}
      <span>{isProcessing ? "..." : "Generate"}</span>
    </button>
  );
}
