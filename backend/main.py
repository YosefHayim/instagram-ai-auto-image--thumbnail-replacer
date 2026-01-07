from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import enhance_router, insights_router, styles_router
from .models import HealthResponse

app = FastAPI(
    title="Instagram AI Optimizer API",
    description="AI-powered image enhancement and creator insights for Instagram",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://*",
        "http://localhost:*",
        "https://www.instagram.com",
        "https://instagram.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(enhance_router)
app.include_router(insights_router)
app.include_router(styles_router)


@app.get("/", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        services={
            "image_processing": "operational",
            "style_engine": "operational",
            "insights_generator": "operational",
        },
    )


@app.get("/api/health", response_model=HealthResponse)
async def api_health():
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        services={
            "image_processing": "operational",
            "style_engine": "operational",
            "insights_generator": "operational",
        },
    )
