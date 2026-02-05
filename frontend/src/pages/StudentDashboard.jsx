import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { studentApi } from '../services/api'
import {
  DocumentArrowUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'

const statusConfig = {
  pending: { label: 'Pending', class: 'badge-pending', icon: ClockIcon },
  processing: { label: 'Processing', class: 'badge-processing', icon: ClockIcon },
  ready_for_review: { label: 'Ready for Review', class: 'badge-processing', icon: ClockIcon },
  in_review: { label: 'In Review', class: 'badge-processing', icon: ClockIcon },
  completed: { label: 'Completed', class: 'badge-completed', icon: CheckCircleIcon },
  failed: { label: 'Failed', class: 'badge-failed', icon: ExclamationCircleIcon },
}

export default function StudentDashboard() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadSubmissions()
  }, [])

  const loadSubmissions = async () => {
    try {
      const response = await studentApi.getSubmissions()
      setSubmissions(response.data)
    } catch (err) {
      setError('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file')
      return
    }

    setError('')
    setUploadSuccess('')
    setUploading(true)

    try {
      const response = await studentApi.uploadTranscript(file)
      setUploadSuccess(`Transcript uploaded successfully! Submission ID: ${response.data.submission_id}`)
      loadSubmissions()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload transcript')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Transfer Credit Portal</h1>
        <p className="mt-2 text-gray-600">
          Upload your transcript to start the transfer credit evaluation process.
        </p>
      </div>

      {/* Upload Section */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Upload Transcript</h2>
        <p className="text-gray-600 mb-4">
          Upload your official transcript as a PDF file. Our AI will extract your courses and
          match them with equivalent courses at our university.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {uploadSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {uploadSuccess}
          </div>
        )}

        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="transcript-upload"
          />
          <label
            htmlFor="transcript-upload"
            className={`btn-primary flex items-center gap-2 cursor-pointer ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <DocumentArrowUpIcon className="h-5 w-5" />
            {uploading ? 'Uploading...' : 'Select PDF File'}
          </label>
          <span className="text-sm text-gray-500">Maximum file size: 50MB</span>
        </div>
      </div>

      {/* Submissions List */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">My Submissions</h2>

        {submissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DocumentArrowUpIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No submissions yet. Upload your transcript to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => {
              const status = statusConfig[submission.status] || statusConfig.pending
              const StatusIcon = status.icon

              return (
                <Link
                  key={submission.id}
                  to={`/student/submission/${submission.id}`}
                  className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {submission.transcript_filename || `Submission #${submission.id}`}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Courses: {submission.course_count} | Evaluated: {submission.evaluated_count}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${status.class} flex items-center gap-1`}>
                        <StatusIcon className="h-4 w-4" />
                        {status.label}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
