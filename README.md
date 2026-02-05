# Course Copilot

A streamlined two-sided transfer credit evaluation platform built for the Duke AIPI Capstone × ProcessMaker partnership.

## 🎯 Overview

Course Copilot connects students seeking transfer credits with university course catalogs, using Gemini AI to match and evaluate course equivalencies.

## ✨ Features

### For Students
- Upload transcripts and syllabi
- Select target university
- Get AI-powered course matches
- Track evaluation status

### For Universities
- Upload course catalogs (CSV/Excel)
- Manage course descriptions
- Professor course management

### For Evaluators
- Review pending submissions
- See AI recommendations
- Approve/deny decisions

### For Admins
- System analytics
- User management
- All submissions overview

## 🛠️ Tech Stack

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL
- **Frontend**: React, Vite, Tailwind CSS
- **AI**: Google Gemini API
- **Deployment**: Docker, Railway

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local dev)
- Python 3.11+ (for local dev)

### Using Docker

```bash
# Clone and start
git clone <repo-url>
cd intialProcessMaker

# Set environment
cp backend/.env.example backend/.env
# Edit backend/.env with your GEMINI_API_KEY

# Run with Docker
docker-compose up --build
```

Access: Frontend at http://localhost, API at http://localhost:8000

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routers/       # API endpoints
│   │   ├── services/      # Gemini, PDF parser
│   │   └── utils/         # Auth utilities
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # Layout, shared
│   │   ├── context/       # Auth context
│   │   ├── pages/         # All portal pages
│   │   └── services/      # API client
│   └── package.json
└── docker-compose.yml
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/student/submissions` | GET/POST | Student submissions |
| `/api/universities` | GET | List universities |
| `/api/courses` | GET/POST | Course management |
| `/api/match/analyze` | POST | Trigger AI matching |
| `/api/evaluations/pending` | GET | Pending reviews |
| `/api/admin/analytics` | GET | System stats |

## 🔐 User Roles

- `student` - Submit courses for evaluation
- `professor` - Manage own courses
- `university_admin` - Manage all university courses
- `evaluator` - Review and decide on submissions
- `system_admin` - Full system access

## 📄 License

MIT
