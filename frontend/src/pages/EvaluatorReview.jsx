import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { evaluatorApi } from '../services/api'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline'

export default function EvaluatorReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [evaluatingCourseId, setEvaluatingCourseId] = useState(null)

  useEffect(() => {
    loadSubmission()
  }, [id])

  const loadSubmission = async () => {
    try {
      const response = await evaluatorApi.getSubmission(id)
      setSubmission(response.data)
    } catch (err) {
      setError('Failed to load submission')
    } finally {
      setLoading(false)
    }
  }

  const handleEvaluate = async (courseId, decision, targetCourseId = null, notes = '') => {
    setEvaluatingCourseId(courseId)
    try {
      await evaluatorApi.evaluate(courseId, {
        decision,
        approved_target_course_id: targetCourseId,
        notes,
      })
      loadSubmission()
    } catch (err) {
      console.error('Evaluation failed:', err)
    } finally {
      setEvaluatingCourseId(null)
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
        <Link to="/evaluator" className="btn-primary mt-4 inline-block">
          Back to Queue
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Link
        to="/evaluator"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back to Review Queue
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Transfer Credit Review</h1>
        <p className="mt-2 text-gray-600">
          Student: {submission.student_name} ({submission.student_email})
        </p>
        <p className="text-sm text-gray-500">
          Submitted: {new Date(submission.submitted_at).toLocaleString()}
        </p>
      </div>

      {/* Course Review Cards */}
      <div className="space-y-6">
        {submission.courses.map((course) => (
          <CourseReviewCard
            key={course.id}
            course={course}
            onEvaluate={handleEvaluate}
            isEvaluating={evaluatingCourseId === course.id}
          />
        ))}
      </div>

      {submission.courses.every(c => c.current_evaluation?.decision && c.current_evaluation.decision !== 'pending') && (
        <div className="mt-8 text-center">
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg inline-block">
            <CheckCircleIcon className="h-6 w-6 inline mr-2" />
            All courses have been evaluated!
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/evaluator')}
              className="btn-primary"
            >
              Return to Queue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CourseReviewCard({ course, onEvaluate, isEvaluating }) {
  const [notes, setNotes] = useState(course.current_evaluation?.notes || '')
  const [selectedMatch, setSelectedMatch] = useState(null)

  const currentDecision = course.current_evaluation?.decision

  const handleApprove = (match) => {
    onEvaluate(course.id, 'approved', match.target_course.id, notes)
  }

  const handleReject = () => {
    onEvaluate(course.id, 'rejected', null, notes)
  }

  const handleNeedsInfo = () => {
    onEvaluate(course.id, 'needs_info', null, notes)
  }

  return (
    <div className={`card ${currentDecision && currentDecision !== 'pending' ? 'border-l-4 border-green-500' : ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Course */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Source Course</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-900">
              {course.course_code}: {course.course_name}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {course.source_university} | {course.credits} credits | Grade: {course.grade || 'N/A'}
            </p>
            {course.course_description && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700">Description:</p>
                <p className="text-sm text-gray-600">{course.course_description}</p>
              </div>
            )}
            {course.learning_outcomes && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700">Learning Outcomes:</p>
                <p className="text-sm text-gray-600">{course.learning_outcomes}</p>
              </div>
            )}
            {course.has_syllabus && (
              <span className="inline-block mt-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                Syllabus Uploaded
              </span>
            )}
          </div>
        </div>

        {/* Suggested Matches */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Suggested Matches</h3>
          {course.matches.length === 0 ? (
            <p className="text-gray-500">No matches found</p>
          ) : (
            <div className="space-y-3">
              {course.matches.map((match) => (
                <div
                  key={match.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedMatch?.id === match.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                  onClick={() => setSelectedMatch(match)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {match.target_course.course_code}: {match.target_course.course_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {match.target_course.department} | {match.target_course.credits} credits
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      match.similarity_score >= 80
                        ? 'bg-green-100 text-green-800'
                        : match.similarity_score >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {match.similarity_score}% match
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{match.explanation}</p>
                  {match.key_similarities?.length > 0 && (
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Similar:</span>{' '}
                      {match.key_similarities.join(', ')}
                    </div>
                  )}
                  {match.important_differences?.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Differences:</span>{' '}
                      {match.important_differences.join(', ')}
                    </div>
                  )}

                  {selectedMatch?.id === match.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApprove(match)
                      }}
                      disabled={isEvaluating}
                      className="btn-success mt-3 w-full flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                      Approve Transfer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Evaluator Notes and Actions */}
      <div className="mt-6 pt-6 border-t">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Evaluator Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-field"
            rows={2}
            placeholder="Add any notes about your decision..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={isEvaluating}
            className="btn-danger flex items-center gap-2"
          >
            <XCircleIcon className="h-5 w-5" />
            Reject
          </button>
          <button
            onClick={handleNeedsInfo}
            disabled={isEvaluating}
            className="btn-secondary flex items-center gap-2"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
            Request More Info
          </button>
        </div>

        {currentDecision && currentDecision !== 'pending' && (
          <div className={`mt-4 p-3 rounded-lg ${
            currentDecision === 'approved' ? 'bg-green-50 text-green-700' :
            currentDecision === 'rejected' ? 'bg-red-50 text-red-700' :
            'bg-yellow-50 text-yellow-700'
          }`}>
            <strong>Current Decision:</strong> {currentDecision.replace('_', ' ')}
            {course.current_evaluation?.notes && (
              <p className="text-sm mt-1">{course.current_evaluation.notes}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
