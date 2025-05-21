# RAG Code Assistant

A FastAPI-based application that provides code assistance using Retrieval-Augmented Generation (RAG) technology.

## Features

- Web-based code assistant interface
- FastAPI backend with API documentation
- RAG-powered code suggestions and assistance

## Prerequisites

- Python 3.8+
- pip (Python package manager)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/code-assistant.git
   cd code-assistant
   ```

2. Set up a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create a `.env` file in the root directory (optional):
   ```
   # Example environment variables
   PORT=8000
   HOST=0.0.0.0
   WORKERS=1
   ```

## Usage

Run the application:
```bash
python run.py
```

The server will start at http://localhost:8000

- API Documentation: http://localhost:8000/docs
- Frontend Interface: http://localhost:8000/app
- Health Check: http://localhost:8000/health

## Project Structure

```
code-assistant/
├── app/                  # Application directory
│   ├── api/              # API routes
│   ├── frontend/         # Frontend application
│   ├── schemas/          # Pydantic models
│   ├── services/         # Business logic
│   ├── tasks/            # Background tasks
│   └── main.py           # FastAPI application initialization
├── venv/                 # Virtual environment
├── .env                  # Environment variables (create this)
├── .gitignore            # Git ignore file
├── README.md             # This file
├── requirements.txt      # Python dependencies
└── run.py                # Application entry point
```

## License

[Your License Here]

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 