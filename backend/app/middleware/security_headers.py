from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.config import settings

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Enterprise-grade HTTP security headers middleware (Helmet equivalent):
    - Strict Content Security Policy
    - MIME type sniffing prevention (X-Content-Type-Options: nosniff)
    - Clickjacking protection (X-Frame-Options: DENY)
    - HSTS for production HTTPS
    - Referrer & Permissions isolation
    - Conceal backend framework identifiers
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # 1. Prevent MIME-sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # 2. Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # 3. Restrict browser referrers
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 4. Device and Hardware Isolation Policy
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), usb=(), interest-cohort=()"
        )

        # 5. Isolation from external window contexts
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"

        # 6. Content Security Policy (Allows Swagger UI & APIs)
        if request.url.path.startswith("/docs") or request.url.path.startswith("/redoc"):
            # Permissive CSP for OpenAPI documentation pages
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https: blob:; "
                "frame-ancestors 'none';"
            )
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net blob:; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; "
                "font-src 'self' https://fonts.gstatic.com data:; "
                "img-src 'self' data: https: http: blob:; "
                "worker-src 'self' blob:; "
                "connect-src 'self' https://* http://* wss://* ws://*; "
                "frame-ancestors 'none';"
            )

        # 7. Strict-Transport-Security (HSTS) in production
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # 8. Strip revealing server fingerprint headers
        if "server" in response.headers:
            del response.headers["server"]
        if "x-powered-by" in response.headers:
            del response.headers["x-powered-by"]

        return response
