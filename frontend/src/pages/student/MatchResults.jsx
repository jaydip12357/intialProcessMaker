import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { matchingApi } from '../../services/api';
import {
    Brain,
    ArrowLeft,
    Loader2,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    BookOpen
} from 'lucide-react';

const MatchResults = () => {
    const { id } = useParams();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await matchingApi.getResults(id);
                setResults(response.data);
            } catch (err) {
                setError('Failed to load match results');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [id]);

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-emerald-600 bg-emerald-100';
        if (score >= 60) return 'text-amber-600 bg-amber-100';
        return 'text-red-600 bg-red-100';
    };

    const getScoreLabel = (score) => {
        if (score >= 80) return 'High Match';
        if (score >= 60) return 'Medium Match';
        return 'Low Match';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!results) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-slate-600">Results not found</p>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex items-center mb-8">
                <Link to={`/student/submission/${id}`} className="mr-4 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Match Results</h1>
                    <p className="text-slate-600">AI-generated course equivalency recommendations</p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Status Banner */}
            <div className="bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-100 rounded-2xl p-6 mb-6">
                <div className="flex items-center">
                    <Brain className="w-8 h-8 text-primary-600 mr-4" />
                    <div>
                        <h3 className="font-semibold text-slate-900">Analysis Complete</h3>
                        <p className="text-slate-600">Status: {results.status}</p>
                    </div>
                </div>
            </div>

            {/* Course Match Results */}
            <div className="space-y-8">
                {results.results?.map((courseResult, index) => (
                    <div key={index} className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        {/* Transfer Course Header */}
                        <div className="bg-slate-50 p-6 border-b border-slate-100">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mr-4">
                                    <BookOpen className="w-5 h-5 text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">
                                        {courseResult.transfer_course?.code && (
                                            <span className="font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-sm mr-2">
                                                {courseResult.transfer_course.code}
                                            </span>
                                        )}
                                        {courseResult.transfer_course?.name}
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        {courseResult.transfer_course?.credits && `${courseResult.transfer_course.credits} credits`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Matches */}
                        <div className="p-6">
                            <h4 className="font-medium text-slate-700 mb-4">Top Matches</h4>

                            {courseResult.matches?.length === 0 ? (
                                <p className="text-slate-500">No matches found for this course</p>
                            ) : (
                                <div className="space-y-4">
                                    {courseResult.matches?.map((match, i) => (
                                        <div key={match.id || i} className="border border-slate-200 rounded-xl p-5 hover:border-primary-200 transition-colors">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center mb-1">
                                                        <span className="font-mono text-sm bg-primary-100 text-primary-700 px-2 py-0.5 rounded mr-2">
                                                            {match.target_course?.code}
                                                        </span>
                                                        <span className="font-medium text-slate-900">{match.target_course?.name}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600">
                                                        {match.target_course?.department} • {match.target_course?.credits} credits
                                                    </p>
                                                </div>
                                                <div className={`flex items-center px-3 py-1 rounded-full ${getScoreColor(match.similarity_score)}`}>
                                                    <TrendingUp className="w-4 h-4 mr-1" />
                                                    <span className="font-semibold">{Math.round(match.similarity_score)}%</span>
                                                </div>
                                            </div>

                                            {/* Match Rank Badge */}
                                            <div className="flex items-center mb-3">
                                                <span className={`text-xs px-2 py-1 rounded ${getScoreColor(match.similarity_score)}`}>
                                                    #{match.rank} • {getScoreLabel(match.similarity_score)}
                                                </span>
                                            </div>

                                            {/* Explanation */}
                                            {match.explanation && (
                                                <div className="bg-slate-50 rounded-lg p-4 mb-3">
                                                    <p className="text-sm text-slate-700">{match.explanation}</p>
                                                </div>
                                            )}

                                            {/* Recommendation */}
                                            {match.recommendation && (
                                                <div className="flex items-start">
                                                    <CheckCircle2 className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                                                    <p className="text-sm text-slate-600">{match.recommendation}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {results.results?.length === 0 && (
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-12 text-center">
                    <Brain className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No results yet</h3>
                    <p className="text-slate-600">Analysis may still be processing. Please check back later.</p>
                </div>
            )}
        </div>
    );
};

export default MatchResults;
