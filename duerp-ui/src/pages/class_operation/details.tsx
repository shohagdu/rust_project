import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta.tsx";
import PageBreadcrumb from "../../components/common/PageBreadCrumb.tsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../../api";
import { toast } from "react-toastify";

// ===================== SVG Icon Components =====================
const Pencil = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
    </svg>
);
const Trash2 = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
);
const BookOpen = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
    </svg>
);
const Save = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
);
const CalendarIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);
const XIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

// ===================== Types =====================
interface ClassRoutine {
    id: string;
    course_operation_id: string;
    day_name: string;
    start_time: string;
    end_time: string;
    room: string;
}

interface ModalTimeSlot {
    id: string;
    routineId?: string;
    day: string;
    start: string;
    end: string;
    room: string;
    duration: string;
}

interface CourseOperation {
    course_code: string;
    course_id: string;
    course_name: string;
    course_operation_id: string;
    department_name: string;
    dept_id: string;
    faculty_name: string;
    program_id: string;
    program_name: string;
    course_section: string;
    course_year: string;
    course_semester: string;
    start_date?: string;
    end_date?: string;
}

// ===================== Constants =====================
const DAYS = [
    { key: 'sun', label: 'Sunday' },
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
];

const yearRecord = [
    { id: 10, title: "N/A" }, { id: 1, title: "1st Year" }, { id: 2, title: "2nd Year" },
    { id: 3, title: "3rd Year" }, { id: 4, title: "4th Year" }, { id: 5, title: "5th Year" },
];
const semesterRecord = [
    { id: 10, title: "N/A" }, { id: 1, title: "1st Semester" }, { id: 2, title: "2nd Semester" },
    { id: 3, title: "3rd Semester" }, { id: 4, title: "4th Semester" }, { id: 5, title: "5th Semester" },
    { id: 6, title: "6th Semester" }, { id: 7, title: "7th Semester" }, { id: 8, title: "8th Semester" },
];
const sectionRecord = [
    { id: 10, title: "N/A" }, { id: 1, title: "Section A" }, { id: 2, title: "Section B" },
    { id: 3, title: "Section C" }, { id: 4, title: "Section D" }, { id: 5, title: "Section E" },
];

const createLookup = (arr: { id: number; title: string }[]) =>
    Object.fromEntries(arr.map(item => [item.id, item.title]));
const yearLookup = createLookup(yearRecord);
const semesterLookup = createLookup(semesterRecord);
const sectionLookup = createLookup(sectionRecord);

const DAY_LABEL: Record<string, string> = Object.fromEntries(DAYS.map(d => [d.key, d.label]));

// ===================== Utils =====================
const addMinutesToTime = (time: string, minutes: number): string => {
    if (!time) return "";
    const date = new Date(`1970-01-01T${time}`);
    date.setMinutes(date.getMinutes() + minutes);
    return date.toTimeString().slice(0, 5);
};

const calcDuration = (start: string, end: string): string => {
    if (!start || !end) return "";
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? String(diff) : "";
};

const formatTo12Hour = (time: string): string => {
    if (!time) return "";
    const clean = time.slice(0, 5);
    const [hours, minutes] = clean.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
};

const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const minFromTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const checkTimeOverlap = (slots: { day: string, start: string, end: string }[]): string | null => {
    const byDay: Record<string, { start: number, end: number }[]> = {};
    for (const s of slots) {
        if (!byDay[s.day]) byDay[s.day] = [];
        byDay[s.day].push({ start: minFromTime(s.start), end: minFromTime(s.end) });
    }
    for (const day in byDay) {
        const times = byDay[day].sort((a, b) => a.start - b.start);
        for (let i = 0; i < times.length - 1; i++) {
            if (times[i].end > times[i + 1].start) {
                return `Time overlap on ${DAY_LABEL[day] || day}.`;
            }
        }
    }
    return null;
};

// ===================== Outline Edit Modal =====================
interface OutlineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: (outline: string) => void;
    courseOperationId: string;
    initialOutline: string;
}

const OutlineEditModal: React.FC<OutlineModalProps> = ({
    isOpen, onClose, onSaved, courseOperationId, initialOutline
}) => {
    const [outline, setOutline] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) setOutline(initialOutline);
    }, [isOpen, initialOutline]);

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.post('api/update_course_outline', {
                course_operation_id: courseOperationId,
                course_outline: outline,
            });
            toast.success("Outline saved", { position: "bottom-right" });
            onSaved(outline);
            onClose();
        } catch {
            toast.error("Failed to save outline", { position: "bottom-right" });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <BookOpen size={20} className="text-indigo-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Edit Course Outline</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500">
                        <XIcon size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                    <textarea
                        value={outline}
                        onChange={(e) => setOutline(e.target.value)}
                        className="w-full h-64 p-4 border-2 border-gray-200 rounded-xl font-sans text-sm text-gray-800 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                        placeholder="Enter course outline..."
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition text-sm flex items-center gap-2"
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save Outline'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===================== Schedule Edit Modal =====================
interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: (routines: ClassRoutine[]) => void;
    courseOperationId: string;
    initialRoutines: ClassRoutine[];
    initialStartDate: string;
    initialEndDate: string;
}

const ScheduleEditModal: React.FC<ScheduleModalProps> = ({
    isOpen, onClose, onSaved,
    courseOperationId, initialRoutines, initialStartDate, initialEndDate
}) => {
    const [saving, setSaving] = useState(false);
    const [rows, setRows] = useState<ModalTimeSlot[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        setRows(initialRoutines.map(r => {
            const start = r.start_time.slice(0, 5);
            const end = r.end_time.slice(0, 5);
            return {
                id: r.id,
                routineId: r.id,
                day: r.day_name,
                start,
                end,
                room: r.room || '',
                duration: calcDuration(start, end),
            };
        }));
    }, [isOpen, initialRoutines]);

    const addRow = () => setRows(prev => [
        ...prev,
        { id: Date.now().toString(), day: "", start: "", end: "", room: "", duration: "" }
    ]);

    const removeRow = (rowId: string) => setRows(prev => prev.filter(r => r.id !== rowId));

    const updateRow = (rowId: string, field: keyof ModalTimeSlot, value: string) => {
        setRows(prev => prev.map(r => {
            if (r.id !== rowId) return r;
            let val = value;
            if (field === 'duration') {
                const n = parseInt(value) || 0;
                if (n > 180) val = '180';
            }
            const updated = { ...r, [field]: val };
            if (field === 'start' && updated.duration) {
                updated.end = addMinutesToTime(updated.start, parseInt(updated.duration) || 0);
            } else if (field === 'duration' && updated.start) {
                updated.end = addMinutesToTime(updated.start, parseInt(val) || 0);
            }
            return updated;
        }));
    };

    const validate = (): string | null => {
        if (rows.length === 0) return 'Please add at least one schedule row.';
        for (const row of rows) {
            if (!row.day) return 'Please select a day for all rows.';
            if (!row.start || !row.end) return 'Please set start and end times for all rows.';
            if (new Date(`1970-01-01T${row.end}`) <= new Date(`1970-01-01T${row.start}`))
                return `End time must be after start time for ${DAY_LABEL[row.day] || row.day}.`;
        }
        return checkTimeOverlap(rows.map(r => ({ day: r.day, start: r.start, end: r.end })));
    };

    const handleSave = async () => {
        const error = validate();
        if (error) { toast.error(error, { position: "bottom-right" }); return; }

        try {
            setSaving(true);
            const selected_days = rows.map(r => ({
                day: r.day,
                start_time: r.start,
                end_time: r.end,
                room: r.room || '',
            }));

            const payload = {
                course_operation_id: courseOperationId,
                selected_days,
            };

            await api.post("/api/course/course-routine/update", payload);

            toast.success("Schedule updated successfully", { position: "bottom-right" });

            const updatedRoutines: ClassRoutine[] = rows.map(r => ({
                id: r.routineId || r.id,
                course_operation_id: courseOperationId,
                day_name: r.day,
                start_time: r.start + ':00',
                end_time: r.end + ':00',
                room: r.room,
            }));

            onSaved(updatedRoutines);
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update schedule", { position: "bottom-right" });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <CalendarIcon size={20} className="text-indigo-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Edit Schedule</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500">
                        <XIcon size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

                    {/* Routine Table */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Routine</label>
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="min-w-full table-auto">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-3 py-2.5 border-b text-sm font-semibold text-gray-600 text-left">Day</th>
                                        <th className="px-3 py-2.5 border-b text-sm font-semibold text-gray-600 text-left">Start Time</th>
                                        <th className="px-3 py-2.5 border-b text-sm font-semibold text-gray-600 text-left">Duration (Min)</th>
                                        <th className="px-3 py-2.5 border-b text-sm font-semibold text-gray-600 text-left">End Time</th>
                                        <th className="px-3 py-2.5 border-b text-sm font-semibold text-gray-600 text-left">Room</th>
                                        <th className="px-3 py-2.5 border-b text-sm font-semibold text-gray-600 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(row => (
                                        <tr key={row.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 border-b">
                                                <select
                                                    value={row.day}
                                                    onChange={e => updateRow(row.id, "day", e.target.value)}
                                                    className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                                                >
                                                    <option value="">Select Day</option>
                                                    {DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 border-b">
                                                <DatePicker
                                                    selected={row.start ? new Date(`2024-01-01T${row.start}`) : null}
                                                    onChange={(time: Date) => updateRow(row.id, 'start', time.toTimeString().substring(0, 5))}
                                                    showTimeSelect
                                                    showTimeSelectOnly
                                                    timeIntervals={15}
                                                    timeCaption="Start"
                                                    dateFormat="hh:mm aa"
                                                    className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                                                    placeholderText="Select time"
                                                />
                                            </td>
                                            <td className="px-3 py-2 border-b">
                                                <input
                                                    type="number"
                                                    value={row.duration || ''}
                                                    onChange={e => updateRow(row.id, 'duration', e.target.value)}
                                                    className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                                                    placeholder="Min"
                                                    max={180}
                                                />
                                            </td>
                                            <td className="px-3 py-2 border-b">
                                                <input
                                                    type="text"
                                                    value={formatTo12Hour(row.end)}
                                                    readOnly
                                                    className="w-full px-2 py-1.5 border rounded-lg text-sm bg-gray-100 cursor-not-allowed"
                                                />
                                            </td>
                                            <td className="px-3 py-2 border-b">
                                                <input
                                                    type="text"
                                                    value={row.room}
                                                    onChange={e => updateRow(row.id, 'room', e.target.value)}
                                                    className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                                                    placeholder="Room"
                                                />
                                            </td>
                                            <td className="px-3 py-2 border-b text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(row.id)}
                                                    className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-xs font-medium transition"
                                                >
                                                    Drop
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-8 text-center text-gray-400 text-sm">
                                                No schedule rows. Click "+ Add Row" below.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <button
                            type="button"
                            onClick={addRow}
                            className="mt-3 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-sm font-medium transition"
                        >
                            + Add Row
                        </button>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition text-sm flex items-center gap-2"
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save Schedule'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===================== Main Component =====================
const ShowCourseOperation: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [courseOperationInfo, setCourseOperationInfo] = useState<CourseOperation | null>(null);

    const [courseOutline, setCourseOutline] = useState<string>('');
    const [referenceBooks, setReferenceBooks] = useState<string[]>([]);
    const [isEditingRef, setIsEditingRef] = useState(false);

    // Schedule state
    const [classRoutines, setClassRoutines] = useState<ClassRoutine[]>([]);
    const [scheduleStartDate, setScheduleStartDate] = useState<string>('');
    const [scheduleEndDate, setScheduleEndDate] = useState<string>('');
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isOutlineModalOpen, setIsOutlineModalOpen] = useState(false);

    useEffect(() => {
        if (!id) return;
        fetchAllData();
    }, [id]);

    const fetchAllData = async () => {
        await fetchCourseOperationData();
        setLoading(false);
    };

    const fetchCourseOperationData = async () => {
        try {
            const res = await api.post("/api/single_course_operation_info", { course_operation_id: id });
            if (res.data.status === 'SUCCESS') {
                const data = res.data.data;
                setCourseOperationInfo(data);
                setCourseOutline(data.course_outline || '');
                setScheduleStartDate(data.start_date || '');
                setScheduleEndDate(data.end_date || '');

                // Parse book reference
                const raw = res.data?.data?.book_reference;
                let books: string[] = [];
                if (typeof raw === 'string') {
                    try {
                        const parsed = JSON.parse(raw);
                        books = Array.isArray(parsed) ? parsed : [];
                    } catch {
                        books = raw.split(',').map((b: string) => b.trim()).filter(Boolean);
                    }
                }
                setReferenceBooks(books);

                // Load class routines
                if (res.data.class_routine) {
                    setClassRoutines(res.data.class_routine);
                }
            }
        } catch (err) {
            setError("Error loading course operation");
            toast.error("Failed to load course operation");
        }
    };

    const saveCourseOutline = async (outline: string) => {
        setCourseOutline(outline);
    };

    const saveReferenceBooks = async () => {
        try {
            await api.post(`api/update_book_reference`, { course_operation_id: id, book_reference: referenceBooks });
            setIsEditingRef(false);
            toast.success("Reference Books saved", { position: "bottom-right" });
        } catch {
            toast.error("Failed to save reference books", { position: "bottom-right" });
        }
    };

    const removeReferenceBook = (index: number) => {
        setReferenceBooks(referenceBooks.filter((_, i) => i !== index));
    };

    const handleScheduleSaved = (updatedRoutines: ClassRoutine[]) => {
        setClassRoutines(updatedRoutines);
    };

    const handleDeleteCourseOperation = async () => {
        if (!window.confirm("Are you sure you want to delete this course operation? This action cannot be undone.")) return;
        try {
            const token = localStorage.getItem("access_token");
            await api.delete("/api/course/course-operation/delete", {
                headers: { Authorization: `Bearer ${token}` },
                data: { course_operation_id: id }
            });
            toast.success("Course operation deleted successfully", { position: "bottom-right" });
            navigate("/dashboard");
        } catch (error: any) {
            const message = error.response?.data?.message || "Failed to delete course operation";
            toast.error(message, { position: "bottom-right" });
        }
    };

    // ===================== Loading / Error states =====================
    if (loading) {
        return (
            <div>
                <PageMeta title="Course operations | Loading..." description="Loading class operations" />
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
                <PageMeta title="Course operations | Error" description="Error loading course operations" />
                <PageBreadcrumb pageTitle="course operations" />
                <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                    <div className="text-center py-20">
                        <div className="bg-red-50 rounded-3xl p-12 inline-block">
                            <svg className="w-24 h-24 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h3>
                            <p className="text-gray-600 mb-6">{error}</p>
                            <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-indigo-700 transition-colors">
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
            <PageMeta title="Course operations | Dashboard" description="Manage your course operations and courses" />
            <PageBreadcrumb pageTitle="Course operations" />

            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">

                {/* ── Hero Header ── */}
                <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 px-6 py-8 md:px-10 md:py-10">
                    {/* decorative circles */}
                    <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/5" />
                    <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-white/5" />

                    <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            {/* Course code badge */}
                            <span className="inline-block mb-3 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold tracking-widest uppercase">
                                {courseOperationInfo?.course_code}
                            </span>
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug mb-1">
                                {courseOperationInfo?.course_name}
                            </h1>
                            <p className="text-indigo-200 text-sm mb-4">{courseOperationInfo?.department_name}</p>

                            {/* Meta chips */}
                            <div className="flex flex-wrap gap-2">
                                {courseOperationInfo?.program_name && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                                        {courseOperationInfo.program_name}
                                    </span>
                                )}
                                {/* {courseOperationInfo?.faculty_name && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                                        {courseOperationInfo.faculty_name}
                                    </span>
                                )} */}
                                {courseOperationInfo?.course_section && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium">
                                        {sectionLookup[Number(courseOperationInfo.course_section)] || `Section ${courseOperationInfo.course_section}`}
                                    </span>
                                )}
                                {courseOperationInfo?.course_year && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium">
                                        {yearLookup[Number(courseOperationInfo.course_year)] || `Year ${courseOperationInfo.course_year}`}
                                    </span>
                                )}
                                {courseOperationInfo?.course_semester && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium">
                                        {semesterLookup[Number(courseOperationInfo.course_semester)] || `Semester ${courseOperationInfo.course_semester}`}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Quick stats */}
                        <div className="flex gap-3 shrink-0">
                            <div className="bg-white/15 rounded-xl px-4 py-3 text-center min-w-[80px]">
                                <p className="text-2xl font-bold text-white">{classRoutines.length}</p>
                                <p className="text-indigo-200 text-xs mt-0.5">Classes/week</p>
                            </div>
                            <div className="bg-white/15 rounded-xl px-4 py-3 text-center min-w-[80px]">
                                <p className="text-2xl font-bold text-white">{referenceBooks.filter(b => b.trim()).length}</p>
                                <p className="text-indigo-200 text-xs mt-0.5">Books</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="px-5 py-6 xl:px-10 xl:py-8 space-y-6">

                    {/* ── Schedule Details ── */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                            <div className="flex items-center gap-2.5">
                                <div className="bg-indigo-100 p-1.5 rounded-lg">
                                    <CalendarIcon size={18} className="text-indigo-600" />
                                </div>
                                <h2 className="text-base font-semibold text-gray-800">Weekly Schedule</h2>
                                {classRoutines.length > 0 && (
                                    <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                                        {classRoutines.length} slot{classRoutines.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setIsScheduleModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
                            >
                                <Pencil size={13} />
                                Edit Schedule
                            </button>
                        </div>

                        {classRoutines.length > 0 ? (
                            <>
                                {/* Date range banner */}
                                {(scheduleStartDate || scheduleEndDate) && (
                                    <div className="flex items-center gap-6 px-6 py-3 bg-indigo-50/50 border-b border-indigo-100 text-sm">
                                        <div className="flex items-center gap-2 text-indigo-700">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                            <span className="text-xs font-medium text-indigo-500 uppercase tracking-wide">From</span>
                                            <span className="font-semibold">{scheduleStartDate || '—'}</span>
                                        </div>
                                        <div className="text-indigo-300">→</div>
                                        <div className="flex items-center gap-2 text-indigo-700">
                                            <span className="text-xs font-medium text-indigo-500 uppercase tracking-wide">To</span>
                                            <span className="font-semibold">{scheduleEndDate || '—'}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Schedule cards */}
                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {classRoutines.map((routine, index) => {
                                        const start = routine.start_time.slice(0, 5);
                                        const end = routine.end_time.slice(0, 5);
                                        const duration = calcDuration(start, end);
                                        const dayColors = [
                                            'bg-violet-50 border-violet-200 text-violet-700',
                                            'bg-blue-50 border-blue-200 text-blue-700',
                                            'bg-teal-50 border-teal-200 text-teal-700',
                                            'bg-amber-50 border-amber-200 text-amber-700',
                                            'bg-rose-50 border-rose-200 text-rose-700',
                                            'bg-emerald-50 border-emerald-200 text-emerald-700',
                                            'bg-sky-50 border-sky-200 text-sky-700',
                                        ];
                                        const dayIdx = DAYS.findIndex(d => d.key === routine.day_name);
                                        const colorClass = dayColors[dayIdx >= 0 ? dayIdx : index % dayColors.length];
                                        return (
                                            <div key={routine.id} className={`rounded-xl border p-4 ${colorClass.split(' ').slice(0,2).join(' ')} flex items-start gap-3`}>
                                                <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${colorClass.split(' ').slice(2).join(' ')} bg-white/60 border ${colorClass.split(' ')[1]}`}>
                                                    {(DAY_LABEL[routine.day_name] || routine.day_name).slice(0, 3).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {/* <p className={`font-semibold text-sm ${colorClass.split(' ')[2]}`}>
                                                        {DAY_LABEL[routine.day_name] || routine.day_name}
                                                    </p> */}
                                                    <p className={`font-semibold text-sm ${colorClass.split(' ')[2]}`}>
                                                        {formatTo12Hour(start)} – {formatTo12Hour(end)}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                        {duration && (
                                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                                {duration} min
                                                            </span>
                                                        )}
                                                        {routine.room && (
                                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                                                Room {routine.room}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                    <CalendarIcon size={26} className="text-gray-400" />
                                </div>
                                <p className="text-gray-600 font-medium mb-1">No schedule set yet</p>
                                <p className="text-gray-400 text-sm mb-4">Add weekly class slots to get started</p>
                                <button
                                    onClick={() => setIsScheduleModalOpen(true)}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
                                >
                                    + Add Schedule
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Course Outline ── */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                            <div className="flex items-center gap-2.5">
                                <div className="bg-emerald-100 p-1.5 rounded-lg">
                                    <BookOpen size={18} className="text-emerald-600" />
                                </div>
                                <h2 className="text-base font-semibold text-gray-800">Course Outline</h2>
                            </div>
                            <button
                                onClick={() => setIsOutlineModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
                            >
                                <Pencil size={13} />
                                Edit
                            </button>
                        </div>
                        <div className="px-6 py-5">
                            {courseOutline ? (
                                <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                                    {courseOutline}
                                </p>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                        <BookOpen size={22} className="text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 text-sm">No outline added yet. Click Edit to write one.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Reference Books ── */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                            <div className="flex items-center gap-2.5">
                                <div className="bg-amber-100 p-1.5 rounded-lg">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                                    </svg>
                                </div>
                                <h2 className="text-base font-semibold text-gray-800">Reference Books</h2>
                                {referenceBooks.filter(b => b.trim()).length > 0 && (
                                    <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                                        {referenceBooks.filter(b => b.trim()).length}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => isEditingRef ? saveReferenceBooks() : setIsEditingRef(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
                            >
                                {isEditingRef ? <Save size={13} /> : <Pencil size={13} />}
                                {isEditingRef ? 'Save' : 'Edit'}
                            </button>
                        </div>

                        <div className="px-6 py-5">
                            {!isEditingRef ? (
                                referenceBooks.filter(b => b.trim()).length > 0 ? (
                                    <ol className="space-y-2">
                                        {referenceBooks.filter(b => b.trim()).map((book, index) => (
                                            <li key={index} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-amber-200 hover:bg-amber-50/40 transition-colors">
                                                <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                                    {index + 1}
                                                </span>
                                                <span className="text-sm text-gray-700 leading-snug">{book}</span>
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                                            </svg>
                                        </div>
                                        <p className="text-gray-500 text-sm">No reference books added yet.</p>
                                    </div>
                                )
                            ) : (
                                <div className="space-y-3">
                                    {referenceBooks.map((book, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                                                {index + 1}
                                            </span>
                                            <input
                                                type="text"
                                                placeholder={`Book title ${index + 1}`}
                                                value={book}
                                                onChange={(e) => {
                                                    const updated = [...referenceBooks];
                                                    updated[index] = e.target.value;
                                                    setReferenceBooks(updated);
                                                }}
                                                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 focus:outline-none text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeReferenceBook(index)}
                                                className="shrink-0 p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition"
                                                title="Remove"
                                            >
                                                <XIcon size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setReferenceBooks([...referenceBooks, ''])}
                                        className="mt-1 flex items-center gap-1.5 text-indigo-600 text-sm font-semibold hover:text-indigo-800 transition"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                        Add Book
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Danger Zone ── */}
                    <div className="rounded-2xl border border-red-100 bg-red-50/40 px-6 py-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-red-700">Delete Course Operation</p>
                            <p className="text-xs text-red-400 mt-0.5">This action is permanent and cannot be undone.</p>
                        </div>
                        <button
                            onClick={handleDeleteCourseOperation}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-red-600 border border-red-200 font-semibold text-sm hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
                        >
                            <Trash2 size={16} />
                            Delete
                        </button>
                    </div>

                </div>
            </div>

            {/* Schedule Edit Modal */}
            <ScheduleEditModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSaved={handleScheduleSaved}
                courseOperationId={id || ''}
                initialRoutines={classRoutines}
                initialStartDate={scheduleStartDate}
                initialEndDate={scheduleEndDate}
            />

            {/* Outline Edit Modal */}
            <OutlineEditModal
                isOpen={isOutlineModalOpen}
                onClose={() => setIsOutlineModalOpen(false)}
                onSaved={saveCourseOutline}
                courseOperationId={id || ''}
                initialOutline={courseOutline}
            />
        </div>
    );
};

export default ShowCourseOperation;