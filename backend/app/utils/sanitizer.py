import html
import re
from typing import Any, Dict, List, Union

# Pattern to strip dangerous tags and script injections
DANGEROUS_PATTERNS = re.compile(
    r"(<script.*?>.*?</script>|<iframe.*?>.*?</iframe>|javascript:|onload=|onerror=|onclick=)",
    re.IGNORECASE | re.DOTALL
)

def sanitize_string(val: str, max_length: int = 1000) -> str:
    """
    Sanitize a user-provided string:
    - Strips leading/trailing whitespace
    - Removes null bytes
    - Strips dangerous HTML/script tags
    - Escapes remaining special HTML characters
    - Truncates to max_length
    """
    if not isinstance(val, str):
        return ""
    # Strip null bytes
    cleaned = val.replace("\x00", "").strip()
    # Strip malicious scripts/events
    cleaned = DANGEROUS_PATTERNS.sub("", cleaned)
    # Truncate
    cleaned = cleaned[:max_length]
    # Escape HTML entities
    return html.escape(cleaned)

def sanitize_payload(data: Union[Dict, List, str, Any]) -> Any:
    """
    Recursively sanitize dictionaries, lists, and strings in request payloads.
    """
    if isinstance(data, dict):
        return {k: sanitize_payload(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_payload(item) for item in data]
    elif isinstance(data, str):
        return sanitize_string(data)
    return data
