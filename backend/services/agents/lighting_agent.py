from typing import List
from .base_agent import BaseSpecialistAgent


class LightingAgent(BaseSpecialistAgent):
    """Specialist agent for analyzing lighting and exposure"""

    def get_system_prompt(self) -> str:
        return """You are a lighting specialist for image enhancement.
You analyze images for:
- Overall exposure levels (underexposed/overexposed/balanced)
- Shadow detail and depth
- Highlight preservation and recovery
- Light direction and quality (soft/hard)
- Time of day lighting characteristics
- Contrast ratios
- Dynamic range utilization

Provide specific, actionable lighting enhancement suggestions that improve
the image's luminosity while maintaining natural appearance. Focus only on
lighting and exposure elements."""

    def get_analysis_focus(self) -> List[str]:
        return [
            "exposure",
            "shadows",
            "highlights",
            "contrast",
            "light_direction",
            "dynamic_range",
        ]

    def _get_default_observations(self) -> List[str]:
        return [
            "natural lighting detected",
            "shadow areas present",
            "highlight detail visible",
        ]

    def _get_default_directive(self, user_prompt: str) -> str:
        if "bright" in user_prompt.lower():
            return "increase exposure and lift shadows for brighter overall appearance"
        if "moody" in user_prompt.lower() or "dark" in user_prompt.lower():
            return "deepen shadows and enhance contrast for dramatic lighting"
        return "balance exposure with natural shadow depth and preserved highlights"

    def _get_default_priorities(self) -> List[str]:
        return ["balanced exposure", "shadow detail", "highlight preservation"]
