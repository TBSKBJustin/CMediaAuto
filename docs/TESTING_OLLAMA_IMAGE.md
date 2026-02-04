# Testing Ollama Image Generation Integration

## Quick Test Checklist

### 1. Pull an Ollama Image Model

```bash
ollama pull x/z-image-turbo
```

Verify it's installed:
```bash
ollama list | grep image
```

### 2. Check API Endpoint

Test the new Ollama image model detection endpoint:

```bash
curl http://localhost:5001/api/models/ollama-image
```

Expected response:
```json
{
  "service_available": true,
  "models": [
    {
      "value": "x/z-image-turbo:latest",
      "label": "x/z-image-turbo:latest",
      "size": 2147483648,
      "modified": "2026-02-03T..."
    }
  ],
  "default": "x/z-image-turbo:latest",
  "total_models": 5
}
```

### 3. Test Frontend Model Selection

1. **Open Settings Page** (http://localhost:5173/settings)
   - Should see "Thumbnail AI Settings" section
   - Backend dropdown should have "Ollama (Image Models)" option
   - When selected, should show model dropdown
   - Dropdown should list available image models

2. **Create New Event** (http://localhost:5173/events/create)
   - Should see "Thumbnail AI Settings" section
   - Select "Ollama" backend
   - Choose model from dropdown (should auto-populate)
   - Save event

3. **Check Event Config**
   ```bash
   cat events/YOUR_EVENT_ID/event.json | grep thumbnail
   ```
   
   Should show:
   ```json
   "thumbnail_ai_backend": "ollama",
   "thumbnail_ai_url": "http://localhost:11434",
   "thumbnail_ai_model": "x/z-image-turbo:latest"
   ```

### 4. Test Image Generation

1. **Run Content Summary** first (to generate image prompt):
   - In event detail page, click "Run Module" on "Generate Summary"
   - Wait for completion
   - Verify `logs/XXX_image_prompt.txt` exists

2. **Run Thumbnail AI**:
   - Click "Run Module" on "Thumbnail AI"
   - Check logs for:
     ```
     INFO - Calling Ollama API at http://localhost:11434/api/generate with model x/z-image-turbo:latest
     INFO - Image generated successfully via Ollama: events/XXX/output/ai_background.png
     ```
   - Verify `output/ai_background.png` was created

3. **Run Thumbnail Compose**:
   - Click "Run Module" on "Thumbnail Compose"
   - Check logs for:
     ```
     INFO - Using AI-generated background
     INFO - Thumbnail created: events/XXX/output/thumbnail.jpg
     ```
   - View the final thumbnail

### 5. Verify Full Workflow

Run complete workflow with all modules enabled:

```bash
# In event detail page, enable:
- Generate Summary ✓
- Thumbnail AI ✓
- Thumbnail Compose ✓

# Click "Run Workflow"
```

Expected log sequence:
```
INFO - Running module: content_summary
INFO - Summary generated, image prompt saved
INFO - Running module: thumbnail_ai
INFO - Calling Ollama API...
INFO - Image generated successfully
INFO - Running module: thumbnail_compose
INFO - Using AI-generated background
INFO - Thumbnail created
```

## Troubleshooting

### "No image models found"

**Problem:** Ollama doesn't detect any image models

**Check:**
```bash
ollama list
```

**Solution:**
```bash
# Pull an image model
ollama pull x/z-image-turbo

# Or try another one
ollama pull black-forest-labs/flux.1-dev
```

### Model dropdown is empty

**Problem:** Frontend shows "No image models found"

**Check API:**
```bash
curl http://localhost:5001/api/models/ollama-image
```

**Possible causes:**
1. Ollama not running → `ollama serve`
2. No image models installed → `ollama pull x/z-image-turbo`
3. Model name doesn't contain keywords → Manual entry still works

### Thumbnail AI skipped

**Problem:** Module shows "skipped" status

**Check logs for:**
```
WARNING - No image prompt found, skipping AI generation
```

**Solution:** Run Content Summary module first

### "Model name required for Ollama backend"

**Problem:** Event config has empty model name

**Check:**
```bash
cat events/YOUR_EVENT/event.json | grep thumbnail_ai_model
```

**Solution:** 
1. Update event settings
2. Or set in Settings page before creating event

## Success Criteria

✅ API endpoint returns image models
✅ Settings page shows model dropdown
✅ EventCreate page shows model dropdown
✅ Model auto-selects from available options
✅ Event config saves correct model name
✅ Thumbnail AI generates image with Ollama
✅ Final thumbnail uses AI-generated background

## Performance Benchmarks

Expected times (depends on GPU):

| Model | Image Size | Time |
|-------|------------|------|
| x/z-image-turbo | 1280x720 | 5-10s |
| flux.1-dev | 1280x720 | 15-30s |

## Next Steps

After successful test:
1. Try different models
2. Compare image quality
3. Adjust prompts in `ai_processor.py` if needed
4. Set up fallback in case Ollama fails
