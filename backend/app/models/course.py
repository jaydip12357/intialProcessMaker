from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class ExtractedCourse(Base):
    __tablename__ = "extracted_courses"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    course_code = Column(String(50))
    course_name = Column(String(255))
    credits = Column(Numeric(3, 1))
    grade = Column(String(10))
    source_university = Column(String(255))
    syllabus_file_path = Column(String(500))
    syllabus_filename = Column(String(255))
    course_description = Column(Text)
    learning_outcomes = Column(Text)
    extracted_data = Column(JSON)  # Full Gemini extraction
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    submission = relationship("Submission", back_populates="extracted_courses")
    matches = relationship("CourseMatch", back_populates="extracted_course", cascade="all, delete-orphan")
    evaluation = relationship("Evaluation", back_populates="extracted_course", uselist=False)


class TargetCourse(Base):
    __tablename__ = "target_courses"

    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String(50), unique=True, nullable=False, index=True)
    course_name = Column(String(255), nullable=False)
    department = Column(String(100))
    credits = Column(Numeric(3, 1))
    description = Column(Text)
    prerequisites = Column(Text)
    learning_outcomes = Column(Text)
    course_level = Column(String(50))  # 'undergraduate', 'graduate'
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    matches = relationship("CourseMatch", back_populates="target_course")
    evaluations = relationship("Evaluation", back_populates="approved_target_course")


class CourseMatch(Base):
    __tablename__ = "course_matches"

    id = Column(Integer, primary_key=True, index=True)
    extracted_course_id = Column(Integer, ForeignKey("extracted_courses.id"), nullable=False)
    target_course_id = Column(Integer, ForeignKey("target_courses.id"), nullable=False)
    similarity_score = Column(Numeric(5, 2))  # 0-100
    match_explanation = Column(Text)
    match_rank = Column(Integer)  # 1, 2, 3 for top 3
    gemini_reasoning = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    extracted_course = relationship("ExtractedCourse", back_populates="matches")
    target_course = relationship("TargetCourse", back_populates="matches")
