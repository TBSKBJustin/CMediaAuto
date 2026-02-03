"""
Subtitle Engine - WhisperX implementation (optional alternative)
"""

import logging
from pathlib import Path
from typing import Optional, List


class WhisperXEngine:
    """Subtitle generation using WhisperX (with word-level alignment)"""
    
    def __init__(self, model_name: str = "base", device: str = "cpu"):
        """
        Initialize WhisperX engine
        
        Args:
            model_name: Whisper model size (tiny, base, small, medium, large)
            device: Device to use (cpu, cuda)
        """
        self.model_name = model_name
        self.device = device
        self.logger = self._setup_logger()
        
        # Check if whisperx is available
        try:
            import whisperx
            self.whisperx = whisperx
            self.available = True
        except ImportError:
            self.logger.warning("WhisperX not installed. Install with: pip install whisperx")
            self.available = False
    
    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger("WhisperXEngine")
        logger.setLevel(logging.INFO)
        return logger
    
    def generate_subtitles(
        self,
        video_path: str,
        output_dir: str,
        language: str = "auto",
        formats: Optional[List[str]] = None,
        align: bool = True,
        diarize: bool = False
    ) -> tuple[bool, Optional[str], dict]:
        """
        Generate subtitles with word-level alignment
        
        Args:
            video_path: Path to input video file
            output_dir: Directory to save subtitle files
            language: Language code (e.g., "en", "zh", "auto")
            formats: List of output formats (e.g., ["srt", "vtt"])
            align: Enable word-level alignment
            diarize: Enable speaker diarization
            
        Returns:
            (success, error_message, output_files)
        """
        if not self.available:
            return False, "WhisperX not installed", {}
        
        if formats is None:
            formats = ["srt", "vtt", "txt"]
        
        self.logger.info(f"Generating subtitles with WhisperX: {video_path}")
        
        try:
            # Load model
            model = self.whisperx.load_model(
                self.model_name,
                self.device,
                compute_type="float32" if self.device == "cpu" else "float16"
            )
            
            # Transcribe
            audio = self.whisperx.load_audio(video_path)
            result = model.transcribe(audio, language=language if language != "auto" else None)
            
            # Align words
            if align and result.get("language"):
                model_a, metadata = self.whisperx.load_align_model(
                    language_code=result["language"],
                    device=self.device
                )
                result = self.whisperx.align(
                    result["segments"],
                    model_a,
                    metadata,
                    audio,
                    self.device
                )
            
            # Diarization (speaker identification)
            if diarize:
                diarize_model = self.whisperx.DiarizationPipeline(device=self.device)
                diarize_segments = diarize_model(audio)
                result = self.whisperx.assign_word_speakers(diarize_segments, result)
            
            # Save outputs
            output_files = {}
            base_name = Path(video_path).stem
            output_path = Path(output_dir)
            
            for fmt in formats:
                file_path = output_path / f"{base_name}.{fmt}"
                
                if fmt == "srt":
                    self._save_srt(result["segments"], file_path)
                elif fmt == "vtt":
                    self._save_vtt(result["segments"], file_path)
                elif fmt == "txt":
                    self._save_txt(result["segments"], file_path)
                elif fmt == "json":
                    self._save_json(result, file_path)
                
                output_files[fmt] = str(file_path)
            
            return True, None, output_files
        
        except Exception as e:
            self.logger.error(f"WhisperX generation failed: {e}")
            return False, str(e), {}
    
    def _save_srt(self, segments: List[dict], output_path: Path):
        """Save subtitles in SRT format"""
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, segment in enumerate(segments, start=1):
                start = self._format_timestamp_srt(segment['start'])
                end = self._format_timestamp_srt(segment['end'])
                text = segment['text'].strip()
                
                f.write(f"{i}\n")
                f.write(f"{start} --> {end}\n")
                f.write(f"{text}\n\n")
    
    def _save_vtt(self, segments: List[dict], output_path: Path):
        """Save subtitles in WebVTT format"""
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("WEBVTT\n\n")
            
            for segment in segments:
                start = self._format_timestamp_vtt(segment['start'])
                end = self._format_timestamp_vtt(segment['end'])
                text = segment['text'].strip()
                
                f.write(f"{start} --> {end}\n")
                f.write(f"{text}\n\n")
    
    def _save_txt(self, segments: List[dict], output_path: Path):
        """Save subtitles as plain text (no timestamps)"""
        with open(output_path, 'w', encoding='utf-8') as f:
            for segment in segments:
                text = segment['text'].strip()
                f.write(f"{text}\n")
    
    def _save_json(self, result: dict, output_path: Path):
        """Save full result as JSON"""
        import json
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
    
    def _format_timestamp_srt(self, seconds: float) -> str:
        """Format timestamp for SRT (HH:MM:SS,mmm)"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
    
    def _format_timestamp_vtt(self, seconds: float) -> str:
        """Format timestamp for WebVTT (HH:MM:SS.mmm)"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def main():
    """CLI entry point for testing"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Subtitle Generation (WhisperX)')
    parser.add_argument('--video', required=True, help='Input video path')
    parser.add_argument('--output-dir', required=True, help='Output directory')
    parser.add_argument('--model', default='base', help='Whisper model size')
    parser.add_argument('--device', default='cpu', help='Device (cpu/cuda)')
    parser.add_argument('--language', default='auto', help='Language code')
    parser.add_argument('--formats', nargs='+', default=['srt', 'vtt'], help='Output formats')
    parser.add_argument('--no-align', action='store_true', help='Disable word alignment')
    parser.add_argument('--diarize', action='store_true', help='Enable speaker diarization')
    
    args = parser.parse_args()
    
    engine = WhisperXEngine(model_name=args.model, device=args.device)
    
    success, error, output_files = engine.generate_subtitles(
        args.video,
        args.output_dir,
        args.language,
        args.formats,
        align=not args.no_align,
        diarize=args.diarize
    )
    
    if success:
        print("✓ Subtitles generated:")
        for fmt, path in output_files.items():
            print(f"  {fmt}: {path}")
    else:
        print(f"✗ Failed: {error}")


if __name__ == '__main__':
    main()
