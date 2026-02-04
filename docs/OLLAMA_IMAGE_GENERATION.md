# Using Ollama for Image Generation

## Overview

Ollama now supports image generation models! This is the **easiest way** to get AI-powered thumbnails in CMAS, since you're already using Ollama for text processing.

## Quick Start

### 1. Pull an Image Model

```bash
# Recommended: Fast and lightweight
ollama pull x/z-image-turbo

# Or try other models:
ollama pull black-forest-labs/flux.1-dev
```

### 2. Configure CMAS

Go to **Settings** → **Thumbnail AI Settings**:
- Backend: `Ollama (Image Models)`
- URL: `http://localhost:11434` (default)
- Model: `x/z-image-turbo`
- Click **Save Settings**

### 3. Done!

That's it! Your next sermon will automatically generate AI thumbnails using Ollama.

## Available Image Models

### x/z-image-turbo (Recommended)

- **Speed:** Very fast (5-10 seconds)
- **Quality:** Good for thumbnails
- **Size:** ~2GB
- **Style:** General purpose

```bash
ollama pull x/z-image-turbo
```

### black-forest-labs/flux.1-dev

- **Speed:** Moderate (15-30 seconds)
- **Quality:** Excellent
- **Size:** ~12GB
- **Style:** Photorealistic, artistic

```bash
ollama pull black-forest-labs/flux.1-dev
```

### More Models

Check Ollama's model library for more image generation models:
```bash
ollama search image
```

## Testing

Test if your image model works:

```bash
# Python test
python test_thumbnail_workflow.py

# Or manual CLI test
python modules/thumbnail/ai_generator_ollama.py \
  --prompt "A peaceful church interior with warm lighting" \
  --output test.png \
  --backend ollama \
  --base-url http://localhost:11434 \
  --model x/z-image-turbo
```

## How It Works

When you run the Thumbnail AI module:

1. **Read prompt:** Loads the image description generated during Summary
2. **Call Ollama:** Sends prompt to Ollama's `/api/generate` endpoint
3. **Decode image:** Receives base64-encoded image data
4. **Save:** Writes to `output/ai_background.png`

## Advantages over Stable Diffusion

| Feature | Ollama | Stable Diffusion WebUI |
|---------|--------|------------------------|
| Setup | ✅ Already installed | ❌ Requires separate install |
| Speed | ✅ Fast | 🔶 Moderate |
| Quality | 🔶 Good | ✅ Excellent |
| Resource Usage | ✅ Low | 🔶 High |
| Same API as text | ✅ Yes | ❌ No |
| Model switching | ✅ Easy (`ollama pull`) | 🔶 Manual download |

## Troubleshooting

### "Model name required for Ollama backend"

You forgot to set the model name. Fix:
```bash
ollama pull x/z-image-turbo
```
Then set `Model: x/z-image-turbo` in Settings.

### "Cannot connect to Ollama"

Ollama isn't running. Fix:
```bash
ollama serve
```

### "No image data in Ollama response"

The model might be a text-only model. Make sure you pulled an **image** model:
```bash
ollama list
# Should show x/z-image-turbo or similar
```

### Image quality is poor

Try a different model:
```bash
ollama pull black-forest-labs/flux.1-dev
```
Update Settings to use the new model.

### Generation is too slow

Switch to a faster model:
```bash
ollama pull x/z-image-turbo  # Faster than flux
```

## API Reference

### Ollama Image Generation API

**Endpoint:** `POST http://localhost:11434/api/generate`

**Request:**
```json
{
  "model": "x/z-image-turbo",
  "prompt": "A peaceful church interior with warm lighting",
  "stream": false,
  "format": "json",
  "options": {
    "width": 1280,
    "height": 720
  }
}
```

**Response:**
```json
{
  "response": "<base64-encoded-image-data>",
  "done": true
}
```

Or:
```json
{
  "images": ["<base64-encoded-image-data>"],
  "done": true
}
```

## Performance Tips

### Memory Management

Ollama image models use GPU memory. If you're also running text models:

1. **Enable "Unload Model After Processing"** in Settings
2. **Or manually unload models:**
   ```bash
   ollama ps           # See what's loaded
   ollama stop <model> # Unload a specific model
   ```

### Speed Optimization

For fastest generation:
1. Use `x/z-image-turbo` (not flux)
2. Keep model loaded (disable "unload after processing")
3. Use smaller image sizes (optional)

### Quality Optimization

For best quality:
1. Use `black-forest-labs/flux.1-dev`
2. Increase generation time (model-specific setting)
3. Fine-tune prompts in `ai_processor.py`

## Comparison with Other Backends

### When to use Ollama:
- ✅ You want easy setup
- ✅ You're already using Ollama for text
- ✅ You want good-enough quality quickly
- ✅ You have limited GPU memory

### When to use Stable Diffusion:
- ✅ You need maximum quality
- ✅ You want fine control over parameters
- ✅ You have GPU resources to spare
- ✅ You're already familiar with SD

### When to use Fallback:
- ✅ You don't need AI generation
- ✅ You have pre-made templates
- ✅ Speed is critical (instant)
- ✅ You want consistent branding

## Next Steps

- Try different models and compare results
- Customize image prompts in `modules/content/ai_processor.py`
- Experiment with different resolution settings
- Share your results with the community!

## Resources

- [Ollama Model Library](https://ollama.com/library)
- [Image Generation Models on Ollama](https://ollama.com/search?q=image)
- [CMAS Thumbnail Documentation](THUMBNAIL_GENERATION.md)
- [Thumbnail Quick Start](THUMBNAIL_QUICKSTART.md)
