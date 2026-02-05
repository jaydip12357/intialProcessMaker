import json
import re
from typing import Optional
import google.generativeai as genai
from app.config import settings


class GeminiService:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        else:
            self.model = None

    def _parse_json_response(self, response_text: str) -> dict | list:
        """Extract JSON from Gemini response"""
        # Try to find JSON in code blocks
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
        if json_match:
            return json.loads(json_match.group(1))

        # Try to parse the entire response as JSON
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            # Try to find JSON array or object
            array_match = re.search(r'\[[\s\S]*\]', response_text)
            if array_match:
                return json.loads(array_match.group())

            obj_match = re.search(r'\{[\s\S]*\}', response_text)
            if obj_match:
                return json.loads(obj_match.group())

        raise ValueError("Could not parse JSON from response")

    async def extract_transcript_data(self, pdf_text: str) -> list[dict]:
        """Extract structured course data from transcript text"""
        if not self.model:
            return self._mock_transcript_extraction()

        prompt = f"""
        Extract all courses from this university transcript.
        For each course, provide:
        - course_code (the course identifier, e.g., "CS 101", "MATH 200")
        - course_name (full course title)
        - credits (number of credit hours as a decimal)
        - grade (letter grade if available, or "N/A")
        - university_name (the name of the institution)

        Return ONLY a JSON array with no additional text. Example format:
        [
            {{"course_code": "CS 101", "course_name": "Introduction to Computer Science", "credits": 3.0, "grade": "A", "university_name": "Sample University"}}
        ]

        Transcript:
        {pdf_text}
        """

        try:
            response = self.model.generate_content(prompt)
            return self._parse_json_response(response.text)
        except Exception as e:
            print(f"Gemini extraction error: {e}")
            return []

    async def extract_course_details(self, syllabus_text: str) -> dict:
        """Extract detailed course information from syllabus"""
        if not self.model:
            return self._mock_syllabus_extraction()

        prompt = f"""
        Extract the following from this course syllabus:
        - course_description (concise summary, 2-3 sentences)
        - learning_outcomes (list of strings)
        - main_topics (list of main topics covered)
        - textbooks (list of required/recommended books)
        - assessment_methods (list of assessment types like "exams", "homework", "projects")

        Return ONLY a JSON object with no additional text. Example format:
        {{
            "course_description": "This course covers...",
            "learning_outcomes": ["Outcome 1", "Outcome 2"],
            "main_topics": ["Topic 1", "Topic 2"],
            "textbooks": ["Book 1", "Book 2"],
            "assessment_methods": ["Exams", "Projects"]
        }}

        Syllabus:
        {syllabus_text}
        """

        try:
            response = self.model.generate_content(prompt)
            return self._parse_json_response(response.text)
        except Exception as e:
            print(f"Gemini syllabus extraction error: {e}")
            return {}

    async def find_similar_courses(
        self,
        source_course: dict,
        target_courses: list[dict],
        top_n: int = 3
    ) -> list[dict]:
        """Find top N most similar target courses"""
        if not self.model or not target_courses:
            return []

        # Format target courses for the prompt
        target_list = "\n".join([
            f"ID: {tc['id']}, Code: {tc['course_code']}, Name: {tc['course_name']}, "
            f"Credits: {tc['credits']}, Description: {tc.get('description', 'N/A')}"
            for tc in target_courses
        ])

        prompt = f"""
        Compare this source course against the target courses and find the {top_n} best matches.

        Source Course:
        - Code: {source_course.get('course_code', 'N/A')}
        - Name: {source_course.get('course_name', 'N/A')}
        - Credits: {source_course.get('credits', 'N/A')}
        - Description: {source_course.get('course_description', 'N/A')}
        - Learning Outcomes: {source_course.get('learning_outcomes', 'N/A')}

        Target Courses:
        {target_list}

        Return ONLY a JSON array of the top {top_n} matches with:
        - target_course_id (the ID number)
        - similarity_score (0-100, based on content alignment)
        - explanation (brief explanation of why they match)
        - key_similarities (list of 2-3 similar aspects)
        - important_differences (list of any notable differences)

        Example format:
        [
            {{
                "target_course_id": 1,
                "similarity_score": 85,
                "explanation": "Both courses cover similar topics...",
                "key_similarities": ["Data structures", "Algorithms"],
                "important_differences": ["Source covers more theory"]
            }}
        ]

        Rank by similarity score, highest first.
        """

        try:
            response = self.model.generate_content(prompt)
            matches = self._parse_json_response(response.text)
            return matches[:top_n]
        except Exception as e:
            print(f"Gemini matching error: {e}")
            return []

    def _mock_transcript_extraction(self) -> list[dict]:
        """Mock data for testing without API key"""
        return [
            {
                "course_code": "CS 101",
                "course_name": "Introduction to Computer Science",
                "credits": 3.0,
                "grade": "A",
                "university_name": "Sample University"
            },
            {
                "course_code": "MATH 201",
                "course_name": "Calculus I",
                "credits": 4.0,
                "grade": "B+",
                "university_name": "Sample University"
            }
        ]

    def _mock_syllabus_extraction(self) -> dict:
        """Mock data for testing without API key"""
        return {
            "course_description": "This course provides an introduction to the field.",
            "learning_outcomes": ["Understand core concepts", "Apply theoretical knowledge"],
            "main_topics": ["Topic 1", "Topic 2", "Topic 3"],
            "textbooks": ["Required Textbook"],
            "assessment_methods": ["Exams", "Homework", "Projects"]
        }


# Singleton instance
gemini_service = GeminiService()
