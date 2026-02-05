import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../services/api'
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export default function CourseCatalog() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const response = await adminApi.getTargetCourses()
      setCourses(response.data)
    } catch (err) {
      setError('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadStatus('Uploading...')
    try {
      const response = await adminApi.uploadCatalog(file, false)
      setUploadStatus(`Upload complete: ${response.data.added} added, ${response.data.updated} updated`)
      loadCourses()
    } catch (err) {
      setUploadStatus('Upload failed: ' + (err.response?.data?.detail || err.message))
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSaveCourse = async (courseData) => {
    try {
      if (editingCourse?.id) {
        await adminApi.updateTargetCourse(editingCourse.id, courseData)
      } else {
        await adminApi.createTargetCourse(courseData)
      }
      setShowModal(false)
      setEditingCourse(null)
      loadCourses()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save course')
    }
  }

  const openEditModal = (course = null) => {
    setEditingCourse(course)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back to Dashboard
      </Link>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Course Catalog</h1>
          <p className="mt-2 text-gray-600">
            Manage target university courses for transfer credit matching.
          </p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleCsvUpload}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="btn-secondary flex items-center gap-2 cursor-pointer"
          >
            <DocumentArrowUpIcon className="h-5 w-5" />
            Upload CSV
          </label>
          <button onClick={() => openEditModal()} className="btn-primary flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Add Course
          </button>
        </div>
      </div>

      {uploadStatus && (
        <div className={`mb-4 p-3 rounded-lg ${
          uploadStatus.includes('failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {uploadStatus}
          <button onClick={() => setUploadStatus('')} className="ml-2 font-bold">x</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {courses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No courses in catalog. Add courses or upload a CSV file.
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{course.course_code}</td>
                    <td className="px-4 py-3 text-gray-700">{course.course_name}</td>
                    <td className="px-4 py-3 text-gray-500">{course.department || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{course.credits || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{course.course_level || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${course.is_active ? 'badge-completed' : 'badge-failed'}`}>
                        {course.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditModal(course)}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course Modal */}
      {showModal && (
        <CourseModal
          course={editingCourse}
          onSave={handleSaveCourse}
          onClose={() => {
            setShowModal(false)
            setEditingCourse(null)
          }}
        />
      )}
    </div>
  )
}

function CourseModal({ course, onSave, onClose }) {
  const [formData, setFormData] = useState({
    course_code: course?.course_code || '',
    course_name: course?.course_name || '',
    department: course?.department || '',
    credits: course?.credits || '',
    description: course?.description || '',
    prerequisites: course?.prerequisites || '',
    learning_outcomes: course?.learning_outcomes || '',
    course_level: course?.course_level || 'undergraduate',
    is_active: course?.is_active ?? 1,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...formData,
      credits: formData.credits ? parseFloat(formData.credits) : null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {course?.id ? 'Edit Course' : 'Add New Course'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                required
                value={formData.course_code}
                onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                className="input-field"
                placeholder="e.g., CS 101"
                disabled={!!course?.id}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Name *
              </label>
              <input
                type="text"
                required
                value={formData.course_name}
                onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                className="input-field"
                placeholder="e.g., Introduction to Computer Science"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="input-field"
                placeholder="e.g., Computer Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                className="input-field"
                placeholder="e.g., 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={formData.course_level}
                onChange={(e) => setFormData({ ...formData, course_level: e.target.value })}
                className="input-field"
              >
                <option value="undergraduate">Undergraduate</option>
                <option value="graduate">Graduate</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Course description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prerequisites</label>
            <input
              type="text"
              value={formData.prerequisites}
              onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
              className="input-field"
              placeholder="e.g., MATH 100, CS 100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Learning Outcomes</label>
            <textarea
              value={formData.learning_outcomes}
              onChange={(e) => setFormData({ ...formData, learning_outcomes: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Learning outcomes..."
            />
          </div>

          {course?.id && (
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active === 1}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {course?.id ? 'Update' : 'Create'} Course
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
