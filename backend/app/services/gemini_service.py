"""Gemini AI service for course matching and analysis."""
import google.generativeai as genai
import json
from typing import List, Dict, Any, Optional
from app.config import get_settings

settings = get_settings()


class GeminiService:
    """Service for interacting with Google Gemini API."""
    
    def __init__(self):
        """Initialize Gemini client."""
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        else:
            self.model = None
    
    async def analyze_course_matches(
        self,
        transfer_course: Dict[str, Any],
        target_courses: List[Dict[str, Any]],
        top_n: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Analyze and rank course matches using Gemini AI.
        
        Args:
            transfer_course: The student's transfer course info
            target_courses: List of target university courses
            top_n: Number of top matches to return
            
        Returns:
            List of matched courses with scores and explanations
        """
        if not self.model:
            # Return mock data if no API key
            return self._generate_mock_matches(target_courses, top_n)
        
        # Build prompt
        prompt = self._build_matching_prompt(transfer_course, target_courses)
        
        try:
            response = self.model.generate_content(prompt)
            result = self._parse_matching_response(response.text)
            return result[:top_n]
        except Exception as e:
            print(f"Gemini API error: {e}")
            return self._generate_mock_matches(target_courses, top_n)
    
    def _build_matching_prompt(
        self,
        transfer_course: Dict[str, Any],
        target_courses: List[Dict[str, Any]]
    ) -> str:
        """Build the prompt for course matching."""
        # Format target courses
        target_list = ""
        for i, course in enumerate(target_courses):
            target_list += f"""
Course {i + 1}:
- ID: {course.get('id')}
- Code: {course.get('code', 'N/A')}
- Name: {course.get('name', 'N/A')}
- Credits: {course.get('credits', 'N/A')}
- Department: {course.get('department', 'N/A')}
- Description: {course.get('description', 'N/A')[:500] if course.get('description') else 'N/A'}
- Learning Outcomes: {course.get('learning_outcomes', 'N/A')[:300] if course.get('learning_outcomes') else 'N/A'}
"""
        
        prompt = f"""You are a university course evaluator. Compare the following transfer course 
with the target university's courses and provide the top 5 matches.

TRANSFER COURSE:
- Code: {transfer_course.get('course_code', 'N/A')}
- Name: {transfer_course.get('course_name', 'N/A')}
- Credits: {transfer_course.get('credits', 'N/A')}
- Source University: {transfer_course.get('source_university_name', 'N/A')}
- Description/Syllabus Content: {transfer_course.get('syllabus_text', 'N/A')[:1000] if transfer_course.get('syllabus_text') else 'N/A'}
- Additional Notes: {transfer_course.get('additional_notes', 'N/A')}

TARGET UNIVERSITY COURSES:
{target_list}

For each match, provide:
1. Similarity score (0-100%)
2. Explanation of similarities
3. Key similarities (as a list)
4. Key differences (as a list)
5. Recommendation

IMPORTANT: Return your response as a valid JSON array with the following structure:
{{
  "matches": [
    {{
      "target_course_id": <integer>,
      "similarity_score": <number 0-100>,
      "explanation": "<string>",
      "key_similarities": ["<string>", ...],
      "key_differences": ["<string>", ...],
      "recommendation": "<string>"
    }}
  ]
}}

Return only the JSON, no additional text."""

        return prompt
    
    def _parse_matching_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse the Gemini response into structured match data."""
        try:
            # Clean up response text
            text = response_text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            data = json.loads(text)
            matches = data.get("matches", [])
            
            # Add ranking
            for i, match in enumerate(matches):
                match["rank"] = i + 1
                match["key_similarities"] = json.dumps(match.get("key_similarities", []))
                match["key_differences"] = json.dumps(match.get("key_differences", []))
            
            return matches
            
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            return []
    
    def _generate_mock_matches(
        self,
        target_courses: List[Dict[str, Any]],
        top_n: int
    ) -> List[Dict[str, Any]]:
        """Generate mock matches when API is unavailable."""
        mock_matches = []
        for i, course in enumerate(target_courses[:top_n]):
            mock_matches.append({
                "target_course_id": course.get("id"),
                "similarity_score": max(95 - (i * 10), 50),
                "explanation": f"This course appears to cover similar topics based on the course name and description.",
                "key_similarities": json.dumps(["Subject area", "Credit hours", "Course level"]),
                "key_differences": json.dumps(["Specific topics may vary", "Different prerequisites"]),
                "recommendation": "Manual review recommended to confirm equivalency.",
                "rank": i + 1
            })
        return mock_matches
    
    async def extract_transcript_courses(self, transcript_text: str) -> List[Dict[str, Any]]:
        """Extract course information from transcript text."""
        if not self.model:
            return []
        
        prompt = f"""Extract all courses from this transcript text. For each course, identify:
- Course code (e.g., "CS101")
- Course name
- Credits
- Grade (if available)

Transcript text:
{transcript_text[:5000]}

Return as a JSON array:
{{
  "courses": [
    {{
      "course_code": "<string>",
      "course_name": "<string>",
      "credits": <number or null>,
      "grade": "<string or null>"
    }}
  ]
}}

Return only the JSON, no additional text."""

        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            data = json.loads(text.strip())
            return data.get("courses", [])
        except Exception as e:
            print(f"Transcript extraction error: {e}")
            return []


# Singleton instance
gemini_service = GeminiService()
