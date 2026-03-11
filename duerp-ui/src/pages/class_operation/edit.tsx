import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta.tsx';
import PageBreadcrumb from "../../components/common/PageBreadCrumb.tsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import api from "../../api";

// ===================== Types =====================
interface Course { id: number; title: string; code: string; }
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
    schedule?: { day: string; start_time: string; end_time: string; room: string }[];
}
interface TimeSlot { id: string; day: string; start: string; end: string; room: string; selected?: boolean; duration?: string; }
interface Department { id: string; name: string; body_id?: string; }
interface Program { id: string; name: string; }
interface SelectOption { id: number; title: string; }

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

const YEARS: SelectOption[] = [
    { id: 10, title: "N/A" }, { id: 1, title: "1st Year" }, { id: 2, title: "2nd Year" },
    { id: 3, title: "3rd Year" }, { id: 4, title: "4th Year" }, { id: 5, title: "5th Year" },
];

const SEMESTERS: SelectOption[] = [
    { id: 10, title: "N/A" }, { id: 1, title: "1st Semester" }, { id: 2, title: "2nd Semester" },
    { id: 3, title: "3rd Semester" }, { id: 4, title: "4th Semester" }, { id: 5, title: "5th Semester" },
    { id: 6, title: "6th Semester" }, { id: 7, title: "7th Semester" }, { id: 8, title: "8th Semester" },
];

const SECTIONS: SelectOption[] = [
    { id: 10, title: "N/A" }, { id: 1, title: "Section A" }, { id: 2, title: "Section B" },
    { id: 3, title: "Section C" }, { id: 4, title: "Section D" }, { id: 5, title: "Section E" },
];

// ===================== Utils =====================
const getUserData = () => {
    try { return JSON.parse(localStorage.getItem("user_data") || "{}"); }
    catch { return {}; }
};

const addMinutesToTime = (time: string, minutes: number): string => {
    if (!time) return "";
    const date = new Date(`1970-01-01T${time}`);
    date.setMinutes(date.getMinutes() + minutes);
    return date.toTimeString().slice(0, 5);
};

const formatTo12Hour = (time: string): string => {
    if (!time) return "";
    const [hours, minutes] = time.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${minutes} ${ampm}`;
};

const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const calcDuration = (start: string, end: string): string => {
    if (!start || !end) return '';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? String(diff) : '';
};

const convertTimeSlotsToArray = (selectedDays: string[], timeSlots: Record<string, TimeSlot>, extraRows: TimeSlot[]) => {
    const base = selectedDays.map(day => ({
        day,
        start_time: timeSlots[day].start,
        end_time: timeSlots[day].end,
        room: timeSlots[day].room || '',
    }));
    const extra = extraRows.filter(r => r.selected).map(r => ({
        day: r.day,
        start_time: r.start,
        end_time: r.end,
        room: r.room || '',
    }));
    return [...base, ...extra];
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
                return `Time overlap detected on ${DAYS.find(d => d.key === day)?.label || day}.`;
            }
        }
    }
    return null;
};

// ===================== Main Component =====================
const EditClassOperationForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // ===================== States =====================
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [courseOperationInfo, setCourseOperationInfo] = useState<CourseOperation | null>(null);

    const [departments, setDepartments] = useState<Department[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);

    const [deptId, setDeptId] = useState('');
    const [programId, setProgramId] = useState('');
    const [courseId, setCourseId] = useState('');
    const [section, setSection] = useState('');
    const [year, setYear] = useState('');
    const [semester, setSemester] = useState('');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [timeSlots, setTimeSlots] = useState<Record<string, TimeSlot>>(
        DAYS.reduce((acc, day) => {
            acc[day.key] = { id: day.key, day: day.label, start: "", end: "", room: "" };
            return acc;
        }, {} as Record<string, TimeSlot>)
    );
    const [rows, setRows] = useState<TimeSlot[]>([]);

    // ===================== Load Data =====================
    useEffect(() => {
        if (id) fetchCourseOperationData();
    }, [id]);

    useEffect(() => {
        if (deptId) fetchPrograms(deptId);
        else setPrograms([]);
    }, [deptId]);

    useEffect(() => {
        if (programId) fetchCourses(programId);
        else setCourses([]);
    }, [programId]);

    const fetchCourseOperationData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("access_token");
            const res = await api.post(
                "/api/single_course_operation_info",
                { course_operation_id: id },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.status === 'success') {
                const info: CourseOperation = res.data.data.data;
                setCourseOperationInfo(info);

                // Populate basic fields
                setDeptId(info.dept_id);
                setProgramId(info.program_id);
                setCourseId(info.course_id);
                setSection(info.course_section);
                setYear(info.course_year);
                setSemester(info.course_semester);

                // Populate dates
                if (info.start_date) setStartDate(new Date(info.start_date));
                if (info.end_date) setEndDate(new Date(info.end_date));

                // Populate schedule: detect which slots are "fixed" days vs extra rows
                if (info.schedule && Array.isArray(info.schedule)) {
                    const dayKeys = DAYS.map(d => d.key);
                    const newSelectedDays: string[] = [];
                    const newTimeSlots = { ...timeSlots };
                    const newRows: TimeSlot[] = [];

                    // Group schedule entries by day key
                    const dayCount: Record<string, number> = {};
                    for (const entry of info.schedule) {
                        dayCount[entry.day] = (dayCount[entry.day] || 0) + 1;
                    }

                    for (const entry of info.schedule) {
                        const isDayKey = dayKeys.includes(entry.day);
                        const isFirstOccurrence = !newSelectedDays.includes(entry.day);

                        if (isDayKey && isFirstOccurrence && dayCount[entry.day] === 1) {
                            // Single occurrence for a known day -> use fixed slot
                            newSelectedDays.push(entry.day);
                            const duration = calcDuration(entry.start_time, entry.end_time);
                            newTimeSlots[entry.day] = {
                                id: entry.day,
                                day: DAYS.find(d => d.key === entry.day)?.label || entry.day,
                                start: entry.start_time,
                                end: entry.end_time,
                                room: entry.room,
                                duration,
                            };
                        } else {
                            // Multiple occurrences or unknown day -> add as extra row
                            const duration = calcDuration(entry.start_time, entry.end_time);
                            newRows.push({
                                id: Date.now().toString() + Math.random(),
                                day: entry.day,
                                start: entry.start_time,
                                end: entry.end_time,
                                room: entry.room,
                                selected: true,
                                duration,
                            });
                        }
                    }

                    setSelectedDays(newSelectedDays);
                    setTimeSlots(newTimeSlots);
                    setRows(newRows);
                }

                // Fetch cascaded dropdowns
                await fetchDepartments(info.dept_id, info.program_id);
            } else {
                alert('Failed to load course operation data.');
                navigate('/class-operation');
            }
        } catch (error) {
            console.error("Error loading class operation:", error);
            alert('Error loading data.');
            navigate('/class-operation');
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async (selectedDeptId?: string, selectedProgramId?: string) => {
        try {
            const token = localStorage.getItem("access_token");
            const { data } = await api.post("/api/department/list", {}, { headers: { Authorization: `Bearer ${token}` } });
            setDepartments(data.data);
            if (selectedDeptId) {
                await fetchPrograms(selectedDeptId, selectedProgramId);
            }
        } catch (err) { console.error(err); }
    };

    const fetchPrograms = async (departmentId: string, selectedProgramId?: string) => {
        try {
            const token = localStorage.getItem("access_token");
            const { data } = await api.post("/api/department/program_list", { dept_id: departmentId }, { headers: { Authorization: `Bearer ${token}` } });
            setPrograms(data.data);
            if (selectedProgramId) {
                await fetchCourses(selectedProgramId);
            }
        } catch (err) { console.error(err); setPrograms([]); }
    };

    const fetchCourses = async (pId: string) => {
        try {
            const token = localStorage.getItem("access_token");
            const { data } = await api.post("/api/course/courses-by-program", { program_id: pId }, { headers: { Authorization: `Bearer ${token}` } });
            setCourses(data);
        } catch (err) { console.error(err); setCourses([]); }
    };

    // ===================== Handlers =====================
    const handleDepartmentChange = (value: string) => {
        setDeptId(value);
        setProgramId('');
        setCourseId('');
        setPrograms([]);
        setCourses([]);
    };

    const handleProgramChange = (value: string) => {
        setProgramId(value);
        setCourseId('');
        setCourses([]);
    };

    const toggleDay = (dayKey: string) => {
        if (selectedDays.includes(dayKey)) {
            setSelectedDays(prev => prev.filter(d => d !== dayKey));
            setTimeSlots(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], start: "", end: "", room: "", duration: "" } }));
        } else {
            setSelectedDays(prev => [...prev, dayKey]);
        }
    };

    const updateTimeSlot = (day: string, field: keyof TimeSlot, value: string) => {
        setTimeSlots(prev => {
            const slot = prev[day];
            let updatedValue = value;
            if (field === 'duration') {
                const numVal = parseInt(value) || 0;
                if (numVal > 180) updatedValue = '180';
            }
            const updated = { ...slot, [field]: updatedValue };
            if (field === 'start' && updated.duration) {
                updated.end = addMinutesToTime(updated.start, parseInt(updated.duration) || 0);
            } else if (field === 'duration' && updated.start) {
                updated.end = addMinutesToTime(updated.start, parseInt(updatedValue) || 0);
            }
            return { ...prev, [day]: updated };
        });
    };

    const addRow = () => setRows([...rows, { id: Date.now().toString(), day: "", start: "", end: "", room: "", selected: true }]);
    const removeRow = (rowId: string) => setRows(rows.filter(r => r.id !== rowId));

    const updateRow = (rowId: string, field: keyof TimeSlot, value: string) => {
        setRows(prevRows => prevRows.map(r => {
            if (r.id !== rowId) return r;
            let updatedValue = value;
            if (field === 'duration') {
                const numVal = parseInt(value) || 0;
                if (numVal > 180) updatedValue = '180';
            }
            const updated = { ...r, [field]: updatedValue };
            if (field === 'start' && updated.duration) {
                updated.end = addMinutesToTime(updated.start, parseInt(updated.duration) || 0);
            } else if (field === 'duration' && updated.start) {
                updated.end = addMinutesToTime(updated.start, parseInt(updatedValue) || 0);
            }
            return updated;
        }));
    };

    // ===================== Validation =====================
    const validateForm = (): string | null => {
        if (!courseId) return 'Please select a course.';
        if (!deptId) return 'Please select a department.';
        if (!programId) return 'Please select a program.';
        if (selectedDays.length === 0 && rows.filter(r => r.selected).length === 0)
            return 'Please select at least one day or add a routine row.';
        if (!startDate || !endDate) return 'Please set start and end dates.';
        if (new Date(endDate) < new Date(startDate)) return 'End date must be after start date.';

        for (const day of selectedDays) {
            const slot = timeSlots[day];
            if (!slot.start || !slot.end) return `Please set start and end times for ${slot.day}.`;
            if (new Date(`1970-01-01T${slot.end}`) <= new Date(`1970-01-01T${slot.start}`))
                return `End time must be after start time for ${slot.day}.`;
        }
        for (const row of rows.filter(r => r.selected)) {
            if (!row.day) return `Please select a day for all routine rows.`;
            if (!row.start || !row.end) return `Please set start and end times for extra routine row.`;
            if (new Date(`1970-01-01T${row.end}`) <= new Date(`1970-01-01T${row.start}`))
                return `End time must be after start time for ${row.day}.`;
        }

        const allSlots = [
            ...selectedDays.map(d => ({ day: d, start: timeSlots[d].start, end: timeSlots[d].end })),
            ...rows.filter(r => r.selected).map(r => ({ day: r.day, start: r.start, end: r.end }))
        ];
        return checkTimeOverlap(allSlots);
    };

    // ===================== Submit =====================
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const error = validateForm();
        if (error) { alert(error); return; }

        try {
            setSaving(true);
            const token = localStorage.getItem("access_token");
            const userData = getUserData();

            const payload = {
                course_operation_id: id,
                course_id: courseId,
                program_id: programId,
                faculty_id: userData.emp_id,
                start_date: formatDate(startDate),
                end_date: formatDate(endDate!),
                selected_days: convertTimeSlotsToArray(selectedDays, timeSlots, rows),
                course_year: year,
                course_semester: semester,
                course_section: section,
            };

            await api.post("/api/update_course_operation", payload, { headers: { Authorization: `Bearer ${token}` } });
            alert('✅ Course operation updated successfully!');
            navigate('/class-operation');
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || '❌ Failed to update course operation.');
        } finally {
            setSaving(false);
        }
    };

    // ===================== Render =====================
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading course operation...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <PageMeta title="Edit Course Operation | Dashboard" description="Edit your course operation" />
            <PageBreadcrumb pageTitle="Edit Course Operation" />

            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-5 xl:px-10 xl:py-5">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h6 className="text-3xl font-bold mb-1">Edit Course Operation</h6>
                        <p className="text-gray-600">Update schedule and course details</p>
                    </div>
                    <button
                        onClick={() => navigate("/class-operation")}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-indigo-700"
                    >
                        ← Back to Records
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 pb-24">

                    {/* Course Info */}
                    <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Course Information</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Department */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Department <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    value={deptId}
                                    onChange={(e) => handleDepartmentChange(e.target.value)}
                                    required
                                >
                                    <option value="">Select Department...</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Program */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Program <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    value={programId}
                                    onChange={(e) => handleProgramChange(e.target.value)}
                                    required
                                    disabled={!deptId}
                                >
                                    <option value="">Select Program...</option>
                                    {programs.map((prog) => (
                                        <option key={prog.id} value={prog.id}>{prog.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Course */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Course <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    value={courseId}
                                    onChange={(e) => setCourseId(e.target.value)}
                                    required
                                    disabled={!programId}
                                >
                                    <option value="">Select Course...</option>
                                    {courses.map((c) => (
                                        <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Section */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Section <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    value={section}
                                    onChange={(e) => setSection(e.target.value)}
                                    required
                                >
                                    <option value="">Select Section...</option>
                                    {SECTIONS.map((s) => (
                                        <option key={s.id} value={s.id}>{s.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Schedule Details</h3>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Date <span className="text-red-500">*</span>
                                </label>
                                <DatePicker
                                    selected={startDate}
                                    onChange={(date: Date) => setStartDate(date)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    placeholderText="Select start date"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    End Date <span className="text-red-500">*</span>
                                </label>
                                <DatePicker
                                    selected={endDate}
                                    onChange={(date: Date) => setEndDate(date)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    placeholderText="Select end date"
                                />
                            </div>
                        </div>

                        {/* Year & Semester */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Year <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    required
                                >
                                    <option value="">Select Year...</option>
                                    {YEARS.map(y => <option key={y.id} value={y.id}>{y.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Semester <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    value={semester}
                                    onChange={(e) => setSemester(e.target.value)}
                                    required
                                >
                                    <option value="">Select Semester...</option>
                                    {SEMESTERS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Day Toggles */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Days</label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map(d => (
                                    <button
                                        key={d.key}
                                        type="button"
                                        onClick={() => toggleDay(d.key)}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition ${selectedDays.includes(d.key)
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* TimeSlots Table */}
                        <div className="overflow-x-auto mt-4">
                            <table className="min-w-full table-auto border border-gray-200 rounded-xl">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-2 border text-sm font-semibold">Day</th>
                                        <th className="px-3 py-2 border text-sm font-semibold">Start Time</th>
                                        <th className="px-3 py-2 border text-sm font-semibold">Duration (Min)</th>
                                        <th className="px-3 py-2 border text-sm font-semibold">End Time</th>
                                        <th className="px-3 py-2 border text-sm font-semibold">Room</th>
                                        <th className="px-3 py-2 border text-sm font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Fixed day slots */}
                                    {selectedDays.map(dayKey => {
                                        const slot = timeSlots[dayKey];
                                        return (
                                            <tr key={slot.id}>
                                                <td className="px-3 py-2 border font-medium text-gray-700">{slot.day}</td>
                                                <td className="px-3 py-2 border">
                                                    <input
                                                        type="time"
                                                        value={slot.start}
                                                        onChange={e => updateTimeSlot(dayKey, 'start', e.target.value)}
                                                        className="w-full px-2 py-1 border rounded-lg"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border">
                                                    <input
                                                        type="number"
                                                        value={slot.duration || ''}
                                                        onChange={e => updateTimeSlot(dayKey, 'duration', e.target.value)}
                                                        className="w-full px-2 py-1 border rounded-lg"
                                                        placeholder="Min"
                                                        max={180}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border">
                                                    <input
                                                        type="text"
                                                        value={formatTo12Hour(slot.end)}
                                                        readOnly
                                                        className="w-full px-2 py-1 border rounded-lg bg-gray-100 cursor-not-allowed"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border">
                                                    <input
                                                        type="text"
                                                        value={slot.room}
                                                        onChange={e => updateTimeSlot(dayKey, 'room', e.target.value)}
                                                        className="w-full px-2 py-1 border rounded-lg"
                                                        placeholder="Room no."
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleDay(dayKey)}
                                                        className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs"
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Extra rows */}
                                    {rows.map(row => (
                                        <tr key={row.id}>
                                            <td className="px-3 py-2 border">
                                                <select
                                                    value={row.day}
                                                    onChange={e => updateRow(row.id, "day", e.target.value)}
                                                    className="w-full px-2 py-1 border rounded-lg"
                                                >
                                                    <option value="">Select Day</option>
                                                    {DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 border">
                                                <DatePicker
                                                    selected={row.start ? new Date(`2024-01-01T${row.start}`) : null}
                                                    onChange={(time: Date) => updateRow(row.id, 'start', time.toTimeString().substring(0, 5))}
                                                    showTimeSelect
                                                    showTimeSelectOnly
                                                    timeIntervals={15}
                                                    timeCaption="Start"
                                                    dateFormat="hh:mm aa"
                                                    className="w-full px-2 py-1 border rounded-lg focus:border-indigo-500 outline-none"
                                                    placeholderText="Select time"
                                                />
                                            </td>
                                            <td className="px-3 py-2 border">
                                                <input
                                                    type="number"
                                                    value={row.duration || ''}
                                                    onChange={e => updateRow(row.id, 'duration', e.target.value)}
                                                    className="w-full px-2 py-1 border rounded-lg"
                                                    placeholder="Min"
                                                    max={180}
                                                />
                                            </td>
                                            <td className="px-3 py-2 border">
                                                <input
                                                    type="text"
                                                    value={formatTo12Hour(row.end)}
                                                    readOnly
                                                    className="w-full px-2 py-1 border rounded-lg bg-gray-100 cursor-not-allowed"
                                                />
                                            </td>
                                            <td className="px-3 py-2 border">
                                                <input
                                                    type="text"
                                                    value={row.room}
                                                    onChange={e => updateRow(row.id, 'room', e.target.value)}
                                                    className="w-full px-2 py-1 border rounded-lg"
                                                    placeholder="Room no."
                                                />
                                            </td>
                                            <td className="px-3 py-2 border">
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(row.id)}
                                                    className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                                >
                                                    Drop
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {selectedDays.length === 0 && rows.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-6 text-center text-gray-400 italic">
                                                No schedule added. Select a day above or click "+ Add New" below.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            <button
                                type="button"
                                onClick={addRow}
                                className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            >
                                + Add New
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-4 flex gap-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving && (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                            )}
                            {saving ? 'Saving...' : 'Update Course Operation'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/class-operation')}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditClassOperationForm;