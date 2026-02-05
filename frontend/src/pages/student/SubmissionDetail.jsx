import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { studentApi, matchingApi } from '../../services/api';
import {
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Brain,
    ArrowRight,
    Loader2,
    RefreshCw
} from 'lucide-react';

const SubmissionDetail = () => {
    const { id } = useParams();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');

    const fetchSubmission = async () => {
        try {
            const response = await studentApi.getSubmission(id);
            setSubmission(response.data);
        } catch (err) {
            setError('Failed to load submission');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmission();
    }, [id]);

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            await matchingApi.analyzeSubmission(id);
            // Refresh after a short delay
            setTimeout(fetchSubmission, 2000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to start analysis');
        } finally {
            setAnalyzing(false);
        }
    };

    const getStatusConfig = (status) => {
        const configs = {
            draft: { color: 'bg-slate-100 text-slate-700', icon: FileText, label: 'Draft' },
            pending: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Pending' },
            processing: { color: 'bg-blue-100 text-blue-700', icon: Loader2, label: 'Processing' },
            in_review: { color: 'bg-purple-100 text-purple-700', icon: Clock, label: 'In Review' },
            completed: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: 'Completed' },
            rejected: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Rejected' },
        };
        return configs[status] || configs.draft;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-slate-600">Submission not found</p>
            </div>
        );
    }

    const statusConfig = getStatusConfig(submission.status);
    const StatusIcon = statusConfig.icon;

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Submission #{submission.id}</h1>
                    <p className="text-slate-600 mt-1">
                        Created {new Date(submission.created_at).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${statusConfig.color}`}>
                        <StatusIcon className="w-4 h-4 mr-2" />
                        {statusConfig.label}
                    </span>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Actions Card */}
            {submission.status === 'pending' && (
                <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-6 mb-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Brain className="w-8 h-8 mr-4" />
                            <div>
                                <h3 className="font-semibold text-lg">Ready for AI Analysis</h3>
                                <p className="opacity-90">Get course match recommendations powered by Gemini AI</p>
                            </div>
                        </div>
                        <button
                            onClick={handleAnalyze}
                            disabled={analyzing}
                            className="bg-white text-primary-600 px-6 py-3 rounded-xl font-medium hover:bg-opacity-90 transition-all flex items-center disabled:opacity-50"
                        >
                            {analyzing ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Brain className="w-5 h-5 mr-2" />
                            )}
                            {analyzing ? 'Analyzing...' : 'Run Analysis'}
                        </button>
                    </div>
                </div>
            )}

            {/* View Results Button */}
            {(submission.status === 'in_review' || submission.status === 'completed') && (
                <Link
                    to={`/student/submission/${id}/matches`}
                    className="block bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 mb-6 hover:shadow-xl transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mr-4">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">View Match Results</h3>
                                <p className="text-slate-600">See AI-generated course matches and recommendations</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                    </div>
                </Link>
            )}

            {/* Transfer Courses */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                    Transfer Courses ({submission.transfer_courses?.length || 0})
                </h2>

                {submission.transfer_courses?.length === 0 ? (
                    <p className="text-slate-600">No courses added yet</p>
                ) : (
                    <div className="space-y-4">
                        {submission.transfer_courses?.map((course) => (
                            <div key={course.id} className="p-4 bg-slate-50 rounded-xl">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center mb-1">
                                            {course.course_code && (
                                                <span className="font-mono text-sm bg-slate-200 text-slate-700 px-2 py-0.5 rounded mr-2">
                                                    {course.course_code}
                                                </span>
                                            )}
                                            <h3 className="font-medium text-slate-900">{course.course_name}</h3>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-600 space-x-4">
                                            {course.credits && <span>{course.credits} credits</span>}
                                            {course.grade && <span>Grade: {course.grade}</span>}
                                            {course.source_university_name && <span>From: {course.source_university_name}</span>}
                                        </div>
                                        {course.additional_notes && (
                                            <p className="text-sm text-slate-500 mt-2">{course.additional_notes}</p>
                                        )}
                                    </div>
                                    {course.syllabus_file_path && (
                                        <FileText className="w-5 h-5 text-primary-600" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubmissionDetail;
