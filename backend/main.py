import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from routers import enhance_router, insights_router, styles_router, agents_router
from models import HealthResponse

# Configure loguru
logger.remove()  # Remove default handler
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="DEBUG",
    colorize=True,
)
logger.add(
    "logs/app.log",
    rotation="10 MB",
    retention="7 days",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    level="DEBUG",
)

logger.info("Starting Instagram AI Optimizer API")

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
app.include_router(agents_router)


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
