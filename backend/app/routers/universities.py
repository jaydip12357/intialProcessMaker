"""Universities router for listing and managing universities."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.university import University
from app.models.course import Course
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


# Pydantic schemas
class UniversityCreate(BaseModel):
    name: str
    domain: str
    description: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None


class UniversityResponse(BaseModel):
    id: int
    name: str
    domain: str
    description: Optional[str]
    location: Optional[str]
    website: Optional[str]
    logo_url: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CourseResponse(BaseModel):
    id: int
    code: str
    name: str
    department: Optional[str]
    credits: float
    description: Optional[str]
    learning_outcomes: Optional[str]
    prerequisites: Optional[str]

    class Config:
        from_attributes = True


@router.get("", response_model=List[UniversityResponse])
async def list_universities(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """List all universities (public endpoint)."""
    universities = db.query(University).filter(
        University.is_active == True
    ).offset(skip).limit(limit).all()
    
    return [UniversityResponse.model_validate(u) for u in universities]


@router.get("/{university_id}", response_model=UniversityResponse)
async def get_university(
    university_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific university."""
    university = db.query(University).filter(
        University.id == university_id,
        University.is_active == True
    ).first()
    
    if not university:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="University not found"
        )
    
    return UniversityResponse.model_validate(university)


@router.get("/{university_id}/courses", response_model=List[CourseResponse])
async def get_university_courses(
    university_id: int,
    db: Session = Depends(get_db),
    department: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get all courses for a university."""
    query = db.query(Course).filter(
        Course.university_id == university_id,
        Course.is_active == True
    )
    
    if department:
        query = query.filter(Course.department == department)
    
    courses = query.offset(skip).limit(limit).all()
    
    return [CourseResponse.model_validate(c) for c in courses]


@router.post("", response_model=UniversityResponse)
async def create_university(
    university_data: UniversityCreate,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db)
):
    """Create a new university (admin only)."""
    # Check if domain already exists
    existing = db.query(University).filter(University.domain == university_data.domain).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="University with this domain already exists"
        )
    
    university = University(
        name=university_data.name,
        domain=university_data.domain,
        description=university_data.description,
        location=university_data.location,
        website=university_data.website
    )
    
    db.add(university)
    db.commit()
    db.refresh(university)
    
    return UniversityResponse.model_validate(university)
