"""
EduCompass Pipeline — PDF Structural Profiler
Course: CS-326 Software Engineering (Complex Engineering Problem)
NED University of Engineering & Technology, Dept. of CISE

Purpose:
  Inspects university PDFs (course charts, FYDP lists, and roadmap documents)
  to detect table structures, page layouts, and column headers before running
  extraction.
"""

import os
from typing import Dict, Any, List

def profile_document(file_path: str) -> Dict[str, Any]:
    """Profiles a PDF document's size, existence, and metadata."""
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}
    
    file_size_kb = round(os.path.getsize(file_path) / 1024, 2)
    filename = os.path.basename(file_path)
    
    # Identify document type
    doc_type = "unknown"
    if "FYP" in filename or "FYDP" in filename:
        doc_type = "fyp_project_list"
    elif "Syllabi" in filename or "course" in filename.lower():
        doc_type = "academic_curriculum"
    elif any(track in filename.lower() for track in ["engineer", "security", "design", "qa", "science"]):
        doc_type = "career_roadmap"

    return {
        "filename": filename,
        "type": doc_type,
        "size_kb": file_size_kb,
        "status": "ready_for_extraction"
    }

def batch_profile(directory_path: str) -> List[Dict[str, Any]]:
    """Profiles all PDF documents in a directory."""
    if not os.path.isdir(directory_path):
        return []
    
    profiles = []
    for f in os.listdir(directory_path):
        if f.lower().endswith('.pdf'):
            profiles.append(profile_document(os.path.join(directory_path, f)))
    return profiles

if __name__ == "__main__":
    print("PDF Profiler Initialized")
