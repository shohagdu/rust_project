import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  const todayClasses = [
    {
      id: 1,
      name: 'Computer Science 101',
      code: 'CS101 - Section A',
      time: '09:00 AM',
      students: 45,
      room: 'Room 201',
      status: 'pending',
      avgAttendance: 92,
    },
    {
      id: 2,
      name: 'Data Structures',
      code: 'CS201 - Section B',
      time: '11:00 AM',
      students: 38,
      room: 'Room 305',
      status: 'completed',
      avgAttendance: 88,
    },
    {
      id: 3,
      name: 'Database Management',
      code: 'CS301 - Section A',
      time: '02:00 PM',
      students: 42,
      room: 'Room 102',
      status: 'pending',
      avgAttendance: 75,
    },
  ];

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      missed: 'bg-red-100 text-red-800',
    };
    return badges[status] || badges.pending;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-white/90 text-sm mt-1">Monday, October 27, 2025</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-semibold">
              JD
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 -mt-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-md">
            <div className="text-3xl font-bold text-indigo-600 mb-1">5</div>
            <div className="text-sm text-gray-500">Today</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-md">
            <div className="text-3xl font-bold text-indigo-600 mb-1">3</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-md">
            <div className="text-3xl font-bold text-indigo-600 mb-1">2</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Today's Classes</h2>
          <button
            onClick={() => navigate('/all-classes')}
            className="text-indigo-600 font-medium text-sm hover:underline"
          >
            View All
          </button>
        </div>

        {/* Classes List */}
        <div className="grid gap-4 mb-20">
          {todayClasses.map((classItem) => (
            <div
              key={classItem.id}
              onClick={() => navigate('/take-attendance')}
              className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    {classItem.name}
                  </h3>
                  <p className="text-sm text-gray-500">{classItem.code}</p>
                </div>
                <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                  {classItem.time}
                </div>
              </div>
              <div className="flex gap-4 text-sm text-gray-600 mb-3">
                <span>👥 {classItem.students} Students</span>
                <span>📍 {classItem.room}</span>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(classItem.status)}`}>
                {classItem.status.charAt(0).toUpperCase() + classItem.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/create-class')}
        className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center text-3xl font-light"
      >
        +
      </button>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex flex-col items-center gap-1 text-indigo-600"
            >
              <span className="text-2xl">🏠</span>
              <span className="text-xs font-medium">Home</span>
            </button>
            <button
              onClick={() => navigate('/all-classes')}
              className="flex flex-col items-center gap-1 text-gray-500"
            >
              <span className="text-2xl">📚</span>
              <span className="text-xs">Classes</span>
            </button>
            <button
              onClick={() => navigate('/history')}
              className="flex flex-col items-center gap-1 text-gray-500"
            >
              <span className="text-2xl">🕐</span>
              <span className="text-xs">History</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-gray-500">
              <span className="text-2xl">👤</span>
              <span className="text-xs">Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
