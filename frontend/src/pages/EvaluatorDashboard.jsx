import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { evaluatorApi } from '../services/api'
import { ClockIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function EvaluatorDashboard() {
  const [pendingReviews, setPendingReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPendingReviews()
  }, [])

  const loadPendingReviews = async () => {
    try {
      const response = await evaluatorApi.getPendingReviews()
      setPendingReviews(response.data)
    } catch (err) {
      setError('Failed to load pending reviews')
    } finally {
      setLoading(false)
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
        <h1 className="text-3xl font-bold text-gray-900">Review Queue</h1>
        <p className="mt-2 text-gray-600">
          Review and evaluate pending transfer credit submissions.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Pending Submissions</h2>
          <span className="badge badge-processing">
            {pendingReviews.length} pending
          </span>
        </div>

        {pendingReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DocumentMagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No submissions pending review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Courses
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pending
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingReviews.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{submission.student_name}</div>
                        <div className="text-sm text-gray-500">{submission.student_email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(submission.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {submission.course_count}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="badge badge-pending">
                        {submission.pending_evaluation_count} pending
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`badge ${
                        submission.status === 'in_review' ? 'badge-processing' : 'badge-pending'
                      }`}>
                        {submission.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <Link
                        to={`/evaluator/review/${submission.id}`}
                        className="btn-primary text-sm"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
