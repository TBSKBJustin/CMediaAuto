"""
Subtitle Engine - whisper.cpp implementation (Primary engine)
Updated to be the default subtitle generation engine
"""

import subprocess
import logging
import yaml
import os
from pathlib import Path
from typing import Optional, List, Dict


class WhisperCppEngine:
    """Subtitle generation using whisper.cpp (default engine)"""
    
    SUPPORTED_MODELS = {
        'tiny': 'ggml-tiny.bin',
        'base': 'ggml-base.bin',
        'small': 'ggml-small.bin',
        'medium': 'ggml-medium.bin',
        'large': 'ggml-large-v3.bin'
    }
    
    def __init__(self, model: str = "base", models_dir: str = "models", whisper_bin: str = "whisper", config_path: str = "config/config.yaml"):
        """
        Initialize whisper.cpp engine
        
        Args:
            model: Model size (tiny, base, small, medium, large)
            models_dir: Directory containing GGML models
            whisper_bin: Path to whisper.cpp executable
            config_path: Path to configuration file
        """
        self.model_name = model
        self.models_dir = Path(models_dir)
        self.logger = self._setup_logger()
        
        # Load config
        config_data = self._load_config(config_path)
        
        # Load custom whisper binary path from config if available
        custom_bin = config_data.get('whisper_bin')
        self.whisper_bin = custom_bin if custom_bin else whisper_bin
        
        # Load custom model path from config if available
        custom_model = config_data.get('model_path')
        if custom_model:
            model_path = Path(custom_model)
            # Convert relative path to absolute
            if not model_path.is_absolute():
                model_path = Path.cwd() / model_path
            self.model_path = model_path
        else:
            # Build model path from models_dir + model name
            model_file = self.SUPPORTED_MODELS.get(model, self.SUPPORTED_MODELS['base'])
            self.model_path = self.models_dir / model_file
        
        # Check if whisper.cpp is available
        self.available = self._check_availability()
    
    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger("WhisperCppEngine")
        logger.setLevel(logging.INFO)
        return logger
    
    def _load_config(self, config_path: str) -> Dict:
        """Load whisper.cpp configuration from config file"""
        result = {}
        try:
            if not os.path.exists(config_path):
                return result
            
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
            
            whispercpp_config = config.get('modules', {}).get('subtitles', {}).get('whispercpp', {})
            
            # Load custom binary path
            custom_path = whispercpp_config.get('custom_path') or whispercpp_config.get('whisper_bin')
            if custom_path and os.path.exists(custom_path):
                self.logger.info(f"Using custom whisper.cpp binary: {custom_path}")
                result['whisper_bin'] = custom_path
            
            # Load custom model path
            model_path = whispercpp_config.get('model_path')
            if model_path:
                # Support both absolute and relative paths
                model_path_obj = Path(model_path)
                if model_path_obj.is_absolute():
                    if model_path_obj.exists():
                        self.logger.info(f"Using custom model path: {model_path}")
                        result['model_path'] = model_path
                    else:
                        self.logger.warning(f"Custom model path does not exist: {model_path}")
                else:
                    # Relative path - resolve from project root
                    if model_path_obj.exists():
                        self.logger.info(f"Using model path: {model_path}")
                        result['model_path'] = model_path
            
        except Exception as e:
            self.logger.warning(f"Failed to load config: {e}")
        
        return result
    
    def _check_availability(self) -> bool:
        """Check if whisper.cpp is installed"""
        try:
            result = subprocess.run(
                [self.whisper_bin, '--help'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def check_model(self) -> bool:
        """Check if model file exists"""
        return self.model_path.exists()
    
    def generate_subtitles(
        self,
        video_path: str,
        output_dir: str,
        language: str = "auto",
        formats: Optional[List[str]] = None,
        translate_to_english: bool = False,
        max_length: int = 0,
        split_on_word: bool = False
    ) -> tuple[bool, Optional[str], Dict[str, str]]:
        """
        Generate subtitles from video file
        
        Args:
            video_path: Path to input video file
            output_dir: Directory to save subtitle files
            language: Language code (e.g., "en", "zh", "auto")
            formats: List of output formats (e.g., ["srt", "vtt"])
            translate_to_english: Translate to English
            max_length: Maximum segment length in characters (0 = no limit)
            split_on_word: Split on word boundaries rather than tokens
            
        Returns:
            (success, error_message, output_files)
        """
        if not self.available:
            return False, "whisper.cpp is not installed", {}
        
        if not self.check_model():
            return False, f"Model not found: {self.model_path}", {}
        
        if formats is None:
            formats = ["srt", "vtt", "txt"]
        
        # Try direct transcription first
        success, error, output = self._transcribe(
            video_path, output_dir, language, formats, translate_to_english,
            max_length, split_on_word
        )
        
        if success:
            return True, None, output
        
        # Fallback: extract audio and retry
        self.logger.warning(f"Direct transcription failed: {error}")
        self.logger.info("Falling back to audio extraction")
        
        audio_path = self._extract_audio(video_path, output_dir)
        if not audio_path:
            return False, "Failed to extract audio", {}
        
        success, error, output = self._transcribe(
            audio_path, output_dir, language, formats, translate_to_english,
            max_length, split_on_word
        )
        
        return success, error, output
    
    def _transcribe(
        self,
        input_path: str,
        output_dir: str,
        language: str,
        formats: List[str],
        translate: bool,
        max_length: int = 0,
        split_on_word: bool = False
    ) -> tuple[bool, Optional[str], Dict[str, str]]:
        """Transcribe audio/video file"""
        try:
            output_dir_path = Path(output_dir)
            output_dir_path.mkdir(parents=True, exist_ok=True)
            
            # Sanitize base name to avoid issues with spaces
            base_name = Path(input_path).stem.replace(' ', '_')
            output_files = {}
            
            # Build whisper.cpp command
            cmd = [
                self.whisper_bin,
                "-m", str(self.model_path.absolute()),  # Use absolute path
                "-f", str(Path(input_path).absolute()),  # Use absolute path
            ]
            
            # Set language
            if language != "auto":
                cmd.extend(["-l", language])
            
            # Translation
            if translate:
                cmd.append("-tr")
            
            # Subtitle segmentation settings
            if max_length > 0:
                cmd.extend(["--max-len", str(max_length)])
            
            if split_on_word:
                cmd.append("-sow")
            
            # Output formats
            format_flags = {
                'srt': '-osrt',
                'vtt': '-ovtt',
                'txt': '-otxt',
                'json': '-oj'
            }
            
            for fmt in formats:
                if fmt in format_flags:
                    cmd.append(format_flags[fmt])
            
            # Add threading options
            cmd.extend([
                "-t", "4",  # 4 threads
                "-p", "1",  # 1 processor
            ])
            
            # Run whisper.cpp
            self.logger.info(f"Running whisper.cpp: {' '.join(cmd)}")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=3600,  # 1 hour timeout
                cwd=output_dir_path
            )
            
            if result.returncode != 0:
                self.logger.error(f"whisper.cpp failed: {result.stderr}")
                return False, f"whisper.cpp error: {result.stderr[:200]}", {}
            
            # Collect output files
            # whisper.cpp outputs files based on the input filename
            # For example: input.wav.srt, input.wav.vtt
            input_filename = Path(input_path).name
            
            for fmt in formats:
                # Try different possible output names
                possible_names = [
                    output_dir_path / f"{input_filename}.{fmt}",  # audio.wav.srt
                    output_dir_path / f"{base_name}.{fmt}",       # audio.srt
                    output_dir_path / Path(input_path).name.replace(Path(input_path).suffix, f".{fmt}"),  # audio.srt (without .wav)
                ]
                
                for output_path in possible_names:
                    if output_path.exists():
                        output_files[fmt] = str(output_path)
                        self.logger.info(f"Found {fmt} file: {output_path}")
                        break
            
            if not output_files:
                # List all files in output directory for debugging
                all_files = list(output_dir_path.iterdir())
                self.logger.warning(f"No subtitle files found. Files in output dir: {[f.name for f in all_files]}")
                return False, "No output files generated", {}
            
            self.logger.info(f"Generated subtitles: {list(output_files.keys())}")
            return True, None, output_files
        
        except subprocess.TimeoutExpired:
            return False, "Transcription timeout (>1 hour)", {}
        
        except Exception as e:
            self.logger.error(f"Transcription error: {e}")
            return False, str(e), {}
    
    def _extract_audio(self, video_path: str, output_dir: str) -> Optional[str]:
        """Extract audio from video using ffmpeg"""
        try:
            # Sanitize filename to avoid issues with spaces
            stem = Path(video_path).stem.replace(' ', '_')
            audio_path = Path(output_dir) / f"{stem}_audio.wav"
            
            cmd = [
                "ffmpeg",
                "-i", video_path,
                "-vn",  # No video
                "-acodec", "pcm_s16le",  # 16-bit PCM
                "-ar", "16000",  # 16kHz sample rate (whisper requirement)
                "-ac", "1",  # Mono
                "-y",  # Overwrite
                str(audio_path)
            ]
            
            self.logger.info("Extracting audio with ffmpeg")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600
            )
            
            if result.returncode != 0:
                self.logger.error(f"Audio extraction failed: {result.stderr}")
                return None
            
            return str(audio_path)
        
        except Exception as e:
            self.logger.error(f"Audio extraction error: {e}")
            return None
    
    @staticmethod
    def list_available_models() -> List[str]:
        """List available model sizes"""
        return list(WhisperCppEngine.SUPPORTED_MODELS.keys())


def main():
    """CLI entry point for testing"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Subtitle Generation (whisper.cpp)')
    parser.add_argument('--video', required=True, help='Input video path')
    parser.add_argument('--output-dir', required=True, help='Output directory')
    parser.add_argument('--model', default='base', 
                       choices=WhisperCppEngine.list_available_models(),
                       help='Whisper model size')
    parser.add_argument('--language', default='auto', help='Language code (en, zh, etc.)')
    parser.add_argument('--formats', nargs='+', default=['srt', 'vtt'], 
                       choices=['srt', 'vtt', 'txt', 'json'],
                       help='Output formats')
    parser.add_argument('--translate', action='store_true', help='Translate to English')
    parser.add_argument('--models-dir', default='models', help='Models directory')
    
    args = parser.parse_args()
    
    engine = WhisperCppEngine(
        model=args.model,
        models_dir=args.models_dir
    )
    
    success, error, output_files = engine.generate_subtitles(
        args.video,
        args.output_dir,
        args.language,
        args.formats,
        args.translate
    )
    
    if success:
        print("✓ Subtitles generated:")
        for fmt, path in output_files.items():
            print(f"  {fmt}: {path}")
    else:
        print(f"✗ Failed: {error}")


if __name__ == '__main__':
    main()
