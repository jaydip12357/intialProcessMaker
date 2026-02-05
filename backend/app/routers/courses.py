"""Courses router for managing university course catalogs."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import pandas as pd
import io

from app.database import get_db
from app.models.user import User, UserRole
from app.models.university import University
from app.models.course import Course, CourseLevel
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


# Pydantic schemas
class CourseCreate(BaseModel):
    university_id: int
    code: str
    name: str
    department: Optional[str] = None
    credits: float = 3.0
    level: Optional[CourseLevel] = CourseLevel.UNDERGRADUATE
    description: Optional[str] = None
    learning_outcomes: Optional[str] = None
    prerequisites: Optional[str] = None


class CourseUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    department: Optional[str] = None
    credits: Optional[float] = None
    level: Optional[CourseLevel] = None
    description: Optional[str] = None
    learning_outcomes: Optional[str] = None
    prerequisites: Optional[str] = None


class CourseResponse(BaseModel):
    id: int
    university_id: int
    code: str
    name: str
    department: Optional[str]
    credits: float
    level: CourseLevel
    description: Optional[str]
    learning_outcomes: Optional[str]
    prerequisites: Optional[str]
    syllabus_file_path: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=CourseResponse)
async def create_course(
    course_data: CourseCreate,
    current_user: User = Depends(require_roles(UserRole.UNIVERSITY_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.PROFESSOR)),
    db: Session = Depends(get_db)
):
    """Add a single course to the catalog."""
    # Verify university exists
    university = db.query(University).filter(University.id == course_data.university_id).first()
    if not university:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="University not found"
        )
    
    # Check for authorization (professors only for their university)
    if current_user.role == UserRole.PROFESSOR and current_user.university_id != course_data.university_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add courses to your own university"
        )
    
    # Check for duplicate course code
    existing = db.query(Course).filter(
        Course.university_id == course_data.university_id,
        Course.code == course_data.code
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Course with code {course_data.code} already exists"
        )
    
    course = Course(
        university_id=course_data.university_id,
        professor_id=current_user.id if current_user.role == UserRole.PROFESSOR else None,
        code=course_data.code,
        name=course_data.name,
        department=course_data.department,
        credits=course_data.credits,
        level=course_data.level,
        description=course_data.description,
        learning_outcomes=course_data.learning_outcomes,
        prerequisites=course_data.prerequisites
    )
    
    db.add(course)
    db.commit()
    db.refresh(course)
    
    return CourseResponse.model_validate(course)


@router.post("/bulk")
async def bulk_upload_courses(
    file: UploadFile = File(...),
    university_id: int = None,
    current_user: User = Depends(require_roles(UserRole.UNIVERSITY_ADMIN, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db)
):
    """Bulk upload courses from CSV/Excel file."""
    if not university_id:
        if current_user.university_id:
            university_id = current_user.university_id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please specify a university_id"
            )
    
    # Verify university exists
    university = db.query(University).filter(University.id == university_id).first()
    if not university:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="University not found"
        )
    
    # Read file
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CSV and Excel files are supported"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file: {str(e)}"
        )
    
    # Required columns
    required_columns = ['course_code', 'course_name']
    for col in required_columns:
        if col not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required column: {col}"
            )
    
    # Process rows
    created = 0
    skipped = 0
    errors = []
    
    for index, row in df.iterrows():
        try:
            # Check if course already exists
            existing = db.query(Course).filter(
                Course.university_id == university_id,
                Course.code == row['course_code']
            ).first()
            
            if existing:
                skipped += 1
                continue
            
            # Map level
            level = CourseLevel.UNDERGRADUATE
            if 'course_level' in df.columns and pd.notna(row.get('course_level')):
                level_str = str(row['course_level']).lower()
                if 'graduate' in level_str:
                    level = CourseLevel.GRADUATE
                elif 'doctoral' in level_str or 'phd' in level_str:
                    level = CourseLevel.DOCTORAL
            
            course = Course(
                university_id=university_id,
                code=row['course_code'],
                name=row['course_name'],
                department=row.get('department') if pd.notna(row.get('department')) else None,
                credits=float(row.get('credits', 3.0)) if pd.notna(row.get('credits')) else 3.0,
                level=level,
                description=row.get('description') if pd.notna(row.get('description')) else None,
                learning_outcomes=row.get('learning_outcomes') if pd.notna(row.get('learning_outcomes')) else None,
                prerequisites=row.get('prerequisites') if pd.notna(row.get('prerequisites')) else None
            )
            
            db.add(course)
            created += 1
            
        except Exception as e:
            errors.append(f"Row {index + 2}: {str(e)}")
    
    db.commit()
    
    return {
        "message": "Bulk upload completed",
        "created": created,
        "skipped": skipped,
        "errors": errors[:10]  # Limit errors shown
    }


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific course."""
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.is_active == True
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    return CourseResponse.model_validate(course)


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course_data: CourseUpdate,
    current_user: User = Depends(require_roles(UserRole.UNIVERSITY_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.PROFESSOR)),
    db: Session = Depends(get_db)
):
    """Update a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check authorization for professors
    if current_user.role == UserRole.PROFESSOR:
        if course.professor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own courses"
            )
    
    # Update fields
    update_data = course_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)
    
    db.commit()
    db.refresh(course)
    
    return CourseResponse.model_validate(course)


@router.delete("/{course_id}")
async def delete_course(
    course_id: int,
    current_user: User = Depends(require_roles(UserRole.UNIVERSITY_ADMIN, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course.is_active = False
    db.commit()
    
    return {"message": "Course deleted successfully"}
