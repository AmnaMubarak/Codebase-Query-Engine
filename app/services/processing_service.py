import uuid
from typing import Dict, Any, Tuple, Optional

# In-memory store for tracking processing status
processing_status: Dict[str, Dict[str, Any]] = {}

def create_job(name: Optional[str] = None, job_type: str = "code") -> Tuple[str, str]:
    """
    Create a new processing job and return its ID and collection name
    
    Args:
        name: Optional name for the collection
        job_type: Type of job (code, github, log)
        
    Returns:
        Tuple of (job_id, collection_name)
    """
    job_id = str(uuid.uuid4())
    
    # Generate collection name based on type and provided name
    if name:
        collection_name = name
    else:
        prefix = job_type if job_type else "project"
        collection_name = f"{prefix}_{uuid.uuid4().hex[:8]}"
    
    # Initialize job status
    processing_status[job_id] = {
        "status": "processing",
        "message": f"{job_type.capitalize()} processing started",
        "collection_name": collection_name,
        "details": {
            "files_processed": 0,
            "current_stage": "Initializing",
            "progress_percentage": 0,
            "errors": []
        }
    }
    
    return job_id, collection_name

def get_status(job_id: str) -> Dict[str, Any]:
    """
    Get the status of a job
    
    Args:
        job_id: The ID of the job
        
    Returns:
        Status information dictionary
    """
    if job_id not in processing_status:
        raise KeyError(f"Job ID {job_id} not found")
    
    return processing_status[job_id]

def update_status(job_id: str, 
                 stage: Optional[str] = None, 
                 files_processed: Optional[int] = None, 
                 progress: Optional[int] = None, 
                 error: Optional[str] = None,
                 status: Optional[str] = None) -> None:
    """
    Update the status of a job
    
    Args:
        job_id: The ID of the job
        stage: Current processing stage
        files_processed: Number of files processed
        progress: Progress percentage (0-100)
        error: Error message to append
        status: Overall status (processing, completed, failed)
    """
    if job_id not in processing_status:
        raise KeyError(f"Job ID {job_id} not found")
    
    job_status = processing_status[job_id]
    
    if stage:
        if "details" not in job_status:
            job_status["details"] = {}
        job_status["details"]["current_stage"] = stage
        job_status["message"] = stage
    
    if files_processed is not None:
        if "details" not in job_status:
            job_status["details"] = {}
        job_status["details"]["files_processed"] = files_processed
    
    if progress is not None:
        if "details" not in job_status:
            job_status["details"] = {}
        job_status["details"]["progress_percentage"] = progress
    
    if error:
        if "details" not in job_status:
            job_status["details"] = {"errors": []}
        elif "errors" not in job_status["details"]:
            job_status["details"]["errors"] = []
        
        job_status["details"]["errors"].append(error)
    
    if status:
        job_status["status"] = status
    
    processing_status[job_id] = job_status

def complete_job(job_id: str, message: str, processed_files: int) -> None:
    """
    Mark a job as completed
    
    Args:
        job_id: The ID of the job
        message: Completion message
        processed_files: Number of files processed
    """
    if job_id not in processing_status:
        raise KeyError(f"Job ID {job_id} not found")
    
    job_status = processing_status[job_id]
    collection_name = job_status.get("collection_name", "")
    
    processing_status[job_id] = {
        "status": "completed",
        "message": message,
        "collection_name": collection_name,
        "details": {
            "files_processed": processed_files,
            "current_stage": "Completed",
            "progress_percentage": 100,
            "errors": job_status.get("details", {}).get("errors", [])
        }
    }

def fail_job(job_id: str, error_message: str) -> None:
    """
    Mark a job as failed
    
    Args:
        job_id: The ID of the job
        error_message: Error message
    """
    if job_id not in processing_status:
        raise KeyError(f"Job ID {job_id} not found")
    
    job_status = processing_status[job_id]
    collection_name = job_status.get("collection_name", "")
    processed = job_status.get("details", {}).get("files_processed", 0)
    
    processing_status[job_id] = {
        "status": "failed",
        "message": f"Processing failed: {error_message}",
        "collection_name": collection_name,
        "details": {
            "files_processed": processed,
            "current_stage": "Failed",
            "progress_percentage": 0,
            "errors": [error_message] + (
                job_status.get("details", {}).get("errors", [])
            )
        }
    } 