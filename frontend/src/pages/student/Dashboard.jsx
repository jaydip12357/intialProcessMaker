import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentApi } from '../../services/api';
import {
    FileText,
    PlusCircle,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Loader2,
    Building2
} from 'lucide-react';

const Dashboard = () => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const response = await studentApi.getSubmissions();
                setSubmissions(response.data);
            } catch (err) {
                setError('Failed to load submissions');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSubmissions();
    }, []);

    const getStatusBadge = (status) => {
        const statusConfig = {
            draft: { color: 'bg-slate-100 text-slate-700', icon: FileText, label: 'Draft' },
            pending: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Pending' },
            processing: { color: 'bg-blue-100 text-blue-700', icon: Loader2, label: 'Processing' },
            in_review: { color: 'bg-purple-100 text-purple-700', icon: Clock, label: 'In Review' },
            completed: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: 'Completed' },
            rejected: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Rejected' },
        };
        const config = statusConfig[status] || statusConfig.draft;
        const Icon = config.icon;
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
                <Icon className="w-4 h-4 mr-1.5" />
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Submissions</h1>
                    <p className="text-slate-600 mt-1">Track your transfer credit evaluation requests</p>
                </div>
                <Link
                    to="/student/new-submission"
                    className="mt-4 sm:mt-0 btn-primary inline-flex items-center"
                >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    New Request
                </Link>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Empty State */}
            {submissions.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No submissions yet</h3>
                    <p className="text-slate-600 mb-6">Start your transfer credit evaluation journey</p>
                    <Link to="/student/new-submission" className="btn-primary inline-flex items-center">
                        <PlusCircle className="w-5 h-5 mr-2" />
                        Create Your First Request
                    </Link>
                </div>
            ) : (
                /* Submissions List */
                <div className="space-y-4">
                    {submissions.map((submission) => (
                        <Link
                            key={submission.id}
                            to={`/student/submission/${submission.id}`}
                            className="block bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center mb-2">
                                        <Building2 className="w-5 h-5 text-slate-400 mr-2" />
                                        <span className="font-semibold text-slate-900">
                                            Submission #{submission.id}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 text-sm mb-3">
                                        Target University ID: {submission.target_university_id}
                                    </p>
                                    <div className="flex items-center space-x-4">
                                        {getStatusBadge(submission.status)}
                                        <span className="text-sm text-slate-500">
                                            {submission.transfer_courses?.length || 0} courses
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            {new Date(submission.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
