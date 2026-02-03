import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createEvent, getWhisperModels, getOllamaModels } from '../api'

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
      }
    }
    return {
      subtitle_max_length: 84,
      subtitle_split_on_word: true,
      ai_model: 'qwen2.5:latest',
      ai_unload_model_after: true,
      thumbnail_ai_backend: 'stable-diffusion',
      thumbnail_ai_url: 'http://localhost:7860',
      thumbnail_ai_model: '',
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
    modules: {
      thumbnail_ai: true,
      thumbnail_compose: true,
      subtitles: true,
      subtitle_correction: true,
      content_summary: true,
      publish_youtube: false,
      publish_website: false,
    }
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
  
  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: (data) => {
      navigate(`/events/${data.event_id}`)
    }
  })
  
  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(formData)
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
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Workflow Modules</h3>
          <div className="space-y-3">
            <ModuleToggle
              name="thumbnail_ai"
              label="Generate Thumbnail (AI)"
              checked={formData.modules.thumbnail_ai}
              onChange={() => handleModuleToggle('thumbnail_ai')}
            />
            <ModuleToggle
              name="thumbnail_compose"
              label="Compose Final Thumbnail"
              checked={formData.modules.thumbnail_compose}
              onChange={() => handleModuleToggle('thumbnail_compose')}
            />
            <ModuleToggle
              name="subtitles"
              label="Generate Subtitles"
              checked={formData.modules.subtitles}
              onChange={() => handleModuleToggle('subtitles')}
            />
            <ModuleToggle
              name="subtitle_correction"
              label="Correct Subtitles (AI)"
              checked={formData.modules.subtitle_correction}
              onChange={() => handleModuleToggle('subtitle_correction')}
            />
            <ModuleToggle
              name="content_summary"
              label="Generate Content Summary (AI)"
              checked={formData.modules.content_summary}
              onChange={() => handleModuleToggle('content_summary')}
            />
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
