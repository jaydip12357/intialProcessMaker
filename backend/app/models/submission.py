"""Student submission and transfer course models."""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class SubmissionStatus(str, enum.Enum):
    """Submission status enumeration."""
    DRAFT = "draft"
    PENDING = "pending"
    PROCESSING = "processing"
    IN_REVIEW = "in_review"
    COMPLETED = "completed"
    REJECTED = "rejected"


class StudentSubmission(Base):
    """Student submission model for transfer credit requests."""
    __tablename__ = "student_submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    # Submission Info
    transcript_file_path = Column(String(500), nullable=True)
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.DRAFT)
    notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("User", back_populates="submissions")
    target_university = relationship("University", back_populates="submissions")
    transfer_courses = relationship("TransferCourse", back_populates="submission", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="submission")

    def __repr__(self):
        return f"<StudentSubmission(id={self.id}, student_id={self.student_id}, status={self.status})>"


class TransferCourse(Base):
    """Transfer course extracted from student's transcript."""
    __tablename__ = "transfer_courses"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("student_submissions.id"), nullable=False)
    
    # Course Information
    course_code = Column(String(50), nullable=True)
    course_name = Column(String(255), nullable=False)
    credits = Column(Float, nullable=True)
    grade = Column(String(10), nullable=True)
    source_university_name = Column(String(255), nullable=True)
    
    # Supporting Materials
    syllabus_file_path = Column(String(500), nullable=True)
    course_url = Column(String(500), nullable=True)
    additional_notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    submission = relationship("StudentSubmission", back_populates="transfer_courses")
    matches = relationship("CourseMatch", back_populates="transfer_course", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TransferCourse(id={self.id}, name={self.course_name})>"


class CourseMatch(Base):
    """AI-generated course match between transfer and target courses."""
    __tablename__ = "course_matches"

    id = Column(Integer, primary_key=True, index=True)
    transfer_course_id = Column(Integer, ForeignKey("transfer_courses.id"), nullable=False)
    target_course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    
    # Match Results
    similarity_score = Column(Float, nullable=False)  # 0-100
    explanation = Column(Text, nullable=True)
    key_similarities = Column(Text, nullable=True)  # JSON string
    key_differences = Column(Text, nullable=True)  # JSON string
    recommendation = Column(Text, nullable=True)
    rank = Column(Integer, nullable=True)  # 1 = best match
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    transfer_course = relationship("TransferCourse", back_populates="matches")
    target_course = relationship("Course", back_populates="matches")

    def __repr__(self):
        return f"<CourseMatch(id={self.id}, score={self.similarity_score})>"
