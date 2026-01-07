import io
import base64
from typing import Optional, Tuple
import httpx
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np


class ImageProcessor:
    def __init__(self):
        self.supported_formats = ["JPEG", "PNG", "WEBP"]
        self.max_size = (2048, 2048)

    async def fetch_image(self, url: str) -> Image.Image:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            return Image.open(io.BytesIO(response.content))

    def resize_if_needed(self, image: Image.Image) -> Image.Image:
        if image.width > self.max_size[0] or image.height > self.max_size[1]:
            image.thumbnail(self.max_size, Image.Resampling.LANCZOS)
        return image

    def to_rgb(self, image: Image.Image) -> Image.Image:
        if image.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(
                image, mask=image.split()[-1] if image.mode in ("RGBA", "LA") else None
            )
            return background
        elif image.mode != "RGB":
            return image.convert("RGB")
        return image

    def adjust_brightness(self, image: Image.Image, factor: float) -> Image.Image:
        enhancer = ImageEnhance.Brightness(image)
        return enhancer.enhance(factor)

    def adjust_contrast(self, image: Image.Image, factor: float) -> Image.Image:
        enhancer = ImageEnhance.Contrast(image)
        return enhancer.enhance(factor)

    def adjust_saturation(self, image: Image.Image, factor: float) -> Image.Image:
        enhancer = ImageEnhance.Color(image)
        return enhancer.enhance(factor)

    def adjust_sharpness(self, image: Image.Image, factor: float) -> Image.Image:
        enhancer = ImageEnhance.Sharpness(image)
        return enhancer.enhance(factor)

    def apply_color_temperature(
        self, image: Image.Image, temperature: float
    ) -> Image.Image:
        img_array = np.array(image, dtype=np.float32)

        if temperature > 0:
            img_array[:, :, 0] = np.clip(
                img_array[:, :, 0] * (1 + temperature * 0.1), 0, 255
            )
            img_array[:, :, 2] = np.clip(
                img_array[:, :, 2] * (1 - temperature * 0.05), 0, 255
            )
        else:
            img_array[:, :, 0] = np.clip(
                img_array[:, :, 0] * (1 + temperature * 0.05), 0, 255
            )
            img_array[:, :, 2] = np.clip(
                img_array[:, :, 2] * (1 - temperature * 0.1), 0, 255
            )

        return Image.fromarray(img_array.astype(np.uint8))

    def apply_vignette(self, image: Image.Image, intensity: float = 0.3) -> Image.Image:
        img_array = np.array(image, dtype=np.float32)
        rows, cols = img_array.shape[:2]

        X = np.arange(0, cols)
        Y = np.arange(0, rows)
        X, Y = np.meshgrid(X, Y)

        center_x, center_y = cols / 2, rows / 2

        gaussian = np.exp(
            -((X - center_x) ** 2 + (Y - center_y) ** 2)
            / (2 * (max(rows, cols) * 0.5) ** 2)
        )
        gaussian = gaussian * (1 - intensity) + intensity

        for i in range(3):
            img_array[:, :, i] = img_array[:, :, i] * gaussian

        return Image.fromarray(np.clip(img_array, 0, 255).astype(np.uint8))

    def to_base64(
        self, image: Image.Image, format: str = "JPEG", quality: int = 90
    ) -> str:
        buffer = io.BytesIO()
        image.save(buffer, format=format, quality=quality)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    def from_base64(self, data: str) -> Image.Image:
        return Image.open(io.BytesIO(base64.b64decode(data)))
