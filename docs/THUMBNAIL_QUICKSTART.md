# Thumbnail Generation Quick Start

## 3-Minute Setup Guide

### Prerequisites

✅ CMAS system running  
✅ Ollama with qwen2.5:latest model  
✅ Sermon video processed through Content Summary  

### Step 1: Choose Your Backend (Pick One)

#### Option A: AI-Powered (Best Quality)

Install Stable Diffusion WebUI:
```bash
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui
./webui.sh --api --listen
```

Wait for it to start, then configure CMAS:
- Go to **Settings** → **Thumbnail AI Settings**
- Backend: `Stable Diffusion WebUI`
- URL: `http://localhost:7860`
- Click **Save Settings**

#### Option B: Use Existing Images (Fastest)

```bash
# Place some background images
mkdir -p assets/backgrounds
cp your-image.jpg assets/backgrounds/
```

Configure CMAS:
- Go to **Settings** → **Thumbnail AI Settings**  
- Backend: `Fallback (Use Asset Images)`
- Click **Save Settings**

### Step 2: Run Workflow

1. **Create or Open Event**
   - Make sure sermon has been processed through "Content Summary"
   - This generates the image prompt automatically

2. **Run Thumbnail Modules**
   
   In Event Detail page:
   
   a. Click **"Run Module"** on **Thumbnail AI**
      - This generates the background image
      - Takes 30-60 seconds with Stable Diffusion
      - Instant with Fallback mode
   
   b. Click **"Run Module"** on **Thumbnail Compose**
      - This creates the final thumbnail
      - Takes ~2 seconds

3. **View Result**
   - Find thumbnail at: `events/{event_id}/output/thumbnail.jpg`
   - Preview in the Output Files section

### Step 3: Customize (Optional)

**Add Church Logo:**
```bash
cp church-logo.png assets/logos/
```
Re-run Thumbnail Compose to include it.

**Add Pastor Portrait:**
```bash
cp pastor-photo.jpg assets/pastor/
```
Re-run Thumbnail Compose to include it.

**Custom Fonts:**
```bash
cp custom-font.ttf assets/fonts/bold.ttf
```
Restart CMAS backend to apply.

## Example Workflow

```
1. Upload sermon video → Process subtitles → Generate summary
   ↓
2. Summary automatically generates image prompt
   ↓
3. Run "Thumbnail AI" → AI creates background (or uses fallback)
   ↓
4. Run "Thumbnail Compose" → Final thumbnail with title overlay
   ↓
5. Output: thumbnail.jpg ready for YouTube/website!
```

## Test It Out

Quick test without a full sermon:

```bash
# Test all components
python test_thumbnail_workflow.py

# Check output
open test_output/test_thumbnail.jpg
```

## Troubleshooting

**"No image prompt found"**  
→ Run Content Summary module first

**"Cannot connect to Stable Diffusion API"**  
→ Make sure SD WebUI is running with `--api` flag  
→ Or switch to Fallback mode

**Chinese text looks broken**  
→ Install Chinese fonts in `assets/fonts/`

**Thumbnail looks wrong**  
→ Check output/ai_background.png was generated  
→ Verify assets exist (logos, fonts)

## What Gets Generated

```
events/{event-id}/
├── logs/
│   └── {sermon}_image_prompt.txt    ← AI-generated visual description
├── output/
│   ├── ai_background.png             ← Generated background image
│   └── thumbnail.jpg                 ← Final thumbnail (1280×720)
```

## Next Steps

- Configure module defaults in Settings
- Batch process multiple sermons
- Experiment with different prompts
- Read full documentation: `docs/THUMBNAIL_GENERATION.md`

---

💡 **Pro Tip:** Enable both modules in the workflow, and they'll run automatically after summary generation!
