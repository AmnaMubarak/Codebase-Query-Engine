import os
import tempfile
import shutil
from typing import List, Optional

from app.core.code_processor import CodeProcessor
from app.core.code_indexer import CodeIndexer

class CodeService:
    """
    Service for handling code-related operations
    """
    
    def __init__(self):
        self.code_processor = CodeProcessor()
        self.code_indexer = CodeIndexer()
    
    def process_zip(self, file_path: str) -> tuple[str, List[str]]:
        """
        Process a zip file and return the extraction path and file list
        
        Args:
            file_path: Path to the zip file
            
        Returns:
            Tuple of (extract_path, file_list)
        """
        extract_path = self.code_processor.process_zip(file_path)
        file_list = self.code_processor.get_file_list(extract_path)
        return extract_path, file_list
    
    def process_rar(self, file_path: str) -> tuple[str, List[str]]:
        """
        Process a rar file and return the extraction path and file list
        
        Args:
            file_path: Path to the rar file
            
        Returns:
            Tuple of (extract_path, file_list)
        """
        extract_path = self.code_processor.process_rar(file_path)
        file_list = self.code_processor.get_file_list(extract_path)
        return extract_path, file_list
    
    def process_github(self, repo_url: str) -> tuple[str, List[str]]:
        """
        Process a GitHub repository and return the repository path and file list
        
        Args:
            repo_url: URL of the GitHub repository
            
        Returns:
            Tuple of (repo_path, file_list)
        """
        repo_path = self.code_processor.process_github(repo_url)
        file_list = self.code_processor.get_file_list(repo_path)
        return repo_path, file_list
    
    def index_files(self, file_list: List[str], collection_name: str) -> str:
        """
        Index files into a collection
        
        Args:
            file_list: List of file paths to index
            collection_name: Name of the collection
            
        Returns:
            Collection name
        """
        return self.code_indexer.index_files(file_list, collection_name)
    
    def find_files_for_collection(self, collection_name: str) -> List[str]:
        """
        Find source files for a collection
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            List of file paths
        """
        file_paths = []
        
        # First check if we already have the temp directory with original files
        temp_dir = os.path.join(os.getcwd(), "temp", collection_name)
        if os.path.exists(temp_dir):
            # Get all files in the directory
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    file_paths.append(file_path)
            
            return file_paths
        
        # Try to find files in other potential locations
        potential_directories = [
            # Check for GitHub repositories
            os.path.join(os.getcwd(), "repos", collection_name),
            # Check temp directory with a different name structure
            os.path.join(tempfile.gettempdir(), collection_name),
            # Check current directory
            os.path.join(os.getcwd(), collection_name)
        ]
        
        for dir_path in potential_directories:
            if os.path.exists(dir_path):
                # Get all files in the directory
                for root, _, files in os.walk(dir_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        file_paths.append(file_path)
                return file_paths
        
        # Try to find any files in the project related to this collection
        for root, dirs, files in os.walk(os.getcwd()):
            for dir_name in dirs:
                if collection_name in dir_name:
                    dir_path = os.path.join(root, dir_name)
                    for sub_root, _, sub_files in os.walk(dir_path):
                        for file in sub_files:
                            # Only include code files
                            if any(file.endswith(ext) for ext in ['.py', '.js', '.java', '.ts', '.html', '.css', '.php', '.rb', '.go', '.cpp', '.h']):
                                file_path = os.path.join(sub_root, file)
                                file_paths.append(file_path)
        
        return file_paths
    
    def cleanup(self) -> None:
        """
        Clean up temporary files
        """
        self.code_processor.cleanup()
    
    def save_file_temporarily(self, file_content, filename: str) -> str:
        """
        Save a file temporarily
        
        Args:
            file_content: File content
            filename: Name of the file
            
        Returns:
            Path to the saved file
        """
        temp_file = os.path.join(tempfile.gettempdir(), filename)
        with open(temp_file, "wb") as buffer:
            shutil.copyfileobj(file_content, buffer)
        return temp_file 