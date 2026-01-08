import time
import io
import base64
import os
from typing import List
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from loguru import logger

from models import (
    EnhanceRequest,
    EnhanceResponse,
    PreviewRequest,
    PreviewResponse,
    BatchEnhanceRequest,
    BatchEnhanceResponse,
)
from services import StyleEngine, ImageProcessor, AIEnhancer

router = APIRouter(prefix="/api/enhance", tags=["enhance"])

style_engine = StyleEngine()
image_processor = ImageProcessor()
ai_enhancer = AIEnhancer()

logger.info("Enhance router initialized")


@router.post("", response_model=EnhanceResponse)
async def enhance_image(request: EnhanceRequest):
    start_time = time.time()
    logger.info(
        f"Enhance request: url={request.image_url[:50]}..., style={request.style.value}, intensity={request.intensity}"
    )

    use_ai = os.getenv("REPLICATE_API_TOKEN") is not None
    logger.debug(f"Using AI: {use_ai}")

    try:
        if use_ai:
            logger.info("Starting AI enhancement with Replicate")
            enhanced_url = await ai_enhancer.enhance_with_replicate(
                image_url=request.image_url, style=request.style.value
            )

            if not enhanced_url:
                logger.error("AI enhancement returned no result")
                raise Exception("AI enhancement returned no result")

            processing_time = int((time.time() - start_time) * 1000)
            logger.success(f"AI enhancement completed in {processing_time}ms")

            return EnhanceResponse(
                success=True,
                original_url=request.image_url,
                enhanced_url=enhanced_url,
                style_applied=request.style.value,
                processing_time_ms=processing_time,
            )
        else:
            logger.info("Starting local style enhancement")
            enhanced_image = await style_engine.enhance_from_url(
                image_url=request.image_url,
                style_name=request.style.value,
                intensity=request.intensity,
            )

            enhanced_base64 = image_processor.to_base64(enhanced_image)
            enhanced_url = f"data:image/jpeg;base64,{enhanced_base64}"

            processing_time = int((time.time() - start_time) * 1000)
            logger.success(f"Local enhancement completed in {processing_time}ms")

            return EnhanceResponse(
                success=True,
                original_url=request.image_url,
                enhanced_url=enhanced_url,
                style_applied=request.style.value,
                processing_time_ms=processing_time,
            )
    except Exception as e:
        logger.exception(f"Enhancement failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai", response_model=EnhanceResponse)
async def enhance_image_ai(request: EnhanceRequest):
    start_time = time.time()
    logger.info(f"AI enhance request: style={request.style.value}")

    if not os.getenv("REPLICATE_API_TOKEN"):
        logger.error("REPLICATE_API_TOKEN not set")
        raise HTTPException(
            status_code=400,
            detail="AI enhancement not configured. Set REPLICATE_API_TOKEN.",
        )

    try:
        logger.debug("Calling Replicate API")
        enhanced_url = await ai_enhancer.enhance_with_replicate(
            image_url=request.image_url, style=request.style.value
        )

        if not enhanced_url:
            logger.error("AI enhancement returned empty result")
            raise Exception("AI enhancement returned no result")

        processing_time = int((time.time() - start_time) * 1000)
        logger.success(f"AI enhancement completed in {processing_time}ms")

        return EnhanceResponse(
            success=True,
            original_url=request.image_url,
            enhanced_url=enhanced_url,
            style_applied=request.style.value,
            processing_time_ms=processing_time,
        )
    except Exception as e:
        logger.exception(f"AI enhancement failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/local", response_model=EnhanceResponse)
async def enhance_image_local(request: EnhanceRequest):
    start_time = time.time()

    try:
        enhanced_image = await style_engine.enhance_from_url(
            image_url=request.image_url,
            style_name=request.style.value,
            intensity=request.intensity,
        )

        enhanced_base64 = image_processor.to_base64(enhanced_image)
        enhanced_url = f"data:image/jpeg;base64,{enhanced_base64}"

        processing_time = int((time.time() - start_time) * 1000)

        return EnhanceResponse(
            success=True,
            original_url=request.image_url,
            enhanced_url=enhanced_url,
            style_applied=request.style.value,
            processing_time_ms=processing_time,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preview", response_model=PreviewResponse)
async def preview_style(request: PreviewRequest):
    try:
        image = await image_processor.fetch_image(request.image_url)
        image.thumbnail((400, 400), resample=3)

        enhanced = style_engine.apply_style(
            image=image, style_name=request.style.value, intensity=0.8
        )

        preview_base64 = image_processor.to_base64(enhanced, quality=75)
        preview_url = f"data:image/jpeg;base64,{preview_base64}"

        return PreviewResponse(
            success=True, preview_url=preview_url, style=request.style.value
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch", response_model=BatchEnhanceResponse)
async def batch_enhance(request: BatchEnhanceRequest):
    start_time = time.time()
    logger.info(
        f"Batch enhance request: {len(request.image_urls)} images, style={request.style.value}"
    )
    enhanced_images = []
    failed_images = []

    use_ai = os.getenv("REPLICATE_API_TOKEN") is not None

    for i, url in enumerate(request.image_urls):
        try:
            logger.debug(f"Processing image {i + 1}/{len(request.image_urls)}")
            if use_ai:
                enhanced_url = await ai_enhancer.enhance_with_replicate(
                    image_url=url, style=request.style.value
                )
            else:
                enhanced_image = await style_engine.enhance_from_url(
                    image_url=url,
                    style_name=request.style.value,
                    intensity=request.intensity,
                )
                enhanced_base64 = image_processor.to_base64(enhanced_image)
                enhanced_url = f"data:image/jpeg;base64,{enhanced_base64}"

            enhanced_images.append({"original_url": url, "enhanced_url": enhanced_url})
            logger.debug(f"Image {i + 1} processed successfully")
        except Exception as e:
            logger.error(f"Failed to process image {i + 1}: {str(e)}")
            failed_images.append(url)

    total_time = int((time.time() - start_time) * 1000)
    logger.info(
        f"Batch complete: {len(enhanced_images)} success, {len(failed_images)} failed in {total_time}ms"
    )

    return BatchEnhanceResponse(
        success=len(failed_images) == 0,
        total_images=len(request.image_urls),
        enhanced_images=enhanced_images,
        failed_images=failed_images,
        total_processing_time_ms=total_time,
    )


@router.post("/upscale")
async def upscale_image(
    image_url: str = Query(...), scale: int = Query(default=2, ge=1, le=4)
):
    if not os.getenv("REPLICATE_API_TOKEN"):
        raise HTTPException(
            status_code=400, detail="Upscaling not configured. Set REPLICATE_API_TOKEN."
        )

    try:
        upscaled_url = await ai_enhancer.upscale_image(image_url, scale)
        return {"success": True, "upscaled_url": upscaled_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{style}")
async def download_enhanced(image_url: str, style: str, intensity: float = 0.8):
    try:
        enhanced_image = await style_engine.enhance_from_url(
            image_url=image_url, style_name=style, intensity=intensity
        )

        buffer = io.BytesIO()
        enhanced_image.save(buffer, format="JPEG", quality=95)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="image/jpeg",
            headers={
                "Content-Disposition": f"attachment; filename=enhanced_{style}.jpg"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
