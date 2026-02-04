import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOllamaModels, getOllamaImageModels, getSystemFonts, getAssets, checkComfyUIStatus } from '../api'
import FontSelector from '../components/FontSelector'

// ComfyUI Status Component
function ComfyUIStatus({ serverUrl }) {
  const { data: statusData, refetch } = useQuery({
    queryKey: ['comfyuiStatus', serverUrl],
    queryFn: () => checkComfyUIStatus(serverUrl),
    refetchInterval: 10000, // Check every 10 seconds
    enabled: !!serverUrl
  })

  const isOnline = statusData?.available === true

  return (
    <div className={`p-3 rounded-lg border ${
      isOnline 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span className={`text-sm font-medium ${
            isOnline ? 'text-green-800' : 'text-red-800'
          }`}>
            ComfyUI Server: {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs px-2 py-1 bg-white rounded border hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>
      {!isOnline && (
        <p className="text-xs text-red-700 mt-2">
          Unable to connect to {serverUrl}. Make sure ComfyUI is running.
        </p>
      )}
    </div>
  )
}

export default function Settings() {
  const [settings, setSettings] = useState({
    ai_unload_model_after: true,
    ai_model: 'qwen2.5:latest',
    subtitle_max_length: 84,
    subtitle_split_on_word: true,
    thumbnail_ai_backend: 'ollama',
    thumbnail_ai_url: 'http://localhost:11434',
    thumbnail_ai_model: 'x/z-image-turbo',
    comfyui_server_url: 'http://127.0.0.1:8188',
    comfyui_width: 1280,
    comfyui_height: 720,
    comfyui_steps: 9,
    // Thumbnail preset defaults
    default_meeting_types: ['主日敬拜', 'Youth Night', '禱告會'],
    default_title_font: '',
    default_subtitle_font: '',
    default_meeting_font: '',
    default_title_size: 96,
    default_subtitle_size: 64,
    default_meeting_size: 48,
    default_logo: '',
    default_pastor: '',
    default_logo_size: { width: 200, height: 200 },
    default_pastor_size: { width: 250, height: 250 },
    default_logo_position: { align: 'top-left', padding: 30 },
    default_pastor_position: { align: 'bottom-left', padding: 30 },
    default_title_position: { align: 'center', padding: 50, y_offset: -50 },
    default_subtitle_position: { align: 'center', padding: 50, y_offset: 50 },
    default_meeting_position: { align: 'top-right', padding: 50 },
  })

  const [saved, setSaved] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('cmas_global_settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  // Fetch available Ollama models
  const { data: ollamaModelsData } = useQuery({
    queryKey: ['ollamaModels'],
    queryFn: getOllamaModels
  })

  const { data: ollamaImageModelsData } = useQuery({
    queryKey: ['ollamaImageModels'],
    queryFn: getOllamaImageModels
  })

  // Fetch system fonts
  const { data: fontsData } = useQuery({
    queryKey: ['systemFonts'],
    queryFn: getSystemFonts
  })

  // Fetch assets
  const { data: logosData } = useQuery({
    queryKey: ['logos'],
    queryFn: () => getAssets('logos')
  })

  const { data: pastorsData } = useQuery({
    queryKey: ['pastor'],
    queryFn: () => getAssets('pastor')
  })

  const handleSave = () => {
    localStorage.setItem('cmas_global_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const addMeetingType = () => {
    setSettings(prev => ({
      ...prev,
      default_meeting_types: [...prev.default_meeting_types, '新聚會']
    }))
  }

  const updateMeetingType = (index, value) => {
    const newTypes = [...settings.default_meeting_types]
    newTypes[index] = value
    setSettings(prev => ({ ...prev, default_meeting_types: newTypes }))
  }

  const removeMeetingType = (index) => {
    const newTypes = settings.default_meeting_types.filter((_, i) => i !== index)
    setSettings(prev => ({ ...prev, default_meeting_types: newTypes }))
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">Configure default system preferences for new events</p>
      </div>
      
      {/* AI Model Settings */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-lg font-semibold text-gray-900">AI Model Settings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure default behavior for AI processing tasks
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default AI Model
          </label>
          <select
            value={settings.ai_model}
            onChange={(e) => handleChange('ai_model', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!ollamaModelsData?.models?.length}
          >
            {ollamaModelsData?.models?.length > 0 ? (
              ollamaModelsData.models.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))
            ) : (
              <option value="">
                {ollamaModelsData?.service_available === false 
                  ? 'Ollama not running'
                  : 'No models found'}
              </option>
            )}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {ollamaModelsData?.service_available === true
              ? `${ollamaModelsData.models.length} model(s) available`
              : ollamaModelsData?.service_available === false
              ? 'Start Ollama with: ollama serve'
              : 'Checking Ollama service...'}
          </p>
        </div>

        <div className="pt-3 border-t">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={settings.ai_unload_model_after}
              onChange={(e) => handleChange('ai_unload_model_after', e.target.checked)}
              className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  Unload Model After Processing
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  settings.ai_unload_model_after 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {settings.ai_unload_model_after ? 'Memory-saving' : 'Performance mode'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {settings.ai_unload_model_after ? (
                  <>
                    ✅ Model will be unloaded immediately after tasks complete, freeing GPU/CPU resources.
                    <br />
                    <span className="text-xs">Recommended for: Single tasks, limited resources, or when multiple models are used.</span>
                  </>
                ) : (
                  <>
                    ⚡ Model stays in memory for 5 minutes after completion for faster subsequent processing.
                    <br />
                    <span className="text-xs">Recommended for: Batch processing, multiple events, or when speed is critical.</span>
                  </>
                )}
              </p>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-700">
                  <strong>💡 Tip:</strong> Enable this option if you have limited VRAM or process events one at a time. 
                  Disable for faster batch processing of multiple events.
                </p>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Subtitle Settings */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-lg font-semibold text-gray-900">Default Subtitle Settings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure default subtitle generation preferences
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Characters per Line
          </label>
          <input
            type="number"
            value={settings.subtitle_max_length}
            onChange={(e) => handleChange('subtitle_max_length', parseInt(e.target.value))}
            min="40"
            max="200"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Recommended: 60-84 characters for optimal readability
          </p>
        </div>

        <div className="pt-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.subtitle_split_on_word}
              onChange={(e) => handleChange('subtitle_split_on_word', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Split on Word Boundaries
              </span>
              <p className="text-xs text-gray-600">
                Avoid breaking words mid-sentence for better readability
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Thumbnail AI Settings */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-lg font-semibold text-gray-900">Thumbnail AI Settings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure AI image generation for sermon thumbnails
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image Generation Backend
          </label>
          <select
            value={settings.thumbnail_ai_backend}
            onChange={(e) => handleChange('thumbnail_ai_backend', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ollama">Ollama (Image Models)</option>
            <option value="comfyui">ComfyUI</option>
            <option value="stable-diffusion">Stable Diffusion WebUI</option>
            <option value="fallback">Fallback (Use Asset Images)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Choose the image generation service to use
          </p>
        </div>

        {settings.thumbnail_ai_backend === 'ollama' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ollama API URL
              </label>
              <input
                type="text"
                value={settings.thumbnail_ai_url}
                onChange={(e) => handleChange('thumbnail_ai_url', e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: http://localhost:11434 (Ollama service)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image Generation Model
              </label>
              <select
                value={settings.thumbnail_ai_model}
                onChange={(e) => handleChange('thumbnail_ai_model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!ollamaImageModelsData?.models?.length}
              >
                {ollamaImageModelsData?.models?.length > 0 ? (
                  ollamaImageModelsData.models.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))
                ) : (
                  <option value="">
                    {ollamaImageModelsData?.service_available === false 
                      ? 'Ollama not running'
                      : 'No image models found'}
                  </option>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {ollamaImageModelsData?.models?.length > 0
                  ? `${ollamaImageModelsData.models.length} image model(s) available`
                  : ollamaImageModelsData?.service_available === false
                  ? 'Start Ollama with: ollama serve'
                  : 'Pull an image model: ollama pull x/z-image-turbo'}
              </p>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-800">
                <strong>✨ Quick Start:</strong> Pull an image model from Ollama:
                <br />
                <code className="bg-green-100 px-1 py-0.5 rounded mt-1 inline-block">
                  ollama pull x/z-image-turbo
                </code>
              </p>
              <p className="text-xs text-green-700 mt-2">
                This uses the same Ollama service already running for text generation!
              </p>
            </div>
          </>
        )}

        {settings.thumbnail_ai_backend === 'comfyui' && (
          <>
            <ComfyUIStatus serverUrl={settings.comfyui_server_url} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ComfyUI Server URL
              </label>
              <input
                type="text"
                value={settings.comfyui_server_url}
                onChange={(e) => handleChange('comfyui_server_url', e.target.value)}
                placeholder="http://127.0.0.1:8188"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                ComfyUI API endpoint (default: http://127.0.0.1:8188)
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width
                </label>
                <input
                  type="number"
                  value={settings.comfyui_width}
                  onChange={(e) => handleChange('comfyui_width', parseInt(e.target.value))}
                  min="256"
                  max="2048"
                  step="8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                <input
                  type="number"
                  value={settings.comfyui_height}
                  onChange={(e) => handleChange('comfyui_height', parseInt(e.target.value))}
                  min="256"
                  max="2048"
                  step="8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Steps
                </label>
                <input
                  type="number"
                  value={settings.comfyui_steps}
                  onChange={(e) => handleChange('comfyui_steps', parseInt(e.target.value))}
                  min="1"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              Image dimensions and sampling steps for generation
            </p>

            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-800">
                <strong>🎨 ComfyUI Setup:</strong> Start ComfyUI with API enabled:
                <br />
                <code className="bg-purple-100 px-1 py-0.5 rounded mt-1 inline-block">
                  python main.py --listen 127.0.0.1 --port 8188
                </code>
              </p>
              <p className="text-xs text-purple-700 mt-2">
                Using Z-Image Turbo workflow with custom prompt injection
              </p>
            </div>
          </>
        )}

        {settings.thumbnail_ai_backend === 'stable-diffusion' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stable Diffusion API URL
              </label>
              <input
                type="text"
                value={settings.thumbnail_ai_url}
                onChange={(e) => handleChange('thumbnail_ai_url', e.target.value)}
                placeholder="http://localhost:7860"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: http://localhost:7860 (Automatic1111 WebUI)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model Name (Optional)
              </label>
              <input
                type="text"
                value={settings.thumbnail_ai_model}
                onChange={(e) => handleChange('thumbnail_ai_model', e.target.value)}
                placeholder="e.g., sd_xl_base_1.0.safetensors"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use WebUI's currently selected model
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>ℹ️ Setup:</strong> Start Stable Diffusion WebUI with API enabled:
                <br />
                <code className="bg-blue-100 px-1 py-0.5 rounded mt-1 inline-block">
                  ./webui.sh --api --listen
                </code>
              </p>
            </div>
          </>
        )}

        {settings.thumbnail_ai_backend === 'fallback' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>⚠️ Note:</strong> Using fallback mode will skip AI generation and use existing images from <code className="bg-yellow-100 px-1 rounded">assets/backgrounds/</code>
            </p>
          </div>
        )}
      </div>

      {/* Thumbnail Preset Settings */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-lg font-semibold text-gray-900">Thumbnail Preset Settings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure default thumbnail composition preferences
          </p>
        </div>

        {/* Meeting Types Presets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            预设聚会类型
          </label>
          <div className="space-y-2">
            {settings.default_meeting_types.map((type, idx) => (
              <div key={idx} className="flex gap-2">
                <input 
                  type="text" 
                  value={type}
                  onChange={(e) => updateMeetingType(idx, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="聚会类型名称"
                />
                <button 
                  onClick={() => removeMeetingType(idx)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  disabled={settings.default_meeting_types.length <= 1}
                >
                  删除
                </button>
              </div>
            ))}
            <button
              onClick={addMeetingType}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加聚会类型
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            这些选项会在创建 Event 时出现在聚会类型下拉列表中
          </p>
        </div>

        {/* Font Settings */}
        <div className="space-y-3 pt-3 border-t">
          <h4 className="text-sm font-medium text-gray-700">默认字体设置</h4>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              标题字体
            </label>
            <FontSelector
              value={settings.default_title_font}
              onChange={(value) => handleChange('default_title_font', value)}
              fonts={fontsData?.fonts}
              placeholder="选择或输入标题字体"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              小标题字体
            </label>
            <FontSelector
              value={settings.default_subtitle_font}
              onChange={(value) => handleChange('default_subtitle_font', value)}
              fonts={fontsData?.fonts}
              placeholder="选择或输入小标题字体"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              聚会类型字体
            </label>
            <FontSelector
              value={settings.default_meeting_font}
              onChange={(value) => handleChange('default_meeting_font', value)}
              fonts={fontsData?.fonts}
              placeholder="选择或输入聚会类型字体"
            />
          </div>

          <p className="text-xs text-gray-500">
            {fontsData?.total 
              ? `找到 ${fontsData.total} 个系统字体，其中 ${fontsData.fonts.filter(f => f.chinese_support).length} 个支持中文`
              : '正在检测系统字体...'}
          </p>
        </div>

        {/* Font Size Settings */}
        <div className="space-y-3 pt-3 border-t">
          <h4 className="text-sm font-medium text-gray-700">默认字号设置</h4>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                标题字号
              </label>
              <input
                type="number"
                value={settings.default_title_size}
                onChange={(e) => handleChange('default_title_size', parseInt(e.target.value))}
                min="24"
                max="200"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                小标题字号
              </label>
              <input
                type="number"
                value={settings.default_subtitle_size}
                onChange={(e) => handleChange('default_subtitle_size', parseInt(e.target.value))}
                min="24"
                max="200"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                聚会类型字号
              </label>
              <input
                type="number"
                value={settings.default_meeting_size}
                onChange={(e) => handleChange('default_meeting_size', parseInt(e.target.value))}
                min="24"
                max="200"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            💡 文字过长时会自动缩小以适应画面
          </p>
        </div>

        {/* Asset Settings */}
        <div className="space-y-3 pt-3 border-t">
          <h4 className="text-sm font-medium text-gray-700">默认图片资源</h4>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              教会 Logo
            </label>
            <select
              value={settings.default_logo}
              onChange={(e) => handleChange('default_logo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">第一个可用图片</option>
              {logosData?.assets?.map(asset => (
                <option key={asset.path} value={asset.path}>
                  {asset.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              📁 上传图片到 <code className="bg-gray-100 px-1 rounded">assets/logos/</code> 目录
              {logosData?.total && ` (已有 ${logosData.total} 个)`}
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              牧师照片
            </label>
            <select
              value={settings.default_pastor}
              onChange={(e) => handleChange('default_pastor', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">第一个可用图片</option>
              {pastorsData?.assets?.map(asset => (
                <option key={asset.path} value={asset.path}>
                  {asset.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              📁 上传图片到 <code className="bg-gray-100 px-1 rounded">assets/pastor/</code> 目录
              {pastorsData?.total && ` (已有 ${pastorsData.total} 个)`}
            </p>
          </div>
        </div>

        {/* Image Size Settings */}
        <div className="space-y-3 pt-3 border-t">
          <h4 className="text-sm font-medium text-gray-700">图片尺寸设置</h4>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Logo 尺寸（像素）
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={settings.default_logo_size?.width || 200}
                onChange={(e) => handleChange('default_logo_size', {
                  ...settings.default_logo_size,
                  width: parseInt(e.target.value) || 200
                })}
                placeholder="宽度"
                min="50"
                max="800"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <input
                type="number"
                value={settings.default_logo_size?.height || 200}
                onChange={(e) => handleChange('default_logo_size', {
                  ...settings.default_logo_size,
                  height: parseInt(e.target.value) || 200
                })}
                placeholder="高度"
                min="50"
                max="800"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Logo 最大尺寸（默认: 200×200）
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Pastor 图片尺寸（像素）
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={settings.default_pastor_size?.width || 250}
                onChange={(e) => handleChange('default_pastor_size', {
                  ...settings.default_pastor_size,
                  width: parseInt(e.target.value) || 250
                })}
                placeholder="宽度"
                min="50"
                max="800"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <input
                type="number"
                value={settings.default_pastor_size?.height || 250}
                onChange={(e) => handleChange('default_pastor_size', {
                  ...settings.default_pastor_size,
                  height: parseInt(e.target.value) || 250
                })}
                placeholder="高度"
                min="50"
                max="800"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Pastor 图片最大尺寸（默认: 250×250）
            </p>
          </div>
        </div>

        {/* Position Settings */}
        <div className="space-y-3 pt-3 border-t">
          <h4 className="text-sm font-medium text-gray-700">元素位置设置</h4>
          <p className="text-xs text-gray-600 mb-2">
            配置各元素在缩略图中的位置
          </p>
          
          {/* Logo Position */}
          <div className="p-3 bg-gray-50 rounded border">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Logo 位置
            </label>
            <div className="space-y-2">
              <select
                value={settings.default_logo_position?.align || 'top-left'}
                onChange={(e) => handleChange('default_logo_position', {
                  ...settings.default_logo_position,
                  align: e.target.value
                })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="top-left">左上角</option>
                <option value="top-center">顶部居中</option>
                <option value="top-right">右上角</option>
                <option value="center">居中</option>
                <option value="bottom-left">左下角</option>
                <option value="bottom-center">底部居中</option>
                <option value="bottom-right">右下角</option>
                <option value="custom">自定义坐标</option>
              </select>
              
              {settings.default_logo_position?.align === 'custom' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={settings.default_logo_position?.x || 0}
                    onChange={(e) => handleChange('default_logo_position', {
                      ...settings.default_logo_position,
                      x: parseInt(e.target.value) || 0
                    })}
                    placeholder="X 坐标"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={settings.default_logo_position?.y || 0}
                    onChange={(e) => handleChange('default_logo_position', {
                      ...settings.default_logo_position,
                      y: parseInt(e.target.value) || 0
                    })}
                    placeholder="Y 坐标"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              ) : (
                <input
                  type="number"
                  value={settings.default_logo_position?.padding || 30}
                  onChange={(e) => handleChange('default_logo_position', {
                    ...settings.default_logo_position,
                    padding: parseInt(e.target.value) || 30
                  })}
                  placeholder="边距 (padding)"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              )}
            </div>
          </div>

          {/* Pastor Position */}
          <div className="p-3 bg-gray-50 rounded border">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Pastor 图片位置
            </label>
            <div className="space-y-2">
              <select
                value={settings.default_pastor_position?.align || 'bottom-left'}
                onChange={(e) => handleChange('default_pastor_position', {
                  ...settings.default_pastor_position,
                  align: e.target.value
                })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="top-left">左上角</option>
                <option value="top-center">顶部居中</option>
                <option value="top-right">右上角</option>
                <option value="center">居中</option>
                <option value="bottom-left">左下角</option>
                <option value="bottom-center">底部居中</option>
                <option value="bottom-right">右下角</option>
                <option value="custom">自定义坐标</option>
              </select>
              
              {settings.default_pastor_position?.align === 'custom' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={settings.default_pastor_position?.x || 0}
                    onChange={(e) => handleChange('default_pastor_position', {
                      ...settings.default_pastor_position,
                      x: parseInt(e.target.value) || 0
                    })}
                    placeholder="X 坐标"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={settings.default_pastor_position?.y || 0}
                    onChange={(e) => handleChange('default_pastor_position', {
                      ...settings.default_pastor_position,
                      y: parseInt(e.target.value) || 0
                    })}
                    placeholder="Y 坐标"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              ) : (
                <input
                  type="number"
                  value={settings.default_pastor_position?.padding || 30}
                  onChange={(e) => handleChange('default_pastor_position', {
                    ...settings.default_pastor_position,
                    padding: parseInt(e.target.value) || 30
                  })}
                  placeholder="边距 (padding)"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              )}
            </div>
          </div>

          {/* Title Position */}
          <div className="p-3 bg-gray-50 rounded border">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              标题位置
            </label>
            <div className="space-y-2">
              <select
                value={settings.default_title_position?.align || 'center'}
                onChange={(e) => handleChange('default_title_position', {
                  ...settings.default_title_position,
                  align: e.target.value
                })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="top-left">左上角</option>
                <option value="top-center">顶部居中</option>
                <option value="top-right">右上角</option>
                <option value="center">居中</option>
                <option value="bottom-left">左下角</option>
                <option value="bottom-center">底部居中</option>
                <option value="bottom-right">右下角</option>
                <option value="custom">自定义坐标</option>
              </select>
              
              {settings.default_title_position?.align === 'custom' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={settings.default_title_position?.x || 0}
                    onChange={(e) => handleChange('default_title_position', {
                      ...settings.default_title_position,
                      x: parseInt(e.target.value) || 0
                    })}
                    placeholder="X 坐标"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={settings.default_title_position?.y || 0}
                    onChange={(e) => handleChange('default_title_position', {
                      ...settings.default_title_position,
                      y: parseInt(e.target.value) || 0
                    })}
                    placeholder="Y 坐标"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              ) : (
                <>
                  <input
                    type="number"
                    value={settings.default_title_position?.padding || 50}
                    onChange={(e) => handleChange('default_title_position', {
                      ...settings.default_title_position,
                      padding: parseInt(e.target.value) || 50
                    })}
                    placeholder="边距 (padding)"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={settings.default_title_position?.y_offset || -50}
                    onChange={(e) => handleChange('default_title_position', {
                      ...settings.default_title_position,
                      y_offset: parseInt(e.target.value) || 0
                    })}
                    placeholder="垂直偏移 (y_offset)"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </>
              )}
            </div>
          </div>

          {/* Subtitle Position */}
          <div className="p-3 bg-gray-50 rounded border">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              副标题位置
            </label>
            <div className="space-y-2">
              <select
                value={settings.default_subtitle_position?.align || 'center'}
                onChange={(e) => handleChange('default_subtitle_position', {
                  ...settings.default_subtitle_position,
                  align: e.target.value
                })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="top-left">左上角</option>
                <option value="top-center">顶部居中</option>
                <option value="top-right">右上角</option>
                <option value="center">居中</option>
                <option value="bottom-left">左下角</option>
                <option value="bottom-center">底部居中</option>
                <option value="bottom-right">右下角</option>
                <option value="custom">自定义坐标</option>
              </select>
              
              {settings.default_subtitle_position?.align === 'custom' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={settings.default_subtitle_position?.x || 0}
                    onChange={(e) => handleChange('default_subtitle_position', {
                      ...settings.default_subtitle_position,
                      x: parseInt(e.target.value) || 0
                    })}
                    placeholder="X 坐标"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={settings.default_subtitle_position?.y || 0}
                    onChange={(e) => handleChange('default_subtitle_position', {
                      ...settings.default_subtitle_position,
                      y: parseInt(e.target.value) || 0
                    })}
                    placeholder="Y 坐标"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              ) : (
                <>
                  <input
                    type="number"
                    value={settings.default_subtitle_position?.padding || 50}
                    onChange={(e) => handleChange('default_subtitle_position', {
                      ...settings.default_subtitle_position,
                      padding: parseInt(e.target.value) || 50
                    })}
                    placeholder="边距 (padding)"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={settings.default_subtitle_position?.y_offset || 50}
                    onChange={(e) => handleChange('default_subtitle_position', {
                      ...settings.default_subtitle_position,
                      y_offset: parseInt(e.target.value) || 0
                    })}
                    placeholder="垂直偏移 (y_offset)"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </>
              )}
            </div>
          </div>

          {/* Meeting Type Position */}
          <div className="p-3 bg-gray-50 rounded border">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Meeting Type 位置
            </label>
            <div className="space-y-2">
              <select
                value={settings.default_meeting_position?.align || 'top-right'}
                onChange={(e) => handleChange('default_meeting_position', {
                  ...settings.default_meeting_position,
                  align: e.target.value
                })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="top-left">左上角</option>
                <option value="top-center">顶部居中</option>
                <option value="top-right">右上角</option>
                <option value="center">居中</option>
                <option value="bottom-left">左下角</option>
                <option value="bottom-center">底部居中</option>
                <option value="bottom-right">右下角</option>
                <option value="custom">自定义坐标</option>
              </select>
              
              {settings.default_meeting_position?.align === 'custom' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={settings.default_meeting_position?.x || 0}
                    onChange={(e) => handleChange('default_meeting_position', {
                      ...settings.default_meeting_position,
                      x: parseInt(e.target.value) || 0
                    })}
                    placeholder="X 坐标"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={settings.default_meeting_position?.y || 0}
                    onChange={(e) => handleChange('default_meeting_position', {
                      ...settings.default_meeting_position,
                      y: parseInt(e.target.value) || 0
                    })}
                    placeholder="Y 坐标"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              ) : (
                <input
                  type="number"
                  value={settings.default_meeting_position?.padding || 50}
                  onChange={(e) => handleChange('default_meeting_position', {
                    ...settings.default_meeting_position,
                    padding: parseInt(e.target.value) || 50
                  })}
                  placeholder="边距 (padding)"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              )}
            </div>
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>💡 提示：</strong> 这些设置会作为创建新 Event 时的默认值，你仍然可以在每个 Event 中单独调整。
          </p>
        </div>
      </div>

      {/* Resource Usage Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900">About Model Management</h4>
            <div className="text-sm text-blue-800 mt-1 space-y-1">
              <p>
                • <strong>Unload After Processing (Enabled):</strong> Ollama model is immediately unloaded, freeing ~4-8GB of VRAM depending on model size
              </p>
              <p>
                • <strong>Keep in Memory (Disabled):</strong> Model stays loaded for 5 minutes by default, allowing faster subsequent processing but consuming memory
              </p>
              <p className="mt-2 text-xs">
                You can manually unload models anytime using: <code className="bg-blue-100 px-1 rounded">ollama ps</code> and <code className="bg-blue-100 px-1 rounded">ollama stop &lt;model&gt;</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Settings
        </button>
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Settings saved successfully
          </span>
        )}
      </div>

      <div className="text-xs text-gray-500 pb-4">
        <p>💾 Settings are stored locally in your browser and will be used as defaults when creating new events.</p>
      </div>
    </div>
  )
}
