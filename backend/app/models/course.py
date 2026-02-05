"""Course model for university course catalog."""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class CourseLevel(str, enum.Enum):
    """Course level enumeration."""
    UNDERGRADUATE = "undergraduate"
    GRADUATE = "graduate"
    DOCTORAL = "doctoral"


class Course(Base):
    """Course model for university course catalog."""
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    professor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Course Information
    code = Column(String(50), nullable=False, index=True)  # e.g., "CS101"
    name = Column(String(255), nullable=False)
    department = Column(String(100), nullable=True)
    credits = Column(Float, nullable=False, default=3.0)
    level = Column(Enum(CourseLevel), default=CourseLevel.UNDERGRADUATE)
    
    # Course Content
    description = Column(Text, nullable=True)
    learning_outcomes = Column(Text, nullable=True)
    prerequisites = Column(Text, nullable=True)
    syllabus_file_path = Column(String(500), nullable=True)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    university = relationship("University", back_populates="courses")
    professor = relationship("User", back_populates="courses")
    matches = relationship("CourseMatch", back_populates="target_course")

    def __repr__(self):
        return f"<Course(id={self.id}, code={self.code}, name={self.name})>"
