from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

class PayloadSizeLimiterMiddleware(BaseHTTPMiddleware):
    """
    DDoS & Memory Exhaustion Protection:
    Rejects incoming request bodies that exceed max_bytes (default: 2MB).
    Essential for containerized deployments like Google Cloud Run with strict memory limits.
    """
    def __init__(self, app, max_bytes: int = 2 * 1024 * 1024):
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length = int(content_length)
                if length > self.max_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "error": "Payload Too Large",
                            "message": f"Request body exceeds the maximum permitted size of {self.max_bytes // (1024 * 1024)}MB."
                        }
                    )
            except ValueError:
                pass

        return await call_next(request)
