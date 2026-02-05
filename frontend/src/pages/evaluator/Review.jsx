import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { evaluatorApi } from '../../services/api';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    HelpCircle,
    Loader2,
    AlertCircle,
    FileText,
    TrendingUp,
    BookOpen
} from 'lucide-react';

const Review = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSubmission = async () => {
            try {
                const response = await evaluatorApi.getSubmissionDetail(id);
                setSubmission(response.data);
            } catch (err) {
                setError('Failed to load submission');
            } finally {
                setLoading(false);
            }
        };
        fetchSubmission();
    }, [id]);

    const handleDecision = async (transferCourseId, decision, matchedCourseId = null, notes = '') => {
        setSaving(true);
        setError('');

        try {
            await evaluatorApi.submitDecision(id, {
                transfer_course_id: transferCourseId,
                decision,
                matched_course_id: matchedCourseId,
                notes
            });

            // Refresh data
            const response = await evaluatorApi.getSubmissionDetail(id);
            setSubmission(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to submit decision');
        } finally {
            setSaving(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-emerald-600 bg-emerald-100';
        if (score >= 60) return 'text-amber-600 bg-amber-100';
        return 'text-red-600 bg-red-100';
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

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex items-center mb-8">
                <Link to="/evaluator/dashboard" className="mr-4 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-slate-900">Review Submission #{submission.id}</h1>
                    <p className="text-slate-600">
                        {submission.student?.name} • {submission.target_university?.name}
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Student Info */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 mb-6">
                <h2 className="font-semibold text-slate-900 mb-4">Student Information</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-slate-600">Name:</span>
                        <p className="font-medium text-slate-900">{submission.student?.name}</p>
                    </div>
                    <div>
                        <span className="text-slate-600">Email:</span>
                        <p className="font-medium text-slate-900">{submission.student?.email}</p>
                    </div>
                    <div>
                        <span className="text-slate-600">Target University:</span>
                        <p className="font-medium text-slate-900">{submission.target_university?.name}</p>
                    </div>
                    <div>
                        <span className="text-slate-600">Submitted:</span>
                        <p className="font-medium text-slate-900">{new Date(submission.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* Courses to Evaluate */}
            <div className="space-y-6">
                {submission.transfer_courses?.map((course) => (
                    <div key={course.id} className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        {/* Course Header */}
                        <div className="bg-slate-50 p-6 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <BookOpen className="w-5 h-5 text-primary-600 mr-3" />
                                    <div>
                                        <h3 className="font-semibold text-slate-900">
                                            {course.course_code && (
                                                <span className="font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-sm mr-2">
                                                    {course.course_code}
                                                </span>
                                            )}
                                            {course.course_name}
                                        </h3>
                                        <p className="text-sm text-slate-600">
                                            {course.source_university_name && `From: ${course.source_university_name}`}
                                            {course.credits && ` • ${course.credits} credits`}
                                        </p>
                                    </div>
                                </div>
                                {course.evaluation && (
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${course.evaluation.decision === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                            course.evaluation.decision === 'denied' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                        }`}>
                                        {course.evaluation.decision}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* AI Matches */}
                        <div className="p-6">
                            <h4 className="font-medium text-slate-700 mb-4">AI Recommendations</h4>

                            {course.matches?.length === 0 ? (
                                <p className="text-slate-500">No match recommendations available</p>
                            ) : (
                                <div className="space-y-3">
                                    {course.matches?.map((match) => (
                                        <div key={match.id} className="border border-slate-200 rounded-xl p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center mb-1">
                                                        <span className="font-mono text-sm bg-primary-100 text-primary-700 px-2 py-0.5 rounded mr-2">
                                                            {match.target_course?.code}
                                                        </span>
                                                        <span className="font-medium text-slate-900">{match.target_course?.name}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-2">
                                                        {match.target_course?.department} • {match.target_course?.credits} credits
                                                    </p>
                                                    {match.explanation && (
                                                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{match.explanation}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center ml-4">
                                                    <span className={`flex items-center px-3 py-1 rounded-full ${getScoreColor(match.similarity_score)}`}>
                                                        <TrendingUp className="w-4 h-4 mr-1" />
                                                        {Math.round(match.similarity_score)}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Quick Approve Button */}
                                            {!course.evaluation && (
                                                <button
                                                    onClick={() => handleDecision(course.id, 'approved', match.target_course?.id, `Matched to ${match.target_course?.code}`)}
                                                    disabled={saving}
                                                    className="mt-3 text-sm px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors flex items-center"
                                                >
                                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                                    Approve as Equivalent
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Decision Buttons */}
                            {!course.evaluation && (
                                <div className="flex space-x-3 mt-6 pt-6 border-t border-slate-100">
                                    <button
                                        onClick={() => handleDecision(course.id, 'denied', null, 'No suitable equivalent found')}
                                        disabled={saving}
                                        className="flex-1 px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors flex items-center justify-center"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Deny Credit
                                    </button>
                                    <button
                                        onClick={() => handleDecision(course.id, 'more_info_needed', null, 'Additional documentation required')}
                                        disabled={saving}
                                        className="flex-1 px-4 py-3 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-colors flex items-center justify-center"
                                    >
                                        <HelpCircle className="w-4 h-4 mr-2" />
                                        Request More Info
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Review;
