"""
AI Generator - Background image generator for thumbnails
Supports multiple backends: Stable Diffusion WebUI, ComfyUI, or fallback assets
"""

import logging
import requests
import base64
from pathlib import Path
from typing import Optional, Dict
import json


class ImageGenerator:
    """Generates background images for thumbnails"""
    
    def __init__(
        self, 
        backend: str = "stable-diffusion",
        base_url: str = "http://localhost:7860",
        model: Optional[str] = None
    ):
        """
        Initialize image generator
        
        Args:
            backend: "stable-diffusion", "comfyui", or "fallback"
            base_url: API base URL
            model: Model name (optional, depends on backend)
        """
        self.backend = backend
        self.base_url = base_url
        self.model = model
        self.logger = self._setup_logger()
    
    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger("ImageGenerator")
        logger.setLevel(logging.INFO)
        return logger
    
    def generate_image(
        self, 
        prompt: str, 
        output_path: str,
        width: int = 1280,
        height: int = 720,
        negative_prompt: Optional[str] = None,
        fallback_asset: Optional[str] = None
    ) -> tuple[bool, Optional[str]]:
        """
        Generate an image based on prompt
        
        Args:
            prompt: Text prompt describing the desired image
            output_path: Where to save the generated image
            width: Image width
            height: Image height
            negative_prompt: What to avoid in the image
            fallback_asset: Path to fallback image if generation fails
            
        Returns:
            (success, error_message)
        """
        self.logger.info(f"Generating image with prompt: {prompt[:100]}...")
        
        try:
            if self.backend == "stable-diffusion":
                return self._generate_stable_diffusion(
                    prompt, output_path, width, height, negative_prompt
                )
            elif self.backend == "comfyui":
                return self._generate_comfyui(
                    prompt, output_path, width, height
                )
            elif self.backend == "fallback":
                if fallback_asset:
                    return self._use_fallback(fallback_asset, output_path)
                return False, "Fallback backend selected but no fallback asset provided"
            else:
                return False, f"Unknown backend: {self.backend}"
        
        except Exception as e:
            self.logger.error(f"Generation failed: {e}")
            
            if fallback_asset:
                self.logger.info("Using fallback asset due to error")
                return self._use_fallback(fallback_asset, output_path)
            
            return False, str(e)
    
    def _generate_stable_diffusion(
        self,
        prompt: str,
        output_path: str,
        width: int,
        height: int,
        negative_prompt: Optional[str]
    ) -> tuple[bool, Optional[str]]:
        """Generate using Stable Diffusion WebUI API"""
        try:
            # Default negative prompt for church-appropriate content
            if negative_prompt is None:
                negative_prompt = "nsfw, gore, violence, disturbing, inappropriate, offensive, low quality, blurry"
            
            payload = {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "width": width,
                "height": height,
                "steps": 20,
                "cfg_scale": 7,
                "sampler_name": "Euler a",
                "batch_size": 1,
                "n_iter": 1,
            }
            
            if self.model:
                payload["override_settings"] = {
                    "sd_model_checkpoint": self.model
                }
            
            self.logger.info(f"Calling Stable Diffusion API at {self.base_url}/sdapi/v1/txt2img")
            
            response = requests.post(
                f"{self.base_url}/sdapi/v1/txt2img",
                json=payload,
                timeout=300
            )
            
            if response.status_code != 200:
                return False, f"API error: {response.status_code} - {response.text[:200]}"
            
            result = response.json()
            
            if "images" in result and result["images"]:
                # Decode base64 image
                image_data = base64.b64decode(result["images"][0])
                
                # Save to file
                with open(output_path, 'wb') as f:
                    f.write(image_data)
                
                self.logger.info(f"Image generated successfully: {output_path}")
                return True, None
            
            return False, "No image in response"
            
        except requests.exceptions.ConnectionError:
            return False, "Cannot connect to Stable Diffusion API. Is it running?"
        except requests.exceptions.Timeout:
            return False, "Request timeout (>5 minutes)"
        except Exception as e:
            return False, f"Stable Diffusion error: {str(e)}"
    
    def _generate_comfyui(
        self,
        prompt: str,
        output_path: str,
        width: int,
        height: int
    ) -> tuple[bool, Optional[str]]:
        """Generate using ComfyUI API"""
        # ComfyUI implementation would go here
        # This requires a more complex workflow JSON
        return False, "ComfyUI backend not yet implemented"
    
    def _use_fallback(self, fallback_asset: str, output_path: str) -> tuple[bool, Optional[str]]:
        """Copy fallback asset to output path"""
        try:
            from shutil import copy2
            fallback_path = Path(fallback_asset)
            
            if not fallback_path.exists():
                return False, f"Fallback asset not found: {fallback_asset}"
            
            copy2(fallback_asset, output_path)
            self.logger.info(f"Used fallback asset: {fallback_asset}")
            return True, None
        except Exception as e:
            return False, f"Failed to use fallback: {e}"


def main():
    """CLI entry point for testing"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Thumbnail Background Image Generator')
    parser.add_argument('--prompt', required=True, help='Image generation prompt')
    parser.add_argument('--output', required=True, help='Output image path')
    parser.add_argument('--backend', default='stable-diffusion', 
                       choices=['stable-diffusion', 'comfyui', 'fallback'],
                       help='Generation backend')
    parser.add_argument('--base-url', default='http://localhost:7860',
                       help='API base URL')
    parser.add_argument('--width', type=int, default=1280, help='Image width')
    parser.add_argument('--height', type=int, default=720, help='Image height')
    parser.add_argument('--negative', help='Negative prompt')
    parser.add_argument('--fallback', help='Fallback asset path')
    parser.add_argument('--model', help='Model name')
    
    args = parser.parse_args()
    
    generator = ImageGenerator(
        backend=args.backend,
        base_url=args.base_url,
        model=args.model
    )
    
    success, error = generator.generate_image(
        args.prompt,
        args.output,
        args.width,
        args.height,
        args.negative,
        args.fallback
    )
    
    if success:
        print(f"✓ Image generated: {args.output}")
    else:
        print(f"✗ Generation failed: {error}")


if __name__ == '__main__':
    main()

