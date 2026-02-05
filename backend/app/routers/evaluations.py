from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.submission import Submission, SubmissionStatus
from app.models.course import ExtractedCourse, CourseMatch, TargetCourse
from app.models.evaluation import Evaluation, EvaluationDecision
from app.utils.auth import get_current_user, require_evaluator

router = APIRouter(prefix="/api/evaluator", tags=["Evaluator"])


# Pydantic schemas
class TargetCourseInfo(BaseModel):
    id: int
    course_code: str
    course_name: str
    credits: Optional[float]
    department: Optional[str]

    class Config:
        from_attributes = True


class CourseMatchDetail(BaseModel):
    id: int
    target_course: TargetCourseInfo
    similarity_score: float
    explanation: Optional[str]
    match_rank: int
    key_similarities: List[str]
    important_differences: List[str]

    class Config:
        from_attributes = True


class ExtractedCourseDetail(BaseModel):
    id: int
    course_code: Optional[str]
    course_name: Optional[str]
    credits: Optional[float]
    grade: Optional[str]
    source_university: Optional[str]
    course_description: Optional[str]
    learning_outcomes: Optional[str]
    has_syllabus: bool
    matches: List[CourseMatchDetail]
    current_evaluation: Optional[dict]

    class Config:
        from_attributes = True


class SubmissionDetail(BaseModel):
    id: int
    student_name: str
    student_email: str
    status: str
    submitted_at: datetime
    transcript_filename: Optional[str]
    courses: List[ExtractedCourseDetail]

    class Config:
        from_attributes = True


class PendingReviewItem(BaseModel):
    id: int
    student_name: str
    student_email: str
    status: str
    submitted_at: datetime
    course_count: int
    pending_evaluation_count: int

    class Config:
        from_attributes = True


class EvaluateRequest(BaseModel):
    decision: EvaluationDecision
    approved_target_course_id: Optional[int] = None
    notes: Optional[str] = None


class EvaluationUpdateRequest(BaseModel):
    decision: Optional[EvaluationDecision] = None
    approved_target_course_id: Optional[int] = None
    notes: Optional[str] = None


@router.get("/pending-reviews", response_model=List[PendingReviewItem])
async def get_pending_reviews(
    current_user: User = Depends(require_evaluator),
    db: Session = Depends(get_db)
):
    """Get all submissions pending review"""
    submissions = db.query(Submission).filter(
        Submission.status.in_([
            SubmissionStatus.READY_FOR_REVIEW,
            SubmissionStatus.IN_REVIEW
        ])
    ).order_by(Submission.submitted_at.asc()).all()

    result = []
    for sub in submissions:
        course_count = len(sub.extracted_courses)
        pending_count = sum(
            1 for c in sub.extracted_courses
            if c.evaluation and c.evaluation.decision == EvaluationDecision.PENDING
        )

        result.append(PendingReviewItem(
            id=sub.id,
            student_name=sub.student.full_name,
            student_email=sub.student.email,
            status=sub.status.value,
            submitted_at=sub.submitted_at,
            course_count=course_count,
            pending_evaluation_count=pending_count
        ))

    return result


@router.get("/submission/{submission_id}", response_model=SubmissionDetail)
async def get_submission_for_review(
    submission_id: int,
    current_user: User = Depends(require_evaluator),
    db: Session = Depends(get_db)
):
    """Get detailed submission information for evaluation"""
    submission = db.query(Submission).filter(
        Submission.id == submission_id
    ).first()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    # Update status if first time being reviewed
    if submission.status == SubmissionStatus.READY_FOR_REVIEW:
        submission.status = SubmissionStatus.IN_REVIEW
        submission.reviewed_by = current_user.id
        db.commit()

    courses = []
    for ext_course in submission.extracted_courses:
        matches = []
        for match in sorted(ext_course.matches, key=lambda m: m.match_rank):
            target = db.query(TargetCourse).filter(
                TargetCourse.id == match.target_course_id
            ).first()

            if target:
                reasoning = match.gemini_reasoning or {}
                matches.append(CourseMatchDetail(
                    id=match.id,
                    target_course=TargetCourseInfo(
                        id=target.id,
                        course_code=target.course_code,
                        course_name=target.course_name,
                        credits=float(target.credits) if target.credits else None,
                        department=target.department
                    ),
                    similarity_score=float(match.similarity_score) if match.similarity_score else 0,
                    explanation=match.match_explanation,
                    match_rank=match.match_rank,
                    key_similarities=reasoning.get("key_similarities", []),
                    important_differences=reasoning.get("important_differences", [])
                ))

        current_eval = None
        if ext_course.evaluation:
            eval_data = ext_course.evaluation
            current_eval = {
                "id": eval_data.id,
                "decision": eval_data.decision.value,
                "approved_target_course_id": eval_data.approved_target_course_id,
                "notes": eval_data.evaluator_notes,
                "decided_at": eval_data.decided_at.isoformat() if eval_data.decided_at else None
            }

        courses.append(ExtractedCourseDetail(
            id=ext_course.id,
            course_code=ext_course.course_code,
            course_name=ext_course.course_name,
            credits=float(ext_course.credits) if ext_course.credits else None,
            grade=ext_course.grade,
            source_university=ext_course.source_university,
            course_description=ext_course.course_description,
            learning_outcomes=ext_course.learning_outcomes,
            has_syllabus=ext_course.syllabus_file_path is not None,
            matches=matches,
            current_evaluation=current_eval
        ))

    return SubmissionDetail(
        id=submission.id,
        student_name=submission.student.full_name,
        student_email=submission.student.email,
        status=submission.status.value,
        submitted_at=submission.submitted_at,
        transcript_filename=submission.transcript_filename,
        courses=courses
    )


@router.post("/evaluate/{course_id}")
async def evaluate_course(
    course_id: int,
    request: EvaluateRequest,
    current_user: User = Depends(require_evaluator),
    db: Session = Depends(get_db)
):
    """Make an evaluation decision for an extracted course"""
    ext_course = db.query(ExtractedCourse).filter(
        ExtractedCourse.id == course_id
    ).first()

    if not ext_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Validate approved course if decision is approved
    if request.decision == EvaluationDecision.APPROVED:
        if not request.approved_target_course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="approved_target_course_id required for approval"
            )

        target = db.query(TargetCourse).filter(
            TargetCourse.id == request.approved_target_course_id
        ).first()

        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target course not found"
            )

    # Update or create evaluation
    evaluation = ext_course.evaluation
    if not evaluation:
        evaluation = Evaluation(extracted_course_id=course_id)
        db.add(evaluation)

    evaluation.evaluator_id = current_user.id
    evaluation.decision = request.decision
    evaluation.approved_target_course_id = request.approved_target_course_id if request.decision == EvaluationDecision.APPROVED else None
    evaluation.evaluator_notes = request.notes
    evaluation.decided_at = datetime.utcnow()

    db.commit()
    db.refresh(evaluation)

    # Check if all courses in submission are evaluated
    submission = ext_course.submission
    all_evaluated = all(
        c.evaluation and c.evaluation.decision != EvaluationDecision.PENDING
        for c in submission.extracted_courses
    )

    if all_evaluated:
        submission.status = SubmissionStatus.COMPLETED
        submission.completed_at = datetime.utcnow()
        db.commit()

    return {
        "evaluation_id": evaluation.id,
        "decision": evaluation.decision.value,
        "message": "Evaluation saved successfully"
    }


@router.put("/update-decision/{evaluation_id}")
async def update_evaluation(
    evaluation_id: int,
    request: EvaluationUpdateRequest,
    current_user: User = Depends(require_evaluator),
    db: Session = Depends(get_db)
):
    """Update an existing evaluation decision"""
    evaluation = db.query(Evaluation).filter(
        Evaluation.id == evaluation_id
    ).first()

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )

    if request.decision is not None:
        evaluation.decision = request.decision

    if request.approved_target_course_id is not None:
        evaluation.approved_target_course_id = request.approved_target_course_id

    if request.notes is not None:
        evaluation.evaluator_notes = request.notes

    evaluation.evaluator_id = current_user.id
    evaluation.decided_at = datetime.utcnow()

    db.commit()
    db.refresh(evaluation)

    return {
        "evaluation_id": evaluation.id,
        "decision": evaluation.decision.value,
        "message": "Evaluation updated successfully"
    }


@router.get("/my-evaluations")
async def get_my_evaluations(
    current_user: User = Depends(require_evaluator),
    db: Session = Depends(get_db)
):
    """Get evaluations made by the current evaluator"""
    evaluations = db.query(Evaluation).filter(
        Evaluation.evaluator_id == current_user.id
    ).order_by(Evaluation.decided_at.desc()).limit(50).all()

    result = []
    for eval_data in evaluations:
        ext_course = eval_data.extracted_course
        result.append({
            "id": eval_data.id,
            "course_code": ext_course.course_code,
            "course_name": ext_course.course_name,
            "source_university": ext_course.source_university,
            "decision": eval_data.decision.value,
            "approved_course": eval_data.approved_target_course.course_code if eval_data.approved_target_course else None,
            "decided_at": eval_data.decided_at
        })

    return result
