"""FastAPI main application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import get_settings
from app.database import init_db
from app.routers import auth, students, universities, courses, matching, evaluations, admin

settings = get_settings()

# Create FastAPI application
app = FastAPI(
    title="Course Copilot API",
    description="Two-sided transfer credit evaluation platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
os.makedirs(settings.upload_dir, exist_ok=True)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(students.router, prefix="/api/student", tags=["Student Portal"])
app.include_router(universities.router, prefix="/api/universities", tags=["Universities"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(matching.router, prefix="/api/match", tags=["AI Matching"])
app.include_router(evaluations.router, prefix="/api/evaluations", tags=["Evaluations"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint for health check."""
    return {"message": "Course Copilot API is running", "version": "1.0.0"}


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "course-copilot-api"}
