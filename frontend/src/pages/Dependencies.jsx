import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, AlertCircle, Download, Settings } from 'lucide-react'
import { checkDependencies, installDependency, configureCustomPath } from '../api'

export default function Dependencies() {
  const queryClient = useQueryClient()
  const [configureModal, setConfigureModal] = useState({ isOpen: false, depKey: '', depName: '' })
  
  const { data: dependencies, isLoading } = useQuery({
    queryKey: ['dependencies'],
    queryFn: checkDependencies
  })
  
  const installMutation = useMutation({
    mutationFn: installDependency,
    onSuccess: () => {
      queryClient.invalidateQueries(['dependencies'])
    }
  })
  
  const configurePathMutation = useMutation({
    mutationFn: ({ depKey, path }) => configureCustomPath(depKey, path),
    onSuccess: () => {
      queryClient.invalidateQueries(['dependencies'])
      setConfigureModal({ isOpen: false, depKey: '', depName: '' })
    }
  })
  
  if (isLoading) {
    return <div>Loading...</div>
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">System Dependencies</h2>
        <p className="text-gray-600 mt-1">Manage required and optional system components</p>
      </div>
      
      <div className="grid gap-4">
        {Object.entries(dependencies || {}).map(([key, dep]) => (
          <DependencyCard
            key={key}
            depKey={key}
            {...dep}
            onInstall={() => installMutation.mutate(key)}
            onConfigure={() => setConfigureModal({ isOpen: true, depKey: key, depName: dep.name })}
            isInstalling={installMutation.isPending}
          />
        ))}
      </div>
      
      {configureModal.isOpen && (
        <ConfigurePathModal
          depKey={configureModal.depKey}
          depName={configureModal.depName}
          onClose={() => setConfigureModal({ isOpen: false, depKey: '', depName: '' })}
          onSubmit={(path) => configurePathMutation.mutate({ depKey: configureModal.depKey, path })}
          isSubmitting={configurePathMutation.isPending}
          error={configurePathMutation.error?.response?.data?.detail}
        />
      )}
    </div>
  )
}

function DependencyCard({ depKey, name, description, installed, required, version, onInstall, onConfigure, isInstalling }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {installed ? (
              <CheckCircle className="text-green-600" size={24} />
            ) : (
              <AlertCircle className={required ? 'text-red-600' : 'text-gray-400'} size={24} />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>
          
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className={`font-medium ${installed ? 'text-green-600' : required ? 'text-red-600' : 'text-gray-500'}`}>
              {installed ? 'Installed' : 'Not installed'}
            </span>
            {required && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                Required
              </span>
            )}
            {version && (
              <span className="text-gray-500 text-xs">{version}</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {!installed && (
            <>
              <button
                onClick={onInstall}
                disabled={isInstalling}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                {isInstalling ? 'Installing...' : 'Install'}
              </button>
              <button
                onClick={onConfigure}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                title="Configure custom path"
              >
                <Settings size={16} />
                Path
              </button>
            </>
          )}
          {installed && (
            <button
              onClick={onConfigure}
              className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm"
              title="Reconfigure path"
            >
              <Settings size={14} />
              Reconfigure
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
function ConfigurePathModal({ depKey, depName, onClose, onSubmit, isSubmitting, error }) {
  const [path, setPath] = useState('')
  const [showBrowseHelp, setShowBrowseHelp] = useState(false)
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (path.trim()) {
      onSubmit(path.trim())
    }
  }
  
  const handleBrowseHelp = () => {
    setShowBrowseHelp(true)
  }
  
  const examplePaths = {
    'whisper.cpp': [
      '/usr/local/bin/whisper-cli',
      '/opt/homebrew/bin/whisper-cli',
      '~/whisper.cpp/build/bin/whisper-cli',
      '/Users/username/whisper.cpp/build/bin/whisper-cli',
      'C:\\whisper.cpp\\build\\bin\\Release\\whisper-cli.exe'
    ]
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Configure Custom Path - {depName}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Executable Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/path/to/executable"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <button
                type="button"
                onClick={handleBrowseHelp}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                title="How to find the path"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Enter or paste the full path to the {depName} executable
            </p>
          </div>
          
          {showBrowseHelp && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">How to find the executable path:</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <p><strong>macOS/Linux:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Open Terminal or Finder</li>
                  <li>Navigate to the executable file</li>
                  <li>Right-click the file → Get Info (or use <code className="bg-blue-100 px-1 rounded">which command</code> in Terminal)</li>
                  <li>Copy the full path and paste it above</li>
                </ol>
                <p className="mt-2"><strong>Windows:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Open File Explorer</li>
                  <li>Navigate to the executable (.exe) file</li>
                  <li>Shift + Right-click → Copy as path</li>
                  <li>Paste the path above</li>
                </ol>
              </div>
            </div>
          )}
          
          {examplePaths[depKey] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Example paths:</p>
              <ul className="space-y-1">
                {examplePaths[depKey].map((examplePath, idx) => (
                  <li 
                    key={idx} 
                    className="text-sm text-gray-600 font-mono cursor-pointer hover:bg-gray-100 p-1 rounded"
                    onClick={() => setPath(examplePath)}
                    title="Click to use this path"
                  >
                    {examplePath}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-2">💡 Click any example to use it</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !path.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Configuring...' : 'Save Path'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}