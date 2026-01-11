import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import type { BulkResult } from "@/components/BulkProgressBar";

interface GridPost {
  postId: string;
  imageUrl: string;
}

interface UseBulkEnhanceOptions {
  prompt: string;
  images: GridPost[];
  onProgress?: (completed: number, total: number) => void;
  onComplete?: (results: BulkResult[]) => void;
}

interface UseBulkEnhanceReturn {
  isActive: boolean;
  results: BulkResult[];
  currentIndex: number;
  startBulk: (options: UseBulkEnhanceOptions) => Promise<void>;
  cancelBulk: () => void;
  acceptAll: () => void;
  rejectImage: (postId: string) => void;
}

export function useBulkEnhance(): UseBulkEnhanceReturn {
  const [isActive, setIsActive] = useState(false);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);

  const startBulk = useCallback(
    async ({ prompt, images, onProgress, onComplete }: UseBulkEnhanceOptions) => {
      setIsActive(true);
      setIsCancelled(false);
      setCurrentIndex(0);

      // Initialize results
      const initialResults: BulkResult[] = images.map((img) => ({
        postId: img.postId,
        imageUrl: img.imageUrl,
        status: "pending",
      }));
      setResults(initialResults);

      const updatedResults = [...initialResults];

      for (let i = 0; i < images.length; i++) {
        if (isCancelled) break;

        setCurrentIndex(i);

        // Mark current as processing
        updatedResults[i] = { ...updatedResults[i], status: "processing" };
        setResults([...updatedResults]);

        try {
          const result = await apiClient.enhanceWithPrompt(
            images[i].imageUrl,
            prompt
          );

          updatedResults[i] = {
            ...updatedResults[i],
            status: "success",
            enhancedUrl: result.enhanced_url,
          };
        } catch (error) {
          console.error(`Bulk enhancement failed for ${images[i].postId}:`, error);
          updatedResults[i] = {
            ...updatedResults[i],
            status: "failed",
          };
        }

        setResults([...updatedResults]);
        onProgress?.(i + 1, images.length);
      }

      onComplete?.(updatedResults);
    },
    [isCancelled]
  );

  const cancelBulk = useCallback(() => {
    setIsCancelled(true);
    setIsActive(false);
  }, []);

  const acceptAll = useCallback(() => {
    // Keep only successful results, could trigger DOM updates here
    const successful = results.filter((r) => r.status === "success");
    console.log("Accepting all:", successful);
    setIsActive(false);
    setResults([]);
  }, [results]);

  const rejectImage = useCallback((postId: string) => {
    setResults((prev) =>
      prev.map((r) =>
        r.postId === postId ? { ...r, status: "failed" as const } : r
      )
    );
  }, []);

  return {
    isActive,
    results,
    currentIndex,
    startBulk,
    cancelBulk,
    acceptAll,
    rejectImage,
  };
}
