from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import csv
import io

from app.database import get_db
from app.models.user import User, UserRole
from app.models.submission import Submission, SubmissionStatus
from app.models.course import ExtractedCourse, TargetCourse, CourseMatch
from app.models.evaluation import Evaluation, EvaluationDecision
from app.utils.auth import get_current_user, require_admin, get_password_hash

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# Pydantic schemas
class TargetCourseCreate(BaseModel):
    course_code: str
    course_name: str
    department: Optional[str] = None
    credits: Optional[float] = None
    description: Optional[str] = None
    prerequisites: Optional[str] = None
    learning_outcomes: Optional[str] = None
    course_level: Optional[str] = "undergraduate"


class TargetCourseUpdate(BaseModel):
    course_name: Optional[str] = None
    department: Optional[str] = None
    credits: Optional[float] = None
    description: Optional[str] = None
    prerequisites: Optional[str] = None
    learning_outcomes: Optional[str] = None
    course_level: Optional[str] = None
    is_active: Optional[int] = None


class TargetCourseResponse(BaseModel):
    id: int
    course_code: str
    course_name: str
    department: Optional[str]
    credits: Optional[float]
    description: Optional[str]
    prerequisites: Optional[str]
    learning_outcomes: Optional[str]
    course_level: Optional[str]
    is_active: int

    class Config:
        from_attributes = True


class UserManageCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserManageUpdate(BaseModel):
    role: Optional[UserRole] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserManageResponse(BaseModel):
    id: int
    email: str
    role: str
    first_name: Optional[str]
    last_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AnalyticsResponse(BaseModel):
    total_students: int
    total_evaluators: int
    total_submissions: int
    pending_submissions: int
    completed_submissions: int
    total_courses_evaluated: int
    approval_rate: float
    avg_processing_time_hours: Optional[float]
    submissions_by_status: dict
    evaluations_by_decision: dict
    recent_activity: List[dict]


@router.get("/target-courses", response_model=List[TargetCourseResponse])
async def get_target_courses(
    active_only: bool = False,
    department: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all target courses in the catalog"""
    query = db.query(TargetCourse)

    if active_only:
        query = query.filter(TargetCourse.is_active == 1)

    if department:
        query = query.filter(TargetCourse.department == department)

    courses = query.order_by(TargetCourse.course_code).all()

    return [
        TargetCourseResponse(
            id=c.id,
            course_code=c.course_code,
            course_name=c.course_name,
            department=c.department,
            credits=float(c.credits) if c.credits else None,
            description=c.description,
            prerequisites=c.prerequisites,
            learning_outcomes=c.learning_outcomes,
            course_level=c.course_level,
            is_active=c.is_active
        )
        for c in courses
    ]


@router.post("/target-courses", response_model=TargetCourseResponse, status_code=status.HTTP_201_CREATED)
async def create_target_course(
    course_data: TargetCourseCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Add a new course to the target catalog"""
    # Check if course code already exists
    existing = db.query(TargetCourse).filter(
        TargetCourse.course_code == course_data.course_code
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course code already exists"
        )

    course = TargetCourse(
        course_code=course_data.course_code,
        course_name=course_data.course_name,
        department=course_data.department,
        credits=course_data.credits,
        description=course_data.description,
        prerequisites=course_data.prerequisites,
        learning_outcomes=course_data.learning_outcomes,
        course_level=course_data.course_level
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    return TargetCourseResponse(
        id=course.id,
        course_code=course.course_code,
        course_name=course.course_name,
        department=course.department,
        credits=float(course.credits) if course.credits else None,
        description=course.description,
        prerequisites=course.prerequisites,
        learning_outcomes=course.learning_outcomes,
        course_level=course.course_level,
        is_active=course.is_active
    )


@router.put("/target-course/{course_id}", response_model=TargetCourseResponse)
async def update_target_course(
    course_id: int,
    course_data: TargetCourseUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a target course"""
    course = db.query(TargetCourse).filter(TargetCourse.id == course_id).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    if course_data.course_name is not None:
        course.course_name = course_data.course_name
    if course_data.department is not None:
        course.department = course_data.department
    if course_data.credits is not None:
        course.credits = course_data.credits
    if course_data.description is not None:
        course.description = course_data.description
    if course_data.prerequisites is not None:
        course.prerequisites = course_data.prerequisites
    if course_data.learning_outcomes is not None:
        course.learning_outcomes = course_data.learning_outcomes
    if course_data.course_level is not None:
        course.course_level = course_data.course_level
    if course_data.is_active is not None:
        course.is_active = course_data.is_active

    db.commit()
    db.refresh(course)

    return TargetCourseResponse(
        id=course.id,
        course_code=course.course_code,
        course_name=course.course_name,
        department=course.department,
        credits=float(course.credits) if course.credits else None,
        description=course.description,
        prerequisites=course.prerequisites,
        learning_outcomes=course.learning_outcomes,
        course_level=course.course_level,
        is_active=course.is_active
    )


@router.post("/upload-catalog")
async def upload_catalog(
    file: UploadFile = File(...),
    replace: bool = False,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Upload course catalog from CSV file"""
    if not file.filename.lower().endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted"
        )

    content = await file.read()
    text_content = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(text_content))

    if replace:
        db.query(TargetCourse).delete()

    added = 0
    updated = 0
    errors = []

    for row in reader:
        try:
            course_code = row.get('course_code', '').strip()
            if not course_code:
                continue

            existing = db.query(TargetCourse).filter(
                TargetCourse.course_code == course_code
            ).first()

            if existing:
                existing.course_name = row.get('course_name', existing.course_name)
                existing.department = row.get('department', existing.department)
                existing.credits = float(row['credits']) if row.get('credits') else existing.credits
                existing.description = row.get('description', existing.description)
                existing.prerequisites = row.get('prerequisites', existing.prerequisites)
                existing.learning_outcomes = row.get('learning_outcomes', existing.learning_outcomes)
                existing.course_level = row.get('course_level', existing.course_level)
                updated += 1
            else:
                course = TargetCourse(
                    course_code=course_code,
                    course_name=row.get('course_name', ''),
                    department=row.get('department'),
                    credits=float(row['credits']) if row.get('credits') else None,
                    description=row.get('description'),
                    prerequisites=row.get('prerequisites'),
                    learning_outcomes=row.get('learning_outcomes'),
                    course_level=row.get('course_level', 'undergraduate')
                )
                db.add(course)
                added += 1

        except Exception as e:
            errors.append(f"Row error: {str(e)}")

    db.commit()

    return {
        "message": "Catalog upload complete",
        "added": added,
        "updated": updated,
        "errors": errors[:10]  # Limit errors shown
    }


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get system analytics"""
    # User counts
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_evaluators = db.query(User).filter(User.role == UserRole.EVALUATOR).count()

    # Submission counts
    total_submissions = db.query(Submission).count()
    pending_submissions = db.query(Submission).filter(
        Submission.status.in_([
            SubmissionStatus.PENDING,
            SubmissionStatus.PROCESSING,
            SubmissionStatus.READY_FOR_REVIEW,
            SubmissionStatus.IN_REVIEW
        ])
    ).count()
    completed_submissions = db.query(Submission).filter(
        Submission.status == SubmissionStatus.COMPLETED
    ).count()

    # Evaluation counts
    total_evaluations = db.query(Evaluation).filter(
        Evaluation.decision != EvaluationDecision.PENDING
    ).count()

    approved_count = db.query(Evaluation).filter(
        Evaluation.decision == EvaluationDecision.APPROVED
    ).count()

    approval_rate = (approved_count / total_evaluations * 100) if total_evaluations > 0 else 0

    # Submissions by status
    status_counts = {}
    for status_type in SubmissionStatus:
        count = db.query(Submission).filter(
            Submission.status == status_type
        ).count()
        status_counts[status_type.value] = count

    # Evaluations by decision
    decision_counts = {}
    for decision in EvaluationDecision:
        count = db.query(Evaluation).filter(
            Evaluation.decision == decision
        ).count()
        decision_counts[decision.value] = count

    # Average processing time
    completed = db.query(Submission).filter(
        Submission.status == SubmissionStatus.COMPLETED,
        Submission.completed_at.isnot(None)
    ).all()

    avg_time = None
    if completed:
        times = [
            (s.completed_at - s.submitted_at).total_seconds() / 3600
            for s in completed
            if s.completed_at and s.submitted_at
        ]
        if times:
            avg_time = sum(times) / len(times)

    # Recent activity
    recent_subs = db.query(Submission).order_by(
        Submission.submitted_at.desc()
    ).limit(5).all()

    recent_activity = [
        {
            "type": "submission",
            "id": s.id,
            "student": s.student.email,
            "status": s.status.value,
            "timestamp": s.submitted_at.isoformat()
        }
        for s in recent_subs
    ]

    return AnalyticsResponse(
        total_students=total_students,
        total_evaluators=total_evaluators,
        total_submissions=total_submissions,
        pending_submissions=pending_submissions,
        completed_submissions=completed_submissions,
        total_courses_evaluated=total_evaluations,
        approval_rate=round(approval_rate, 2),
        avg_processing_time_hours=round(avg_time, 2) if avg_time else None,
        submissions_by_status=status_counts,
        evaluations_by_decision=decision_counts,
        recent_activity=recent_activity
    )


@router.get("/users", response_model=List[UserManageResponse])
async def get_users(
    role: Optional[UserRole] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all users"""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)

    users = query.order_by(User.created_at.desc()).all()

    return [
        UserManageResponse(
            id=u.id,
            email=u.email,
            role=u.role.value,
            first_name=u.first_name,
            last_name=u.last_name,
            created_at=u.created_at
        )
        for u in users
    ]


@router.post("/manage-users", response_model=UserManageResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserManageCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new user"""
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        first_name=user_data.first_name,
        last_name=user_data.last_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserManageResponse(
        id=user.id,
        email=user.email,
        role=user.role.value,
        first_name=user.first_name,
        last_name=user.last_name,
        created_at=user.created_at
    )


@router.put("/manage-users/{user_id}", response_model=UserManageResponse)
async def update_user(
    user_id: int,
    user_data: UserManageUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a user"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user_data.role is not None:
        user.role = user_data.role
    if user_data.first_name is not None:
        user.first_name = user_data.first_name
    if user_data.last_name is not None:
        user.last_name = user_data.last_name

    db.commit()
    db.refresh(user)

    return UserManageResponse(
        id=user.id,
        email=user.email,
        role=user.role.value,
        first_name=user.first_name,
        last_name=user.last_name,
        created_at=user.created_at
    )


@router.delete("/manage-users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a user"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}
