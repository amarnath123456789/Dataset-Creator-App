import json
from pathlib import Path
from fastapi import HTTPException
from typing import Dict, Any

class Exporter:
    def __init__(self):
        self.formats_path = Path(__file__).parent.parent / "formats" / "formats.json"

    def _load_formats(self) -> Dict[str, Any]:
        if not self.formats_path.exists():
            raise RuntimeError("formats.json not found")
        with open(self.formats_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def export(self, project_path: Path, format: str):
        qa_path = project_path / "qa_v1.json"
        
        if not qa_path.exists():
            raise HTTPException(status_code=404, detail="qa_v1.json not found. Run generation first.")
            
        formats = self._load_formats()
        if format not in formats:
            raise HTTPException(status_code=400, detail=f"Format '{format}' not supported. Available: {list(formats.keys())}")

        template = formats[format].get("template")
        if not template:
             raise HTTPException(status_code=500, detail=f"Template for format '{format}' is missing.")

        with open(qa_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        export_path = project_path / f"export_{format}.jsonl"
        
        with open(export_path, 'w', encoding='utf-8') as f:
            for item in data:
                # Transform item using template checking for placeholders
                # We do a simple recursive replacement or string dump replacement?
                # The template structure might be complex (nested dicts/lists).
                # String conversion and replace might be easiest but risky for JSON structure.
                # Constructing the object is safer.
                
                transformed_item = self._transform(template, item)
                f.write(json.dumps(transformed_item) + "\n")
                
        return export_path

    def _transform(self, template: Any, data: Dict[str, str]) -> Any:
        if isinstance(template, str):
            # Replace placeholders
            # We only expect {question} and {answer}
            val = template
            val = val.replace("{question}", data.get("question", ""))
            val = val.replace("{answer}", data.get("answer", ""))
            return val
        elif isinstance(template, dict):
            return {k: self._transform(v, data) for k, v in template.items()}
        elif isinstance(template, list):
            return [self._transform(i, data) for i in template]
        else:
            return template

exporter = Exporter()
