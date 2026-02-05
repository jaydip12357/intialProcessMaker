# Course Copilot - Transfer Credit Evaluation Platform

A full-stack web platform that automates university transfer credit evaluation. Students upload transcripts and course materials; administrators and professors review and make decisions through an intelligent AI-assisted workflow.

## Tech Stack

- **Backend**: Python FastAPI
- **Frontend**: React + Tailwind CSS
- **AI**: Google Gemini API (gemini-2.0-flash-exp)
- **Database**: PostgreSQL
- **Deployment**: Railway

## Features

### Student Portal
- Create account and login
- Upload transcripts (PDF)
- Upload course syllabi/materials (PDF)
- Track evaluation status
- View evaluation results and suggested course matches

### Evaluator Portal
- View pending student submissions
- Review AI-generated course matches
- See similarity scores and explanations
- Approve/reject/request more info
- Add evaluation notes

### Administrator Portal
- Manage target university course catalog
- Upload/update course database via CSV
- Manage user accounts
- View system analytics

## Project Structure

```
course-copilot/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application
│   │   ├── config.py               # Configuration settings
│   │   ├── database.py             # Database connection
│   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── submission.py
│   │   │   ├── course.py
│   │   │   └── evaluation.py
│   │   ├── routers/                # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── students.py
│   │   │   ├── uploads.py
│   │   │   ├── evaluations.py
│   │   │   └── admin.py
│   │   ├── services/
│   │   │   ├── gemini_service.py   # Gemini API integration
│   │   │   ├── pdf_parser.py       # PDF text extraction
│   │   │   └── similarity.py       # Course matching
│   │   └── utils/
│   │       └── auth.py             # JWT authentication
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── common/
│   │   │       └── Layout.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── SubmissionDetail.jsx
│   │   │   ├── EvaluatorDashboard.jsx
│   │   │   ├── EvaluatorReview.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── CourseCatalog.jsx
│   │   │   └── UserManagement.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── Dockerfile
├── railway.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info
- `PUT /api/auth/me` - Update current user

### Student
- `POST /api/student/upload-transcript` - Upload transcript PDF
- `POST /api/student/upload-syllabus/{course_id}` - Upload syllabus for a course
- `GET /api/student/submissions` - Get all submissions
- `GET /api/student/submission/{id}` - Get submission details
- `GET /api/student/submission/{id}/status` - Get processing status

### Evaluator
- `GET /api/evaluator/pending-reviews` - Get pending submissions
- `GET /api/evaluator/submission/{id}` - Get submission for review
- `POST /api/evaluator/evaluate/{course_id}` - Make evaluation decision
- `PUT /api/evaluator/update-decision/{evaluation_id}` - Update decision
- `GET /api/evaluator/my-evaluations` - Get own evaluations

### Admin
- `GET /api/admin/target-courses` - Get course catalog
- `POST /api/admin/target-courses` - Add new course
- `PUT /api/admin/target-course/{id}` - Update course
- `POST /api/admin/upload-catalog` - Upload CSV catalog
- `GET /api/admin/analytics` - Get system analytics
- `GET /api/admin/users` - Get all users
- `POST /api/admin/manage-users` - Create user
- `PUT /api/admin/manage-users/{id}` - Update user
- `DELETE /api/admin/manage-users/{id}` - Delete user

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your settings

# Run the server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (optional for local dev)
cp .env.example .env

# Run development server
npm run dev
```

### Environment Variables

#### Backend (.env)
```
DATABASE_URL=postgresql://localhost/course_copilot
JWT_SECRET=your-secret-key-change-in-production
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=/app/uploads
```

#### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

## Railway Deployment

1. Create a new Railway project
2. Add PostgreSQL service
3. Deploy backend service:
   - Set root directory to `backend`
   - Configure environment variables
4. Deploy frontend service:
   - Set root directory to `frontend`
   - Set `VITE_API_URL` to backend URL

## Course Catalog CSV Format

When uploading a course catalog, use the following CSV format:

```csv
course_code,course_name,department,credits,description,prerequisites,learning_outcomes,course_level
CS101,Introduction to Computer Science,Computer Science,3,Introduction to programming and computational thinking,,Understand basic programming concepts,undergraduate
```

## User Roles

- **Student**: Can upload transcripts, view submissions and evaluation results
- **Evaluator**: Can review submissions and make evaluation decisions
- **Admin**: Full access including user management and course catalog

## AI-Powered Features

The platform uses Google Gemini API for:

1. **Transcript Extraction**: Automatically extracts course information from uploaded transcript PDFs
2. **Syllabus Analysis**: Extracts detailed course information from syllabi
3. **Course Matching**: Finds similar target courses and provides match explanations

## License

MIT License
