import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta.tsx';
import api from "../../api";

interface Course {
    id: number;
    course_name: string;
    section_no: number;
    course_section_id: number;
}

interface TimeSlot {
    start: string;
    end: string;
}

const daysList = [
    { key: 'sun', label: 'Sunday' },
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
];

const CreateClass: React.FC = () => {
    const navigate = useNavigate();

    // Form states
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    const [courseSelect, setCourseSelect] = useState<number | ''>('');
    const [courseSectionSelect, setCourseSectionId] = useState<number | ''>('');
    const [date, setDate] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [room, setRoom] = useState<string>('');
    const [attendanceType, setAttendanceType] = useState<string>('');
    const [isRecurring, setIsRecurring] = useState<boolean>(false);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Each day's start/end times
    const [timeSlots, setTimeSlots] = useState<Record<string, TimeSlot>>({
        sun: { start: "", end: "" },
        mon: { start: "", end: "" },
        tue: { start: "", end: "" },
        wed: { start: "", end: "" },
        thu: { start: "", end: "" },
        fri: { start: "", end: "" },
        sat: { start: "", end: "" },
    });

    // Fetch teacher courses
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("access_token");
                const response = await api.post("/api/get_teacher_course", {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCourses(response.data);
                setError('');
            } catch (err) {
                console.error(err);
                setError('Failed to load courses. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    // Toggle day selection
    const toggleDay = (dayKey: string) => {
        if (selectedDays.includes(dayKey)) {
            setSelectedDays(selectedDays.filter(d => d !== dayKey));
            setTimeSlots({
                ...timeSlots,
                [dayKey]: { start: "", end: "" } // reset times
            });
        } else {
            setSelectedDays([...selectedDays, dayKey]);
        }
    };

    // Calculate duration
    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return "";
        const s = new Date(`1970-01-01T${start}`);
        const e = new Date(`1970-01-01T${end}`);
        let diff = (e.getTime() - s.getTime()) / 60000; // minutes
        if (diff <= 0) return "";
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        if (hours && minutes) return `${hours}h ${minutes}m`;
        if (hours) return `${hours}h`;
        return `${minutes}m`;
    };

    function convertToArray(data: any) {
        const result: any[] = [];

        for (const [day, time] of Object.entries(data)) {
            if (time.start !== "" && time.end !== "") {
                result.push({
                    day: day,
                    start_time: time.start,
                    end_time: time.end,
                });
            }
        }

        return result;
    }

    // Handle form submit
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!courseSelect || !courseSectionSelect) {
            alert('Please select a course and section.');
            return;
        }

        if (isRecurring && selectedDays.length === 0) {
            alert('Please select at least one day for recurring class.');
            return;
        }



        try {
            const payload: any = {
                course_id: Number(courseSelect),
                course_section_id: Number(courseSectionSelect),
                class_start_date: isRecurring ? startDate : date,
                class_end_date: isRecurring ? endDate : date,
                start_time: isRecurring ? '' : startTime,
                end_time: isRecurring ? '' : endTime,
                is_recurring: isRecurring,
                selected_days: isRecurring ? convertToArray(timeSlots) : '',
                attendance_type: attendanceType,
                room: room,
            };

            console.log(payload);
            return false;

            const token = localStorage.getItem("access_token");
            const response = await api.post("/api/create_class", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('✅ Class created successfully!');
            navigate('/allclasses');

        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.message || '❌ Failed to create class. Please try again.';
            alert(message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <PageMeta title="Create New Class | Attendance Management System" description="Create and schedule new classes" />

            <div className="p-4 max-w-7xl mx-auto">
                <h1 className="text-xl font-semibold">Create New Class</h1>
            </div>

            <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 py-6 space-y-6">

                {/* Course Selection */}
                <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-indigo-600">📚</span> Course Selection
                    </h2>

                    {loading ? (
                        <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500">
                            Loading courses...
                        </div>
                    ) : error ? (
                        <div className="w-full px-4 py-3 border-2 border-red-200 rounded-xl bg-red-50 text-red-600">
                            {error}
                        </div>
                    ) : (
                        <select
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                            value={courseSelect}
                            onChange={(e) => {
                                const courseId = Number(e.target.value);
                                const selectedOption = e.target.options[e.target.selectedIndex];
                                const courseSectionId = selectedOption.dataset.courseSectionId;
                                setCourseSelect(courseId);
                                setCourseSectionId(Number(courseSectionId));
                            }}
                            required
                        >
                            <option value="">Choose a course...</option>
                            {courses.map((course, idx) => (
                                <option key={idx} value={course.id} data-course-section-id={course.course_section_id}>
                                    {course.course_name} ({course.section_no !== 0 ? course.section_no : ''})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Schedule Section */}
                <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                    <div
                        onClick={() => setIsRecurring(!isRecurring)}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition"
                    >
                        <div>
                            <div className="font-medium text-gray-800">Recurring Class</div>
                            <div className="text-sm text-gray-500">Repeat this class on specific days</div>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-colors ${isRecurring ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`}></div>
                        </div>
                    </div>

                    {!isRecurring ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date <span className="text-red-500">*</span></label>
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                                       className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time <span className="text-red-500">*</span></label>
                                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                                           className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time <span className="text-red-500">*</span></label>
                                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                                           className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" required />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                           className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                                           className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" />
                                </div>
                            </div>

                            {/* Recurring Table */}
                            <div className="pt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Repeat On</label>
                                <table className="w-full border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-50 text-gray-700 text-xs">
                                    <tr>
                                        <th className="p-2 text-left">Day</th>
                                        <th className="p-2 text-left">Start Time</th>
                                        <th className="p-2 text-left">End Time</th>
                                        <th className="p-2 text-left">Class Time</th>
                                    </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                    {daysList.map(day => {
                                        const isSelected = selectedDays.includes(day.key);
                                        const start = timeSlots[day.key].start;
                                        const end = timeSlots[day.key].end;
                                        const duration = calculateDuration(start, end);
                                        return (
                                            <tr key={day.key} className="border-t">
                                                <td className="p-2">
                                                    <button type="button" onClick={() => toggleDay(day.key)}
                                                            className={`rounded-lg border font-medium text-xs px-2 py-1 transition ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-gray-600 hover:border-indigo-300'}`}>
                                                        {day.label}
                                                    </button>
                                                </td>
                                                <td className="p-2">
                                                    <input type="time" value={start} disabled={!isSelected}
                                                           onChange={(e) => setTimeSlots({...timeSlots, [day.key]: {...timeSlots[day.key], start: e.target.value}})}
                                                           className={`w-full px-2 py-1 text-sm rounded-lg focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${isSelected ? 'border-indigo-600' : 'border-gray-300'}`} />
                                                </td>
                                                <td className="p-2">
                                                    <input type="time" value={end} disabled={!isSelected}
                                                           onChange={(e) => setTimeSlots({...timeSlots, [day.key]: {...timeSlots[day.key], end: e.target.value}})}
                                                           className={`w-full px-2 py-1 text-sm rounded-lg focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${isSelected ? 'border-indigo-600' : 'border-gray-300'}`} />
                                                </td>
                                                <td className="p-2 text-gray-700">{isSelected && duration ? duration : '-'}</td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Room */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Room/Location</label>
                        <input type="text" value={room}  placeholder="Room/Location" onChange={e => setRoom(e.target.value)}
                               className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" />
                    </div>

                    {/* Attendance Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Attendance Type</label>
                        <select value={attendanceType} onChange={e => setAttendanceType(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none">
                            <option value="">Select One</option>
                            <option value="manual">Manual Marking</option>
                            <option value="qr">QR Code Scan</option>
                            <option value="biometric">Biometric</option>
                        </select>
                    </div>

                </div>

                {/* Bottom Actions */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
                    <div className="max-w-3xl mx-auto grid grid-cols-3 gap-3">
                        <button type="submit" onClick={handleSubmit}
                                className="py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold">
                            Create Class
                        </button>
                        <button type="button" onClick={() => navigate('/dashboard')}
                                className="py-3 border-2 border-gray-300 text-gray-600 rounded-xl font-semibold">
                            Cancel
                        </button>
                    </div>
                </div>

            </form>
        </div>
    );
};

export default CreateClass;
