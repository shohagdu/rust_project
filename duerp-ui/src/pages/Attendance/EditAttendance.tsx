import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageMeta from "../../components/common/PageMeta.tsx";
import api from "../../api";
import Swal from 'sweetalert2';

interface Student {
    id: string;
    name: string;
    initials: string;
    registration_no: string;
    roll_no: string;
}

type AttendanceStatus = 'present' | 'absent';

interface AttendanceData {
    [studentId: string]: AttendanceStatus;
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
}

interface ClassInfo {
    class_id: string;
    course_operation_id: string;
    attendance_date: string;
    start_time: string;
    end_time: string;
    created_at: string;
    updated_at: string;
}

// ─── Custom Date Picker ───────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

interface CustomDatePickerProps {
    value: Date | null;
    onChange: (date: Date | null) => void;
    placeholder?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, placeholder = 'Select date' }) => {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<{ year: number; month: number }>(() => {
        const d = value || new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const ref = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (value) setView({ year: value.getFullYear(), month: value.getMonth() });
    }, [value]);

    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const firstDay = new Date(view.year, view.month, 1).getDay();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    const prevMonth = () => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
    const nextMonth = () => setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });

    const isSelected = (day: number) => value && value.getFullYear() === view.year && value.getMonth() === view.month && value.getDate() === day;
    const isToday = (day: number) => { const t = new Date(); return t.getFullYear() === view.year && t.getMonth() === view.month && t.getDate() === day; };

    const select = (day: number) => {
        onChange(new Date(view.year, view.month, day));
        setOpen(false);
    };

    const display = value ? value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center gap-2 px-3 py-2 border-2 rounded-xl text-sm transition-all outline-none
                    ${open ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}
            >
                <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                </svg>
                <span className={`flex-1 text-left ${display ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                    {display || placeholder}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>

            {open && (
                <div className="absolute top-full mt-2 left-0 z-[9999] bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 w-72">
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>
                        <span className="text-sm font-bold text-gray-800">{MONTHS[view.month]} {view.year}</span>
                        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                    <div className="grid grid-cols-7 mb-1">
                        {DAYS.map(d => (
                            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1">
                        {cells.map((day, i) => (
                            <div key={i} className="flex items-center justify-center">
                                {day ? (
                                    <button
                                        onClick={() => select(day)}
                                        className={`w-9 h-9 text-sm rounded-xl font-medium transition-all
                                            ${isSelected(day) ? 'bg-indigo-600 text-white shadow-md' :
                                              isToday(day) ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-200' :
                                              'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                    >
                                        {day}
                                    </button>
                                ) : <span />}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <button onClick={() => { onChange(new Date()); setOpen(false); }} className="text-xs text-indigo-600 font-semibold hover:underline">Today</button>
                        {value && (
                            <button onClick={() => { onChange(null); setOpen(false); }} className="text-xs text-red-400 hover:underline">Clear</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Custom Time Picker ───────────────────────────────────────────────────────
interface CustomTimePickerProps {
    value: Date | null;
    onChange: (time: Date | null) => void;
    placeholder?: string;
    intervalMinutes?: number;
    minTime?: Date | null;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({ value, onChange, placeholder = 'Select time', intervalMinutes = 5, minTime }) => {
    const [open, setOpen] = useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    const slots = useMemo(() => {
        const result: { label: string; h: number; m: number }[] = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += intervalMinutes) {
                const ampm = h < 12 ? 'AM' : 'PM';
                const hh = h % 12 === 0 ? 12 : h % 12;
                const mm = String(m).padStart(2, '0');
                result.push({ label: `${hh}:${mm} ${ampm}`, h, m });
            }
        }
        return result;
    }, [intervalMinutes]);

    const amSlots = slots.filter(s => s.h < 12);
    const pmSlots = slots.filter(s => s.h >= 12);

    const [tab, setTab] = useState<'AM' | 'PM'>(() => {
        if (value) return value.getHours() >= 12 ? 'PM' : 'AM';
        return 'AM';
    });

    useEffect(() => {
        if (value) setTab(value.getHours() >= 12 ? 'PM' : 'AM');
    }, [value]);

    const activeSlots = tab === 'AM' ? amSlots : pmSlots;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const isSelected = (s: { h: number; m: number }) =>
        value && value.getHours() === s.h && value.getMinutes() === s.m;

    const isDisabled = (s: { h: number; m: number }) => {
        if (!minTime) return false;
        return s.h * 60 + s.m <= minTime.getHours() * 60 + minTime.getMinutes();
    };

    const select = (s: { h: number; m: number }) => {
        if (isDisabled(s)) return;
        const d = new Date();
        d.setHours(s.h, s.m, 0, 0);
        onChange(d);
        setOpen(false);
    };

    const display = value
        ? (() => {
            const h = value.getHours();
            const m = value.getMinutes();
            const ampm = h < 12 ? 'AM' : 'PM';
            const hh = h % 12 === 0 ? 12 : h % 12;
            return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
          })()
        : '';

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center gap-2 px-3 py-2 border-2 rounded-xl text-sm transition-all outline-none
                    ${open ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}
            >
                <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                    <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className={`flex-1 text-left ${display ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                    {display || placeholder}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>

            {open && (
                <div className="absolute top-full mt-2 left-0 z-[9999] bg-white border border-gray-200 rounded-2xl shadow-2xl w-52 overflow-hidden">
                    <div className="flex border-b border-gray-100">
                        {(['AM', 'PM'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setTab(p)}
                                className={`flex-1 py-2.5 text-xs font-bold tracking-widest transition-all
                                    ${tab === p ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1 p-2 max-h-56 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {activeSlots.map((s, i) => {
                            const disabled = isDisabled(s);
                            const selected = isSelected(s);
                            return (
                                <button
                                    key={i}
                                    onClick={() => select(s)}
                                    disabled={disabled}
                                    className={`py-2 rounded-lg text-xs font-semibold transition-all
                                        ${disabled
                                            ? 'text-gray-300 cursor-not-allowed line-through'
                                            : selected
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                                >
                                    {s.label.replace(' AM', '').replace(' PM', '')}
                                </button>
                            );
                        })}
                    </div>
                    {value && (
                        <div className="border-t border-gray-100 px-3 py-2 flex justify-between items-center">
                            <span className="text-xs font-semibold text-indigo-600">{display}</span>
                            <button onClick={() => { onChange(null); setOpen(false); }} className="text-xs text-red-400 hover:underline">Clear</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const EditAttendance: React.FC = () => {
    const navigate = useNavigate();
    const { classId } = useParams<{ classId: string }>();

    const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
    const [initialAttendanceData, setInitialAttendanceData] = useState<AttendanceData>({});
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [courseOperationID, setCourseOperationID] = useState<string>('');
    const [courseOperationInfo, setCourseOperationInfo] = useState<CourseOperation | null>(null);
    const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
    const [classDate, setClassDate] = useState<Date | null>(null);
    const [searchRollNo, setSearchRollNo] = useState<string>('');
    const [classStartTime, setClassStartTime] = useState<Date | null>(null);
    const [classEndTime, setClassEndTime] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const parseRollNumbers = (value: string): string[] => {
        const cleaned = value
            .replace(/roll\s*no\s*:?/gi, ' ')
            .replace(/present/gi, ' ')
            .replace(/--+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!cleaned) return [];
        return cleaned.split(/[,\s]+/).map((roll) => roll.trim()).filter(Boolean);
    };

    const clearSearchPresent = useCallback((): void => {
        setSearchRollNo('');
    }, []);

    const handleSearchPresent = useCallback((): void => {
        const rollNumbers = parseRollNumbers(searchRollNo);
        if (rollNumbers.length === 0) {
            Swal.fire({ icon: 'warning', title: 'No Roll Numbers', text: 'Enter at least one roll number to mark present.', confirmButtonColor: '#6366f1' });
            return;
        }

        const rollToStudentId = new Map<string, string>();
        const suffixToStudentIds = new Map<string, string[]>();

        students.forEach((student) => {
            if (!student.roll_no) return;
            const roll = student.roll_no.toLowerCase();
            rollToStudentId.set(roll, student.id);
            const parts = roll.split('-').filter(Boolean);
            const suffix = parts.length > 0 ? parts[parts.length - 1] : roll;
            if (!suffix) return;
            const list = suffixToStudentIds.get(suffix) || [];
            list.push(student.id);
            suffixToStudentIds.set(suffix, list);
        });

        const updatedAttendance = { ...attendanceData };
        let matched = 0;
        const ambiguous: string[] = [];

        rollNumbers.forEach((rollNo) => {
            const normalized = rollNo.toLowerCase();
            let studentId = rollToStudentId.get(normalized);
            if (!studentId && /^\d+$/.test(normalized)) {
                const numericToken = String(parseInt(normalized, 10));
                const matchedSuffix = Array.from(suffixToStudentIds.keys()).find(
                    (suffix) => String(parseInt(suffix, 10)) === numericToken
                );
                if (matchedSuffix) {
                    const candidates = suffixToStudentIds.get(matchedSuffix) || [];
                    if (candidates.length === 1) studentId = candidates[0];
                    else if (candidates.length > 1) ambiguous.push(rollNo);
                }
            }
            if (studentId) { updatedAttendance[studentId] = 'present'; matched += 1; }
        });

        setAttendanceData(updatedAttendance);

        const missing = rollNumbers.filter((rollNo) => {
            const normalized = rollNo.toLowerCase();
            if (rollToStudentId.has(normalized)) return false;
            if (/^\d+$/.test(normalized)) {
                const numericToken = String(parseInt(normalized, 10));
                return !Array.from(suffixToStudentIds.keys()).some(
                    (suffix) => String(parseInt(suffix, 10)) === numericToken
                );
            }
            return true;
        });

        if (ambiguous.length > 0) {
            Swal.fire({ icon: 'warning', title: 'Ambiguous Roll Numbers', text: `Ambiguous roll numbers: ${ambiguous.join(', ')}`, confirmButtonColor: '#6366f1' });
        } else if (missing.length > 0) {
            Swal.fire({ icon: 'error', title: 'Not Found', text: `Roll numbers not found: ${missing.join(', ')}`, confirmButtonColor: '#6366f1' });
        } else if (matched === 0) {
            Swal.fire({ icon: 'info', title: 'No Match', text: 'No matching roll numbers found.', confirmButtonColor: '#6366f1' });
        }
    }, [attendanceData, searchRollNo, students]);

    useEffect(() => {
        const fetchAttendanceData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("access_token");
                if (!classId) throw new Error("Class ID not found");

                const attendanceResponse = await api.post(
                    "/api/attendance/get_attendance_class_std",
                    { class_id: classId },
                    { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
                );

                const attendanceResp = attendanceResponse.data;
                if (!attendanceResp || !attendanceResp.data) throw new Error("No attendance data found");

                const masterInfo = attendanceResp.attendance_master_info;
                let courseOpId = masterInfo.course_operation_id || attendanceResp.data[0]?.course_operation_id || '';
                setCourseOperationID(courseOpId);

                setCourseOperationInfo({
                    course_code: masterInfo.course_code || '',
                    course_id: '',
                    course_name: masterInfo.course_title || '',
                    course_operation_id: courseOpId,
                    department_name: masterInfo.department_name || '',
                    dept_id: '',
                    faculty_name: '',
                    program_id: '',
                    program_name: masterInfo.program_name || '',
                    course_section: masterInfo.course_section || '',
                    course_year: masterInfo.course_year || '',
                    course_semester: masterInfo.course_semester || '',
                });

                setClassInfo({
                    class_id: classId,
                    course_operation_id: courseOpId,
                    attendance_date: masterInfo.attendance_date,
                    start_time: masterInfo.start_time,
                    end_time: masterInfo.end_time,
                    created_at: '',
                    updated_at: '',
                });

                if (masterInfo.attendance_date) setClassDate(new Date(masterInfo.attendance_date));
                if (masterInfo.start_time) {
                    const [h, m] = masterInfo.start_time.split(':');
                    const t = new Date(); t.setHours(parseInt(h), parseInt(m)); setClassStartTime(t);
                }
                if (masterInfo.end_time) {
                    const [h, m] = masterInfo.end_time.split(':');
                    const t = new Date(); t.setHours(parseInt(h), parseInt(m)); setClassEndTime(t);
                }

                const initialAttendance: AttendanceData = {};
                const apiStudents = attendanceResp.data.map((record: any) => {
                    const studentId = String(record.student_id);
                    initialAttendance[studentId] = Number(record.is_present) === 1 ? 'present' : 'absent';
                    return {
                        id: studentId,
                        registration_no: record.reg_no ? String(record.reg_no) : '',
                        roll_no: record.roll_no ? String(record.roll_no) : '',
                        name: record.name || "Unknown Student",
                        initials: record.name ? record.name.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "N/A",
                    };
                });

                setStudents(apiStudents || []);
                setInitialAttendanceData(initialAttendance);
                setAttendanceData(initialAttendance);
            } catch (err: any) {
                const message = err.response?.data?.message || "Failed to load attendance data.";
                setError(message);
                Swal.fire({ icon: 'error', title: 'Load Failed', text: message, confirmButtonColor: '#6366f1' });
            } finally {
                setLoading(false);
            }
        };
        fetchAttendanceData();
    }, [classId]);

    const markAttendance = useCallback((studentId: string, status: AttendanceStatus): void => {
        setAttendanceData((prev) => ({ ...prev, [studentId]: status }));
    }, []);

    const resetAttendance = useCallback((): void => {
        setAttendanceData(initialAttendanceData);
    }, [initialAttendanceData]);

    const formatDate = (date: Date | null): string => {
        if (!date) return '';
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const toTimeManual = (value: Date | null): string => {
        if (!value) return '';
        return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
    };

    const updateAttendance = async (): Promise<void> => {
        if (!classDate || !classStartTime || !classEndTime) {
            Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please select class date, start time, and end time.', confirmButtonColor: '#6366f1' });
            return;
        }
        if (!courseOperationID) {
            Swal.fire({ icon: 'error', title: 'Missing Info', text: 'Course operation ID not found.', confirmButtonColor: '#6366f1' });
            return;
        }

        const presentCount = Object.values(attendanceData).filter(s => s === 'present').length;
        const absentCount = students.length - presentCount;

        const toTimeDisplay = (d: Date) => {
            const h = d.getHours(); const m = d.getMinutes();
            const ampm = h < 12 ? 'AM' : 'PM';
            const hh = h % 12 === 0 ? 12 : h % 12;
            return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
        };

        const confirm = await Swal.fire({
            title: 'Confirm Update',
            html: `
                <div style="text-align:left; font-size:14px; line-height:2">
                    <div style="margin-bottom:10px; color:#6b7280;">
                        📅 <b>${classDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</b>
                        &nbsp;&nbsp;🕐 <b>${toTimeDisplay(classStartTime)} – ${toTimeDisplay(classEndTime)}</b>
                    </div>
                    <hr style="margin:8px 0; border-color:#e5e7eb"/>
                    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:10px">
                        <span style="background:#dcfce7; color:#15803d; padding:4px 14px; border-radius:999px; font-weight:600;">✓ ${presentCount} Present</span>
                        <span style="background:#fee2e2; color:#b91c1c; padding:4px 14px; border-radius:999px; font-weight:600;">✗ ${absentCount} Absent</span>
                    </div>
                    <div style="margin-top:12px; color:#6b7280; font-size:13px;">Total: <b>${students.length}</b> students</div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Update Attendance',
            cancelButtonText: 'Go Back & Review',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#e5e7eb',
            reverseButtons: true,
        });

        if (!confirm.isConfirmed) return;

        try {
            setLoading(true);
            const token = localStorage.getItem("access_token");
            const payload = {
                course_operation_id: courseOperationID,
                attendance_date: formatDate(classDate),
                start_time: toTimeManual(classStartTime),
                end_time: toTimeManual(classEndTime),
                attendance: students.map((s) => ({
                    std_id: s.id,
                    is_present: attendanceData[s.id] === 'present' ? 1 : 0,
                })),
            };

            const response = await api.post(
                "/api/attendance/update_attendance",
                payload,
                { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
            );

            if (response.status === 200 || response.status === 201) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Attendance Updated!',
                    html: `<b>${presentCount}</b> present &nbsp;·&nbsp; <b>${absentCount}</b> absent<br/>out of <b>${students.length}</b> students.`,
                    confirmButtonColor: '#6366f1',
                });
                navigate('/manage-class-list/' + courseOperationID);
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || "Failed to update attendance. Please try again.";
            Swal.fire({ icon: 'error', title: 'Update Failed', text: errorMessage, confirmButtonColor: '#6366f1' });
        } finally {
            setLoading(false);
        }
    };

    const [presentCount, absentCount] = useMemo(() => {
        let present = 0, absent = 0;
        Object.values(attendanceData).forEach((s) => { if (s === 'present') present++; else absent++; });
        return [present, absent];
    }, [attendanceData]);

    const filteredStudents: Student[] = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return students;
        return students.filter((student) => {
            const name = student.name?.toLowerCase() || '';
            const roll = student.roll_no?.toLowerCase() || '';
            const reg = student.registration_no?.toLowerCase() || '';
            const studentId = student.id?.toLowerCase() || '';
            return name.includes(query) || roll.includes(query) || reg.includes(query) || studentId.includes(query);
        });
    }, [searchQuery, students]);

    const allChecked = filteredStudents.length > 0 && filteredStudents.every(s => attendanceData[s.id] === 'present');
    const someChecked = filteredStudents.some(s => attendanceData[s.id] === 'present') && !allChecked;

    const toggleAllPresent = useCallback(() => {
        const next = !allChecked;
        setAttendanceData(prev => {
            const updated = { ...prev };
            filteredStudents.forEach(s => { updated[s.id] = next ? 'present' : 'absent'; });
            return updated;
        });
    }, [allChecked, filteredStudents]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading attendance data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
                    <p className="text-gray-600">{error}</p>
                    <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-indigo-500 text-white rounded-lg">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PageMeta title="Edit Attendance" description="Edit Attendance" />

            {/* Header */}
            <div className="sticky top-0 z-40 bg-gray-50 pb-2 pt-2">
                <div className="max-w-7xl mx-auto space-y-2">

                    {/* Course info card */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium mb-3">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editing Mode
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 tracking-wide">
                            {courseOperationInfo?.course_code}: {courseOperationInfo?.course_name}
                        </h1>
                        <div className="flex justify-center gap-4 text-sm text-gray-600 mb-3 text-center mt-1">
                            <span>{courseOperationInfo?.program_name}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{courseOperationInfo?.department_name}</p>
                        {classInfo && (
                            <div className="mt-3 flex justify-center gap-3 text-xs text-gray-600">
                                <span>📅 {classInfo.attendance_date}</span>
                                <span>🕐 {classInfo.start_time} - {classInfo.end_time}</span>
                            </div>
                        )}
                        <div className="flex justify-center gap-4 mt-3 flex-wrap">
                            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-xs font-medium border border-green-200">✓ {presentCount} Present</div>
                            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-full text-xs font-medium border border-red-200">✗ {absentCount} Absent</div>
                            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-medium border border-blue-200">📊 {students.length} Total</div>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-1 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="w-full md:w-1/6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search Student</label>
                            <input type="text" className="w-full px-2 py-1 border rounded-lg focus:border-indigo-500 outline-none" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>

                        <div className="w-full md:w-1/6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Class Date</label>
                            <CustomDatePicker value={classDate} onChange={setClassDate} placeholder="Select date" />
                        </div>

                        <div className="w-full md:w-1/6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                            <CustomTimePicker
                                value={classStartTime}
                                onChange={(t) => {
                                    setClassStartTime(t);
                                    if (t && classEndTime) {
                                        const startMins = t.getHours() * 60 + t.getMinutes();
                                        const endMins = classEndTime.getHours() * 60 + classEndTime.getMinutes();
                                        if (endMins <= startMins) setClassEndTime(null);
                                    }
                                }}
                                placeholder="Start time"
                                intervalMinutes={5}
                            />
                        </div>

                        <div className="w-full md:w-1/6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                            <CustomTimePicker
                                value={classEndTime}
                                onChange={(t) => {
                                    if (t && classStartTime) {
                                        const endMins = t.getHours() * 60 + t.getMinutes();
                                        const startMins = classStartTime.getHours() * 60 + classStartTime.getMinutes();
                                        if (endMins <= startMins) return;
                                    }
                                    setClassEndTime(t);
                                }}
                                placeholder="End time"
                                intervalMinutes={5}
                                minTime={classStartTime}
                            />
                        </div>

                        <div className="flex gap-3 w-full md:w-auto md:self-end flex-wrap">
                            <button onClick={resetAttendance} className="w-10 h-10 rounded-lg border-2 flex items-center justify-center transition hover:bg-gray-50" title="Reset attendance">
                                <svg className="w-6 h-6 text-gray-800" fill="none" viewBox="0 0 20 20">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 10a8 8 0 1 0 3.14-6.31L1 4.5M1 1v3.5h3.5" />
                                </svg>
                            </button>
                            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 border-2 border-purple-500 text-purple-500 hover:bg-purple-50 rounded-lg text-sm font-medium transition">
                                🔍 Quick Attendance
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div className="max-w-7xl mx-auto pt-4 px-0">

                {/* No students */}
                {students.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-10 py-12 flex flex-col items-center max-w-md w-full text-center">
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-5">
                                <svg className="w-10 h-10 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8zm6 0a3 3 0 100-6 3 3 0 000 6zm-12 0a3 3 0 100-6 3 3 0 000 6"/>
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">No Students Found</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">No attendance records found for this class.</p>
                        </div>
                    </div>
                )}

                {/* Table */}
                {students.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Registration No.</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Roll No.</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                                        <div className="flex items-center justify-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={allChecked}
                                                ref={el => { if (el) el.indeterminate = someChecked; }}
                                                onChange={toggleAllPresent}
                                                className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                                                title="Check all present"
                                            />
                                            {/* <span>Present</span> */}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center">
                                                    <svg className="w-7 h-7 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <circle cx="11" cy="11" r="8" strokeWidth="1.5"/>
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-4.35-4.35"/>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-700">No Results Found</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">No students match "<span className="font-medium text-gray-600">{searchQuery}</span>"</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student, idx) => {
                                        const currentStatus: AttendanceStatus | undefined = attendanceData[student.id];
                                        const rowBg = currentStatus === 'present'
                                            ? 'bg-green-50/40'
                                            : currentStatus === 'absent'
                                                ? 'bg-red-50/40'
                                                : 'hover:bg-gray-50/60';

                                        return (
                                            <tr key={student.id} className={`transition-colors ${rowBg}`}>
                                                {/* Index */}
                                                <td className="px-4 py-3 text-gray-400 font-medium text-xs">{idx + 1}</td>

                                                {/* Student */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                                                            ${currentStatus === 'present' ? 'bg-green-500' : currentStatus === 'absent' ? 'bg-red-400' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                                                            {student.initials}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800 leading-tight">{student.name}</p>
                                                            <p className="text-xs text-gray-400 sm:hidden">{student.registration_no}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Registration No */}
                                                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{student.registration_no || '—'}</td>

                                                {/* Roll No */}
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-md">
                                                        {student.roll_no || '—'}
                                                    </span>
                                                </td>

                                                {/* Checkbox */}
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={currentStatus === 'present'}
                                                        onChange={(e) => markAttendance(student.id, e.target.checked ? 'present' : 'absent')}
                                                        className="w-7 h-7 rounded accent-indigo-600 cursor-pointer"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        {/* Table footer */}
                        {filteredStudents.length > 0 && (
                            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                                <p className="text-xs text-gray-500">
                                    Showing <span className="font-semibold text-gray-700">{filteredStudents.length}</span> of <span className="font-semibold text-gray-700">{students.length}</span> students
                                </p>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1 text-green-700 font-semibold">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        {presentCount} Present
                                    </span>
                                    <span className="flex items-center gap-1 text-red-600 font-semibold">
                                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                        {absentCount} Absent
                                    </span>
                                    {/* <span className="flex items-center gap-1 text-gray-400 font-semibold">
                                        <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                                        {students.length - presentCount - absentCount} Unmarked
                                    </span> */}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Quick Attendance Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold">Quick Attendance & Mark Present</h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-white/20 rounded-full p-2 transition">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800"><strong>💡 Tip:</strong> Enter roll numbers separated by commas or spaces.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Enter Roll Numbers</label>
                                <textarea value={searchRollNo} onChange={(e) => setSearchRollNo(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none resize-none" placeholder="e.g., 101, 102, 103" rows={4} />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => { handleSearchPresent(); setIsModalOpen(false); }} className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition">✓ Mark Present</button>
                                <button onClick={clearSearchPresent} className="px-6 py-3 bg-red-100 text-red-600 rounded-xl font-semibold hover:bg-red-200 transition">Clear</button>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-b-2xl">
                            <button onClick={() => setIsModalOpen(false)} className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-70 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
                <div className="max-w-7xl mx-auto grid grid-cols-2 gap-3">
                    <button onClick={updateAttendance} className="py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition">Update Attendance</button>
                    <button onClick={() => navigate('/manage-class-list/' + courseOperationID)} className="py-3 border-2 border-gray-300 bg-red-200 text-gray-600 rounded-xl font-semibold hover:bg-red-300 transition">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default EditAttendance;