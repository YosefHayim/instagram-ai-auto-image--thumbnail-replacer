from typing import List
from loguru import logger
from .base_agent import AgentAnalysis


class PromptCombiner:
    """Combines outputs from all specialist agents into a single super-prompt"""

    def combine(
        self,
        user_prompt: str,
        composition: AgentAnalysis,
        lighting: AgentAnalysis,
        color: AgentAnalysis,
        mood: AgentAnalysis,
        detail: AgentAnalysis,
    ) -> str:
        """
        Synthesize all agent outputs into a cohesive super-prompt for image generation.
        Prioritizes based on confidence scores and resolves potential conflicts.
        """
        logger.info("Combining agent analyses into super-prompt")

        # Sort agents by confidence
        agents = [
            ("composition", composition),
            ("lighting", lighting),
            ("color", color),
            ("mood", mood),
            ("detail", detail),
        ]
        agents.sort(key=lambda x: x[1].confidence, reverse=True)

        # Build priority list based on confidence
        priority_directives = []
        secondary_directives = []

        for name, analysis in agents:
            if analysis.confidence >= 0.8:
                priority_directives.append(analysis.enhancement_directive)
            else:
                secondary_directives.append(analysis.enhancement_directive)

        # Combine priorities from all agents
        all_priorities = []
        for _, analysis in agents:
            all_priorities.extend(analysis.priority_adjustments[:2])

        # Build the super-prompt
        super_prompt = self._build_prompt(
            user_intent=user_prompt,
            priority_directives=priority_directives,
            secondary_directives=secondary_directives,
            technical_priorities=all_priorities[:8],
        )

        logger.info(f"Super-prompt generated: {len(super_prompt)} chars")
        return super_prompt

    def _build_prompt(
        self,
        user_intent: str,
        priority_directives: List[str],
        secondary_directives: List[str],
        technical_priorities: List[str],
    ) -> str:
        """Build the final super-prompt string"""

        # Format priority directives
        priority_text = ". ".join(priority_directives) if priority_directives else ""

        # Format secondary directives
        secondary_text = (
            ". ".join(secondary_directives) if secondary_directives else ""
        )

        # Format technical priorities
        tech_text = ", ".join(technical_priorities) if technical_priorities else ""

        # Build the final prompt
        parts = [f"Enhance this image: {user_intent}"]

        if priority_text:
            parts.append(f"Primary enhancements: {priority_text}")

        if secondary_text:
            parts.append(f"Additional refinements: {secondary_text}")

        if tech_text:
            parts.append(f"Technical focus: {tech_text}")

        # Add Instagram optimization
        parts.append(
            "Output: Instagram-optimized, high quality, preserve subject integrity, maintain authenticity"
        )

        return ". ".join(parts)

    def get_summary(
        self,
        composition: AgentAnalysis,
        lighting: AgentAnalysis,
        color: AgentAnalysis,
        mood: AgentAnalysis,
        detail: AgentAnalysis,
    ) -> dict:
        """Get a summary of all agent analyses for display to user"""
        return {
            "composition": {
                "confidence": composition.confidence,
                "key_observations": composition.observations[:3],
                "directive": composition.enhancement_directive,
            },
            "lighting": {
                "confidence": lighting.confidence,
                "key_observations": lighting.observations[:3],
                "directive": lighting.enhancement_directive,
            },
            "color": {
                "confidence": color.confidence,
                "key_observations": color.observations[:3],
                "directive": color.enhancement_directive,
            },
            "mood": {
                "confidence": mood.confidence,
                "key_observations": mood.observations[:3],
                "directive": mood.enhancement_directive,
            },
            "detail": {
                "confidence": detail.confidence,
                "key_observations": detail.observations[:3],
                "directive": detail.enhancement_directive,
            },
        }
