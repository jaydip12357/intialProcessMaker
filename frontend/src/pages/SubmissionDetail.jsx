import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { studentApi } from '../services/api'
import {
  ArrowLeftIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

const decisionConfig = {
  approved: { label: 'Approved', class: 'text-green-600', icon: CheckCircleIcon },
  rejected: { label: 'Rejected', class: 'text-red-600', icon: XCircleIcon },
  needs_info: { label: 'More Info Needed', class: 'text-yellow-600', icon: QuestionMarkCircleIcon },
  pending: { label: 'Pending Review', class: 'text-gray-600', icon: ClockIcon },
}

export default function SubmissionDetail() {
  const { id } = useParams()
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadingCourseId, setUploadingCourseId] = useState(null)
  const fileInputRefs = useRef({})

  useEffect(() => {
    loadSubmission()
  }, [id])

  const loadSubmission = async () => {
    try {
      const response = await studentApi.getSubmission(id)
      setSubmission(response.data)
    } catch (err) {
      setError('Failed to load submission details')
    } finally {
      setLoading(false)
    }
  }

  const handleSyllabusUpload = async (courseId, file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      return
    }

    setUploadingCourseId(courseId)
    try {
      await studentApi.uploadSyllabus(courseId, file)
      loadSubmission()
    } catch (err) {
      console.error('Failed to upload syllabus:', err)
    } finally {
      setUploadingCourseId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Submission not found'}</p>
        <Link to="/student" className="btn-primary mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        to="/student"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {submission.transcript_filename || `Submission #${submission.id}`}
        </h1>
        <p className="mt-2 text-gray-600">
          Submitted: {new Date(submission.submitted_at).toLocaleString()}
        </p>
        <p className="text-sm text-gray-500 capitalize">Status: {submission.status.replace('_', ' ')}</p>
      </div>

      {/* Courses */}
      <div className="space-y-6">
        {submission.courses.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            <p>No courses extracted yet. Please wait for processing to complete.</p>
          </div>
        ) : (
          submission.courses.map((course) => {
            const evaluation = course.evaluation
            const decision = evaluation ? decisionConfig[evaluation.decision] : decisionConfig.pending
            const DecisionIcon = decision.icon

            return (
              <div key={course.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {course.course_code}: {course.course_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {course.source_university} | {course.credits} credits | Grade: {course.grade || 'N/A'}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 ${decision.class}`}>
                    <DecisionIcon className="h-5 w-5" />
                    <span className="font-medium">{decision.label}</span>
                  </div>
                </div>

                {/* Syllabus Upload */}
                {!course.has_syllabus && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700 mb-2">
                      Upload a syllabus to improve matching accuracy
                    </p>
                    <input
                      type="file"
                      ref={(el) => (fileInputRefs.current[course.id] = el)}
                      accept=".pdf"
                      onChange={(e) => handleSyllabusUpload(course.id, e.target.files[0])}
                      className="hidden"
                      id={`syllabus-${course.id}`}
                    />
                    <label
                      htmlFor={`syllabus-${course.id}`}
                      className={`btn-secondary text-sm flex items-center gap-1 w-fit cursor-pointer ${
                        uploadingCourseId === course.id ? 'opacity-50' : ''
                      }`}
                    >
                      <DocumentArrowUpIcon className="h-4 w-4" />
                      {uploadingCourseId === course.id ? 'Uploading...' : 'Upload Syllabus'}
                    </label>
                  </div>
                )}

                {/* Evaluation Result */}
                {evaluation && evaluation.decision === 'approved' && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      <strong>Approved Transfer:</strong> {evaluation.approved_course_code} - {evaluation.approved_course_name}
                    </p>
                    {evaluation.evaluator_notes && (
                      <p className="text-sm text-green-600 mt-1">
                        Notes: {evaluation.evaluator_notes}
                      </p>
                    )}
                  </div>
                )}

                {evaluation && evaluation.decision === 'rejected' && evaluation.evaluator_notes && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      <strong>Reason:</strong> {evaluation.evaluator_notes}
                    </p>
                  </div>
                )}

                {/* Suggested Matches */}
                {course.matches.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Suggested Matches</h4>
                    <div className="space-y-2">
                      {course.matches.map((match) => (
                        <div
                          key={match.id}
                          className="border-l-4 border-blue-400 pl-3 py-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">
                              {match.target_course_code}: {match.target_course_name}
                            </span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-sm">
                              {match.similarity_score}% match
                            </span>
                          </div>
                          {match.explanation && (
                            <p className="text-sm text-gray-600 mt-1">{match.explanation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {course.matches.length === 0 && !course.evaluation && (
                  <p className="text-sm text-gray-500">
                    No matches found yet. The system is still processing or no equivalent courses exist.
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
