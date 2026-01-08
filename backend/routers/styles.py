from typing import List
from fastapi import APIRouter
from loguru import logger

from services import StyleEngine
from services.style_engine import STYLE_PRESETS

router = APIRouter(prefix="/api/styles", tags=["styles"])

style_engine = StyleEngine()

logger.info("Styles router initialized")


@router.get("")
async def list_styles():
    styles = []
    for name, config in STYLE_PRESETS.items():
        styles.append(
            {
                "id": name,
                "label": name.capitalize(),
                "settings": {
                    "brightness": config.brightness,
                    "contrast": config.contrast,
                    "saturation": config.saturation,
                    "sharpness": config.sharpness,
                    "temperature": config.temperature,
                    "vignette": config.vignette,
                },
            }
        )
    return {"styles": styles}


@router.get("/{style_name}")
async def get_style(style_name: str):
    config = style_engine.get_style_config(style_name)
    return {
        "id": style_name,
        "label": style_name.capitalize(),
        "settings": {
            "brightness": config.brightness,
            "contrast": config.contrast,
            "saturation": config.saturation,
            "sharpness": config.sharpness,
            "temperature": config.temperature,
            "vignette": config.vignette,
        },
    }


@router.get("/{style_name}/description")
async def get_style_description(style_name: str):
    descriptions = {
        "cinematic": "Hollywood-grade color grading with enhanced shadows and muted highlights for a film-like aesthetic.",
        "vibrant": "Boosted colors and contrast for eye-catching, high-energy visuals that pop.",
        "minimal": "Clean, bright aesthetics with reduced saturation for a modern, editorial look.",
        "vintage": "Warm tones and subtle vignette for a nostalgic, film photography feel.",
        "moody": "Deep shadows and cool tones for dramatic, atmospheric imagery.",
        "warm": "Golden, sun-kissed tones that add warmth and comfort to any image.",
        "cool": "Blue-tinted adjustments for a crisp, professional, tech-forward look.",
        "bright": "High brightness and clarity for fresh, airy, light-filled photos.",
    }

    return {
        "style": style_name,
        "description": descriptions.get(style_name.lower(), "Custom style preset"),
    }
