import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/common/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import StudentDashboard from './pages/StudentDashboard'
import SubmissionDetail from './pages/SubmissionDetail'
import EvaluatorDashboard from './pages/EvaluatorDashboard'
import EvaluatorReview from './pages/EvaluatorReview'
import AdminDashboard from './pages/AdminDashboard'
import CourseCatalog from './pages/CourseCatalog'
import UserManagement from './pages/UserManagement'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  const { user } = useAuth()

  const getDefaultRoute = () => {
    if (!user) return '/login'
    switch (user.role) {
      case 'admin':
        return '/admin'
      case 'evaluator':
        return '/evaluator'
      default:
        return '/student'
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student', 'evaluator', 'admin']}>
            <Layout>
              <StudentDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/submission/:id"
        element={
          <ProtectedRoute allowedRoles={['student', 'evaluator', 'admin']}>
            <Layout>
              <SubmissionDetail />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Evaluator Routes */}
      <Route
        path="/evaluator"
        element={
          <ProtectedRoute allowedRoles={['evaluator', 'admin']}>
            <Layout>
              <EvaluatorDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluator/review/:id"
        element={
          <ProtectedRoute allowedRoles={['evaluator', 'admin']}>
            <Layout>
              <EvaluatorReview />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/catalog"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <CourseCatalog />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <UserManagement />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}
