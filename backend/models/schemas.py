from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class StylePreset(str, Enum):
    CINEMATIC = "cinematic"
    VIBRANT = "vibrant"
    MINIMAL = "minimal"
    VINTAGE = "vintage"
    MOODY = "moody"
    WARM = "warm"
    COOL = "cool"
    BRIGHT = "bright"


class EnhanceRequest(BaseModel):
    image_url: str = Field(..., description="URL of the image to enhance")
    style: StylePreset = Field(
        default=StylePreset.CINEMATIC, description="Style preset to apply"
    )
    intensity: float = Field(
        default=0.8, ge=0.0, le=1.0, description="Enhancement intensity (0-1)"
    )


class EnhanceResponse(BaseModel):
    success: bool
    original_url: str
    enhanced_url: str
    style_applied: str
    processing_time_ms: int


class PreviewRequest(BaseModel):
    image_url: str = Field(..., description="URL of the image to preview")
    style: StylePreset = Field(..., description="Style preset to preview")


class PreviewResponse(BaseModel):
    success: bool
    preview_url: str
    style: str


class InsightsRequest(BaseModel):
    profile_username: str = Field(..., description="Instagram username")
    recent_posts_count: int = Field(default=9, ge=1, le=30)


class InsightsResponse(BaseModel):
    best_posting_time: str
    suggested_caption: str
    hashtags: List[str]
    engagement_tip: str
    confidence_score: float = Field(ge=0.0, le=1.0)


class BatchEnhanceRequest(BaseModel):
    image_urls: List[str] = Field(..., min_length=1, max_length=30)
    style: StylePreset = Field(default=StylePreset.CINEMATIC)
    intensity: float = Field(default=0.8, ge=0.0, le=1.0)


class BatchEnhanceResponse(BaseModel):
    success: bool
    total_images: int
    enhanced_images: List[dict]
    failed_images: List[str]
    total_processing_time_ms: int


class HealthResponse(BaseModel):
    status: str
    version: str
    services: dict
