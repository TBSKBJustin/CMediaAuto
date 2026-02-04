"""
Event Manager - Create, load, and update events
"""

import json
import os
from pathlib import Path
from typing import Dict, Optional, List
from datetime import datetime


class EventManager:
    """Manages event creation, loading, and updates"""
    
    def __init__(self, events_dir: str = "events"):
        self.events_dir = Path(events_dir)
        self.events_dir.mkdir(exist_ok=True)
    
    def create_event(
        self,
        title: str,
        speaker: str,
        date: Optional[str] = None,
        time: Optional[str] = None,
        series: Optional[str] = None,
        scripture: Optional[str] = None,
        language: str = "auto",
        whisper_model: str = "base",
        subtitle_max_length: int = 84,
        subtitle_split_on_word: bool = True,
        ai_model: str = "qwen2.5:latest",
        ai_correct_subtitles: bool = True,
        ai_generate_summary: bool = True,
        ai_summary_length: str = "medium",
        ai_summary_languages: List[str] = None,
        ai_unload_model_after: bool = True,
        thumbnail_ai_backend: str = "ollama",
        thumbnail_ai_url: str = "http://localhost:11434",
        thumbnail_ai_model: Optional[str] = "x/z-image-turbo",
        comfyui_server_url: str = "http://127.0.0.1:8188",
        comfyui_width: int = 1280,
        comfyui_height: int = 720,
        comfyui_steps: int = 9,
        thumbnail_settings: Optional[Dict[str, Any]] = None,
        modules: Optional[Dict[str, bool]] = None
    ) -> str:
        """
        Create a new event with the specified configuration
        
        Args:
            title: Event/sermon title
            speaker: Speaker/pastor name
            date: Event date (YYYY-MM-DD), defaults to today
            time: Event time (HHMM), defaults to current time
            series: Sermon series name (optional)
            scripture: Scripture reference (optional)
            language: Language code (default: auto)
            whisper_model: Whisper model size (default: base)
            subtitle_max_length: Max characters per subtitle line
            subtitle_split_on_word: Split on word boundaries
            ai_model: Ollama model for AI content processing
            ai_correct_subtitles: Enable subtitle correction
            ai_generate_summary: Enable summary generation
            ai_summary_length: Summary length (short/medium/long)
            ai_summary_languages: List of language codes for summaries
            ai_unload_model_after: Unload model from memory after processing
            thumbnail_ai_backend: Image generation backend (stable-diffusion/comfyui/fallback)
            thumbnail_ai_url: API URL for image generation service
            thumbnail_ai_model: Model name for image generation (optional)
            comfyui_server_url: ComfyUI server URL
            comfyui_width: Image width for ComfyUI
            comfyui_height: Image height for ComfyUI
            comfyui_steps: Sampling steps for ComfyUI
            thumbnail_settings: Thumbnail composition settings (fonts, sizes, elements, images)
            modules: Module toggle configuration (optional)
            
        Returns:
            event_id: Generated event identifier
        """
        # Generate event ID
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        if not time:
            time = datetime.now().strftime("%H%M")
        
        # Default summary languages
        if ai_summary_languages is None:
            ai_summary_languages = ["en"]
        
        # Create safe slug from title
        slug = self._slugify(title)
        event_id = f"{date}_{time}_{slug}"
        
        # Default module configuration
        # Execution order: subtitles → correction → summary → thumbnail_ai → thumbnail_compose
        if modules is None:
            modules = {
                "subtitles": True,
                "subtitle_correction": True,
                "content_summary": True,
                "thumbnail_ai": True,
                "thumbnail_compose": True,
                "ai_content": False,  # Legacy combined module (disabled by default)
                "publish_youtube": False,
                "publish_website": False,
                "archive": False,
                "live_control": False,
                "ingest_obs_monitor": True
            }
        
        # Event configuration
        event_config = {
            "event_id": event_id,
            "title": title,
            "series": series,
            "subtitle_settings": {
                "max_length": subtitle_max_length,
                "split_on_word": subtitle_split_on_word
            },
            "ai_content_settings": {
                "model": ai_model,
                "correct_subtitles": ai_correct_subtitles,
                "generate_summary": ai_generate_summary,
                "summary_length": ai_summary_length,
                "summary_languages": ai_summary_languages,
                "unload_model_after": ai_unload_model_after
            },
            "thumbnail_ai_backend": thumbnail_ai_backend,
            "thumbnail_ai_url": thumbnail_ai_url,
            "thumbnail_ai_model": thumbnail_ai_model,
            "comfyui_server_url": comfyui_server_url,
            "comfyui_width": comfyui_width,
            "comfyui_height": comfyui_height,
            "comfyui_steps": comfyui_steps,
            "thumbnail_settings": thumbnail_settings or {},
            "scripture": scripture,
            "speaker": speaker,
            "language": language,
            "whisper_model": whisper_model,
            "date": date,
            "time": time,
            "created_at": datetime.now().isoformat(),
            "inputs": {
                "video_files": []
            },
            "modules": modules
        }
        
        # Create event directory structure
        event_path = self.events_dir / event_id
        event_path.mkdir(parents=True, exist_ok=True)
        (event_path / "input").mkdir(exist_ok=True)
        (event_path / "output").mkdir(exist_ok=True)
        (event_path / "logs").mkdir(exist_ok=True)
        
        # Save event configuration
        config_file = event_path / "event.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(event_config, f, indent=2, ensure_ascii=False)
        
        return event_id
    
    def load_event(self, event_id: str) -> Optional[Dict]:
        """Load event configuration from disk"""
        event_path = self.events_dir / event_id / "event.json"
        if not event_path.exists():
            return None
        
        with open(event_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def update_event(self, event_id: str, updates: Dict) -> bool:
        """
        Update event configuration
        
        Args:
            event_id: Event identifier
            updates: Dictionary of fields to update
            
        Returns:
            Success status
        """
        event_config = self.load_event(event_id)
        if not event_config:
            return False
        
        # Merge updates
        event_config.update(updates)
        event_config["updated_at"] = datetime.now().isoformat()
        
        # Save updated configuration
        event_path = self.events_dir / event_id / "event.json"
        with open(event_path, 'w', encoding='utf-8') as f:
            json.dump(event_config, f, indent=2, ensure_ascii=False)
        
        return True
    
    def add_video_input(self, event_id: str, video_path: str) -> bool:
        """Add a video file to event inputs"""
        event_config = self.load_event(event_id)
        if not event_config:
            return False
        
        if video_path not in event_config["inputs"]["video_files"]:
            event_config["inputs"]["video_files"].append(video_path)
            return self.update_event(event_id, event_config)
        
        return True
    
    def list_events(self) -> List[str]:
        """List all event IDs"""
        if not self.events_dir.exists():
            return []
        
        return [d.name for d in self.events_dir.iterdir() if d.is_dir()]
    
    def _slugify(self, text: str) -> str:
        """Convert text to URL-safe slug"""
        # Simple slugification
        text = text.lower()
        text = ''.join(c if c.isalnum() or c in ' -_' else '' for c in text)
        text = '-'.join(text.split())
        return text[:50]  # Limit length
