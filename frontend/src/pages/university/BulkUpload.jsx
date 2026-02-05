import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { courseApi } from '../../services/api';
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Download
} from 'lucide-react';

const BulkUpload = () => {
    const { user } = useAuth();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const validTypes = ['.csv', '.xlsx', '.xls'];
            const extension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
            if (!validTypes.includes(extension)) {
                setError('Please upload a CSV or Excel file');
                return;
            }
            setFile(selectedFile);
            setError('');
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError('');

        try {
            const response = await courseApi.bulkUpload(user.university_id, file);
            setResult(response.data);
            setFile(null);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto animate-fadeIn">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Bulk Upload Courses</h1>
                <p className="text-slate-600 mt-1">Upload your course catalog via CSV or Excel file</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {result && (
                <div className="mb-6 p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center mb-4">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 mr-3" />
                        <h3 className="font-semibold text-emerald-900">Upload Complete!</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg">
                            <span className="text-slate-600">Created:</span>
                            <span className="ml-2 font-semibold text-emerald-700">{result.created}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                            <span className="text-slate-600">Skipped:</span>
                            <span className="ml-2 font-semibold text-amber-700">{result.skipped}</span>
                        </div>
                    </div>
                    {result.errors?.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm text-red-700 font-medium mb-2">Errors:</p>
                            <ul className="text-sm text-red-600 list-disc list-inside">
                                {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Format Instructions */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 mb-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">File Format</h2>
                <p className="text-slate-600 mb-4">
                    Your CSV or Excel file should have the following columns:
                </p>
                <div className="bg-slate-50 rounded-xl p-4 font-mono text-sm overflow-x-auto mb-4">
                    <code>course_code, course_name, department, credits, description, prerequisites, learning_outcomes, course_level</code>
                </div>
                <div className="text-sm text-slate-600">
                    <p className="mb-2"><strong>Required columns:</strong> course_code, course_name</p>
                    <p><strong>Optional columns:</strong> department, credits (default: 3), description, prerequisites, learning_outcomes, course_level</p>
                </div>
            </div>

            {/* Upload Area */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
                <label className={`flex flex-col items-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-primary-300 bg-primary-50' : 'border-slate-200 hover:border-primary-300'
                    }`}>
                    {file ? (
                        <>
                            <FileSpreadsheet className="w-12 h-12 text-primary-600 mb-4" />
                            <span className="font-medium text-slate-900">{file.name}</span>
                            <span className="text-sm text-slate-600 mt-1">
                                {(file.size / 1024).toFixed(1)} KB
                            </span>
                        </>
                    ) : (
                        <>
                            <Upload className="w-12 h-12 text-slate-400 mb-4" />
                            <span className="font-medium text-slate-900">Click to upload</span>
                            <span className="text-sm text-slate-600 mt-1">CSV or Excel file</span>
                        </>
                    )}
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </label>

                {file && (
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="w-full mt-4 btn-primary flex items-center justify-center"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5 mr-2" />
                                Upload Courses
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default BulkUpload;
