import re

def clean_text_content(text: str) -> str:
    """
    Normalizes whitespace and removes unwanted artifacts from scraped text.
    """
    if not text:
        return ""
        
    # Remove multiple spaces/newlines
    cleaned = re.sub(r'\n+', '\n', text)
    cleaned = re.sub(r' +', ' ', cleaned)
    
    # Optional: more aggressive regex filtering for tracking params or boilerplate
    return cleaned.strip()

def sanitize_url(url: str) -> str:
    # Removes tracking parameters from URLs
    import urllib.parse
    parsed = urllib.parse.urlparse(url)
    # Rebuild URL without query string
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
