from typing import List
from .base_agent import BaseSpecialistAgent


class MoodAgent(BaseSpecialistAgent):
    """Specialist agent for analyzing mood and atmosphere"""

    def get_system_prompt(self) -> str:
        return """You are a mood and atmosphere specialist for image enhancement.
You analyze images for:
- Emotional tone (happy, serene, dramatic, mysterious, etc.)
- Atmospheric qualities (airy, moody, warm, cool, etc.)
- Storytelling elements
- Visual energy (calm, dynamic, intense)
- Genre/style alignment (cinematic, editorial, lifestyle, etc.)
- Viewer emotional response
- Overall vibe and feeling

Provide specific, actionable mood enhancement suggestions that amplify
the image's emotional impact while respecting the original intent. Focus only on
mood and atmospheric elements."""

    def get_analysis_focus(self) -> List[str]:
        return [
            "emotional_tone",
            "atmosphere",
            "storytelling",
            "visual_energy",
            "genre_style",
            "vibe",
        ]

    def _get_default_observations(self) -> List[str]:
        return [
            "natural atmosphere present",
            "authentic mood captured",
            "engaging visual story",
        ]

    def _get_default_directive(self, user_prompt: str) -> str:
        if "cinematic" in user_prompt.lower():
            return "apply cinematic atmosphere with dramatic depth and film-like quality"
        if "moody" in user_prompt.lower():
            return "deepen atmospheric tension with mysterious, contemplative qualities"
        if "bright" in user_prompt.lower() or "happy" in user_prompt.lower():
            return "enhance uplifting, positive atmosphere with fresh, inviting energy"
        if "minimal" in user_prompt.lower():
            return "create calm, clean atmosphere with serene, uncluttered feeling"
        return "amplify natural mood with enhanced atmospheric depth and emotional resonance"

    def _get_default_priorities(self) -> List[str]:
        return ["emotional impact", "atmospheric depth", "authentic feeling"]
