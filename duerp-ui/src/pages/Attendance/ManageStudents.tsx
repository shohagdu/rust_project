import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import api from "../../api";
import { toast } from "react-toastify";

interface Student {
  student_id: string;
  name: string;
  roll_no: string;
  reg_no: string;
}
interface Operation {
  id: string;
  course_title: string;
  course_name: string;
  program_name: string;
}

const ManageStudents: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // const location = useLocation();
  // const { operation } = location.state || {};
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [operation, setOperation] = useState<Operation[]>([]);
  const [addedStudents, setAddedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [studentSearch, setStudentSearch] = useState<string>("");
  const [addedSearch, setAddedSearch] = useState<string>("");

  // Selected students for bulk actions
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set()
  );
  const [selectedAddedStudents, setSelectedAddedStudents] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    const fetchAttendanceData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [res1, res2, res3] = await Promise.all([
          api.post("/api/program/student-by-program", {
            course_operation_id: id,
          }),
          api
            .post("/api/student_by_course_operation_id", {
              course_operation_id: id,
            })
            .catch(() => ({ data: { data: [] } })),
          api.post("/api/single_course_operation_info", {
            course_operation_id: id,
          }),
        ]);

        const operationData = res3.data || [];
        const allStudents = res1.data || [];
        const added = res2.data?.data || [];

        const filteredStudents = allStudents.filter(
          (student: any) =>
            !added.some((a: any) => a.student_id === student.student_id)
        );

        setStudents(filteredStudents);
        setAddedStudents(added);
        setOperation(operationData.data);
      } catch {
        setError("Failed to fetch student data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [id]);

  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

  // --- Individual Add/Delete ---
  const handleAdd = async (student: Student) => {
    if (addedStudents.find((s) => s.student_id === student.student_id)) return;

    try {
      await api.post("/api/course/course-student/store", {
        std_id: student.student_id,
        course_operation_id: id,
        roll_no: student.roll_no,
      });
      toast.success("Successfully added student.", { position: "bottom-left" });
    } catch {}

    setAddedStudents([...addedStudents, student]);
    setStudents(students.filter((s) => s.student_id !== student.student_id));
    setSelectedStudents((prev) => {
      const newSet = new Set(prev);
      newSet.delete(student.student_id);
      return newSet;
    });
  };

  const handleDelete = async (student: Student) => {
    try {
      await api.delete("/api/delete_student_from_course_operation", {
        data: { std_id: student.student_id, course_operation_id: id },
      });
      toast.success("Successfully removed student.", {
        position: "bottom-right",
      });
    } catch {}

    setStudents([...students, student]);
    setAddedStudents(
      addedStudents.filter((s) => s.student_id !== student.student_id)
    );
    setSelectedAddedStudents((prev) => {
      const newSet = new Set(prev);
      newSet.delete(student.student_id);
      return newSet;
    });
  };

  // --- Bulk Add/Delete ---
  // --- Bulk Add ---
  const handleBulkAdd = async () => {
    if (selectedStudents.size === 0) return;

    const toAdd = students.filter((s) => selectedStudents.has(s.student_id));

    const payload = {
      course_operation_id: id,
      students: toAdd.map((s) => ({
        std_id: s.student_id,
        roll_no: s.roll_no,
      })),
    };

    try {
      await api.post("/api/course/course-student-bulk/store", payload);
      toast.success("Successfully added selected students.", {
        position: "bottom-left",
      });

      // Move added students from left table to right table
      setAddedStudents([...addedStudents, ...toAdd]);
      setStudents(students.filter((s) => !selectedStudents.has(s.student_id)));
      setSelectedStudents(new Set());
    } catch (err) {
      toast.error("Failed to add selected students.", {
        position: "bottom-left",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAddedStudents.size === 0) return;

    const toDelete = addedStudents.filter((s) =>
      selectedAddedStudents.has(s.student_id)
    );

    const payload = {
      course_operation_id: id,
      students: toDelete.map((s) => ({
        std_id: s.student_id,
      })),
    };

    try {
      await api.delete("/api/course/course-student-bulk/delete", {
        data: payload,
      });

      toast.success("Successfully removed selected students.", {
        position: "bottom-right",
      });

      // ✅ Move deleted students back to left table
      setStudents([...students, ...toDelete]);
      setAddedStudents(
        addedStudents.filter((s) => !selectedAddedStudents.has(s.student_id))
      );

      setSelectedAddedStudents(new Set());
    } catch (err) {
      toast.error("Failed to remove selected students.", {
        position: "bottom-right",
      });
    }
  };

  // --- Filtered lists ---
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.roll_no.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.reg_no.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredAddedStudents = addedStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(addedSearch.toLowerCase()) ||
      s.roll_no.toLowerCase().includes(addedSearch.toLowerCase()) ||
      s.reg_no.toLowerCase().includes(addedSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PageMeta title="Manage Student" description="Manage Student" />
      <div className="max-w-7xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center mb-4">
          <h4 className="text-2xl font-semibold text-gray-800">
            Course: {operation?.course_title?.trim() || operation?.course_name?.trim() }
          </h4>
          <p className="text-gray-600 mt-2">
            Program: {operation?.program_name || ""}
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-4">
          {students.length === 0 && addedStudents.length === 0 ? (
            <p className="text-center">No student data found for this class.</p>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left Table */}
              <div className="w-full md:w-1/2 bg-white rounded-xl shadow border p-4 overflow-auto">
                <h3 className="text-lg font-semibold mb-3">
                  Students ({filteredStudents.length})
                </h3>
                <input
                  type="text"
                  placeholder="Search by Roll No, Name, or Reg No"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="mb-3 w-full p-2 border rounded"
                />
                <button
                  onClick={handleBulkAdd}
                  disabled={selectedStudents.size === 0}
                  className="mb-3 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Add Selected ({selectedStudents.size})
                </button>
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="px-3 py-2 border">
                        <input
                          type="checkbox"
                          checked={
                            selectedStudents.size === filteredStudents.length &&
                            filteredStudents.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents(
                                new Set(
                                  filteredStudents.map((s) => s.student_id)
                                )
                              );
                            } else {
                              setSelectedStudents(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="px-3 py-2 border">S/L</th>
                      <th className="px-3 py-2 border">Roll No</th>
                      <th className="px-3 py-2 border">Student Name</th>
                      <th className="px-3 py-2 border">Registration No</th>
                      <th className="px-3 py-2 border">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => (
                      <tr
                        key={student.student_id}
                        className="hover:bg-gray-50 even:bg-gray-100 transition"
                      >
                        <td className="px-3 py-2 border">
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(student.student_id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedStudents);
                              if (e.target.checked)
                                newSet.add(student.student_id);
                              else newSet.delete(student.student_id);
                              setSelectedStudents(newSet);
                            }}
                          />
                        </td>
                        <td className="px-3 py-2 border">{index + 1}</td>
                        <td className="px-3 py-2 border">{student.roll_no}</td>
                        <td className="px-3 py-2 border">{student.name}</td>
                        <td className="px-3 py-2 border">{student.reg_no}</td>
                        <td className="px-3 py-2 border">
                          <button
                            onClick={() => handleAdd(student)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded shadow"
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right Table */}
              <div className="w-full md:w-1/2 bg-white rounded-xl shadow border p-4 overflow-auto">
                <h3 className="text-lg font-semibold mb-3">
                  Added Students ({filteredAddedStudents.length})
                </h3>
                <input
                  type="text"
                  placeholder="Search by Roll No, Name, or Reg No"
                  value={addedSearch}
                  onChange={(e) => setAddedSearch(e.target.value)}
                  className="mb-3 w-full p-2 border rounded"
                />
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedAddedStudents.size === 0}
                  className="mb-3 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Remove Selected ({selectedAddedStudents.size})
                </button>
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="px-3 py-2 border">
                        <input
                          type="checkbox"
                          checked={
                            selectedAddedStudents.size ===
                              filteredAddedStudents.length &&
                            filteredAddedStudents.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAddedStudents(
                                new Set(
                                  filteredAddedStudents.map((s) => s.student_id)
                                )
                              );
                            } else {
                              setSelectedAddedStudents(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="px-3 py-2 border">S/L</th>
                      <th className="px-3 py-2 border">Roll No</th>
                      <th className="px-3 py-2 border">Student Name</th>
                      <th className="px-3 py-2 border">Registration No</th>
                      <th className="px-3 py-2 border">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAddedStudents.map((student, index) => (
                      <tr
                        key={student.student_id}
                        className="hover:bg-gray-50 even:bg-gray-100 transition"
                      >
                        <td className="px-3 py-2 border">
                          <input
                            type="checkbox"
                            checked={selectedAddedStudents.has(
                              student.student_id
                            )}
                            onChange={(e) => {
                              const newSet = new Set(selectedAddedStudents);
                              if (e.target.checked)
                                newSet.add(student.student_id);
                              else newSet.delete(student.student_id);
                              setSelectedAddedStudents(newSet);
                            }}
                          />
                        </td>
                        <td className="px-3 py-2 border">{index + 1}</td>
                        <td className="px-3 py-2 border">{student.roll_no}</td>
                        <td className="px-3 py-2 border">{student.name}</td>
                        <td className="px-3 py-2 border">{student.reg_no}</td>
                        <td className="px-3 py-2 border">
                          <button
                            onClick={() => handleDelete(student)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="fixed top-20 right-8 flex gap-2">
        <button
          onClick={() => navigate("/class-operation")}
          className="bg-red-300 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-600 transition"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default ManageStudents;
