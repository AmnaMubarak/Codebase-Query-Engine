from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

# Create the static router
static_router = APIRouter()

# Path to the frontend directory
frontend_path = os.path.dirname(os.path.abspath(__file__))

# Mount static files
static_router.mount("/static", StaticFiles(directory=frontend_path), name="static")

# Serve frontend for all routes under /app
@static_router.get("/app/{full_path:path}")
async def serve_frontend(full_path: str = ""):
    """Serve the frontend application"""
    # If path is empty or root, serve index.html
    if not full_path or full_path == "/":
        return FileResponse(os.path.join(frontend_path, "index.html"))
    
    # Try to serve the requested file from the frontend directory
    file_path = os.path.join(frontend_path, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # If file doesn't exist but doesn't have an extension, serve index.html for SPA routing
    if "." not in full_path:
        return FileResponse(os.path.join(frontend_path, "index.html"))
    
    # Otherwise return 404
    raise HTTPException(status_code=404, detail="File not found")

# Redirect root to /app 
@static_router.get("/app")
async def serve_app_root():
    """Serve the frontend application root"""
    return FileResponse(os.path.join(frontend_path, "index.html")) 