import sys
try:
    import fastapi
    import uvicorn
    import sentence_transformers
    import langchain
    import tiktoken
    import requests
    # python-multipart usually installed but import name might differ, let's check basic
    import multipart 
except ImportError as e:
    print(f"Missing dependency: {e}")
    sys.exit(1)

print("Environment OK")
