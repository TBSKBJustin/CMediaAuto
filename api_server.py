"""
FastAPI Server for Church Media Automation System
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from controller.event_manager import EventManager
from controller.workflow_controller import WorkflowController
from utils.dependency_manager import DependencyManager

app = FastAPI(
    title="Church Media Automation System",
    description="API for automated church media processing",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize managers
event_manager = EventManager()
workflow_controller = WorkflowController()
dependency_manager = DependencyManager()


# Pydantic models
class EventCreate(BaseModel):
    title: str
    speaker: str
    series: Optional[str] = None
    scripture: Optional[str] = None
    language: str = "auto"
    whisper_model: str = "base"
    subtitle_max_length: int = 84
    subtitle_split_on_word: bool = True
    ai_model: str = "qwen2.5:latest"
    ai_correct_subtitles: bool = True
    ai_generate_summary: bool = True
    ai_summary_length: str = "medium"
    modules: Optional[Dict[str, Any]] = None


class VideoAttach(BaseModel):
    video_path: str


class WorkflowRun(BaseModel):
    force: bool = False


class ModuleRun(BaseModel):
    input_files: Optional[Dict[str, str]] = None
    force: bool = False


@app.get('/api/status')
async def get_status():
    """Get system status"""
    deps = dependency_manager.check_all()
    return {
        'status': 'ok',
        'dependencies': deps
    }


@app.get('/api/events')
async def list_events():
    """List all events"""
    event_ids = event_manager.list_events()
    events = []
    
    for event_id in event_ids:
        event = event_manager.load_event(event_id)
        if event:
            # Add status field (check workflow state)
            state = workflow_controller.state_store.get_workflow_state(event_id)
            event['status'] = state['overall_status'] if state else 'pending'
            events.append(event)
    
    return events


@app.get('/api/events/{event_id}')
async def get_event(event_id: str):
    """Get specific event"""
    event = event_manager.load_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail='Event not found')
    
    # Add workflow state
    state = workflow_controller.state_store.get_workflow_state(event_id)
    event['workflow_state'] = state
    
    # Add input_video flag
    event['input_video'] = len(event.get('inputs', {}).get('video_files', [])) > 0
    
    return event


@app.post('/api/events', status_code=status.HTTP_201_CREATED)
async def create_event(event_data: EventCreate):
    """Create new event"""
    try:
        event_id = event_manager.create_event(
            title=event_data.title,
            speaker=event_data.speaker,
            series=event_data.series,
            scripture=event_data.scripture,
            subtitle_max_length=event_data.subtitle_max_length,
            subtitle_split_on_word=event_data.subtitle_split_on_word,
            language=event_data.language,
            whisper_model=event_data.whisper_model,
            ai_model=event_data.ai_model,
            ai_correct_subtitles=event_data.ai_correct_subtitles,
            ai_generate_summary=event_data.ai_generate_summary,
            ai_summary_length=event_data.ai_summary_length,
            modules=event_data.modules
        )
        
        event = event_manager.load_event(event_id)
        return event
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/api/events/{event_id}/attach')
async def attach_video(event_id: str, video_data: VideoAttach):
    """Attach video to event"""
    # Check if event exists
    event = event_manager.load_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail='Event not found')
    
    # Validate video path exists
    video_path = Path(video_data.video_path)
    if not video_path.exists():
        raise HTTPException(status_code=400, detail='Video file does not exist')
    
    if not video_path.is_file():
        raise HTTPException(status_code=400, detail='Path is not a file')
    
    # Add video to event
    success = event_manager.add_video_input(event_id, str(video_path.absolute()))
    if success:
        return {'message': 'Video attached successfully', 'path': str(video_path)}
    else:
        raise HTTPException(status_code=400, detail='Failed to attach video')


@app.get('/api/dependencies')
async def check_dependencies():
    """Check all dependencies"""
    results = dependency_manager.check_all()
    
    # Add Ollama model check
    ollama_installed = results.get('ollama', {}).get('installed', False)
    if ollama_installed:
        ollama_models = dependency_manager.check_ollama_models()
        results['ollama']['models'] = ollama_models
    
    return results


@app.post('/api/dependencies/{dep_key}/install')
async def install_dependency(dep_key: str):
    """Install a dependency"""
    try:
        success = dependency_manager.install_dependency(dep_key, auto_confirm=True)
        if success:
            return {'message': f'{dep_key} installed successfully'}
        else:
            raise HTTPException(status_code=400, detail='Installation failed')
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/dependencies/{dep_key}/configure-path')
async def configure_custom_path(dep_key: str, path_data: dict):
    """Configure custom path for a dependency"""
    custom_path = path_data.get('path', '').strip()
    
    if not custom_path:
        raise HTTPException(status_code=400, detail='Path is required')
    
    try:
        # Use the dependency manager's configure method
        import yaml
        from pathlib import Path
        import os
        import subprocess
        
        # Validate path exists
        if not os.path.exists(custom_path):
            raise HTTPException(status_code=400, detail=f'Path does not exist: {custom_path}')
        
        # Test the executable
        try:
            result = subprocess.run(
                [custom_path, '--help'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode != 0:
                raise HTTPException(status_code=400, detail='Executable test failed')
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=400, detail='Executable test timed out')
        except FileNotFoundError:
            raise HTTPException(status_code=400, detail='File is not executable')
        
        # Update config file
        config_path = Path('config/config.yaml')
        if not config_path.exists():
            raise HTTPException(status_code=500, detail='Config file not found')
        
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f) or {}
        
        if dep_key == 'whisper.cpp':
            if 'modules' not in config:
                config['modules'] = {}
            if 'subtitles' not in config['modules']:
                config['modules']['subtitles'] = {}
            if 'whispercpp' not in config['modules']['subtitles']:
                config['modules']['subtitles']['whispercpp'] = {}
            
            config['modules']['subtitles']['whispercpp']['custom_path'] = custom_path
            config['modules']['subtitles']['whispercpp']['whisper_bin'] = custom_path
        
        with open(config_path, 'w') as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False)
        
        return {'message': 'Custom path configured successfully', 'path': custom_path}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/dependencies/{dep_key}')
async def check_dependency(dep_key: str):
    """Check specific dependency"""
    is_installed, version = dependency_manager.check_dependency(dep_key)
    
    dep_info = dependency_manager.DEPENDENCIES.get(dep_key)
    if not dep_info:
        raise HTTPException(status_code=404, detail='Unknown dependency')
    
    return {
        'name': dep_info['name'],
        'description': dep_info['description'],
        'required': dep_info['required'],
        'installed': is_installed,
        'version': version
    }


@app.post('/api/events/{event_id}/workflow/run')
async def run_workflow(event_id: str, workflow_data: WorkflowRun):
    """Run workflow for an event"""
    import threading
    
    # Check if event exists
    event = event_manager.load_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail='Event not found')
    
    # Check if already running
    progress = workflow_controller.get_progress(event_id)
    if progress and progress.get('status') == 'running':
        raise HTTPException(status_code=409, detail='Workflow already running')
    
    # Run workflow in background thread
    def run_in_background():
        try:
            workflow_controller.run_event(event_id, force=workflow_data.force)
        except Exception as e:
            # Update progress with error
            workflow_controller._update_progress(event_id, {
                "status": "failed",
                "error": str(e),
                "details": f"Workflow failed: {str(e)}"
            })
    
    thread = threading.Thread(target=run_in_background, daemon=True)
    thread.start()
    
    return {'message': 'Workflow started', 'event_id': event_id}


@app.get('/api/events/{event_id}/progress')
async def get_workflow_progress(event_id: str):
    """Get real-time workflow progress"""
    # Check if event exists
    event = event_manager.load_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail='Event not found')
    
    # Get current progress
    progress = workflow_controller.get_progress(event_id)
    
    if not progress:
        # No progress yet, check if completed
        state = workflow_controller.state_store.get_workflow_state(event_id)
        if state and state.get('overall_status') == 'completed':
            return {
                'status': 'completed',
                'progress_percent': 100,
                'current_module': None,
                'current_step': 'Completed',
                'details': 'Workflow already completed'
            }
        else:
            return {
                'status': 'pending',
                'progress_percent': 0,
                'current_module': None,
                'current_step': 'Not started',
                'details': 'Workflow not started yet'
            }
    
    return progress


@app.post('/api/events/{event_id}/modules/{module_name}/run')
async def run_single_module(event_id: str, module_name: str, module_data: ModuleRun):
    """Run a single module independently"""
    import threading
    
    # Check if event exists
    event = event_manager.load_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail='Event not found')
    
    # Run module in background thread
    def run_in_background():
        try:
            workflow_controller.run_single_module(
                event_id=event_id,
                module_name=module_name,
                input_files=module_data.input_files,
                force=module_data.force
            )
        except Exception as e:
            # Log error
            workflow_controller.logger.error(f"Module {module_name} failed: {e}")
    
    thread = threading.Thread(target=run_in_background, daemon=True)
    thread.start()
    
    return {'message': f'Module {module_name} started', 'event_id': event_id, 'module': module_name}


@app.get('/api/events/{event_id}/modules/{module_name}/inputs')
async def get_module_inputs(event_id: str, module_name: str):
    """Get available inputs for a module"""
    # Check if event exists
    event = event_manager.load_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail='Event not found')
    
    try:
        inputs_info = workflow_controller.get_module_inputs(event_id, module_name)
        return inputs_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/events/{event_id}/modules')
async def list_event_modules(event_id: str):
    """List all available modules with their status and inputs"""
    event = event_manager.load_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail='Event not found')
    
    # Define all available modules
    all_modules = [
        {'name': 'subtitles', 'label': 'Generate Subtitles', 'description': 'Generate SRT/VTT subtitles using Whisper'},
        {'name': 'ai_content', 'label': 'AI Content Processing', 'description': 'Correct subtitles and generate summary'},
        {'name': 'thumbnail_compose', 'label': 'Compose Thumbnail', 'description': 'Generate thumbnail image'},
        {'name': 'publish_youtube', 'label': 'Publish to YouTube', 'description': 'Upload video to YouTube'},
        {'name': 'publish_website', 'label': 'Publish to Website', 'description': 'Generate website post'},
    ]
    
    # Add status and inputs info for each module
    for module in all_modules:
        module_name = module['name']
        
        # Get execution status
        result = workflow_controller.state_store.get_module_result(event_id, module_name)
        if result:
            module['status'] = result.get('status', 'unknown')
            module['last_run'] = result.get('timestamp', None)
            if result.get('output_file'):
                module['output_file'] = result['output_file']
        else:
            module['status'] = 'not_run'
        
        # Get input requirements
        inputs_info = workflow_controller.get_module_inputs(event_id, module_name)
        module['inputs'] = inputs_info
        
        # Check if enabled in event config
        module['enabled'] = event.get('modules', {}).get(module_name, False)
    
    return {'modules': all_modules}


@app.get('/api/models/whisper')
async def get_whisper_models():
    """Get available Whisper models"""
    try:
        from pathlib import Path
        import yaml
        
        models_list = []
        
        # Check default models directory
        models_dir = Path('../whisper.cpp/models')
        if models_dir.exists():
            for model_file in models_dir.glob('ggml-*.bin'):
                model_name = model_file.stem.replace('ggml-', '')
                models_list.append({
                    'value': model_name,
                    'label': model_name.capitalize(),
                    'path': str(model_file),
                    'size': model_file.stat().st_size
                })
        
        # Check custom path from config
        config_path = Path('config/config.yaml')
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f) or {}
            
            custom_models_dir = config.get('modules', {}).get('subtitles', {}).get('whispercpp', {}).get('models_dir')
            if custom_models_dir:
                custom_dir = Path(custom_models_dir)
                if custom_dir.exists():
                    for model_file in custom_dir.glob('ggml-*.bin'):
                        model_name = model_file.stem.replace('ggml-', '')
                        # Avoid duplicates
                        if not any(m['value'] == model_name for m in models_list):
                            models_list.append({
                                'value': model_name,
                                'label': model_name.capitalize(),
                                'path': str(model_file),
                                'size': model_file.stat().st_size
                            })
        
        # Sort by common model order
        model_order = ['tiny', 'base', 'small', 'medium', 'large-v3', 'large-v2', 'large']
        models_list.sort(key=lambda x: model_order.index(x['value']) if x['value'] in model_order else 999)
        
        return {
            'models': models_list,
            'default': 'base' if any(m['value'] == 'base' for m in models_list) else (models_list[0]['value'] if models_list else None)
        }
    except Exception as e:
        return {'models': [], 'default': None, 'error': str(e)}


@app.get('/api/models/ollama')
async def get_ollama_models():
    """Get available Ollama models"""
    try:
        import requests
        
        response = requests.get('http://localhost:11434/api/tags', timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            models = data.get('models', [])
            
            models_list = []
            for model in models:
                model_name = model.get('name', '')
                models_list.append({
                    'value': model_name,
                    'label': model_name,
                    'size': model.get('size', 0),
                    'modified': model.get('modified_at', '')
                })
            
            # Determine default (prefer qwen2.5, then llama3.2)
            default = None
            for preferred in ['qwen2.5:latest', 'llama3.2:latest', 'gemma2:latest']:
                if any(m['value'] == preferred for m in models_list):
                    default = preferred
                    break
            
            if not default and models_list:
                default = models_list[0]['value']
            
            return {
                'models': models_list,
                'default': default,
                'service_available': True
            }
        else:
            return {
                'models': [],
                'default': None,
                'service_available': False,
                'error': f'Ollama API returned status {response.status_code}'
            }
    except Exception as e:
        return {
            'models': [],
            'default': None,
            'service_available': False,
            'error': str(e)
        }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
