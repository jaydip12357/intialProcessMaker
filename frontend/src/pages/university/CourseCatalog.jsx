import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { universityApi, courseApi } from '../../services/api';
import {
    BookOpen,
    PlusCircle,
    Edit2,
    Trash2,
    Loader2,
    AlertCircle,
    Search,
    X
} from 'lucide-react';

const CourseCatalog = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCourse, setNewCourse] = useState({
        code: '',
        name: '',
        department: '',
        credits: 3,
        description: '',
        learning_outcomes: '',
        prerequisites: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCourses();
    }, [user]);

    const fetchCourses = async () => {
        if (!user?.university_id) {
            setLoading(false);
            return;
        }

        try {
            const response = await universityApi.getCourses(user.university_id);
            setCourses(response.data);
        } catch (err) {
            setError('Failed to fetch courses');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCourse = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            await courseApi.createCourse({
                ...newCourse,
                university_id: user.university_id,
                credits: parseFloat(newCourse.credits)
            });
            setShowAddModal(false);
            setNewCourse({ code: '', name: '', department: '', credits: 3, description: '', learning_outcomes: '', prerequisites: '' });
            fetchCourses();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to add course');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCourse = async (courseId) => {
        if (!confirm('Are you sure you want to delete this course?')) return;

        try {
            await courseApi.deleteCourse(courseId);
            setCourses(courses.filter(c => c.id !== courseId));
        } catch (err) {
            setError('Failed to delete course');
        }
    };

    const filteredCourses = courses.filter(course =>
        course.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Course Catalog</h1>
                    <p className="text-slate-600 mt-1">Manage your university's course offerings</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 sm:mt-0 btn-primary inline-flex items-center"
                >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Add Course
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search courses by code, name, or department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
            </div>

            {/* Courses Table */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Code</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Department</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Credits</th>
                                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCourses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-slate-600">
                                        No courses found
                                    </td>
                                </tr>
                            ) : (
                                filteredCourses.map((course) => (
                                    <tr key={course.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                                                {course.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{course.name}</td>
                                        <td className="px-6 py-4 text-slate-600">{course.department || '-'}</td>
                                        <td className="px-6 py-4 text-slate-600">{course.credits}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteCourse(course.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Course Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h2 className="text-xl font-semibold text-slate-900">Add New Course</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddCourse} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Course Code *</label>
                                    <input
                                        type="text"
                                        value={newCourse.code}
                                        onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Credits *</label>
                                    <input
                                        type="number"
                                        value={newCourse.credits}
                                        onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Course Name *</label>
                                <input
                                    type="text"
                                    value={newCourse.name}
                                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                <input
                                    type="text"
                                    value={newCourse.department}
                                    onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    value={newCourse.description}
                                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    rows={3}
                                />
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 btn-primary flex items-center justify-center">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Course'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseCatalog;
