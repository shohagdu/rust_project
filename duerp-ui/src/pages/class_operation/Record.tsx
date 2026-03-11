import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta.tsx";
import PageBreadcrumb from "../../components/common/PageBreadCrumb.tsx";
import api from "../../api";
import { toast } from "react-toastify";

// Types matching API response
interface ClassOperation {
    id: string;
    course_id: string;
    program_id: string;
    faculty_id: string;
    start_date: string;
    end_date: string;
    course_year: number;
    course_section: number;
    course_semester: string;
    course_title: string;
    program_name: string;
}



type Status = 'active' | 'upcoming' | 'completed';

const yearRecord = [
    { id: 10, title: "N/A" },
    { id: 1, title: "1st Year" },
    { id: 2, title: "2nd Year" },
    { id: 3, title: "3rd Year" },
    { id: 4, title: "4th Year" },
    { id: 5, title: "5th Year" },
];

const semesterRecord = [
    { id: 10, title: "N/A" },
    { id: 1, title: "1st Semester" },
    { id: 2, title: "2nd Semester" },
    { id: 3, title: "3rd Semester" },
    { id: 4, title: "4th Semester" },
    { id: 5, title: "5th Semester" },
    { id: 6, title: "6th Semester" },
    { id: 7, title: "7th Semester" },
    { id: 8, title: "8th Semester" }
];

const sectionRecord = [
    { id: 10, title: "N/A" },
    { id: 1, title: "Section A" },
    { id: 2, title: "Section B" },
    { id: 3, title: "Section C" },
    { id: 4, title: "Section D" },
    { id: 5, title: "Section E" },
];

const createLookup = (arr: { id: number; title: string }[]) =>
    Object.fromEntries(arr.map(item => [item.id, item.title]));

const yearLookup = createLookup(yearRecord);
const semesterLookup = createLookup(semesterRecord);
const sectionLookup = createLookup(sectionRecord);

const Record: React.FC = () => {
    const navigate = useNavigate();
    const [classOperations, setClassOperations] = useState<ClassOperation[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchCourseList = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("access_token");
                const empId = JSON.parse(localStorage.getItem("user_data") || "{}")?.emp_id;

                const response = await api.post("/api/course/course-operation-by-faculty",
                    { "faculty_id": empId },
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );

                setClassOperations(response.data || []);
                setError('');
            } catch (err) {
                console.error(err);
                setError('Failed to load class operations. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchCourseList();
    }, []);

    const getStatus = (startDate: string, endDate: string): Status => {
        const today = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (today < start) return 'upcoming';
        if (today > end) return 'completed';
        return 'active';
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusColor = (status: Status): string => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            upcoming: 'bg-yellow-100 text-yellow-800',
            completed: 'bg-gray-100 text-gray-800'
        };
        return colors[status];
    };

    const getSemesterColor = (semester: string): string => {
        const semesterNum = parseInt(semester);
        const colors = [
            'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
            'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-lime-500'
        ];
        return colors[(semesterNum - 1) % colors.length] || 'bg-gray-500';
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this class operation?")) return;

        try {
            const token = localStorage.getItem("access_token");

            const res = await api.post(
                "/api/delete_course_operation",
                { course_operation_id: id },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            // API may return success status in `res.data.status`
            const isSuccess = res.data?.status === "success";


            toast[isSuccess ? "success" : "error"](res.data?.message || "Operation response received", {
                position: "bottom-right",
            });

            if (isSuccess) {
                // Update UI state only when successful
                setClassOperations(prev => prev.filter(op => op.id !== id));
            }

        } catch (error) {
            console.error("Delete failed:", error);

            toast.error("❌ Failed to delete. Please try again.", {
                position: "bottom-right",
            });
        }
    };


    const handleManageStudents = (operation: ClassOperation) => {
        navigate(`/manage-course-students/${operation.id}`, {
            state: { operation },
        });
    };

    const handleManageClass = (operation: ClassOperation) => {
        navigate(`/manage-class/${operation.id}`);
    };

    if (loading) {
        return (
            <div>
                <PageMeta
                    title="Course operations | Loading..."
                    description="Loading class operations"
                />
                <PageBreadcrumb pageTitle="Class Operations" />
                <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <PageMeta
                    title="Course operations | Error"
                    description="Error loading course operations"
                />
                <PageBreadcrumb pageTitle="course operations" />
                <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                    <div className="text-center py-20">
                        <div className="bg-red-50 rounded-3xl p-12 inline-block">
                            <svg className="w-24 h-24 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h3>
                            <p className="text-gray-600 mb-6">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-indigo-700 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <PageMeta
                title="Course operations | Dashboard"
                description="Manage your course operations and courses"
            />
            <PageBreadcrumb pageTitle="Course operations" />
            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-5">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">Course operations Record</h1>
                        <p className="text-gray-600">Manage your courses and semesters</p>
                    </div>
                    <button
                        onClick={() => navigate("/create-class-operation")}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl hover:bg-indigo-700 transform hover:-translate-y-0.5 transition-all flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create New</span>
                    </button>
                </div>

                {/* Class Cards */}
                {classOperations.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-12 inline-block">
                            <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                            </svg>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No course operations Yet</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first class operation to get started</p>
                            <button
                                onClick={() => navigate("/create-class-operation")}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Create New</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classOperations.map(op => {
                            const status = getStatus(op.start_date, op.end_date);
                            return (
                                <div
                                    key={op.id}
                                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 border border-gray-100 dark:border-gray-700"
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            {(op.course_year !== 10 || op.course_semester !== "10") ? (
                                                <span className={`${getSemesterColor(op.course_semester)} text-white text-xs font-semibold px-3 py-1.5 rounded-full`}>
                                                    {yearLookup[op.course_year] ?? "N/A"} - {semesterLookup[op.course_semester] ?? "N/A"}
                                                </span>
                                            ) : <div></div>}
                                            <span className={`${getStatusColor(status)} text-xs font-semibold px-3 py-1.5 rounded-full capitalize`}>
                                                {status}
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                            {op.course_title.trim()}
                                        </h3>
                                        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <span className="text-sm">{op.program_name}</span>
                                        </div>
                                        {op.course_section !== 10 && (
                                            <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                </svg>
                                                <span className="text-sm"> {sectionLookup[op.course_section] ?? "N/A"}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                                            {(!op.start_date.includes('1970-01-01')) ? (
                                                <div className="flex items-center">
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>{formatDate(op.start_date)}</span>
                                                </div>
                                            ) : <div></div>}
                                            {(!op.end_date.includes('1970-01-01')) ? (
                                                <div className="flex items-center">
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>{formatDate(op.end_date)}</span>
                                                </div>
                                            ) : <div></div>}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleManageStudents(op)}
                                                className="flex-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center space-x-1 text-sm font-medium"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                                <span>Manage Students</span>
                                            </button>
                                            <button
                                                onClick={() => handleManageClass(op)}
                                                className="flex-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center space-x-1 text-sm font-medium"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                                <span>Manage Class</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(op.id)}
                                                className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Record;