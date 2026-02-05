"""Student portal router for submissions and document uploads."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.submission import StudentSubmission, TransferCourse, CourseMatch, SubmissionStatus
from app.models.university import University
from app.utils.auth import get_current_user
from app.config import get_settings

router = APIRouter()
settings = get_settings()


# Pydantic schemas
class TransferCourseCreate(BaseModel):
    course_code: Optional[str] = None
    course_name: str
    credits: Optional[float] = None
    grade: Optional[str] = None
    source_university_name: Optional[str] = None
    additional_notes: Optional[str] = None


class TransferCourseResponse(BaseModel):
    id: int
    course_code: Optional[str]
    course_name: str
    credits: Optional[float]
    grade: Optional[str]
    source_university_name: Optional[str]
    syllabus_file_path: Optional[str]
    additional_notes: Optional[str]

    class Config:
        from_attributes = True


class SubmissionCreate(BaseModel):
    target_university_id: int
    notes: Optional[str] = None


class SubmissionResponse(BaseModel):
    id: int
    student_id: int
    target_university_id: int
    transcript_file_path: Optional[str]
    status: SubmissionStatus
    notes: Optional[str]
    created_at: datetime
    transfer_courses: List[TransferCourseResponse] = []

    class Config:
        from_attributes = True


class CourseMatchResponse(BaseModel):
    id: int
    target_course_id: int
    target_course_code: Optional[str] = None
    target_course_name: Optional[str] = None
    similarity_score: float
    explanation: Optional[str]
    key_similarities: Optional[str]
    key_differences: Optional[str]
    recommendation: Optional[str]
    rank: Optional[int]

    class Config:
        from_attributes = True


@router.post("/submissions", response_model=SubmissionResponse)
async def create_submission(
    submission_data: SubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new transfer credit submission."""
    # Verify target university exists
    university = db.query(University).filter(University.id == submission_data.target_university_id).first()
    if not university:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target university not found"
        )
    
    submission = StudentSubmission(
        student_id=current_user.id,
        target_university_id=submission_data.target_university_id,
        notes=submission_data.notes,
        status=SubmissionStatus.DRAFT
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return SubmissionResponse.model_validate(submission)


@router.get("/submissions", response_model=List[SubmissionResponse])
async def get_submissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all submissions for the current student."""
    submissions = db.query(StudentSubmission).filter(
        StudentSubmission.student_id == current_user.id
    ).order_by(StudentSubmission.created_at.desc()).all()
    
    return [SubmissionResponse.model_validate(s) for s in submissions]


@router.get("/submissions/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific submission."""
    submission = db.query(StudentSubmission).filter(
        StudentSubmission.id == submission_id,
        StudentSubmission.student_id == current_user.id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    return SubmissionResponse.model_validate(submission)


@router.post("/submissions/{submission_id}/upload-transcript")
async def upload_transcript(
    submission_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload transcript PDF for a submission."""
    submission = db.query(StudentSubmission).filter(
        StudentSubmission.id == submission_id,
        StudentSubmission.student_id == current_user.id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed for transcripts"
        )
    
    # Create upload directory
    upload_dir = os.path.join(settings.upload_dir, "transcripts", str(current_user.id))
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_dir, f"submission_{submission_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update submission
    submission.transcript_file_path = file_path
    submission.status = SubmissionStatus.PENDING
    db.commit()
    
    return {"message": "Transcript uploaded successfully", "file_path": file_path}


@router.post("/submissions/{submission_id}/courses", response_model=TransferCourseResponse)
async def add_transfer_course(
    submission_id: int,
    course_data: TransferCourseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a transfer course to a submission."""
    submission = db.query(StudentSubmission).filter(
        StudentSubmission.id == submission_id,
        StudentSubmission.student_id == current_user.id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    transfer_course = TransferCourse(
        submission_id=submission_id,
        course_code=course_data.course_code,
        course_name=course_data.course_name,
        credits=course_data.credits,
        grade=course_data.grade,
        source_university_name=course_data.source_university_name,
        additional_notes=course_data.additional_notes
    )
    
    db.add(transfer_course)
    db.commit()
    db.refresh(transfer_course)
    
    return TransferCourseResponse.model_validate(transfer_course)


@router.post("/submissions/{submission_id}/courses/{course_id}/upload-syllabus")
async def upload_course_syllabus(
    submission_id: int,
    course_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload syllabus for a transfer course."""
    course = db.query(TransferCourse).join(StudentSubmission).filter(
        TransferCourse.id == course_id,
        TransferCourse.submission_id == submission_id,
        StudentSubmission.student_id == current_user.id
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer course not found"
        )
    
    # Validate file type
    if not file.filename.lower().endswith(('.pdf', '.docx')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are allowed for syllabi"
        )
    
    # Create upload directory
    upload_dir = os.path.join(settings.upload_dir, "syllabi", str(current_user.id))
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_dir, f"course_{course_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update course
    course.syllabus_file_path = file_path
    db.commit()
    
    return {"message": "Syllabus uploaded successfully", "file_path": file_path}


@router.post("/submissions/{submission_id}/submit")
async def submit_for_review(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit the application for evaluation."""
    submission = db.query(StudentSubmission).filter(
        StudentSubmission.id == submission_id,
        StudentSubmission.student_id == current_user.id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    if submission.status not in [SubmissionStatus.DRAFT, SubmissionStatus.PENDING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission has already been submitted"
        )
    
    # Verify there are transfer courses
    if not submission.transfer_courses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please add at least one transfer course before submitting"
        )
    
    submission.status = SubmissionStatus.PENDING
    db.commit()
    
    return {"message": "Submission submitted for review", "status": submission.status.value}


@router.get("/submissions/{submission_id}/matches")
async def get_submission_matches(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI-generated matches for all courses in a submission."""
    submission = db.query(StudentSubmission).filter(
        StudentSubmission.id == submission_id,
        StudentSubmission.student_id == current_user.id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Get all matches for all transfer courses
    results = []
    for transfer_course in submission.transfer_courses:
        matches = db.query(CourseMatch).filter(
            CourseMatch.transfer_course_id == transfer_course.id
        ).order_by(CourseMatch.rank).all()
        
        course_matches = []
        for match in matches:
            match_data = {
                "id": match.id,
                "target_course_id": match.target_course_id,
                "target_course_code": match.target_course.code if match.target_course else None,
                "target_course_name": match.target_course.name if match.target_course else None,
                "similarity_score": match.similarity_score,
                "explanation": match.explanation,
                "key_similarities": match.key_similarities,
                "key_differences": match.key_differences,
                "recommendation": match.recommendation,
                "rank": match.rank
            }
            course_matches.append(match_data)
        
        results.append({
            "transfer_course": TransferCourseResponse.model_validate(transfer_course),
            "matches": course_matches
        })
    
    return {"submission_id": submission_id, "course_matches": results}
