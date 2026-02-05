import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { universityApi, courseApi } from '../../services/api';
import {
    BookOpen,
    Upload,
    PlusCircle,
    Loader2,
    AlertCircle,
    Building2
} from 'lucide-react';

const Dashboard = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, departments: [] });

    useEffect(() => {
        const fetchCourses = async () => {
            if (!user?.university_id) {
                setLoading(false);
                return;
            }

            try {
                const response = await universityApi.getCourses(user.university_id);
                setCourses(response.data);

                // Calculate stats
                const departments = [...new Set(response.data.map(c => c.department).filter(Boolean))];
                setStats({
                    total: response.data.length,
                    departments
                });
            } catch (err) {
                console.error('Failed to fetch courses:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [user]);

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
                <h1 className="text-3xl font-bold text-slate-900">University Dashboard</h1>
                <p className="text-slate-600 mt-1">Manage your course catalog and materials</p>
            </div>

            {!user?.university_id && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start">
                    <AlertCircle className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" />
                    <p className="text-amber-700">You are not associated with a university. Contact an admin to assign you.</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-primary-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                    <p className="text-slate-600">Total Courses</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-accent-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats.departments.length}</p>
                    <p className="text-slate-600">Departments</p>
                </div>

                <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-6 text-white">
                    <h3 className="font-semibold mb-2">Quick Actions</h3>
                    <div className="space-y-2">
                        <Link to="/university/bulk-upload" className="flex items-center text-white/90 hover:text-white">
                            <Upload className="w-4 h-4 mr-2" />
                            Bulk Upload Courses
                        </Link>
                        <Link to="/university/courses" className="flex items-center text-white/90 hover:text-white">
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Add Single Course
                        </Link>
                    </div>
                </div>
            </div>

            {/* Recent Courses */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900">Recent Courses</h2>
                    <Link to="/university/courses" className="text-primary-600 hover:text-primary-700 font-medium">
                        View All
                    </Link>
                </div>

                {courses.length === 0 ? (
                    <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600">No courses yet</p>
                        <Link to="/university/bulk-upload" className="text-primary-600 hover:text-primary-700 font-medium">
                            Upload your course catalog
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {courses.slice(0, 5).map((course) => (
                            <div key={course.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                <div>
                                    <span className="font-mono text-sm bg-slate-200 text-slate-700 px-2 py-0.5 rounded mr-2">
                                        {course.code}
                                    </span>
                                    <span className="text-slate-900">{course.name}</span>
                                </div>
                                <span className="text-sm text-slate-600">{course.credits} credits</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
