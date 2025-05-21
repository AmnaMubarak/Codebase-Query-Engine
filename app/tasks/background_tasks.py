import os
import shutil
from typing import List

from app.services.processing_service import update_status, complete_job, fail_job
from app.services.code_service import CodeService

def process_zip_file(file_path: str, job_id: str, collection_name: str) -> None:
    """
    Process a zip file in the background
    
    Args:
        file_path: Path to the zip file
        job_id: Job ID
        collection_name: Collection name
    """
    code_service = CodeService()
    processed = 0
    
    try:
        # Extract and get file list
        update_status(job_id, stage="Extracting files...", progress=10)
        extract_path, file_list = code_service.process_zip(file_path)
        total_files = len(file_list)
        
        if total_files == 0:
            raise ValueError("No files found in ZIP archive")
        
        # Index files
        update_status(job_id, stage="Processing files...", progress=30)
        code_service.index_files(file_list, collection_name)
        processed = total_files
        
        # Final cleanup
        update_status(job_id, stage="Cleaning up...", files_processed=processed, progress=90)
        code_service.cleanup()
        os.remove(file_path)
        
        # Update final status
        complete_job(
            job_id=job_id,
            message=f"Successfully processed {processed} files",
            processed_files=processed
        )
        
    except Exception as e:
        fail_job(job_id=job_id, error_message=str(e))
        
        # Clean up on failure
        try:
            code_service.cleanup()
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass

def process_rar_file(file_path: str, job_id: str, collection_name: str) -> None:
    """
    Process a rar file in the background
    
    Args:
        file_path: Path to the rar file
        job_id: Job ID
        collection_name: Collection name
    """
    code_service = CodeService()
    processed = 0
    
    try:
        # Extract and get file list
        update_status(job_id, stage="Extracting files...", progress=10)
        extract_path, file_list = code_service.process_rar(file_path)
        total_files = len(file_list)
        
        if total_files == 0:
            raise ValueError("No files found in RAR archive")
        
        # Index files
        update_status(job_id, stage="Processing files...", progress=30)
        code_service.index_files(file_list, collection_name)
        processed = total_files
        
        # Final cleanup
        update_status(job_id, stage="Cleaning up...", files_processed=processed, progress=90)
        code_service.cleanup()
        os.remove(file_path)
        
        # Update final status
        complete_job(
            job_id=job_id,
            message=f"Successfully processed {processed} files",
            processed_files=processed
        )
        
    except Exception as e:
        fail_job(job_id=job_id, error_message=str(e))
        
        # Clean up on failure
        try:
            code_service.cleanup()
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass

def process_github_repo(repo_url: str, job_id: str, collection_name: str) -> None:
    """
    Process a GitHub repository in the background
    
    Args:
        repo_url: URL of the GitHub repository
        job_id: Job ID
        collection_name: Collection name
    """
    code_service = CodeService()
    processed = 0
    
    try:
        # Clone repository
        update_status(job_id, stage="Cloning repository...", progress=10)
        repo_path, file_list = code_service.process_github(repo_url)
        total_files = len(file_list)
        
        if total_files == 0:
            raise ValueError("No files found in repository")
        
        # Process files
        update_status(job_id, stage="Scanning repository...", progress=30)
        
        processed = 0
        for file_path in file_list:
            try:
                update_status(
                    job_id=job_id,
                    stage=f"Processing file {processed + 1} of {total_files}",
                    files_processed=processed,
                    progress=30 + int(60 * (processed / total_files))
                )
                code_service.index_files([file_path], collection_name)
                processed += 1
            except Exception as e:
                update_status(
                    job_id=job_id,
                    stage=f"Processing file {processed + 1} of {total_files}",
                    error=f"Warning: Failed to process {os.path.basename(file_path)}: {str(e)}"
                )
                continue
        
        # Final cleanup
        update_status(job_id, stage="Cleaning up...", files_processed=processed, progress=90)
        code_service.cleanup()
        
        # Update final status
        complete_job(
            job_id=job_id,
            message=f"Successfully processed {processed} out of {total_files} files",
            processed_files=processed
        )
        
    except Exception as e:
        fail_job(job_id=job_id, error_message=str(e))
        
        # Attempt cleanup
        try:
            code_service.cleanup()
        except Exception:
            pass

def process_code_files(file_paths: List[str], collection_name: str, job_id: str) -> None:
    """
    Process a list of code files for reindexing
    
    Args:
        file_paths: List of file paths to process
        collection_name: Collection name
        job_id: Job ID
    """
    code_service = CodeService()
    total_files = len(file_paths)
    
    try:
        # Initialize
        update_status(job_id, stage="Initializing...", progress=5)
        
        # Create temp directory for the reindexed collection
        temp_dir = os.path.join(os.getcwd(), "temp", collection_name)
        os.makedirs(temp_dir, exist_ok=True)
        
        # Copy files to the temp directory to make them available for future reindexing
        for i, file_path in enumerate(file_paths):
            progress = int(10 + (i / total_files) * 40)
            update_status(
                job_id=job_id,
                stage=f"Copying file {i+1}/{total_files}",
                files_processed=i,
                progress=progress
            )
            
            try:
                # Get the relative path part from the original file path
                relative_path = os.path.basename(file_path)
                target_path = os.path.join(temp_dir, relative_path)
                
                # Create directory if needed
                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                
                # Copy the file
                shutil.copy2(file_path, target_path)
            except Exception as e:
                update_status(
                    job_id=job_id,
                    error=f"Warning: Failed to copy {os.path.basename(file_path)}: {str(e)}"
                )
        
        # Index the files
        update_status(job_id, stage="Indexing files...", progress=50)
        code_service.index_files(file_paths, collection_name)
        
        # Update completion status
        complete_job(
            job_id=job_id,
            message=f"Successfully reindexed {total_files} files",
            processed_files=total_files
        )
        
    except Exception as e:
        fail_job(job_id=job_id, error_message=str(e)) 