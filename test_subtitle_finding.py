#!/usr/bin/env python3
"""
快速测试字幕查找逻辑
"""

from pathlib import Path

# 模拟输出目录
output_dir = Path("events/2026-01-27_0016_test/output")
input_path = "events/2026-01-27_0016_test/output/CST-405_Final_audio.wav"
base_name = Path(input_path).stem.replace(' ', '_')
formats = ["srt", "vtt"]

print("测试字幕文件查找逻辑")
print("=" * 60)
print(f"输出目录: {output_dir}")
print(f"输入文件: {input_path}")
print(f"基础名称: {base_name}")
print()

# 列出实际存在的文件
print("实际文件:")
for f in output_dir.iterdir():
    if f.is_file():
        print(f"  ✓ {f.name}")
print()

# 测试查找逻辑
output_files = {}
input_filename = Path(input_path).name

for fmt in formats:
    print(f"查找 {fmt} 文件:")
    
    # Try different possible output names
    possible_names = [
        output_dir / f"{input_filename}.{fmt}",  # audio.wav.srt
        output_dir / f"{base_name}.{fmt}",       # audio.srt
        output_dir / Path(input_path).name.replace(Path(input_path).suffix, f".{fmt}"),
    ]
    
    for output_path in possible_names:
        print(f"  尝试: {output_path.name} ... ", end="")
        if output_path.exists():
            output_files[fmt] = str(output_path)
            print("✓ 找到了！")
            break
        else:
            print("✗")
    
    if fmt not in output_files:
        print(f"  ⚠️  {fmt} 文件未找到")
    print()

print("=" * 60)
if output_files:
    print("✅ 成功找到字幕文件:")
    for fmt, path in output_files.items():
        print(f"  {fmt}: {Path(path).name}")
else:
    print("❌ 未找到任何字幕文件")
