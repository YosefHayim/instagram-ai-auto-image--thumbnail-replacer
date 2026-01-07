import time
import io
import base64
from typing import List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse

from ..models import (
    EnhanceRequest,
    EnhanceResponse,
    PreviewRequest,
    PreviewResponse,
    BatchEnhanceRequest,
    BatchEnhanceResponse,
)
from ..services import StyleEngine, ImageProcessor

router = APIRouter(prefix="/api/enhance", tags=["enhance"])

style_engine = StyleEngine()
image_processor = ImageProcessor()


@router.post("", response_model=EnhanceResponse)
async def enhance_image(request: EnhanceRequest):
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
    enhanced_images = []
    failed_images = []

    for url in request.image_urls:
        try:
            enhanced_image = await style_engine.enhance_from_url(
                image_url=url,
                style_name=request.style.value,
                intensity=request.intensity,
            )

            enhanced_base64 = image_processor.to_base64(enhanced_image)
            enhanced_url = f"data:image/jpeg;base64,{enhanced_base64}"

            enhanced_images.append({"original_url": url, "enhanced_url": enhanced_url})
        except Exception as e:
            failed_images.append(url)

    total_time = int((time.time() - start_time) * 1000)

    return BatchEnhanceResponse(
        success=len(failed_images) == 0,
        total_images=len(request.image_urls),
        enhanced_images=enhanced_images,
        failed_images=failed_images,
        total_processing_time_ms=total_time,
    )


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
