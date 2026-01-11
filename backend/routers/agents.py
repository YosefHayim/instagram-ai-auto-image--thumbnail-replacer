import asyncio
import time
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from loguru import logger
import json

from services.agents import (
    CompositionAgent,
    LightingAgent,
    ColorAgent,
    MoodAgent,
    DetailAgent,
    PromptCombiner,
)
from services.ai_enhancer import AIEnhancer

router = APIRouter(prefix="/api/agents", tags=["agents"])

# Initialize agents
composition_agent = CompositionAgent()
lighting_agent = LightingAgent()
color_agent = ColorAgent()
mood_agent = MoodAgent()
detail_agent = DetailAgent()
prompt_combiner = PromptCombiner()
ai_enhancer = AIEnhancer()


class ChatEnhanceRequest(BaseModel):
    image_url: str = Field(..., description="URL of the image to enhance")
    user_prompt: str = Field(..., description="User's enhancement request")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID")


class AgentAnalysisResponse(BaseModel):
    agent_name: str
    confidence: float
    observations: List[str]
    directive: str


class ChatEnhanceResponse(BaseModel):
    success: bool
    original_url: str
    enhanced_url: str
    super_prompt: str
    agent_analyses: List[AgentAnalysisResponse]
    processing_time_ms: int


@router.post("/enhance", response_model=ChatEnhanceResponse)
async def enhance_with_agents(request: ChatEnhanceRequest):
    """
    Enhance an image using the 5-layer parallel agent system.

    1. Runs 5 specialist agents in parallel to analyze the image
    2. Combines their outputs into a super-prompt
    3. Generates the enhanced image using the super-prompt
    """
    logger.info(f"Starting agent enhancement: prompt='{request.user_prompt}'")
    start_time = time.time()

    try:
        # Run all 5 agents in parallel
        logger.info("Running 5 specialist agents in parallel...")
        results = await asyncio.gather(
            composition_agent.analyze(request.image_url, request.user_prompt),
            lighting_agent.analyze(request.image_url, request.user_prompt),
            color_agent.analyze(request.image_url, request.user_prompt),
            mood_agent.analyze(request.image_url, request.user_prompt),
            detail_agent.analyze(request.image_url, request.user_prompt),
        )

        composition, lighting, color, mood, detail = results
        logger.info("All agents completed analysis")

        # Combine into super-prompt
        super_prompt = prompt_combiner.combine(
            user_prompt=request.user_prompt,
            composition=composition,
            lighting=lighting,
            color=color,
            mood=mood,
            detail=detail,
        )
        logger.info(f"Super-prompt: {super_prompt[:100]}...")

        # Generate enhanced image
        logger.info("Generating enhanced image with Replicate...")
        enhanced_url = await ai_enhancer.enhance_with_replicate(
            image_url=request.image_url,
            style="cinematic",  # Base style
            prompt_modifier=super_prompt,
        )

        if not enhanced_url:
            raise HTTPException(status_code=500, detail="Image generation failed")

        processing_time = int((time.time() - start_time) * 1000)
        logger.success(f"Enhancement complete in {processing_time}ms")

        # Format agent analyses for response
        agent_analyses = [
            AgentAnalysisResponse(
                agent_name=a.agent_name,
                confidence=a.confidence,
                observations=a.observations,
                directive=a.enhancement_directive,
            )
            for a in results
        ]

        return ChatEnhanceResponse(
            success=True,
            original_url=request.image_url,
            enhanced_url=enhanced_url,
            super_prompt=super_prompt,
            agent_analyses=agent_analyses,
            processing_time_ms=processing_time,
        )

    except Exception as e:
        logger.error(f"Agent enhancement failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enhance-stream")
async def enhance_with_streaming(request: ChatEnhanceRequest):
    """
    Stream enhancement progress updates to the frontend.
    Useful for showing real-time progress in the chat interface.
    """
    async def event_generator():
        start_time = time.time()

        try:
            # Stage 1: Composition analysis
            yield f"data: {json.dumps({'stage': 'composition', 'status': 'analyzing', 'message': 'Analyzing composition and framing...'})}\n\n"
            composition = await composition_agent.analyze(request.image_url, request.user_prompt)
            yield f"data: {json.dumps({'stage': 'composition', 'status': 'complete', 'confidence': composition.confidence})}\n\n"

            # Stage 2: Lighting analysis
            yield f"data: {json.dumps({'stage': 'lighting', 'status': 'analyzing', 'message': 'Evaluating lighting and exposure...'})}\n\n"
            lighting = await lighting_agent.analyze(request.image_url, request.user_prompt)
            yield f"data: {json.dumps({'stage': 'lighting', 'status': 'complete', 'confidence': lighting.confidence})}\n\n"

            # Stage 3: Color analysis
            yield f"data: {json.dumps({'stage': 'color', 'status': 'analyzing', 'message': 'Enhancing color palette...'})}\n\n"
            color = await color_agent.analyze(request.image_url, request.user_prompt)
            yield f"data: {json.dumps({'stage': 'color', 'status': 'complete', 'confidence': color.confidence})}\n\n"

            # Stage 4: Mood analysis
            yield f"data: {json.dumps({'stage': 'mood', 'status': 'analyzing', 'message': 'Amplifying mood and atmosphere...'})}\n\n"
            mood = await mood_agent.analyze(request.image_url, request.user_prompt)
            yield f"data: {json.dumps({'stage': 'mood', 'status': 'complete', 'confidence': mood.confidence})}\n\n"

            # Stage 5: Detail analysis
            yield f"data: {json.dumps({'stage': 'detail', 'status': 'analyzing', 'message': 'Refining details and clarity...'})}\n\n"
            detail = await detail_agent.analyze(request.image_url, request.user_prompt)
            yield f"data: {json.dumps({'stage': 'detail', 'status': 'complete', 'confidence': detail.confidence})}\n\n"

            # Stage 6: Combining prompts
            yield f"data: {json.dumps({'stage': 'combining', 'status': 'processing', 'message': 'Creating enhancement recipe...'})}\n\n"
            super_prompt = prompt_combiner.combine(
                user_prompt=request.user_prompt,
                composition=composition,
                lighting=lighting,
                color=color,
                mood=mood,
                detail=detail,
            )
            yield f"data: {json.dumps({'stage': 'combining', 'status': 'complete'})}\n\n"

            # Stage 7: Generating image
            yield f"data: {json.dumps({'stage': 'generation', 'status': 'processing', 'message': 'Generating your enhanced image...'})}\n\n"
            enhanced_url = await ai_enhancer.enhance_with_replicate(
                image_url=request.image_url,
                style="cinematic",
                prompt_modifier=super_prompt,
            )

            processing_time = int((time.time() - start_time) * 1000)

            # Final result
            yield f"data: {json.dumps({'stage': 'complete', 'status': 'success', 'enhanced_url': enhanced_url, 'super_prompt': super_prompt, 'processing_time_ms': processing_time})}\n\n"

        except Exception as e:
            logger.error(f"Streaming enhancement failed: {e}")
            yield f"data: {json.dumps({'stage': 'error', 'status': 'failed', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/analyze-only")
async def analyze_only(request: ChatEnhanceRequest):
    """
    Only run the agent analysis without generating an image.
    Useful for previewing what changes would be made.
    """
    logger.info(f"Running analysis only: prompt='{request.user_prompt}'")

    try:
        # Run all 5 agents in parallel
        results = await asyncio.gather(
            composition_agent.analyze(request.image_url, request.user_prompt),
            lighting_agent.analyze(request.image_url, request.user_prompt),
            color_agent.analyze(request.image_url, request.user_prompt),
            mood_agent.analyze(request.image_url, request.user_prompt),
            detail_agent.analyze(request.image_url, request.user_prompt),
        )

        composition, lighting, color, mood, detail = results

        # Get super-prompt preview
        super_prompt = prompt_combiner.combine(
            user_prompt=request.user_prompt,
            composition=composition,
            lighting=lighting,
            color=color,
            mood=mood,
            detail=detail,
        )

        # Get summary
        summary = prompt_combiner.get_summary(
            composition=composition,
            lighting=lighting,
            color=color,
            mood=mood,
            detail=detail,
        )

        return {
            "super_prompt": super_prompt,
            "agent_summary": summary,
        }

    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
