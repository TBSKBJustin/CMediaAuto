"""
AI Content Processor using Ollama
Corrects subtitles and generates summaries for downstream tasks
"""
import logging
import json
import re
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import requests


class AIContentProcessor:
    """Uses Ollama to correct subtitles and generate content summaries"""
    
    def __init__(
        self,
        model: str = "qwen2.5:latest",
        host: str = "http://localhost:11434",
        logger: Optional[logging.Logger] = None
    ):
        self.model = model
        self.host = host
        self.logger = logger or logging.getLogger(__name__)
        self.api_url = f"{host}/api/generate"
        
    def _check_ollama_available(self) -> bool:
        """Check if Ollama service is available"""
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=5)
            return response.status_code == 200
        except Exception as e:
            self.logger.error(f"Ollama not available: {e}")
            return False
    
    def _check_model_available(self) -> bool:
        """Check if the specified model is available"""
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                return any(m.get("name") == self.model for m in models)
            return False
        except Exception as e:
            self.logger.error(f"Failed to check model: {e}")
            return False
    
    def _call_ollama(self, prompt: str, system_prompt: str = "", keep_alive: str = "5m") -> Optional[str]:
        """Call Ollama API and get response
        
        Args:
            prompt: The prompt to send to the model
            system_prompt: System prompt for the model
            keep_alive: Duration to keep model in memory after request (default: "5m")
                        Set to "0" to unload immediately after request
                        Examples: "5m" (5 minutes), "1h" (1 hour), "0" (unload immediately)
        """
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "keep_alive": keep_alive
            }
            if system_prompt:
                payload["system"] = system_prompt
            
            response = requests.post(self.api_url, json=payload, timeout=300)
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "").strip()
            else:
                self.logger.error(f"Ollama API error: {response.status_code}")
                return None
        except Exception as e:
            self.logger.error(f"Failed to call Ollama: {e}")
            return None
    
    def unload_model(self) -> bool:
        """Explicitly unload the model from memory
        
        Returns:
            True if successful, False otherwise
        """
        try:
            self.logger.info(f"Unloading model {self.model} from memory")
            payload = {
                "model": self.model,
                "prompt": "",
                "keep_alive": "0"
            }
            response = requests.post(self.api_url, json=payload, timeout=10)
            return response.status_code == 200
        except Exception as e:
            self.logger.error(f"Failed to unload model: {e}")
            return False
    
    def _parse_srt(self, srt_path: str) -> List[Dict]:
        """Parse SRT file into structured data"""
        with open(srt_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return self._parse_srt_from_text(content)
    
    def _parse_srt_from_text(self, content: str) -> List[Dict]:
        """Parse SRT text content into structured data"""
        # Split by double newline to get subtitle blocks
        blocks = re.split(r'\n\n+', content.strip())
        subtitles = []
        
        for block in blocks:
            lines = block.strip().split('\n')
            if len(lines) >= 3:
                try:
                    index = int(lines[0])
                    timestamp = lines[1]
                    text = '\n'.join(lines[2:])
                    subtitles.append({
                        'index': index,
                        'timestamp': timestamp,
                        'text': text
                    })
                except ValueError:
                    continue
        
        return subtitles
    
    def _write_srt(self, subtitles: List[Dict], output_path: str):
        """Write structured data back to SRT format"""
        with open(output_path, 'w', encoding='utf-8') as f:
            for sub in subtitles:
                f.write(f"{sub['index']}\n")
                f.write(f"{sub['timestamp']}\n")
                f.write(f"{sub['text']}\n\n")
    
    def correct_subtitles(
        self,
        srt_path: str,
        output_dir: str,
        batch_size: int = 10
    ) -> Tuple[bool, Optional[str], Dict[str, str]]:
        """
        Correct subtitles using AI
        
        Args:
            srt_path: Path to original SRT file
            output_dir: Directory to save corrected SRT
            batch_size: Number of subtitle segments to correct at once
            
        Returns:
            (success, error_message, output_files)
        """
        try:
            if not self._check_ollama_available():
                return False, "Ollama service not available", {}
            
            if not self._check_model_available():
                return False, f"Model {self.model} not available", {}
            
            self.logger.info(f"Correcting subtitles: {srt_path}")
            
            # Parse SRT
            subtitles = self._parse_srt(srt_path)
            if not subtitles:
                return False, "Failed to parse SRT file", {}
            
            self.logger.info(f"Parsed {len(subtitles)} subtitle segments")
            
            # Use batch processing for better reliability (smaller batches = better format compliance)
            corrected_subtitles = []
            batch_size = 10  # Process 10 subtitle blocks at a time
            
            for batch_start in range(0, len(subtitles), batch_size):
                batch_end = min(batch_start + batch_size, len(subtitles))
                batch = subtitles[batch_start:batch_end]
                
                # Convert batch to SRT text
                srt_text = ""
                for sub in batch:
                    srt_text += f"{sub['index']}\n"
                    srt_text += f"{sub['timestamp']}\n"
                    srt_text += f"{sub['text']}\n\n"
                
                # Prepare strict prompt with example
                system_prompt = """You are a subtitle text correction assistant. Fix ONLY the subtitle text content while preserving the exact SRT format.

CRITICAL RULES:
1) Keep the EXACT number of subtitle blocks
2) Keep ALL timestamps unchanged
3) Keep ALL index numbers unchanged  
4) Keep ALL blank lines between blocks
5) ONLY fix: typos, ASR errors, grammar, unnatural wording
6) Output VALID SRT format

Example input:
1
00:00:00,000 --> 00:00:02,300
李政階妹平安

2
00:00:02,300 --> 00:00:05,900
感謝祝我們來到他的面前

Example output (same structure, corrected text):
1
00:00:00,000 --> 00:00:02,300
李政道妹平安

2
00:00:02,300 --> 00:00:05,900
感謝主我們來到他的面前"""
                
                prompt = f"""Correct the subtitle text. Output MUST have exactly {len(batch)} blocks with same timestamps and numbers.

Input SRT ({len(batch)} blocks):
<<<
{srt_text.strip()}
>>>

Output corrected SRT (MUST be {len(batch)} blocks, same format):"""
                
                self.logger.info(f"Correcting batch {batch_start//batch_size + 1} ({len(batch)} segments)")
                
                corrected_batch_text = self._call_ollama(prompt, system_prompt)
                
                if not corrected_batch_text:
                    self.logger.warning(f"AI correction failed for batch, keeping original")
                    corrected_subtitles.extend(batch)
                    continue
                
                # Parse AI response
                try:
                    corrected_batch = self._parse_srt_from_text(corrected_batch_text)
                    
                    # Strict validation: must match batch size
                    if len(corrected_batch) != len(batch):
                        self.logger.warning(
                            f"Batch structure mismatch (expected {len(batch)}, got {len(corrected_batch)}), "
                            f"keeping original batch"
                        )
                        corrected_subtitles.extend(batch)
                    else:
                        # Verify timestamps match
                        timestamps_match = all(
                            orig['timestamp'] == corr['timestamp'] 
                            for orig, corr in zip(batch, corrected_batch)
                        )
                        if not timestamps_match:
                            self.logger.warning("Timestamps changed in AI output, keeping original batch")
                            corrected_subtitles.extend(batch)
                        else:
                            # Success - use corrected batch
                            corrected_subtitles.extend(corrected_batch)
                            self.logger.info(f"Batch corrected successfully")
                            
                except Exception as e:
                    self.logger.error(f"Failed to parse batch response: {e}, keeping original")
                    corrected_subtitles.extend(batch)
            
            # Write corrected SRT
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            base_name = Path(srt_path).stem
            if base_name.endswith('_audio'):
                base_name = base_name[:-6]
            
            corrected_srt = output_path / f"{base_name}_corrected.srt"
            self._write_srt(corrected_subtitles, str(corrected_srt))
            
            self.logger.info(f"Corrected SRT saved to: {corrected_srt}")
            
            return True, None, {"corrected_srt": str(corrected_srt)}
            
        except Exception as e:
            error_msg = f"Subtitle correction failed: {str(e)}"
            self.logger.error(error_msg, exc_info=True)
            return False, error_msg, {}
    
    def generate_summary(
        self,
        srt_path: str,
        output_dir: str,
        summary_length: str = "medium",
        languages: List[str] = None
    ) -> Tuple[bool, Optional[str], Dict[str, str]]:
        """
        Generate content summary from subtitles in multiple languages
        
        Args:
            srt_path: Path to subtitle file (SRT, TXT, or VTT - TXT is preferred for better text extraction)
            output_dir: Directory to save summary
            summary_length: "short", "medium", or "long"
            languages: List of language codes (e.g., ["en", "zh", "es"]). If None, defaults to ["en"]
            
        Returns:
            (success, error_message, output_files)
        """
        try:
            if not self._check_ollama_available():
                return False, "Ollama service not available", {}
            
            if not self._check_model_available():
                return False, f"Model {self.model} not available", {}
            
            # Default to English if no languages specified
            if not languages:
                languages = ["en"]
            
            # Language mapping
            language_names = {
                "en": "English",
                "zh": "Chinese (中文)",
                "zh-CN": "Simplified Chinese (简体中文)",
                "zh-TW": "Traditional Chinese (繁體中文)",
                "es": "Spanish (Español)",
                "fr": "French (Français)",
                "de": "German (Deutsch)",
                "ja": "Japanese (日本語)",
                "ko": "Korean (한국어)",
                "pt": "Portuguese (Português)",
                "ru": "Russian (Русский)",
                "ar": "Arabic (العربية)",
                "hi": "Hindi (हिन्दी)"
            }
            
            self.logger.info(f"Generating summary from: {srt_path} in languages: {languages}")
            
            # Try to find and use TXT file first (better text extraction)
            source_file = Path(srt_path)
            txt_file = source_file.with_suffix('.txt')
            
            if txt_file.exists():
                self.logger.info(f"Found TXT file, using it for better text extraction: {txt_file}")
                with open(txt_file, 'r', encoding='utf-8') as f:
                    full_text = f.read()
                source_file = txt_file
            else:
                # Fallback to parsing SRT/VTT file
                self.logger.info(f"No TXT file found, parsing subtitle file: {srt_path}")
                subtitles = self._parse_srt(srt_path)
                if not subtitles:
                    return False, "Failed to parse subtitle file", {}
                
                full_text = ' '.join([sub['text'] for sub in subtitles])
            
            # Determine summary length instructions
            length_instructions = {
                "short": "a concise summary in 2-3 paragraphs (150-200 words)",
                "medium": "a comprehensive summary in 4-5 paragraphs (300-400 words)",
                "long": "a detailed summary in 6-8 paragraphs (500-600 words)"
            }
            
            length_instruction = length_instructions.get(summary_length, length_instructions["medium"])
            
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            base_name = source_file.stem
            if base_name.endswith('_corrected'):
                base_name = base_name[:-10]
            elif base_name.endswith('_audio'):
                base_name = base_name[:-6]
            
            output_files = {}
            
            # Generate summary for each requested language
            for lang_code in languages:
                lang_name = language_names.get(lang_code, lang_code)
                self.logger.info(f"Generating {lang_name} summary...")
                
                system_prompt = f"""You are creating a faithful summary of a sermon transcript.

Your task: Produce a "compressed sermon notes version" — not a rewritten sermon and not a theological commentary.

Write the entire summary in {lang_name}."""
                
                prompt = f"""Please create {length_instruction} of the following sermon, following these requirements strictly:

1. Summarize only what is explicitly stated in the sermon. Do not add biblical interpretations, theological views, or personal explanations that were not mentioned by the speaker.

2. Do not expand, elaborate, or systematize the content theologically. Only compress what the preacher already said.

3. If the preacher uses examples, illustrations, or background explanations, they may be briefly retained, but do not introduce any new examples or background information.

4. Do not include application-style conclusions such as "this shows that," "this symbolizes," or "this reminds us," unless the preacher explicitly said them.

5. Organize the summary into clear paragraphs for readability, but ensure the meaning remains completely faithful to the original sermon.

6. If a section of the sermon is long, extract only its core point without inferring any unstated implications.

7. If something in the sermon is presented merely as an example or illustration, do not turn it into a separate main point; it may only be mentioned briefly within the relevant section.

8. Do not elevate the preacher's illustrations into formal theological concepts or doctrinal statements.

IMPORTANT: Write the entire summary in {lang_name}.

Sermon transcript:
{full_text}

Summary in {lang_name}:"""
                
                summary_text = self._call_ollama(prompt, system_prompt)
                
                if not summary_text:
                    self.logger.warning(f"Failed to generate {lang_name} summary")
                    continue
                
                # Save summary with language code
                if len(languages) == 1:
                    summary_file = output_path / f"{base_name}_summary.txt"
                else:
                    summary_file = output_path / f"{base_name}_summary_{lang_code}.txt"
                
                with open(summary_file, 'w', encoding='utf-8') as f:
                    f.write(f"# Content Summary ({lang_name})\n\n")
                    f.write(f"Generated from: {source_file.name}\n")
                    f.write(f"Summary length: {summary_length}\n")
                    f.write(f"Language: {lang_name}\n\n")
                    f.write("---\n\n")
                    f.write(summary_text)
                
                self.logger.info(f"{lang_name} summary saved to: {summary_file}")
                output_files[f"summary_{lang_code}"] = str(summary_file)
            
            # Generate image prompt for thumbnail (only once, use first language)
            if languages:
                self.logger.info("Generating image prompt for thumbnail...")
                image_prompt = self._generate_image_prompt(full_text)
                
                if image_prompt:
                    # Save image prompt
                    prompt_file = output_path / f"{base_name}_image_prompt.txt"
                    with open(prompt_file, 'w', encoding='utf-8') as f:
                        f.write(f"# Image Generation Prompt for Thumbnail\n\n")
                        f.write(f"Generated from sermon content\n\n")
                        f.write("---\n\n")
                        f.write(image_prompt)
                    
                    self.logger.info(f"Image prompt saved to: {prompt_file}")
                    output_files["image_prompt"] = str(prompt_file)
                else:
                    self.logger.warning("Failed to generate image prompt")
            
            if not output_files:
                return False, "Failed to generate any summaries", {}
            
            return True, None, output_files
            
        except Exception as e:
            error_msg = f"Summary generation failed: {str(e)}"
            self.logger.error(error_msg, exc_info=True)
            return False, error_msg, {}
    
    def _generate_image_prompt(self, sermon_text: str) -> Optional[str]:
        """
        Generate an image prompt for thumbnail background based on sermon content
        
        Args:
            sermon_text: Full sermon transcript text
            
        Returns:
            Image generation prompt string, or None if failed
        """
        try:
            system_prompt = """You are an AI assistant that creates image generation prompts for sermon thumbnails.

Your task: Based on the sermon content, create a vivid, artistic prompt that captures the main theme visually.

Guidelines:
1. Focus on the central theme or main message
2. Use concrete visual elements (landscape, objects, symbols, atmosphere)
3. Keep it appropriate for church context
4. Avoid depicting specific people or faces
5. Use cinematic, artistic language
6. Length: 2-3 sentences maximum

Output ONLY the image prompt, nothing else."""

            prompt = f"""Based on this sermon transcript, create an image generation prompt for the thumbnail background:

{sermon_text[:3000]}

Create a prompt that visually represents the sermon's main theme. Output ONLY the prompt text:"""

            image_prompt = self._call_ollama(prompt, system_prompt, keep_alive="5m")
            
            if image_prompt:
                # Clean up the prompt
                image_prompt = image_prompt.strip()
                self.logger.info(f"Generated image prompt: {image_prompt[:100]}...")
                return image_prompt
            
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to generate image prompt: {e}")
            return None
    
    def process_content(
        self,
        srt_path: str,
        output_dir: str,
        correct_subtitles: bool = True,
        generate_summary: bool = True,
        summary_length: str = "medium",
        summary_languages: List[str] = None,
        batch_size: int = 10,
        unload_model_after: bool = False
    ) -> Tuple[bool, Optional[str], Dict[str, str]]:
        """
        Complete AI content processing pipeline
        
        Args:
            srt_path: Path to original SRT file
            output_dir: Directory to save outputs
            correct_subtitles: Whether to correct subtitles
            generate_summary: Whether to generate summary
            summary_length: Summary length ("short", "medium", "long")
            summary_languages: List of language codes for summaries (e.g., ["en", "zh"])
            batch_size: Batch size for subtitle correction
            unload_model_after: If True, explicitly unload model from memory after processing
            
        Returns:
            (success, error_message, output_files)
        """
        output_files = {}
        
        try:
            # Step 1: Correct subtitles
            if correct_subtitles:
                success, error, files = self.correct_subtitles(srt_path, output_dir, batch_size)
                if not success:
                    return False, f"Subtitle correction failed: {error}", output_files
                output_files.update(files)
                
                # Use corrected version for summary
                srt_for_summary = files.get("corrected_srt", srt_path)
            else:
                srt_for_summary = srt_path
            
            # Step 2: Generate summary
            if generate_summary:
                success, error, files = self.generate_summary(
                    srt_for_summary, 
                    output_dir, 
                    summary_length,
                    summary_languages
                )
                if not success:
                    return False, f"Summary generation failed: {error}", output_files
                output_files.update(files)
            
            return True, None, output_files
        
        finally:
            # Unload model if requested
            if unload_model_after:
                self.unload_model()
