from sqlalchemy.orm import Session
from app.models import ExtractedCourse, TargetCourse, CourseMatch, Submission
from app.models.submission import SubmissionStatus
from app.services.gemini_service import gemini_service


class SimilarityMatcher:
    def __init__(self, db: Session):
        self.db = db
        self.gemini = gemini_service

    async def match_courses_for_submission(self, submission_id: int) -> bool:
        """Match all extracted courses with target catalog for a submission"""
        try:
            # Update submission status
            submission = self.db.query(Submission).filter(
                Submission.id == submission_id
            ).first()

            if not submission:
                return False

            submission.status = SubmissionStatus.PROCESSING
            self.db.commit()

            # Get extracted courses
            extracted_courses = self.db.query(ExtractedCourse).filter(
                ExtractedCourse.submission_id == submission_id
            ).all()

            if not extracted_courses:
                submission.status = SubmissionStatus.FAILED
                submission.processing_error = "No courses extracted from transcript"
                self.db.commit()
                return False

            # Get target university catalog
            target_courses = self.db.query(TargetCourse).filter(
                TargetCourse.is_active == 1
            ).all()

            if not target_courses:
                # No target courses to match against - still mark as ready for review
                submission.status = SubmissionStatus.READY_FOR_REVIEW
                self.db.commit()
                return True

            # Convert target courses to dict format for Gemini
            target_dicts = [
                {
                    "id": tc.id,
                    "course_code": tc.course_code,
                    "course_name": tc.course_name,
                    "credits": float(tc.credits) if tc.credits else None,
                    "description": tc.description,
                    "learning_outcomes": tc.learning_outcomes
                }
                for tc in target_courses
            ]

            # Match each extracted course
            for ext_course in extracted_courses:
                await self._match_single_course(ext_course, target_dicts)

            # Update submission status
            submission.status = SubmissionStatus.READY_FOR_REVIEW
            self.db.commit()
            return True

        except Exception as e:
            print(f"Error matching courses: {e}")
            if submission:
                submission.status = SubmissionStatus.FAILED
                submission.processing_error = str(e)
                self.db.commit()
            return False

    async def _match_single_course(
        self,
        ext_course: ExtractedCourse,
        target_dicts: list[dict]
    ) -> None:
        """Find and save matches for a single extracted course"""
        # Prepare source course data
        source_dict = {
            "course_code": ext_course.course_code,
            "course_name": ext_course.course_name,
            "credits": float(ext_course.credits) if ext_course.credits else None,
            "course_description": ext_course.course_description,
            "learning_outcomes": ext_course.learning_outcomes
        }

        # Get matches from Gemini
        matches = await self.gemini.find_similar_courses(source_dict, target_dicts)

        # Delete existing matches for this course
        self.db.query(CourseMatch).filter(
            CourseMatch.extracted_course_id == ext_course.id
        ).delete()

        # Save new matches
        for rank, match in enumerate(matches, 1):
            course_match = CourseMatch(
                extracted_course_id=ext_course.id,
                target_course_id=match.get("target_course_id"),
                similarity_score=match.get("similarity_score", 0),
                match_explanation=match.get("explanation", ""),
                match_rank=rank,
                gemini_reasoning={
                    "key_similarities": match.get("key_similarities", []),
                    "important_differences": match.get("important_differences", [])
                }
            )
            self.db.add(course_match)

        self.db.commit()

    async def rematch_course(self, extracted_course_id: int) -> bool:
        """Re-run matching for a specific extracted course"""
        ext_course = self.db.query(ExtractedCourse).filter(
            ExtractedCourse.id == extracted_course_id
        ).first()

        if not ext_course:
            return False

        target_courses = self.db.query(TargetCourse).filter(
            TargetCourse.is_active == 1
        ).all()

        target_dicts = [
            {
                "id": tc.id,
                "course_code": tc.course_code,
                "course_name": tc.course_name,
                "credits": float(tc.credits) if tc.credits else None,
                "description": tc.description,
                "learning_outcomes": tc.learning_outcomes
            }
            for tc in target_courses
        ]

        await self._match_single_course(ext_course, target_dicts)
        return True
