from typing import Optional
from pydantic import BaseModel, HttpUrl

class GithubRepo(BaseModel):
    url: HttpUrl
    name: Optional[str] = None

class ProcessingResponse(BaseModel):
    job_id: str
    message: str
    status: str

class ProcessingStatusResponse(BaseModel):
    job_id: str
    status: str
    message: str
    collection_name: Optional[str] = None

class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str
    collection_name: Optional[str] = None

class ReIndexRequest(BaseModel):
    """Schema for reindexing request"""
    collection_name: str