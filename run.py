#!/usr/bin/env python3
"""
RAG Code Assistant - Run script
This script starts the RAG Code Assistant application.
"""

import uvicorn
from dotenv import load_dotenv

if __name__ == "__main__":

    # Run the application
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )
    print("RAG Code Assistant server started at http://localhost:8000") 