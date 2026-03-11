import React, { useState, FormEvent, useEffect } from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta.tsx';
import api from "../../api";

interface Course {
    course_code: string;
    course_title: string;
    [key: string]: any;
}


const CreateClass: React.FC = () => {
    const navigate = useNavigate();
    const [courseSelect, setCourseSelect] = useState<number>('');
    const [topics, setTopics] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [room, setRoom] = useState<string>('');
    const [attendanceType, setAttendanceType] = useState<string>('');
    const [isRecurring, setIsRecurring] = useState<boolean>(false);
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const { id } = useParams<{ id: string }>();

    const days = [
        { key: 'sun', label: 'Sunday' },
        { key: 'mon', label: 'Monday' },
        { key: 'tue', label: 'Tuesday' },
        { key: 'wed', label: 'Wednesday' },
        { key: 'thu', label: 'Thursday' },
        { key: 'fri', label: 'Friday' },
        { key: 'sat', label: 'Saturday' }
    ];


    // Fetch courses from API
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("access_token");
                const classDetailsResponse = await api.post(
                    '/api/get_class',
                    { class_id:  Number(id) },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (classDetailsResponse.data[0]) {
                    const details = classDetailsResponse.data[0];


                    setCourseSelect(details.course_id);
                    setDate(details.class_date);
                    setStartTime(details.start_time);
                    setEndTime(details.end_time);
                    setRoom(details.room);
                    setAttendanceType(details.attendance_type);
                    setTopics(details.topic);
                }

                const response = await api.post(
                    "/api/get_teacher_course",
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );
                setCourses(response.data);
                setError('');
            } catch (err) {
                console.error('Error fetching courses:', err);
                setError('Failed to load courses. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();



    }, []);



    const toggleDay = (index: number): void => {
        if (selectedDays.includes(index)) {
            setSelectedDays(selectedDays.filter((d) => d !== index));
        } else {
            setSelectedDays([...selectedDays, index]);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (!courseSelect) {
            alert('Please select a course and section');
            return;
        }

        if (isRecurring && selectedDays.length === 0) {
            alert('Please select at least one day for recurring class');
            return;
        }

        try {

            var class_start_date,class_end_date;
            if(isRecurring){
                class_start_date = startDate;
                class_end_date = endDate;
            }else{
                class_start_date = date;
                class_end_date = date;
            }
            const classData = {
                class_id: Number(id),
                course_id: Number(courseSelect),
                topic: topics,
                class_date: class_start_date,
               // class_start_date: class_start_date,
             //   class_end_date: class_end_date,
                start_time: startTime,
                end_time: endTime,
               // is_recurring: isRecurring,
              //  selected_days: selectedDays,
                attendance_type:attendanceType,
                room:room,
            };

            //  console.log(classData);
           // return false;
//
            const token = localStorage.getItem("access_token");
            // ✅ Axios POST request
            const response = await api.post(
                "/api/update_class",
                classData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );



            // ✅ Axios automatically parses JSON into response.data
            console.log("Class created:", response.data);
            alert('✅ Class created successfully!');
            navigate('/allclasses');

        } catch (error: any) {
            console.error('Error creating class:', error);
            const message = error.response?.data?.message || '❌ Failed to create class. Please try again.';
            alert(message);
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <PageMeta
                title="Update Class Information | Attendance Management System"
                description="Update Class Information and schedule new classes for your attendance management system"
            />

            {/* Header */}
            <div className="p-4 ">
                <div className="max-w-7xl mx-auto flex items-center gap-4">

                    <h1 className="text-xl font-semibold">Create New Class</h1>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Course Selection */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-indigo-600">📚</span>
                        Course Selection
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Course <span className="text-red-500">*</span>
                            </label>
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
                                    // onChange={(e) => setCourseSelect(e.target.value)}

                                    onChange={(e) => {
                                        const courseId = e.target.value;
                                        const selectedOption = e.target.options[e.target.selectedIndex];
                                        const selectedCourseSecId = selectedOption.dataset.courseSectionId;

                                        setCourseSelect(courseId);        // → course_section_id
                                        setCourseSectionId(selectedCourseSecId || ''); // → course_id
                                    }}

                                    required
                                >
                                    <option value="">Choose a course...</option>
                                    {courses.map((course, index) => (
                                        <option key={index} value={course.id} data-course-section-id={course.course_section_id}>
                                            {course.course_name}  ( {course.section_no!=0?course.section_no:''})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Topics <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                value={topics}
                                onChange={(e) => setTopics(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                </div>

                {/* Schedule */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-indigo-600">🕐</span>
                        Schedule
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Time <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="time"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    End Time <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="time"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Room/Location
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                placeholder="e.g., Room 201"
                                value={room}
                                onChange={(e) => setRoom(e.target.value)}
                            />
                        </div>

                        {/* Recurring Toggle */}
                        <div
                            onClick={() => setIsRecurring(!isRecurring)}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition"
                        >
                            <div>
                                <div className="font-medium text-gray-800">Recurring Class</div>
                                <div className="text-sm text-gray-500">Repeat this class on specific days</div>
                            </div>
                            <div
                                className={`w-12 h-6 rounded-full transition-colors ${
                                    isRecurring ? 'bg-indigo-600' : 'bg-gray-300'
                                }`}
                            >
                                <div
                                    className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                                        isRecurring ? 'translate-x-6' : 'translate-x-0.5'
                                    } mt-0.5`}
                                ></div>
                            </div>
                        </div>

                        {/* Recurring Options */}
                        {isRecurring && (
                            <div className="space-y-4 pt-4 border-t border-gray-200">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        Repeat On
                                    </label>
                                    <div className="grid grid-cols-7 gap-2">
                                        {days.map((day) => (
                                            <button
                                                key={day.key}
                                                type="button"
                                                onClick={() => toggleDay(day.key)} // ✅ type-safe key
                                                className={`rounded-xl border-2 font-semibold text-sm px-2 py-1 transition ${
                                                    selectedDays.includes(day.key)
                                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                                        : "border-gray-300 text-gray-600 hover:border-indigo-300"
                                                }`}
                                            >
                                                {day.label.slice(0, 3)} {/* Optional: short name like Sun, Mon */}
                                            </button>
                                        ))}

                                    </div>
                                    <p className="mt-3 text-sm text-gray-500">
                                        Selected: {selectedDays.join(", ") || "None"}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Start Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            End Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>

                                </div>

                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Attendance Type
                            </label>
                            <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" value={attendanceType}
                                    onChange={(e) => setAttendanceType(e.target.value)}>
                                <option value="">Select One</option>
                                <option value="manual">Manual Marking</option>
                                <option value="qr">QR Code Scan</option>
                                <option value="biometric">Biometric</option>
                            </select>
                        </div>
                    </div>
                </div>
            </form>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
                <div className="max-w-3xl mx-auto grid grid-cols-3 gap-3">
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold"
                    >
                        Update Class
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="py-3 border-2 border-gray-300 text-gray-600 rounded-xl font-semibold"
                    >
                        Cancel
                    </button>

                </div>
            </div>
        </div>
    );
};

export default CreateClass;