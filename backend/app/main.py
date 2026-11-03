import sys
import time
from contextlib import asynccontextmanager

# Configure Windows terminal stdout to UTF-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.config import settings
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.middleware.payload_limiter import PayloadSizeLimiterMiddleware

# Import API Routers
from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.orders import router as orders_router
from app.routers.tables import router as tables_router
from app.routers.menu import router as menu_router
from app.routers.service_calls import router as service_calls_router
from app.routers.coupons import router as coupons_router
from app.routers.reports import router as reports_router
from app.routers.qr import router as qr_router
from app.routers.webhooks import router as webhooks_router
from app.routers.audit import router as audit_router
from app.routers.payments import router as payments_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    print("\n======================================================")
    print(">> Atmiya Dosa Hub POS Engine (FastAPI 2.0.0)")
    print(f">> Server running on http://{settings.HOST}:{settings.PORT}")
    print(">> Security Protection Layers: Active (Headers, RateLimiter, PayloadLimiter, CORS)")
    print(f">> Live Supabase Cloud DB: {settings.SUPABASE_URL}")
    print(f">> Environment: {settings.ENVIRONMENT}")
    print(f">> Swagger UI Documentation: http://localhost:{settings.PORT}/docs")
    print("======================================================\n")
    yield
    # Shutdown sequence
    print(">> FastAPI Server gracefully shutting down...")

app = FastAPI(
    title="Atmiya Dosa Hub - POS & Cloud Order Engine",
    description=(
        "Enterprise restaurant management microservice featuring touchless QR code table ordering, "
        "Kitchen Display System (KDS), authoritative server-side billing, live Supabase PostgreSQL sync, "
        "and role-based staff authentication."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# ----------------------------------------------------
# 1. DEFENSE-IN-DEPTH MIDDLEWARES
# ----------------------------------------------------

# 1.1 DDoS & Memory Exhaustion: Reject request payloads > 2MB
app.add_middleware(PayloadSizeLimiterMiddleware, max_bytes=2 * 1024 * 1024)

# 1.2 Enterprise HTTP Security Headers (Helmet equivalent)
app.add_middleware(SecurityHeadersMiddleware)

# 1.3 Sliding-Window Rate Limiter (Brute-Force & Flood Defense with Proxy Support)
app.add_middleware(RateLimiterMiddleware)

# 1.4 Hardened CORS Configuration
if settings.is_production:
    # Production: Restrict to explicit origins + trusted cloud hosting domains
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=r"^https://.*(run\.app|web\.app|firebaseapp\.com|vercel\.app)$",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
else:
    # Development: Allow local network IP testing and localhost
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://.*$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ----------------------------------------------------
# 2. GLOBAL EXCEPTION HANDLER
# ----------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    incident_id = f"ERR_{int(time.time() * 1000)}"
    print(f"💥 [{incident_id}] Uncaught Exception on {request.method} {request.url.path}: {str(exc)}")

    if settings.is_production:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "An internal server error occurred while processing your request.",
                "code": 500,
                "incident_id": incident_id
            }
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": str(exc),
            "type": exc.__class__.__name__,
            "incident_id": incident_id
        }
    )

# ----------------------------------------------------
# 3. API ROUTERS MOUNTING
# ----------------------------------------------------
api_prefix = settings.API_PREFIX
app.include_router(health_router, prefix=api_prefix)
app.include_router(auth_router, prefix=api_prefix)
app.include_router(orders_router, prefix=api_prefix)
app.include_router(tables_router, prefix=api_prefix)
app.include_router(menu_router, prefix=api_prefix)
app.include_router(service_calls_router, prefix=api_prefix)
app.include_router(coupons_router, prefix=api_prefix)
app.include_router(reports_router, prefix=api_prefix)
app.include_router(qr_router, prefix=api_prefix)
app.include_router(webhooks_router, prefix=api_prefix)
app.include_router(audit_router, prefix=api_prefix)
app.include_router(payments_router, prefix=api_prefix)

# ----------------------------------------------------
# 4. STATIC FRONTEND SPA SERVING (PORT 5000 / CLOUD RUN 8080)
# ----------------------------------------------------
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

frontend_dist_candidates = [
    os.environ.get("FRONTEND_DIST"),
    "/app/frontend/dist",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")),
    os.path.join(os.getcwd(), "frontend", "dist")
]
frontend_dist = next((p for p in frontend_dist_candidates if p and os.path.exists(os.path.join(p, "index.html"))), None)

uploads_candidates = [
    os.environ.get("UPLOADS_DIR"),
    "/app/uploads",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "uploads")),
    os.path.join(os.getcwd(), "uploads")
]
uploads_dir = next((p for p in uploads_candidates if p and os.path.exists(p)), None)
if not uploads_dir:
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "uploads"))
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

if frontend_dist and os.path.exists(os.path.join(frontend_dist, "index.html")):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path in ["docs", "redoc", "openapi.json"]:
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/", include_in_schema=False)
    async def root_redirect():
        """Redirect root path to interactive Swagger API documentation if dist is missing."""
        return RedirectResponse(url="/docs")
