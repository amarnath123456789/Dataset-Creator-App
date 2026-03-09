import asyncio
import uuid
import logging
import os
import json
import aiohttp
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, HttpUrl
from ddgs import DDGS
from urllib.parse import urlparse

from backend.utils.security import is_safe_url
from backend.engines.scraping.text_scraper import fetch_html, extract_article, extract_links, compute_relevance_score
from backend.engines.scraping.image_scraper import extract_image_urls, download_image
from backend.engines.processing.cleaner import clean_text_content, sanitize_url
from backend.engines.processing.deduplicator import get_text_hash, is_near_duplicate
from backend.engines.labeling.auto_labeler import auto_label_content
from backend.utils.filesystem import save_raw_text, get_project_path

logger = logging.getLogger(__name__)

# State of all scraping jobs
# Key: task_id, Value: status details
active_scraping_jobs: Dict[str, Dict[str, Any]] = {}

class ScrapeRequest(BaseModel):
    project_name: str
    urls: List[str] = []
    query: Optional[str] = None
    category: Optional[str] = None
    max_depth: int = 1
    max_pages: int = 50
    domain_restricted: bool = True
    relevance_threshold: float = 0.0
    extract_images: bool = True
    extract_text: bool = True
    strict_robots: bool = True
    rate_limit_delay: float = 1.0

def search_query_urls(query: str, max_results: int = 3) -> List[str]:
    urls = []
    try:
        with DDGS() as ddgs:
            results = ddgs.text(query, max_results=max_results)
            for r in results:
                urls.append(r.get('href'))
    except Exception as e:
        logger.error(f"Failed to search web for query '{query}': {e}")
    return urls

async def process_scrape_task(task_id: str, request: ScrapeRequest):
    """
    Background worker function that runs the scraping pipeline.
    """
    job_state = active_scraping_jobs[task_id]
    job_state["status"] = "running"
    
    # Ensure dataset dirs exist inside the correct global project directory
    project_dir = str(get_project_path(request.project_name))
    scraped_dir = os.path.join(project_dir, "scraped")
    text_dir = os.path.join(scraped_dir, "text")
    image_dir = os.path.join(scraped_dir, "images")
    
    os.makedirs(text_dir, exist_ok=True)
    os.makedirs(image_dir, exist_ok=True)

    seen_hashes = set()
    # Pre-populate hashes to avoid duplicate writes if scraper is run multiple times
    # NOTE: To deduplicate properly, we simply assume filenames like `doc_<TEXT_HASH>.json`
    # However, since previous implementation used `doc_<text_hash[:8]}.json`, we will track what we have saved
    # by parsing the file contents OR relaxing the check. For the easiest fix: We will track the full text hash
    # of any files saved during THIS RUN, and for old files, we assume the prefix is enough to block it.
    
    seen_hash_prefixes = set()
    for f in os.listdir(text_dir):
        if f.endswith('.json') and f.startswith('doc_'):
             # e.g., doc_abcd1234.json -> abcd1234
            seen_hash_prefixes.add(f.replace('doc_', '').replace('.json', ''))

    try:
        urls_to_scrape = [sanitize_url(u) for u in request.urls if is_safe_url(u)]
        
        # If query or category, use search integrations
        if request.query:
            job_state["logs"].append(f"Searching web for: {request.query}")
            search_urls = await asyncio.to_thread(search_query_urls, request.query, 3)
            urls_to_scrape.extend(search_urls)
            job_state["logs"].append(f"Found {len(search_urls)} links from search.")
            
        if request.category:
            job_state["logs"].append(f"Searching web for category: {request.category}")
            search_urls = await asyncio.to_thread(search_query_urls, request.category + " articles", 3)
            urls_to_scrape.extend(search_urls)
            job_state["logs"].append(f"Found {len(search_urls)} links for category.")
            
        # Remove duplicates from URL list
        urls_to_scrape = list(dict.fromkeys(urls_to_scrape))
        
        if len(urls_to_scrape) == 0:
            job_state["status"] = "completed"
            job_state["logs"].append("No valid URLs found to scrape.")
            return

        # Extract keywords for scoring
        query_tokens = []
        if request.query:
            query_tokens.extend(request.query.split())
        if request.category:
            query_tokens.extend(request.category.split())

        # Establish seed domains
        seed_domains = set()
        for u in urls_to_scrape:
            parsed = urlparse(u)
            if parsed.netloc:
                seed_domains.add(parsed.netloc)

        # Initialize Priority Queue: items are (priority, depth, url)
        # We use negative score because PriorityQueue extracts lowest first
        queue = asyncio.PriorityQueue()
        for u in urls_to_scrape:
            queue.put_nowait((0.0, 0, u))
            
        visited_urls = set()
        seen_vectors = []
        crawl_graph = []
        combined_run_text = ""
        downloaded_pages = 0

        async with aiohttp.ClientSession() as session:
            while not queue.empty() and downloaded_pages < request.max_pages:
                if job_state.get("is_cancelled", False):
                    job_state["status"] = "cancelled"
                    break
                    
                score_inv, depth, url = await queue.get()
                
                if url in visited_urls:
                    continue
                visited_urls.add(url)
                
                job_state["current_url"] = url
                job_state["progress"] = min((downloaded_pages / max(1, request.max_pages)) * 100, 99.0)
                job_state["total_urls"] = len(visited_urls) + queue.qsize()
                
                job_state["logs"].append(f"[{datetime.now().time()}] Fetching (score={abs(score_inv)}): {url}")
                
                try:
                    html_content = await fetch_html(url, session)
                    if not html_content:
                        job_state["logs"].append(f"Failed to retrieve HTML for {url}")
                        continue
                    
                    job_state["logs"].append(f"Successfully fetched HTML. Extracting content...")
                    
                    article_data = extract_article(html_content, url)
                    title = article_data.get('title', '')
                    raw_text = ""
                    if article_data and article_data.get('text'):
                        raw_text = clean_text_content(article_data['text'])
                        
                    # Heuristic Scoring
                    score = compute_relevance_score(raw_text, title, url, query_tokens)
                    if score < request.relevance_threshold:
                         job_state["dropped_items"] += 1
                         job_state["logs"].append(f"Dropped {url} below threshold ({score} < {request.relevance_threshold})")
                         continue
                         
                    # Extract Links if we can go deeper
                    if depth < request.max_depth:
                        links = extract_links(html_content, url)
                        for link in links:
                            if request.domain_restricted:
                                link_domain = urlparse(link).netloc
                                if link_domain not in seed_domains:
                                    continue
                            if link not in visited_urls:
                                # We assign a rough priority inherited from parent, minus depth penalty
                                queue.put_nowait((-score + (depth * 0.5), depth + 1, link))
                    
                    doc_status = "dropped"
                    
                    if request.extract_text and raw_text:
                        # Full 64-char hash
                        text_hash = get_text_hash(raw_text)
                        hash_prefix = text_hash[:8]
                        
                        # Check against BOTH lists (full hashes of new things, prefixes of old things)
                        if text_hash not in seen_hashes and hash_prefix not in seen_hash_prefixes and not is_near_duplicate(raw_text, seen_vectors):
                            seen_hashes.add(text_hash)
                            seen_hash_prefixes.add(hash_prefix)
                            doc_status = "scraped"
                            
                            # LLM auto-labeling
                            labels = await auto_label_content(raw_text)
                            article_data['metadata'] = labels
                            article_data['cleaned_text'] = raw_text
                            
                            # Save to scraped JSON collection
                            base_name = f"doc_{text_hash[:8]}"
                            json_path = os.path.join(text_dir, f"{base_name}.json")
                            with open(json_path, 'w', encoding='utf-8') as f:
                                json.dump(article_data, f, indent=2)
                            
                            # Append to memory buffer so we can write it to raw.txt at the end
                            combined_run_text += f"{title}\n\n{raw_text}\n\n========================\n\n"
                                
                            job_state["logs"].append(f"Saved text document -> {base_name}.json")
                            job_state["downloaded_items"] += 1
                        else:
                            doc_status = "duplicate"
                            job_state["duplicates_found"] += 1
                            job_state["logs"].append(f"Ignored duplicate or near-duplicate content from {url}")

                    crawl_graph.append({
                        "url": url,
                        "depth": depth,
                        "score": score,
                        "status": doc_status
                    })

                    if request.extract_images:
                        images = extract_image_urls(html_content, url)
                        job_state["logs"].append(f"Found {len(images)} images.")
                        for img in images:
                            if job_state.get("is_cancelled", False): break
                            
                            try:
                                saved_path = await download_image(img['url'], image_dir, session)
                                if saved_path:
                                    job_state["downloaded_items"] += 1
                                    job_state["logs"].append(f"Downloaded image: {os.path.basename(saved_path)}")
                            except Exception as e:
                                pass
                                
                    downloaded_pages += 1
                except Exception as e:
                    job_state["logs"].append(f"Error extracting {url}: {e}")
                
                # Rate limit delay
                await asyncio.sleep(request.rate_limit_delay)
        
        # Finally, append the successfully scraped buffer into the single raw.txt for the project pipeline
        if combined_run_text:
            raw_txt_path = get_project_path(request.project_name) / "raw.txt"
            mode = "a" if raw_txt_path.exists() else "w"
            with open(raw_txt_path, mode, encoding="utf-8") as f:
                f.write(combined_run_text)
            job_state["logs"].append("Pipeline Data Integration: Appended data to raw.txt")
            
        # Write crawl graph report
        if len(crawl_graph) > 0:
            graph_path = os.path.join(scraped_dir, "crawl_graph.json")
            with open(graph_path, "w", encoding="utf-8") as f:
                json.dump(crawl_graph, f, indent=2)
            job_state["logs"].append(f"Crawl graph generated with {len(crawl_graph)} edges.")
                
        if job_state["status"] == "running":
            job_state["status"] = "completed"
            job_state["progress"] = 100.0
            job_state["logs"].append("Scraping completed successfully.")
            
    except Exception as e:
        job_state["status"] = "failed"
        job_state["error"] = str(e)
        job_state["logs"].append(f"Error: {e}")
        logger.error(f"Scrape task {task_id} failed: {e}")

class ScrapingManager:
    """
    Singleton to manage backgrounds async scraping tasks internal to the app.
    """
    def __init__(self):
        self.jobs = active_scraping_jobs
        
    def start_job(self, request: ScrapeRequest) -> str:
        task_id = str(uuid.uuid4())
        self.jobs[task_id] = {
            "id": task_id,
            "project_name": request.project_name,
            "status": "queued",
            "progress": 0.0,
            "downloaded_items": 0,
            "duplicates_found": 0,
            "dropped_items": 0,
            "logs": [],
            "error": None,
            "current_url": None,
            "is_cancelled": False,
            "start_time": datetime.utcnow().isoformat()
        }
        
        # Submit to internal event loop via asyncio.create_task
        asyncio.create_task(process_scrape_task(task_id, request))
        return task_id
        
    def get_job_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        return self.jobs.get(task_id)
        
    def cancel_job(self, task_id: str):
        if task_id in self.jobs:
            self.jobs[task_id]["is_cancelled"] = True
            
manager = ScrapingManager()
