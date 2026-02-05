"""User model for authentication and authorization."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    """User role enumeration."""
    STUDENT = "student"
    PROFESSOR = "professor"
    UNIVERSITY_ADMIN = "university_admin"
    EVALUATOR = "evaluator"
    SYSTEM_ADMIN = "system_admin"


class User(Base):
    """User model for all platform users."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=True)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    university = relationship("University", back_populates="users")
    submissions = relationship("StudentSubmission", back_populates="student")
    evaluations = relationship("Evaluation", back_populates="evaluator")
    courses = relationship("Course", back_populates="professor")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
