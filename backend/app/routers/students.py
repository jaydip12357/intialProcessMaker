from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.submission import Submission, SubmissionStatus
from app.models.course import ExtractedCourse, CourseMatch, TargetCourse
from app.models.evaluation import Evaluation, EvaluationDecision
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/student", tags=["Student"])


# Pydantic schemas
class CourseMatchResponse(BaseModel):
    id: int
    target_course_code: str
    target_course_name: str
    similarity_score: float
    explanation: Optional[str]
    match_rank: int

    class Config:
        from_attributes = True


class EvaluationResponse(BaseModel):
    id: int
    decision: str
    approved_course_code: Optional[str]
    approved_course_name: Optional[str]
    evaluator_notes: Optional[str]
    decided_at: Optional[datetime]

    class Config:
        from_attributes = True


class ExtractedCourseResponse(BaseModel):
    id: int
    course_code: Optional[str]
    course_name: Optional[str]
    credits: Optional[float]
    grade: Optional[str]
    source_university: Optional[str]
    has_syllabus: bool
    matches: List[CourseMatchResponse]
    evaluation: Optional[EvaluationResponse]

    class Config:
        from_attributes = True


class SubmissionResponse(BaseModel):
    id: int
    status: str
    transcript_filename: Optional[str]
    submitted_at: datetime
    completed_at: Optional[datetime]
    courses: List[ExtractedCourseResponse]

    class Config:
        from_attributes = True


class SubmissionListItem(BaseModel):
    id: int
    status: str
    transcript_filename: Optional[str]
    submitted_at: datetime
    completed_at: Optional[datetime]
    course_count: int
    evaluated_count: int

    class Config:
        from_attributes = True


@router.get("/submissions", response_model=List[SubmissionListItem])
async def get_submissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all submissions for the current student"""
    submissions = db.query(Submission).filter(
        Submission.student_id == current_user.id
    ).order_by(Submission.submitted_at.desc()).all()

    result = []
    for sub in submissions:
        course_count = len(sub.extracted_courses)
        evaluated_count = sum(
            1 for c in sub.extracted_courses
            if c.evaluation and c.evaluation.decision != EvaluationDecision.PENDING
        )
        result.append(SubmissionListItem(
            id=sub.id,
            status=sub.status.value,
            transcript_filename=sub.transcript_filename,
            submitted_at=sub.submitted_at,
            completed_at=sub.completed_at,
            course_count=course_count,
            evaluated_count=evaluated_count
        ))

    return result


@router.get("/submission/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed submission information"""
    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.student_id == current_user.id
    ).first()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    courses = []
    for ext_course in submission.extracted_courses:
        matches = []
        for match in ext_course.matches:
            target = db.query(TargetCourse).filter(
                TargetCourse.id == match.target_course_id
            ).first()
            if target:
                matches.append(CourseMatchResponse(
                    id=match.id,
                    target_course_code=target.course_code,
                    target_course_name=target.course_name,
                    similarity_score=float(match.similarity_score) if match.similarity_score else 0,
                    explanation=match.match_explanation,
                    match_rank=match.match_rank
                ))

        evaluation = None
        if ext_course.evaluation:
            eval_data = ext_course.evaluation
            approved_code = None
            approved_name = None
            if eval_data.approved_target_course:
                approved_code = eval_data.approved_target_course.course_code
                approved_name = eval_data.approved_target_course.course_name

            evaluation = EvaluationResponse(
                id=eval_data.id,
                decision=eval_data.decision.value,
                approved_course_code=approved_code,
                approved_course_name=approved_name,
                evaluator_notes=eval_data.evaluator_notes,
                decided_at=eval_data.decided_at
            )

        courses.append(ExtractedCourseResponse(
            id=ext_course.id,
            course_code=ext_course.course_code,
            course_name=ext_course.course_name,
            credits=float(ext_course.credits) if ext_course.credits else None,
            grade=ext_course.grade,
            source_university=ext_course.source_university,
            has_syllabus=ext_course.syllabus_file_path is not None,
            matches=matches,
            evaluation=evaluation
        ))

    return SubmissionResponse(
        id=submission.id,
        status=submission.status.value,
        transcript_filename=submission.transcript_filename,
        submitted_at=submission.submitted_at,
        completed_at=submission.completed_at,
        courses=courses
    )


@router.get("/submission/{submission_id}/status")
async def get_submission_status(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get submission processing status"""
    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.student_id == current_user.id
    ).first()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    return {
        "id": submission.id,
        "status": submission.status.value,
        "processing_error": submission.processing_error
    }
