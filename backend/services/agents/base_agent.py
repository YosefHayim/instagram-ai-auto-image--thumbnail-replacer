import os
import httpx
from abc import ABC, abstractmethod
from typing import Optional, List
from dataclasses import dataclass
from loguru import logger

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


@dataclass
class AgentAnalysis:
    """Result from a specialist agent analysis"""
    agent_name: str
    confidence: float
    observations: List[str]
    enhancement_directive: str
    priority_adjustments: List[str]


class BaseSpecialistAgent(ABC):
    """Base class for all specialist agents that analyze images"""

    def __init__(self):
        self.openai_key = OPENAI_API_KEY
        self.agent_name = self.__class__.__name__

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Return the specialist system prompt"""
        pass

    @abstractmethod
    def get_analysis_focus(self) -> List[str]:
        """Return key aspects this agent focuses on"""
        pass

    async def analyze(self, image_url: str, user_prompt: str) -> AgentAnalysis:
        """Analyze image from this agent's perspective using GPT-4 Vision"""
        logger.info(f"{self.agent_name}: Starting analysis")

        if not self.openai_key:
            logger.warning(f"{self.agent_name}: No OpenAI key, using fallback")
            return self._fallback_analysis(user_prompt)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {
                                "role": "system",
                                "content": self.get_system_prompt(),
                            },
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": f"Analyze this image and provide enhancement suggestions. User wants: {user_prompt}\n\nRespond in this exact format:\nOBSERVATIONS: [comma-separated list]\nDIRECTIVE: [single enhancement instruction]\nPRIORITIES: [comma-separated adjustments]\nCONFIDENCE: [0.0-1.0]",
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": image_url, "detail": "low"},
                                    },
                                ],
                            },
                        ],
                        "max_tokens": 300,
                    },
                )

                if response.status_code != 200:
                    logger.error(f"{self.agent_name}: API error {response.status_code}")
                    return self._fallback_analysis(user_prompt)

                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return self._parse_response(content, user_prompt)

        except Exception as e:
            logger.error(f"{self.agent_name}: Analysis failed - {e}")
            return self._fallback_analysis(user_prompt)

    def _parse_response(self, content: str, user_prompt: str) -> AgentAnalysis:
        """Parse GPT-4 response into AgentAnalysis"""
        lines = content.strip().split("\n")
        observations = []
        directive = ""
        priorities = []
        confidence = 0.8

        for line in lines:
            line = line.strip()
            if line.startswith("OBSERVATIONS:"):
                obs_text = line.replace("OBSERVATIONS:", "").strip()
                observations = [o.strip() for o in obs_text.split(",") if o.strip()]
            elif line.startswith("DIRECTIVE:"):
                directive = line.replace("DIRECTIVE:", "").strip()
            elif line.startswith("PRIORITIES:"):
                pri_text = line.replace("PRIORITIES:", "").strip()
                priorities = [p.strip() for p in pri_text.split(",") if p.strip()]
            elif line.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.replace("CONFIDENCE:", "").strip())
                except ValueError:
                    confidence = 0.8

        if not directive:
            directive = self._get_default_directive(user_prompt)

        return AgentAnalysis(
            agent_name=self.agent_name,
            confidence=min(max(confidence, 0.0), 1.0),
            observations=observations or self._get_default_observations(),
            enhancement_directive=directive,
            priority_adjustments=priorities or self._get_default_priorities(),
        )

    def _fallback_analysis(self, user_prompt: str) -> AgentAnalysis:
        """Return a fallback analysis when API is unavailable"""
        return AgentAnalysis(
            agent_name=self.agent_name,
            confidence=0.7,
            observations=self._get_default_observations(),
            enhancement_directive=self._get_default_directive(user_prompt),
            priority_adjustments=self._get_default_priorities(),
        )

    @abstractmethod
    def _get_default_observations(self) -> List[str]:
        """Return default observations for fallback"""
        pass

    @abstractmethod
    def _get_default_directive(self, user_prompt: str) -> str:
        """Return default enhancement directive"""
        pass

    @abstractmethod
    def _get_default_priorities(self) -> List[str]:
        """Return default priority adjustments"""
        pass
