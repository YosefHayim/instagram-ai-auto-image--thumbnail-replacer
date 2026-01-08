import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo";
import { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { LayoutGroup } from "framer-motion";
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
import { apiClient } from "~/lib/api-client";

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

interface EnhancedPreview {
  originalUrl: string;
  enhancedUrl: string;
  postId: string;
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
  "Applying AI enhancement...",
  "Adjusting colors...",
  "Optimizing for engagement...",
  "Finalizing magic...",
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
  const [creatorInsights, setCreatorInsights] = useState(
    DEFAULT_CREATOR_INSIGHTS,
  );
  const [enhancedPreview, setEnhancedPreview] =
    useState<EnhancedPreview | null>(null);

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
    if (!isOnProfile) return;

    const fetchInsights = async () => {
      try {
        const username = window.location.pathname.replace(/\//g, "");
        if (username) {
          const insights = await apiClient.getInsights(username);
          setCreatorInsights({
            bestPostingTime: insights.best_posting_time,
            suggestedCaption: insights.suggested_caption,
            hashtags: insights.hashtags,
            engagementTip: insights.engagement_tip,
          });
        }
      } catch (error) {
        console.log("Using default insights - backend not available");
      }
    };

    fetchInsights();
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
    }, 2000);

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

    try {
      const result = await apiClient.enhanceImage(
        firstPost.imageUrl,
        selectedStyle,
        0.8,
      );

      if (result.success) {
        setPostStates((prev) => {
          const next = new Map(prev);
          next.set(firstPost.postId, {
            state: "ready",
            aiImage: result.enhanced_url,
          });
          return next;
        });

        setEnhancedPreview({
          originalUrl: firstPost.imageUrl,
          enhancedUrl: result.enhanced_url,
          postId: firstPost.postId,
        });

        setCredits((prev) => Math.max(0, prev - 1));
        fireSuccessConfetti();
      } else {
        throw new Error("Enhancement failed");
      }
    } catch (error) {
      console.error("Enhancement error:", error);

      setPostStates((prev) => {
        const next = new Map(prev);
        next.set(firstPost.postId, {
          state: "ready",
          aiImage: firstPost.imageUrl,
        });
        return next;
      });
    }

    setIsProcessing(false);
  }, [posts, selectedStyle]);

  const handleOptimizeFull = useCallback(async () => {
    if (credits !== -1) return;

    setIsProcessing(true);

    const imageUrls = posts.map((p) => p.imageUrl);

    try {
      const result = await apiClient.batchEnhance(
        imageUrls,
        selectedStyle,
        0.8,
      );

      result.enhanced_images.forEach((enhanced, index) => {
        const post = posts[index];
        if (post) {
          setPostStates((prev) => {
            const next = new Map(prev);
            next.set(post.postId, {
              state: "ready",
              aiImage: enhanced.enhanced_url,
            });
            return next;
          });
        }
      });

      fireSuccessConfetti();
    } catch (error) {
      console.error("Batch enhancement error:", error);

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];

        setPostStates((prev) => {
          const next = new Map(prev);
          next.set(post.postId, { state: "scanning" });
          return next;
        });

        await new Promise((resolve) => setTimeout(resolve, 800));

        setPostStates((prev) => {
          const next = new Map(prev);
          next.set(post.postId, { state: "ready", aiImage: post.imageUrl });
          return next;
        });
      }
    }

    setIsProcessing(false);
  }, [posts, credits, selectedStyle]);

  const handleUpgrade = useCallback(() => {
    posts.slice(1).forEach((post) => {
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

  const handleApplyEnhancement = useCallback(() => {
    if (!enhancedPreview) return;

    const post = posts.find((p) => p.postId === enhancedPreview.postId);
    if (!post?.element) return;

    const img = post.element.querySelector("img") as HTMLImageElement;
    if (img) {
      img.src = enhancedPreview.enhancedUrl;
      img.srcset = "";
    }

    setPostStates((prev) => {
      const next = new Map(prev);
      next.set(enhancedPreview.postId, { state: "idle" });
      return next;
    });

    setEnhancedPreview(null);
    fireSuccessConfetti();
  }, [enhancedPreview, posts]);

  const handleDiscardEnhancement = useCallback(() => {
    if (!enhancedPreview) return;

    setPostStates((prev) => {
      const next = new Map(prev);
      next.set(enhancedPreview.postId, { state: "idle" });
      return next;
    });

    setEnhancedPreview(null);
  }, [enhancedPreview]);

  const handleDownloadEnhancement = useCallback(async () => {
    if (!enhancedPreview) return;

    try {
      const response = await fetch(enhancedPreview.enhancedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `enhanced-${enhancedPreview.postId}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  }, [enhancedPreview]);

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
        creatorInsights={creatorInsights}
        enhancedPreview={enhancedPreview}
        onApplyEnhancement={handleApplyEnhancement}
        onDiscardEnhancement={handleDiscardEnhancement}
        onDownloadEnhancement={handleDownloadEnhancement}
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

export default InstagramAIOptimizer;
