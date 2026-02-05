import os
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
import aiofiles

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.submission import Submission, SubmissionStatus
from app.models.course import ExtractedCourse
from app.models.evaluation import Evaluation, EvaluationDecision
from app.utils.auth import get_current_user
from app.services.pdf_parser import pdf_parser
from app.services.gemini_service import gemini_service
from app.services.similarity import SimilarityMatcher

router = APIRouter(prefix="/api/student", tags=["Uploads"])


def ensure_upload_dirs():
    """Ensure upload directories exist"""
    transcripts_dir = os.path.join(settings.UPLOAD_DIR, "transcripts")
    syllabi_dir = os.path.join(settings.UPLOAD_DIR, "syllabi")
    os.makedirs(transcripts_dir, exist_ok=True)
    os.makedirs(syllabi_dir, exist_ok=True)
    return transcripts_dir, syllabi_dir


async def process_transcript_background(submission_id: int, file_path: str, db_url: str):
    """Background task to process transcript"""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            return

        submission.status = SubmissionStatus.PROCESSING
        db.commit()

        # Extract text from PDF
        pdf_text = await pdf_parser.extract_text(file_path)

        # Extract course data using Gemini
        courses_data = await gemini_service.extract_transcript_data(pdf_text)

        # Save extracted courses
        for course_data in courses_data:
            ext_course = ExtractedCourse(
                submission_id=submission_id,
                course_code=course_data.get("course_code"),
                course_name=course_data.get("course_name"),
                credits=course_data.get("credits"),
                grade=course_data.get("grade"),
                source_university=course_data.get("university_name"),
                extracted_data=course_data
            )
            db.add(ext_course)
            db.flush()

            # Create pending evaluation for this course
            evaluation = Evaluation(
                extracted_course_id=ext_course.id,
                decision=EvaluationDecision.PENDING
            )
            db.add(evaluation)

        db.commit()

        # Run course matching
        matcher = SimilarityMatcher(db)
        await matcher.match_courses_for_submission(submission_id)

    except Exception as e:
        print(f"Error processing transcript: {e}")
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if submission:
            submission.status = SubmissionStatus.FAILED
            submission.processing_error = str(e)
            db.commit()
    finally:
        db.close()


@router.post("/upload-transcript")
async def upload_transcript(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a transcript PDF for processing"""
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted"
        )

    # Check file size
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum of {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB"
        )

    # Ensure directories exist
    transcripts_dir, _ = ensure_upload_dirs()

    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{current_user.id}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(transcripts_dir, unique_filename)

    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(file_content)

    # Create submission record
    submission = Submission(
        student_id=current_user.id,
        transcript_file_path=file_path,
        transcript_filename=file.filename,
        status=SubmissionStatus.PENDING
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Start background processing
    background_tasks.add_task(
        process_transcript_background,
        submission.id,
        file_path,
        settings.DATABASE_URL
    )

    return {
        "submission_id": submission.id,
        "status": submission.status.value,
        "message": "Transcript uploaded successfully. Processing started."
    }


async def process_syllabus_background(course_id: int, file_path: str, db_url: str):
    """Background task to process syllabus"""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        ext_course = db.query(ExtractedCourse).filter(
            ExtractedCourse.id == course_id
        ).first()

        if not ext_course:
            return

        # Extract text from PDF
        pdf_text = await pdf_parser.extract_text(file_path)

        # Extract syllabus details using Gemini
        syllabus_data = await gemini_service.extract_course_details(pdf_text)

        # Update course with syllabus information
        ext_course.course_description = syllabus_data.get("course_description")
        ext_course.learning_outcomes = str(syllabus_data.get("learning_outcomes", []))

        if ext_course.extracted_data:
            ext_course.extracted_data = {
                **ext_course.extracted_data,
                "syllabus_data": syllabus_data
            }
        else:
            ext_course.extracted_data = {"syllabus_data": syllabus_data}

        db.commit()

        # Re-run matching with updated course info
        matcher = SimilarityMatcher(db)
        await matcher.rematch_course(course_id)

    except Exception as e:
        print(f"Error processing syllabus: {e}")
    finally:
        db.close()


@router.post("/upload-syllabus/{course_id}")
async def upload_syllabus(
    course_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a syllabus PDF for a specific extracted course"""
    # Verify the course belongs to the current user
    ext_course = db.query(ExtractedCourse).join(Submission).filter(
        ExtractedCourse.id == course_id,
        Submission.student_id == current_user.id
    ).first()

    if not ext_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or access denied"
        )

    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted"
        )

    # Check file size
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum of {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB"
        )

    # Ensure directories exist
    _, syllabi_dir = ensure_upload_dirs()

    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{course_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(syllabi_dir, unique_filename)

    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(file_content)

    # Update course record
    ext_course.syllabus_file_path = file_path
    ext_course.syllabus_filename = file.filename
    db.commit()

    # Start background processing
    background_tasks.add_task(
        process_syllabus_background,
        course_id,
        file_path,
        settings.DATABASE_URL
    )

    return {
        "course_id": course_id,
        "message": "Syllabus uploaded successfully. Processing started."
    }
