from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.routers import auth, students, uploads, evaluations, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events"""
    # Startup
    print("Starting Course Copilot API...")
    init_db()
    print("Database initialized")
    yield
    # Shutdown
    print("Shutting down Course Copilot API...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Transfer Credit Evaluation Platform - Automates university transfer credit evaluation using AI",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:5173",  # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(uploads.router)
app.include_router(evaluations.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Railway"""
    return {"status": "healthy"}


@app.get("/api/info")
async def api_info():
    """API information endpoint"""
    return {
        "name": settings.APP_NAME,
        "description": "Transfer Credit Evaluation Platform API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "student": "/api/student",
            "evaluator": "/api/evaluator",
            "admin": "/api/admin"
        }
    }
