import os
import httpx
import base64
import asyncio
from typing import Optional
from PIL import Image
import io
from loguru import logger

REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


class AIEnhancer:
    def __init__(self):
        self.replicate_token = REPLICATE_API_TOKEN
        self.openai_key = OPENAI_API_KEY
        logger.debug(
            f"AIEnhancer initialized - Replicate token: {'set' if self.replicate_token else 'NOT SET'}"
        )

    async def enhance_with_replicate(
        self, image_url: str, style: str = "cinematic", prompt_modifier: str = ""
    ) -> Optional[str]:
        logger.info(f"Starting Replicate enhancement: style={style}")
        if not self.replicate_token:
            logger.error("REPLICATE_API_TOKEN not set")
            raise ValueError("REPLICATE_API_TOKEN not set")

        style_prompts = {
            "cinematic": "cinematic color grading, film look, dramatic lighting, movie poster quality",
            "vibrant": "vibrant colors, high saturation, vivid, eye-catching, colorful",
            "minimal": "clean, minimal, bright, airy, white space, modern aesthetic",
            "vintage": "vintage film, retro, warm tones, nostalgic, 70s photography",
            "moody": "moody, dark, atmospheric, dramatic shadows, mysterious",
            "warm": "warm golden hour, sunset tones, cozy, inviting lighting",
            "cool": "cool blue tones, crisp, professional, tech aesthetic",
            "bright": "bright, well-lit, fresh, clean, high key lighting",
        }

        style_prompt = style_prompts.get(style, style_prompts["cinematic"])
        full_prompt = (
            f"enhance this image with {style_prompt}. {prompt_modifier}".strip()
        )
        logger.debug(f"Using prompt: {full_prompt}")

        async with httpx.AsyncClient(timeout=120.0) as client:
            logger.debug("Creating Replicate prediction...")
            response = await client.post(
                "https://api.replicate.com/v1/predictions",
                headers={
                    "Authorization": f"Token {self.replicate_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "version": "9451bfbf652b21a9bccc741e5c7f5ef41a45b86061e5ba3286ec600dfd49a483",
                    "input": {
                        "image": image_url,
                        "prompt": full_prompt,
                        "num_inference_steps": 20,
                        "guidance_scale": 7.5,
                        "strength": 0.35,
                    },
                },
            )

            if response.status_code != 201:
                logger.error(
                    f"Replicate API error: {response.status_code} - {response.text}"
                )
                raise Exception(f"Replicate API error: {response.text}")

            prediction = response.json()
            prediction_id = prediction["id"]
            logger.info(f"Prediction created: {prediction_id}")

            for attempt in range(60):
                await asyncio.sleep(2)

                status_response = await client.get(
                    f"https://api.replicate.com/v1/predictions/{prediction_id}",
                    headers={"Authorization": f"Token {self.replicate_token}"},
                )

                status_data = status_response.json()
                status = status_data["status"]
                logger.debug(f"Poll {attempt + 1}: status={status}")

                if status == "succeeded":
                    output = status_data.get("output")
                    logger.success(f"Prediction succeeded: output type={type(output)}")
                    if isinstance(output, list) and len(output) > 0:
                        return output[0]
                    return output
                elif status == "failed":
                    error = status_data.get("error")
                    logger.error(f"Prediction failed: {error}")
                    raise Exception(f"Prediction failed: {error}")

            logger.error("Prediction timeout after 60 polls")
            raise Exception("Prediction timeout")

    async def enhance_with_stability(
        self, image: Image.Image, style: str = "cinematic"
    ) -> Optional[Image.Image]:
        stability_key = os.getenv("STABILITY_API_KEY")
        if not stability_key:
            raise ValueError("STABILITY_API_KEY not set")

        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        image_bytes = buffer.getvalue()

        style_prompts = {
            "cinematic": "cinematic film look, dramatic lighting, movie quality",
            "vibrant": "vibrant saturated colors, vivid, eye-catching",
            "minimal": "clean minimal aesthetic, bright, modern",
            "vintage": "vintage retro film, warm nostalgic tones",
            "moody": "moody atmospheric, dark dramatic shadows",
            "warm": "warm golden hour lighting, sunset tones",
            "cool": "cool blue tones, crisp professional look",
            "bright": "bright airy high-key lighting, fresh clean",
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image",
                headers={
                    "Authorization": f"Bearer {stability_key}",
                    "Accept": "application/json",
                },
                files={"init_image": ("image.png", image_bytes, "image/png")},
                data={
                    "text_prompts[0][text]": style_prompts.get(
                        style, style_prompts["cinematic"]
                    ),
                    "text_prompts[0][weight]": 1,
                    "cfg_scale": 7,
                    "image_strength": 0.35,
                    "steps": 30,
                    "samples": 1,
                },
            )

            if response.status_code != 200:
                raise Exception(f"Stability API error: {response.text}")

            data = response.json()
            image_b64 = data["artifacts"][0]["base64"]
            return Image.open(io.BytesIO(base64.b64decode(image_b64)))

    async def upscale_image(self, image_url: str, scale: int = 2) -> Optional[str]:
        logger.info(f"Starting upscale: scale={scale}")
        if not self.replicate_token:
            logger.error("REPLICATE_API_TOKEN not set for upscale")
            raise ValueError("REPLICATE_API_TOKEN not set")

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.replicate.com/v1/predictions",
                headers={
                    "Authorization": f"Token {self.replicate_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "version": "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
                    "input": {"image": image_url, "scale": scale, "face_enhance": True},
                },
            )

            if response.status_code != 201:
                logger.error(f"Upscale API error: {response.text}")
                raise Exception(f"Replicate API error: {response.text}")

            prediction = response.json()
            prediction_id = prediction["id"]
            logger.info(f"Upscale prediction created: {prediction_id}")

            for attempt in range(60):
                await asyncio.sleep(2)

                status_response = await client.get(
                    f"https://api.replicate.com/v1/predictions/{prediction_id}",
                    headers={"Authorization": f"Token {self.replicate_token}"},
                )

                status_data = status_response.json()
                status = status_data["status"]
                logger.debug(f"Upscale poll {attempt + 1}: status={status}")

                if status == "succeeded":
                    logger.success("Upscale completed")
                    return status_data.get("output")
                elif status == "failed":
                    error = status_data.get("error")
                    logger.error(f"Upscale failed: {error}")
                    raise Exception(f"Upscale failed: {error}")

            logger.error("Upscale timeout")
            raise Exception("Upscale timeout")
