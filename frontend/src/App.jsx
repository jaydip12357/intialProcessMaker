import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import Layout from './components/Layout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/student/Dashboard';
import NewSubmission from './pages/student/NewSubmission';
import SubmissionDetail from './pages/student/SubmissionDetail';
import MatchResults from './pages/student/MatchResults';
import UniversityDashboard from './pages/university/Dashboard';
import CourseCatalog from './pages/university/CourseCatalog';
import BulkUpload from './pages/university/BulkUpload';
import EvaluatorDashboard from './pages/evaluator/Dashboard';
import EvaluatorReview from './pages/evaluator/Review';
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

function App() {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading Course Copilot...</p>
                </div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Student Routes */}
            <Route
                path="/student/*"
                element={
                    <ProtectedRoute allowedRoles={['student']}>
                        <Layout>
                            <Routes>
                                <Route path="dashboard" element={<StudentDashboard />} />
                                <Route path="new-submission" element={<NewSubmission />} />
                                <Route path="submission/:id" element={<SubmissionDetail />} />
                                <Route path="submission/:id/matches" element={<MatchResults />} />
                            </Routes>
                        </Layout>
                    </ProtectedRoute>
                }
            />

            {/* University Admin/Professor Routes */}
            <Route
                path="/university/*"
                element={
                    <ProtectedRoute allowedRoles={['university_admin', 'professor']}>
                        <Layout>
                            <Routes>
                                <Route path="dashboard" element={<UniversityDashboard />} />
                                <Route path="courses" element={<CourseCatalog />} />
                                <Route path="bulk-upload" element={<BulkUpload />} />
                            </Routes>
                        </Layout>
                    </ProtectedRoute>
                }
            />

            {/* Evaluator Routes */}
            <Route
                path="/evaluator/*"
                element={
                    <ProtectedRoute allowedRoles={['evaluator', 'system_admin']}>
                        <Layout>
                            <Routes>
                                <Route path="dashboard" element={<EvaluatorDashboard />} />
                                <Route path="review/:id" element={<EvaluatorReview />} />
                            </Routes>
                        </Layout>
                    </ProtectedRoute>
                }
            />

            {/* Admin Routes */}
            <Route
                path="/admin/*"
                element={
                    <ProtectedRoute allowedRoles={['system_admin']}>
                        <Layout>
                            <Routes>
                                <Route path="dashboard" element={<AdminDashboard />} />
                                <Route path="users" element={<UserManagement />} />
                            </Routes>
                        </Layout>
                    </ProtectedRoute>
                }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
