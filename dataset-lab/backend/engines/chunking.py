import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Dict, Any

class ChunkingEngine:
    def __init__(self):
        # We use tiktoken for accurate token counting
        self.encoder = tiktoken.get_encoding("cl100k_base")

    def count_tokens(self, text: str) -> int:
        return len(self.encoder.encode(text))

    def chunk(self, text: str, chunk_size: int = 800, chunk_overlap: int = 100) -> List[Dict[str, Any]]:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=self.count_tokens,
            separators=["\n\n", "\n", " ", ""]
        )
        
        splits = splitter.split_text(text)
        
        chunks = []
        for i, split_text in enumerate(splits):
            chunks.append({
                "chunk_id": i,
                "text": split_text,
                "token_count": self.count_tokens(split_text)
            })
            
        return chunks

chunking_engine = ChunkingEngine()
