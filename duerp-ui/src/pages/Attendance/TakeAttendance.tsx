import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
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
    rev_attendance: number;
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

interface ClassEntry {
    attendance_date: string;
    end_time: string;
    id: string;
    start_time: string;
}

interface RoutineEntry {
    course_operation_id: string;
    day_name: string;
    end_time: string;
    id: string;
    start_time: string;
}

interface ClassListData {
    attendance_count: number;
    class_list: ClassEntry[];
    day_name: string;
    message: string;
    routine_count: number;
    routine_info: RoutineEntry[];
    status: string;
}

const parseTimeStringToDate = (timeStr: string): Date | null => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const d = new Date();
    d.setHours(parseInt(parts[0], 10));
    d.setMinutes(parseInt(parts[1], 10));
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
};

const getNearestPastTimeSlot = (intervalMinutes: number = 5): Date => {
    const now = new Date();
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    const roundedMinutes = Math.floor(totalMinutes / intervalMinutes) * intervalMinutes;
    const d = new Date();
    d.setHours(Math.floor(roundedMinutes / 60));
    d.setMinutes(roundedMinutes % 60);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

interface CustomDatePickerProps {
    value: Date | null;
    onChange: (date: Date | null) => void;
    placeholder?: string;
    label?: string;
    variant?: 'default' | 'ghost';
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, placeholder = 'Select date', variant = 'default' }) => {
    const isGhost = variant === 'ghost';
    const [open, setOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const [view, setView] = useState<{ year: number; month: number }>(() => {
        const d = value || new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const btnRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                btnRef.current && !btnRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const dropdownH = 340;
            const spaceBelow = window.innerHeight - rect.bottom;
            const top = spaceBelow >= dropdownH
                ? rect.bottom + window.scrollY + 6
                : rect.top + window.scrollY - dropdownH - 6;
            setDropdownStyle({
                position: 'absolute',
                top,
                left: rect.left + window.scrollX,
                width: '288px',
                zIndex: 99999,
            });
        }
    }, [open]);

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

    const dropdown = open ? ReactDOM.createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4">
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
        </div>,
        document.body
    ) : null;

    return (
        <div className="relative w-full">
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center gap-2 px-3 py-2 border-2 rounded-xl text-sm transition-all outline-none
                    ${isGhost
                        ? open ? 'border-white/60 bg-white/25' : 'border-white/40 bg-white/15 hover:bg-white/25'
                        : open ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'
                    }`}
            >
                <svg className={`w-4 h-4 flex-shrink-0 ${isGhost ? 'text-white/80' : 'text-indigo-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                </svg>
                <span className={`flex-1 text-left font-medium ${isGhost ? (display ? 'text-white' : 'text-white/60') : (display ? 'text-gray-800' : 'text-gray-400')}`}>
                    {display || placeholder}
                </span>
                <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} ${isGhost ? 'text-white/70' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            {dropdown}
        </div>
    );
};

interface CustomTimePickerProps {
    value: Date | null;
    onChange: (time: Date | null) => void;
    placeholder?: string;
    intervalMinutes?: number;
    minTime?: Date | null;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
    value,
    onChange,
    placeholder = 'Select time',
    intervalMinutes = 5,
    minTime = null,
}) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLButtonElement>(null);

    const hourScrollRef = useRef<HTMLDivElement>(null);
    const minScrollRef  = useRef<HTMLDivElement>(null);
    const perScrollRef  = useRef<HTMLDivElement>(null);

    const getHM = (d: Date | null) => {
        if (!d) return { h12: null as number | null, min: null as number | null, period: 'AM' as 'AM' | 'PM' };
        const h24 = d.getHours();
        return {
            h12: h24 % 12 === 0 ? 12 : h24 % 12,
            min: d.getMinutes(),
            period: (h24 >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
        };
    };

    const { h12: selH, min: selM, period: selP } = getHM(value);

    const [draftH, setDraftH] = useState<number>(selH ?? 12);
    const [draftM, setDraftM] = useState<number>(selM ?? 0);
    const [draftP, setDraftP] = useState<'AM' | 'PM'>(selP);

    useEffect(() => {
        const { h12, min, period } = getHM(value);
        setDraftH(h12 ?? 12);
        setDraftM(min ?? 0);
        setDraftP(period);
    }, [value]);

    const minTotalMins = useMemo(() => {
        if (!minTime) return -1;
        return minTime.getHours() * 60 + minTime.getMinutes();
    }, [minTime]);

    const isAfterMin = (h12: number, m: number, p: 'AM' | 'PM'): boolean => {
        if (minTotalMins < 0) return true;
        let h24 = h12 % 12;
        if (p === 'PM') h24 += 12;
        return h24 * 60 + m > minTotalMins;
    };

    const isHourBlocked = (h12: number, p: 'AM' | 'PM'): boolean => {
        if (minTotalMins < 0) return false;
        const mins = Array.from({ length: Math.ceil(60 / intervalMinutes) }, (_, i) => i * intervalMinutes);
        return mins.every(m => !isAfterMin(h12, m, p));
    };

    const isPeriodBlocked = (p: 'AM' | 'PM'): boolean => {
        if (minTotalMins < 0) return false;
        return Array.from({ length: 12 }, (_, i) => i + 1).every(h => isHourBlocked(h, p));
    };

    const isDraftValid = isAfterMin(draftH, draftM, draftP);

    useEffect(() => {
        if (open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const dropH = 300;
            const spaceBelow = window.innerHeight - rect.bottom;
            const top = spaceBelow >= dropH
                ? rect.bottom + window.scrollY + 6
                : rect.top  + window.scrollY - dropH - 6;
            setDropdownStyle({
                position: 'absolute',
                top,
                left: rect.left + window.scrollX,
                width: `${rect.width}px`,
                minWidth: '240px',
                zIndex: 99999,
            });
        }
    }, [open]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const t = e.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(t) &&
                containerRef.current && !containerRef.current.contains(t)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!open) return;
        const scrollToSelected = (ref: React.RefObject<HTMLDivElement>, itemH: number, idx: number) => {
            if (!ref.current) return;
            const containerH = ref.current.clientHeight;
            ref.current.scrollTop = idx * itemH - containerH / 2 + itemH / 2;
        };
        requestAnimationFrame(() => {
            scrollToSelected(hourScrollRef, 40, draftH - 1);
            scrollToSelected(minScrollRef,  40, draftM / intervalMinutes);
            scrollToSelected(perScrollRef,  40, draftP === 'AM' ? 0 : 1);
        });
    }, [open]);

    const hours   = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: Math.ceil(60 / intervalMinutes) }, (_, i) => i * intervalMinutes);
    const periods = ['AM', 'PM'] as const;

    const commit = (h: number, m: number, p: 'AM' | 'PM') => {
        let h24 = h % 12;
        if (p === 'PM') h24 += 12;
        const d = new Date();
        d.setHours(h24, m, 0, 0);
        onChange(d);
    };

    const handleDone = () => {
        if (!isDraftValid) return;
        commit(draftH, draftM, draftP);
        setOpen(false);
    };

    const handleClear = () => {
        onChange(null);
        setOpen(false);
    };

    const display = value
        ? (() => {
            const h = value.getHours();
            const m = value.getMinutes();
            const p = h >= 12 ? 'PM' : 'AM';
            const hh = h % 12 === 0 ? 12 : h % 12;
            return `${hh}:${String(m).padStart(2, '0')} ${p}`;
          })()
        : '';

    const colItem = (active: boolean, blocked: boolean) =>
        `flex items-center justify-center h-10 rounded-lg text-sm font-semibold select-none transition-all mx-1
        ${blocked
            ? 'text-gray-300 cursor-not-allowed line-through'
            : active
                ? 'bg-indigo-600 text-white shadow-sm cursor-pointer'
                : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer'}`;

    const colLabel = 'text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center pb-1 border-b border-gray-100 mb-1';

    const dropdown = open ? ReactDOM.createPortal(
        <div
            ref={containerRef}
            style={dropdownStyle}
            className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
        >
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                        <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span className={`font-bold text-sm ${isDraftValid ? 'text-white' : 'text-red-300'}`}>
                        {`${String(draftH).padStart(2,'0')}:${String(draftM).padStart(2,'0')} ${draftP}`}
                        {!isDraftValid && <span className="ml-2 text-[10px] font-normal opacity-80">⚠ before start time</span>}
                    </span>
                </div>
                <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <div className="flex divide-x divide-gray-100">
                <div className="flex-1 flex flex-col min-w-0">
                    <div className={colLabel + ' pt-2 px-2'}>Hour</div>
                    <div ref={hourScrollRef} className="overflow-y-auto h-48" style={{ scrollbarWidth: 'none' }}>
                        {hours.map(h => {
                            const blocked = isHourBlocked(h, draftP);
                            return (
                                <div key={h} onClick={() => { if (!blocked) setDraftH(h); }} className={colItem(draftH === h, blocked)}>
                                    {String(h).padStart(2, '0')}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                    <div className={colLabel + ' pt-2 px-2'}>Min</div>
                    <div ref={minScrollRef} className="overflow-y-auto h-48" style={{ scrollbarWidth: 'none' }}>
                        {minutes.map(m => {
                            const blocked = !isAfterMin(draftH, m, draftP);
                            return (
                                <div key={m} onClick={() => { if (!blocked) setDraftM(m); }} className={colItem(draftM === m, blocked)}>
                                    {String(m).padStart(2, '0')}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                    <div className={colLabel + ' pt-2 px-2'}>Period</div>
                    <div ref={perScrollRef} className="overflow-y-auto h-48" style={{ scrollbarWidth: 'none' }}>
                        {periods.map(p => {
                            const blocked = isPeriodBlocked(p);
                            return (
                                <div key={p} onClick={() => { if (!blocked) setDraftP(p); }} className={colItem(draftP === p, blocked)}>
                                    {p}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex gap-2 px-3 py-3 border-t border-gray-100 bg-gray-50">
                {value && (
                    <button onClick={handleClear} className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition">Clear</button>
                )}
                <button
                    onClick={handleDone}
                    disabled={!isDraftValid}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition
                        ${isDraftValid ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                    {isDraftValid ? 'Done' : 'Select a valid time'}
                </button>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div className="relative w-full">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center gap-2 px-3 py-2 border-2 rounded-xl text-sm transition-all outline-none
                    ${open ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}
            >
                <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                    <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className={`flex-1 text-left font-medium ${display ? 'text-gray-800' : 'text-gray-400'}`}>
                    {display || placeholder}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            {dropdown}
        </div>
    );
};

const TakeAttendance: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
    const [initialAttendanceData, setInitialAttendanceData] = useState<AttendanceData>({});
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [activeButton, setActiveButton] = useState<'present' | 'absent' | null>(null);
    const [courseOperationID, setCourseOperationID] = useState<string>('');
    const [courseOperationInfo, setCourseOperationInfo] = useState<CourseOperation | null>(null);
    const [classDate, setClassDate] = useState<Date | null>(new Date());
    const [searchRollNo, setSearchRollNo] = useState<string>('');
    const [classStartTime, setClassStartTime] = useState<Date | null>(getNearestPastTimeSlot(5));
    const [classEndTime, setClassEndTime] = useState<Date | null>(() => {
        const start = getNearestPastTimeSlot(5);
        const end = new Date(start);
        end.setHours(start.getHours() + 1, start.getMinutes(), 0, 0);
        return end;
    });
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const [isClassListModalOpen, setIsClassListModalOpen] = useState<boolean>(false);
    const [classListData, setClassListData] = useState<ClassListData | null>(null);
    const [modalDate, setModalDate] = useState<Date | null>(new Date());
    const [modalDateLoading, setModalDateLoading] = useState<boolean>(false);

    const [isNewScheduleModalOpen, setIsNewScheduleModalOpen] = useState<boolean>(false);
    const [newScheduleStartTime, setNewScheduleStartTime] = useState<Date | null>(null);
    const [newScheduleEndTime, setNewScheduleEndTime] = useState<Date | null>(null);
    const [newScheduleDate, setNewScheduleDate] = useState<Date | null>(new Date());

    const parseRollNumbers = (value: string): string[] => {
        const cleaned = value
            .replace(/roll\s*no\s*:?/gi, ' ')
            .replace(/present/gi, ' ')
            .replace(/--+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!cleaned) return [];
        return cleaned
            .split(/[,\s]+/)
            .map((roll) => roll.trim())
            .filter(Boolean);
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
                    if (candidates.length === 1) {
                        studentId = candidates[0];
                    } else if (candidates.length > 1) {
                        ambiguous.push(rollNo);
                    }
                }
            }

            if (studentId) {
                updatedAttendance[studentId] = 'present';
                matched += 1;
            }
        });

        setAttendanceData(updatedAttendance);
        setActiveButton(null);

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
        const fetchStudentsAndClassDetails = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("access_token");

                if (!id) throw new Error("Course operation ID not found");

                const resold = await api.post(
                    "/api/attendance/get_attendance_class_list",
                    { course_operation_id: id, attendance_date: formatDate(new Date()) }
                );

                if (resold.data) {
                    setClassListData(resold.data);
                    setModalDate(new Date());
                    const hasClasses = (resold.data.class_list?.length ?? 0) > 0;
                    const hasRoutine = (resold.data.routine_info?.length ?? 0) > 0;
                    if (hasClasses || hasRoutine) {
                        setIsClassListModalOpen(true);
                    }
                }

                const res = await api.post(
                    "/api/single_course_operation_info",
                    { course_operation_id: id }
                );

                if (res.data.status === 'SUCCESS') {
                    setCourseOperationInfo(res.data.data);
                    setCourseOperationID(id);
                }

                const response = await api.post(
                    "/api/course/course-student",
                    { course_operation_id: id },
                    { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
                );

                let attendanceList: any[] = [];
                try {
                    const responseAttendance = await api.post(
                        "/api/attendance/get_attendance",
                        { class_id: id },
                        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
                    );
                    const attendanceResp = responseAttendance.data.attendance;
                    attendanceList = Array.isArray(attendanceResp) ? attendanceResp : [];
                } catch (err: any) {
                    if (err?.response?.status !== 404) console.error(err);
                }

                const initialAttendance: AttendanceData = {};
                const apiStudents = response.data?.map((s: any) => {
                    const studentId = String(s.std_id);
                    const att = attendanceList.find((a: any) => String(a.student_id) === studentId);
                    const serverIsPresent = att ? Number(att.revised_present) : null;
                    if (serverIsPresent !== null) {
                        initialAttendance[studentId] = serverIsPresent === 1 ? 'present' : 'absent';
                    }
                    return {
                        id: studentId,
                        registration_no: s.reg_no ? String(s.reg_no) : '',
                        roll_no: s.roll_no ? String(s.roll_no) : '',
                        name: s.name || "Unknown Student",
                        initials: s.name ? s.name.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "N/A",
                        rev_attendance: serverIsPresent !== null ? serverIsPresent : -1,
                    };
                });

                setStudents(apiStudents || []);
                setInitialAttendanceData(initialAttendance);
                setAttendanceData(prev => ({ ...initialAttendance, ...prev }));

            } catch (err) {
                console.error("Error fetching students or attendance:", err);
                setError("Failed to load student data.");
            } finally {
                setLoading(false);
            }
        };

        fetchStudentsAndClassDetails();
    }, [id]);

    const markAttendance = useCallback((studentId: string, status: AttendanceStatus): void => {
        setAttendanceData((prev) => ({ ...prev, [studentId]: status }));
    }, []);

    const resetAttendance = useCallback((): void => {
        setAttendanceData(initialAttendanceData);
        setActiveButton(null);
    }, [initialAttendanceData]);

    const formatDate = (date: Date | null): string => {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    };

    const toTimeManual = (value: Date | null): string => {
        if (!value) return '';
        return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
    };

    const fetchClassListForDate = async (date: Date) => {
        if (!id) return;
        setModalDateLoading(true);
        try {
            const res = await api.post(
                "/api/attendance/get_attendance_class_list",
                { course_operation_id: id, attendance_date: formatDate(date) }
            );
            if (res.data) setClassListData(res.data);
        } catch (err) {
            console.error("Error fetching class list for date:", err);
        } finally {
            setModalDateLoading(false);
        }
    };

    const handleClassDateChange = async (date: Date | null) => {
        setClassDate(date);
        if (!date) return;
        setModalDate(date);

        if (!id) return;
        setModalDateLoading(true);
        try {
            const res = await api.post(
                "/api/attendance/get_attendance_class_list",
                { course_operation_id: id, attendance_date: formatDate(date) }
            );
            if (res.data) {
                setClassListData(res.data);
                const hasClasses = (res.data.class_list?.length ?? 0) > 0;
                const hasRoutine = (res.data.routine_info?.length ?? 0) > 0;
                if (hasClasses || hasRoutine) {
                    setIsClassListModalOpen(true);
                }
            }
        } catch (err) {
            console.error("Error fetching class list for date:", err);
        } finally {
            setModalDateLoading(false);
        }
    };

    const handleModalDateChange = async (date: Date | null) => {
        if (!date) return;
        setModalDate(date);
        await fetchClassListForDate(date);
    };

    const handleSelectClassForUpdate = (cls: ClassEntry) => {
        navigate(`/edit-attendance/${courseOperationID}/${cls.id}`);
    };

    const handleSelectRoutineForTake = (routine: RoutineEntry) => {
        setClassDate(modalDate ?? new Date());
        setClassStartTime(parseTimeStringToDate(routine.start_time));
        setClassEndTime(parseTimeStringToDate(routine.end_time));
        setIsClassListModalOpen(false);
    };

    const handleTakeOnNewSchedule = () => {
        if (!newScheduleDate || !newScheduleStartTime || !newScheduleEndTime) {
            Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please select date, start time, and end time.', confirmButtonColor: '#6366f1' });
            return;
        }
        setClassDate(newScheduleDate);
        setClassStartTime(newScheduleStartTime);
        setClassEndTime(newScheduleEndTime);
        setIsNewScheduleModalOpen(false);
        setIsClassListModalOpen(false);
        setNewScheduleDate(new Date());
        setNewScheduleStartTime(null);
        setNewScheduleEndTime(null);
    };

    const saveAttendance = async (): Promise<void> => {
        if (!classDate && !classStartTime && !classEndTime) {
            Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please select Class Date, Start Time, and End Time.', confirmButtonColor: '#6366f1' });
            return;
        }
        if (!classDate) {
            Swal.fire({ icon: 'warning', title: 'Class Date Required', text: 'Please select a Class Date before saving.', confirmButtonColor: '#6366f1' });
            return;
        }
        if (!classStartTime && !classEndTime) {
            Swal.fire({ icon: 'warning', title: 'Time Required', text: 'Please select both Start Time and End Time.', confirmButtonColor: '#6366f1' });
            return;
        }
        if (!classStartTime) {
            Swal.fire({ icon: 'warning', title: 'Start Time Required', text: 'Please select a Start Time before saving.', confirmButtonColor: '#6366f1' });
            return;
        }
        if (!classEndTime) {
            Swal.fire({ icon: 'warning', title: 'End Time Required', text: 'Please select an End Time before saving.', confirmButtonColor: '#6366f1' });
            return;
        }

        const finalAttendanceData: AttendanceData = {};
        students.forEach((student) => {
            finalAttendanceData[student.id] = attendanceData[student.id] ?? 'absent';
        });

        const markedCount = Object.keys(finalAttendanceData).length;
        if (markedCount === 0) {
            Swal.fire({ icon: 'info', title: 'No Students', text: 'No students found to save attendance for.', confirmButtonColor: '#6366f1' });
            return;
        }

        const presentCount = Object.values(finalAttendanceData).filter(s => s === 'present').length;
        const absentCount = markedCount - presentCount;
        const unmarkedCount = students.length - markedCount;

        const toTimeDisplay = (d: Date) => {
            const h = d.getHours(); const m = d.getMinutes();
            const ampm = h < 12 ? 'AM' : 'PM';
            const hh = h % 12 === 0 ? 12 : h % 12;
            return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
        };

        const confirm = await Swal.fire({
            title: 'Confirm Attendance',
            html: `
                <div style="text-align:left; font-size:14px; line-height:2">
                    <div style="margin-bottom:10px; color:#6b7280;">
                        📅 <b>${classDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</b>
                        &nbsp;&nbsp;🕐 <b>${toTimeDisplay(classStartTime!)} – ${toTimeDisplay(classEndTime!)}</b>
                    </div>
                    <hr style="margin:8px 0; border-color:#e5e7eb"/>
                    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:10px">
                        <span style="background:#dcfce7; color:#15803d; padding:4px 14px; border-radius:999px; font-weight:600;">✓ ${presentCount} Present</span>
                        <span style="background:#fee2e2; color:#b91c1c; padding:4px 14px; border-radius:999px; font-weight:600;">✗ ${absentCount} Absent</span>
                        ${unmarkedCount > 0 ? `<span style="background:#f3f4f6; color:#6b7280; padding:4px 14px; border-radius:999px; font-weight:600;">— ${unmarkedCount} Unmarked (will be absent)</span>` : ''}
                    </div>
                    <div style="margin-top:12px; color:#6b7280; font-size:13px;">Total: <b>${students.length}</b> students</div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Save Attendance',
            cancelButtonText: 'Go Back & Review',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#e5e7eb',
            reverseButtons: true,
        });

        if (!confirm.isConfirmed) return;

        try {
            setLoading(true);
            const token = localStorage.getItem("access_token");
            const attendanceRecords = Object.entries(finalAttendanceData).map(([studentId, status]) => ({
                std_id: studentId,
                is_present: status === 'present' ? 1 : 0,
            }));
            const attendanceDataNew = {
                course_operation_id: id,
                attendance_date: formatDate(classDate),
                start_time: toTimeManual(classStartTime),
                end_time: toTimeManual(classEndTime),
                attendance: attendanceRecords,
            };
            const response = await api.post(
                "/api/attendance/store_attendance",
                attendanceDataNew,
                { headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
            );
            if (response.status === 200 || response.status === 201) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Attendance Saved!',
                    html: `<b>${presentCount}</b> present &nbsp;·&nbsp; <b>${absentCount}</b> absent<br/>out of <b>${students.length}</b> students.`,
                    confirmButtonColor: '#6366f1',
                });
                navigate('/manage-class-list/' + courseOperationID);
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || "Failed to save attendance. Please try again.";
            Swal.fire({ icon: 'error', title: 'Save Failed', text: errorMessage, confirmButtonColor: '#6366f1' });
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

    const hasRecordedClasses = (classListData?.class_list?.length ?? 0) > 0;
    const hasScheduledRoutine = (classListData?.routine_info?.length ?? 0) > 0;

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

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PageMeta title="Take Attendance" description="Take Attendance" />

            {/* Header */}
            <div className="sticky top-0 z-40 bg-gray-50 pb-2 pt-2">
                <div className="max-w-7xl mx-auto space-y-2">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center">
                        <h1 className="text-2xl font-bold text-gray-800 tracking-wide">
                            {courseOperationInfo?.course_code}: {courseOperationInfo?.course_name}
                        </h1>
                        <div className="flex justify-center gap-4 text-sm text-gray-600 mb-3 text-center mt-1">
                            <span>{courseOperationInfo?.program_name}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{courseOperationInfo?.department_name}</p>
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
                            <CustomDatePicker value={classDate} onChange={handleClassDateChange} placeholder="Select date" />
                        </div>

                        <div className="w-full md:w-1/6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                            <CustomTimePicker
                                value={classStartTime}
                                onChange={(t) => {
                                    setClassStartTime(t);
                                    if (t) {
                                        const startMins = t.getHours() * 60 + t.getMinutes();
                                        const endMins = classEndTime
                                            ? classEndTime.getHours() * 60 + classEndTime.getMinutes()
                                            : -1;
                                        if (endMins <= startMins) {
                                            const auto = new Date(t);
                                            auto.setHours(t.getHours() + 1, t.getMinutes(), 0, 0);
                                            setClassEndTime(auto);
                                        }
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
                                onChange={setClassEndTime}
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
                            <button
                                onClick={() => {
                                    setModalDate(classDate ?? new Date());
                                    setIsClassListModalOpen(true);
                                }}
                                className="px-4 py-2 border-2 border-blue-500 text-blue-500 hover:bg-blue-50 rounded-lg text-sm font-medium transition"
                            >
                                📋 Today's Classes
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div className="max-w-7xl mx-auto pt-4 px-0">

                {/* No students assigned */}
                {!loading && students.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-10 py-12 flex flex-col items-center max-w-md w-full text-center">
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-5">
                                <svg className="w-10 h-10 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8zm6 0a3 3 0 100-6 3 3 0 000 6zm-12 0a3 3 0 100-6 3 3 0 000 6"/>
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">No Students Assigned</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                No student is assigned to this course yet. Please enroll students before taking attendance.
                            </p>
                        </div>
                    </div>
                )}

                {/* Students Table */}
                {!loading && students.length > 0 && (
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
                                        <td colSpan={6} className="text-center py-12">
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
                                        const currentStatus: AttendanceStatus | undefined =
                                            attendanceData[student.id] ??
                                            (student.rev_attendance === 1 ? 'present' : student.rev_attendance === 0 ? 'absent' : undefined);

                                        const rowBg = currentStatus === 'present'
                                            ? 'bg-green-50/40'
                                            : currentStatus === 'absent'
                                                ? 'bg-red-50/40'
                                                : 'hover:bg-gray-50/60';

                                        return (
                                            <tr key={student.id} className={`transition-colors ${rowBg}`}>
                                                {/* Index */}
                                                <td className="px-4 py-3 text-gray-400 font-medium text-xs">{idx + 1}</td>

                                                {/* Student name + initials */}
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

                        {/* Table footer summary */}
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
                                    <span className="flex items-center gap-1 text-gray-400 font-semibold">
                                        <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                                        {students.length - presentCount - absentCount} Unmarked
                                    </span>
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
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
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

            {/* Class List & Routine Modal */}
            {isClassListModalOpen && classListData && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-700 text-white p-5 rounded-t-2xl">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold">Class Overview</h2>
                                    <p className="text-indigo-200 text-xs mt-0.5 capitalize">
                                        {classListData.day_name} &nbsp;·&nbsp;
                                        {classListData.attendance_count} recorded &nbsp;·&nbsp;
                                        {classListData.routine_count} scheduled
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium">✅ {classListData.attendance_count}</span>
                                    <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium">📅 {classListData.routine_count}</span>
                                    <button
                                        onClick={() => {
                                            setIsClassListModalOpen(false);
                                            navigate(`/show-course-operation/${courseOperationID}`);
                                        }}
                                        className="ml-1 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition text-white"
                                        title="Close"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-white/80 text-xs font-semibold whitespace-nowrap">Viewing date:</span>
                                <div className="flex-1 min-w-0">
                                    <CustomDatePicker
                                        value={modalDate}
                                        onChange={handleModalDateChange}
                                        placeholder="Select a date"
                                        variant="ghost"
                                    />
                                </div>
                                {modalDateLoading && (
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin flex-shrink-0" />
                                )}
                            </div>
                        </div>

                        <div className="p-6 space-y-6">

                            {hasRecordedClasses && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block"></span>
                                        Attendance Already Recorded
                                    </h3>
                                    <div className="space-y-2">
                                        {classListData.class_list.map((cls, idx) => (
                                            <div key={cls.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-9 h-9 bg-green-500 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">{idx + 1}</div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800">{cls.start_time?.slice(0, 5)} – {cls.end_time?.slice(0, 5)}</p>
                                                        <p className="text-xs text-gray-500">{cls.attendance_date}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="text-xs bg-green-100 text-green-700 border border-green-300 px-2 py-1 rounded-full font-medium whitespace-nowrap">✓ Taken</span>
                                                    <button onClick={() => handleSelectClassForUpdate(cls)} className="text-xs bg-indigo-600 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1">
                                                        ✏️ Update Attendance
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {hasRecordedClasses && hasScheduledRoutine && (
                                <div className="flex items-center gap-3">
                                    <hr className="flex-1 border-gray-200" />
                                    <span className="text-xs text-gray-400 uppercase tracking-wider">Routine</span>
                                    <hr className="flex-1 border-gray-200" />
                                </div>
                            )}

                            {hasScheduledRoutine && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block"></span>
                                        Scheduled Routine
                                    </h3>
                                    <div className="space-y-2">
                                        {classListData.routine_info.map((routine, idx) => (
                                            <div key={routine.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-9 h-9 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">{idx + 1}</div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800">{routine.start_time?.slice(0, 5)} – {routine.end_time?.slice(0, 5)}</p>
                                                        <p className="text-xs text-gray-500 capitalize">{routine.day_name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="text-xs bg-blue-100 text-blue-700 border border-blue-300 px-2 py-1 rounded-full font-medium whitespace-nowrap">📅 Scheduled</span>
                                                    <button onClick={() => handleSelectRoutineForTake(routine)} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1">
                                                        ▶ Take Attendance
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(hasRecordedClasses || hasScheduledRoutine) && (
                                <div className="flex items-center gap-3">
                                    <hr className="flex-1 border-gray-200" />
                                    <span className="text-xs text-gray-400 uppercase tracking-wider">Extra</span>
                                    <hr className="flex-1 border-gray-200" />
                                </div>
                            )}

                            {/* New Schedule */}
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                <button
                                    onClick={() => {
                                        const defaultStart = getNearestPastTimeSlot(5);
                                        const defaultEnd = new Date(defaultStart);
                                        defaultEnd.setHours(defaultStart.getHours() + 1, defaultStart.getMinutes(), 0, 0);

                                        setClassDate(modalDate ?? new Date());
                                        setClassStartTime(defaultStart);
                                        setClassEndTime(defaultEnd);
                                        setIsClassListModalOpen(false);
                                    }}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-orange-600 text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
                                >
                                    ➕ Take Attendance on New Schedule
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-70 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
                <div className="max-w-7xl mx-auto grid grid-cols-2 gap-3">
                    <button onClick={saveAttendance} className="py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition">Save Attendance</button>
                    <button onClick={() => navigate('/allclasses')} className="py-3 border-2 border-gray-300 bg-red-200 text-gray-600 rounded-xl font-semibold hover:bg-red-300 transition">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default TakeAttendance;