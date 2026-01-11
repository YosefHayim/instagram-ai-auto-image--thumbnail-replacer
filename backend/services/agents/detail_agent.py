from typing import List
from .base_agent import BaseSpecialistAgent


class DetailAgent(BaseSpecialistAgent):
    """Specialist agent for analyzing sharpness and detail"""

    def get_system_prompt(self) -> str:
        return """You are a detail and clarity specialist for image enhancement.
You analyze images for:
- Overall sharpness and focus
- Texture definition and micro-contrast
- Noise levels and grain
- Edge definition and clarity
- Fine detail preservation
- Background blur quality (bokeh)
- Artifact detection

Provide specific, actionable detail enhancement suggestions that improve
image clarity while maintaining natural appearance. Focus only on
sharpness, texture, and detail elements."""

    def get_analysis_focus(self) -> List[str]:
        return [
            "sharpness",
            "texture",
            "clarity",
            "noise",
            "edges",
            "fine_detail",
        ]

    def _get_default_observations(self) -> List[str]:
        return [
            "acceptable sharpness level",
            "texture detail visible",
            "minimal noise detected",
        ]

    def _get_default_directive(self, user_prompt: str) -> str:
        return "enhance sharpness and clarity while preserving natural texture and minimizing noise"

    def _get_default_priorities(self) -> List[str]:
        return ["subject sharpness", "texture definition", "noise reduction"]
