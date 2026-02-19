import re
from collections import Counter

class CleaningEngine:
    def process(self, text: str) -> str:
        # Initial normalize
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        lines = text.split('\n')
        
        # 1. Remove Page Numbers (standalone digits)
        # Regex: optional whitespace, one or more digits, optional whitespace, end of line
        lines = [line for line in lines if not re.match(r'^\s*\d+\s*$', line)]
        
        # 2. Remove Repeated Headers
        # Heuristic: Identify lines that appear frequently (e.g., > 3 times) and are likely headers/footers
        # We only look at lines that are somewhat short (< 10 words) to avoid removing recurring long sentences
        stripped_lines = [l.strip() for l in lines if l.strip()]
        if stripped_lines:
            line_counts = Counter(stripped_lines)
            # Threshold: repeated more than max(3, 5% of total lines) - logic can be tuned
            # For this MVP, let's hardcode > 3 repetitions for non-empty lines
            repeated_headers = {line for line, count in line_counts.items() if count > 3 and len(line.split()) < 10}
            lines = [line for line in lines if line.strip() not in repeated_headers]
            
        cleaned_lines = []
        for line in lines:
            original_line = line
            line = line.strip()
            
            # 4. Artifact Removal
            # Remove non-printable characters (keep ASCII + common unicode)
            # This regex keeps printable characters. We might want to be more permissive for unicode text.
            # But prompt says "Remove broken characters". Let's stick to simple ASCII + basic latin for now
            # or just remove specific control chars.
            # Let's remove non-printable chars except newlines/tabs
            line = "".join(ch for ch in line if ch.isprintable())
            
            # 5. Bullet Normalization
            # Change •, -, * at start to "* "
            if re.match(r'^[\u2022\-\*]\s+', line):
                line = re.sub(r'^[\u2022\-\*]\s+', '* ', line)
                
            # 6. Noise Filtering
            # Remove lines < 3 words. 
            # Protect bullet points? Prompt didn't specify. Assuming "noise" means garbage text.
            words = line.split()
            if len(words) < 3:
                # Optional: Protect headings? (Usually headings are short but important)
                # Strict prompt: "Remove extremely short lines that contain fewer than 3 words"
                # I will follow strict prompt.
                continue
                
            cleaned_lines.append(line)
            
        text = '\n'.join(cleaned_lines)
        
        # 3. Normalize Whitespace
        # Collapse multiple spaces
        text = re.sub(r'[ \t]+', ' ', text)
        # Collapse multiple newlines (max 2)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text.strip()

cleaning_engine = CleaningEngine()
