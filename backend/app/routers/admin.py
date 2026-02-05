"""Admin router for system administration."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.university import University
from app.models.course import Course
from app.models.submission import StudentSubmission, SubmissionStatus
from app.models.evaluation import Evaluation, EvaluationDecision
from app.utils.auth import get_current_user, require_roles, get_password_hash

router = APIRouter()


# Pydantic schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: UserRole
    university_id: Optional[int] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    university_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: UserRole
    university_id: Optional[int]
    is_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/analytics")
async def get_analytics(
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN, UserRole.UNIVERSITY_ADMIN)),
    db: Session = Depends(get_db)
):
    """Get system analytics and statistics."""
    # User counts
    total_users = db.query(User).count()
    students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    professors = db.query(User).filter(User.role == UserRole.PROFESSOR).count()
    evaluators = db.query(User).filter(User.role == UserRole.EVALUATOR).count()
    admins = db.query(User).filter(User.role.in_([UserRole.UNIVERSITY_ADMIN, UserRole.SYSTEM_ADMIN])).count()
    
    # University and course counts
    universities = db.query(University).filter(University.is_active == True).count()
    courses = db.query(Course).filter(Course.is_active == True).count()
    
    # Submission stats
    total_submissions = db.query(StudentSubmission).count()
    pending = db.query(StudentSubmission).filter(
        StudentSubmission.status.in_([SubmissionStatus.PENDING, SubmissionStatus.IN_REVIEW, SubmissionStatus.PROCESSING])
    ).count()
    completed = db.query(StudentSubmission).filter(
        StudentSubmission.status == SubmissionStatus.COMPLETED
    ).count()
    
    # Evaluation stats
    total_evaluations = db.query(Evaluation).count()
    approved = db.query(Evaluation).filter(Evaluation.decision == EvaluationDecision.APPROVED).count()
    denied = db.query(Evaluation).filter(Evaluation.decision == EvaluationDecision.DENIED).count()
    
    return {
        "users": {
            "total": total_users,
            "students": students,
            "professors": professors,
            "evaluators": evaluators,
            "admins": admins
        },
        "content": {
            "universities": universities,
            "courses": courses
        },
        "submissions": {
            "total": total_submissions,
            "pending": pending,
            "completed": completed
        },
        "evaluations": {
            "total": total_evaluations,
            "approved": approved,
            "denied": denied,
            "approval_rate": round((approved / total_evaluations * 100), 1) if total_evaluations > 0 else 0
        }
    }


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[UserRole] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db)
):
    """List all users (admin only)."""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    
    users = query.offset(skip).limit(limit).all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db)
):
    """Create a new user (admin only)."""
    # Check if email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        university_id=user_data.university_id,
        is_verified=True  # Admin-created users are pre-verified
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db)
):
    """Update a user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a user."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = False
    db.commit()
    
    return {"message": "User deactivated successfully"}


@router.get("/submissions", response_model=List[dict])
async def list_all_submissions(
    status: Optional[SubmissionStatus] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN, UserRole.UNIVERSITY_ADMIN)),
    db: Session = Depends(get_db)
):
    """List all submissions (admin only)."""
    query = db.query(StudentSubmission)
    
    if status:
        query = query.filter(StudentSubmission.status == status)
    
    if current_user.role == UserRole.UNIVERSITY_ADMIN and current_user.university_id:
        query = query.filter(StudentSubmission.target_university_id == current_user.university_id)
    
    submissions = query.order_by(StudentSubmission.created_at.desc()).offset(skip).limit(limit).all()
    
    results = []
    for s in submissions:
        results.append({
            "id": s.id,
            "student_email": s.student.email if s.student else None,
            "target_university": s.target_university.name if s.target_university else None,
            "status": s.status.value,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "courses_count": len(s.transfer_courses)
        })
    
    return results
