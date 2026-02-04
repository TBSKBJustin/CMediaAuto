# ComfyUI 完整集成测试指南

## ✅ 已完成的集成

### 后端
- ✅ `ai_generator_comfyui.py` - ComfyUI 客户端
- ✅ `api_server.py` - 4 个 ComfyUI API 端点 + EventCreate 模型更新
- ✅ `event_manager.py` - 支持 ComfyUI 参数存储
- ✅ `config.yaml` - ComfyUI 配置项

### 前端
- ✅ `Settings.jsx` - 全局 ComfyUI 设置（带实时状态检查）
- ✅ `EventCreate.jsx` - 事件创建时选择 ComfyUI
- ✅ `api.js` - ComfyUI API 调用函数

## 🎯 完整测试流程

### 1. 启动所有服务

**ComfyUI 服务器：**
```bash
cd /path/to/ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```

**CMAS 后端：**
```bash
cd /Users/justin/Desktop/Justin/school/CMAS
source venv/bin/activate
python api_server.py
```

**CMAS 前端：**
```bash
cd frontend
npm run dev
```

### 2. 配置全局设置

1. 访问 http://localhost:3000/settings
2. 找到 **Thumbnail AI Settings**
3. 选择 **ComfyUI** 作为 Image Generation Backend
4. 配置：
   - Server URL: `http://192.168.0.114:8188`（你的 ComfyUI 地址）
   - Width: `1280`
   - Height: `720`
   - Steps: `9`
5. 确认顶部显示 ✅ **ComfyUI Server: Online**
6. 点击 **Save Settings**

### 3. 创建新事件测试

1. 访问 http://localhost:3000/events/create
2. 填写基本信息：
   - Title: `测试 ComfyUI 集成`
   - Speaker: `测试讲员`
   - Scripture: `测试经文`
3. 找到 **Thumbnail AI Settings** 部分
4. 确认选择了 **ComfyUI**
5. 查看 ComfyUI 配置（应该自动加载全局设置）：
   - Server URL: `http://192.168.0.114:8188`
   - Width: `1280`
   - Height: `720`
   - Steps: `9`
6. 可以针对此事件自定义这些参数
7. 点击 **Create Event**

### 4. 验证事件配置

事件创建后，检查事件的 JSON 配置：

```bash
cat events/*/event.json | jq '.comfyui_server_url, .comfyui_width, .comfyui_height, .comfyui_steps'
```

应该看到：
```json
"http://192.168.0.114:8188"
1280
720
9
```

### 5. 运行工作流测试

1. 在事件详情页面上传视频或手动添加视频路径
2. 启用缩略图生成模块
3. 运行工作流
4. 系统应该：
   - 使用事件配置的 ComfyUI 参数
   - 连接到指定的 ComfyUI 服务器
   - 生成 AI 背景图
   - 合成最终缩略图

## 📝 测试清单

### 基础功能
- [ ] ComfyUI 服务器状态检查正常
- [ ] 设置页面可以配置 ComfyUI 参数
- [ ] 设置页面实时显示服务器在线/离线状态
- [ ] 设置可以正确保存到 localStorage

### 事件创建
- [ ] 事件创建页面显示 ComfyUI 选项
- [ ] 可以选择 ComfyUI 作为后端
- [ ] ComfyUI 配置字段正确显示
- [ ] 可以自定义每个事件的 ComfyUI 参数
- [ ] 创建的事件正确保存 ComfyUI 配置

### API 测试
- [ ] `GET /api/comfyui/status` 返回正确状态
- [ ] `GET /api/comfyui/config` 返回配置
- [ ] `PUT /api/comfyui/config` 可以更新配置
- [ ] `POST /api/comfyui/generate` 可以生成图像
- [ ] `POST /api/events` 正确保存 ComfyUI 参数

### 完整流程
- [ ] 使用 ComfyUI 创建事件
- [ ] 上传视频到事件
- [ ] 运行工作流生成缩略图
- [ ] 检查生成的缩略图使用了 AI 背景
- [ ] 检查 logs/ 目录中的生成记录

## 🔍 调试技巧

### 查看前端发送的数据

打开浏览器开发者工具 → Network 标签，创建事件时查看 POST 请求体：

```json
{
  "title": "测试",
  "speaker": "测试讲员",
  "thumbnail_ai_backend": "comfyui",
  "comfyui_server_url": "http://192.168.0.114:8188",
  "comfyui_width": 1280,
  "comfyui_height": 720,
  "comfyui_steps": 9,
  ...
}
```

### 查看后端日志

```bash
# 后端终端应该显示
INFO:     POST /api/events
# 检查是否有错误
```

### 查看事件配置文件

```bash
cat events/2026-02-04_1234_测试/event.json
```

应包含：
```json
{
  "thumbnail_ai_backend": "comfyui",
  "comfyui_server_url": "http://192.168.0.114:8188",
  "comfyui_width": 1280,
  "comfyui_height": 720,
  "comfyui_steps": 9
}
```

### 直接测试 API

```bash
# 测试状态
curl "http://localhost:5001/api/comfyui/status?server_url=http://192.168.0.114:8188"

# 测试生成
curl -X POST http://localhost:5001/api/comfyui/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Church interior test",
    "width": 1280,
    "height": 720,
    "steps": 9,
    "server_url": "http://192.168.0.114:8188"
  }'
```

## 🎉 预期结果

完成后，你应该能够：

1. ✅ 在设置页面配置全局 ComfyUI 参数
2. ✅ 看到 ComfyUI 服务器实时状态
3. ✅ 创建事件时选择 ComfyUI
4. ✅ 每个事件可以有自己的 ComfyUI 配置
5. ✅ 运行工作流时使用 ComfyUI 生成缩略图
6. ✅ 支持中文 prompt
7. ✅ 支持自定义图像尺寸和采样步数

## 常见问题

### Q: 前端显示 "Offline"
**A:** 检查 ComfyUI 是否运行在配置的地址和端口

### Q: 创建事件时 ComfyUI 选项不显示
**A:** 清除浏览器缓存，重新加载前端

### Q: 事件配置中没有 ComfyUI 参数
**A:** 确保后端已重启，API 模型已更新

### Q: 工作流没有使用 ComfyUI
**A:** 检查事件的 `thumbnail_ai_backend` 字段是否为 "comfyui"

---

完整集成完成！ComfyUI 现已完全融入事件创建和设置流程。
