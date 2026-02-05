import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    login: (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        return api.post('/api/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
    },
    register: (data) => api.post('/api/auth/register', data),
    getMe: () => api.get('/api/auth/me'),
};

// Student API
export const studentApi = {
    getSubmissions: () => api.get('/api/student/submissions'),
    getSubmission: (id) => api.get(`/api/student/submissions/${id}`),
    createSubmission: (data) => api.post('/api/student/submissions', data),
    uploadTranscript: (submissionId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/api/student/submissions/${submissionId}/upload-transcript`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    addCourse: (submissionId, data) => api.post(`/api/student/submissions/${submissionId}/courses`, data),
    uploadSyllabus: (submissionId, courseId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/api/student/submissions/${submissionId}/courses/${courseId}/upload-syllabus`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    submitForReview: (submissionId) => api.post(`/api/student/submissions/${submissionId}/submit`),
    getMatches: (submissionId) => api.get(`/api/student/submissions/${submissionId}/matches`),
};

// University API
export const universityApi = {
    getUniversities: () => api.get('/api/universities'),
    getUniversity: (id) => api.get(`/api/universities/${id}`),
    getCourses: (universityId) => api.get(`/api/universities/${universityId}/courses`),
};

// Course API
export const courseApi = {
    createCourse: (data) => api.post('/api/courses', data),
    bulkUpload: (universityId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/api/courses/bulk?university_id=${universityId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    getCourse: (id) => api.get(`/api/courses/${id}`),
    updateCourse: (id, data) => api.put(`/api/courses/${id}`, data),
    deleteCourse: (id) => api.delete(`/api/courses/${id}`),
};

// Matching API
export const matchingApi = {
    analyzeSubmission: (submissionId) => api.post('/api/match/analyze', { submission_id: submissionId }),
    getResults: (submissionId) => api.get(`/api/match/results/${submissionId}`),
};

// Evaluator API
export const evaluatorApi = {
    getPending: () => api.get('/api/evaluations/pending'),
    getSubmissionDetail: (submissionId) => api.get(`/api/evaluations/${submissionId}`),
    submitDecision: (submissionId, data) => api.post(`/api/evaluations/${submissionId}/decision`, data),
    getReports: () => api.get('/api/evaluations/reports/summary'),
};

// Admin API
export const adminApi = {
    getAnalytics: () => api.get('/api/admin/analytics'),
    getUsers: (role) => api.get(`/api/admin/users${role ? `?role=${role}` : ''}`),
    createUser: (data) => api.post('/api/admin/users', data),
    updateUser: (id, data) => api.put(`/api/admin/users/${id}`, data),
    deleteUser: (id) => api.delete(`/api/admin/users/${id}`),
    getAllSubmissions: (status) => api.get(`/api/admin/submissions${status ? `?status=${status}` : ''}`),
};

export default api;
