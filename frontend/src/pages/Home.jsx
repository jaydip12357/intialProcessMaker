import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    GraduationCap,
    Upload,
    Brain,
    CheckCircle2,
    ArrowRight,
    BookOpen,
    Users,
    Sparkles,
    Shield,
    Clock
} from 'lucide-react';

const Home = () => {
    const { user, isAuthenticated } = useAuth();

    const getDashboardLink = () => {
        if (!user) return '/login';
        switch (user.role) {
            case 'student': return '/student/dashboard';
            case 'professor':
            case 'university_admin': return '/university/dashboard';
            case 'evaluator': return '/evaluator/dashboard';
            case 'system_admin': return '/admin/dashboard';
            default: return '/login';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                                Course Copilot
                            </span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            {isAuthenticated ? (
                                <Link to={getDashboardLink()} className="btn-primary flex items-center">
                                    Go to Dashboard
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Link>
                            ) : (
                                <>
                                    <Link to="/login" className="text-slate-600 hover:text-primary-600 font-medium transition-colors">
                                        Sign In
                                    </Link>
                                    <Link to="/register" className="btn-primary">
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-16 pb-24">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-accent-600/10" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
                            <Sparkles className="w-4 h-4 mr-2" />
                            AI-Powered Transfer Credit Evaluation
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight mb-6">
                            Simplify Your
                            <span className="block bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                                Transfer Credit Journey
                            </span>
                        </h1>
                        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
                            Course Copilot connects students with universities, using AI to match and evaluate transfer credits faster than ever before.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/register" className="btn-primary text-lg px-8 py-4 flex items-center">
                                Start Your Evaluation
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                            <Link to="/login" className="btn-secondary text-lg px-8 py-4">
                                Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
                        <p className="text-xl text-slate-600">Three simple steps to evaluate your transfer credits</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Upload,
                                title: 'Upload Documents',
                                description: 'Submit your transcript and course syllabi. Our system extracts course information automatically.',
                                color: 'from-blue-500 to-blue-600'
                            },
                            {
                                icon: Brain,
                                title: 'AI Matching',
                                description: 'Our Gemini AI analyzes your courses and finds the best matches from the target university catalog.',
                                color: 'from-purple-500 to-purple-600'
                            },
                            {
                                icon: CheckCircle2,
                                title: 'Get Results',
                                description: 'Receive match recommendations with explanations and track your evaluation status in real-time.',
                                color: 'from-emerald-500 to-emerald-600'
                            }
                        ].map((step, index) => (
                            <div key={index} className="relative group">
                                <div className="bg-white rounded-2xl p-8 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                    <div className={`w-14 h-14 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center mb-6 shadow-lg`}>
                                        <step.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-900 mb-3">{step.title}</h3>
                                    <p className="text-slate-600">{step.description}</p>
                                </div>
                                {index < 2 && (
                                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                                        <ArrowRight className="w-8 h-8 text-slate-300" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Two-Sided Platform */}
            <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-slate-900 mb-4">A Platform for Everyone</h2>
                        <p className="text-xl text-slate-600">Built for students, universities, and evaluators</p>
                    </div>
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Student Side */}
                        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-primary-500/10 border border-primary-100">
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mr-4">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">For Students</h3>
                            </div>
                            <ul className="space-y-4">
                                {[
                                    'Upload transcripts and syllabi easily',
                                    'Select your target university',
                                    'Get AI-powered course matches',
                                    'Track evaluation status in real-time',
                                    'View detailed match explanations'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" />
                                        <span className="text-slate-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* University Side */}
                        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-accent-500/10 border border-accent-100">
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center mr-4">
                                    <BookOpen className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">For Universities</h3>
                            </div>
                            <ul className="space-y-4">
                                {[
                                    'Upload course catalogs via CSV/Excel',
                                    'Manage course descriptions and outcomes',
                                    'Professors can update their own courses',
                                    'Review and approve course matches',
                                    'Generate evaluation reports'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-accent-500 mr-3 mt-0.5 flex-shrink-0" />
                                        <span className="text-slate-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: Brain, title: 'AI-Powered', description: 'Gemini AI analyzes course content for accurate matching' },
                            { icon: Shield, title: 'Secure', description: 'Your documents and data are protected with enterprise security' },
                            { icon: Clock, title: 'Fast', description: 'Get match results in minutes, not weeks' },
                        ].map((feature, i) => (
                            <div key={i} className="text-center p-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <feature.icon className="w-8 h-8 text-primary-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                                <p className="text-slate-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                        <div className="flex items-center space-x-2 mb-4 md:mb-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-accent-400 rounded-lg flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-semibold">Course Copilot</span>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Duke AIPI Capstone Project × ProcessMaker
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
