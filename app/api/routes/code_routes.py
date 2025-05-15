import os
import tempfile
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel, HttpUrl

from app.services.processing_service import get_status
from app.services.code_service import CodeService
from app.services.processing_service import create_job
from app.schemas.code_routes import (
    GithubRepo,
    ProcessingResponse, 
    ProcessingStatusResponse,
    JobResponse,
    ReIndexRequest
)
from app.tasks.background_tasks import (
    process_zip_file,
    process_rar_file,
    process_github_repo,
    process_code_files
)

router = APIRouter()


@router.post("/upload/zip", response_model=ProcessingResponse)
async def upload_zip_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    project_name: Optional[str] = Form(None)
):
    """Upload and process a zip file containing code"""
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a zip file")
    
    # Create job and get ID
    job_id, collection_name = create_job(project_name, "zip")
    
    # Save the uploaded file temporarily
    code_service = CodeService()
    temp_file = code_service.save_file_temporarily(file.file, file.filename)
    
    # Process in background
    background_tasks.add_task(
        process_zip_file, 
        temp_file,
        job_id,
        collection_name
    )
    
    return ProcessingResponse(
        job_id=job_id,
        message="Zip file uploaded successfully, processing started",
        status="processing"
    )

@router.post("/upload/rar", response_model=ProcessingResponse)
async def upload_rar_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    project_name: Optional[str] = Form(None)
):
    """Upload and process a rar file containing code"""
    if not file.filename.lower().endswith('.rar'):
        raise HTTPException(status_code=400, detail="File must be a rar file")
    
    # Create job and get ID
    job_id, collection_name = create_job(project_name, "rar")
    
    # Save the uploaded file temporarily
    code_service = CodeService()
    temp_file = code_service.save_file_temporarily(file.file, file.filename)
    
    # Process in background
    background_tasks.add_task(
        process_rar_file, 
        temp_file,
        job_id,
        collection_name
    )
    
    return ProcessingResponse(
        job_id=job_id,
        message="Rar file uploaded successfully, processing started",
        status="processing"
    )

@router.post("/github", response_model=ProcessingResponse)
async def process_github_repository(
    background_tasks: BackgroundTasks,
    repo: GithubRepo
):
    """Process a GitHub repository"""
    # Create job and get ID
    job_id, collection_name = create_job(repo.name, "github")
    
    # Process in background
    background_tasks.add_task(
        process_github_repo, 
        str(repo.url), 
        job_id, 
        collection_name
    )
    
    return ProcessingResponse(
        job_id=job_id,
        message="GitHub repository processing started",
        status="processing"
    )

@router.get("/status/{job_id}", response_model=ProcessingStatusResponse)
async def get_processing_status(job_id: str):
    """Get the status of a processing job"""
    try:
        status_info = get_status(job_id)
        
        return ProcessingStatusResponse(
            job_id=job_id,
            status=status_info["status"],
            message=status_info["message"],
            collection_name=status_info.get("collection_name")
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found")

@router.post("/reindex", response_model=JobResponse)
async def reindex_code(
    background_tasks: BackgroundTasks,
    reindex_req: ReIndexRequest
):
    """Re-index a code collection that might have issues"""
    try:
        # Create a new job
        job_id, new_collection_name = create_job(
            f"{reindex_req.collection_name}_reindexed", 
            "reindex"
        )
        
        # Find source files
        code_service = CodeService()
        file_paths = code_service.find_files_for_collection(reindex_req.collection_name)
        
        if not file_paths:
            raise HTTPException(
                status_code=404, 
                detail="No code files found to reindex. Please upload your code again."
            )
        
        # Start the background task
        background_tasks.add_task(
            process_code_files,
            file_paths,
            new_collection_name,
            job_id
        )
        
        return JobResponse(
            job_id=job_id,
            status="processing",
            message="Re-indexing started",
            collection_name=new_collection_name
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error starting re-indexing process: {str(e)}"
        ) 