from typing import List
from .base_agent import BaseSpecialistAgent


class CompositionAgent(BaseSpecialistAgent):
    """Specialist agent for analyzing image composition and framing"""

    def get_system_prompt(self) -> str:
        return """You are a composition specialist for image enhancement.
You analyze images for:
- Rule of thirds alignment and balance
- Focal point clarity and placement
- Visual weight distribution
- Leading lines and visual flow
- Framing and cropping opportunities
- Negative space usage
- Subject positioning

Provide specific, actionable enhancement suggestions that preserve the original
composition while improving visual impact. Focus only on compositional elements."""

    def get_analysis_focus(self) -> List[str]:
        return [
            "framing",
            "rule_of_thirds",
            "focal_points",
            "balance",
            "cropping",
            "leading_lines",
        ]

    def _get_default_observations(self) -> List[str]:
        return [
            "subject positioned in frame",
            "background elements present",
            "visual balance detected",
        ]

    def _get_default_directive(self, user_prompt: str) -> str:
        return "enhance focal point clarity and visual balance while maintaining subject positioning"

    def _get_default_priorities(self) -> List[str]:
        return ["focal point emphasis", "balanced framing", "clean background"]
