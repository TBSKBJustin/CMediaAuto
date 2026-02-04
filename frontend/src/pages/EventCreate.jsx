import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createEvent, getWhisperModels, getOllamaModels, getOllamaImageModels, getSystemFonts, getAssets } from '../api'
import FontSelector from '../components/FontSelector'

export default function EventCreate() {
  const navigate = useNavigate()
  
  // Load default settings from localStorage
  const getDefaultSettings = () => {
    const savedSettings = localStorage.getItem('cmas_global_settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      return {
        subtitle_max_length: parsed.subtitle_max_length || 84,
        subtitle_split_on_word: parsed.subtitle_split_on_word !== undefined ? parsed.subtitle_split_on_word : true,
        ai_model: parsed.ai_model || 'qwen2.5:latest',
        ai_unload_model_after: parsed.ai_unload_model_after !== undefined ? parsed.ai_unload_model_after : true,
        thumbnail_ai_backend: parsed.thumbnail_ai_backend || 'stable-diffusion',
        thumbnail_ai_url: parsed.thumbnail_ai_url || 'http://localhost:7860',
        thumbnail_ai_model: parsed.thumbnail_ai_model || '',
        comfyui_server_url: parsed.comfyui_server_url || 'http://127.0.0.1:8188',
        comfyui_width: parsed.comfyui_width || 1280,
        comfyui_height: parsed.comfyui_height || 720,
        comfyui_steps: parsed.comfyui_steps || 9,
        // Thumbnail presets
        default_meeting_types: parsed.default_meeting_types || ['主日敬拜', 'Youth Night', '禱告會'],
        default_title_font: parsed.default_title_font || '',
        default_subtitle_font: parsed.default_subtitle_font || '',
        default_meeting_font: parsed.default_meeting_font || '',
        default_title_size: parsed.default_title_size || 96,
        default_subtitle_size: parsed.default_subtitle_size || 64,
        default_meeting_size: parsed.default_meeting_size || 48,
        default_logo: parsed.default_logo || '',
        default_pastor: parsed.default_pastor || '',
        default_logo_size: parsed.default_logo_size || { width: 200, height: 200 },
        default_pastor_size: parsed.default_pastor_size || { width: 250, height: 250 },
        default_logo_position: parsed.default_logo_position || { align: 'top-left', padding: 30 },
        default_pastor_position: parsed.default_pastor_position || { align: 'bottom-left', padding: 30 },
        default_title_position: parsed.default_title_position || { align: 'center', padding: 50, y_offset: -50 },
        default_subtitle_position: parsed.default_subtitle_position || { align: 'center', padding: 50, y_offset: 50 },
        default_meeting_position: parsed.default_meeting_position || { align: 'top-right', padding: 50 },
      }
    }
    return {
      subtitle_max_length: 84,
      subtitle_split_on_word: true,
      ai_model: 'qwen2.5:latest',
      ai_unload_model_after: true,
      thumbnail_ai_backend: 'ollama',
      thumbnail_ai_url: 'http://localhost:11434',
      thumbnail_ai_model: 'x/z-image-turbo',
      comfyui_server_url: 'http://127.0.0.1:8188',
      comfyui_width: 1280,
      comfyui_height: 720,
      comfyui_steps: 9,
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
    }
  }
  
  const defaults = getDefaultSettings()
  
  const [formData, setFormData] = useState({
    title: '',
    speaker: '',
    series: '',
    scripture: '',
    language: 'auto',
    whisper_model: 'base',
    subtitle_max_length: defaults.subtitle_max_length,
    subtitle_split_on_word: defaults.subtitle_split_on_word,
    ai_model: defaults.ai_model,
    ai_correct_subtitles: true,
    ai_generate_summary: true,
    ai_summary_length: 'medium',
    ai_summary_languages: ['en'],
    ai_unload_model_after: defaults.ai_unload_model_after,
    thumbnail_ai_backend: defaults.thumbnail_ai_backend,
    thumbnail_ai_url: defaults.thumbnail_ai_url,
    thumbnail_ai_model: defaults.thumbnail_ai_model,
    comfyui_server_url: defaults.comfyui_server_url,
    comfyui_width: defaults.comfyui_width,
    comfyui_height: defaults.comfyui_height,
    comfyui_steps: defaults.comfyui_steps,
    modules: {
      subtitles: true,
      subtitle_correction: true,
      content_summary: true,
      thumbnail_ai: true,
      thumbnail_compose: true,
      ai_content: false,  // Legacy combined module
      publish_youtube: false,
      publish_website: false,
    }
  })

  // Thumbnail settings state
  const [showThumbSettings, setShowThumbSettings] = useState(false)
  const [thumbSettings, setThumbSettings] = useState({
    elements: {
      title: true,
      subtitle: true,
      meeting_type: true,
      logo: true,
      pastor: true
    },
    subtitle_text: '',
    meeting_type: defaults.default_meeting_types[0] || '',
    title_font_size: defaults.default_title_size,
    subtitle_font_size: defaults.default_subtitle_size,
    meeting_font_size: defaults.default_meeting_size,
    title_font_path: defaults.default_title_font,
    subtitle_font_path: defaults.default_subtitle_font,
    meeting_font_path: defaults.default_meeting_font,
    logo_path: defaults.default_logo,
    pastor_path: defaults.default_pastor,
    background_path: null,
    logo_size: defaults.default_logo_size,
    pastor_size: defaults.default_pastor_size,
    logo_position: defaults.default_logo_position || { align: 'top-left', padding: 30 },
    pastor_position: defaults.default_pastor_position || { align: 'bottom-left', padding: 30 },
    title_position: defaults.default_title_position || { align: 'center', padding: 50, y_offset: -50 },
    subtitle_position: defaults.default_subtitle_position || { align: 'center', padding: 50, y_offset: 50 },
    meeting_position: defaults.default_meeting_position || { align: 'top-right', padding: 50 }
  })
  
  // Fetch available models
  const { data: whisperModelsData } = useQuery({
    queryKey: ['whisperModels'],
    queryFn: getWhisperModels
  })
  
  const { data: ollamaModelsData } = useQuery({
    queryKey: ['ollamaModels'],
    queryFn: getOllamaModels
  })
  
  const { data: ollamaImageModelsData } = useQuery({
    queryKey: ['ollamaImageModels'],
    queryFn: getOllamaImageModels
  })

  // Fetch system fonts and assets
  const { data: fontsData } = useQuery({
    queryKey: ['systemFonts'],
    queryFn: getSystemFonts
  })

  const { data: logosData } = useQuery({
    queryKey: ['logos'],
    queryFn: () => getAssets('logos')
  })

  const { data: pastorsData } = useQuery({
    queryKey: ['pastor'],
    queryFn: () => getAssets('pastor')
  })
  
  // Set default models when data loads
  useEffect(() => {
    if (whisperModelsData?.default && !formData.whisper_model) {
      setFormData(prev => ({ ...prev, whisper_model: whisperModelsData.default }))
    }
  }, [whisperModelsData])
  
  useEffect(() => {
    if (ollamaModelsData?.default && formData.ai_model === 'qwen2.5:latest') {
      setFormData(prev => ({ ...prev, ai_model: ollamaModelsData.default }))
    }
  }, [ollamaModelsData])
  
  useEffect(() => {
    if (ollamaImageModelsData?.default && formData.thumbnail_ai_model === 'x/z-image-turbo') {
      setFormData(prev => ({ ...prev, thumbnail_ai_model: ollamaImageModelsData.default }))
    }
  }, [ollamaImageModelsData])
  
  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: (data) => {
      navigate(`/events/${data.event_id}`)
    }
  })
  
  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Include thumbnail settings in the submission
    const eventData = {
      ...formData,
      thumbnail_settings: thumbSettings
    }
    
    createMutation.mutate(eventData)
  }
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleModuleToggle = (moduleName) => {
    setFormData(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleName]: !prev.modules[moduleName]
      }
    }))
  }
  
  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Create New Event</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold">Event Details</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Sermon title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Speaker *
            </label>
            <input
              type="text"
              name="speaker"
              required
              value={formData.speaker}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Pastor name"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Series
              </label>
              <input
                type="text"
                name="series"
                value={formData.series}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scripture
              </label>
              <input
                type="text"
                name="scripture"
                value={formData.scripture}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., John 3:16"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="auto">Auto Detect</option>
                <option value="en">English</option>
                <option value="zh">中文 (Chinese)</option>
                <option value="es">Español (Spanish)</option>
                <option value="fr">Français (French)</option>
                <option value="de">Deutsch (German)</option>
                <option value="ja">日本語 (Japanese)</option>
                <option value="ko">한국어 (Korean)</option>
                <option value="pt">Português (Portuguese)</option>
                <option value="ru">Русский (Russian)</option>
                <option value="ar">العربية (Arabic)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Whisper Model
              </label>
              <select
                name="whisper_model"
                value={formData.whisper_model}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!whisperModelsData?.models?.length}
              >
                {whisperModelsData?.models?.length > 0 ? (
                  whisperModelsData.models.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))
                ) : (
                  <option value="">No models found - please download models</option>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {whisperModelsData?.models?.length > 0 
                  ? `${whisperModelsData.models.length} model(s) available`
                  : 'Download models to ../whisper.cpp/models/'}
              </p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Subtitle Settings</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Characters per Line
                </label>
                <input
                  type="number"
                  name="subtitle_max_length"
                  value={formData.subtitle_max_length}
                  onChange={handleChange}
                  min="40"
                  max="200"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 60-84 characters
                </p>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="subtitle_split_on_word"
                    checked={formData.subtitle_split_on_word}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      subtitle_split_on_word: e.target.checked
                    }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Split on Word Boundaries</span>
                    <p className="text-xs text-gray-500">
                      Avoid breaking words mid-sentence
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold">Subtitle Correction</h3>
          <p className="text-sm text-gray-600">
            Use AI to correct spelling errors and transcription mistakes in subtitles
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Model
            </label>
            <select
              name="ai_model"
              value={formData.ai_model}
              onChange={handleChange}
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
                    ? 'Ollama not running - start with: ollama serve'
                    : 'No models found - download with: ollama pull qwen2.5'}
                </option>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {ollamaModelsData?.service_available === true
                ? `${ollamaModelsData.models.length} model(s) available`
                : ollamaModelsData?.service_available === false
                ? 'Ollama service not available'
                : 'Checking Ollama...'}
            </p>
          </div>
          
          <div className="flex items-start">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="ai_unload_model_after"
                checked={formData.ai_unload_model_after}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  ai_unload_model_after: e.target.checked
                }))}
                className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Unload Model After Processing</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Release GPU/CPU resources immediately after tasks complete. Enable for single tasks or when resources are limited. Disable for batch processing.
                </p>
              </div>
            </label>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold">Content Summary</h3>
          <p className="text-sm text-gray-600">
            Use AI to generate content summaries for thumbnails and social media posts
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Model
            </label>
            <select
              name="ai_model"
              value={formData.ai_model}
              onChange={handleChange}
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
                    ? 'Ollama not running - start with: ollama serve'
                    : 'No models found - download with: ollama pull qwen2.5'}
                </option>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {ollamaModelsData?.service_available === true
                ? `${ollamaModelsData.models.length} model(s) available`
                : ollamaModelsData?.service_available === false
                ? 'Ollama service not available'
                : 'Checking Ollama...'}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Summary Length
            </label>
            <select
              name="ai_summary_length"
              value={formData.ai_summary_length}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="short">Short (2-3 paragraphs)</option>
              <option value="medium">Medium (4-5 paragraphs)</option>
              <option value="long">Long (6-8 paragraphs)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Summary Languages (可多选)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {[
                { code: 'en', name: 'English' },
                { code: 'zh', name: '中文 (Chinese)' },
                { code: 'zh-CN', name: '简体中文 (Simplified Chinese)' },
                { code: 'zh-TW', name: '繁體中文 (Traditional Chinese)' },
                { code: 'es', name: 'Español (Spanish)' },
                { code: 'fr', name: 'Français (French)' },
                { code: 'de', name: 'Deutsch (German)' },
                { code: 'ja', name: '日本語 (Japanese)' },
                { code: 'ko', name: '한국어 (Korean)' },
                { code: 'pt', name: 'Português (Portuguese)' },
                { code: 'ru', name: 'Русский (Russian)' },
                { code: 'ar', name: 'العربية (Arabic)' },
                { code: 'hi', name: 'हिन्दी (Hindi)' }
              ].map(lang => (
                <label key={lang.code} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={formData.ai_summary_languages.includes(lang.code)}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        ai_summary_languages: e.target.checked
                          ? [...prev.ai_summary_languages, lang.code]
                          : prev.ai_summary_languages.filter(l => l !== lang.code)
                      }))
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{lang.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.ai_summary_languages.length} language(s) selected
            </p>
          </div>
        </div>
        
        {/* Thumbnail AI Settings */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold">Thumbnail AI Settings</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image Generation Backend
            </label>
            <select
              value={formData.thumbnail_ai_backend}
              onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_ai_backend: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ollama">Ollama (Image Models)</option>
              <option value="comfyui">ComfyUI</option>
              <option value="stable-diffusion">Stable Diffusion WebUI</option>
              <option value="fallback">Fallback (Use Asset Images)</option>
            </select>
          </div>

          {formData.thumbnail_ai_backend === 'ollama' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ollama Image Model
              </label>
              <select
                value={formData.thumbnail_ai_model}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_ai_model: e.target.value }))}
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
          )}

          {formData.thumbnail_ai_backend === 'comfyui' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ComfyUI Server URL
                </label>
                <input
                  type="text"
                  value={formData.comfyui_server_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, comfyui_server_url: e.target.value }))}
                  placeholder="http://127.0.0.1:8188"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ComfyUI API endpoint
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width
                  </label>
                  <input
                    type="number"
                    value={formData.comfyui_width}
                    onChange={(e) => setFormData(prev => ({ ...prev, comfyui_width: parseInt(e.target.value) }))}
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
                    value={formData.comfyui_height}
                    onChange={(e) => setFormData(prev => ({ ...prev, comfyui_height: parseInt(e.target.value) }))}
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
                    value={formData.comfyui_steps}
                    onChange={(e) => setFormData(prev => ({ ...prev, comfyui_steps: parseInt(e.target.value) }))}
                    min="1"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                Image dimensions and sampling steps
              </p>
            </>
          )}

          {formData.thumbnail_ai_backend === 'stable-diffusion' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stable Diffusion API URL
                </label>
                <input
                  type="text"
                  value={formData.thumbnail_ai_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_ai_url: e.target.value }))}
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
                  value={formData.thumbnail_ai_model}
                  onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_ai_model: e.target.value }))}
                  placeholder="e.g., sd_xl_base_1.0.safetensors"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use WebUI's currently selected model
                </p>
              </div>
            </>
          )}

          {formData.thumbnail_ai_backend === 'fallback' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Note:</strong> Using fallback mode will skip AI generation and use existing images from <code className="bg-yellow-100 px-1 rounded">assets/backgrounds/</code>
              </p>
            </div>
          )}
        </div>

        {/* Thumbnail Composition Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <button
            type="button"
            onClick={() => setShowThumbSettings(!showThumbSettings)}
            className="w-full flex items-center justify-between"
          >
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900">
                🎨 Thumbnail Composition Settings
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Customize thumbnail elements, fonts, and layout
              </p>
            </div>
            <svg 
              className={`w-5 h-5 transition-transform text-gray-400 ${showThumbSettings ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showThumbSettings && (
            <div className="mt-6 space-y-6 border-t pt-6">
              {/* Element Toggles */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">显示元素</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'title', label: '📝 标题', desc: '画面中央' },
                    { key: 'subtitle', label: '📄 小标题', desc: '标题下方' },
                    { key: 'meeting_type', label: '🏷️ 聚会类型', desc: '右上角' },
                    { key: 'logo', label: '🏛️ 教会标志', desc: '左上角' },
                    { key: 'pastor', label: '👤 牧师照片', desc: '左下角' }
                  ].map(({ key, label, desc }) => (
                    <label key={key} className="flex items-start gap-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={thumbSettings.elements[key]}
                        onChange={(e) => setThumbSettings(prev => ({
                          ...prev,
                          elements: {
                            ...prev.elements,
                            [key]: e.target.checked
                          }
                        }))}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">{label}</span>
                        <span className="text-xs text-gray-500">{desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Text Content */}
              {(thumbSettings.elements.subtitle || thumbSettings.elements.meeting_type) && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700">文字内容</h4>
                  
                  {thumbSettings.elements.subtitle && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        小标题文字
                      </label>
                      <input
                        type="text"
                        value={thumbSettings.subtitle_text}
                        onChange={(e) => setThumbSettings(prev => ({
                          ...prev,
                          subtitle_text: e.target.value
                        }))}
                        placeholder="留空则使用讲员名字"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  )}

                  {thumbSettings.elements.meeting_type && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        聚会类型
                      </label>
                      <select
                        value={thumbSettings.meeting_type}
                        onChange={(e) => setThumbSettings(prev => ({
                          ...prev,
                          meeting_type: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">不显示</option>
                        {defaults.default_meeting_types.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Font and Size Settings */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700">字体与字号</h4>
                
                {thumbSettings.elements.title && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-600 font-medium">标题</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <FontSelector
                          value={thumbSettings.title_font_path || ''}
                          onChange={(value) => setThumbSettings(prev => ({
                            ...prev,
                            title_font_path: value || null
                          }))}
                          fonts={fontsData?.fonts}
                          placeholder="选择或输入标题字体"
                        />
                      </div>
                      <input
                        type="number"
                        value={thumbSettings.title_font_size}
                        onChange={(e) => setThumbSettings(prev => ({
                          ...prev,
                          title_font_size: parseInt(e.target.value)
                        }))}
                        min="24"
                        max="200"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-center"
                        placeholder="字号"
                      />
                    </div>
                  </div>
                )}

                {thumbSettings.elements.subtitle && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-600 font-medium">小标题</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <FontSelector
                          value={thumbSettings.subtitle_font_path || ''}
                          onChange={(value) => setThumbSettings(prev => ({
                            ...prev,
                            subtitle_font_path: value || null
                          }))}
                          fonts={fontsData?.fonts}
                          placeholder="选择或输入小标题字体"
                        />
                      </div>
                      <input
                        type="number"
                        value={thumbSettings.subtitle_font_size}
                        onChange={(e) => setThumbSettings(prev => ({
                          ...prev,
                          subtitle_font_size: parseInt(e.target.value)
                        }))}
                        min="24"
                        max="200"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-center"
                        placeholder="字号"
                      />
                    </div>
                  </div>
                )}

                {thumbSettings.elements.meeting_type && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-600 font-medium">聚会类型</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <FontSelector
                          value={thumbSettings.meeting_font_path || ''}
                          onChange={(value) => setThumbSettings(prev => ({
                            ...prev,
                            meeting_font_path: value || null
                          }))}
                          fonts={fontsData?.fonts}
                          placeholder="选择或输入聚会类型字体"
                        />
                      </div>
                      <input
                        type="number"
                        value={thumbSettings.meeting_font_size}
                        onChange={(e) => setThumbSettings(prev => ({
                          ...prev,
                          meeting_font_size: parseInt(e.target.value)
                        }))}
                        min="24"
                        max="200"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-center"
                        placeholder="字号"
                      />
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  💡 文字过长时会自动缩小字号以适应画面
                </p>
              </div>

              {/* Image Resources */}
              {(thumbSettings.elements.logo || thumbSettings.elements.pastor) && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700">图片资源</h4>
                  
                  {thumbSettings.elements.logo && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        教会 Logo
                      </label>
                      <select
                        value={thumbSettings.logo_path || ''}
                        onChange={(e) => setThumbSettings(prev => ({
                          ...prev,
                          logo_path: e.target.value || null
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">使用默认</option>
                        {logosData?.assets?.map(asset => (
                          <option key={asset.path} value={asset.path}>
                            {asset.name}
                          </option>
                        ))}
                      </select>
                      {logosData?.total === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          📁 上传图片到 assets/logos/ 目录
                        </p>
                      )}
                    </div>
                  )}

                  {thumbSettings.elements.pastor && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        牧师照片
                      </label>
                      <select
                        value={thumbSettings.pastor_path || ''}
                        onChange={(e) => setThumbSettings(prev => ({
                          ...prev,
                          pastor_path: e.target.value || null
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">使用默认</option>
                        {pastorsData?.assets?.map(asset => (
                          <option key={asset.path} value={asset.path}>
                            {asset.name}
                          </option>
                        ))}
                      </select>
                      {pastorsData?.total === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          📁 上传图片到 assets/pastor/ 目录
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Image Size Controls */}
                  <div className="space-y-3 border-t pt-3 mt-3">
                    <h4 className="text-xs font-medium text-gray-700">图片尺寸（像素）</h4>
                    
                    {thumbSettings.elements.logo && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Logo 尺寸</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={thumbSettings.logo_size?.width || 200}
                            onChange={(e) => setThumbSettings(prev => ({
                              ...prev,
                              logo_size: {
                                ...prev.logo_size,
                                width: parseInt(e.target.value) || 200
                              }
                            }))}
                            placeholder="宽度"
                            min="50"
                            max="800"
                            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center"
                          />
                          <input
                            type="number"
                            value={thumbSettings.logo_size?.height || 200}
                            onChange={(e) => setThumbSettings(prev => ({
                              ...prev,
                              logo_size: {
                                ...prev.logo_size,
                                height: parseInt(e.target.value) || 200
                              }
                            }))}
                            placeholder="高度"
                            min="50"
                            max="800"
                            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center"
                          />
                        </div>
                      </div>
                    )}
                    
                    {thumbSettings.elements.pastor && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Pastor 尺寸</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={thumbSettings.pastor_size?.width || 250}
                            onChange={(e) => setThumbSettings(prev => ({
                              ...prev,
                              pastor_size: {
                                ...prev.pastor_size,
                                width: parseInt(e.target.value) || 250
                              }
                            }))}
                            placeholder="宽度"
                            min="50"
                            max="800"
                            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center"
                          />
                          <input
                            type="number"
                            value={thumbSettings.pastor_size?.height || 250}
                            onChange={(e) => setThumbSettings(prev => ({
                              ...prev,
                              pastor_size: {
                                ...prev.pastor_size,
                                height: parseInt(e.target.value) || 250
                              }
                            }))}
                            placeholder="高度"
                            min="50"
                            max="800"
                            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Position Controls */}
                  <div className="space-y-2 border-t pt-3 mt-3">
                    <h4 className="text-xs font-medium text-gray-700">元素位置设置</h4>
                    <p className="text-xs text-gray-500 mb-2">简化版：仅显示对齐方式和边距</p>
                    
                    {/* Logo Position */}
                    {thumbSettings.elements.logo && (
                      <div className="p-2 bg-gray-50 rounded">
                        <label className="block text-xs font-medium mb-1">Logo 位置</label>
                        <select
                          value={thumbSettings.logo_position?.align || 'top-left'}
                          onChange={(e) => setThumbSettings(prev => ({
                            ...prev,
                            logo_position: { ...prev.logo_position, align: e.target.value }
                          }))}
                          className="w-full px-2 py-1 border rounded text-xs mb-1"
                        >
                          <option value="top-left">左上角</option>
                          <option value="top-center">顶部居中</option>
                          <option value="top-right">右上角</option>
                          <option value="center">居中</option>
                          <option value="bottom-left">左下角</option>
                          <option value="bottom-center">底部居中</option>
                          <option value="bottom-right">右下角</option>
                        </select>
                        <input
                          type="number"
                          value={thumbSettings.logo_position?.padding || 30}
                          onChange={(e) => setThumbSettings(prev => ({
                            ...prev,
                            logo_position: { ...prev.logo_position, padding: parseInt(e.target.value) || 30 }
                          }))}
                          placeholder="边距"
                          className="w-full px-2 py-1 border rounded text-xs"
                        />
                      </div>
                    )}
                    
                    {/* Pastor Position */}
                    {thumbSettings.elements.pastor && (
                      <div className="p-2 bg-gray-50 rounded">
                        <label className="block text-xs font-medium mb-1">Pastor 位置</label>
                        <select
                          value={thumbSettings.pastor_position?.align || 'bottom-left'}
                          onChange={(e) => setThumbSettings(prev => ({
                            ...prev,
                            pastor_position: { ...prev.pastor_position, align: e.target.value }
                          }))}
                          className="w-full px-2 py-1 border rounded text-xs mb-1"
                        >
                          <option value="top-left">左上角</option>
                          <option value="top-center">顶部居中</option>
                          <option value="top-right">右上角</option>
                          <option value="center">居中</option>
                          <option value="bottom-left">左下角</option>
                          <option value="bottom-center">底部居中</option>
                          <option value="bottom-right">右下角</option>
                        </select>
                        <input
                          type="number"
                          value={thumbSettings.pastor_position?.padding || 30}
                          onChange={(e) => setThumbSettings(prev => ({
                            ...prev,
                            pastor_position: { ...prev.pastor_position, padding: parseInt(e.target.value) || 30 }
                          }))}
                          placeholder="边距"
                          className="w-full px-2 py-1 border rounded text-xs"
                        />
                      </div>
                    )}
                    
                    {/* Title Position */}
                    {thumbSettings.elements.title && (
                      <div className="p-2 bg-gray-50 rounded">
                        <label className="block text-xs font-medium mb-1">标题位置</label>
                        <select
                          value={thumbSettings.title_position?.align || 'center'}
                          onChange={(e) => setThumbSettings(prev => ({
                            ...prev,
                            title_position: { ...prev.title_position, align: e.target.value }
                          }))}
                          className="w-full px-2 py-1 border rounded text-xs mb-1"
                        >
                          <option value="top-left">左上角</option>
                          <option value="top-center">顶部居中</option>
                          <option value="top-right">右上角</option>
                          <option value="center">居中</option>
                          <option value="bottom-left">左下角</option>
                          <option value="bottom-center">底部居中</option>
                          <option value="bottom-right">右下角</option>
                        </select>
                        <div className="grid grid-cols-2 gap-1">
                          <input
                            type="number"
                            value={thumbSettings.title_position?.padding || 50}
                            onChange={(e) => setThumbSettings(prev => ({
                              ...prev,
                              title_position: { ...prev.title_position, padding: parseInt(e.target.value) || 50 }
                            }))}
                            placeholder="边距"
                            className="px-2 py-1 border rounded text-xs"
                          />
                          <input
                            type="number"
                            value={thumbSettings.title_position?.y_offset || -50}
                            onChange={(e) => setThumbSettings(prev => ({
                              ...prev,
                              title_position: { ...prev.title_position, y_offset: parseInt(e.target.value) || 0 }
                            }))}
                            placeholder="Y偏移"
                            className="px-2 py-1 border rounded text-xs"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Subtitle Position */}
                    {thumbSettings.elements.subtitle && (
                      <div className="p-2 bg-gray-50 rounded">
                        <label className="block text-xs font-medium mb-1">小标题位置</label>
                        <select
                          value={thumbSettings.subtitle_position?.align || 'center'}
                          onChange={(e) => setThumbSettings(prev => ({
                            ...prev,
                            subtitle_position: { ...prev.subtitle_position, align: e.target.value }
                          }))}
                          className="w-full px-2 py-1 border rounded text-xs mb-1"
                        >
                          <option value="top-left">左上角</option>
                          <option value="top-center">顶部居中</option>
                          <option value="top-right">右上角</option>
                          <option value="center">居中</option>
                          <option value="bottom-left">左下角</option>
                          <option value="bottom-center">底部居中</option>
                          <option value="bottom-right">右下角</option>
                        </select>
                        <div className="grid grid-cols-2 gap-1">
                          <input
                            type="number"
                            value={thumbSettings.subtitle_position?.padding || 50}
                            onChange={(e) => setThumbSettings(prev => ({
                              ...prev,
                              subtitle_position: { ...prev.subtitle_position, padding: parseInt(e.target.value) || 50 }
                            }))}
                            placeholder="边距"
                            className="px-2 py-1 border rounded text-xs"
                          />
                          <input
                            type="number"
                            value={thumbSettings.subtitle_position?.y_offset || 50}
                            onChange={(e) => setThumbSettings(prev => ({
                              ...prev,
                              subtitle_position: { ...prev.subtitle_position, y_offset: parseInt(e.target.value) || 0 }
                            }))}
                            placeholder="Y偏移"
                            className="px-2 py-1 border rounded text-xs"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Meeting Type Position */}
                    {thumbSettings.elements.meeting_type && (
                      <div className="p-2 bg-gray-50 rounded">
                        <label className="block text-xs font-medium mb-1">聚会类型位置</label>
                        <select
                          value={thumbSettings.meeting_position?.align || 'top-right'}
                          onChange={(e) => setThumbSettings(prev => ({
                            ...prev,
                            meeting_position: { ...prev.meeting_position, align: e.target.value }
                          }))}
                          className="w-full px-2 py-1 border rounded text-xs mb-1"
                        >
                          <option value="top-left">左上角</option>
                          <option value="top-center">顶部居中</option>
                          <option value="top-right">右上角</option>
                          <option value="center">居中</option>
                          <option value="bottom-left">左下角</option>
                          <option value="bottom-center">底部居中</option>
                          <option value="bottom-right">右下角</option>
                        </select>
                        <input
                          type="number"
                          value={thumbSettings.meeting_position?.padding || 50}
                          onChange={(e) => setThumbSettings(prev => ({
                            ...prev,
                            meeting_position: { ...prev.meeting_position, padding: parseInt(e.target.value) || 50 }
                          }))}
                          placeholder="边距"
                          className="w-full px-2 py-1 border rounded text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>💡 提示：</strong> 背景图会优先使用 AI 生成的图片。如果 AI 生成失败，则使用 assets/backgrounds/ 中的图片作为备选。
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Workflow Modules</h3>
          <p className="text-sm text-gray-600 mb-4">
            Modules will execute in this order: Subtitles → Correction → Summary → Thumbnail AI → Thumbnail Compose
          </p>
          <div className="space-y-3">
            <ModuleToggle
              name="subtitles"
              label="1. Generate Subtitles"
              checked={formData.modules.subtitles}
              onChange={() => handleModuleToggle('subtitles')}
            />
            <ModuleToggle
              name="subtitle_correction"
              label="2. Correct Subtitles (AI)"
              checked={formData.modules.subtitle_correction}
              onChange={() => handleModuleToggle('subtitle_correction')}
            />
            <ModuleToggle
              name="content_summary"
              label="3. Generate Content Summary (AI)"
              checked={formData.modules.content_summary}
              onChange={() => handleModuleToggle('content_summary')}
            />
            <ModuleToggle
              name="thumbnail_ai"
              label="4. Generate Thumbnail Background (AI)"
              checked={formData.modules.thumbnail_ai}
              onChange={() => handleModuleToggle('thumbnail_ai')}
            />
            <ModuleToggle
              name="thumbnail_compose"
              label="5. Compose Final Thumbnail"
              checked={formData.modules.thumbnail_compose}
              onChange={() => handleModuleToggle('thumbnail_compose')}
            />
            <div className="border-t pt-3 mt-3">
              <p className="text-xs text-gray-500 mb-2">Publishing Options:</p>
              <ModuleToggle
                name="publish_youtube"
                label="Publish to YouTube"
                checked={formData.modules.publish_youtube}
                onChange={() => handleModuleToggle('publish_youtube')}
              />
              <ModuleToggle
                name="publish_website"
                label="Publish to Website"
                checked={formData.modules.publish_website}
                onChange={() => handleModuleToggle('publish_website')}
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Event'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function ModuleToggle({ name, label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </label>
  )
}
