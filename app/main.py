import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.frontend.server import static_router

# Load environment variables
load_dotenv()


app = FastAPI(title="RAG Code Assistant API")

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://127.0.0.1",
    "http://127.0.0.1:8000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(static_router, tags=["frontend"])

@app.get("/", include_in_schema=False)
async def redirect_to_frontend():
    return {"message": "Welcome to RAG Code Assistant API - Visit /docs for API documentation or /app for the frontend"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "Service is running"}

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    workers = int(os.getenv("WORKERS", 1))
    
    uvicorn.run("app.main:app", host=host, port=port, workers=workers) 