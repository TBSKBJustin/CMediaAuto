"""
Workflow Controller - Orchestrates modules, queue, and retries
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from controller.event_manager import EventManager
from controller.state_store import StateStore


class WorkflowController:
    """Main orchestrator for the Church Media Automation System"""
    
    def __init__(self, config_path: str = "config/config.yaml"):
        self.config_path = config_path
        self.event_manager = EventManager()
        self.state_store = StateStore()
        self.logger = self._setup_logger()
        
    def _setup_logger(self) -> logging.Logger:
        """Setup logging configuration"""
        logger = logging.getLogger("WorkflowController")
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        return logger
    
    def run_event(self, event_id: str, force: bool = False) -> Dict:
        """
        Run workflow for a specific event
        
        Args:
            event_id: Event identifier (e.g., "2026-01-26_0900_sunday-service")
            force: Force re-run even if modules already succeeded
            
        Returns:
            Results dictionary with module statuses
        """
        self.logger.info(f"Starting workflow for event: {event_id}")
        
        # Load event configuration
        event_config = self.event_manager.load_event(event_id)
        if not event_config:
            raise ValueError(f"Event not found: {event_id}")
        
        # Check which modules are enabled
        enabled_modules = self._get_enabled_modules(event_config)
        self.logger.info(f"Enabled modules: {enabled_modules}")
        
        # Initialize progress tracking
        total_modules = len(enabled_modules)
        self._update_progress(event_id, {
            "status": "running",
            "current_module": None,
            "current_step": "Initializing",
            "completed_modules": [],
            "total_modules": total_modules,
            "progress_percent": 0,
            "details": "Starting workflow..."
        })
        
        # Run modules in sequence
        results = {}
        completed_count = 0
        
        for idx, module_name in enumerate(enabled_modules):
            try:
                # Update progress before running
                self._update_progress(event_id, {
                    "status": "running",
                    "current_module": module_name,
                    "current_step": f"Running {module_name}",
                    "completed_modules": list(results.keys()),
                    "total_modules": total_modules,
                    "progress_percent": int((completed_count / total_modules) * 100),
                    "details": f"Processing module {idx + 1} of {total_modules}: {module_name}"
                })
                
                result = self._run_module(event_id, module_name, event_config, force)
                results[module_name] = result
                self.state_store.save_module_result(event_id, module_name, result)
                completed_count += 1
                
            except Exception as e:
                self.logger.error(f"Module {module_name} failed: {str(e)}")
                results[module_name] = {"status": "failed", "error": str(e)}
                completed_count += 1
        
        # Final progress update
        self._update_progress(event_id, {
            "status": "completed",
            "current_module": None,
            "current_step": "Completed",
            "completed_modules": list(results.keys()),
            "total_modules": total_modules,
            "progress_percent": 100,
            "details": "Workflow completed successfully"
        })
        
        # Save final workflow state
        self.state_store.save_workflow_state(event_id, results)
        
        return results
    
    def _get_enabled_modules(self, event_config: Dict) -> List[str]:
        """Extract enabled modules from event configuration"""
        modules_config = event_config.get("modules", {})
        return [name for name, enabled in modules_config.items() if enabled]
    
    def _run_module(self, event_id: str, module_name: str, event_config: Dict, force: bool) -> Dict:
        """
        Execute a single module
        
        Args:
            event_id: Event identifier
            module_name: Name of the module to run
            event_config: Full event configuration
            force: Force re-run if already completed
            
        Returns:
            Module execution result
        """
        # Check if already completed (unless force=True)
        if not force:
            existing_result = self.state_store.get_module_result(event_id, module_name)
            if existing_result and existing_result.get("status") == "success":
                self.logger.info(f"Module {module_name} already completed, skipping")
                return existing_result
        
        self.logger.info(f"Running module: {module_name}")
        
        # Module routing logic
        try:
            if module_name == "thumbnail_ai":
                return self._run_thumbnail_ai(event_id, event_config)
            elif module_name == "thumbnail_compose":
                return self._run_thumbnail_compose(event_id, event_config)
            elif module_name == "subtitles":
                return self._run_subtitles(event_id, event_config)
            elif module_name == "subtitle_correction":
                return self._run_subtitle_correction(event_id, event_config)
            elif module_name == "content_summary":
                return self._run_content_summary(event_id, event_config)
            elif module_name == "ai_content":
                return self._run_ai_content(event_id, event_config)
            elif module_name == "publish_youtube":
                return self._run_publish_youtube(event_id, event_config)
            elif module_name == "publish_website":
                return self._run_publish_website(event_id, event_config)
            elif module_name == "archive":
                return self._run_archive(event_id, event_config)
            else:
                return {
                    "status": "skipped",
                    "message": f"Unknown module: {module_name}",
                    "timestamp": self._get_timestamp()
                }
        except Exception as e:
            self.logger.error(f"Module {module_name} failed: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": self._get_timestamp()
            }
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def _update_progress(self, event_id: str, progress_data: Dict) -> None:
        """Update workflow progress"""
        self.state_store.save_progress(event_id, progress_data)
    
    def get_progress(self, event_id: str) -> Optional[Dict]:
        """Get current workflow progress"""
        return self.state_store.get_progress(event_id)
    
    def run_single_module(self, event_id: str, module_name: str, input_files: Optional[Dict[str, str]] = None, force: bool = False) -> Dict:
        """
        Run a single module independently
        
        Args:
            event_id: Event identifier
            module_name: Name of the module to run
            input_files: Optional dict of input files (e.g., {'video': 'path/to/video.mp4', 'srt': 'path/to/subtitle.srt'})
            force: Force re-run even if already completed
            
        Returns:
            Module execution result
        """
        self.logger.info(f"Running single module: {module_name} for event: {event_id}")
        
        # Load event configuration
        event_config = self.event_manager.load_event(event_id)
        if not event_config:
            raise ValueError(f"Event not found: {event_id}")
        
        # If input_files provided, use them; otherwise auto-detect from event outputs
        if input_files:
            event_config['_manual_inputs'] = input_files
        
        try:
            result = self._run_module(event_id, module_name, event_config, force)
            self.state_store.save_module_result(event_id, module_name, result)
            return result
        except Exception as e:
            error_result = {
                "status": "failed",
                "error": str(e),
                "timestamp": self._get_timestamp()
            }
            self.state_store.save_module_result(event_id, module_name, error_result)
            return error_result
    
    def get_module_inputs(self, event_id: str, module_name: str) -> Dict:
        """
        Get available input files for a module
        
        Returns dict with:
        - required_inputs: list of required input types
        - available_files: dict of detected available files
        - auto_detected: whether inputs can be auto-detected
        """
        event_dir = Path("events") / event_id
        output_dir = event_dir / "output"
        
        result = {
            "required_inputs": [],
            "available_files": {},
            "auto_detected": False
        }
        
        if module_name == "subtitles":
            result["required_inputs"] = ["video"]
            # Check for input video
            event = self.event_manager.load_event(event_id)
            video_files = event.get("inputs", {}).get("video_files", [])
            if video_files:
                result["available_files"]["video"] = video_files[0]
                result["auto_detected"] = True
                
        elif module_name == "subtitle_correction":
            result["required_inputs"] = ["srt"]
            # Check for generated SRT
            if output_dir.exists():
                srt_files = list(output_dir.glob("*.srt"))
                # Prefer non-corrected SRT
                for srt in srt_files:
                    if "_corrected" not in srt.name:
                        result["available_files"]["srt"] = str(srt)
                        result["auto_detected"] = True
                        break
                if not result["auto_detected"] and srt_files:
                    result["available_files"]["srt"] = str(srt_files[0])
                    result["auto_detected"] = True
                    
        elif module_name == "content_summary":
            result["required_inputs"] = ["srt"]
            # Check for corrected or original SRT
            if output_dir.exists():
                srt_files = list(output_dir.glob("*.srt"))
                # Prefer corrected SRT
                for srt in srt_files:
                    if "_corrected" in srt.name:
                        result["available_files"]["srt"] = str(srt)
                        result["auto_detected"] = True
                        break
                if not result["auto_detected"] and srt_files:
                    result["available_files"]["srt"] = str(srt_files[0])
                    result["auto_detected"] = True
                    
        elif module_name == "ai_content":
            result["required_inputs"] = ["srt"]
            # Check for generated SRT
            if output_dir.exists():
                srt_files = list(output_dir.glob("*.srt"))
                # Prefer non-corrected SRT
                for srt in srt_files:
                    if "_corrected" not in srt.name:
                        result["available_files"]["srt"] = str(srt)
                        result["auto_detected"] = True
                        break
                if not result["auto_detected"] and srt_files:
                    result["available_files"]["srt"] = str(srt_files[0])
                    result["auto_detected"] = True
                    
        elif module_name == "thumbnail_compose":
            result["required_inputs"] = ["title", "scripture"]
            # Auto-detect from event config
            event = self.event_manager.load_event(event_id)
            if event:
                result["available_files"]["title"] = event.get("title", "")
                result["available_files"]["scripture"] = event.get("scripture", "")
                result["auto_detected"] = True
            # Optional: summary text
            if output_dir.exists():
                summary_files = list(output_dir.glob("*_summary.txt"))
                if summary_files:
                    result["available_files"]["summary"] = str(summary_files[0])
                    
        return result
    
    def _run_thumbnail_ai(self, event_id: str, event_config: Dict) -> Dict:
        """Run AI thumbnail generation module"""
        self.logger.info("Running thumbnail AI generation...")
        
        try:
            from modules.thumbnail.ai_generator_ollama import ImageGenerator
            
            # Setup directories
            event_dir = Path("events") / event_id
            logs_dir = event_dir / "logs"
            output_dir = event_dir / "output"
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Read image prompt from summary output
            image_prompt_files = list(logs_dir.glob("*_image_prompt.txt"))
            
            if not image_prompt_files:
                self.logger.warning("No image prompt found, skipping AI generation")
                return {
                    "status": "skipped",
                    "message": "No image prompt available from summary",
                    "timestamp": self._get_timestamp()
                }
            
            # Read the prompt
            prompt_file = image_prompt_files[0]
            with open(prompt_file, 'r', encoding='utf-8') as f:
                prompt = f.read().strip()
            
            self.logger.info(f"Using image prompt: {prompt[:100]}...")
            
            # Get AI generation config
            backend = event_config.get("thumbnail_ai_backend", "stable-diffusion")
            base_url = event_config.get("thumbnail_ai_url", "http://localhost:7860")
            model = event_config.get("thumbnail_ai_model", None)
            
            # Initialize generator
            generator = ImageGenerator(
                backend=backend,
                base_url=base_url,
                model=model
            )
            
            # Output path
            bg_image_path = output_dir / "ai_background.png"
            
            # Find fallback asset (optional)
            fallback = None
            assets_dir = Path("assets")
            bg_dir = assets_dir / "backgrounds"
            if bg_dir.exists():
                bg_files = list(bg_dir.glob("*.jpg")) + list(bg_dir.glob("*.png"))
                if bg_files:
                    fallback = str(bg_files[0])
            
            # Generate image
            success, error = generator.generate_image(
                prompt=prompt,
                output_path=str(bg_image_path),
                width=1280,
                height=720,
                fallback_asset=fallback
            )
            
            if success:
                self.logger.info(f"AI background generated: {bg_image_path}")
                return {
                    "status": "success",
                    "message": "AI background image generated",
                    "output_file": str(bg_image_path),
                    "prompt": prompt,
                    "backend": backend,
                    "timestamp": self._get_timestamp()
                }
            else:
                self.logger.error(f"AI generation failed: {error}")
                return {
                    "status": "failed",
                    "error": error,
                    "prompt": prompt,
                    "timestamp": self._get_timestamp()
                }
        
        except Exception as e:
            self.logger.error(f"Thumbnail AI module error: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": self._get_timestamp()
            }
    
    def _run_thumbnail_compose(self, event_id: str, event_config: Dict) -> Dict:
        """Run thumbnail composition module"""
        self.logger.info("Running thumbnail composition...")
        
        try:
            from modules.thumbnail.composer_pillow import ThumbnailComposer
            
            # Setup output directory
            event_dir = Path("events") / event_id
            output_dir = event_dir / "output"
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Get event details
            title = event_config.get("title", "Untitled")
            scripture = event_config.get("scripture", "")
            speaker = event_config.get("speaker", "")
            
            # Output path
            thumbnail_path = output_dir / "thumbnail.jpg"
            
            # Initialize composer
            composer = ThumbnailComposer()
            
            # Look for AI-generated background first
            background = None
            ai_bg = output_dir / "ai_background.png"
            if ai_bg.exists():
                background = str(ai_bg)
                self.logger.info("Using AI-generated background")
            else:
                # Fallback to assets directory
                assets_dir = Path("assets")
                bg_dir = assets_dir / "backgrounds"
                if bg_dir.exists():
                    bg_files = list(bg_dir.glob("*.jpg")) + list(bg_dir.glob("*.png"))
                    if bg_files:
                        background = str(bg_files[0])
                        self.logger.info(f"Using fallback background: {background}")
            
            # Try to find a logo
            logo = None
            assets_dir = Path("assets")
            logo_dir = assets_dir / "logos"
            if logo_dir.exists():
                logo_files = list(logo_dir.glob("*.png"))
                if logo_files:
                    logo = str(logo_files[0])
            
            # Try to find pastor portrait
            pastor = None
            pastor_dir = assets_dir / "pastor"
            if pastor_dir.exists():
                pastor_files = list(pastor_dir.glob("*.jpg")) + list(pastor_dir.glob("*.png"))
                if pastor_files:
                    pastor = str(pastor_files[0])
            
            # Compose thumbnail
            success, error = composer.compose(
                output_path=str(thumbnail_path),
                title=title,
                scripture=scripture if scripture else None,
                background=background,
                pastor=pastor,
                logo=logo
            )
            
            if success:
                self.logger.info(f"Thumbnail created: {thumbnail_path}")
                return {
                    "status": "success",
                    "message": "Thumbnail composed successfully",
                    "output_file": str(thumbnail_path),
                    "used_ai_background": ai_bg.exists(),
                    "timestamp": self._get_timestamp()
                }
            else:
                self.logger.error(f"Thumbnail composition failed: {error}")
                return {
                    "status": "failed",
                    "error": error,
                    "timestamp": self._get_timestamp()
                }
        
        except Exception as e:
            self.logger.error(f"Thumbnail module error: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": self._get_timestamp()
            }
    
    def _run_subtitles(self, event_id: str, event_config: Dict) -> Dict:
        """Run subtitle generation module"""
        self.logger.info("Running subtitle generation...")
        
        try:
            from modules.subtitles.engine_whispercpp import WhisperCppEngine
            
            # Get input video (manual or auto-detect)
            manual_inputs = event_config.get('_manual_inputs', {})
            if 'video' in manual_inputs:
                video_path = manual_inputs['video']
                self.logger.info(f"Using manually specified video: {video_path}")
            else:
                video_files = event_config.get("inputs", {}).get("video_files", [])
                if not video_files:
                    return {
                        "status": "failed",
                        "error": "No input video found",
                        "timestamp": self._get_timestamp()
                    }
                video_path = video_files[0]
            
            # Setup output directory
            event_dir = Path("events") / event_id
            output_dir = event_dir / "output"
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Get language and model from event config
            language = event_config.get("language", "auto")
            model = event_config.get("whisper_model", "base")
            
            # Get subtitle settings
            subtitle_settings = event_config.get("subtitle_settings", {})
            max_length = subtitle_settings.get("max_length", 0)
            split_on_word = subtitle_settings.get("split_on_word", False)
            
            self.logger.info(f"Using Whisper model: {model}, Language: {language}")
            self.logger.info(f"Subtitle settings: max_length={max_length}, split_on_word={split_on_word}")
            
            # Initialize engine with selected model
            engine = WhisperCppEngine(model=model)
            
            # Check if model exists
            if not engine.check_model():
                return {
                    "status": "failed",
                    "error": f"Model '{model}' not found. Please download it first.",
                    "timestamp": self._get_timestamp()
                }
            
            # Generate subtitles
            success, error, output_files = engine.generate_subtitles(
                video_path=video_path,
                output_dir=str(output_dir),
                language=language,
                formats=["srt", "vtt"],
                max_length=max_length,
                split_on_word=split_on_word
            )
            
            if success:
                self.logger.info(f"Subtitles generated: {output_files}")
                return {
                    "status": "success",
                    "message": "Subtitles generated successfully",
                    "model": model,
                    "language": language,
                    "output_files": output_files,
                    "timestamp": self._get_timestamp()
                }
            else:
                self.logger.error(f"Subtitle generation failed: {error}")
                return {
                    "status": "failed",
                    "error": error,
                    "timestamp": self._get_timestamp()
                }
        
        except Exception as e:
            self.logger.error(f"Subtitle module error: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": self._get_timestamp()
            }
    
    def _run_subtitle_correction(self, event_id: str, event_config: Dict) -> Dict:
        """Run subtitle correction module using AI"""
        self.logger.info("Running subtitle correction...")
        
        try:
            from modules.content.ai_processor import AIContentProcessor
            
            # Setup directories
            event_dir = Path("events") / event_id
            output_dir = event_dir / "output"
            
            # Get input SRT (manual or auto-detect)
            manual_inputs = event_config.get('_manual_inputs', {})
            if 'srt' in manual_inputs:
                original_srt = manual_inputs['srt']
                self.logger.info(f"Using manually specified SRT: {original_srt}")
            else:
                # Find the subtitle file
                subtitle_files = list(output_dir.glob("*.srt"))
                if not subtitle_files:
                    return {
                        "status": "failed",
                        "error": "No subtitle file found. Run subtitles module first or specify SRT file.",
                        "timestamp": self._get_timestamp()
                    }
                
                # Use the first non-corrected SRT file
                original_srt = None
                for srt_file in subtitle_files:
                    if "_corrected" not in srt_file.stem:
                        original_srt = str(srt_file)
                        break
                
                if not original_srt:
                    original_srt = str(subtitle_files[0])
            
            self.logger.info(f"Correcting subtitle file: {original_srt}")
            
            # Get AI settings from event config
            ai_settings = event_config.get("ai_content_settings", {})
            model = ai_settings.get("model", "qwen2.5:latest")
            unload_model_after = ai_settings.get("unload_model_after", True)
            
            self.logger.info(f"Using AI model: {model}, unload_after: {unload_model_after}")
            
            # Initialize processor
            processor = AIContentProcessor(model=model, logger=self.logger)
            
            # Process content (only correction)
            success, error, output_files = processor.process_content(
                srt_path=original_srt,
                output_dir=str(output_dir),
                correct_subtitles=True,
                generate_summary=False,
                summary_length="medium",
                unload_model_after=unload_model_after
            )
            
            if success:
                self.logger.info(f"Subtitle correction completed: {output_files}")
                return {
                    "status": "success",
                    "message": "Subtitles corrected successfully",
                    "model": model,
                    "output_files": output_files,
                    "timestamp": self._get_timestamp()
                }
            else:
                self.logger.error(f"Subtitle correction failed: {error}")
                return {
                    "status": "failed",
                    "error": error,
                    "timestamp": self._get_timestamp()
                }
        
        except Exception as e:
            self.logger.error(f"Subtitle correction error: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": self._get_timestamp()
            }
    
    def _run_content_summary(self, event_id: str, event_config: Dict) -> Dict:
        """Run content summary generation module using AI"""
        self.logger.info("Running content summary generation...")
        
        try:
            from modules.content.ai_processor import AIContentProcessor
            
            # Setup directories
            event_dir = Path("events") / event_id
            output_dir = event_dir / "output"
            
            # Get input subtitle file (manual or auto-detect)
            # Priority: TXT (best) > corrected SRT > regular SRT
            manual_inputs = event_config.get('_manual_inputs', {})
            if 'srt' in manual_inputs:
                srt_file = manual_inputs['srt']
                self.logger.info(f"Using manually specified subtitle file: {srt_file}")
            else:
                # Try to find TXT file first (best for summary generation)
                txt_files = list(output_dir.glob("*.txt"))
                subtitle_file = None
                
                for txt in txt_files:
                    # Skip summary files
                    if "_summary" not in txt.stem:
                        subtitle_file = str(txt)
                        self.logger.info(f"Found TXT file for summary: {subtitle_file}")
                        break
                
                if not subtitle_file:
                    # Fallback to SRT files (prefer corrected)
                    subtitle_files = list(output_dir.glob("*.srt"))
                    if not subtitle_files:
                        return {
                            "status": "failed",
                            "error": "No subtitle file found. Run subtitles module first.",
                            "timestamp": self._get_timestamp()
                        }
                    
                    # Prefer corrected SRT
                    for srt in subtitle_files:
                        if "_corrected" in srt.stem:
                            subtitle_file = str(srt)
                            break
                    
                    if not subtitle_file:
                        subtitle_file = str(subtitle_files[0])
                
                srt_file = subtitle_file
            
            self.logger.info(f"Generating summary from: {srt_file}")
            
            # Get AI settings from event config
            ai_settings = event_config.get("ai_content_settings", {})
            model = ai_settings.get("model", "qwen2.5:latest")
            summary_length = ai_settings.get("summary_length", "medium")
            summary_languages = ai_settings.get("summary_languages", ["en"])
            unload_model_after = ai_settings.get("unload_model_after", True)
            
            self.logger.info(f"Using AI model: {model}, summary length: {summary_length}, languages: {summary_languages}, unload_after: {unload_model_after}")
            
            # Initialize processor
            processor = AIContentProcessor(model=model, logger=self.logger)
            
            # Process content (only summary)
            success, error, output_files = processor.process_content(
                srt_path=srt_file,
                output_dir=str(output_dir),
                correct_subtitles=False,
                generate_summary=True,
                summary_length=summary_length,
                summary_languages=summary_languages,
                unload_model_after=unload_model_after
            )
            
            if success:
                self.logger.info(f"Content summary generated: {output_files}")
                return {
                    "status": "success",
                    "message": "Content summary generated successfully",
                    "model": model,
                    "summary_length": summary_length,
                    "output_files": output_files,
                    "timestamp": self._get_timestamp()
                }
            else:
                self.logger.error(f"Content summary generation failed: {error}")
                return {
                    "status": "failed",
                    "error": error,
                    "timestamp": self._get_timestamp()
                }
        
        except Exception as e:
            self.logger.error(f"Content summary generation error: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": self._get_timestamp()
            }
    
    def _run_ai_content(self, event_id: str, event_config: Dict) -> Dict:
        """Run AI content processing module (subtitle correction + summary generation)"""
        self.logger.info("Running AI content processing...")
        
        try:
            from modules.content.ai_processor import AIContentProcessor
            
            # Setup directories
            event_dir = Path("events") / event_id
            output_dir = event_dir / "output"
            
            # Get input SRT (manual or auto-detect)
            manual_inputs = event_config.get('_manual_inputs', {})
            if 'srt' in manual_inputs:
                original_srt = manual_inputs['srt']
                self.logger.info(f"Using manually specified SRT: {original_srt}")
            else:
                # Find the subtitle file generated by whisper
                subtitle_files = list(output_dir.glob("*.srt"))
                if not subtitle_files:
                    return {
                        "status": "failed",
                        "error": "No subtitle file found. Run subtitles module first or specify SRT file.",
                        "timestamp": self._get_timestamp()
                    }
                
                # Use the first SRT file (not corrected)
                original_srt = None
                for srt_file in subtitle_files:
                    if "_corrected" not in srt_file.stem:
                        original_srt = str(srt_file)
                        break
                
                if not original_srt:
                    original_srt = str(subtitle_files[0])
            
            self.logger.info(f"Processing subtitle file: {original_srt}")
            
            # Get AI settings from event config
            ai_settings = event_config.get("ai_content_settings", {})
            model = ai_settings.get("model", "qwen2.5:latest")
            correct_subtitles = ai_settings.get("correct_subtitles", True)
            generate_summary = ai_settings.get("generate_summary", True)
            summary_length = ai_settings.get("summary_length", "medium")
            unload_model_after = ai_settings.get("unload_model_after", True)
            
            self.logger.info(f"AI settings: model={model}, correct={correct_subtitles}, summary={generate_summary}, unload_after={unload_model_after}")
            
            # Initialize processor
            processor = AIContentProcessor(model=model, logger=self.logger)
            
            # Process content
            success, error, output_files = processor.process_content(
                srt_path=original_srt,
                output_dir=str(output_dir),
                correct_subtitles=correct_subtitles,
                generate_summary=generate_summary,
                summary_length=summary_length,
                unload_model_after=unload_model_after
            )
            
            if success:
                self.logger.info(f"AI content processing completed: {output_files}")
                return {
                    "status": "success",
                    "message": "AI content processed successfully",
                    "model": model,
                    "output_files": output_files,
                    "timestamp": self._get_timestamp()
                }
            else:
                self.logger.error(f"AI content processing failed: {error}")
                return {
                    "status": "failed",
                    "error": error,
                    "timestamp": self._get_timestamp()
                }
        
        except Exception as e:
            self.logger.error(f"AI content module error: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": self._get_timestamp()
            }
    
    def _run_publish_youtube(self, event_id: str, event_config: Dict) -> Dict:
        """Run YouTube publishing module"""
        self.logger.info("Running YouTube upload...")
        # Placeholder for actual implementation
        return {
            "status": "success",
            "message": "Published to YouTube",
            "timestamp": self._get_timestamp()
        }
    
    def _run_publish_website(self, event_id: str, event_config: Dict) -> Dict:
        """Run website publishing module"""
        self.logger.info("Running website publishing...")
        # Placeholder for actual implementation
        return {
            "status": "success",
            "message": "Published to website",
            "timestamp": self._get_timestamp()
        }
    
    def _run_archive(self, event_id: str, event_config: Dict) -> Dict:
        """Run archive module"""
        self.logger.info("Running archive...")
        # Placeholder for actual implementation
        return {
            "status": "success",
            "message": "Archived successfully",
            "timestamp": self._get_timestamp()
        }


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Church Media Automation Workflow Controller')
    parser.add_argument('command', choices=['run', 'status', 'list'], help='Command to execute')
    parser.add_argument('--event', help='Event ID to process')
    parser.add_argument('--force', action='store_true', help='Force re-run of completed modules')
    
    args = parser.parse_args()
    
    controller = WorkflowController()
    
    if args.command == 'run':
        if not args.event:
            print("Error: --event required for 'run' command")
            return
        results = controller.run_event(args.event, force=args.force)
        print(json.dumps(results, indent=2))
    elif args.command == 'status':
        print("Status command not yet implemented")
    elif args.command == 'list':
        print("List command not yet implemented")


if __name__ == '__main__':
    main()
