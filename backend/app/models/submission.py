from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY_FOR_REVIEW = "ready_for_review"
    IN_REVIEW = "in_review"
    COMPLETED = "completed"
    FAILED = "failed"


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    transcript_file_path = Column(String(500))
    transcript_filename = Column(String(255))
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.PENDING)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    completed_at = Column(DateTime)
    processing_error = Column(String(1000))

    # Relationships
    student = relationship("User", back_populates="submissions", foreign_keys=[student_id])
    reviewer = relationship("User", back_populates="reviewed_submissions", foreign_keys=[reviewed_by])
    extracted_courses = relationship("ExtractedCourse", back_populates="submission", cascade="all, delete-orphan")
