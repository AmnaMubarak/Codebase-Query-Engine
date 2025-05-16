from fastapi import APIRouter
from app.api.routes.code_routes import router as code_router

# Create main API router
api_router = APIRouter()


# Include all route modules
api_router.include_router(code_router, prefix="/code", tags=["code"])