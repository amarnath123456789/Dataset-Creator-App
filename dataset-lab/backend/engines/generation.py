import json
import re
import logging
from pathlib import Path
from typing import List, Dict, Any
from backend.models import GenerationConfig
from backend.llm.base import LLMProvider
from backend.llm.local import LocalLLM
from backend.llm.openai import OpenAILLM

logger = logging.getLogger(__name__)

class GenerationEngine:
    def __init__(self):
        self.formats_path = Path(__file__).parent.parent / "formats" / "formats.json"
        
    def _get_provider(self, config: GenerationConfig) -> LLMProvider:
        if config.provider == "openai":
            return OpenAILLM()
        else:
            return LocalLLM()

    def _write_error(self, project_path: Path, message: str):
        """Write a generation error to error.log so the UI can surface it."""
        error_log = project_path / "error.log"
        logger.error(message)
        with open(error_log, "a", encoding="utf-8") as f:
            f.write(message + "\n")

    def _write_progress(self, project_path: Path, done: int, total: int, status: str):
        """Write live progress info so the frontend can poll it."""
        progress = {
            "done": done,
            "total": total,
            "percent": round(done / total * 100, 1) if total else 0,
            "status": status,
        }
        try:
            with open(project_path / "progress.json", "w", encoding="utf-8") as f:
                json.dump(progress, f)
        except Exception:
            pass

    def generate(self, project_path: Path, config: GenerationConfig):
        error_log = project_path / "error.log"
        # Clear any previous generation errors so old messages don't persist
        if error_log.exists():
            error_log.unlink()
        # Clear previous progress
        progress_path = project_path / "progress.json"
        if progress_path.exists():
            progress_path.unlink()

        # 1. Load Chunks
        chunks_path = project_path / "chunks.json"
        if not chunks_path.exists():
            self._write_error(project_path, "[Generation] chunks.json not found — chunking stage may have failed.")
            return []
            
        try:
            with open(chunks_path, 'r', encoding='utf-8') as f:
                chunks = json.load(f)
        except Exception as e:
            self._write_error(project_path, f"[Generation] Failed to load chunks.json: {e}")
            return []

        if not chunks:
            self._write_error(project_path, "[Generation] chunks.json is empty — nothing to generate from.")
            return []
            
        # 2. Load Prompt Template
        prompt_path = Path(__file__).parent.parent / "prompts" / "base_prompt.txt"
        with open(prompt_path, 'r', encoding='utf-8') as f:
            base_prompt = f.read()
        
        # 3. Initialize LLM
        llm = self._get_provider(config)
        
        qa_results = []
        chunk_errors = []
        total = len(chunks)
        
        # Initialize qa_v1.json as empty list immediately so status endpoint sees it
        qa_path = project_path / "qa_v1.json"
        with open(qa_path, 'w', encoding='utf-8') as f:
            json.dump([], f)
        
        self._write_progress(project_path, 0, total, "starting")
        
        # 4. Loop through chunks
        for i, chunk in enumerate(chunks):
            # Check for stop signal
            if (project_path / ".stop").exists():
                logger.info(f"[Generation] Stop signal detected for {project_path.name}")
                # Save partial results if any
                if qa_results:
                    partial_path = project_path / "qa_partial.json"
                    with open(partial_path, 'w', encoding='utf-8') as f:
                        json.dump(qa_results, f, indent=2)
                
                # Clean up lock files
                if (project_path / ".running").exists():
                    (project_path / ".running").unlink()
                (project_path / ".stop").unlink()
                
                self._write_progress(project_path, i, total, "stopped")
                return qa_results

            text = chunk['text']

            token_count = chunk.get('token_count', len(text))
            
            # QA Count: density_factor per 300 tokens (default 1.0 = 1 pair per 300 tokens)
            qa_count = max(1, int((token_count / 300) * config.qa_density_factor))
            
            # Formulate Prompt
            prompt = base_prompt.format(
                domain=config.domain,
                qa_count=qa_count,
                chunk=text
            )
            
            # Pydantic v2 uses model_dump(), v1 uses dict()
            try:
                llm_config = config.model_dump()
            except AttributeError:
                llm_config = config.dict()

            self._write_progress(project_path, i, total, f"generating chunk {i+1}/{total}")

            # Call LLM
            try:
                response_text = llm.generate(prompt, llm_config)
            except Exception as e:
                err = f"[Generation] LLM call failed for chunk {chunk['chunk_id']}: {e}"
                chunk_errors.append(err)
                logger.error(err)
                # If first chunk fails, abort early — no point calling hundreds more times
                if i == 0:
                    self._write_error(
                        project_path,
                        f"[Generation] Aborting: LLM provider unreachable on first chunk.\n"
                        f"Provider: {config.provider}, Model: {config.model_name}\n"
                        f"Error: {e}\n\n"
                        f"If using Ollama, make sure 'ollama serve' is running and the model is pulled.\n"
                        f"If using OpenAI, check that your API key is set in Settings."
                    )
                    self._write_progress(project_path, 0, total, "error")
                    return []
                continue
            
            # Parse JSON from response
            try:
                json_match = re.search(r'\[.*?\]', response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                    qas = json.loads(json_str)
                    if isinstance(qas, list):
                        for qa in qas:
                            qa['chunk_id'] = chunk['chunk_id']
                            qa_results.append(qa)
                        # ── Incremental save after every successful chunk ──
                        with open(qa_path, 'w', encoding='utf-8') as f:
                            json.dump(qa_results, f, indent=2)
                    else:
                        err = f"[Generation] Unexpected JSON type for chunk {chunk['chunk_id']}: got {type(qas).__name__}"
                        chunk_errors.append(err)
                        logger.warning(err)
                else:
                    err = f"[Generation] No JSON array found in LLM response for chunk {chunk['chunk_id']}. Response: {response_text[:200]}"
                    chunk_errors.append(err)
                    logger.warning(err)
            except Exception as e:
                err = f"[Generation] JSON parse error for chunk {chunk['chunk_id']}: {e}"
                chunk_errors.append(err)
                logger.warning(err)

        # 5. Final save (covers edge case where last chunk had no new QAs)
        with open(qa_path, 'w', encoding='utf-8') as f:
            json.dump(qa_results, f, indent=2)

        # Clean up any stale .stop file if generation finished normally
        stop_path = project_path / ".stop"
        if stop_path.exists():
            stop_path.unlink()

        self._write_progress(project_path, total, total, "done")

        # 6. Write a summary error if we got zero results
        if not qa_results:
            error_summary = (
                f"[Generation] Completed with 0 QA pairs generated from {len(chunks)} chunks.\n"
                f"Chunk errors ({len(chunk_errors)}):\n" +
                "\n".join(chunk_errors[:10])  # first 10 errors only
            )
            self._write_error(project_path, error_summary)
        elif chunk_errors:
            logger.warning(f"[Generation] {len(chunk_errors)} chunk(s) failed, {len(qa_results)} QA pairs saved.")
            
        return qa_results

generation_engine = GenerationEngine()
