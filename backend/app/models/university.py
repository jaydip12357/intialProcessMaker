"""University model for institution management."""
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class University(Base):
    """University/Institution model."""
    __tablename__ = "universities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    domain = Column(String(100), unique=True, nullable=False)  # For email verification
    description = Column(String(1000), nullable=True)
    location = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    users = relationship("User", back_populates="university")
    courses = relationship("Course", back_populates="university")
    submissions = relationship("StudentSubmission", back_populates="target_university")

    def __repr__(self):
        return f"<University(id={self.id}, name={self.name})>"
