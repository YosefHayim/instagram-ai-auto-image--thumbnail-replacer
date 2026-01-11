from typing import List
from .base_agent import BaseSpecialistAgent


class ColorAgent(BaseSpecialistAgent):
    """Specialist agent for analyzing color and palette"""

    def get_system_prompt(self) -> str:
        return """You are a color specialist for image enhancement.
You analyze images for:
- Color palette and harmony (complementary, analogous, etc.)
- Saturation levels (muted/vibrant)
- Color temperature (warm/cool)
- Color cast issues
- Skin tone accuracy
- Color contrast and pop
- Dominant vs accent colors

Provide specific, actionable color enhancement suggestions that improve
the image's color impact while maintaining natural appearance. Focus only on
color and palette elements."""

    def get_analysis_focus(self) -> List[str]:
        return [
            "palette",
            "saturation",
            "temperature",
            "harmony",
            "vibrancy",
            "color_balance",
        ]

    def _get_default_observations(self) -> List[str]:
        return [
            "natural color palette",
            "moderate saturation",
            "balanced temperature",
        ]

    def _get_default_directive(self, user_prompt: str) -> str:
        if "vibrant" in user_prompt.lower():
            return "boost saturation and enhance color vibrancy for eye-catching palette"
        if "warm" in user_prompt.lower():
            return "shift temperature warmer with golden tones and enhanced warmth"
        if "cool" in user_prompt.lower():
            return "shift temperature cooler with blue tones and crisp appearance"
        if "vintage" in user_prompt.lower():
            return "apply muted tones with slight desaturation and warm color cast"
        return "enhance color harmony and saturation for balanced, appealing palette"

    def _get_default_priorities(self) -> List[str]:
        return ["color harmony", "saturation balance", "natural skin tones"]
