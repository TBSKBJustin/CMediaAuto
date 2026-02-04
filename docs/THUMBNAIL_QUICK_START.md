# Thumbnail 自定义功能 - 快速开始

## ✅ 已完成实现

### 后端功能
- ✅ 灵活的元素配置系统
- ✅ 自动字号调整算法
- ✅ 系统字体检测（支持简繁中文）
- ✅ 预设资源管理 API
- ✅ Workflow 参数传递

### 前端功能
- ✅ Settings 页面 - Thumbnail 预设配置
- ✅ EventCreate 页面 - 每个 Event 单独配置

## 🚀 使用流程

### 1. 配置全局默认值（Settings 页面）

进入 Settings 页面，在 **"Thumbnail Preset Settings"** 部分：

1. **配置预设聚会类型**
   - 默认已有：主日敬拜、Youth Night、禱告會
   - 点击"添加聚会类型"新增更多选项
   - 这些会出现在创建 Event 时的下拉列表中

2. **选择默认字体**
   - 标题字体、小标题字体、聚会类型字体
   - 系统会自动检测所有可用字体
   - 支持中文的字体会标记 🇨🇳
   - 推荐：PingFang（苹方）

3. **设置默认字号**
   - 标题：96px（大）
   - 小标题：64px（中）
   - 聚会类型：48px（小）

4. **选择默认图片**
   - Logo：从 `assets/logos/` 中选择
   - 牧师照片：从 `assets/pastor/` 中选择

5. **保存设置** - 点击"Save Settings"按钮

### 2. 创建 Event 时自定义

在 EventCreate 页面，找到 **"🎨 Thumbnail Composition Settings"** 面板：

1. **点击展开面板**

2. **选择要显示的元素**
   - 📝 标题（画面中央）
   - 📄 小标题（标题下方）
   - 🏷️ 聚会类型（右上角）
   - 🏛️ 教会标志（左上角）
   - 👤 牧师照片（左下角）

3. **自定义文字内容**
   - 小标题：默认使用讲员名字，也可以自定义
   - 聚会类型：从预设列表选择

4. **调整字体和字号**（可选）
   - 每个元素可单独设置字体
   - 每个元素可单独设置字号
   - 文字过长会自动缩小

5. **选择图片资源**（可选）
   - 为这个 Event 选择特定的 Logo
   - 为这个 Event 选择特定的牧师照片

6. **创建 Event**

### 3. 运行 Workflow

点击 "Run Workflow"，系统会：
1. 生成字幕
2. AI 修正字幕
3. AI 生成摘要和图片提示词
4. **Ollama 生成背景图** (1280×720)
5. **组合 Thumbnail** (使用你的配置)

## 📁 资源管理

### 添加图片资源

```bash
# Logo（建议 PNG 格式，透明背景）
assets/logos/church_logo.png
assets/logos/easter_2024.png

# 牧师照片（建议正方形或竖向）
assets/pastor/pastor_john.jpg
assets/pastor/pastor_mary.jpg

# 背景图（1280×720，作为 AI 失败时的备选）
assets/backgrounds/blue_abstract.jpg
assets/backgrounds/worship.jpg
```

### 系统字体位置

系统会自动检测这些目录的字体：
- `/System/Library/Fonts/` (macOS 系统字体)
- `/Library/Fonts/` (全局字体)
- `~/Library/Fonts/` (用户字体)
- `assets/fonts/` (自定义字体)

**推荐下载：** [Noto Sans CJK](https://github.com/googlefonts/noto-cjk) 字体到 `assets/fonts/` 目录

## 🎨 元素布局说明

```
┌─────────────────────────────────────────┐
│ [Logo]                  [聚会类型]      │
│                                          │
│                                          │
│            [标题]                        │
│         [小标题]                         │
│                                          │
│                                          │
│ [牧师照片]                               │
└─────────────────────────────────────────┘
```

- **Logo**：左上角，200×200px 以内
- **聚会类型**：右上角，小字号
- **标题**：画面中央，大字号，自动换行居中
- **小标题**：标题下方，中等字号，居中
- **牧师照片**：左下角，250×250px 以内
- **背景**：全屏 1280×720，优先使用 AI 生成

## 💡 使用技巧

1. **字号设置**
   - 中文标题建议：72-96px
   - 英文标题可以更大：96-120px
   - 系统会自动调整过长文字

2. **字体选择**
   - 简体中文：PingFang、Heiti
   - 繁体中文：PingFang、Songti
   - 英文：Arial Bold、Helvetica

3. **图片准备**
   - Logo：PNG 透明背景，尺寸 500×500px 左右
   - 牧师照片：去背景或方形裁剪，500×500px
   - 背景图：1280×720px（16:9 比例）

4. **性能优化**
   - 只显示需要的元素
   - 图片文件不要太大（<1MB）
   - 字体文件会自动缓存

## 🐛 常见问题

**Q: 中文显示不出来？**
A: 确保选择了支持中文的字体（标记🇨🇳的字体），或选择"自动检测"

**Q: 文字太小看不清？**
A: 增大字号设置，或减少文字长度

**Q: Logo/牧师照片不显示？**
A: 检查文件是否存在于正确的目录，格式是否为 JPG/PNG

**Q: 背景图是黑色的？**
A: Ollama 生成失败，检查 Ollama 服务是否运行，或使用 Stable Diffusion 后端

**Q: 如何批量处理多个 Event？**
A: 在 Settings 设置好默认值后，创建 Event 时直接使用默认配置即可

## 📊 API 端点

```javascript
// 获取系统字体
GET /api/fonts/system

// 获取资源列表
GET /api/assets/logos
GET /api/assets/pastor
GET /api/assets/backgrounds
```

## 示例配置

### 中文主日敬拜

```json
{
  "elements": {
    "title": true,
    "subtitle": true,
    "meeting_type": true,
    "logo": true,
    "pastor": true
  },
  "subtitle_text": "馮忠強牧師",
  "meeting_type": "主日敬拜",
  "title_font_size": 96,
  "subtitle_font_size": 64,
  "meeting_font_size": 48,
  "title_font_path": "/System/Library/Fonts/PingFang.ttc"
}
```

### 英文 Youth Night

```json
{
  "elements": {
    "title": true,
    "subtitle": false,
    "meeting_type": true,
    "logo": true,
    "pastor": false
  },
  "meeting_type": "Youth Night",
  "title_font_size": 120,
  "meeting_font_size": 52,
  "title_font_path": "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
}
```

### 极简风格

```json
{
  "elements": {
    "title": true,
    "subtitle": false,
    "meeting_type": false,
    "logo": false,
    "pastor": false
  },
  "title_font_size": 96
}
```

## 🎉 开始使用

1. 打开前端：`http://localhost:5173`
2. 进入 Settings 配置默认值
3. 创建新 Event 并自定义
4. Run Workflow 查看效果！
