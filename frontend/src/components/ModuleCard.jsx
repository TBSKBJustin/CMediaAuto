import React, { useState } from 'react'
import { Play, CheckCircle, XCircle, Clock, Loader, ChevronDown, ChevronUp, Upload } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runSingleModule } from '../api'

export default function ModuleCard({ eventId, module, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [manualInputs, setManualInputs] = useState({})
  const queryClient = useQueryClient()

  const runMutation = useMutation({
    mutationFn: () => runSingleModule(
      eventId,
      module.name,
      Object.keys(manualInputs).length > 0 ? manualInputs : null,
      false
    ),
    onSuccess: () => {
      queryClient.invalidateQueries(['event', eventId])
      queryClient.invalidateQueries(['modules', eventId])
      if (onRefresh) onRefresh()
    }
  })

  const getStatusIcon = () => {
    switch (module.status) {
      case 'success':
        return <CheckCircle className="text-green-600" size={20} />
      case 'failed':
        return <XCircle className="text-red-600" size={20} />
      case 'running':
        return <Loader className="text-blue-600 animate-spin" size={20} />
      default:
        return <Clock className="text-gray-400" size={20} />
    }
  }

  const getStatusColor = () => {
    switch (module.status) {
      case 'success':
        return 'border-green-300 bg-green-50'
      case 'failed':
        return 'border-red-300 bg-red-50'
      case 'running':
        return 'border-blue-300 bg-blue-50'
      default:
        return 'border-gray-200 bg-white'
    }
  }

  const canAutoRun = module.inputs?.auto_detected

  return (
    <div className={`border-2 rounded-lg p-4 transition-all ${getStatusColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          {getStatusIcon()}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{module.label}</h3>
            <p className="text-sm text-gray-600">{module.description}</p>
            {module.inputs && module.inputs.required_inputs.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Requires: {module.inputs.required_inputs.join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {module.status === 'success' && module.output_file && (
            <span className="text-xs text-gray-500 mr-2">
              ✓ Output ready
            </span>
          )}
          
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {runMutation.isPending ? (
              <Loader className="animate-spin" size={16} />
            ) : (
              <Play size={16} />
            )}
            Run
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-300 space-y-3">
          {/* Auto-detected inputs */}
          {module.inputs && module.inputs.auto_detected && (
            <div className="bg-green-100 border border-green-300 rounded px-3 py-2 text-sm">
              <p className="font-medium text-green-800 mb-1">✓ Inputs auto-detected:</p>
              <ul className="text-green-700 space-y-1">
                {Object.entries(module.inputs.available_files).map(([key, value]) => (
                  <li key={key} className="truncate">
                    <span className="font-medium">{key}:</span> {value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Manual inputs */}
          {module.inputs && module.inputs.required_inputs.length > 0 && !module.inputs.auto_detected && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Manual Input Required:</p>
              {module.inputs.required_inputs.map((inputType) => (
                <div key={inputType}>
                  <label className="block text-xs text-gray-600 mb-1">
                    {inputType}:
                  </label>
                  <input
                    type="text"
                    value={manualInputs[inputType] || ''}
                    onChange={(e) => setManualInputs({
                      ...manualInputs,
                      [inputType]: e.target.value
                    })}
                    placeholder={`Path to ${inputType} file`}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Status info */}
          {module.status !== 'not_run' && (
            <div className="text-xs text-gray-600">
              <p>Status: <span className="font-medium">{module.status}</span></p>
              {module.last_run && (
                <p>Last run: {new Date(module.last_run).toLocaleString()}</p>
              )}
            </div>
          )}

          {/* Output file */}
          {module.output_file && (
            <div className="text-xs text-gray-600">
              <p>Output: <code className="bg-gray-100 px-1 rounded">{module.output_file}</code></p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
