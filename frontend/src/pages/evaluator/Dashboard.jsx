import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { evaluatorApi } from '../../services/api';
import {
    ClipboardCheck,
    Clock,
    CheckCircle2,
    ArrowRight,
    Loader2,
    AlertCircle,
    Users,
    FileText
} from 'lucide-react';

const Dashboard = () => {
    const [pending, setPending] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pendingRes, statsRes] = await Promise.all([
                    evaluatorApi.getPending(),
                    evaluatorApi.getReports()
                ]);
                setPending(pendingRes.data);
                setStats(statsRes.data);
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Evaluator Dashboard</h1>
                <p className="text-slate-600 mt-1">Review and evaluate transfer credit requests</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats?.submissions?.pending || 0}</p>
                    <p className="text-sm text-slate-600">Pending Reviews</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats?.submissions?.completed || 0}</p>
                    <p className="text-sm text-slate-600">Completed</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <ClipboardCheck className="w-5 h-5 text-primary-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats?.evaluations?.total || 0}</p>
                    <p className="text-sm text-slate-600">Total Evaluations</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle2 className="w-5 h-5 text-primary-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats?.evaluations?.approval_rate || 0}%</p>
                    <p className="text-sm text-slate-600">Approval Rate</p>
                </div>
            </div>

            {/* Pending Reviews */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Pending Reviews</h2>

                {pending.length === 0 ? (
                    <div className="text-center py-12">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">All caught up!</h3>
                        <p className="text-slate-600">No pending submissions to review</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pending.map((submission) => (
                            <Link
                                key={submission.id}
                                to={`/evaluator/review/${submission.id}`}
                                className="block p-5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center mb-2">
                                            <Users className="w-4 h-4 text-slate-400 mr-2" />
                                            <span className="font-medium text-slate-900">{submission.student_name}</span>
                                            <span className="mx-2 text-slate-400">•</span>
                                            <span className="text-slate-600">{submission.student_email}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-600">
                                            <span>{submission.target_university_name}</span>
                                            <span className="mx-2 text-slate-400">•</span>
                                            <span>{submission.transfer_courses_count} courses</span>
                                            <span className="mx-2 text-slate-400">•</span>
                                            <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
