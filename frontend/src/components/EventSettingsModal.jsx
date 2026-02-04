import React, { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { updateEventConfig, getSystemFonts, getAssets } from '../api'
import FontSelector from './FontSelector'

export default function EventSettingsModal({ event, onClose }) {
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState({
    title: event.title || '',
    speaker: event.speaker || '',
    series: event.series || '',
    scripture: event.scripture || '',
    thumbnail_settings: event.thumbnail_settings || {
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
      pastor_path: null,
      logo_size: { width: 200, height: 200 },
      pastor_size: { width: 250, height: 250 },
      logo_position: { align: 'top-left', padding: 30 },
      pastor_position: { align: 'bottom-left', padding: 30 },
      title_position: { align: 'center', padding: 50, y_offset: -50 },
      subtitle_position: { align: 'center', padding: 50, y_offset: 50 },
      meeting_position: { align: 'top-right', padding: 50 }
    }
  })

  // Fetch resources
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

  const updateMutation = useMutation({
    mutationFn: (config) => updateEventConfig(event.event_id, config),
    onSuccess: () => {
      queryClient.invalidateQueries(['event', event.event_id])
      onClose()
    }
  })

  const handleSave = () => {
    updateMutation.mutate(settings)
  }

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleThumbChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      thumbnail_settings: {
        ...prev.thumbnail_settings,
        [field]: value
      }
    }))
  }

  const handleElementToggle = (element) => {
    setSettings(prev => ({
      ...prev,
      thumbnail_settings: {
        ...prev.thumbnail_settings,
        elements: {
          ...prev.thumbnail_settings.elements,
          [element]: !prev.thumbnail_settings.elements[element]
        }
      }
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Event Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">基本信息</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标题 *
              </label>
              <input
                type="text"
                value={settings.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                讲员 *
              </label>
              <input
                type="text"
                value={settings.speaker}
                onChange={(e) => handleChange('speaker', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                系列
              </label>
              <input
                type="text"
                value={settings.series}
                onChange={(e) => handleChange('series', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                经文
              </label>
              <input
                type="text"
                value={settings.scripture}
                onChange={(e) => handleChange('scripture', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Thumbnail Settings */}
          <div className="space-y-4 border-t pt-6">
            <h4 className="text-lg font-medium text-gray-900">Thumbnail 设置</h4>

            {/* Element Toggles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">显示元素</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'title', label: '📝 标题' },
                  { key: 'subtitle', label: '📄 小标题' },
                  { key: 'meeting_type', label: '🏷️ 聚会类型' },
                  { key: 'logo', label: '🏛️ 教会标志' },
                  { key: 'pastor', label: '👤 牧师照片' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.thumbnail_settings.elements[key]}
                      onChange={() => handleElementToggle(key)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Text Content */}
            {(settings.thumbnail_settings.elements.subtitle || settings.thumbnail_settings.elements.meeting_type) && (
              <div className="space-y-3">
                {settings.thumbnail_settings.elements.subtitle && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      小标题文字
                    </label>
                    <input
                      type="text"
                      value={settings.thumbnail_settings.subtitle_text}
                      onChange={(e) => handleThumbChange('subtitle_text', e.target.value)}
                      placeholder="留空则使用讲员名字"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                )}

                {settings.thumbnail_settings.elements.meeting_type && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      聚会类型
                    </label>
                    <input
                      type="text"
                      value={settings.thumbnail_settings.meeting_type}
                      onChange={(e) => handleThumbChange('meeting_type', e.target.value)}
                      placeholder="例如：主日敬拜"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Font Settings */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">字体与字号</label>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">标题字体</label>
                  <FontSelector
                    value={settings.thumbnail_settings.title_font_path || ''}
                    onChange={(value) => handleThumbChange('title_font_path', value || null)}
                    fonts={fontsData?.fonts}
                    placeholder="选择或输入字体"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">标题字号</label>
                  <input
                    type="number"
                    value={settings.thumbnail_settings.title_font_size}
                    onChange={(e) => handleThumbChange('title_font_size', parseInt(e.target.value))}
                    min="24"
                    max="200"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">小标题字体</label>
                  <FontSelector
                    value={settings.thumbnail_settings.subtitle_font_path || ''}
                    onChange={(value) => handleThumbChange('subtitle_font_path', value || null)}
                    fonts={fontsData?.fonts}
                    placeholder="选择或输入字体"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">小标题字号</label>
                  <input
                    type="number"
                    value={settings.thumbnail_settings.subtitle_font_size}
                    onChange={(e) => handleThumbChange('subtitle_font_size', parseInt(e.target.value))}
                    min="24"
                    max="200"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Image Resources */}
            {(settings.thumbnail_settings.elements.logo || settings.thumbnail_settings.elements.pastor) && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">图片资源</label>
                
                {settings.thumbnail_settings.elements.logo && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Logo</label>
                    <select
                      value={settings.thumbnail_settings.logo_path || ''}
                      onChange={(e) => handleThumbChange('logo_path', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">使用默认</option>
                      {logosData?.assets?.map(asset => (
                        <option key={asset.path} value={asset.path}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {settings.thumbnail_settings.elements.pastor && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">牧师照片</label>
                    <select
                      value={settings.thumbnail_settings.pastor_path || ''}
                      onChange={(e) => handleThumbChange('pastor_path', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">使用默认</option>
                      {pastorsData?.assets?.map(asset => (
                        <option key={asset.path} value={asset.path}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Image Size Settings */}
                <div className="space-y-3 border-t pt-3 mt-3">
                  <h4 className="text-xs font-medium text-gray-700">图片尺寸（像素）</h4>
                  
                  {settings.thumbnail_settings.elements.logo && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Logo 尺寸</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={settings.thumbnail_settings.logo_size?.width || 200}
                          onChange={(e) => handleThumbChange('logo_size', {
                            ...settings.thumbnail_settings.logo_size,
                            width: parseInt(e.target.value) || 200
                          })}
                          placeholder="宽度"
                          min="50"
                          max="800"
                          className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center"
                        />
                        <input
                          type="number"
                          value={settings.thumbnail_settings.logo_size?.height || 200}
                          onChange={(e) => handleThumbChange('logo_size', {
                            ...settings.thumbnail_settings.logo_size,
                            height: parseInt(e.target.value) || 200
                          })}
                          placeholder="高度"
                          min="50"
                          max="800"
                          className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center"
                        />
                      </div>
                    </div>
                  )}
                  
                  {settings.thumbnail_settings.elements.pastor && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Pastor 尺寸</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={settings.thumbnail_settings.pastor_size?.width || 250}
                          onChange={(e) => handleThumbChange('pastor_size', {
                            ...settings.thumbnail_settings.pastor_size,
                            width: parseInt(e.target.value) || 250
                          })}
                          placeholder="宽度"
                          min="50"
                          max="800"
                          className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center"
                        />
                        <input
                          type="number"
                          value={settings.thumbnail_settings.pastor_size?.height || 250}
                          onChange={(e) => handleThumbChange('pastor_size', {
                            ...settings.thumbnail_settings.pastor_size,
                            height: parseInt(e.target.value) || 250
                          })}
                          placeholder="高度"
                          min="50"
                          max="800"
                          className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Position Settings */}
                <div className="space-y-2 border-t pt-3 mt-3">
                  <h4 className="text-xs font-medium text-gray-700">元素位置设置</h4>
                  
                  {/* Logo Position */}
                  {settings.thumbnail_settings.elements.logo && (
                    <div className="p-2 bg-gray-50 rounded">
                      <label className="block text-xs font-medium mb-1">Logo 位置</label>
                      <select
                        value={settings.thumbnail_settings.logo_position?.align || 'top-left'}
                        onChange={(e) => handleThumbChange('logo_position', {
                          ...settings.thumbnail_settings.logo_position,
                          align: e.target.value
                        })}
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
                        value={settings.thumbnail_settings.logo_position?.padding || 30}
                        onChange={(e) => handleThumbChange('logo_position', {
                          ...settings.thumbnail_settings.logo_position,
                          padding: parseInt(e.target.value) || 30
                        })}
                        placeholder="边距"
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    </div>
                  )}
                  
                  {/* Pastor Position */}
                  {settings.thumbnail_settings.elements.pastor && (
                    <div className="p-2 bg-gray-50 rounded">
                      <label className="block text-xs font-medium mb-1">Pastor 位置</label>
                      <select
                        value={settings.thumbnail_settings.pastor_position?.align || 'bottom-left'}
                        onChange={(e) => handleThumbChange('pastor_position', {
                          ...settings.thumbnail_settings.pastor_position,
                          align: e.target.value
                        })}
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
                        value={settings.thumbnail_settings.pastor_position?.padding || 30}
                        onChange={(e) => handleThumbChange('pastor_position', {
                          ...settings.thumbnail_settings.pastor_position,
                          padding: parseInt(e.target.value) || 30
                        })}
                        placeholder="边距"
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    </div>
                  )}
                  
                  {/* Title Position */}
                  {settings.thumbnail_settings.elements.title && (
                    <div className="p-2 bg-gray-50 rounded">
                      <label className="block text-xs font-medium mb-1">标题位置</label>
                      <select
                        value={settings.thumbnail_settings.title_position?.align || 'center'}
                        onChange={(e) => handleThumbChange('title_position', {
                          ...settings.thumbnail_settings.title_position,
                          align: e.target.value
                        })}
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
                          value={settings.thumbnail_settings.title_position?.padding || 50}
                          onChange={(e) => handleThumbChange('title_position', {
                            ...settings.thumbnail_settings.title_position,
                            padding: parseInt(e.target.value) || 50
                          })}
                          placeholder="边距"
                          className="px-2 py-1 border rounded text-xs"
                        />
                        <input
                          type="number"
                          value={settings.thumbnail_settings.title_position?.y_offset || -50}
                          onChange={(e) => handleThumbChange('title_position', {
                            ...settings.thumbnail_settings.title_position,
                            y_offset: parseInt(e.target.value) || 0
                          })}
                          placeholder="Y偏移"
                          className="px-2 py-1 border rounded text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {updateMutation.isError && (
              <span className="text-red-600">保存失败: {updateMutation.error?.message}</span>
            )}
            {updateMutation.isSuccess && (
              <span className="text-green-600">✓ 保存成功</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending || !settings.title || !settings.speaker}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
