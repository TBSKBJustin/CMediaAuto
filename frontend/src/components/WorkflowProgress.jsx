import React from 'react'
import { Loader, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function WorkflowProgress({ progress }) {
  if (!progress || progress.status === 'pending') {
    return null
  }

  const { status, progress_percent, current_module, current_step, details, completed_modules = [], total_modules = 0 } = progress

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader className="animate-spin text-blue-600" size={24} />
      case 'completed':
        return <CheckCircle className="text-green-600" size={24} />
      case 'failed':
        return <XCircle className="text-red-600" size={24} />
      default:
        return <Clock className="text-gray-400" size={24} />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'bg-blue-50 border-blue-200'
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'failed':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'running':
        return 'Processing'
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      default:
        return 'Pending'
    }
  }

  return (
    <div className={`border-2 rounded-lg p-6 ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{getStatusText()}</h3>
            {current_step && (
              <p className="text-sm text-gray-600">{current_step}</p>
            )}
          </div>
        </div>
        {status === 'running' && total_modules > 0 && (
          <span className="text-sm font-medium text-gray-700">
            {completed_modules.length} / {total_modules} modules
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {status === 'running' && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{progress_percent}%</span>
            {current_module && (
              <span className="font-medium">Current: {formatModuleName(current_module)}</span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress_percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Details Text */}
      {details && (
        <p className="text-sm text-gray-700 bg-white/50 rounded px-3 py-2">
          {details}
        </p>
      )}

      {/* Completed Modules List */}
      {status === 'running' && completed_modules.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Completed:</p>
          <div className="flex flex-wrap gap-2">
            {completed_modules.map((module) => (
              <span
                key={module}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded"
              >
                <CheckCircle size={12} />
                {formatModuleName(module)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {status === 'failed' && progress.error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-800">
          <strong>Error:</strong> {progress.error}
        </div>
      )}
    </div>
  )
}

function formatModuleName(name) {
  const customNames = {
    'subtitle_correction': 'Correct Subtitles (AI)',
    'content_summary': 'Generate Content Summary (AI)',
    'ai_content': 'AI Content Processing'
  }
  
  if (customNames[name]) {
    return customNames[name]
  }
  
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
