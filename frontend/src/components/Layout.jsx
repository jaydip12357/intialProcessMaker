import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    GraduationCap,
    LayoutDashboard,
    FileText,
    PlusCircle,
    Users,
    BookOpen,
    Upload,
    ClipboardCheck,
    BarChart3,
    LogOut,
    Menu,
    X,
    ChevronRight
} from 'lucide-react';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Navigation items based on user role
    const getNavItems = () => {
        switch (user?.role) {
            case 'student':
                return [
                    { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
                    { name: 'New Request', href: '/student/new-submission', icon: PlusCircle },
                ];
            case 'professor':
            case 'university_admin':
                return [
                    { name: 'Dashboard', href: '/university/dashboard', icon: LayoutDashboard },
                    { name: 'Course Catalog', href: '/university/courses', icon: BookOpen },
                    { name: 'Bulk Upload', href: '/university/bulk-upload', icon: Upload },
                ];
            case 'evaluator':
                return [
                    { name: 'Dashboard', href: '/evaluator/dashboard', icon: LayoutDashboard },
                ];
            case 'system_admin':
                return [
                    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
                    { name: 'User Management', href: '/admin/users', icon: Users },
                    { name: 'Evaluations', href: '/evaluator/dashboard', icon: ClipboardCheck },
                ];
            default:
                return [];
        }
    };

    const navItems = getNavItems();

    const getRoleBadge = () => {
        const roleColors = {
            student: 'bg-blue-100 text-blue-700',
            professor: 'bg-purple-100 text-purple-700',
            university_admin: 'bg-emerald-100 text-emerald-700',
            evaluator: 'bg-amber-100 text-amber-700',
            system_admin: 'bg-red-100 text-red-700',
        };
        const roleLabels = {
            student: 'Student',
            professor: 'Professor',
            university_admin: 'University Admin',
            evaluator: 'Evaluator',
            system_admin: 'System Admin',
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[user?.role] || 'bg-gray-100 text-gray-700'}`}>
                {roleLabels[user?.role] || user?.role}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                        <Link to="/" className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                                Course Copilot
                            </span>
                        </Link>
                        <button
                            className="lg:hidden text-slate-500 hover:text-slate-700"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* User Info */}
                    <div className="px-6 py-4 border-b border-slate-100">
                        <p className="font-medium text-slate-900">{user?.first_name} {user?.last_name}</p>
                        <p className="text-sm text-slate-500 mb-2">{user?.email}</p>
                        {getRoleBadge()}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                            ? 'bg-primary-50 text-primary-700 font-medium shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                                    {item.name}
                                    {isActive && <ChevronRight className="w-4 h-4 ml-auto text-primary-400" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="px-4 py-4 border-t border-slate-100">
                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200"
                        >
                            <LogOut className="w-5 h-5 mr-3" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
                    <div className="flex items-center justify-between px-4 lg:px-8 py-4">
                        <button
                            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex-1" />
                        <div className="flex items-center space-x-4">
                            {getRoleBadge()}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 lg:p-8">
                    <div className="animate-fadeIn">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
