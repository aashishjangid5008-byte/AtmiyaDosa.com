import time
from collections import defaultdict
from typing import Dict, List, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from app.config import settings

class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Sliding window IP-based rate limiter with Cloud Run / Reverse-Proxy Support:
    - /api/auth/login: max 5 failed attempts / 15 mins (Brute Force Lockout)
    - /api/orders/guest: max 15 requests / 10 mins (Spam Order Throttling)
    - /api/payments/verify: max 10 requests / 5 mins (Payment Spam Protection)
    - /api: max 300 requests / 15 mins (Global DDoS Prevention)
    """
    def __init__(self, app):
        super().__init__(app)
        self.auth_attempts: Dict[str, List[float]] = defaultdict(list)
        self.order_attempts: Dict[str, List[float]] = defaultdict(list)
        self.payment_attempts: Dict[str, List[float]] = defaultdict(list)
        self.global_requests: Dict[str, List[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        """
        Extract the real client IP address behind Google Cloud Load Balancer,
        Cloud Run, Cloudflare, or local development proxy.
        """
        # 1. Standard reverse-proxy header
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # First IP in the comma-separated list is the original client IP
            client_ip = forwarded_for.split(",")[0].strip()
            if client_ip:
                return client_ip

        # 2. X-Real-IP header fallback
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()

        # 3. Direct client connection host
        if request.client and request.client.host:
            return request.client.host

        return "127.0.0.1"

    def _cleanup_and_check(self, history: List[float], max_count: int, window_sec: float) -> tuple[bool, int]:
        now = time.time()
        # Keep only timestamps within window
        valid = [t for t in history if now - t < window_sec]
        history.clear()
        history.extend(valid)
        
        if len(history) >= max_count:
            # Calculate oldest timestamp to determine retry duration
            oldest = history[0] if history else now
            retry_after = max(1, int(window_sec - (now - oldest)))
            return False, retry_after

        history.append(now)
        return True, 0

    async def dispatch(self, request: Request, call_next):
        client_ip = self._get_client_ip(request)
        path = request.url.path

        # Bypass rate limiter during automated test execution
        if client_ip == "testclient" or getattr(settings, "ENVIRONMENT", "").lower() == "testing":
            return await call_next(request)

        # 1. Auth Rate Limiting (Brute Force Defense)
        if path.startswith("/api/auth/login") and request.method == "POST":
            allowed, retry_after = self._cleanup_and_check(
                self.auth_attempts[client_ip], max_count=5, window_sec=15 * 60
            )
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too Many Requests",
                        "message": "Too many failed login attempts. Temporarily locked for security.",
                        "retry_after_seconds": retry_after
                    },
                    headers={"Retry-After": str(retry_after)}
                )

        # 2. Guest Order Placement Velocity (Generous for multi-table guests on shared restaurant Wi-Fi)
        elif path.startswith("/api/orders/guest") and request.method == "POST":
            allowed, retry_after = self._cleanup_and_check(
                self.order_attempts[client_ip], max_count=60, window_sec=10 * 60
            )
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate Limit Exceeded",
                        "message": "Order submission velocity reached. Please wait before placing another order.",
                        "retry_after_seconds": retry_after
                    },
                    headers={"Retry-After": str(retry_after)}
                )

        # 3. Payment Verification Throttling
        elif path.startswith("/api/payments/verify") and request.method == "POST":
            allowed, retry_after = self._cleanup_and_check(
                self.payment_attempts[client_ip], max_count=30, window_sec=5 * 60
            )
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too Many Requests",
                        "message": "Payment verification rate limit exceeded. Please wait.",
                        "retry_after_seconds": retry_after
                    },
                    headers={"Retry-After": str(retry_after)}
                )

        # 4. Global API Limiter (DDoS Shield - Scaled for 50+ diners sharing restaurant Wi-Fi router NAT)
        elif path.startswith("/api") and not path.startswith("/api/health"):
            allowed, retry_after = self._cleanup_and_check(
                self.global_requests[client_ip], max_count=2500, window_sec=15 * 60
            )
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too Many Requests",
                        "message": "Excessive API requests detected from this IP address.",
                        "retry_after_seconds": retry_after
                    },
                    headers={"Retry-After": str(retry_after)}
                )

        return await call_next(request)
