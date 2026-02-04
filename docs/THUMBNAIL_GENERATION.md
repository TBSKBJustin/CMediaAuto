# Thumbnail Generation Workflow

This document explains how the AI-powered thumbnail generation system works.

## Overview

The thumbnail generation workflow consists of three main stages:

```
Sermon Content → Image Prompt → AI Background Generation → Thumbnail Composition
```

## Workflow Steps

### 1. Image Prompt Generation

During the **Content Summary** module:
- AI analyzes the sermon content (first 3000 characters)
- Generates a 2-3 sentence visual description
- Saves to `logs/{sermon}_image_prompt.txt`

**Example Output:**
```
A serene church sanctuary with warm, golden lighting streaming through 
stained glass windows depicting scenes of covenant and promises. In the 
foreground, ancient scrolls with Hebrew text symbolizing God's eternal 
covenant with Abraham.
```

### 2. AI Background Generation

The **Thumbnail AI** module:
- Reads the image prompt from Step 1
- Calls image generation API (Stable Diffusion/ComfyUI/etc.)
- Generates 1280x720 background image
- Saves to `output/ai_background.png`

**Supported Backends:**
- **Ollama** (Image generation models like x/z-image-turbo)
- **Stable Diffusion WebUI** (Automatic1111)
- **ComfyUI** (Coming soon)
- **Fallback** (Uses existing assets)

### 3. Thumbnail Composition

The **Thumbnail Compose** module:
- Loads AI-generated background (or fallback)
- Overlays sermon title with stroke effect
- Adds scripture reference
- Optionally adds logo and pastor portrait
- Saves final thumbnail to `output/thumbnail.jpg`

## Setup Instructions

### Option 1: Ollama (Easiest - Recommended)

1. **Pull an image generation model:**
   ```bash
   ollama pull x/z-image-turbo
   ```
   
   Other options:
   ```bash
   ollama pull black-forest-labs/flux.1-dev
   ```

2. **Configure in CMAS:**
   - Go to Settings page
   - Set "Image Generation Backend" to "Ollama"
   - API URL: `http://localhost:11434` (default)
   - Model: `x/z-image-turbo`

3. **Verify Ollama is running:**
   ```bash
   ollama list
   ```

**Advantages:**
- ✅ No additional setup (uses existing Ollama)
- ✅ Fast model switching
- ✅ Lower resource usage
- ✅ Same service for text + images

### Option 2: Stable Diffusion WebUI (Best Quality)

1. **Install Stable Diffusion WebUI:**
   ```bash
   git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
   cd stable-diffusion-webui
   ./webui.sh
   ```

2. **Enable API mode:**
   ```bash
   ./webui.sh --api --listen
   ```

3. **Configure in CMAS:**
   - Go to Settings page
   - Set "Image Generation Backend" to "Stable Diffusion WebUI"
   - Set API URL to `http://localhost:7860`
   - (Optional) Specify model name

4. **Verify API is running:**
   ```bash
   curl http://localhost:7860/sdapi/v1/sd-models
   ```

### Option 3: Fallback Mode (No Setup Required)

1. Place background images in `assets/backgrounds/`
2. Set backend to "Fallback" in Settings
3. System will use existing images instead of generating new ones

## Configuration

### Global Settings (`Settings` page)

Configure defaults for all new events:

```yaml
Thumbnail AI Settings:
  backend: "ollama"                     # "ollama", "stable-diffusion", or "fallback"
  url: "http://localhost:11434"         # Ollama (11434) or Stable Diffusion (7860)
  model: "x/z-image-turbo"              # Required for Ollama, optional for SD
```

### Per-Event Settings

When creating an event, these can be overridden:

```json
{
  "thumbnail_ai_backend": "ollama",
  "thumbnail_ai_url": "http://localhost:11434",
  "thumbnail_ai_model": "x/z-image-turbo"
}
```

## Module Configuration

Enable/disable modules in event creation:

```yaml
modules:
  thumbnail_ai: true        # AI background generation
  thumbnail_compose: true   # Final composition
```

## Assets Structure

```
assets/
├── backgrounds/         # Fallback background images
│   ├── default.jpg
│   └── ...
├── logos/              # Church logos (overlaid in corner)
│   └── church_logo.png
├── pastor/             # Pastor portraits (optional)
│   └── pastor.jpg
└── fonts/              # Custom fonts (for title text)
    ├── bold.ttf
    └── regular.ttf
```

## Testing

Run the test script to verify all components:

```bash
python test_thumbnail_workflow.py
```

This will test:
1. Image prompt generation (requires Ollama)
2. AI image generation (requires SD WebUI for full test)
3. Thumbnail composition (requires PIL/Pillow)

## API Reference

### ImageGenerator

```python
from modules.thumbnail.ai_generator_ollama import ImageGenerator

generator = ImageGenerator(
    backend="ollama",  # or "stable-diffusion"
    base_url="http://localhost:11434",  # or 7860 for SD
    model="x/z-image-turbo"  # Required for Ollama
)

success, error = generator.generate_image(
    prompt="A peaceful church interior...",
    output_path="output/background.png",
    width=1280,
    height=720,
    negative_prompt="nsfw, low quality, blurry",
    fallback_asset="assets/backgrounds/default.jpg"
)
```

### ThumbnailComposer

```python
from modules.thumbnail.composer_pillow import ThumbnailComposer

composer = ThumbnailComposer(assets_dir="assets")

success, error = composer.compose(
    output_path="output/thumbnail.jpg",
    title="盟約與我",
    scripture="創世記 17:1-8",
    background="output/ai_background.png",
    logo="assets/logos/logo.png",
    pastor="assets/pastor/portrait.jpg",
    size=(1280, 720)
)
```

## Troubleshooting

### "Model name required for Ollama backend"

**Problem:** Ollama backend selected but no model specified

**Solutions:**
1. Pull an image model: `ollama pull x/z-image-turbo`
2. Set model name in Settings page
3. Or switch to Stable Diffusion/Fallback mode

### "Cannot connect to Ollama"

**Problem:** Ollama service not running

**Solutions:**
1. Start Ollama: `ollama serve`
2. Check if it's running: `ollama list`
3. Verify URL is correct (default: http://localhost:11434)

### "Cannot connect to Stable Diffusion API"

**Problem:** SD WebUI is not running or API is disabled

**Solutions:**
1. Start SD WebUI with `--api` flag
2. Check if port 7860 is in use
3. Verify firewall settings
4. Switch to "Fallback" mode temporarily

### "No image in response"

**Problem:** SD WebUI returned empty response

**Solutions:**
1. Check SD WebUI console for errors
2. Try a simpler prompt
3. Ensure a model is loaded in SD WebUI
4. Increase timeout in config (default: 300s)

### "Fallback asset not found"

**Problem:** No images in `assets/backgrounds/`

**Solutions:**
1. Add `.jpg` or `.png` files to `assets/backgrounds/`
2. Or disable fallback mode
3. Check file permissions

### Chinese text not displaying properly

**Problem:** PIL cannot render Chinese characters

**Solutions:**
1. Install a Chinese font (e.g., Microsoft YaHei, Noto Sans CJK)
2. Place `.ttf` file in `assets/fonts/`
3. Update `composer_pillow.py` to use the font

## Advanced Configuration

### Custom Negative Prompt

Edit `modules/thumbnail/ai_generator_ollama.py`:

```python
negative_prompt = "nsfw, gore, violence, disturbing, inappropriate, offensive, low quality, blurry, watermark, text, logo"
```

### Image Generation Parameters

Adjust in `_generate_stable_diffusion()`:

```python
payload = {
    "steps": 20,           # More steps = higher quality (slower)
    "cfg_scale": 7,        # How closely to follow prompt
    "sampler_name": "Euler a",
    # Add more SD WebUI parameters here
}
```

### Custom Thumbnail Layout

Edit `modules/thumbnail/composer_pillow.py` to customize:
- Text positioning
- Font sizes
- Logo placement
- Pastor portrait size
- Background effects

## Future Enhancements

- [ ] ComfyUI backend support
- [ ] Multiple thumbnail variations
- [ ] A/B testing thumbnails
- [ ] Batch thumbnail generation
- [ ] Template system for different sermon series
- [ ] Video thumbnail preview
- [ ] Social media format exports (16:9, 1:1, 9:16)

## Related Documentation

- [AI Content Reference](docs/archive/AI_CONTENT_REFERENCE.md)
- [Subtitle Workflow](docs/archive/SUBTITLE_SEGMENTATION.md)
- [Model Selection](docs/archive/LANGUAGE_MODEL_SELECTION.md)
