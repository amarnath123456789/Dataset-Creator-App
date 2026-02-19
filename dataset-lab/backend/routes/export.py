from fastapi import APIRouter
from backend.engines.exporter import exporter
from backend.utils.filesystem import get_project_path
from fastapi.responses import FileResponse
from pathlib import Path

router = APIRouter()

@router.get("/{project_name}/export")
def export_dataset(project_name: str, format: str = "alpaca"):
    try:
        project_path = get_project_path(project_name)
        export_path = exporter.export(project_path, format)
        
        if not export_path or not export_path.exists():
            return {"error": "Export failed or no data found. Did you run generation?"}
            
        return FileResponse(
            path=export_path, 
            filename=f"export_{format}.jsonl", 
            media_type="application/x-jsonlines"
        )
    except Exception as e:
        return {"error": str(e)}
