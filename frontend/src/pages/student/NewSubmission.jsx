import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentApi, universityApi } from '../../services/api';
import {
    Building2,
    Upload,
    PlusCircle,
    Trash2,
    FileText,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ArrowRight
} from 'lucide-react';

const NewSubmission = () => {
    const [step, setStep] = useState(1);
    const [universities, setUniversities] = useState([]);
    const [selectedUniversity, setSelectedUniversity] = useState('');
    const [submission, setSubmission] = useState(null);
    const [transcriptFile, setTranscriptFile] = useState(null);
    const [courses, setCourses] = useState([]);
    const [newCourse, setNewCourse] = useState({
        course_code: '',
        course_name: '',
        credits: '',
        grade: '',
        source_university_name: '',
        additional_notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUniversities = async () => {
            try {
                const response = await universityApi.getUniversities();
                setUniversities(response.data);
            } catch (err) {
                console.error('Failed to fetch universities:', err);
            }
        };
        fetchUniversities();
    }, []);

    const handleCreateSubmission = async () => {
        if (!selectedUniversity) {
            setError('Please select a target university');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await studentApi.createSubmission({
                target_university_id: parseInt(selectedUniversity)
            });
            setSubmission(response.data);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create submission');
        } finally {
            setLoading(false);
        }
    };

    const handleTranscriptUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError('');

        try {
            await studentApi.uploadTranscript(submission.id, file);
            setTranscriptFile(file);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to upload transcript');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCourse = async () => {
        if (!newCourse.course_name) {
            setError('Course name is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await studentApi.addCourse(submission.id, {
                ...newCourse,
                credits: newCourse.credits ? parseFloat(newCourse.credits) : null
            });
            setCourses([...courses, response.data]);
            setNewCourse({
                course_code: '',
                course_name: '',
                credits: '',
                grade: '',
                source_university_name: '',
                additional_notes: ''
            });
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to add course');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (courses.length === 0) {
            setError('Please add at least one course');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await studentApi.submitForReview(submission.id);
            navigate(`/student/submission/${submission.id}`);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to submit');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto animate-fadeIn">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">New Transfer Credit Request</h1>
            <p className="text-slate-600 mb-8">Submit your courses for transfer credit evaluation</p>

            {/* Progress Steps */}
            <div className="flex items-center mb-8">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= s ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                            {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                        </div>
                        {s < 3 && (
                            <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-primary-600' : 'bg-slate-200'}`} />
                        )}
                    </div>
                ))}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Step 1: Select University */}
            {step === 1 && (
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-8">
                    <div className="flex items-center mb-6">
                        <Building2 className="w-6 h-6 text-primary-600 mr-3" />
                        <h2 className="text-xl font-semibold text-slate-900">Select Target University</h2>
                    </div>
                    <p className="text-slate-600 mb-6">Choose the university where you want to transfer credits</p>

                    <select
                        value={selectedUniversity}
                        onChange={(e) => setSelectedUniversity(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all mb-6"
                    >
                        <option value="">Select a university...</option>
                        {universities.map(uni => (
                            <option key={uni.id} value={uni.id}>{uni.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleCreateSubmission}
                        disabled={loading || !selectedUniversity}
                        className="w-full btn-primary flex items-center justify-center disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                        {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
                    </button>
                </div>
            )}

            {/* Step 2: Upload Documents & Add Courses */}
            {step === 2 && (
                <div className="space-y-6">
                    {/* Transcript Upload */}
                    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-8">
                        <div className="flex items-center mb-6">
                            <Upload className="w-6 h-6 text-primary-600 mr-3" />
                            <h2 className="text-xl font-semibold text-slate-900">Upload Transcript (Optional)</h2>
                        </div>

                        {transcriptFile ? (
                            <div className="flex items-center p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-3" />
                                <span className="text-emerald-700">{transcriptFile.name} uploaded</span>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center p-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary-300 transition-colors">
                                <Upload className="w-10 h-10 text-slate-400 mb-3" />
                                <span className="text-slate-600">Click to upload PDF transcript</span>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleTranscriptUpload}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    {/* Add Courses */}
                    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-8">
                        <div className="flex items-center mb-6">
                            <PlusCircle className="w-6 h-6 text-primary-600 mr-3" />
                            <h2 className="text-xl font-semibold text-slate-900">Add Transfer Courses</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <input
                                type="text"
                                placeholder="Course Code (e.g., CS101)"
                                value={newCourse.course_code}
                                onChange={(e) => setNewCourse({ ...newCourse, course_code: e.target.value })}
                                className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Course Name *"
                                value={newCourse.course_name}
                                onChange={(e) => setNewCourse({ ...newCourse, course_name: e.target.value })}
                                className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                            <input
                                type="number"
                                placeholder="Credits"
                                value={newCourse.credits}
                                onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
                                className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Grade (e.g., A, B+)"
                                value={newCourse.grade}
                                onChange={(e) => setNewCourse({ ...newCourse, grade: e.target.value })}
                                className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Source University/College"
                            value={newCourse.source_university_name}
                            onChange={(e) => setNewCourse({ ...newCourse, source_university_name: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none mb-4"
                        />
                        <textarea
                            placeholder="Additional notes about this course..."
                            value={newCourse.additional_notes}
                            onChange={(e) => setNewCourse({ ...newCourse, additional_notes: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none mb-4"
                            rows={2}
                        />

                        <button
                            onClick={handleAddCourse}
                            disabled={loading || !newCourse.course_name}
                            className="btn-secondary flex items-center disabled:opacity-50"
                        >
                            <PlusCircle className="w-5 h-5 mr-2" />
                            Add Course
                        </button>
                    </div>

                    {/* Added Courses List */}
                    {courses.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-8">
                            <h3 className="font-semibold text-slate-900 mb-4">Added Courses ({courses.length})</h3>
                            <div className="space-y-3">
                                {courses.map((course, i) => (
                                    <div key={course.id || i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                        <div>
                                            <span className="font-medium text-slate-900">{course.course_code || 'N/A'}</span>
                                            <span className="mx-2 text-slate-400">—</span>
                                            <span className="text-slate-700">{course.course_name}</span>
                                            {course.credits && <span className="text-slate-500 ml-2">({course.credits} credits)</span>}
                                        </div>
                                        <FileText className="w-5 h-5 text-slate-400" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Continue Button */}
                    <button
                        onClick={() => setStep(3)}
                        disabled={courses.length === 0}
                        className="w-full btn-primary flex items-center justify-center disabled:opacity-50"
                    >
                        Continue to Review
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                </div>
            )}

            {/* Step 3: Review & Submit */}
            {step === 3 && (
                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-8">
                    <div className="flex items-center mb-6">
                        <CheckCircle2 className="w-6 h-6 text-primary-600 mr-3" />
                        <h2 className="text-xl font-semibold text-slate-900">Review & Submit</h2>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <span className="text-slate-600">Target University:</span>
                            <span className="ml-2 font-medium text-slate-900">
                                {universities.find(u => u.id === parseInt(selectedUniversity))?.name}
                            </span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <span className="text-slate-600">Courses to evaluate:</span>
                            <span className="ml-2 font-medium text-slate-900">{courses.length}</span>
                        </div>
                        {transcriptFile && (
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <span className="text-slate-600">Transcript:</span>
                                <span className="ml-2 font-medium text-slate-900">{transcriptFile.name}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex space-x-4">
                        <button
                            onClick={() => setStep(2)}
                            className="flex-1 btn-secondary"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 btn-primary flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit for Evaluation'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewSubmission;
