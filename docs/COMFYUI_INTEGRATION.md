# ComfyUI 集成指南

本指南介绍如何将 ComfyUI 集成到 CMAS 系统中，用于 AI 图像生成。

## 概述

ComfyUI 是一个强大的 Stable Diffusion/AI 图像生成工具，支持通过 API 接口进行自动化调用。CMAS 通过 HTTP API 与 ComfyUI 通信，提交 workflow 并获取生成的图像。

## 架构

```
CMAS Thumbnail Module
    ↓
ai_generator_comfyui.py (HTTP Client)
    ↓
ComfyUI Server (localhost:8188)
    ↓
Generated Images → CMAS Output
```

## 前置要求

### 1. 安装 ComfyUI

```bash
# 克隆 ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # macOS/Linux
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 2. 下载必要模型

根据 `image_z_image_turbo_API.json` workflow，需要以下模型：

**Text Encoder:**
- `qwen_3_4b.safetensors`  
  下载到: `ComfyUI/models/text_encoders/`

**Diffusion Model:**
- `z_image_turbo_bf16.safetensors`  
  下载到: `ComfyUI/models/diffusion_models/`

**VAE:**
- `ae.safetensors`  
  下载到: `ComfyUI/models/vae/`

下载链接参见 `example-Workflow-Comfy-Z-Image.json` 中的 MarkdownNote 节点。

### 3. 启动 ComfyUI 服务器

```bash
cd ComfyUI
python main.py --listen 127.0.0.1 --port 8188
```

**重要参数：**
- `--listen 127.0.0.1`: 监听地址（使用 0.0.0.0 可外部访问）
- `--port 8188`: API 端口（默认）
- `--cpu`: 仅使用 CPU（无 GPU 时）

确认服务器启动成功后，访问 http://127.0.0.1:8188 应能看到 ComfyUI 界面。

## CMAS 集成

### 1. 安装依赖

```bash
cd /path/to/CMAS
pip install -r requirements.txt
```

### 2. 配置文件

在 `config/config.yaml` 中添加 ComfyUI 配置：

```yaml
thumbnail:
  ai_generator: "comfyui"  # 或 "ollama"
  comfyui:
    server_url: "http://127.0.0.1:8188"
    workflow_template: "modules/thumbnail/image_z_image_turbo_API.json"
    default_width: 1280
    default_height: 720
    default_steps: 9
    timeout: 120
```

### 3. 使用示例

#### Python API 调用

```python
from modules.thumbnail.ai_generator_comfyui import ComfyUIGenerator

# 初始化生成器
generator = ComfyUIGenerator(
    server_url="http://127.0.0.1:8188",
    workflow_template_path="modules/thumbnail/image_z_image_turbo_API.json"
)

# 检查服务器状态
if not generator.check_server():
    print("ComfyUI server not available")
    exit(1)

# 生成图像
success, error = generator.generate(
    prompt="A beautiful church thumbnail with sermon title",
    output_path="output/thumbnail.jpg",
    width=1280,
    height=720,
    steps=9
)

if success:
    print("Image generated successfully")
else:
    print(f"Error: {error}")
```

#### 命令行调用

```bash
python modules/thumbnail/ai_generator_comfyui.py \
    --prompt "A beautiful church thumbnail with sermon title" \
    --output "output/thumbnail.jpg" \
    --width 1280 \
    --height 720 \
    --server "http://127.0.0.1:8188"
```

### 4. 与 ThumbnailComposer 集成

```python
from modules.thumbnail.ai_generator_comfyui import ComfyUIGenerator
from modules.thumbnail.composer_pillow import ThumbnailComposer

# 生成 AI 背景
generator = ComfyUIGenerator()
ai_bg_path = "temp/ai_background.jpg"

success, error = generator.generate(
    prompt="Church interior with warm lighting, cinematic",
    output_path=ai_bg_path,
    width=1280,
    height=720
)

if success:
    # 使用 AI 背景合成最终缩略图
    composer = ThumbnailComposer()
    composer.compose(
        output_path="output/final_thumbnail.jpg",
        title="神與我們同在",
        subtitle="創世記 28:15",
        background=ai_bg_path,  # AI 生成的背景
        pastor_image="assets/pastor/pastor.png",
        logo="assets/logos/church_logo.png"
    )
```

## Workflow 定制

### 修改现有 Workflow

`image_z_image_turbo_API.json` 是 API 格式的 workflow，可以直接修改节点参数：

**关键节点：**
- `"45"`: `CLIPTextEncode` - Prompt 文本输入
- `"41"`: `EmptySD3LatentImage` - 图像尺寸
- `"44"`: `KSampler` - 采样参数（steps, seed, cfg）
- `"9"`: `SaveImage` - 输出文件名

### 创建新 Workflow

1. 在 ComfyUI UI 中设计 workflow
2. 点击菜单 → "Save (API Format)"
3. 保存为 JSON 文件
4. 将文件放到 `modules/thumbnail/` 目录
5. 更新配置指向新 workflow

## 故障排查

### 1. 服务器连接失败

```
✗ ComfyUI server not available at http://127.0.0.1:8188
```

**解决方案：**
- 确认 ComfyUI 正在运行
- 检查端口是否正确（默认 8188）
- 检查防火墙设置

### 2. 模型未找到

```
Error: Model not found: z_image_turbo_bf16.safetensors
```

**解决方案：**
- 下载模型到对应目录
- 检查模型文件名是否匹配
- 确认 workflow JSON 中的模型路径

### 3. 生成超时

```
Timeout waiting for completion
```

**解决方案：**
- 增加 `timeout` 参数（默认 120 秒）
- 检查 GPU/CPU 性能
- 降低 `steps` 参数

### 4. 内存不足

**解决方案：**
- 降低图像分辨率
- 使用更小的模型（如 FP16 替代 FP32）
- 添加 `--lowvram` 或 `--cpu` 启动参数

## API 参考

### ComfyUIGenerator 类

#### 初始化
```python
ComfyUIGenerator(
    server_url: str = "http://127.0.0.1:8188",
    workflow_template_path: Optional[str] = None
)
```

#### generate() 方法
```python
generate(
    prompt: str,                    # AI 提示词
    output_path: str,               # 输出文件路径
    width: int = 1280,              # 图像宽度
    height: int = 720,              # 图像高度
    steps: int = 9,                 # 采样步数
    seed: Optional[int] = None,     # 随机种子
    filename_prefix: str = "thumbnail",  # 文件名前缀
    timeout: int = 120              # 超时秒数
) -> Tuple[bool, Optional[str]]     # (成功, 错误信息)
```

#### check_server() 方法
```python
check_server() -> bool  # 检查服务器是否可用
```

## 性能优化

### 1. 调整采样步数

```python
# 快速生成（较低质量）
steps=4

# 平衡（推荐）
steps=9

# 高质量（较慢）
steps=20
```

### 2. 使用批量生成

如需生成多张图片，复用同一个 generator 实例以保持连接。

### 3. 缓存策略

对相同 prompt 可以缓存结果，避免重复生成。

## 中文支持

ComfyUI 完全支持中文 prompt：

```python
generator.generate(
    prompt="温暖的教堂内部，圣经在讲台上，柔和的光线",
    output_path="output/chinese_prompt.jpg"
)
```

## 安全注意事项

1. **不要在公网暴露 ComfyUI API**（除非有适当的认证）
2. **验证 prompt 输入**（防止注入攻击）
3. **限制并发请求数**（避免资源耗尽）
4. **设置合理的超时时间**

## 扩展

### 添加更多 Workflow

可以为不同场景创建多个 workflow 模板：

```
modules/thumbnail/
  ├── image_z_image_turbo_API.json        # 快速生成
  ├── image_sd15_detailed_API.json        # SD 1.5 详细版
  └── image_sdxl_highres_API.json         # SDXL 高分辨率
```

然后在代码中选择使用：

```python
generator = ComfyUIGenerator(
    workflow_template_path="modules/thumbnail/image_sdxl_highres_API.json"
)
```

## 相关文档

- [ComfyUI 官方文档](https://github.com/comfyanonymous/ComfyUI)
- [THUMBNAIL_GENERATION.md](THUMBNAIL_GENERATION.md) - 缩略图生成总体指南
- [THUMBNAIL_CUSTOMIZATION.md](THUMBNAIL_CUSTOMIZATION.md) - 自定义选项

## 更新日志

- **2026-02-04**: 初始版本，支持 Z-Image Turbo workflow
