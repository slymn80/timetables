"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from .config import settings
from .database import init_db, close_db
from .routes import schools, teachers, classes, subjects, rooms, time_slots, time_slot_templates, lessons, lesson_groups, timetables, academic_years, holidays, rollover


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    print("Starting Timetable Scheduler API...")
    await init_db()  # Create database tables
    print("Database connected")

    yield

    # Shutdown
    print("Shutting down...")
    await close_db()
    print("Database connections closed")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.API_VERSION,
    description="Advanced timetable scheduling system with multiple algorithm support",
    lifespan=lifespan,
)

# CORS middleware - TEMPORARILY ALLOW ALL ORIGINS FOR TESTING
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins temporarily
    allow_credentials=False,  # Must be False when allow_origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Timetable Scheduler API",
        "version": settings.API_VERSION,
        "status": "operational",
        "docs": "/docs",
    }


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.API_VERSION
    }


# Include routers
app.include_router(schools.router, prefix="/api/v1/schools", tags=["Schools"])
app.include_router(academic_years.router, prefix="/api/v1/academic-years", tags=["Academic Years"])
app.include_router(holidays.router, prefix="/api/v1/holidays", tags=["Holidays"])
app.include_router(rollover.router, prefix="/api/v1", tags=["Year Rollover"])
app.include_router(teachers.router, prefix="/api/v1/teachers", tags=["Teachers"])
app.include_router(classes.router, prefix="/api/v1/classes", tags=["Classes"])
app.include_router(subjects.router, prefix="/api/v1/subjects", tags=["Subjects"])
app.include_router(rooms.router, prefix="/api/v1/rooms", tags=["Rooms"])
app.include_router(time_slots.router, prefix="/api/v1/time-slots", tags=["Time Slots"])
app.include_router(time_slot_templates.router, prefix="/api/v1/time-slot-templates", tags=["Time Slot Templates"])
app.include_router(lessons.router, prefix="/api/v1/lessons", tags=["Lessons"])
app.include_router(lesson_groups.router, prefix="/api/v1/lesson-groups", tags=["Lesson Groups"])
app.include_router(timetables.router, prefix="/api/v1/timetables", tags=["Timetables"])


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Handle 404 errors"""
    return JSONResponse(
        status_code=404,
        content={"detail": "Resource not found"}
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Handle 500 errors"""
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD
    )
