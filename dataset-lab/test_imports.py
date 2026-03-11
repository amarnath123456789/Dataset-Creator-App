import os
import sys
import importlib
from pathlib import Path

def test_all_imports():
    success = True
    backend_dir = Path.cwd() / "backend"
    
    if not backend_dir.exists():
        print("Run this from dataset-lab directory")
        sys.exit(1)
        
    print(f"Testing imports in {backend_dir.absolute()} ...\n")
    
    # Add parent of backend to sys.path so 'import backend.xxx' works
    sys.path.insert(0, str(Path.cwd()))
    
    for py_file in backend_dir.rglob("*.py"):
        # Skip __init__.py and some tests if they exist
        if py_file.name == "__init__.py":
            continue
            
        # Convert path to module dotted path
        rel_path = py_file.relative_to(Path.cwd())
        module_name = str(rel_path).replace(os.sep, ".").replace(".py", "")
        
        try:
            importlib.import_module(module_name)
            print(f"[OK] {module_name}")
        except Exception as e:
            print(f"[FAIL] {module_name}")
            print(f"       {type(e).__name__}: {e}")
            success = False
            
    if not success:
        print("\n❌ Import testing failed. There are still missing dependencies or syntax errors.")
        sys.exit(1)
    else:
        print("\n✅ All backend modules imported successfully!")

if __name__ == "__main__":
    test_all_imports()
