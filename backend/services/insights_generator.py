from typing import List, Optional
from datetime import datetime, timedelta
import random


class InsightsGenerator:
    def __init__(self):
        self.caption_templates = [
            "Golden hour hits different ✨ {context}",
            "Creating moments worth remembering 📸 {context}",
            "Less is more, but more is fun 🎨 {context}",
            "The details make the difference ⚡ {context}",
            "Chasing light and good vibes ☀️ {context}",
            "Story behind every frame 🖼️ {context}",
            "Making magic with pixels ✨ {context}",
            "Elevating the everyday 🌟 {context}",
        ]

        self.hashtag_categories = {
            "aesthetic": [
                "#aesthetic",
                "#visualsoflife",
                "#artofvisuals",
                "#creativecontent",
            ],
            "photography": [
                "#photography",
                "#photooftheday",
                "#instagood",
                "#picoftheday",
            ],
            "content": [
                "#contentcreator",
                "#creatorlife",
                "#digitalcreator",
                "#influence",
            ],
            "design": ["#design", "#minimal", "#creative", "#art"],
            "lifestyle": ["#lifestyle", "#dailylife", "#moments", "#life"],
            "mood": ["#vibes", "#mood", "#feels", "#goodvibes"],
        }

        self.engagement_tips = [
            "Posts with lighter backgrounds tend to perform 24% better in this category. Try increasing brightness!",
            "Consistent color grading across your feed increases follower retention by 32%.",
            "Images with natural lighting get 40% more engagement than artificial lighting.",
            "Posts published during peak hours (6-9 PM) receive 2.3x more initial engagement.",
            "Using 3-5 relevant hashtags performs better than using 30 generic ones.",
            "Carousels get 1.4x more reach than single images. Consider a before/after comparison!",
            "Faces in photos increase engagement by 38%. Show yourself!",
            "Blue-toned images get 24% more likes than warm-toned ones on average.",
        ]

    def calculate_best_posting_time(self) -> str:
        now = datetime.now()

        peak_hours = [9, 12, 18, 21]

        for hour in peak_hours:
            candidate = now.replace(hour=hour, minute=30, second=0, microsecond=0)
            if candidate > now:
                if candidate.date() == now.date():
                    return f"Today, {candidate.strftime('%H:%M')}"
                else:
                    return f"Tomorrow, {candidate.strftime('%H:%M')}"

        tomorrow = now + timedelta(days=1)
        return f"Tomorrow, {tomorrow.replace(hour=9, minute=30).strftime('%H:%M')}"

    def generate_caption(self, context: Optional[str] = None) -> str:
        template = random.choice(self.caption_templates)
        context_text = (
            context if context else "Can't wait to share what I've been working on!"
        )
        return template.format(context=context_text)

    def generate_hashtags(self, count: int = 5) -> List[str]:
        all_hashtags = []
        categories = list(self.hashtag_categories.keys())
        random.shuffle(categories)

        for category in categories[:3]:
            all_hashtags.extend(
                random.sample(
                    self.hashtag_categories[category],
                    min(2, len(self.hashtag_categories[category])),
                )
            )

        random.shuffle(all_hashtags)
        return all_hashtags[:count]

    def get_engagement_tip(self) -> str:
        return random.choice(self.engagement_tips)

    def generate_insights(
        self, profile_username: Optional[str] = None, context: Optional[str] = None
    ) -> dict:
        return {
            "best_posting_time": self.calculate_best_posting_time(),
            "suggested_caption": self.generate_caption(context),
            "hashtags": self.generate_hashtags(5),
            "engagement_tip": self.get_engagement_tip(),
            "confidence_score": round(random.uniform(0.75, 0.95), 2),
        }
