"""Evaluations router for evaluator dashboard and decisions."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.submission import StudentSubmission, TransferCourse, CourseMatch, SubmissionStatus
from app.models.course import Course
from app.models.evaluation import Evaluation, EvaluationDecision
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


# Pydantic schemas
class EvaluationCreate(BaseModel):
    transfer_course_id: int
    decision: EvaluationDecision
    matched_course_id: Optional[int] = None
    notes: Optional[str] = None


class EvaluationResponse(BaseModel):
    id: int
    submission_id: int
    evaluator_id: int
    transfer_course_id: int
    decision: EvaluationDecision
    matched_course_id: Optional[int]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SubmissionDetailResponse(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    target_university_id: int
    target_university_name: Optional[str] = None
    status: SubmissionStatus
    created_at: datetime
    transfer_courses_count: int

    class Config:
        from_attributes = True


@router.get("/pending", response_model=List[dict])
async def get_pending_evaluations(
    current_user: User = Depends(require_roles(UserRole.EVALUATOR, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db)
):
    """Get all pending submissions for review."""
    # Get submissions that are in_review status
    query = db.query(StudentSubmission).filter(
        StudentSubmission.status.in_([SubmissionStatus.PENDING, SubmissionStatus.IN_REVIEW])
    )
    
    # Filter by university if evaluator is assigned to one
    if current_user.role == UserRole.EVALUATOR and current_user.university_id:
        query = query.filter(
            StudentSubmission.target_university_id == current_user.university_id
        )
    
    submissions = query.order_by(StudentSubmission.created_at.desc()).all()
    
    results = []
    for submission in submissions:
        student = submission.student
        target_university = submission.target_university
        
        results.append({
            "id": submission.id,
            "student_id": submission.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else None,
            "student_email": student.email if student else None,
            "target_university_id": submission.target_university_id,
            "target_university_name": target_university.name if target_university else None,
            "status": submission.status.value,
            "created_at": submission.created_at.isoformat() if submission.created_at else None,
            "transfer_courses_count": len(submission.transfer_courses)
        })
    
    return results


@router.get("/{submission_id}")
async def get_evaluation_detail(
    submission_id: int,
    current_user: User = Depends(require_roles(UserRole.EVALUATOR, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db)
):
    """Get detailed view of a submission for evaluation."""
    submission = db.query(StudentSubmission).filter(
        StudentSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Get student info
    student = submission.student
    target_university = submission.target_university
    
    # Get all transfer courses with their matches
    courses_data = []
    for transfer_course in submission.transfer_courses:
        # Get matches
        matches = db.query(CourseMatch).filter(
            CourseMatch.transfer_course_id == transfer_course.id
        ).order_by(CourseMatch.rank).all()
        
        match_data = []
        for match in matches:
            target_course = db.query(Course).filter(Course.id == match.target_course_id).first()
            match_data.append({
                "id": match.id,
                "target_course": {
                    "id": target_course.id,
                    "code": target_course.code,
                    "name": target_course.name,
                    "credits": target_course.credits,
                    "department": target_course.department,
                    "description": target_course.description
                } if target_course else None,
                "similarity_score": match.similarity_score,
                "explanation": match.explanation,
                "recommendation": match.recommendation,
                "rank": match.rank
            })
        
        # Get existing evaluation if any
        evaluation = db.query(Evaluation).filter(
            Evaluation.submission_id == submission_id,
            Evaluation.transfer_course_id == transfer_course.id
        ).first()
        
        courses_data.append({
            "id": transfer_course.id,
            "course_code": transfer_course.course_code,
            "course_name": transfer_course.course_name,
            "credits": transfer_course.credits,
            "grade": transfer_course.grade,
            "source_university_name": transfer_course.source_university_name,
            "syllabus_file_path": transfer_course.syllabus_file_path,
            "additional_notes": transfer_course.additional_notes,
            "matches": match_data,
            "evaluation": {
                "id": evaluation.id,
                "decision": evaluation.decision.value,
                "matched_course_id": evaluation.matched_course_id,
                "notes": evaluation.notes
            } if evaluation else None
        })
    
    return {
        "id": submission.id,
        "status": submission.status.value,
        "created_at": submission.created_at.isoformat() if submission.created_at else None,
        "transcript_file_path": submission.transcript_file_path,
        "notes": submission.notes,
        "student": {
            "id": student.id,
            "name": f"{student.first_name} {student.last_name}",
            "email": student.email
        } if student else None,
        "target_university": {
            "id": target_university.id,
            "name": target_university.name
        } if target_university else None,
        "transfer_courses": courses_data
    }


@router.post("/{submission_id}/decision", response_model=EvaluationResponse)
async def submit_decision(
    submission_id: int,
    decision_data: EvaluationCreate,
    current_user: User = Depends(require_roles(UserRole.EVALUATOR, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db)
):
    """Submit an evaluation decision for a transfer course."""
    # Verify submission exists
    submission = db.query(StudentSubmission).filter(
        StudentSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Verify transfer course belongs to submission
    transfer_course = db.query(TransferCourse).filter(
        TransferCourse.id == decision_data.transfer_course_id,
        TransferCourse.submission_id == submission_id
    ).first()
    
    if not transfer_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer course not found in this submission"
        )
    
    # Check if evaluation already exists
    existing = db.query(Evaluation).filter(
        Evaluation.submission_id == submission_id,
        Evaluation.transfer_course_id == decision_data.transfer_course_id
    ).first()
    
    if existing:
        # Update existing evaluation
        existing.decision = decision_data.decision
        existing.matched_course_id = decision_data.matched_course_id
        existing.notes = decision_data.notes
        existing.evaluator_id = current_user.id
        db.commit()
        db.refresh(existing)
        evaluation = existing
    else:
        # Create new evaluation
        evaluation = Evaluation(
            submission_id=submission_id,
            evaluator_id=current_user.id,
            transfer_course_id=decision_data.transfer_course_id,
            decision=decision_data.decision,
            matched_course_id=decision_data.matched_course_id,
            notes=decision_data.notes
        )
        db.add(evaluation)
        db.commit()
        db.refresh(evaluation)
    
    # Check if all courses have been evaluated
    total_courses = len(submission.transfer_courses)
    evaluated_courses = db.query(Evaluation).filter(
        Evaluation.submission_id == submission_id,
        Evaluation.decision != EvaluationDecision.PENDING
    ).count()
    
    if evaluated_courses >= total_courses:
        submission.status = SubmissionStatus.COMPLETED
        db.commit()
    
    return EvaluationResponse.model_validate(evaluation)


@router.get("/reports/summary")
async def get_evaluation_reports(
    current_user: User = Depends(require_roles(UserRole.EVALUATOR, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db)
):
    """Get summary report of evaluations."""
    # Total submissions
    total_submissions = db.query(StudentSubmission).count()
    pending = db.query(StudentSubmission).filter(
        StudentSubmission.status.in_([SubmissionStatus.PENDING, SubmissionStatus.IN_REVIEW])
    ).count()
    completed = db.query(StudentSubmission).filter(
        StudentSubmission.status == SubmissionStatus.COMPLETED
    ).count()
    
    # Evaluation stats
    total_evaluations = db.query(Evaluation).count()
    approved = db.query(Evaluation).filter(
        Evaluation.decision == EvaluationDecision.APPROVED
    ).count()
    denied = db.query(Evaluation).filter(
        Evaluation.decision == EvaluationDecision.DENIED
    ).count()
    
    return {
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
