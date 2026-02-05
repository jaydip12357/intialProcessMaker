"""Matching router for AI-powered course similarity analysis."""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.submission import StudentSubmission, TransferCourse, CourseMatch, SubmissionStatus
from app.models.course import Course
from app.utils.auth import get_current_user
from app.services.gemini_service import gemini_service
from app.services.pdf_parser import pdf_parser

router = APIRouter()


class AnalyzeRequest(BaseModel):
    submission_id: int


@router.post("/analyze")
async def analyze_submission(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger AI matching analysis for a submission."""
    # Get submission
    submission = db.query(StudentSubmission).filter(
        StudentSubmission.id == request.submission_id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Authorization check
    if current_user.role == UserRole.STUDENT and submission.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only analyze your own submissions"
        )
    
    if not submission.transfer_courses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transfer courses to analyze"
        )
    
    # Update status
    submission.status = SubmissionStatus.PROCESSING
    db.commit()
    
    # Run analysis in background
    background_tasks.add_task(
        run_matching_analysis,
        submission.id,
        submission.target_university_id
    )
    
    return {
        "message": "Analysis started",
        "submission_id": submission.id,
        "status": "processing"
    }


async def run_matching_analysis(submission_id: int, target_university_id: int):
    """Background task to run course matching analysis."""
    from app.database import SessionLocal
    
    db = SessionLocal()
    try:
        # Get submission and transfer courses
        submission = db.query(StudentSubmission).filter(
            StudentSubmission.id == submission_id
        ).first()
        
        if not submission:
            return
        
        # Get target university courses
        target_courses = db.query(Course).filter(
            Course.university_id == target_university_id,
            Course.is_active == True
        ).all()
        
        if not target_courses:
            submission.status = SubmissionStatus.PENDING
            db.commit()
            return
        
        # Convert to dicts for Gemini
        target_course_dicts = [
            {
                "id": c.id,
                "code": c.code,
                "name": c.name,
                "credits": c.credits,
                "department": c.department,
                "description": c.description,
                "learning_outcomes": c.learning_outcomes
            }
            for c in target_courses
        ]
        
        # Analyze each transfer course
        for transfer_course in submission.transfer_courses:
            # Clear existing matches
            db.query(CourseMatch).filter(
                CourseMatch.transfer_course_id == transfer_course.id
            ).delete()
            
            # Extract syllabus text if available
            syllabus_text = None
            if transfer_course.syllabus_file_path:
                syllabus_text = pdf_parser.extract_text(transfer_course.syllabus_file_path)
            
            # Build transfer course dict
            transfer_dict = {
                "course_code": transfer_course.course_code,
                "course_name": transfer_course.course_name,
                "credits": transfer_course.credits,
                "source_university_name": transfer_course.source_university_name,
                "syllabus_text": syllabus_text,
                "additional_notes": transfer_course.additional_notes
            }
            
            # Get matches from Gemini
            matches = await gemini_service.analyze_course_matches(
                transfer_dict,
                target_course_dicts,
                top_n=5
            )
            
            # Save matches
            for match in matches:
                course_match = CourseMatch(
                    transfer_course_id=transfer_course.id,
                    target_course_id=match["target_course_id"],
                    similarity_score=match["similarity_score"],
                    explanation=match.get("explanation"),
                    key_similarities=match.get("key_similarities"),
                    key_differences=match.get("key_differences"),
                    recommendation=match.get("recommendation"),
                    rank=match.get("rank")
                )
                db.add(course_match)
        
        # Update submission status
        submission.status = SubmissionStatus.IN_REVIEW
        db.commit()
        
    except Exception as e:
        print(f"Matching analysis error: {e}")
        db.rollback()
    finally:
        db.close()


@router.get("/results/{submission_id}")
async def get_match_results(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get matching results for a submission."""
    submission = db.query(StudentSubmission).filter(
        StudentSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Authorization
    if current_user.role == UserRole.STUDENT and submission.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    results = []
    for transfer_course in submission.transfer_courses:
        matches = db.query(CourseMatch).filter(
            CourseMatch.transfer_course_id == transfer_course.id
        ).order_by(CourseMatch.rank).all()
        
        match_list = []
        for match in matches:
            target_course = db.query(Course).filter(Course.id == match.target_course_id).first()
            match_list.append({
                "id": match.id,
                "target_course": {
                    "id": target_course.id if target_course else None,
                    "code": target_course.code if target_course else None,
                    "name": target_course.name if target_course else None,
                    "credits": target_course.credits if target_course else None,
                    "department": target_course.department if target_course else None
                },
                "similarity_score": match.similarity_score,
                "explanation": match.explanation,
                "key_similarities": match.key_similarities,
                "key_differences": match.key_differences,
                "recommendation": match.recommendation,
                "rank": match.rank
            })
        
        results.append({
            "transfer_course": {
                "id": transfer_course.id,
                "code": transfer_course.course_code,
                "name": transfer_course.course_name,
                "credits": transfer_course.credits
            },
            "matches": match_list
        })
    
    return {
        "submission_id": submission_id,
        "status": submission.status.value,
        "results": results
    }
