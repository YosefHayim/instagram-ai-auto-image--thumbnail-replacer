import type { PlasmoCSConfig, PlasmoGetStyle, PlasmoCSUIProps } from "plasmo";
import { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import cssText from "data-text:~/style.css";

import { FloatingActionButton } from "~/components/FloatingActionButton";
import { SidePanel } from "~/components/SidePanel";
import { ImageOverlay, type OverlayState } from "~/components/ImageOverlay";
import {
  ConfettiCelebration,
  fireSuccessConfetti,
} from "~/components/ConfettiCelebration";
import { type StylePreset } from "~/components/StylePresetsGrid";
import {
  getInstagramFeedManager,
  type GridPost,
} from "~/lib/instagram-feed-manager";
import { springConfig } from "~/lib/utils";

export const config: PlasmoCSConfig = {
  matches: ["https://www.instagram.com/*", "https://instagram.com/*"],
  all_frames: false,
};

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText;
  return style;
};

interface PostState {
  state: OverlayState;
  aiImage?: string;
}

const DEFAULT_CREATOR_INSIGHTS = {
  bestPostingTime: "Today, 18:30",
  suggestedCaption:
    "Golden hour hits different ✨ Can't wait to share what I've been working on! #creators #design",
  hashtags: ["#aesthetic", "#contentcreator", "#minimal", "#grid", "#design"],
  engagementTip:
    "Posts with lighter backgrounds tend to perform 24% better in this category. Try increasing brightness!",
};

const PROCESSING_MESSAGES = [
  "Analyzing composition...",
  "Adjusting lighting...",
  "Enhancing colors...",
  "Optimizing contrast...",
  "Generating aesthetic...",
];

function InstagramAIOptimizer() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isOnProfile, setIsOnProfile] = useState(false);
  const [credits, setCredits] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(
    PROCESSING_MESSAGES[0],
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>("cinematic");
  const [posts, setPosts] = useState<GridPost[]>([]);
  const [postStates, setPostStates] = useState<Map<string, PostState>>(
    new Map(),
  );
  const [mountedOverlays, setMountedOverlays] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const manager = getInstagramFeedManager();

    const checkProfile = () => {
      setIsOnProfile(manager.isOnProfilePage());
    };

    checkProfile();

    const handleNavigation = () => {
      setTimeout(checkProfile, 500);
    };

    window.addEventListener("popstate", handleNavigation);

    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleNavigation();
    };

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      history.pushState = originalPushState;
    };
  }, []);

  useEffect(() => {
    if (!isOnProfile) return;

    const manager = getInstagramFeedManager();
    manager.start();

    const unsubscribe = manager.subscribe((newPosts) => {
      setPosts((prev) => {
        const existing = new Set(prev.map((p) => p.postId));
        const filtered = newPosts.filter((p) => !existing.has(p.postId));
        return [...prev, ...filtered];
      });
    });

    return () => {
      unsubscribe();
      manager.stop();
    };
  }, [isOnProfile]);

  useEffect(() => {
    posts.forEach((post) => {
      if (mountedOverlays.has(post.postId)) return;

      const container = post.element;
      if (!container) return;

      const existingOverlay = container.querySelector("[data-ai-overlay]");
      if (existingOverlay) return;

      const overlayContainer = document.createElement("div");
      overlayContainer.setAttribute("data-ai-overlay", post.postId);
      overlayContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10;
        pointer-events: auto;
      `;

      const parentStyle = window.getComputedStyle(container);
      if (parentStyle.position === "static") {
        container.style.position = "relative";
      }

      container.appendChild(overlayContainer);

      const state = postStates.get(post.postId) || {
        state: "idle" as OverlayState,
      };
      const root = createRoot(overlayContainer);

      root.render(
        <OverlayWrapper
          post={post}
          state={state}
          onUnlock={() => handleUnlock(post.postId)}
        />,
      );

      setMountedOverlays((prev) => new Set(prev).add(post.postId));
    });
  }, [posts, postStates]);

  useEffect(() => {
    if (!isProcessing) return;

    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % PROCESSING_MESSAGES.length;
      setProcessingMessage(PROCESSING_MESSAGES[messageIndex]);
    }, 1500);

    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleOptimizeSingle = useCallback(async () => {
    if (posts.length === 0) return;

    setIsProcessing(true);
    const firstPost = posts[0];

    setPostStates((prev) => {
      const next = new Map(prev);
      next.set(firstPost.postId, { state: "scanning" });
      return next;
    });

    await simulateAIProcessing();

    const mockAiImage = generateMockAiImage(firstPost.imageUrl);

    setPostStates((prev) => {
      const next = new Map(prev);
      next.set(firstPost.postId, { state: "ready", aiImage: mockAiImage });
      return next;
    });

    setIsProcessing(false);
    setCredits((prev) => Math.max(0, prev - 1));
  }, [posts]);

  const handleOptimizeFull = useCallback(async () => {
    if (credits !== -1) return;

    setIsProcessing(true);

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];

      setPostStates((prev) => {
        const next = new Map(prev);
        next.set(post.postId, { state: "scanning" });
        return next;
      });

      await simulateAIProcessing(800);

      const mockAiImage = generateMockAiImage(post.imageUrl);

      setPostStates((prev) => {
        const next = new Map(prev);
        next.set(post.postId, { state: "ready", aiImage: mockAiImage });
        return next;
      });
    }

    setIsProcessing(false);
    fireSuccessConfetti();
  }, [posts, credits]);

  const handleUpgrade = useCallback(() => {
    posts.slice(1).forEach((post, index) => {
      setPostStates((prev) => {
        const next = new Map(prev);
        const existing = prev.get(post.postId);
        if (!existing || existing.state === "idle") {
          next.set(post.postId, { state: "locked" });
        }
        return next;
      });
    });

    setTimeout(() => {
      setCredits(-1);
      setShowConfetti(true);

      posts.forEach((post, index) => {
        setTimeout(() => {
          setPostStates((prev) => {
            const next = new Map(prev);
            const existing = prev.get(post.postId);
            if (existing?.state === "locked") {
              next.set(post.postId, { state: "idle" });
            }
            return next;
          });
        }, index * 100);
      });

      setTimeout(() => setShowConfetti(false), 3000);
    }, 1500);
  }, [posts]);

  const handleUnlock = useCallback(
    (postId: string) => {
      handleUpgrade();
    },
    [handleUpgrade],
  );

  const handleStyleSelect = useCallback((style: StylePreset) => {
    setSelectedStyle(style);
  }, []);

  if (!isOnProfile) return null;

  return (
    <LayoutGroup>
      <FloatingActionButton
        onClick={() => setIsPanelOpen(true)}
        isOpen={isPanelOpen}
      />

      <SidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        credits={credits}
        isProcessing={isProcessing}
        processingMessage={processingMessage}
        selectedStyle={selectedStyle}
        onStyleSelect={handleStyleSelect}
        onOptimizeSingle={handleOptimizeSingle}
        onOptimizeFull={handleOptimizeFull}
        onUpgrade={handleUpgrade}
        creatorInsights={DEFAULT_CREATOR_INSIGHTS}
      />

      <ConfettiCelebration trigger={showConfetti} />
    </LayoutGroup>
  );
}

interface OverlayWrapperProps {
  post: GridPost;
  state: PostState;
  onUnlock: () => void;
}

function OverlayWrapper({ post, state, onUnlock }: OverlayWrapperProps) {
  if (state.state === "idle") return null;

  return (
    <ImageOverlay
      originalImage={post.imageUrl}
      aiImage={state.aiImage}
      state={state.state}
      onUnlock={onUnlock}
    />
  );
}

async function simulateAIProcessing(duration = 2000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function generateMockAiImage(originalUrl: string): string {
  return originalUrl;
}

export default InstagramAIOptimizer;
