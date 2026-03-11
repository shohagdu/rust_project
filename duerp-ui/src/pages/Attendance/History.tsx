import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from "../../components/common/PageMeta.tsx";

interface HistoryRecord {
    id: number;
    name: string;
    code: string;
    date: string;
    day: string;
    time: string;
    present: number;
    absent: number;
    leave: number;
    percentage: number;
}

interface PercentageStyle {
    bg: string;
    border: string;
    text: string;
}

type FilterType = 'allTime' | 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth';

const History: React.FC = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('allTime');

    const historyRecords: HistoryRecord[] = [
        {
            id: 1,
            name: 'Computer Science 101',
            code: 'CS101 - Section A',
            date: 'Oct 27, 2025',
            day: 'Monday',
            time: '09:00 AM',
            present: 42,
            absent: 2,
            leave: 1,
            percentage: 93,
        },
        {
            id: 2,
            name: 'Data Structures',
            code: 'CS201 - Section B',
            date: 'Oct 27, 2025',
            day: 'Monday',
            time: '11:00 AM',
            present: 35,
            absent: 3,
            leave: 0,
            percentage: 92,
        },
        {
            id: 3,
            name: 'Database Management',
            code: 'CS301 - Section A',
            date: 'Oct 26, 2025',
            day: 'Sunday',
            time: '02:00 PM',
            present: 30,
            absent: 10,
            leave: 2,
            percentage: 71,
        },
        {
            id: 4,
            name: 'Web Development',
            code: 'CS150 - Section C',
            date: 'Oct 25, 2025',
            day: 'Saturday',
            time: '10:00 AM',
            present: 48,
            absent: 1,
            leave: 1,
            percentage: 96,
        },
        {
            id: 5,
            name: 'Operating Systems',
            code: 'CS250 - Section B',
            date: 'Oct 24, 2025',
            day: 'Friday',
            time: '01:30 PM',
            present: 20,
            absent: 12,
            leave: 3,
            percentage: 57,
        },
    ];

    const getPercentageStyle = (percentage: number): PercentageStyle => {
        if (percentage >= 90) {
            return {
                bg: 'bg-green-50',
                border: 'border-l-4 border-green-500',
                text: 'text-green-600',
            };
        } else if (percentage >= 70) {
            return {
                bg: 'bg-yellow-50',
                border: 'border-l-4 border-yellow-500',
                text: 'text-yellow-600',
            };
        } else {
            return {
                bg: 'bg-red-50',
                border: 'border-l-4 border-red-500',
                text: 'text-red-600',
            };
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <PageMeta title="Attendance History" description="Attendance History" />
            {/* Header */}
            <div className=" p-6 ">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-semibold mb-2">Attendance History</h1>
                    <p className="text-sm text-white/90">Track your class attendance records</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto px-5 -mt-8">
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white p-5 rounded-xl shadow-md">
                        <div className="text-3xl font-bold text-gray-800 mb-1">156</div>
                        <div className="text-xs text-gray-500 mb-2">Total Classes</div>
                        <div className="flex items-center gap-1 text-xs text-green-600">
                            <span>↑</span>
                            <span>+12 this week</span>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-md">
                        <div className="text-3xl font-bold text-gray-800 mb-1">87%</div>
                        <div className="text-xs text-gray-500 mb-2">Avg Attendance</div>
                        <div className="flex items-center gap-1 text-xs text-green-600">
                            <span>↑</span>
                            <span>+3% from last month</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-4 shadow-sm mb-2">
                <div className="max-w-7xl mx-auto">
                    <div className="flex gap-3 mb-3">
                        <input
                            type="date"
                            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                            placeholder="Start Date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <input
                            type="date"
                            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                            placeholder="End Date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <button
                            onClick={() => setActiveFilter('allTime')}
                            className={`px-4 py-2 rounded-full border-2 text-xs font-medium whitespace-nowrap transition ${
                                activeFilter === 'allTime'
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-gray-200 text-gray-600'
                            }`}
                        >
                            All Time
                        </button>
                        <button
                            onClick={() => setActiveFilter('today')}
                            className={`px-4 py-2 rounded-full border-2 text-xs font-medium whitespace-nowrap transition ${
                                activeFilter === 'today'
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-gray-200 text-gray-600'
                            }`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setActiveFilter('thisWeek')}
                            className={`px-4 py-2 rounded-full border-2 text-xs font-medium whitespace-nowrap transition ${
                                activeFilter === 'thisWeek'
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-gray-200 text-gray-600'
                            }`}
                        >
                            This Week
                        </button>
                        <button
                            onClick={() => setActiveFilter('thisMonth')}
                            className={`px-4 py-2 rounded-full border-2 text-xs font-medium whitespace-nowrap transition ${
                                activeFilter === 'thisMonth'
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-gray-200 text-gray-600'
                            }`}
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => setActiveFilter('lastMonth')}
                            className={`px-4 py-2 rounded-full border-2 text-xs font-medium whitespace-nowrap transition ${
                                activeFilter === 'lastMonth'
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-gray-200 text-gray-600'
                            }`}
                        >
                            Last Month
                        </button>
                    </div>
                </div>
            </div>

            {/* History List */}
            <div className="max-w-7xl mx-auto px-5 py-4 space-y-3">
                {historyRecords.map((record) => {
                    const style = getPercentageStyle(record.percentage);
                    return (
                        <div
                            key={record.id}
                            className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="text-base font-semibold text-gray-800 mb-1">
                                        {record.name}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {record.date} • {record.day}
                                    </p>
                                </div>
                                <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                                    {record.time}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg mb-3">
                                <div className="text-center">
                                    <div className="text-xl font-bold text-green-600 mb-1">
                                        {record.present}
                                    </div>
                                    <div className="text-xs text-gray-500 uppercase">Present</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-bold text-red-600 mb-1">
                                        {record.absent}
                                    </div>
                                    <div className="text-xs text-gray-500 uppercase">Absent</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-bold text-yellow-600 mb-1">
                                        {record.leave}
                                    </div>
                                    <div className="text-xs text-gray-500 uppercase">Leave</div>
                                </div>
                            </div>

                            <div
                                className={`flex items-center justify-between p-3 rounded-lg ${style.bg} ${style.border}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`text-lg font-bold ${style.text}`}>
                                        {record.percentage}%
                                    </div>
                                    <div className="text-xs text-gray-600">Attendance Rate</div>
                                </div>
                                <button className="text-indigo-600 text-xs font-semibold flex items-center gap-1">
                                    View Details
                                    <span>→</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Export Button */}
            <button className="fixed bottom-24 right-6 bg-white border-2 border-indigo-600 text-indigo-600 px-5 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-2 text-sm font-semibold">
                <span>↓</span>
                Export
            </button>

            {/* Bottom Navigation */}
            {/*<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">*/}
            {/*    <div className="max-w-7xl mx-auto px-6 py-3">*/}
            {/*        <div className="grid grid-cols-4 gap-2">*/}
            {/*            <button*/}
            {/*                onClick={() => navigate('/dashboard')}*/}
            {/*                className="flex flex-col items-center gap-1 text-gray-500"*/}
            {/*            >*/}
            {/*                <span className="text-2xl">🏠</span>*/}
            {/*                <span className="text-xs">Home</span>*/}
            {/*            </button>*/}
            {/*            <button*/}
            {/*                onClick={() => navigate('/allclasses')}*/}
            {/*                className="flex flex-col items-center gap-1 text-gray-500"*/}
            {/*            >*/}
            {/*                <span className="text-2xl">📚</span>*/}
            {/*                <span className="text-xs">Classes</span>*/}
            {/*            </button>*/}
            {/*            <button*/}
            {/*                onClick={() => navigate('/history')}*/}
            {/*                className="flex flex-col items-center gap-1 text-indigo-600"*/}
            {/*            >*/}
            {/*                <span className="text-2xl">🕐</span>*/}
            {/*                <span className="text-xs font-medium">History</span>*/}
            {/*            </button>*/}
            {/*            <button className="flex flex-col items-center gap-1 text-gray-500">*/}
            {/*                <span className="text-2xl">👤</span>*/}
            {/*                <span className="text-xs">Profile</span>*/}
            {/*            </button>*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*</div>*/}
        </div>
    );
};

export default History;