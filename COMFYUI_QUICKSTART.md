# ComfyUI 快速开始指南

## 已完成的集成

✅ ComfyUI 客户端模块 (`ai_generator_comfyui.py`)  
✅ 后端 API 端点（状态检查、生成、配置）  
✅ 前端设置界面（可配置 server_url）  
✅ 配置文件支持  
✅ 测试脚本

## 快速开始

### 1. 启动 ComfyUI

```bash
cd /path/to/ComfyUI
python main.py --listen 127.0.0.1 --port 8188
```

**或在局域网访问：**
```bash
python main.py --listen 0.0.0.0 --port 8188
```

### 2. 启动 CMAS 系统

**终端 1 - 后端 API：**
```bash
cd /Users/justin/Desktop/Justin/school/CMAS
source venv/bin/activate
python api_server.py
```

**终端 2 - 前端：**
```bash
cd frontend
npm run dev
```

### 3. 配置 ComfyUI

1. 打开浏览器访问 http://localhost:3000
2. 进入 **Settings** 页面
3. 找到 **Thumbnail AI Settings** 部分
4. 选择 **ComfyUI** 作为 Image Generation Backend
5. 配置参数：
   - **Server URL**: `http://127.0.0.1:8188`（或你的 ComfyUI 地址）
   - **Width**: `1280`
   - **Height**: `720`
   - **Steps**: `9`（推荐值，可调整）
6. 检查顶部状态指示器是否显示 **Online** ✅
7. 点击 **Save Settings**

### 4. 使用方式

#### 方式 A：在事件创建时使用

创建新事件时，系统会自动使用你在设置中配置的 ComfyUI 参数生成缩略图。

#### 方式 B：命令行测试

```bash
python modules/thumbnail/ai_generator_comfyui.py \
    --prompt "Church interior with warm lighting, stained glass" \
    --output "test_thumbnail.jpg" \
    --width 1280 \
    --height 720 \
    --server "http://127.0.0.1:8188"
```

#### 方式 C：Python 代码

```python
from modules.thumbnail.ai_generator_comfyui import ComfyUIGenerator

generator = ComfyUIGenerator(server_url="http://127.0.0.1:8188")

success, error = generator.generate(
    prompt="温暖的教堂内部，彩色玻璃窗",
    output_path="output/thumbnail.jpg",
    width=1280,
    height=720
)

if success:
    print("✓ 生成成功")
else:
    print(f"✗ 失败: {error}")
```

## API 端点

后端提供以下 ComfyUI API 端点：

### 检查状态
```bash
curl "http://localhost:5001/api/comfyui/status?server_url=http://127.0.0.1:8188"
```

### 生成图像
```bash
curl -X POST http://localhost:5001/api/comfyui/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful church thumbnail",
    "width": 1280,
    "height": 720,
    "steps": 9,
    "server_url": "http://127.0.0.1:8188"
  }'
```

### 获取配置
```bash
curl http://localhost:5001/api/comfyui/config
```

### 更新配置
```bash
curl -X PUT http://localhost:5001/api/comfyui/config \
  -H "Content-Type: application/json" \
  -d '{
    "server_url": "http://192.168.0.114:8188"
  }'
```

## 配置文件

系统配置存储在 `config/config.yaml`:

```yaml
modules:
  ai_generator:
    provider: ollama  # 或 'comfyui'
    comfyui:
      server_url: http://127.0.0.1:8188
      workflow_template: modules/thumbnail/image_z_image_turbo_API.json
      default_width: 1280
      default_height: 720
      default_steps: 9
      timeout: 120
```

## 故障排查

### 1. 前端显示 "Offline" ❌

**检查：**
```bash
# 测试 ComfyUI 是否运行
curl http://127.0.0.1:8188/system_stats

# 或在浏览器打开
open http://127.0.0.1:8188
```

**解决：**
- 确认 ComfyUI 正在运行
- 检查端口 8188 未被占用
- 确认 `--listen` 参数正确

### 2. 生成超时

**原因：**
- 模型未下载
- GPU/CPU 性能不足
- Steps 设置过高

**解决：**
- 下载所需模型（见文档）
- 降低 Steps 参数（如 4-9）
- 增加 timeout 设置

### 3. 跨主机访问

如果 ComfyUI 在另一台机器：

```bash
# ComfyUI 主机启动时监听所有网卡
python main.py --listen 0.0.0.0 --port 8188

# CMAS 前端设置 server_url 为
http://192.168.x.x:8188
```

## 性能建议

| Steps | 生成时间 | 质量 | 适用场景 |
|-------|---------|------|---------|
| 4     | ~15s    | 基础 | 快速预览 |
| 9     | ~30s    | 良好 | 推荐（默认）|
| 15    | ~60s    | 优秀 | 高质量输出 |
| 20+   | ~90s+   | 极佳 | 最终作品 |

## 工作流定制

当前使用 `image_z_image_turbo_API.json` workflow。

如需使用其他 workflow：

1. 在 ComfyUI UI 中设计 workflow
2. 导出为 API 格式（菜单 → Save API Format）
3. 保存到 `modules/thumbnail/` 目录
4. 更新 `config.yaml` 中的 `workflow_template` 路径

## 相关文档

- [docs/COMFYUI_INTEGRATION.md](docs/COMFYUI_INTEGRATION.md) - 完整集成文档
- [modules/thumbnail/ai_generator_comfyui.py](modules/thumbnail/ai_generator_comfyui.py) - 客户端代码
- [test_comfyui_integration.py](test_comfyui_integration.py) - 测试脚本

## 测试命令

```bash
# 完整测试套件
python test_comfyui_integration.py

# 快速测试生成
python modules/thumbnail/ai_generator_comfyui.py \
    --prompt "Test thumbnail" \
    --output "test.jpg"
```

---

🎉 **完成！** ComfyUI 现已完全集成到 CMAS 系统中。
