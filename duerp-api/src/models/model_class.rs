use chrono::NaiveTime;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct CreateClassRequest {
    pub teacher_id: Option<String>,
    pub course_id: i64,
    pub course_section_id: i64,
    pub is_recurring: bool,
    pub class_start_date: String,
    pub class_end_date: String,
    pub start_time: String,
    pub end_time: String,
    pub selected_days: Vec<String>,
    pub attendance_type: String,
    pub room: String,
    pub topic: Option<String>,
}

#[derive(Serialize)]
pub struct CreateClassResponse {
    pub message: String,
    pub class_data: Option<ClassResponse>,
}

#[derive(Serialize, sqlx::FromRow, Clone)]
pub struct ClassResponse {
    pub id: i64,
    pub teacher_id: i64,
    pub course_id: i64,
    pub course_section_id: i64,
    pub class_date: chrono::NaiveDate,
    pub topic: Option<String>,
    pub start_time: Option<NaiveTime>,
    pub end_time: Option<NaiveTime>,
    pub attendance_type: Option<String>,
    pub room: Option<String>,
    pub attendance_status: Option<i16>
}

#[derive(Deserialize)]
pub struct GetClassRequest {
    pub teacher_id: Option<i64>,
    pub class_id: Option<i64>,
    pub course_id: Option<i64>,
    pub course_section_id: Option<i64>,
    pub class_date: Option<String>, // optional filter
    pub class_start_date: Option<String>, // optional filter
    pub class_end_date: Option<String>, // optional filter
}

#[derive(Serialize)]
pub struct EnrichedClassResponse {
    pub id: i64,
    pub teacher_id: i64,
    pub course_id: i64,
    pub course_section_id: i64,
    pub class_date: String,
    pub topic: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub full_course_name: Option<String>,
    pub attendance_type: Option<String>,
    pub room: Option<String>,
    pub attendance_status: Option<i16>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ClassRequest {
    pub class_id: Option<i64>
}

#[derive(Serialize, sqlx::FromRow)]
pub struct ClassInfo {
    pub id: i64,
    pub course_id: i64,
    pub course_section_id: i64,
}

#[derive(Deserialize)]
pub struct UpdateClassRequest {
    pub class_id: i32,
    pub topic: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub attendance_type: Option<String>,
    pub room: Option<String>,
    pub class_date: Option<String>, // incoming as String from JSON
}

#[derive(Deserialize)]
pub struct DeleteClassRequest {
    pub class_id: i64, // match serial4
}