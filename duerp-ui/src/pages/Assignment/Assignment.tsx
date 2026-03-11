import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../api";
import PageMeta from "../../components/common/PageMeta";
import {
    PlusIcon,
    CloseIcon,
    FileIcon,
    DocsIcon,
    FolderIcon,
    TrashBinIcon,
    PencilIcon,
} from "../../icons";

interface Question {
    id: number;
    text: string;
    options: string[];
}

interface Student {
    student_id: string;
    name: string;
    roll_no: string;
}

interface AssignmentData {
    id: number;
    title: string;
    mode: string;
    date: string;
    type: "assignment" | "quiz" | "material";
    instructions?: string;
    questions?: Question[];
    groupName?: string;
    students?: string[]; // IDs
    points?: number;
}

const Assignment = () => {
    const { id: courseId } = useParams();
    const [view, setView] = useState<"list" | "form">("list");

    const [formType, setFormType] = useState<"assignment" | "quiz" | "material">("assignment");

    // Form States
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [title, setTitle] = useState("");
    const [instructions, setInstructions] = useState("");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [submissionMode, setSubmissionMode] = useState<"Individual" | "Group">("Individual");
    const [groupName, setGroupName] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [points, setPoints] = useState<number>(100);
    const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    const [assignments, setAssignments] = useState<AssignmentData[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (courseId) {
            fetchAssignments();
            fetchStudents();
        }
    }, [courseId]);

    const fetchStudents = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await api.post("/api/student_by_course_operation_id",
                { course_operation_id: courseId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data && response.data.data) {
                setAvailableStudents(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch students", error);
        }
    };

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("access_token");
            const response = await api.post("/api/assignment/list", { course_id: courseId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data && response.data.data) {
                setAssignments(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch assignments", error);
        } finally {
            setLoading(false);
        }
    };



    const resetForm = () => {
        setCurrentId(null);
        setTitle("");
        setInstructions("");
        setQuestions([]);
        setSubmissionMode("Individual");
        setGroupName("");
        setDueDate("");
    };

    const handleEdit = (assign: AssignmentData) => {
        setCurrentId(assign.id);
        setTitle(assign.title);
        setInstructions(assign.instructions || "");
        setQuestions(assign.questions || []);
        setSubmissionMode(assign.mode as "Individual" | "Group");
        setGroupName(assign.groupName || "");
        setDueDate(assign.date);
        setFormType(assign.type);
        setView("form");
    };

    const addQuestion = () => {
        setQuestions([...questions, { id: Date.now(), text: "", options: ["Option 1"] }]);
    };

    const updateQuestion = (id: number, text: string) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
    };

    const deleteQuestion = (id: number) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            const token = localStorage.getItem("access_token");
            await api.post("/api/assignment/delete", { id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssignments(assignments.filter(a => a.id !== id));
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Failed to delete item. It might already be deleted.");
            setAssignments(assignments.filter(a => a.id !== id));
        }
    };

    const saveAndExit = async () => {
        if (!title) {
            alert("Please enter a title!");
            return;
        }

        const payload = {
            id: currentId, // If null, it's new
            course_id: courseId,
            title,
            instructions,
            type: formType,
            mode: submissionMode,
            group_name: submissionMode === "Group" ? groupName : null,
            due_date: dueDate,
            questions: formType === "quiz" ? questions : null
        };

        try {
            const token = localStorage.getItem("access_token");
            const endpoint = currentId ? "/api/assignment/update" : "/api/assignment/create";

            await api.post(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchAssignments();
            setView("list");
        } catch (error) {
            console.error("Failed to save", error);
            alert("Failed to save assignment. Please try again.");

            // Mock success for UI demo
            const newAssign: AssignmentData = {
                id: currentId || Date.now(),
                title,
                mode: submissionMode,
                date: dueDate || new Date().toISOString().split('T')[0],
                type: formType,
                instructions,
                questions
            };

            if (currentId) {
                setAssignments(assignments.map(a => a.id === currentId ? newAssign : a));
            } else {
                setAssignments([...assignments, newAssign]);
            }
            setView("list");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 font-outfit">
            <PageMeta title="Course Assignments" description="Manage course content" />

            {view === "list" && (
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Course Content</h1>
                            <p className="text-gray-500 dark:text-gray-400">Manage assignments, quizzes, and materials</p>
                        </div>
                        <div>
                            <button
                                onClick={() => {
                                    setFormType('assignment');
                                    resetForm();
                                    setView("form");
                                }}
                                className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg shadow-sm transition font-medium flex items-center gap-2"
                            >
                                <PlusIcon className="w-5 h-5" />
                                <span>Add New Assignment</span>
                            </button>
                        </div>
                    </div>





                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading assignments...</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mode</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {assignments.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500 italic">No assignments found. Click + to create one.</td>
                                        </tr>
                                    )}
                                    {assignments.map(assign => (
                                        <tr key={assign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                                {assign.type === 'assignment' && <FileIcon className="w-5 h-5 text-blue-500" />}
                                                {assign.type === 'quiz' && <DocsIcon className="w-5 h-5 text-purple-500" />}
                                                {assign.type === 'material' && <FolderIcon className="w-5 h-5 text-yellow-500" />}
                                                {assign.title}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${assign.mode === 'Group'
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                                                    }`}>
                                                    {assign.mode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{assign.date}</td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-3">
                                                <button onClick={() => handleEdit(assign)} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
                                                    <PencilIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDelete(assign.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition">
                                                    <TrashBinIcon className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {view === "form" && (
                <div className="bg-white dark:bg-gray-900 min-h-screen">
                    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
                        <div className="flex items-center space-x-4">
                            <button onClick={() => setView("list")} className="text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 p-2 rounded-full transition">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded ${formType === 'assignment' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                                    formType === 'quiz' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                                        'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                    }`}>
                                    {formType === 'assignment' && <FileIcon className="w-6 h-6" />}
                                    {formType === 'quiz' && <DocsIcon className="w-6 h-6" />}
                                    {formType === 'material' && <FolderIcon className="w-6 h-6" />}
                                </div>
                                <select
                                    value={formType}
                                    onChange={(e) => setFormType(e.target.value as any)}
                                    className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-transparent border-none focus:ring-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 transition appearance-none"
                                >
                                    <option value="assignment">New Assignment</option>
                                    <option value="quiz">New Quiz</option>
                                    <option value="material">New Material</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button onClick={saveAndExit} className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-lg shadow-sm transition font-medium">
                                {loading ? "Saving..." : "Save & Assign"}
                            </button>
                        </div>
                    </header>

                    <div className="flex flex-col lg:flex-row max-w-7xl mx-auto">
                        <div className="flex-1 p-6 lg:p-10 w-full">
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Midterm Project"
                                    className="w-full bg-transparent text-3xl font-bold border-b-2 border-gray-200 dark:border-gray-700 focus:border-brand-500 dark:focus:border-brand-500 outline-none py-2 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 transition"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="mb-8">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Instructions</label>
                                <textarea
                                    placeholder="Add detailed instructions, resources, or guidelines..."
                                    className="w-full h-48 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-brand-500 dark:focus:border-brand-500 focus:outline-none transition resize-none text-gray-700 dark:text-gray-200"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                ></textarea>
                            </div>

                            {formType === 'quiz' && (
                                <div className="border border-purple-200 dark:border-purple-900/50 rounded-xl p-6 bg-purple-50 dark:bg-purple-900/10">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-sm font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wide">Quiz Questions</h3>
                                        <button onClick={addQuestion} className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-purple-700 transition flex items-center gap-1">
                                            <PlusIcon className="w-3 h-3" /> Add Question
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {questions.length === 0 && (
                                            <div className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm italic">No questions added yet.</div>
                                        )}
                                        {questions.map((q, idx) => (
                                            <div key={q.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm relative group hover:shadow-md transition">
                                                <div className="flex flex-col gap-4 mb-4">
                                                    <div className="w-full">
                                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Question {idx + 1}</label>
                                                        <input
                                                            type="text"
                                                            value={q.text}
                                                            onChange={(e) => updateQuestion(q.id, e.target.value)}
                                                            placeholder="Enter question text..."
                                                            className="w-full bg-transparent text-lg border-b border-gray-200 dark:border-gray-700 focus:border-purple-500 outline-none pb-2 text-gray-800 dark:text-white transition font-medium placeholder-gray-400"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end pt-2">
                                                    <button onClick={() => deleteQuestion(q.id)} className="text-gray-400 hover:text-red-500 transition">
                                                        <TrashBinIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar for Settings */}
                        <aside className="w-full lg:w-96 border-l border-gray-200 dark:border-gray-700 p-8 space-y-8 bg-gray-50 dark:bg-gray-800/30">
                            {/* Submission Mode */}
                            {formType !== 'material' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Submission Mode</label>
                                    <div className="space-y-3">
                                        <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${submissionMode === "Individual" ? 'bg-brand-50 border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/30' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                            <input type="radio" name="sub_mode" checked={submissionMode === "Individual"} onChange={() => setSubmissionMode("Individual")} className="mr-3 text-brand-500 focus:ring-brand-500" />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Individual Submission</span>
                                        </label>
                                        <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${submissionMode === "Group" ? 'bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/30' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                            <input type="radio" name="sub_mode" checked={submissionMode === "Group"} onChange={() => setSubmissionMode("Group")} className="mr-3 text-purple-500 focus:ring-purple-500" />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Group-wise Submission</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Group Settings */}
                            {submissionMode === "Group" && formType !== 'material' && (
                                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <label className="block text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Student Group Settings</label>
                                    <div>
                                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Group Naming Convention</label>
                                        <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Team Alpha" className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:text-white transition" />
                                    </div>
                                </div>
                            )}

                            {/* Points */}
                            {formType !== 'material' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Points</label>
                                    <input type="number" value={points} onChange={(e) => setPoints(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none dark:text-white transition" />
                                </div>
                            )}

                            {/* Due Date */}
                            {formType !== 'material' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Due Date</label>
                                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none dark:text-white transition dark:calendar-invert" />
                                </div>
                            )}

                            {/* Student Selection */}
                            {formType !== 'material' && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Assign to</label>
                                    <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-2 space-y-1">
                                        <label className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.length === availableStudents.length && availableStudents.length > 0}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedStudentIds(availableStudents.map(s => s.student_id));
                                                    } else {
                                                        setSelectedStudentIds([]);
                                                    }
                                                }}
                                                className="mr-3 text-brand-500 focus:ring-brand-500 rounded"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">All Students</span>
                                        </label>
                                        <hr className="border-gray-100 dark:border-gray-700 my-1" />
                                        {availableStudents.map(student => (
                                            <label key={student.student_id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentIds.includes(student.student_id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedStudentIds([...selectedStudentIds, student.student_id]);
                                                        } else {
                                                            setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.student_id));
                                                        }
                                                    }}
                                                    className="mr-3 text-brand-500 focus:ring-brand-500 rounded"
                                                />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">{student.name} <span className="text-xs text-gray-400">({student.roll_no})</span></span>
                                            </label>
                                        ))}
                                        {availableStudents.length === 0 && (
                                            <div className="text-center text-gray-400 text-xs py-2">No students found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Assignment;
