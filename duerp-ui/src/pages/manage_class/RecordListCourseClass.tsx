import React, { useState, useEffect, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import PageMeta from "../../components/common/PageMeta";

// Type definitions
interface ClassSchedule {
  action_by?: string;
  class_date: string;
  course_master_id?: string;
  course_operation_id: string;
  end_time: string;
  id: string;
  room_no?: string;
  start_time: string;
  attendance_status?: string;
}

interface ClassDetails {
  id: string;
  name: string;
  code: string;
  section: string;
  room: string;
  class_date: string;
  start_time: string;
  end_time: string;
  attendance_type?: string;
  topic?: string;
  course_operation_id: string;
  attendance_status?: string;
}

interface courseData {
  course_code: string;
  course_name: string;
  program_name: string;
  faculty_name: string;
}

interface Operation {
  id: string;
  course_title: string;
  course_name: string;
  program_name: string;
}

const RecordListCourseClass: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classDate, setClassDate] = useState("");
  const [classData, setClassData] = useState<ClassSchedule[]>([]);
  const [operation, setOperation] = useState<Operation[]>([]);
  const { id: courseOperationId } = useParams<{ id: string }>();
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [room, setRoom] = useState<string>("");

  useEffect(() => {
    const fetchClassData = async () => {
      if (!courseOperationId) return;

      try {
        setLoading(true);
        const [res1, res2] = await Promise.all([
          api.post("/api/attendance/get_attendance_class", {
            course_operation_id: courseOperationId,
          }),
          api.post("/api/single_course_operation_info", {
            course_operation_id: courseOperationId,
          }),
        ]);
        
        const operationData = res2.data || [];
        setOperation(operationData.data);
        
        const data = res1.data.data;
        let formattedData: any[] = [];
        
        if (Array.isArray(data)) {
          formattedData = data;
        } else if (data) {
          formattedData = [data];
        }
        
        const transformed: ClassSchedule[] = formattedData.map((item: any) => ({
          id: String(item.id),
          class_date: item.attendance_date || item.class_date || '',
          start_time: item.start_time || '',
          end_time: item.end_time || '',
          course_operation_id: item.course_operation_id || courseOperationId || '',
          room_no: item.room_no || '',
          attendance_status: item.attendance_status || '0',
          action_by: item.action_by || '',
          course_master_id: item.course_master_id || '',
        }));
        
        setClassData(transformed);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Failed to load class data. Please try again.");
        setClassData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [courseOperationId]);

  function formatTime(time: string | null | undefined): string {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  const handleTakeAttendance = (id: string) => {
    navigate(`/edit-attendance/${courseOperationId}/${id}`);
  };

  const handleUpdate = (id: string) => {
    alert(id);
    const fetchClassDetails = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");

        const classDetailsResponse = await api.post(
          "/api/get_class",
          { class_id: id },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (classDetailsResponse.data.status === "success") {
          const details = classDetailsResponse.data.data;
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
            attendance_status: details.attendance_status,
          });
          setClassDate(details.class_date);
          setStartTime(details.start_time);
          setEndTime(details.end_time);
          setRoom(details.room_no);
        }
      } catch (err) {
        console.error("Failed to fetch class details:", err);
        alert("Failed to load class details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchClassDetails();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this class operation?")) return;
    
    try {
      const token = localStorage.getItem("access_token");
      await api.post(
        "/api/delete_class",
        { class_id: id },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setClassData((prev) => prev.filter((op) => op.id !== id));
      alert("Class deleted successfully!");
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete class operation. Please try again.");
    }
  };

  const handleUpdateClass = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!classDate) {
      alert("Please select a class date.");
      return;
    }

    if (!startTime || !endTime) {
      alert("Please set start and end times.");
      return;
    }

    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    if (end <= start) {
      alert("End time must be after start time.");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");

      const payload = {
        class_id: classDetails?.id,
        class_date: classDate,
        class_start_time: startTime,
        class_end_time: endTime,
        room: room || null,
      };

      await api.post("/api/update_class", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("✅ Class updated successfully!");

      setClassData((prevClasses) =>
        prevClasses.map((cls) =>
          cls.id === classDetails?.id
            ? {
                ...cls,
                class_date: classDate,
                start_time: startTime,
                end_time: endTime,
                room_no: room || cls.room_no,
              }
            : cls
        )
      );

      setIsModalOpen(false);
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || "❌ Failed to update class. Please try again.";
      alert(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PageMeta title="Manage Student" description="Manage Student" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center mb-4">
          <h4 className="text-2xl font-semibold text-gray-800">
            Course: {operation?.course_title?.trim() || operation?.course_name?.trim()}
          </h4>
          <p className="text-gray-600 mt-2">
            Program: {operation?.program_name || ""}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading classes...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && classData.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-600">No classes found for this course.</p>
          </div>
        )}

        {/* Class Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classData.map((item: ClassSchedule) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition"
            >
              {/* Top Info */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">
                    {item.class_date
                      ? new Date(item.class_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }).replace(/ /g, '-')
                      : 'N/A'}
                  </span>

                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full
                      ${
                        item.attendance_status === '1' || item.attendance_status === 1
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }
                    `}
                  >
                    Attendance Taken
                  </span>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-500">Class Time</p>
                  <p className="text-gray-800 font-medium">
                    {formatTime(item.start_time) || 'N/A'} – {formatTime(item.end_time) || 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Room</p>
                  <p className="text-gray-800 font-medium">
                    {item.room_no || 'TBA'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => handleTakeAttendance(item.id)}
                  className="flex-1 text-sm font-medium bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Update Attendance
                </button>

                {/* <button
                  onClick={() => handleUpdate(item.id)}
                  className="flex-1 text-sm font-medium bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Edit
                </button> */}

                {/* <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-1 text-sm font-medium bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition"
                >
                  Delete
                </button> */}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Modal */}
      {isModalOpen && classDetails && (
        <form onSubmit={handleUpdateClass} className="mx-auto py-4 space-y-2">
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
              
              <div>
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Class Date <span className="text-red-500">*</span></label>
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
                    <input 
                      type="time" 
                      value={startTime} 
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time <span className="text-red-500">*</span></label>
                    <input 
                      type="time" 
                      value={endTime} 
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" 
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room/Location</label>
                  <input 
                    type="text" 
                    value={room}  
                    placeholder="Room/Location" 
                    onChange={e => setRoom(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" 
                  />
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
                  type="button"
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
    </div>
  );
};

export default RecordListCourseClass;