import { Route, BrowserRouter as Router, Routes } from "react-router";

// import Alerts from "./pages/UiElements/Alerts";
import AppLayout from "./layout/AppLayout";
// import Avatars from "./pages/UiElements/Avatars";
// import Badges from "./pages/UiElements/Badges";
// import BarChart from "./pages/Charts/BarChart";
// import BasicTables from "./pages/Tables/BasicTables";
import Blank from "./pages/Blank.tsx";
// import Buttons from "./pages/UiElements/Buttons";
// import Calendar from "./pages/Calendar";
// import FormElements from "./pages/Forms/FormElements";
import Home from "./pages/Dashboard/Home";
import CourseRecord from "./pages/Dashboard/CourseRecords.tsx";
// import Images from "./pages/UiElements/Images";
// import LineChart from "./pages/Charts/LineChart";
import NotFound from "./pages/OtherPage/NotFound";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";
import Roles from "./pages/UserManagement/Roles";
import { ScrollToTop } from "./components/common/ScrollToTop";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
// import UserProfiles from "./pages/UserProfiles";
// import Videos from "./pages/UiElements/Videos";
import AllClasses from "./pages/Attendance/AllClasses.tsx";
import History from "./pages/Attendance/History.tsx";
import TakeAttendance from "./pages/Attendance/TakeAttendance.tsx";
import Createclass from "./pages/Attendance/CreateClass.tsx";
import AttendanceSheet from "./pages/Attendance/AttendanceSheet.tsx";
import UpdateClass from "./pages/Attendance/UpdateClass.tsx";
import Program from "./pages/Settings/program.tsx";
import RecordClassOperation from "./pages/class_operation/Record.tsx";
import AdddClassOperation from "./pages/class_operation/Add.tsx";
import AttendanceReport from "./pages/Report/AttendanceReport.tsx";
import ManageStudents from "./pages/Attendance/ManageStudents.tsx";
import RecordCourseClass from "./pages/manage_class/RecordCourseClass.tsx";
import Materials from "./pages/materials/Materials.tsx";
import Assignment from "./pages/Assignment/Assignment.tsx";

import ShowCourseOperation from "./pages/class_operation/details.tsx";
import EditCourseOperation from "./pages/class_operation/edit.tsx";

import RecordListCourseClass from "./pages/manage_class/RecordListCourseClass.tsx";
import EditAttendance from "./pages/Attendance/EditAttendance.tsx";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Protected Dashboard Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index path="/" element={<Home />} />
            <Route path="/dashboard" element={<Home />} />
            <Route path="/role_list" element={<Roles />} />
            <Route path="/courseRecord" element={<CourseRecord />} />
            <Route path="/allClasses" element={<AllClasses />} />
            <Route path="/history" element={<History />} />
            <Route path="/take-attendance/:id" element={<TakeAttendance />} />
            <Route path="/edit-attendance/:id/:classId" element={<EditAttendance />} />
            <Route path="/create-class" element={<Createclass />} />
            <Route path="/attendance-sheet/:id" element={<AttendanceSheet />} />
            <Route path="/update-class/:id" element={<UpdateClass />} />
            <Route path="/program" element={<Program />} />

            <Route path="/attendance-report" element={<AttendanceReport />} />

            <Route path="/blank" element={<Blank />} />
            <Route path="/class-operation" element={<RecordClassOperation />} />
            <Route path="/create-class-operation/:id?" element={<AdddClassOperation />} />
            <Route path="/manage-course-students/:id" element={<ManageStudents />} />
            <Route path="/manage-class/:id" element={<RecordCourseClass />} />
            <Route path="/assignment/:id" element={<Assignment />} />

            <Route path="/show-course-operation/:id?" element={<ShowCourseOperation />} />
            <Route path="/edit-course-operation/:id?" element={<EditCourseOperation />} />

            <Route path="/manage-class-list/:id" element={<RecordListCourseClass />} />
            <Route path="/materials/:id" element={<Materials />} />

            {/* <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />

            <Route path="/form-elements" element={<FormElements />} />
            <Route path="/basic-tables" element={<BasicTables />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} /> */}
          </Route>

          {/* Public Auth Pages */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <SignIn />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignUp />
              </PublicRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}