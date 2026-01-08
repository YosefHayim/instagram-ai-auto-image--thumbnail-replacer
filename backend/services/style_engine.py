from dataclasses import dataclass
from typing import Dict
from PIL import Image
from loguru import logger
from services.image_processor import ImageProcessor


@dataclass
class StyleConfig:
    brightness: float = 1.0
    contrast: float = 1.0
    saturation: float = 1.0
    sharpness: float = 1.0
    temperature: float = 0.0
    vignette: float = 0.0


STYLE_PRESETS: Dict[str, StyleConfig] = {
    "cinematic": StyleConfig(
        brightness=0.95,
        contrast=1.15,
        saturation=0.9,
        sharpness=1.1,
        temperature=-0.2,
        vignette=0.25,
    ),
    "vibrant": StyleConfig(
        brightness=1.05,
        contrast=1.1,
        saturation=1.4,
        sharpness=1.15,
        temperature=0.1,
        vignette=0.0,
    ),
    "minimal": StyleConfig(
        brightness=1.1,
        contrast=0.95,
        saturation=0.7,
        sharpness=1.0,
        temperature=0.0,
        vignette=0.0,
    ),
    "vintage": StyleConfig(
        brightness=1.0,
        contrast=1.05,
        saturation=0.75,
        sharpness=0.9,
        temperature=0.3,
        vignette=0.35,
    ),
    "moody": StyleConfig(
        brightness=0.85,
        contrast=1.2,
        saturation=0.85,
        sharpness=1.05,
        temperature=-0.3,
        vignette=0.4,
    ),
    "warm": StyleConfig(
        brightness=1.05,
        contrast=1.05,
        saturation=1.1,
        sharpness=1.0,
        temperature=0.4,
        vignette=0.1,
    ),
    "cool": StyleConfig(
        brightness=1.0,
        contrast=1.1,
        saturation=0.95,
        sharpness=1.05,
        temperature=-0.4,
        vignette=0.15,
    ),
    "bright": StyleConfig(
        brightness=1.2,
        contrast=1.0,
        saturation=1.15,
        sharpness=1.1,
        temperature=0.15,
        vignette=0.0,
    ),
}


class StyleEngine:
    def __init__(self):
        self.processor = ImageProcessor()
        self.presets = STYLE_PRESETS
        logger.debug("StyleEngine initialized")

    def get_style_config(self, style_name: str) -> StyleConfig:
        return self.presets.get(style_name.lower(), STYLE_PRESETS["cinematic"])

    def apply_style(
        self, image: Image.Image, style_name: str, intensity: float = 1.0
    ) -> Image.Image:
        logger.info(f"Applying style: {style_name} with intensity {intensity}")
        config = self.get_style_config(style_name)

        def lerp(base: float, target: float, t: float) -> float:
            return base + (target - base) * t

        image = self.processor.to_rgb(image)

        brightness = lerp(1.0, config.brightness, intensity)
        image = self.processor.adjust_brightness(image, brightness)

        contrast = lerp(1.0, config.contrast, intensity)
        image = self.processor.adjust_contrast(image, contrast)

        saturation = lerp(1.0, config.saturation, intensity)
        image = self.processor.adjust_saturation(image, saturation)

        sharpness = lerp(1.0, config.sharpness, intensity)
        image = self.processor.adjust_sharpness(image, sharpness)

        if config.temperature != 0:
            temperature = config.temperature * intensity
            image = self.processor.apply_color_temperature(image, temperature)

        if config.vignette > 0:
            vignette = config.vignette * intensity
            image = self.processor.apply_vignette(image, vignette)

        return image

    def get_available_styles(self) -> list:
        return list(self.presets.keys())

    async def enhance_from_url(
        self, image_url: str, style_name: str, intensity: float = 0.8
    ) -> Image.Image:
        logger.info(f"Enhancing from URL: style={style_name}, intensity={intensity}")
        image = await self.processor.fetch_image(image_url)
        image = self.processor.resize_if_needed(image)
        result = self.apply_style(image, style_name, intensity)
        logger.success(f"Enhancement complete: {result.size}")
        return result
