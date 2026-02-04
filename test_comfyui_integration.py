#!/usr/bin/env python3
"""
Test ComfyUI Integration - Verify ComfyUI connection and image generation
"""

import sys
import time
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from modules.thumbnail.ai_generator_comfyui import ComfyUIGenerator


def test_server_connection(server_url: str = "http://192.168.0.114:8188"):
    """Test 1: Check if ComfyUI server is available"""
    print("=" * 60)
    print("Test 1: ComfyUI Server Connection")
    print("=" * 60)
    
    generator = ComfyUIGenerator(server_url=server_url)
    
    print(f"Checking server at: {server_url}")
    if generator.check_server():
        print("✓ ComfyUI server is available")
        return True
    else:
        print("✗ ComfyUI server is NOT available")
        print("\nTroubleshooting:")
        print("1. Make sure ComfyUI is running:")
        print("   cd /path/to/ComfyUI")
        print("   python main.py --listen 127.0.0.1 --port 8188")
        print("2. Check if port 8188 is not blocked by firewall")
        print("3. Try accessing http://192.168.0.114:8188 in browser")
        return False


def test_workflow_template():
    """Test 2: Verify workflow template exists and is valid"""
    print("\n" + "=" * 60)
    print("Test 2: Workflow Template Validation")
    print("=" * 60)
    
    template_path = Path(__file__).parent / "modules/thumbnail/image_z_image_turbo_API.json"
    
    print(f"Checking template: {template_path}")
    
    if not template_path.exists():
        print("✗ Workflow template not found")
        return False
    
    print("✓ Workflow template exists")
    
    # Try to load it
    try:
        import json
        with open(template_path, 'r') as f:
            workflow = json.load(f)
        
        # Check key nodes
        required_nodes = ["45", "41", "44", "9"]  # Prompt, Size, Sampler, Save
        missing = [n for n in required_nodes if n not in workflow]
        
        if missing:
            print(f"✗ Missing required nodes: {missing}")
            return False
        
        print("✓ Workflow template is valid")
        print(f"  - Found {len(workflow)} nodes")
        print(f"  - Prompt node: {workflow['45']['class_type']}")
        print(f"  - Image size node: {workflow['41']['class_type']}")
        print(f"  - Sampler node: {workflow['44']['class_type']}")
        print(f"  - Save node: {workflow['9']['class_type']}")
        return True
        
    except Exception as e:
        print(f"✗ Error loading template: {e}")
        return False


def test_image_generation(server_url: str = "http://192.168.0.114:8188"):
    """Test 3: Generate a test image"""
    print("\n" + "=" * 60)
    print("Test 3: Image Generation")
    print("=" * 60)
    
    generator = ComfyUIGenerator(server_url=server_url)
    
    # Create output directory
    output_dir = Path(__file__).parent / "test_output"
    output_dir.mkdir(exist_ok=True)
    
    output_path = output_dir / f"comfyui_test_{int(time.time())}.jpg"
    
    test_prompt = "A beautiful church interior with warm lighting, stained glass windows, peaceful atmosphere"
    
    print(f"Prompt: {test_prompt[:60]}...")
    print(f"Output: {output_path}")
    print(f"Size: 1280x720")
    print("\nGenerating image (this may take 30-60 seconds)...\n")
    
    start_time = time.time()
    
    success, error = generator.generate(
        prompt=test_prompt,
        output_path=str(output_path),
        width=1280,
        height=720,
        steps=9,
        timeout=120
    )
    
    elapsed = time.time() - start_time
    
    if success:
        print(f"✓ Image generated successfully in {elapsed:.1f}s")
        print(f"  Saved to: {output_path}")
        
        # Check file size
        file_size = output_path.stat().st_size / 1024  # KB
        print(f"  File size: {file_size:.1f} KB")
        
        return True
    else:
        print(f"✗ Image generation failed after {elapsed:.1f}s")
        print(f"  Error: {error}")
        return False


def test_chinese_prompt(server_url: str = "http://192.168.0.114:8188"):
    """Test 4: Generate image with Chinese prompt"""
    print("\n" + "=" * 60)
    print("Test 4: Chinese Prompt Support")
    print("=" * 60)
    
    generator = ComfyUIGenerator(server_url=server_url)
    
    output_dir = Path(__file__).parent / "test_output"
    output_path = output_dir / f"comfyui_chinese_test_{int(time.time())}.jpg"
    
    test_prompt = "温暖的教堂内部，彩色玻璃窗，柔和的光线，宁静的氛围，电影感"
    
    print(f"中文提示词: {test_prompt}")
    print(f"输出路径: {output_path}")
    print("\n生成中...\n")
    
    start_time = time.time()
    
    success, error = generator.generate(
        prompt=test_prompt,
        output_path=str(output_path),
        width=1280,
        height=720,
        steps=9,
        timeout=120
    )
    
    elapsed = time.time() - start_time
    
    if success:
        print(f"✓ 中文提示词生成成功 ({elapsed:.1f}秒)")
        print(f"  保存至: {output_path}")
        return True
    else:
        print(f"✗ 生成失败 ({elapsed:.1f}秒)")
        print(f"  错误: {error}")
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("ComfyUI Integration Test Suite")
    print("=" * 60)
    print()
    
    server_url = "http://192.168.0.114:8188"
    
    # Test 1: Server connection
    if not test_server_connection(server_url):
        print("\n❌ Cannot proceed without ComfyUI server")
        print("Please start ComfyUI first and re-run this test")
        sys.exit(1)
    
    # Test 2: Workflow template
    if not test_workflow_template():
        print("\n❌ Workflow template validation failed")
        sys.exit(1)
    
    # Test 3: Basic image generation
    print("\nProceed with image generation test? (y/n): ", end="")
    if input().lower().strip() == 'y':
        if not test_image_generation(server_url):
            print("\n⚠️  Basic image generation failed")
        
        # Test 4: Chinese prompt
        print("\nTest Chinese prompt support? (y/n): ", end="")
        if input().lower().strip() == 'y':
            test_chinese_prompt(server_url)
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print("✓ Server connection: OK")
    print("✓ Workflow template: OK")
    print("Check above for image generation test results")
    print("\nTest output images saved to: test_output/")
    print("=" * 60)


if __name__ == '__main__':
    main()
