"""Evaluation model for evaluator decisions."""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class EvaluationDecision(str, enum.Enum):
    """Evaluation decision enumeration."""
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    MORE_INFO_NEEDED = "more_info_needed"


class Evaluation(Base):
    """Evaluation model for transfer credit decisions."""
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("student_submissions.id"), nullable=False)
    evaluator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    transfer_course_id = Column(Integer, ForeignKey("transfer_courses.id"), nullable=False)
    
    # Decision
    decision = Column(Enum(EvaluationDecision), default=EvaluationDecision.PENDING)
    matched_course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)  # If approved
    notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    submission = relationship("StudentSubmission", back_populates="evaluations")
    evaluator = relationship("User", back_populates="evaluations")

    def __repr__(self):
        return f"<Evaluation(id={self.id}, decision={self.decision})>"
