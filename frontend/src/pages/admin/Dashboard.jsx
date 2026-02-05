import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Users, BookOpen, Building2, FileText, CheckCircle2, Clock, BarChart3, Loader2 } from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await adminApi.getAnalytics();
                setStats(response.data);
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
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
                <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-600 mt-1">System overview</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4">
                    <Users className="w-6 h-6 text-primary-600 mb-2" />
                    <p className="text-2xl font-bold">{stats?.users?.total || 0}</p>
                    <p className="text-sm text-slate-600">Total Users</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4">
                    <Building2 className="w-6 h-6 text-accent-600 mb-2" />
                    <p className="text-2xl font-bold">{stats?.content?.universities || 0}</p>
                    <p className="text-sm text-slate-600">Universities</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4">
                    <BookOpen className="w-6 h-6 text-emerald-600 mb-2" />
                    <p className="text-2xl font-bold">{stats?.content?.courses || 0}</p>
                    <p className="text-sm text-slate-600">Courses</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4">
                    <FileText className="w-6 h-6 text-amber-600 mb-2" />
                    <p className="text-2xl font-bold">{stats?.submissions?.total || 0}</p>
                    <p className="text-sm text-slate-600">Submissions</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
                    <h3 className="font-semibold mb-4">Submissions Status</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                            <span className="flex items-center"><Clock className="w-4 h-4 mr-2 text-amber-600" />Pending</span>
                            <span className="font-bold">{stats?.submissions?.pending || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                            <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />Completed</span>
                            <span className="font-bold">{stats?.submissions?.completed || 0}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-6 text-white">
                    <h3 className="font-semibold mb-4">Evaluations</h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-3xl font-bold">{stats?.evaluations?.total || 0}</p>
                            <p className="opacity-80">Total</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold">{stats?.evaluations?.approval_rate || 0}%</p>
                            <p className="opacity-80">Approval Rate</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
