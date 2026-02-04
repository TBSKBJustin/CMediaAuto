"""
Test Thumbnail Generation Workflow
Tests: Image prompt generation → AI image generation → Thumbnail composition
"""

import sys
from pathlib import Path

# Test 1: Image prompt generation (already part of summary)
print("=" * 60)
print("TEST 1: Image Prompt Generation")
print("=" * 60)

from modules.content.ai_processor import AIContentProcessor

processor = AIContentProcessor(model="qwen2.5:latest")

# Sample sermon text
sample_sermon = """
今天我們要來看創世記17章中，神與亞伯拉罕所立的盟約。
這個盟約不僅改變了亞伯拉罕的生命，也影響了整個人類歷史。
神應許亞伯拉罕，他要成為多國之父，他的後裔要像天上的星那樣多。
這個盟約的記號就是割禮，這是神與祂的百姓之間永遠的約定。
今天，我們作為新約的子民，也要記住神的信實和應許。
"""

print("\n📝 Generating image prompt from sermon text...")
try:
    image_prompt = processor._generate_image_prompt(sample_sermon)
    if image_prompt:
        print(f"✅ Success! Generated prompt:\n{image_prompt}")
    else:
        print("❌ Failed to generate image prompt")
except Exception as e:
    print(f"❌ Error: {e}")

# Test 2: AI Image Generation
print("\n" + "=" * 60)
print("TEST 2: AI Image Generation")
print("=" * 60)

from modules.thumbnail.ai_generator_ollama import ImageGenerator

# Test with different backends
backends = [
    ("ollama", "http://localhost:11434", "Requires Ollama with image model (e.g., x/z-image-turbo)"),
    ("fallback", "N/A", "Using fallback images"),
    ("stable-diffusion", "http://localhost:7860", "Requires SD WebUI running"),
]

for backend, url, note in backends:
    print(f"\n🎨 Testing backend: {backend}")
    print(f"   {note}")
    
    # Set model for Ollama
    model = "x/z-image-turbo" if backend == "ollama" else None
    
    generator = ImageGenerator(
        backend=backend,
        base_url=url,
        model=model
    )
    
    output_dir = Path("test_output")
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"test_bg_{backend}.png"
    
    # Use a simple prompt for testing
    test_prompt = "A peaceful church interior with warm lighting, stained glass windows showing biblical scenes, wooden pews, and sunlight streaming through. Serene and welcoming atmosphere."
    
    print(f"   Prompt: {test_prompt[:80]}...")
    
    # For fallback, provide a fallback asset
    fallback_asset = None
    if backend == "fallback":
        assets_dir = Path("assets/backgrounds")
        if assets_dir.exists():
            bg_files = list(assets_dir.glob("*.jpg")) + list(assets_dir.glob("*.png"))
            if bg_files:
                fallback_asset = str(bg_files[0])
    
    try:
        success, error = generator.generate_image(
            prompt=test_prompt,
            output_path=str(output_file),
            fallback_asset=fallback_asset
        )
        
        if success:
            print(f"   ✅ Generated: {output_file}")
        else:
            print(f"   ⚠️  Failed: {error}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")

# Test 3: Thumbnail Composition
print("\n" + "=" * 60)
print("TEST 3: Thumbnail Composition")
print("=" * 60)

from modules.thumbnail.composer_pillow import ThumbnailComposer

composer = ThumbnailComposer()

# Test with fallback background
output_dir = Path("test_output")
output_file = output_dir / "test_thumbnail.jpg"

# Find a background to use
background = None
test_bg = output_dir / "test_bg_fallback.png"
if test_bg.exists():
    background = str(test_bg)
else:
    assets_dir = Path("assets/backgrounds")
    if assets_dir.exists():
        bg_files = list(assets_dir.glob("*.jpg")) + list(assets_dir.glob("*.png"))
        if bg_files:
            background = str(bg_files[0])

print(f"\n🖼️  Composing thumbnail...")
print(f"   Title: 盟約與我")
print(f"   Scripture: 創世記 17:1-8")
print(f"   Background: {background or 'None (using solid color)'}")

try:
    success, error = composer.compose(
        output_path=str(output_file),
        title="盟約與我",
        scripture="創世記 17:1-8",
        background=background
    )
    
    if success:
        print(f"   ✅ Thumbnail created: {output_file}")
    else:
        print(f"   ❌ Failed: {error}")
        
except Exception as e:
    print(f"   ❌ Error: {e}")

# Summary
print("\n" + "=" * 60)
print("TEST SUMMARY")
print("=" * 60)
print("""
Workflow Steps:
1. ✅ Image prompt generation - AI generates visual description from sermon
2. 🎨 AI image generation - Ollama/Stable Diffusion creates background image
3. 🖼️  Thumbnail composition - Pillow overlays title and text

Next Steps:
- Pull Ollama image model: ollama pull x/z-image-turbo
- Or start Stable Diffusion WebUI with: ./webui.sh --api --listen
- Configure backend in Settings page
- Run workflow on real sermon event

Output files are in: test_output/
""")
