import React, {useState, useEffect, FormEvent} from 'react';
import {useNavigate, useParams} from "react-router-dom";
import api from "../../api"; // make sure your axios instance is imported


// Type definitions
interface ClassSchedule {
    action_by: string;
    class_date: string;
    course_master_id: string;
    course_operation_id: string;
    end_time: string;
    id: string;
    room_no: string;
    start_time: string;
    attendance_status: string;
}

interface WeekDay {
    date: Date;
    dateStr: string;
    dayName: string;
    classes: ClassSchedule[];
}
interface ClassDetails {
    id: string;
    name: string;
    code: string;
    section: string;
    room: string;
    class_date: string,
    start_time: string,
    end_time: string,
    attendance_type: string,
    topic: string,
    course_operation_id: string,
}

interface courseData {
    course_code: string;
    course_name: string;
    program_name: string;
    faculty_name: string
}


const WeeklyCalendar: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [classDate, setClassDate] = useState("");
    const [classData, setClassData] = useState<ClassSchedule[]>([]);
    const [courseData, setCourseData] = useState<courseData | null>(null);

    // Make sure route param name matches here
    const { id: courseOperationId } = useParams<{ id: string }>();
    const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [room, setRoom] = useState<string>('');

    useEffect(() => {
        const fetchClassData = async () => {
            if (!courseOperationId) return;

            try {
                setLoading(true);
                const token = localStorage.getItem("access_token");
                const response = await api.post(
                    "api/class_by_course_operation",
                    { course_operation_id: courseOperationId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setCourseData(response.data.data.course_info);
                setClassData(response.data.data.data as ClassSchedule[]);
                setError("");
            } catch (err) {
                console.error(err);
                setError("Failed to load class data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchClassData();
    }, [courseOperationId]);

    // Current week start date (Monday)
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        return new Date(today.setDate(diff));
    });

    const hours = Array.from({ length: 17 }, (_, i) => i + 8); // 8 AM - 12 AM


    const timeToMinutes = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const formatTime = (hour: number): string => {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:00 ${ampm}`;
    };
    const formatTimeNew = (timeString: string) => {
        if (!timeString) return "N/A";
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const minute = parseInt(minutes, 10);
        const ampm = hour >= 12 ? 'pm' : 'am';
        const formattedHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${formattedHour}:${String(minute).padStart(2, '0')} ${ampm}`;
    };

    const getWeekDays = (): WeekDay[] => {
        const weekDays: WeekDay[] = [];
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        for (let i = 0; i < 7; i++) {
            const date = new Date(currentWeekStart);
            date.setDate(currentWeekStart.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            const classes = classData.filter(cls => cls.class_date === dateStr);

            weekDays.push({ date, dateStr, dayName: dayNames[i], classes });
        }

        return weekDays;
    };

    const getClassStyle = (startTime: string, endTime: string) => {
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        const startHour = 8 * 60; // 8 AM
        const top = ((startMinutes - startHour) / 60) * 80; // 80px per hour
        const height = ((endMinutes - startMinutes) / 60) * 80;
        return { top: `${top}px`, height: `${height}px` };
    };

    const goToPreviousWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentWeekStart(newDate);
    };

    const goToNextWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentWeekStart(newDate);
    };

    const goToToday = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        setCurrentWeekStart(new Date(today.setDate(diff)));
    };

    const weekDays = getWeekDays();
    const todayStr = new Date().toISOString().split('T')[0];

    const handleTakeAttendance = (id: string) => {
        navigate(`/take-attendance/${id}`);
    };

    const handleUpdate = (id: string) => {
        //navigate(`/update-class-info/${id}`);
        const fetchClassDetails = async () => {
            setLoading(true);
            const token = localStorage.getItem("access_token");

            // Fetch class details FIRST
            const classDetailsResponse = await api.post(
                "/api/get_class",
                {class_id: id},
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (classDetailsResponse.data.status === 'success') {
                const details = classDetailsResponse.data.data;
                console.log(details);
                setIsModalOpen(true);
                setClassDetails({
                    course_operation_id: details.course_operation_id,
                    id: details.id,
                    name: details.course_title,
                    code: details.course_code,
                    section: details.section,
                    room: details.room_no,
                    class_date: details.class_date,
                    start_time: details.start_time,
                    end_time: details.end_time,
                    attendance_status: details.attendance_status
                });
                setClassDate(details.class_date);
                setStartTime(details.start_time);
                setEndTime(details.end_time);
                setRoom(details.room_no);

            }


        }
        fetchClassDetails();
    };

    const handleDelete = async(id: string) => {
        if (!window.confirm('Are you sure you want to delete this class operation?')) return;
        try {
            const token = localStorage.getItem("access_token");
            await api.post("/api/delete_class",
                { "class_id": id},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setClassData(prev => prev.filter(op => op.id !== id));
            // setClassOperations(prev => prev.filter(op => op.id !== id));
        } catch (err) {
            console.error('Failed to delete:', err);
            alert('Failed to delete class operation. Please try again.');
        }
    };

    const handleUpdateClass = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validation
        if (!classDate) {
            alert('Please select a class date.');
            return;
        }

        if (!startTime || !endTime) {
            alert('Please set start and end times.');
            return;
        }

        // Validate end time is after start time
        const start = new Date(`1970-01-01T${startTime}`);
        const end = new Date(`1970-01-01T${endTime}`);
        if (end <= start) {
            alert('End time must be after start time.');
            return;
        }

        try {
            const token = localStorage.getItem("access_token");

            const payload = {
                class_id: classDetails.id,
                class_date: classDate,
                class_start_time: startTime,
                class_end_time: endTime,
                room: room || null
            };

            console.log('Update Payload:', JSON.stringify(payload, null, 2));

            const response = await api.post("/api/update_class", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('✅ Class updated successfully!');

            // Update the class in local state immediately
            setClassData(prevClasses =>
                prevClasses.map(cls =>
                    cls.id === classDetails.id
                        ? {
                            ...cls,
                            class_date: classDate,
                            start_time: startTime,
                            end_time: endTime,
                            room_no: room || cls.room_no
                        }
                        : cls
                )
            );

            // Close modal
            setIsModalOpen(false);

        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.message || '❌ Failed to update class. Please try again.';
            alert(message);
        }
    };
    const getTimeDifference = (start: string, end: string): string => {
        const [startH, startM] = start.split(":").map(Number);
        const [endH, endM] = end.split(":").map(Number);
        const diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return `${hours > 0 ? hours + " hours " : ""}${minutes} minutes`;
    };



    return (
        <div className="min-h-screen bg-gray-50 ">
            <div >
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="  mb-4">
                        {courseData ? (
                            <>
                                <div className="text-2xl font-bold text-gray-800 tracking-wide text-center" >
                                    {courseData.course_code}: {courseData.course_name}
                                </div>
                                <div className="text-gray-500 mt-1 text-center">
                                    {courseData.program_name}
                                </div>
                                <div className="flex justify-center gap-4 text-sm text-gray-600 mb-3 text-center mt-1">
                                    <span>{courseData.faculty_name }</span>
                                </div>
                            </>
                        ) : (
                            <p>Loading class details...</p>
                        )}
                    </div>

                    {/* Week Navigation */}
                    <div className="flex items-center justify-between">
                        <button onClick={goToPreviousWeek} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className="text-center">
                            <h2 className="text-xl font-semibold text-gray-700">
                                {weekDays[0].date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h2>
                            <p className="text-gray-500">
                                {weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                                {weekDays[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            <button
                                onClick={goToToday}
                                className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-right"
                            >
                                Today
                            </button>
                        </div>

                        <button onClick={goToNextWeek} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="inline-block min-w-full">
                            {/* Day Headers */}
                            <div className="grid grid-cols-8 border-b border-gray-200">
                                <div className="w-20 border-r border-gray-200"></div>
                                {weekDays.map((day) => (
                                    <div
                                        key={day.dateStr}
                                        className={`p-4 text-center border-r border-gray-200 ${day.dateStr === todayStr ? 'bg-blue-50' : ''}`}
                                    >
                                        <div className={`font-semibold ${day.dateStr === todayStr ? 'text-blue-600' : 'text-gray-800'}`}>
                                            {day.dayName}
                                        </div>
                                        <div className={`text-sm ${day.dateStr === todayStr ? 'text-blue-600' : 'text-gray-500'}`}>
                                            {day.date.getDate()}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Time Grid */}
                            <div className="relative">
                                <div className="grid grid-cols-8">
                                    <div className="w-20">
                                        {hours.map((hour) => (
                                            <div key={hour} className="h-20 border-b border-gray-200 flex items-start justify-end pr-2 pt-1">
                                                <span className="text-xs text-gray-500">{formatTime(hour)}  </span>
                                            </div>
                                        ))}
                                    </div>

                                    {weekDays.map((day) => (
                                        <div key={day.dateStr} className="relative border-r border-black-200">
                                            {hours.map((hour) => (
                                                <div key={hour} className="h-20 border-b border-black-100"></div>
                                            ))}

                                            <div className="absolute inset-0 pointer-events-none">
                                                {day.classes.map((cls) => {
                                                    const style = getClassStyle(cls.start_time, cls.end_time);
                                                    return (
                                                        <div
                                                            key={cls.id}
                                                            className="absolute left-1 right-1 pointer-events-auto"
                                                            style={style}
                                                        >
                                                            <div className="bg-blue-500 hover:bg-blue-600 rounded-lg p-2 shadow-md h-full flex flex-col justify-between text-white text-xs overflow-hidden transition-colors">
                                                                {/* Top-right action buttons */}
                                                                <div className="absolute top-1 right-1 flex space-x-1">

                                                                    {cls.attendance_status && cls.attendance_status == 1  ? (
                                                                        <div className="flex space-x-1">
                                                                            <button
                                                                                onClick={() => handleTakeAttendance(cls.id)}
                                                                                className="bg-white text-blue-500 rounded p-1 text-[10px] hover:bg-gray-100"
                                                                                title="Update Attendance"
                                                                            >
                                                                                📝
                                                                            </button>
                                                                            <button onClick={() => navigate("/attendance-sheet/" + cls.id )}
                                                                                    className="bg-white text-blue-500 rounded p-1 text-[10px] hover:bg-gray-100"
                                                                                    title="Download Attendance">
                                                                                📝
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex space-x-1">
                                                                            <button
                                                                                onClick={() => handleTakeAttendance(cls.id)}
                                                                                className="bg-white text-blue-500 rounded p-1 text-[10px] hover:bg-gray-100"
                                                                                title="Take Attendance"
                                                                            >
                                                                                📝
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleUpdate(cls.id)}
                                                                                className="bg-white text-blue-500 rounded p-1 text-[10px] hover:bg-gray-100"
                                                                                title="Update"
                                                                            >
                                                                                ✏️
                                                                            </button>

                                                                            <button
                                                                                onClick={() => handleDelete(cls.id)}
                                                                                className="bg-white text-blue-500 rounded p-1 text-[10px] hover:bg-gray-100"
                                                                                title="Delete"
                                                                            >
                                                                                🗑️
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold" title={courseData.course_name}>{courseData.course_code}</div>
                                                                    <div className="text-blue-100">Room: {cls.room_no}</div>
                                                                </div>
                                                                <div className="text-blue-100 text-center mt-2">
                                                                    {formatTimeNew(cls.start_time)} - {formatTimeNew(cls.end_time)}
                                                                </div>
                                                                <div className="text-blue-100 text-center">
                                                                    {getTimeDifference(cls.start_time, cls.end_time)}
                                                                </div>

                                                            </div>

                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {isModalOpen && classDetails && (
                    <form onSubmit={handleUpdateClass} className=" mx-auto  py-4 space-y-2">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                            <div className="bg-white p-8 rounded-2xl shadow-2xl w-[90%] max-w-3xl max-h-[90vh] overflow-y-auto transition-all">

                                {/* Title */}
                                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">
                                    Class Details
                                </h2>

                                {/* Content */}
                                <div className="space-y-4 text-gray-700 text-lg">
                                    <p><strong className="font-semibold">Course:</strong> {classDetails.name}</p>
                                    <p><strong className="font-semibold">Date:</strong> {classDetails.class_date}</p>
                                    <p><strong className="font-semibold">Time:</strong> {classDetails.start_time} - {classDetails.end_time}</p>
                                    <p><strong className="font-semibold">Room:</strong> {classDetails.room || 'TBA'}</p>
                                </div>
                                <div >
                                    <div className="grid grid-cols-1 gap-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2 ">Class Date <span className="text-red-500">*</span></label>
                                            <input
                                                type="date"
                                                value={classDate}
                                                onChange={(e) => setClassDate(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                                required
                                            />
                                        </div>
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Room/Location</label>
                                        <input type="text" value={room}  placeholder="Room/Location" onChange={e => setRoom(e.target.value)}
                                               className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" />
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="mt-10 flex justify-end gap-4">
                                    <button
                                        type="submit"
                                        className="px-5 py-2 h-12 text-lg bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                    >
                                        Update Class
                                    </button>
                                    <button
                                        type="button" // Changed to "button" to prevent form submission
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2 h-12 text-lg bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}


                {loading && <p className="mt-4 text-gray-600">Loading classes...</p>}
                {error && <p className="mt-4 text-red-500">{error}</p>}

                <button
                    onClick={() => navigate("/create-class-operation/"+courseOperationId)}
                    className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center text-3xl font-light"
                >
                    +
                </button>
            </div>
        </div>
    );
};

export default WeeklyCalendar;
