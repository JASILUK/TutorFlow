from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.error_handlers import register_error_handlers
from app.api.v1.router import api_router  # our consolidated v1 endpoints


def create_application() -> FastAPI:
    app = FastAPI(
        title="TutorFlow API",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        debug=settings.DEBUG
    )

    # 1. CORS Configuration
    # 1. CORS Configuration (Supports both explicit origins and dynamic Vercel previews)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Register Global Error Handlers (Unified JSON contract)
    register_error_handlers(app)

    # 3. Register API Routers
    app.include_router(api_router, prefix="/api/v1")

    return app


app = create_application()


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "message": "TutorFlow backend is running",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
    }