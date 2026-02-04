"""
Thumbnail Composer (Pillow) - Compose final thumbnail from layers
"""

import logging
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image, ImageDraw, ImageFont


class ThumbnailComposer:
    """Composes final thumbnail from multiple layers"""
    
    DEFAULT_SIZE = (1280, 720)
    
    def __init__(self, assets_dir: str = "assets"):
        """
        Initialize thumbnail composer
        
        Args:
            assets_dir: Path to assets directory
        """
        self.assets_dir = Path(assets_dir)
        self.logger = self._setup_logger()
    
    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger("ThumbnailComposer")
        logger.setLevel(logging.INFO)
        return logger
    
    def compose(
        self,
        output_path: str,
        title: str = None,
        subtitle: str = None,
        meeting_type: str = None,
        background: Optional[str] = None,
        pastor_image: Optional[str] = None,
        logo: Optional[str] = None,
        title_font_size: int = 96,
        subtitle_font_size: int = 64,
        meeting_font_size: int = 48,
        title_font_path: Optional[str] = None,
        subtitle_font_path: Optional[str] = None,
        meeting_font_path: Optional[str] = None,
        logo_size: dict = None,
        pastor_size: dict = None,
        size: Tuple[int, int] = DEFAULT_SIZE
    ) -> tuple[bool, Optional[str]]:
        """
        Compose thumbnail from layers with flexible element configuration
        
        Args:
            output_path: Where to save final thumbnail
            title: Main title (centered, large)
            subtitle: Subtitle text (below title)
            meeting_type: Meeting type text (top-right corner)
            background: Background image path
            pastor_image: Pastor portrait path (bottom-left)
            logo: Church logo path (top-left)
            title_font_size: Initial title font size (auto-adjusted if too long)
            subtitle_font_size: Initial subtitle font size (auto-adjusted if too long)
            meeting_font_size: Initial meeting type font size (auto-adjusted if too long)
            title_font_path: Custom font path for title
            subtitle_font_path: Custom font path for subtitle
            meeting_font_path: Custom font path for meeting type
            logo_size: Logo size dict with 'width' and 'height' (defaults: 200x200)
            pastor_size: Pastor image size dict with 'width' and 'height' (defaults: 250x250)
            size: Output image size (width, height)
            
        Returns:
            (success, error_message)
        """
        try:
            self.logger.info(f"Composing thumbnail with flexible elements")
            
            # Set default image sizes if not provided
            if logo_size is None:
                logo_size = {'width': 200, 'height': 200}
            if pastor_size is None:
                pastor_size = {'width': 250, 'height': 250}
            
            # Create base canvas
            canvas = Image.new('RGB', size, color=(255, 255, 255))
            
            # Layer 1: Background
            if background and Path(background).exists():
                bg = Image.open(background)
                bg = bg.resize(size, Image.Resampling.LANCZOS)
                canvas.paste(bg, (0, 0))
            else:
                # Use solid color as fallback
                canvas = Image.new('RGB', size, color=(41, 98, 255))
            
            # Layer 2: Logo (top-left corner)
            if logo and Path(logo).exists():
                logo_img = Image.open(logo)
                logo_img = self._resize_with_aspect(
                    logo_img, 
                    max_width=logo_size.get('width', 200), 
                    max_height=logo_size.get('height', 200)
                )
                
                # Position in top-left corner with padding
                logo_x = 30
                logo_y = 30
                
                if logo_img.mode == 'RGBA':
                    canvas.paste(logo_img, (logo_x, logo_y), logo_img)
                else:
                    canvas.paste(logo_img, (logo_x, logo_y))
            
            # Layer 3: Pastor portrait (bottom-left corner)
            if pastor_image and Path(pastor_image).exists():
                pastor_img = Image.open(pastor_image)
                pastor_img = self._resize_with_aspect(
                    pastor_img, 
                    max_width=pastor_size.get('width', 250), 
                    max_height=pastor_size.get('height', 250)
                )
                
                # Position in bottom-left corner
                pastor_x = 30
                pastor_y = size[1] - pastor_img.height - 30
                
                if pastor_img.mode == 'RGBA':
                    canvas.paste(pastor_img, (pastor_x, pastor_y), pastor_img)
                else:
                    canvas.paste(pastor_img, (pastor_x, pastor_y))
            
            # Layer 4: Text overlays
            draw = ImageDraw.Draw(canvas)
            
            # Calculate available text area (avoiding logo and pastor image areas)
            text_left_margin = 50
            text_right_margin = 50
            text_max_width = size[0] - text_left_margin - text_right_margin
            
            # Draw meeting type (top-right corner)
            if meeting_type:
                meeting_font = self._load_font_auto_adjust(
                    meeting_type,
                    meeting_font_size,
                    300,  # max width for meeting type
                    font_path=meeting_font_path
                )
                
                meeting_bbox = draw.textbbox((0, 0), meeting_type, font=meeting_font)
                meeting_width = meeting_bbox[2] - meeting_bbox[0]
                meeting_x = size[0] - meeting_width - 50
                meeting_y = 40
                
                self._draw_text_with_stroke(
                    draw,
                    (meeting_x, meeting_y),
                    meeting_type,
                    meeting_font,
                    fill_color=(255, 255, 255),
                    stroke_color=(0, 0, 0),
                    stroke_width=3
                )
            
            # Calculate center text layout
            center_y_start = size[1] // 2
            
            # Draw title (centered)
            if title:
                title_font = self._load_font_auto_adjust(
                    title,
                    title_font_size,
                    text_max_width - 100,
                    font_path=title_font_path
                )
                
                wrapped_title = self._wrap_text(title, title_font, text_max_width - 100)
                
                title_bbox = draw.multiline_textbbox((0, 0), wrapped_title, font=title_font)
                title_width = title_bbox[2] - title_bbox[0]
                title_height = title_bbox[3] - title_bbox[1]
                
                # Calculate total height for vertical centering
                total_height = title_height
                if subtitle:
                    # Estimate subtitle height
                    subtitle_font = self._load_font_auto_adjust(
                        subtitle,
                        subtitle_font_size,
                        text_max_width - 100,
                        font_path=subtitle_font_path
                    )
                    wrapped_subtitle = self._wrap_text(subtitle, subtitle_font, text_max_width - 100)
                    subtitle_bbox = draw.multiline_textbbox((0, 0), wrapped_subtitle, font=subtitle_font)
                    subtitle_height = subtitle_bbox[3] - subtitle_bbox[1]
                    total_height += subtitle_height + 40
                
                # Center vertically
                start_y = (size[1] - total_height) // 2
                title_x = (size[0] - title_width) // 2
                
                self._draw_text_with_stroke(
                    draw,
                    (title_x, start_y),
                    wrapped_title,
                    title_font,
                    fill_color=(255, 255, 255),
                    stroke_color=(0, 0, 0),
                    stroke_width=4,
                    multiline=True
                )
                
                # Draw subtitle
                if subtitle:
                    wrapped_subtitle = self._wrap_text(subtitle, subtitle_font, text_max_width - 100)
                    subtitle_bbox = draw.multiline_textbbox((0, 0), wrapped_subtitle, font=subtitle_font)
                    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
                    subtitle_x = (size[0] - subtitle_width) // 2
                    subtitle_y = start_y + title_height + 40
                    
                    self._draw_text_with_stroke(
                        draw,
                        (subtitle_x, subtitle_y),
                        wrapped_subtitle,
                        subtitle_font,
                        fill_color=(255, 255, 255),
                        stroke_color=(0, 0, 0),
                        stroke_width=3,
                        multiline=True
                    )
            
            # Save final thumbnail
            canvas.save(output_path, 'JPEG', quality=95)
            self.logger.info(f"Thumbnail saved: {output_path}")
            
            return True, None
        
        except Exception as e:
            self.logger.error(f"Failed to compose thumbnail: {e}")
            return False, str(e)
    
    def _resize_with_aspect(
        self, 
        image: Image.Image, 
        max_width: int, 
        max_height: int
    ) -> Image.Image:
        """Resize image maintaining aspect ratio"""
        ratio = min(max_width / image.width, max_height / image.height)
        new_size = (int(image.width * ratio), int(image.height * ratio))
        return image.resize(new_size, Image.Resampling.LANCZOS)
    
    def _load_font_with_chinese_support(self, size: int) -> ImageFont.ImageFont:
        """Load font with Chinese character support"""
        # Font paths to try (in order of preference)
        font_paths = [
            # Custom fonts in assets
            str(self.assets_dir / "fonts" / "NotoSansCJK-Bold.ttf"),
            str(self.assets_dir / "fonts" / "NotoSansCJK-Regular.ttf"),
            str(self.assets_dir / "fonts" / "bold.ttf"),
            str(self.assets_dir / "fonts" / "regular.ttf"),
            # macOS system fonts (support Chinese)
            "/System/Library/Fonts/PingFang.ttc",  # PingFang (简/繁体中文)
            "/System/Library/Fonts/Supplemental/Songti.ttc",  # 宋体
            "/System/Library/Fonts/Supplemental/STHeiti Medium.ttc",  # 黑体
            "/System/Library/Fonts/Hiragino Sans GB.ttc",  # 冬青黑体
            "/Library/Fonts/Arial Unicode.ttf",  # Arial Unicode MS
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
        ]
        
        for font_path in font_paths:
            try:
                font = ImageFont.truetype(font_path, size)
                self.logger.info(f"Loaded font: {font_path}")
                return font
            except Exception as e:
                continue
        
        # Final fallback
        self.logger.warning(f"Could not load any font with Chinese support, using default")
        return ImageFont.load_default()
    
    def _load_font_auto_adjust(
        self,
        text: str,
        initial_size: int,
        max_width: int,
        font_path: Optional[str] = None,
        min_size: int = 24
    ) -> ImageFont.ImageFont:
        """
        Load font and automatically adjust size to fit text within max_width
        
        Args:
            text: Text to measure
            initial_size: Starting font size
            max_width: Maximum allowed width
            font_path: Custom font path (None = auto-detect with Chinese support)
            min_size: Minimum font size to try
            
        Returns:
            Font object with adjusted size
        """
        current_size = initial_size
        
        while current_size >= min_size:
            # Load font
            if font_path and Path(font_path).exists():
                try:
                    font = ImageFont.truetype(font_path, current_size)
                except:
                    font = self._load_font_with_chinese_support(current_size)
            else:
                font = self._load_font_with_chinese_support(current_size)
            
            # Measure text width
            dummy_draw = ImageDraw.Draw(Image.new('RGB', (1, 1)))
            
            # Wrap text first
            wrapped = self._wrap_text(text, font, max_width * 2)  # Allow wider for measurement
            bbox = dummy_draw.multiline_textbbox((0, 0), wrapped, font=font)
            width = bbox[2] - bbox[0]
            
            # Check if fits
            if width <= max_width:
                self.logger.info(f"Auto-adjusted font size: {current_size}px for text length {len(text)}")
                return font
            
            # Reduce size
            current_size -= 4
        
        # Return minimum size font
        if font_path and Path(font_path).exists():
            try:
                return ImageFont.truetype(font_path, min_size)
            except:
                return self._load_font_with_chinese_support(min_size)
        else:
            return self._load_font_with_chinese_support(min_size)
    
    @staticmethod
    def get_system_fonts() -> list[dict]:
        """
        Get list of available system fonts
        
        Returns:
            List of dicts with font name and path
        """
        fonts = []
        seen_paths = set()  # Avoid duplicates
        
        # macOS system font directories (expanded)
        font_dirs = [
            Path("/System/Library/Fonts"),
            Path("/System/Library/Fonts/Supplemental"),
            Path("/System/Library/AssetsV2"),  # Additional system fonts
            Path("/Library/Fonts"),
            Path.home() / "Library/Fonts",
            Path("assets/fonts")  # Custom fonts
        ]
        
        # Keywords to identify Chinese support
        chinese_keywords = [
            'pingfang', 'songti', 'heiti', 'hiragino', 'noto', 'cjk',
            'simhei', 'simsun', 'kaiti', 'fangsong', 'microsoft yahei',
            'arial unicode', 'yu gothic', 'meiryo', 'malgun',
            'stfangsong', 'stkaiti', 'stsong', 'stzhongsong',
            'lantinghei', 'lantingsong', 'yuanti', 'lisong'
        ]
        
        for font_dir in font_dirs:
            if not font_dir.exists():
                continue
            
            # Use iterdir instead of rglob for better performance
            try:
                for font_file in font_dir.rglob("*"):
                    # Skip if not a font file
                    if font_file.suffix.lower() not in ['.ttf', '.otf', '.ttc', '.dfont']:
                        continue
                    
                    # Skip duplicates
                    font_path = str(font_file)
                    if font_path in seen_paths:
                        continue
                    seen_paths.add(font_path)
                    
                    # Extract font name from filename
                    font_name = font_file.stem
                    
                    # Remove common suffixes
                    font_name = font_name.replace('-Regular', '').replace('Regular', '')
                    font_name = font_name.replace('-Bold', '').replace('Bold', '')
                    font_name = font_name.replace('-Italic', '').replace('Italic', '')
                    
                    # Check if supports Chinese (heuristic)
                    name_lower = font_name.lower()
                    path_lower = font_path.lower()
                    chinese_support = any(keyword in name_lower or keyword in path_lower 
                                        for keyword in chinese_keywords)
                    
                    fonts.append({
                        "name": font_name,
                        "path": font_path,
                        "chinese_support": chinese_support
                    })
            except Exception as e:
                # Skip directories with permission errors
                continue
        
        # Remove duplicates by name (keep first occurrence)
        unique_fonts = {}
        for font in fonts:
            if font['name'] not in unique_fonts:
                unique_fonts[font['name']] = font
        
        fonts = list(unique_fonts.values())
        
        # Sort: Chinese-supporting fonts first, then alphabetically
        fonts.sort(key=lambda x: (not x['chinese_support'], x['name'].lower()))
        
        return fonts
    
    def _draw_text_with_stroke(
        self,
        draw: ImageDraw.ImageDraw,
        position: Tuple[int, int],
        text: str,
        font: ImageFont.ImageFont,
        fill_color: Tuple[int, int, int],
        stroke_color: Tuple[int, int, int],
        stroke_width: int = 2,
        max_width: Optional[int] = None,
        multiline: bool = False
    ):
        """Draw text with stroke/outline effect"""
        x, y = position
        
        # Wrap text if max_width specified
        if max_width:
            text = self._wrap_text(text, font, max_width)
        
        # Choose appropriate drawing method
        draw_method = draw.multiline_text if multiline else draw.text
        text_kwargs = {'align': 'center'} if multiline else {}
        
        # Draw stroke
        for offset_x in range(-stroke_width, stroke_width + 1):
            for offset_y in range(-stroke_width, stroke_width + 1):
                draw_method((x + offset_x, y + offset_y), text, font=font, fill=stroke_color, **text_kwargs)
        
        # Draw main text
        draw_method((x, y), text, font=font, fill=fill_color, **text_kwargs)
    
    def _wrap_text(self, text: str, font: ImageFont.ImageFont, max_width: int) -> str:
        """Wrap text to fit within max_width"""
        # Simple word wrapping
        words = text.split()
        lines = []
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            bbox = font.getbbox(test_line)
            width = bbox[2] - bbox[0]
            
            if width <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
        
        if current_line:
            lines.append(' '.join(current_line))
        
        return '\n'.join(lines)


def main():
    """CLI entry point for testing"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Thumbnail Composer')
    parser.add_argument('--title', required=True, help='Sermon title')
    parser.add_argument('--scripture', help='Scripture reference')
    parser.add_argument('--background', help='Background image path')
    parser.add_argument('--character', help='Character image path')
    parser.add_argument('--pastor', help='Pastor portrait path')
    parser.add_argument('--logo', help='Church logo path')
    parser.add_argument('--output', required=True, help='Output thumbnail path')
    
    args = parser.parse_args()
    
    composer = ThumbnailComposer()
    
    success, error = composer.compose(
        args.output,
        args.title,
        args.scripture,
        args.background,
        args.character,
        args.pastor,
        args.logo
    )
    
    if success:
        print(f"✓ Thumbnail created: {args.output}")
    else:
        print(f"✗ Failed: {error}")


if __name__ == '__main__':
    main()
