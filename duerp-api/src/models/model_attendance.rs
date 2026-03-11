use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct GetAttendanceRequest {
    pub class_id: i64
}

#[derive(serde::Serialize, sqlx::FromRow)]
pub struct AttendanceStudent {
    pub std_id: i64,
    pub reg_no: Option<String>,
    pub is_present: Option<i16>,
    pub rev_attendance: Option<i16>,
}

#[derive(Serialize)]
pub struct AttendanceResponse {
    pub class_id: i32,
    pub attendance_date: String,
    pub students: Vec<AttendanceStudent>,
}



#[derive(Deserialize)]
pub struct AttendanceItem {
    pub std_id: i64,
    pub reg_no: Option<String>,
    pub is_present: Option<i16>
}

#[derive(Deserialize)]
pub struct AttendanceRequest {
    pub class_id: i64,
    pub attendance_date: NaiveDate,
    pub attendance: Vec<AttendanceItem>,
}

#[derive(Deserialize)]
pub struct UpdateAttendanceRequest {
    pub class_id: i64,
    pub attendance: Vec<StudentAttendanceUpdate>,
}

#[derive(Deserialize)]
pub struct StudentAttendanceUpdate {
    pub std_id: i64,
    pub rev_attendance: Option<i16>,
}