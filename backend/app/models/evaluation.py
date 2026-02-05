from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class EvaluationDecision(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_INFO = "needs_info"
    PENDING = "pending"


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    extracted_course_id = Column(Integer, ForeignKey("extracted_courses.id"), nullable=False, unique=True)
    evaluator_id = Column(Integer, ForeignKey("users.id"))
    decision = Column(Enum(EvaluationDecision), default=EvaluationDecision.PENDING)
    approved_target_course_id = Column(Integer, ForeignKey("target_courses.id"))
    evaluator_notes = Column(Text)
    decided_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    extracted_course = relationship("ExtractedCourse", back_populates="evaluation")
    evaluator = relationship("User", back_populates="evaluations")
    approved_target_course = relationship("TargetCourse", back_populates="evaluations")
