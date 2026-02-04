# Thumbnail Customization Guide

## 功能概览

现在 Thumbnail 生成支持完全自定义配置，包括：

### 1. 可自定义元素

#### 文字元素
- **标题 (Title)** - 画面正中央，大字号，自动换行，长文本自动缩小字号
- **小标题 (Subtitle)** - 标题下方，中等字号，自动换行，长文本自动缩小字号
- **聚会类型 (Meeting Type)** - 右上角，小字号，自动调整

#### 图片元素
- **教会标志 (Logo)** - 左上角，支持 PNG/JPG
- **牧师照片 (Pastor Image)** - 左下角，支持 PNG/JPG
- **背景图 (Background)** - 全屏背景，优先使用 AI 生成图片

### 2. 字体自定义

#### 支持的字体源
1. **自定义字体** - `assets/fonts/` 目录中的字体文件
2. **系统字体** - 自动检测 macOS 系统字体

#### 中文字体支持（按优先级）
- PingFang（苹方，macOS 默认，简繁通用）
- Songti（宋体）
- STHeiti（黑体）
- Hiragino Sans GB（冬青黑体）
- Noto Sans CJK（推荐下载到 assets/fonts/）

#### 字体设置
- 每个文字元素可单独设置字体
- 每个文字元素可单独设置字号
- 字号过大时自动缩小以适应画面

### 3. 预设资源管理

#### 资源类型
- `assets/logos/` - 教会标志图片
- `assets/pastor/` - 牧师照片
- `assets/backgrounds/` - 背景图片

#### 预设配置
- 可在设置页面预设多个图片选项
- 创建 Event 时可选择预设图片
- 支持为每个 Event 单独上传图片

## API 端点

### 获取系统字体列表
```http
GET /api/fonts/system
```

**响应示例：**
```json
{
  "fonts": [
    {
      "name": "PingFang",
      "path": "/System/Library/Fonts/PingFang.ttc",
      "chinese_support": true
    },
    {
      "name": "Arial Bold",
      "path": "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
      "chinese_support": false
    }
  ],
  "total": 156
}
```

### 获取预设资源列表
```http
GET /api/assets/{asset_type}
```

**参数：**
- `asset_type`: `logos` | `pastor` | `backgrounds`

**响应示例：**
```json
{
  "assets": [
    {
      "name": "church_logo_2024",
      "filename": "church_logo_2024.png",
      "path": "assets/logos/church_logo_2024.png",
      "size": 125847
    }
  ],
  "total": 3,
  "asset_type": "logos"
}
```

## Event 配置示例

### 完整配置结构
```json
{
  "title": "盟約與我",
  "speaker": "馮忠強牧師",
  "thumbnail_settings": {
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
    "title_font_path": "/System/Library/Fonts/PingFang.ttc",
    "subtitle_font_path": "/System/Library/Fonts/PingFang.ttc",
    "meeting_font_path": "/System/Library/Fonts/PingFang.ttc",
    "logo_path": "assets/logos/church_logo.png",
    "pastor_path": "assets/pastor/pastor_photo.jpg",
    "background_path": null
  }
}
```

### 最小配置（使用默认值）
```json
{
  "title": "主日敬拜",
  "speaker": "李牧師"
}
```

## 前端实现指南

### 1. Settings 页面添加项

#### Thumbnail 预设设置部分
```jsx
// 添加到 Settings.jsx

const [thumbSettings, setThumbSettings] = useState({
  default_meeting_types: ['主日敬拜', 'Youth Night', '禱告會'],
  default_logo: null,
  default_pastor: null,
  default_title_font: '/System/Library/Fonts/PingFang.ttc',
  default_subtitle_font: '/System/Library/Fonts/PingFang.ttc',
  default_meeting_font: '/System/Library/Fonts/PingFang.ttc',
  default_title_size: 96,
  default_subtitle_size: 64,
  default_meeting_size: 48
})

// 获取字体列表
const { data: fontsData } = useQuery({
  queryKey: ['systemFonts'],
  queryFn: getSystemFonts
})

// 获取资源列表
const { data: logosData } = useQuery({
  queryKey: ['logos'],
  queryFn: () => getAssets('logos')
})

const { data: pastorsData } = useQuery({
  queryKey: ['pastor'],
  queryFn: () => getAssets('pastor')
})
```

#### UI 组件
```jsx
{/* 预设聚会类型 */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    预设聚会类型
  </label>
  <div className="space-y-2">
    {thumbSettings.default_meeting_types.map((type, idx) => (
      <div key={idx} className="flex gap-2">
        <input 
          type="text" 
          value={type}
          onChange={(e) => {
            const newTypes = [...thumbSettings.default_meeting_types]
            newTypes[idx] = e.target.value
            setThumbSettings(prev => ({
              ...prev, 
              default_meeting_types: newTypes
            }))
          }}
          className="flex-1 px-3 py-2 border rounded-lg"
        />
        <button 
          onClick={() => {
            const newTypes = thumbSettings.default_meeting_types.filter((_, i) => i !== idx)
            setThumbSettings(prev => ({
              ...prev,
              default_meeting_types: newTypes
            }))
          }}
          className="px-3 py-2 bg-red-500 text-white rounded-lg"
        >
          删除
        </button>
      </div>
    ))}
    <button
      onClick={() => {
        setThumbSettings(prev => ({
          ...prev,
          default_meeting_types: [...prev.default_meeting_types, '新聚会']
        }))
      }}
      className="px-4 py-2 bg-blue-500 text-white rounded-lg"
    >
      + 添加聚会类型
    </button>
  </div>
</div>

{/* 字体选择 */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    默认标题字体
  </label>
  <select
    value={thumbSettings.default_title_font}
    onChange={(e) => setThumbSettings(prev => ({
      ...prev,
      default_title_font: e.target.value
    }))}
    className="w-full px-3 py-2 border rounded-lg"
  >
    <option value="">自动检测（支持中文）</option>
    {fontsData?.fonts?.filter(f => f.chinese_support).map(font => (
      <option key={font.path} value={font.path}>
        {font.name} {font.chinese_support ? '🇨🇳' : ''}
      </option>
    ))}
  </select>
</div>

{/* Logo 选择 */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    默认 Logo
  </label>
  <select
    value={thumbSettings.default_logo || ''}
    onChange={(e) => setThumbSettings(prev => ({
      ...prev,
      default_logo: e.target.value || null
    }))}
    className="w-full px-3 py-2 border rounded-lg"
  >
    <option value="">第一个可用图片</option>
    {logosData?.assets?.map(asset => (
      <option key={asset.path} value={asset.path}>
        {asset.name}
      </option>
    ))}
  </select>
  <p className="text-xs text-gray-500 mt-1">
    上传图片到 assets/logos/ 目录
  </p>
</div>
```

### 2. EventCreate 页面添加项

#### Thumbnail 配置折叠面板
```jsx
const [showThumbSettings, setShowThumbSettings] = useState(false)
const [eventThumbSettings, setEventThumbSettings] = useState({
  elements: {
    title: true,
    subtitle: true,
    meeting_type: true,
    logo: true,
    pastor: true
  },
  subtitle_text: '',
  meeting_type: '',
  title_font_size: 96,
  subtitle_font_size: 64,
  meeting_font_size: 48,
  title_font_path: null,
  subtitle_font_path: null,
  meeting_font_path: null,
  logo_path: null,
  pastor_path: null
})

// 从全局设置加载默认值
useEffect(() => {
  const savedSettings = localStorage.getItem('cmas_global_settings')
  if (savedSettings) {
    const settings = JSON.parse(savedSettings)
    setEventThumbSettings(prev => ({
      ...prev,
      title_font_path: settings.default_title_font,
      subtitle_font_path: settings.default_subtitle_font,
      meeting_font_path: settings.default_meeting_font,
      title_font_size: settings.default_title_size || 96,
      subtitle_font_size: settings.default_subtitle_size || 64,
      meeting_font_size: settings.default_meeting_size || 48,
      logo_path: settings.default_logo,
      pastor_path: settings.default_pastor
    }))
  }
}, [])
```

#### UI 组件
```jsx
{/* Thumbnail Settings 折叠面板 */}
<div className="bg-white rounded-lg shadow p-6">
  <button
    onClick={() => setShowThumbSettings(!showThumbSettings)}
    className="w-full flex items-center justify-between"
  >
    <div>
      <h3 className="text-lg font-semibold text-gray-900">
        🎨 Thumbnail 设置
      </h3>
      <p className="text-sm text-gray-600">
        自定义缩略图元素和样式
      </p>
    </div>
    <svg 
      className={`w-5 h-5 transition-transform ${showThumbSettings ? 'rotate-180' : ''}`}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {showThumbSettings && (
    <div className="mt-6 space-y-6">
      {/* 元素开关 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">显示元素</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'title', label: '标题' },
            { key: 'subtitle', label: '小标题' },
            { key: 'meeting_type', label: '聚会类型' },
            { key: 'logo', label: '教会标志' },
            { key: 'pastor', label: '牧师照片' }
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={eventThumbSettings.elements[key]}
                onChange={(e) => setEventThumbSettings(prev => ({
                  ...prev,
                  elements: {
                    ...prev.elements,
                    [key]: e.target.checked
                  }
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 文字内容 */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            小标题文字
          </label>
          <input
            type="text"
            value={eventThumbSettings.subtitle_text}
            onChange={(e) => setEventThumbSettings(prev => ({
              ...prev,
              subtitle_text: e.target.value
            }))}
            placeholder="默认使用讲员名字"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            聚会类型
          </label>
          <select
            value={eventThumbSettings.meeting_type}
            onChange={(e) => setEventThumbSettings(prev => ({
              ...prev,
              meeting_type: e.target.value
            }))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">不显示</option>
            {/* 从全局设置加载预设类型 */}
            <option value="主日敬拜">主日敬拜</option>
            <option value="Youth Night">Youth Night</option>
            <option value="禱告會">禱告會</option>
          </select>
        </div>
      </div>

      {/* 字体和字号设置 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">字体样式</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">标题字号</label>
            <input
              type="number"
              value={eventThumbSettings.title_font_size}
              onChange={(e) => setEventThumbSettings(prev => ({
                ...prev,
                title_font_size: parseInt(e.target.value)
              }))}
              min="24"
              max="200"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">小标题字号</label>
            <input
              type="number"
              value={eventThumbSettings.subtitle_font_size}
              onChange={(e) => setEventThumbSettings(prev => ({
                ...prev,
                subtitle_font_size: parseInt(e.target.value)
              }))}
              min="24"
              max="200"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">标题字体</label>
          <select
            value={eventThumbSettings.title_font_path || ''}
            onChange={(e) => setEventThumbSettings(prev => ({
              ...prev,
              title_font_path: e.target.value || null
            }))}
            className="w-full px-2 py-1 border rounded-lg text-sm"
          >
            <option value="">自动检测（中文优先）</option>
            {fontsData?.fonts?.filter(f => f.chinese_support).slice(0, 10).map(font => (
              <option key={font.path} value={font.path}>
                {font.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 图片资源选择 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">图片资源</h4>
        
        <div>
          <label className="block text-xs text-gray-600 mb-1">Logo</label>
          <select
            value={eventThumbSettings.logo_path || ''}
            onChange={(e) => setEventThumbSettings(prev => ({
              ...prev,
              logo_path: e.target.value || null
            }))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">使用默认</option>
            {logosData?.assets?.map(asset => (
              <option key={asset.path} value={asset.path}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">牧师照片</label>
          <select
            value={eventThumbSettings.pastor_path || ''}
            onChange={(e) => setEventThumbSettings(prev => ({
              ...prev,
              pastor_path: e.target.value || null
            }))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">使用默认</option>
            {pastorsData?.assets?.map(asset => (
              <option key={asset.path} value={asset.path}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        💡 提示：文字过长时会自动缩小字号以适应画面
      </div>
    </div>
  )}
</div>

// 在提交时包含 thumbnail_settings
const handleSubmit = async (e) => {
  e.preventDefault()
  
  const eventData = {
    ...formData,
    thumbnail_settings: eventThumbSettings
  }
  
  // ... 提交逻辑
}
```

## 使用流程

### 1. 初次设置（Settings 页面）
1. 配置默认聚会类型（主日敬拜、Youth Night 等）
2. 选择默认字体
3. 选择默认 Logo 和牧师照片
4. 设置默认字号
5. 保存设置

### 2. 创建 Event
1. 展开 "Thumbnail 设置" 面板
2. 选择要显示的元素
3. 输入/选择聚会类型
4. 调整字号和字体（可选）
5. 选择特定的 Logo/牧师照片（可选）
6. 创建 Event

### 3. 运行 Workflow
- Thumbnail 生成会使用你配置的所有设置
- AI 生成的背景图会自动使用
- 文字会自动居中并调整大小

## 注意事项

1. **中文字体推荐**
   - 最好下载 Noto Sans CJK 字体到 `assets/fonts/`
   - 系统自带的 PingFang 也很好用

2. **图片资源**
   - Logo: 建议 PNG 格式（透明背景）
   - 牧师照片: JPG/PNG，建议正方形或竖向
   - 背景图: 1280×720 尺寸最佳

3. **字号建议**
   - 标题: 72-120px
   - 小标题: 48-80px
   - 聚会类型: 36-60px

4. **性能考虑**
   - 字体文件较大，加载时可能有延迟
   - 建议预设常用的 2-3 种字体
