import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../services/api'
import {
  UsersIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const response = await adminApi.getAnalytics()
      setAnalytics(response.data)
    } catch (err) {
      setError('Failed to load analytics')
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

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  const stats = [
    {
      name: 'Total Students',
      value: analytics?.total_students || 0,
      icon: UsersIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Evaluators',
      value: analytics?.total_evaluators || 0,
      icon: AcademicCapIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Total Submissions',
      value: analytics?.total_submissions || 0,
      icon: DocumentTextIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Pending Reviews',
      value: analytics?.pending_submissions || 0,
      icon: ClockIcon,
      color: 'bg-yellow-500',
    },
    {
      name: 'Completed',
      value: analytics?.completed_submissions || 0,
      icon: CheckBadgeIcon,
      color: 'bg-emerald-500',
    },
    {
      name: 'Approval Rate',
      value: `${analytics?.approval_rate || 0}%`,
      icon: ChartBarIcon,
      color: 'bg-indigo-500',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of the Course Copilot platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link to="/admin/catalog" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <AcademicCapIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Course Catalog</h3>
              <p className="text-sm text-gray-500">Manage target university courses</p>
            </div>
          </div>
        </Link>

        <Link to="/admin/users" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">User Management</h3>
              <p className="text-sm text-gray-500">Manage users and roles</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Submissions by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submissions by Status</h3>
          <div className="space-y-3">
            {analytics?.submissions_by_status && Object.entries(analytics.submissions_by_status).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                <span className="font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluations by Decision</h3>
          <div className="space-y-3">
            {analytics?.evaluations_by_decision && Object.entries(analytics.evaluations_by_decision).map(([decision, count]) => (
              <div key={decision} className="flex justify-between items-center">
                <span className={`capitalize ${
                  decision === 'approved' ? 'text-green-600' :
                  decision === 'rejected' ? 'text-red-600' :
                  decision === 'needs_info' ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  {decision.replace('_', ' ')}
                </span>
                <span className="font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {analytics?.recent_activity?.length === 0 ? (
          <p className="text-gray-500">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {analytics?.recent_activity?.map((activity, index) => (
              <div key={index} className="flex justify-between items-center border-b pb-2">
                <div>
                  <span className="font-medium text-gray-900">Submission #{activity.id}</span>
                  <span className="text-gray-500 ml-2">by {activity.student}</span>
                </div>
                <div className="text-right">
                  <span className={`badge ${
                    activity.status === 'completed' ? 'badge-completed' :
                    activity.status === 'failed' ? 'badge-failed' :
                    'badge-processing'
                  }`}>
                    {activity.status.replace('_', ' ')}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processing Time */}
      {analytics?.avg_processing_time_hours && (
        <div className="mt-6 card bg-primary-50 border border-primary-200">
          <p className="text-primary-700">
            <strong>Average Processing Time:</strong> {analytics.avg_processing_time_hours.toFixed(1)} hours
          </p>
        </div>
      )}
    </div>
  )
}
