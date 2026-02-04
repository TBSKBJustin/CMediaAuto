"""
AI Thumbnail Generator (ComfyUI) - Generate AI images using ComfyUI API
"""

import json
import logging
import time
import uuid
from pathlib import Path
from typing import Optional, Tuple
import requests
import websocket


class ComfyUIGenerator:
    """Generate AI images using ComfyUI backend"""
    
    def __init__(
        self,
        server_url: str = "http://127.0.0.1:8188",
        workflow_template_path: Optional[str] = None
    ):
        """
        Initialize ComfyUI generator
        
        Args:
            server_url: ComfyUI server URL (default: http://127.0.0.1:8188)
            workflow_template_path: Path to workflow API JSON template
        """
        self.server_url = server_url.rstrip('/')
        self.workflow_template_path = workflow_template_path or str(
            Path(__file__).parent / "image_z_image_turbo_API.json"
        )
        self.logger = self._setup_logger()
        
    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger("ComfyUIGenerator")
        logger.setLevel(logging.INFO)
        return logger
    
    def generate(
        self,
        prompt: str,
        output_path: str,
        width: int = 1280,
        height: int = 720,
        steps: int = 9,
        seed: Optional[int] = None,
        filename_prefix: str = "thumbnail",
        timeout: int = 120
    ) -> Tuple[bool, Optional[str]]:
        """
        Generate AI image using ComfyUI
        
        Args:
            prompt: Text prompt for image generation
            output_path: Where to save the generated image
            width: Image width
            height: Image height
            steps: Number of sampling steps
            seed: Random seed (None for random)
            filename_prefix: Filename prefix in ComfyUI output folder
            timeout: Maximum wait time in seconds
            
        Returns:
            (success, error_message)
        """
        try:
            self.logger.info(f"Generating AI image with ComfyUI: {prompt[:50]}...")
            
            # Load workflow template
            workflow = self._load_workflow_template()
            
            # Modify workflow with parameters
            workflow = self._customize_workflow(
                workflow,
                prompt=prompt,
                width=width,
                height=height,
                steps=steps,
                seed=seed if seed else self._generate_seed(),
                filename_prefix=filename_prefix
            )
            
            # Submit workflow to ComfyUI
            prompt_id = self._queue_prompt(workflow)
            if not prompt_id:
                return False, "Failed to queue prompt"
            
            self.logger.info(f"Queued prompt with ID: {prompt_id}")
            
            # Wait for completion
            success, result = self._wait_for_completion(prompt_id, timeout)
            if not success:
                return False, result
            
            # Get output image path
            image_filename = result.get('filename')
            if not image_filename:
                return False, "No output filename returned"
            
            # Copy from ComfyUI output to target location
            comfyui_output = result.get('subfolder', '')
            success, error = self._copy_output_image(
                image_filename,
                comfyui_output,
                output_path
            )
            
            if success:
                self.logger.info(f"Image saved to: {output_path}")
                return True, None
            else:
                return False, error
                
        except Exception as e:
            self.logger.error(f"Failed to generate image: {e}")
            return False, str(e)
    
    def _load_workflow_template(self) -> dict:
        """Load workflow template from JSON file"""
        with open(self.workflow_template_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _customize_workflow(
        self,
        workflow: dict,
        prompt: str,
        width: int,
        height: int,
        steps: int,
        seed: int,
        filename_prefix: str
    ) -> dict:
        """Customize workflow with generation parameters"""
        # Update prompt (node 45: CLIPTextEncode)
        if "45" in workflow:
            workflow["45"]["inputs"]["text"] = prompt
        
        # Update image size (node 41: EmptySD3LatentImage)
        if "41" in workflow:
            workflow["41"]["inputs"]["width"] = width
            workflow["41"]["inputs"]["height"] = height
        
        # Update sampling steps and seed (node 44: KSampler)
        if "44" in workflow:
            workflow["44"]["inputs"]["steps"] = steps
            workflow["44"]["inputs"]["seed"] = seed
        
        # Update output filename prefix (node 9: SaveImage)
        if "9" in workflow:
            workflow["9"]["inputs"]["filename_prefix"] = filename_prefix
        
        return workflow
    
    def _generate_seed(self) -> int:
        """Generate random seed"""
        return int(time.time() * 1000) % (2**32)
    
    def _queue_prompt(self, workflow: dict) -> Optional[str]:
        """Submit workflow to ComfyUI queue"""
        try:
            payload = {
                "prompt": workflow,
                "client_id": str(uuid.uuid4())
            }
            
            response = requests.post(
                f"{self.server_url}/prompt",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("prompt_id")
            else:
                self.logger.error(f"Queue prompt failed: {response.status_code} {response.text}")
                return None
                
        except Exception as e:
            self.logger.error(f"Error queuing prompt: {e}")
            return None
    
    def _wait_for_completion(self, prompt_id: str, timeout: int) -> Tuple[bool, any]:
        """Wait for workflow completion and get result"""
        try:
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                # Check history for completion
                response = requests.get(
                    f"{self.server_url}/history/{prompt_id}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    history = response.json()
                    
                    if prompt_id in history:
                        prompt_status = history[prompt_id]
                        
                        # Check if completed
                        if "outputs" in prompt_status:
                            outputs = prompt_status["outputs"]
                            
                            # Find SaveImage node output (node 9)
                            if "9" in outputs and "images" in outputs["9"]:
                                images = outputs["9"]["images"]
                                if images:
                                    return True, images[0]
                        
                        # Check for errors
                        if "status" in prompt_status:
                            status = prompt_status["status"]
                            if status.get("completed") is False:
                                error_msg = status.get("messages", ["Unknown error"])
                                return False, f"Workflow failed: {error_msg}"
                
                # Wait before next check
                time.sleep(2)
            
            return False, "Timeout waiting for completion"
            
        except Exception as e:
            self.logger.error(f"Error waiting for completion: {e}")
            return False, str(e)
    
    def _copy_output_image(
        self,
        filename: str,
        subfolder: str,
        target_path: str
    ) -> Tuple[bool, Optional[str]]:
        """Copy generated image from ComfyUI output to target path"""
        try:
            # Download image from ComfyUI server
            params = {
                "filename": filename,
                "subfolder": subfolder,
                "type": "output"
            }
            
            response = requests.get(
                f"{self.server_url}/view",
                params=params,
                timeout=30
            )
            
            if response.status_code == 200:
                # Save to target path
                Path(target_path).parent.mkdir(parents=True, exist_ok=True)
                with open(target_path, 'wb') as f:
                    f.write(response.content)
                return True, None
            else:
                return False, f"Failed to download image: {response.status_code}"
                
        except Exception as e:
            self.logger.error(f"Error copying output image: {e}")
            return False, str(e)
    
    def check_server(self) -> bool:
        """Check if ComfyUI server is available"""
        try:
            response = requests.get(f"{self.server_url}/system_stats", timeout=5)
            return response.status_code == 200
        except:
            return False


def main():
    """CLI entry point for testing"""
    import argparse
    
    parser = argparse.ArgumentParser(description='ComfyUI Image Generator')
    parser.add_argument('--prompt', required=True, help='Text prompt')
    parser.add_argument('--output', required=True, help='Output image path')
    parser.add_argument('--width', type=int, default=1280, help='Image width')
    parser.add_argument('--height', type=int, default=720, help='Image height')
    parser.add_argument('--server', default='http://127.0.0.1:8188', help='ComfyUI server URL')
    parser.add_argument('--workflow', help='Workflow template JSON path')
    
    args = parser.parse_args()
    
    generator = ComfyUIGenerator(
        server_url=args.server,
        workflow_template_path=args.workflow
    )
    
    # Check server
    if not generator.check_server():
        print(f"✗ ComfyUI server not available at {args.server}")
        print("  Make sure ComfyUI is running with --listen flag")
        exit(1)
    
    print(f"✓ ComfyUI server available")
    print(f"Generating: {args.prompt}")
    
    success, error = generator.generate(
        prompt=args.prompt,
        output_path=args.output,
        width=args.width,
        height=args.height
    )
    
    if success:
        print(f"✓ Image generated: {args.output}")
    else:
        print(f"✗ Failed: {error}")


if __name__ == '__main__':
    main()
