import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOllamaModels, getOllamaImageModels } from '../api'

export default function Settings() {
  const [settings, setSettings] = useState({
    ai_unload_model_after: true,
    ai_model: 'qwen2.5:latest',
    subtitle_max_length: 84,
    subtitle_split_on_word: true,
    thumbnail_ai_backend: 'ollama',
    thumbnail_ai_url: 'http://localhost:11434',
    thumbnail_ai_model: 'x/z-image-turbo',
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

  const handleSave = () => {
    localStorage.setItem('cmas_global_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
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
            <option value="stable-diffusion">Stable Diffusion WebUI</option>
            <option value="comfyui">ComfyUI (Coming Soon)</option>
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
