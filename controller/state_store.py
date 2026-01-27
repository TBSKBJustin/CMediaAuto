"""
State Store - Saves run state (JSON/SQLite)
"""

import json
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime


class StateStore:
    """Persists workflow execution state"""
    
    def __init__(self, events_dir: str = "events"):
        self.events_dir = Path(events_dir)
        self._progress_cache = {}  # In-memory progress cache
    
    def save_module_result(self, event_id: str, module_name: str, result: Dict) -> None:
        """
        Save the result of a module execution
        
        Args:
            event_id: Event identifier
            module_name: Name of the module
            result: Module execution result dictionary
        """
        event_path = self.events_dir / event_id
        if not event_path.exists():
            raise ValueError(f"Event directory not found: {event_id}")
        
        # Save to logs directory
        result_file = event_path / "logs" / f"{module_name}_result.json"
        result["saved_at"] = datetime.now().isoformat()
        
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
    
    def get_module_result(self, event_id: str, module_name: str) -> Optional[Dict]:
        """
        Retrieve the result of a previous module execution
        
        Args:
            event_id: Event identifier
            module_name: Name of the module
            
        Returns:
            Module result dictionary or None if not found
        """
        result_file = self.events_dir / event_id / "logs" / f"{module_name}_result.json"
        if not result_file.exists():
            return None
        
        with open(result_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def save_workflow_state(self, event_id: str, results: Dict) -> None:
        """
        Save the overall workflow execution state
        
        Args:
            event_id: Event identifier
            results: Dictionary of all module results
        """
        event_path = self.events_dir / event_id
        if not event_path.exists():
            raise ValueError(f"Event directory not found: {event_id}")
        
        state_file = event_path / "logs" / "workflow_state.json"
        state = {
            "event_id": event_id,
            "completed_at": datetime.now().isoformat(),
            "module_results": results,
            "overall_status": self._compute_overall_status(results)
        }
        
        with open(state_file, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2, ensure_ascii=False)
    
    def get_workflow_state(self, event_id: str) -> Optional[Dict]:
        """Retrieve overall workflow state"""
        state_file = self.events_dir / event_id / "logs" / "workflow_state.json"
        if not state_file.exists():
            return {
                "event_id": event_id,
                "overall_status": "pending",
                "modules": {}
            }
        
        with open(state_file, 'r', encoding='utf-8') as f:
            state = json.load(f)
            # Rename module_results to modules for frontend compatibility
            if "module_results" in state:
                state["modules"] = state.pop("module_results")
            return state
    
    def save_progress(self, event_id: str, progress_data: Dict) -> None:
        """Save current workflow progress (in-memory and file)"""
        # Cache in memory for fast access
        self._progress_cache[event_id] = progress_data
        
        # Also save to file
        event_path = self.events_dir / event_id
        if event_path.exists():
            progress_file = event_path / "logs" / "progress.json"
            progress_data["updated_at"] = datetime.now().isoformat()
            with open(progress_file, 'w', encoding='utf-8') as f:
                json.dump(progress_data, f, indent=2, ensure_ascii=False)
    
    def get_progress(self, event_id: str) -> Optional[Dict]:
        """Get current workflow progress"""
        # Check memory cache first
        if event_id in self._progress_cache:
            return self._progress_cache[event_id]
        
        # Try loading from file
        progress_file = self.events_dir / event_id / "logs" / "progress.json"
        if progress_file.exists():
            with open(progress_file, 'r', encoding='utf-8') as f:
                progress = json.load(f)
                self._progress_cache[event_id] = progress
                return progress
        
        return None
    
    def clear_progress(self, event_id: str) -> None:
        """Clear progress data for an event"""
        if event_id in self._progress_cache:
            del self._progress_cache[event_id]
    
    def _compute_overall_status(self, results: Dict) -> str:
        """
        Compute overall workflow status from module results
        
        Returns:
            One of: "pending", "processing", "completed", "failed"
        """
        if not results:
            return "pending"
        
        statuses = [r.get("status", "unknown") for r in results.values()]
        
        # If any module is running, overall is processing
        if any(s == "running" for s in statuses):
            return "processing"
        
        # If all modules succeeded, overall is completed
        if all(s in ["success", "skipped"] for s in statuses):
            return "completed"
        
        # If any failed, overall is failed
        if any(s == "failed" for s in statuses):
            return "failed"
        
        # Default to pending
        return "pending"
