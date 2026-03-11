import {Table,TableCell, TableHeader, TableRow} from "../ui/table";
import { useEffect, useState } from "react";

export default function MonthlySalesChart() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("https://ssl.du.ac.bd/api/getTeacherCourseInformation/1771")
            .then((res) => res.json())
            .then((data) => {
                setCourses(data || []); // because the response is a plain array
            })
            .catch((err) => console.error("Error fetching data:", err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] ">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    Course Record
                </h3>
            </div>
            <div >
                <div >
                    <Table>
                        {/* Table Header */}
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Course Name
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Exam Name
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Teacher Name
                                </TableCell>


                                <TableCell
                                    isHeader
                                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                >
                                    Attendance
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        {/* Table Body */}
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-5 text-gray-500">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : courses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-5 text-gray-500">
                                    No data found
                                </TableCell>
                            </TableRow>
                        ) : (
                            courses.map((course, index) => (
                                <TableRow key={index} className="border-b border-gray-100">
                                    <TableCell className="px-5 py-3 text-gray-700">
                                        {course.course_name}
                                    </TableCell>
                                    <TableCell className="px-5 py-3 text-gray-700">
                                        {course.name_of_final_exam} -  {course.year_of_final_exam}
                                    </TableCell>
                                    <TableCell className="px-5 py-3 text-gray-700">
                                        {course.course_teacher_name}
                                    </TableCell>

                                    <TableCell className="px-5 py-3 text-gray-700">
                                      <button>Attendance</button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </Table>


                </div>
            </div>
        </div>
    );
}
