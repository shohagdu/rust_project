use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct TeacherCourseRequest {
    pub employee_id: String,
}

#[derive(Deserialize)]
pub struct CourseInfo {
    pub id: i64,
    pub full_course_name: String,
}