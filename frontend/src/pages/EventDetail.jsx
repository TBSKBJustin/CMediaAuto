import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Play, RefreshCw, CheckCircle, AlertCircle, Loader, Grid, Settings } from 'lucide-react'
import { getEvent, attachVideo, runWorkflow, getWorkflowProgress, getEventModules, updateEventConfig } from '../api'
import WorkflowProgress from '../components/WorkflowProgress'
import ModuleCard from '../components/ModuleCard'
import EventSettingsModal from '../components/EventSettingsModal'

export default function EventDetail() {
  const { eventId } = useParams()
  const queryClient = useQueryClient()
  const [videoPath, setVideoPath] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [viewMode, setViewMode] = useState('modules') // 'modules' or 'workflow'
  const [forceRerun, setForceRerun] = useState(false)
  
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEvent(eventId)
  })
  
  // Fetch available modules
  const { data: modulesData, refetch: refetchModules } = useQuery({
    queryKey: ['modules', eventId],
    queryFn: () => getEventModules(eventId),
    enabled: !!eventId
  })
  
  // Progress polling query
  const { data: progress } = useQuery({
    queryKey: ['progress', eventId],
    queryFn: () => getWorkflowProgress(eventId),
    refetchInterval: isPolling ? 1000 : false, // Poll every 1 second when active
    enabled: isPolling
  })
  
  // Auto-start polling when workflow is running
  useEffect(() => {
    if (progress?.status === 'running') {
      setIsPolling(true)
    } else if (progress?.status === 'completed' || progress?.status === 'failed') {
      setIsPolling(false)
      // Refresh event data when workflow completes
      queryClient.invalidateQueries(['event', eventId])
    }
  }, [progress, eventId, queryClient])
  
  const attachMutation = useMutation({
    mutationFn: (path) => attachVideo(eventId, path),
    onSuccess: () => {
      queryClient.invalidateQueries(['event', eventId])
      setShowUploadModal(false)
      setVideoPath('')
    }
  })
  
  const runMutation = useMutation({
    mutationFn: (force) => runWorkflow(eventId, force),
    onSuccess: () => {
      // Start polling immediately after starting workflow
      setIsPolling(true)
      queryClient.invalidateQueries(['event', eventId])
      queryClient.invalidateQueries(['progress', eventId])
    }
  })
  
  const handleAttachVideo = () => {
    if (videoPath.trim()) {
      attachMutation.mutate(videoPath.trim())
    }
  }
  
  if (isLoading) {
    return <div>Loading...</div>
  }
  
  if (!event) {
    return <div>Event not found</div>
  }
  
  const workflowState = event.workflow_state || {}
  const overallStatus = workflowState.overall_status || 'pending'
  const hasVideo = event.input_video || false
  
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{event.title}</h2>
          <p className="text-gray-600 mt-1">{event.speaker} • {event.date}</p>
        </div>
        <div className="flex gap-3">
          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Settings size={16} />
            Settings
          </button>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('modules')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'modules' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Grid size={16} className="inline mr-2" />
              Modules
            </button>
            <button
              onClick={() => setViewMode('workflow')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'workflow' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Play size={16} className="inline mr-2" />
              Workflow
            </button>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload size={20} />
            Upload Video
          </button>
          
          {viewMode === 'workflow' && (
            <div className="flex items-center gap-3">
              {/* Re-run checkbox for completed workflows */}
              {overallStatus === 'completed' && (
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={forceRerun}
                    onChange={(e) => setForceRerun(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span>Force Re-run All</span>
                </label>
              )}
              
              <button
                onClick={() => runMutation.mutate(forceRerun)}
                disabled={!hasVideo || runMutation.isPending}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed $\{
                  overallStatus === 'completed' && forceRerun
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {runMutation.isPending ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <Play size={20} />
                )}
                {overallStatus === 'completed' && forceRerun ? 'Re-run Workflow' : 'Run Workflow'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Overall Status Banner */}
      <StatusBanner status={overallStatus} hasVideo={hasVideo} />
      
      {/* Real-time Workflow Progress */}
      {(progress || isPolling) && viewMode === 'workflow' && (
        <WorkflowProgress progress={progress} />
      )}
      
      {/* Modules View */}
      {viewMode === 'modules' && modulesData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Available Modules</h3>
            <button
              onClick={() => refetchModules()}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
          <div className="grid gap-4">
            {modulesData.modules.map((module) => (
              <ModuleCard
                key={module.name}
                eventId={eventId}
                module={module}
                onRefresh={refetchModules}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Workflow/Details View */}
      {viewMode === 'workflow' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Event Details</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-600">Series</dt>
              <dd className="text-sm font-medium">{event.series || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Scripture</dt>
              <dd className="text-sm font-medium">{event.scripture || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Language</dt>
              <dd className="text-sm font-medium">{event.language}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Input Video</dt>
              <dd className="text-sm font-medium">
                {hasVideo ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle size={16} /> Attached
                  </span>
                ) : (
                  <span className="text-gray-400">No video attached</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Enabled Modules</h3>
          <div className="space-y-2">
            {Object.entries(event.modules).map(([name, enabled]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{formatModuleName(name)}</span>
                <span className={`text-sm ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Module Status Cards */}
      {workflowState.modules && Object.keys(workflowState.modules).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Module Execution Status</h3>
          <div className="space-y-3">
            {Object.entries(workflowState.modules).map(([moduleName, moduleState]) => (
              <ModuleStatusRow key={moduleName} name={moduleName} state={moduleState} />
            ))}
          </div>
        </div>
      )}
        </>
      )}
      
      {/* Settings Modal */}
      {showSettingsModal && (
        <EventSettingsModal
          event={event}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
      
      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          videoPath={videoPath}
          setVideoPath={setVideoPath}
          onUpload={handleAttachVideo}
          onClose={() => setShowUploadModal(false)}
          isUploading={attachMutation.isPending}
          error={attachMutation.error?.response?.data?.detail}
        />
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
  
  return name.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

function StatusBanner({ status, hasVideo }) {
  const config = {
    pending: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      icon: AlertCircle,
      message: hasVideo ? 'Ready to run workflow' : 'Please upload a video to begin'
    },
    processing: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      icon: Loader,
      message: 'Workflow is running...'
    },
    completed: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: CheckCircle,
      message: 'Workflow completed successfully'
    },
    failed: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: AlertCircle,
      message: 'Workflow encountered errors'
    }
  }
  
  const { bg, text, icon: Icon, message } = config[status] || config.pending
  
  return (
    <div className={`${bg} ${text} rounded-lg p-4 flex items-center gap-3`}>
      <Icon size={24} className={status === 'processing' ? 'animate-spin' : ''} />
      <span className="font-medium">{message}</span>
    </div>
  )
}

function ModuleStatusRow({ name, state }) {
  const status = state?.status || 'pending'
  const icons = {
    pending: <AlertCircle className="text-gray-400" size={20} />,
    running: <Loader className="text-blue-500 animate-spin" size={20} />,
    success: <CheckCircle className="text-green-500" size={20} />,
    failed: <AlertCircle className="text-red-500" size={20} />
  }
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        {icons[status] || icons.pending}
        <span className="font-medium text-gray-900">{formatModuleName(name)}</span>
      </div>
      <span className="text-sm text-gray-600 capitalize">{status}</span>
    </div>
  )
}

function UploadModal({ videoPath, setVideoPath, onUpload, onClose, isUploading, error }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Attach Video</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video File Path
            </label>
            <input
              type="text"
              value={videoPath}
              onChange={(e) => setVideoPath(e.target.value)}
              placeholder="/path/to/video.mp4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the full path to your video file
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onUpload}
              disabled={!videoPath.trim() || isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Attaching...' : 'Attach'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
