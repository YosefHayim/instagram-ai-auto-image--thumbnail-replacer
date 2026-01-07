import { motion } from "framer-motion";
import { useState } from "react";
import { Sparkles, Clock, Copy, Check, Lightbulb } from "lucide-react";
import { cn, springConfig } from "~/lib/utils";

interface CreatorInsightsProps {
  bestPostingTime: string;
  suggestedCaption: string;
  hashtags: string[];
  engagementTip: string;
  isReady?: boolean;
}

export function CreatorInsights({
  bestPostingTime,
  suggestedCaption,
  hashtags,
  engagementTip,
  isReady = true,
}: CreatorInsightsProps) {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState<Set<string>>(new Set());

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(suggestedCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleCopyHashtag = async (hashtag: string) => {
    await navigator.clipboard.writeText(hashtag);
    setCopiedHashtags((prev) => new Set(prev).add(hashtag));
    setTimeout(() => {
      setCopiedHashtags((prev) => {
        const next = new Set(prev);
        next.delete(hashtag);
        return next;
      });
    }, 2000);
  };

  return (
    <div className="bg-gray-50/80 border-t border-gray-100 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-500" />
          <h3 className="text-sm font-bold text-slate-900">Creator Insights</h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset",
            isReady
              ? "bg-green-50 text-green-700 ring-green-600/20"
              : "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
          )}
        >
          {isReady ? "READY" : "LOADING"}
        </span>
      </div>

      <motion.div
        className="bg-white rounded-lg border border-gray-100 p-3 flex items-center justify-between shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary-500/10 text-primary-500">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-600">
            Best Posting Time
          </span>
        </div>
        <span className="text-xs font-bold text-slate-900">
          {bestPostingTime}
        </span>
      </motion.div>

      <motion.div
        className="space-y-1.5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Suggested Caption
          </span>
          <button
            onClick={handleCopyCaption}
            className="text-[10px] text-primary-500 hover:text-primary-400 font-medium flex items-center gap-1"
          >
            {copiedCaption ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm group cursor-pointer hover:border-primary-300/30 transition-colors">
          <p className="text-xs text-gray-600 leading-relaxed">
            {suggestedCaption}
          </p>
        </div>
      </motion.div>

      <motion.div
        className="space-y-1.5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Recommended Hashtags
        </span>
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((hashtag) => (
            <motion.span
              key={hashtag}
              className={cn(
                "inline-flex items-center rounded-md bg-white px-2 py-1",
                "text-[10px] font-medium text-gray-600",
                "ring-1 ring-inset ring-gray-500/10",
                "hover:ring-primary-500/30 hover:text-primary-500",
                "cursor-pointer transition-all",
              )}
              onClick={() => handleCopyHashtag(hashtag)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {copiedHashtags.has(hashtag) ? (
                <Check className="w-2.5 h-2.5 mr-1" />
              ) : null}
              {hashtag}
            </motion.span>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="relative overflow-hidden rounded-lg bg-indigo-50 border border-indigo-100 p-3 flex gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Lightbulb className="w-[18px] h-[18px] text-indigo-500 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-indigo-900">
            Pro Engagement Tip
          </span>
          <p className="text-[11px] text-indigo-700/80 leading-normal">
            {engagementTip}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
