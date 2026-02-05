import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (data) => api.post('/api/auth/login', data),
  register: (data) => api.post('/api/auth/register', data),
  me: () => api.get('/api/auth/me'),
  update: (data) => api.put('/api/auth/me', data),
}

// Student API
export const studentApi = {
  getSubmissions: () => api.get('/api/student/submissions'),
  getSubmission: (id) => api.get(`/api/student/submission/${id}`),
  getSubmissionStatus: (id) => api.get(`/api/student/submission/${id}/status`),
  uploadTranscript: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/student/upload-transcript', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadSyllabus: (courseId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/student/upload-syllabus/${courseId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// Evaluator API
export const evaluatorApi = {
  getPendingReviews: () => api.get('/api/evaluator/pending-reviews'),
  getSubmission: (id) => api.get(`/api/evaluator/submission/${id}`),
  evaluate: (courseId, data) => api.post(`/api/evaluator/evaluate/${courseId}`, data),
  updateDecision: (evaluationId, data) => api.put(`/api/evaluator/update-decision/${evaluationId}`, data),
  getMyEvaluations: () => api.get('/api/evaluator/my-evaluations'),
}

// Admin API
export const adminApi = {
  getTargetCourses: (params) => api.get('/api/admin/target-courses', { params }),
  createTargetCourse: (data) => api.post('/api/admin/target-courses', data),
  updateTargetCourse: (id, data) => api.put(`/api/admin/target-course/${id}`, data),
  uploadCatalog: (file, replace = false) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/admin/upload-catalog?replace=${replace}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getAnalytics: () => api.get('/api/admin/analytics'),
  getUsers: (params) => api.get('/api/admin/users', { params }),
  createUser: (data) => api.post('/api/admin/manage-users', data),
  updateUser: (id, data) => api.put(`/api/admin/manage-users/${id}`, data),
  deleteUser: (id) => api.delete(`/api/admin/manage-users/${id}`),
}

export default api
