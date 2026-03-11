use actix_web::{web, HttpResponse, Responder};
// NaiveDate is now only imported here
use chrono::{NaiveDate, NaiveTime, Weekday};
use serde::{Deserialize, Serialize};
use serde_json::json;
use serde_json::Map;
use serde_json::Value;
// FIX: Removed types::chrono::NaiveDate from this line
use sqlx::{Column as _, PgPool, Row};
use uuid::Uuid;
// --- Data Structures ---

/// Struct to hold the department data retrieved from the database
#[derive(Debug, Serialize, Deserialize)]
pub struct Department {
    pub id: String, 
    pub name: String,
    pub body_id: Option<i32>
}

/// Struct to hold the program data retrieved from the database
#[derive(Debug, Serialize, Deserialize)]
pub struct Program {
    pub id: String, 
    pub name: String,
}

/// Request payload for fetching programs
#[derive(Debug, Deserialize)]
pub struct ProgramListRequest {
    pub dept_id: String, 
}

/// Struct for a single day configuration within the class schedule
#[derive(Debug, Deserialize, Serialize)]
pub struct SelectedDay {
    pub day: String,        // e.g., "sun", "mon", "wed"
    pub start_time: String, // e.g., "10:10"
    pub end_time: String,   // e.g., "11:11"
    pub room: String,       // e.g., "CSE"
}

#[derive(Debug, Deserialize)]
pub struct DeleteCourseOperationRequest {
    pub course_operation_id: String,
}

/// Request payload for storing a new course program record (Course Operation and Classes)
#[derive(Debug, Deserialize)]
pub struct StoreCourseProgramRequest {
    pub course_id: String,
    pub program_id: String,
    pub faculty_id: String,
    pub start_date: String, 
    pub end_date: String,     
    pub course_year: String,       
    pub course_semester: String,   
    pub course_section: String,    
    pub selected_days: Vec<SelectedDay>,
}


/// Struct to hold the class data retrieved from the lms_classes table
// NOTE: This struct is now the final output model that includes course/program details

/// Struct to hold the class data retrieved from the lms_classes table

#[derive(Debug, Serialize)]
pub struct CourseInfoOutput {
    pub course_operation_id: String,
    pub course_name: Option<String>,
    pub program_name: Option<String>,
    pub course_code: Option<String>,
    // CHANGED: Renamed from faculty_id to faculty_name
    pub faculty_name: Option<String>, 
}

#[derive(Debug, Serialize)]
pub struct SingleCourseInfoOutput {
    pub course_operation_id: String,
    pub course_year: Option<i32>,
    pub course_semester: Option<String>,
    pub course_section: Option<i32>,
    pub course_id: String,
    pub program_id: String,
    pub dept_id: Option<String>,
    pub department_name: Option<String>,
    pub course_name: Option<String>,
    pub program_name: Option<String>,
    pub course_code: Option<String>,
    // CHANGED: Renamed from faculty_id to faculty_name
    pub faculty_name: Option<String>,
    pub course_outline: Option<String>,
    pub book_reference: Option<String>,
}
// Struct for the details unique to each class (the 'data' array items)
#[derive(Debug, Serialize)]
pub struct ClassDataOutput {
    pub id: String,
    pub class_date: Option<NaiveDate>, 
    pub start_time: Option<NaiveTime>, 
    pub end_time: Option<NaiveTime>,   
    pub room_no: Option<String>,
    // NEW FIELD
    pub attendance_status: Option<i16>, 
}

// Struct for the final API response
#[derive(Debug, Serialize)]
pub struct FinalResponse {
    pub course_info: CourseInfoOutput,
    pub data: Vec<ClassDataOutput>,
}

#[derive(Debug, Serialize)]
pub struct FinalResponseCourseOperation {
    pub data: SingleCourseInfoOutput,
}
// --- Utility Function ---

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct DeleteClassRequest {
    pub class_id: String,
}

#[derive(Debug, serde::Serialize)]
pub struct CourseOperationInfo {
    // ... (fields remain the same)
    pub course_operation_id: String,
    pub course_id: String,
    pub program_id: String,
    pub faculty_id: Option<String>,
    pub co_start_date: Option<NaiveDate>,
    pub co_end_date: Option<NaiveDate>,
    
    // From lms_class_master (cm)
    pub cm_start_date: Option<NaiveDate>,
    pub cm_end_date: Option<NaiveDate>,
    // FIX 2: Changed from Option<String> to Option<Value>
    pub class_configuration: Option<Value>, 
    // FIX 3: Changed from Option<i32> to Option<i16>
    pub domain_status: Option<i16>, 
}


#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct GetClassRequest {
    pub class_id: String,
}

#[derive(Debug, serde::Serialize)]
pub struct ClassOutput {
    // Fields from lms_classes (cl)
    pub id: String,
    pub course_operation_id: String,
    pub class_date: Option<NaiveDate>, 
    pub start_time: Option<NaiveTime>, 
    pub end_time: Option<NaiveTime>,   
    pub room_no: Option<String>,
    pub course_master_id: Option<String>, 
    pub action_by: Option<String>,
    pub domain_status: Option<i16>, 
    pub attendance_status: Option<i16>,
    
    // NEW FOREIGN KEY IDs (from lms_course_operation)
    pub course_id: String,
    pub program_id: String,

    // Course and Program Info
    pub course_code: Option<String>,
    pub course_title: Option<String>,
    pub program_name: Option<String>,
    pub program_level: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct StudentInfoOutput {
    pub course_operation_id: String,
    pub student_id: String,
    pub name: Option<String>,
    pub reg_no: Option<String>,
    pub roll_no: Option<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct UpdateClassRequest {
    pub class_id: String,
    pub class_date: NaiveDate,
    pub class_start_time: NaiveTime,
    pub class_end_time: NaiveTime,
    pub room: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct DeleteStudentCourseRequest {
    pub std_id: String,
    pub course_operation_id: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct UpdateCourseOutlineRequest {
    pub course_operation_id: String,
    // ADDED: The new outline content to be saved
    pub course_outline: String, 
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct UpdateBookReferenceRequest {
    pub course_operation_id: String,
    // ADDED: The new outline content to be saved
    pub book_reference: Value, // JSON object/array
}

/// Helper to convert a three-letter day string ("sun", "mon") to chrono::Weekday
fn day_str_to_weekday(day_str: &str) -> Option<Weekday> {
    match day_str.to_lowercase().as_str() {
        "mon" => Some(Weekday::Mon),
        "tue" => Some(Weekday::Tue),
        "wed" => Some(Weekday::Wed),
        "thu" => Some(Weekday::Thu),
        "fri" => Some(Weekday::Fri),
        "sat" => Some(Weekday::Sat),
        "sun" => Some(Weekday::Sun),
        _ => None,
    }
}


#[derive(Serialize, Deserialize)]
pub struct StoreClassMasterRequest {
    pub course_operation_id: String,
    pub start_date: String,
    pub end_date: String,
    pub selected_days: Vec<ClassDayItem>,
}

#[derive(Serialize, Deserialize)]
pub struct ClassDayItem {
    pub day: String,
    pub start_time: String,
    pub end_time: String,
    pub room: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct GetPloByProgramRequest {
    pub program_id: String,
}

#[derive(Debug, serde::Serialize)]
pub struct ProgramPloOutput {
    pub id: String,
    pub sl: Option<i32>,           // int4 maps to i32
    pub statement: Option<String>, // varchar(255) maps to Option<String>
    pub domain_status: Option<i16>, // int2 maps to Option<i16>
    pub program_id: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveCloRequest {
    #[serde(rename = "Course_operation_id")] // Use serde to match the exact JSON key
    pub course_operation_id: String,
    pub sl: i32, // Assuming sl is sent as a string like "CLO-1"
    pub statement: String,
    pub plo_ids: Vec<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CourseOperationIdRequest {
    pub course_operation_id: String,
}

#[derive(Debug, serde::Serialize)]
pub struct CloOutput {
    pub id: String,
    pub sl: Option<i32>,
    pub statement: Option<String>,
    pub course_operation_id: String,
    pub domain_status: Option<i16>,
}


#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct DeleteCloRequest {
    pub clo_id: String,
}

#[derive(Deserialize)]
pub struct CourseStudentRequest {
    pub course_id: String,
    // Changed to i32 because course_section_id is an integer
    pub course_section_id: i32, 
}


// --- Route Handlers ---

// Handler for listing departments (POST /department/list)

pub async fn get_departments(
    db: web::Data<PgPool>,
) -> impl Responder {
    let result: Result<Vec<Department>, sqlx::Error> = sqlx::query_as!(
        Department,
        r#"
        SELECT id, name, body_id
        FROM ictcell.lms_department
        ORDER BY name
        "#,
    )
    .fetch_all(db.get_ref())
    .await;

    match result {
        Ok(departments) => HttpResponse::Ok().json(json!({
            "status": "success",
            "data": departments,
        })),
        Err(e) => {
            eprintln!("Failed to fetch departments: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": "Failed to retrieve department list from the database",
            }))
        }
    }
}

// Handler for listing programs by department ID (POST /department/program_list)

pub async fn get_programs_by_department(
    req: web::Json<ProgramListRequest>, 
    db: web::Data<PgPool>,
) -> impl Responder {
    let result: Result<Vec<Program>, sqlx::Error> = sqlx::query_as!(
        Program,
        r#"
        SELECT id, name
        FROM ictcell.lms_program
        WHERE dept_id = $1
        ORDER BY name
        "#,
        req.dept_id
    )
    .fetch_all(db.get_ref())
    .await;

    match result {
        Ok(programs) => HttpResponse::Ok().json(json!({
            "status": "success",
            "data": programs,
            "dept_id": req.dept_id
        })),
        Err(e) => {
            eprintln!("Failed to fetch programs: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": "Failed to retrieve program list from the database",
            }))
        }
    }
}

// Handler for storing course operation and generating classes (POST /store_course_operation)

// Handler for storing course operation and generating classes (POST /store_course_operation)

// pub async fn store_course_operation(
//     req: web::Json<StoreCourseProgramRequest>,
//     db: web::Data<PgPool>,
// ) -> impl Responder {
//     // --- 0. Setup and Parsing ---
//     let course_operation_id = Uuid::new_v4().to_string();
//     let class_master_id = Uuid::new_v4().to_string();
//     let action_by_id = "SYSTEM_DEFAULT_USER".to_string();

//     // Date parsing
//     let start_date = match NaiveDate::parse_from_str(&req.start_date, "%Y-%m-%d") {
//         Ok(d) => d,
//         Err(_) => return HttpResponse::BadRequest().json(json!({"status": "error", "message": "Invalid format for start_date. Expected YYYY-MM-DD."})),
//     };

//     let end_date = match NaiveDate::parse_from_str(&req.end_date, "%Y-%m-%d") {
//         Ok(d) => d,
//         Err(_) => return HttpResponse::BadRequest().json(json!({"status": "error", "message": "Invalid format for end_date. Expected YYYY-MM-DD."})),
//     };

//     // Convert course_year to i32 (as confirmed INT)
//     let course_year_i32 = match req.course_year.parse::<i32>() {
//         Ok(v) => v,
//         Err(_) => return HttpResponse::BadRequest().json(json!({"status": "error", "message": "course_year must be a valid integer string."})),
//     };

//     // Pass course_semester as String (as confirmed VARCHAR)
//     let course_semester_str = req.course_semester.to_string();

//     // Convert course_section to i32 (as confirmed INT)
//     let course_section_i32 = match req.course_section.parse::<i32>() {
//         Ok(v) => v,
//         Err(_) => return HttpResponse::BadRequest().json(json!({
//             "status": "error",
//             "message": format!("course_section must be a valid integer string. Value '{}' is not numeric.", req.course_section),
//         })),
//     };

//     // --- 0.5. Lookup Faculty ID (New Step) ---
//     // Use the input req.faculty_id (emp_id) to find the internal UUID (id)
//     let faculty_lookup = sqlx::query!(
//         r#"
//         SELECT id FROM ictcell.lms_faculty
//         WHERE emp_id = $1
//         "#,
//         req.faculty_id
//     )
//     .fetch_optional(db.get_ref())
//     .await;

//     let faculty_id_uuid: String = match faculty_lookup {
//         Ok(Some(row)) => row.id, // Successfully found the internal ID
//         Ok(None) => return HttpResponse::NotFound().json(json!({
//             "status": "error",
//             "message": format!("Faculty with emp_id '{}' not found in lms_faculty table.", req.faculty_id),
//         })),
//         Err(e) => {
//             eprintln!("Faculty lookup error: {:?}", e);
//             return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Database error during faculty lookup."}));
//         }
//     };

//     // Serialize selected_days for class_master
//     let class_config_json = match serde_json::to_value(&req.selected_days) {
//         Ok(v) => v,
//         Err(e) => {
//             eprintln!("JSON serialization error: {:?}", e);
//             return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Failed to serialize class configuration."}));
//         }
//     };

//     let mut tx = match db.begin().await {
//         Ok(t) => t,
//         Err(_) => return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Failed to start database transaction."})),
//     };

//     // --- 1. Insert into lms_course_operation ---
//     let result_co = sqlx::query!(
//         r#"
//         INSERT INTO ictcell.lms_course_operation
//         (id, course_id, program_id, faculty_id, start_date, end_date, course_year, course_semester, course_section, action_by)
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
//         "#,
//         course_operation_id, // $1
//         req.course_id,       // $2
//         req.program_id,      // $3
//         faculty_id_uuid,     // $4 (The internal UUID)
//         start_date,          // $5 (NaiveDate)
//         end_date,            // $6 (NaiveDate)
//         course_year_i32,     // $7 (i32)
//         course_semester_str, // $8 (String/&str)
//         course_section_i32,  // $9 (i32)
//         action_by_id,        // $10
//     )
//     .execute(&mut *tx)
//     .await;

//     if let Err(e) = result_co {
//         eprintln!("lms_course_operation insert error: {:?}", e);
//         let _ = tx.rollback().await;
//         return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Failed to insert into course operation table.", "detail": e.to_string()}));
//     }

//     // --- 2. Insert into lms_class_master ---
//     let result_cm = sqlx::query!(
//         r#"
//         INSERT INTO ictcell.lms_class_master
//         (id, course_operation_id, start_date, end_date, class_configuration, action_by)
//         VALUES ($1, $2, $3, $4, $5, $6)
//         "#,
//         class_master_id,
//         course_operation_id,
//         start_date,
//         end_date,
//         class_config_json,
//         action_by_id,
//     )
//     .execute(&mut *tx)
//     .await;

//     if let Err(e) = result_cm {
//         eprintln!("lms_class_master insert error: {:?}", e);
//         let _ = tx.rollback().await;
//         return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Failed to insert into class master table.", "detail": e.to_string()}));
//     }

//     // --- 3. Insert into lms_classes (Schedule Generation) ---
//     let mut current_date = start_date;
//     let mut classes_inserted = 0;

//     // Loop through all days from start_date up to (but not including) end_date
//     while current_date < end_date {
//         let current_weekday = current_date.weekday();

//         // Check each selected day in the payload
//         for day_config in &req.selected_days {
//             if let Some(target_weekday) = day_str_to_weekday(&day_config.day) {
//                 // If the current date matches a target weekday
//                 if current_weekday == target_weekday {

//                     // Parse start_time to NaiveTime
//                     let start_time = match NaiveTime::parse_from_str(
//                         &day_config.start_time, "%H:%M"
//                     ) {
//                         Ok(t) => t,
//                         Err(e) => {
//                             let _ = tx.rollback().await;
//                             return HttpResponse::BadRequest().json(json!({"status": "error", "message": format!("Invalid format for start_time: {}. Expected HH:MM. Detail: {}", day_config.start_time, e)}));
//                         }
//                     };

//                     // Parse end_time to NaiveTime
//                     let end_time = match NaiveTime::parse_from_str(
//                         &day_config.end_time, "%H:%M"
//                     ) {
//                         Ok(t) => t,
//                         Err(e) => {
//                             let _ = tx.rollback().await;
//                             return HttpResponse::BadRequest().json(json!({"status": "error", "message": format!("Invalid format for end_time: {}. Expected HH:MM. Detail: {}", day_config.end_time, e)}));
//                         }
//                     };

//                     let result_cl = sqlx::query!(
//                         r#"
//                         INSERT INTO ictcell.lms_classes
//                         (id, course_operation_id, course_master_id, class_date, start_time, end_time, room_no, action_by)
//                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//                         "#,
//                         Uuid::new_v4().to_string(),
//                         course_operation_id,
//                         class_master_id,
//                         current_date,
//                         start_time,
//                         end_time,
//                         day_config.room,
//                         action_by_id,
//                     )
//                     .execute(&mut *tx)
//                     .await;

//                     if let Err(e) = result_cl {
//                         eprintln!("lms_classes insert error on date {}: {:?}", current_date, e);
//                         let _ = tx.rollback().await;
//                         return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Failed to insert into classes table.", "detail": e.to_string()}));
//                     }
//                     classes_inserted += 1;
//                 }
//             }
//         }

//         // Handle date overflow explicitly without moving `tx`
//         current_date = match current_date.checked_add_signed(Duration::days(1)) {
//             Some(date) => date,
//             None => {
//                 eprintln!("Date overflow while generating schedule.");
//                 let _ = tx.rollback().await;
//                 return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Date calculation failed due to overflow."}));
//             }
//         };
//     }

//     // --- 4. Commit Transaction ---
//     if let Err(e) = tx.commit().await {
//         eprintln!("Transaction commit error: {:?}", e);
//         return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Failed to commit class schedule data."}));
//     }

//     HttpResponse::Ok().json(json!({
//         "status": "success",
//         "message": "Course operation and class schedule stored successfully",
//         "course_operation_id": course_operation_id,
//         "class_master_id": class_master_id,
//         "total_classes_generated": classes_inserted
//     }))
// }

pub async fn store_course_operation(
    req: web::Json<StoreCourseProgramRequest>,
    db: web::Data<PgPool>,
) -> impl Responder {

    let course_operation_id = Uuid::new_v4().to_string();
    let action_by_id = "SYSTEM_DEFAULT_USER".to_string();
    let now = chrono::Utc::now().naive_utc();

    // ---- Parse Dates ----
    let start_date = match NaiveDate::parse_from_str(&req.start_date, "%Y-%m-%d") {
        Ok(d) => d,
        Err(_) => return HttpResponse::BadRequest().json(json!({"status": "error", "message": "Invalid start_date format"})),
    };

    let end_date = match NaiveDate::parse_from_str(&req.end_date, "%Y-%m-%d") {
        Ok(d) => d,
        Err(_) => return HttpResponse::BadRequest().json(json!({"status": "error", "message": "Invalid end_date format"})),
    };

    let course_year_i32 = match req.course_year.parse::<i32>() {
        Ok(v) => v,
        Err(_) => return HttpResponse::BadRequest().json(json!({"status": "error", "message": "course_year must be integer"})),
    };

    let course_section_i32 = match req.course_section.parse::<i32>() {
        Ok(v) => v,
        Err(_) => return HttpResponse::BadRequest().json(json!({"status": "error", "message": "course_section must be integer"})),
    };

    // ---- Faculty Lookup ----
    let faculty_row = match sqlx::query!(
        r#"SELECT id FROM ictcell.lms_faculty WHERE emp_id = $1"#,
        req.faculty_id
    )
        .fetch_optional(db.get_ref())
        .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            return HttpResponse::NotFound().json(json!({
                "status": "error",
                "message": "Faculty not found"
            }))
        }
        Err(e) => {
            eprintln!("Faculty lookup error: {:?}", e);
            return HttpResponse::InternalServerError().finish();
        }
    };

    // ==========================
    // START TRANSACTION
    // ==========================
    let mut tx = match db.begin().await {
        Ok(t) => t,
        Err(e) => {
            eprintln!("Transaction error: {:?}", e);
            return HttpResponse::InternalServerError().finish();
        }
    };

    // ---- Insert Course Operation ----
    if let Err(e) = sqlx::query!(
        r#"
        INSERT INTO ictcell.lms_course_operation
        (id, course_id, program_id, faculty_id, start_date, end_date,
         course_year, course_semester, course_section, action_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        "#,
        course_operation_id,
        req.course_id,
        req.program_id,
        faculty_row.id,
        start_date,
        end_date,
        course_year_i32,
        req.course_semester,
        course_section_i32,
        action_by_id,
    )
        .execute(&mut *tx)
        .await
    {
        eprintln!("Course operation insert error: {:?}", e);
        tx.rollback().await.ok();
        return HttpResponse::InternalServerError().finish();
    }

    // ==========================
    // Insert Class Routine (Multiple)
    // ==========================
    for day in &req.selected_days {

        let routine_id = Uuid::new_v4().to_string();

        let start_time = match NaiveTime::parse_from_str(&day.start_time, "%H:%M") {
            Ok(t) => t,
            Err(_) => {
                tx.rollback().await.ok();
                return HttpResponse::BadRequest().json(json!({"status":"error","message":"Invalid start_time format"}));
            }
        };

        let end_time = match NaiveTime::parse_from_str(&day.end_time, "%H:%M") {
            Ok(t) => t,
            Err(_) => {
                tx.rollback().await.ok();
                return HttpResponse::BadRequest().json(json!({"status":"error","message":"Invalid end_time format"}));
            }
        };

        if let Err(e) = sqlx::query!(
            r#"
            INSERT INTO ictcell.lms_class_routine
            (id, course_operation_id, day_name, start_time, end_time,
             is_active, created_at, created_by, room)
            VALUES ($1,$2,$3,$4,$5,1,$6,$7,$8)
            "#,
            routine_id,
            course_operation_id,
            day.day,
            start_time,
            end_time,
            now,
            action_by_id,
            day.room
        )
            .execute(&mut *tx)
            .await
        {
            eprintln!("Routine insert error: {:?}", e);
            tx.rollback().await.ok();
            return HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": "Failed to insert class routine"
            }));
        }
    }

    // ==========================
    // COMMIT
    // ==========================
    if let Err(e) = tx.commit().await {
        eprintln!("Commit error: {:?}", e);
        return HttpResponse::InternalServerError().finish();
    }

    HttpResponse::Ok().json(json!({
        "status": "success",
        "message": "Course operation and class routine stored successfully",
        "course_operation_id": course_operation_id
    }))
}


// pub async fn store_course_class( db: web::Data<PgPool>, req: web::Json<StoreClassMasterRequest>, ) -> impl Responder {
//
//     let class_master_id = Uuid::new_v4().to_string();
//     let action_by = "SYSTEM_DEFAULT_USER";
//
//     // Parse dates
//     let start_date = match NaiveDate::parse_from_str(&req.start_date, "%Y-%m-%d") {
//         Ok(d) => d,
//         Err(_) => return HttpResponse::BadRequest().json(json!({"error": "Invalid start_date format"})),
//     };
//
//     let end_date = match NaiveDate::parse_from_str(&req.end_date, "%Y-%m-%d") {
//         Ok(d) => d,
//         Err(_) => return HttpResponse::BadRequest().json(json!({"error": "Invalid end_date format"})),
//     };
//
//     // Serialize full class configuration JSON
//     let class_config_json = serde_json::to_value(&req.selected_days).unwrap();
//
//     let mut tx = db.begin().await.unwrap();
//
//     // --- 1. Insert into lms_class_master ---
//     let res_master = sqlx::query!(
//         r#"
//         INSERT INTO ictcell.lms_class_master
//         (id, course_operation_id, start_date, end_date, class_configuration, action_by)
//         VALUES ($1, $2, $3, $4, $5, $6)
//         "#,
//         class_master_id,
//         req.course_operation_id,
//         start_date,
//         end_date,
//         class_config_json,
//         action_by,
//     )
//         .execute(&mut *tx)
//         .await;
//
//     if let Err(e) = res_master {
//         tx.rollback().await.unwrap();
//         return HttpResponse::InternalServerError()
//             .json(json!({ "error": "Failed to insert into lms_class_master", "detail": e.to_string() }));
//     }
//
//     // --- 2. Insert into lms_classes ---
//     let mut classes_count = 0;
//     let mut date = start_date;
//
//     while date <= end_date {
//         let weekday = date.weekday();
//
//         for d in &req.selected_days {
//             if let Some(target_wd) = day_str_to_weekday(&d.day) {
//                 if weekday == target_wd {
//
//                     let start_t = NaiveTime::parse_from_str(&d.start_time, "%H:%M").unwrap();
//                     let end_t = NaiveTime::parse_from_str(&d.end_time, "%H:%M").unwrap();
//
//                     let res_class = sqlx::query!(
//                         r#"
//                         INSERT INTO ictcell.lms_classes
//                         (id, course_operation_id, course_master_id, class_date, start_time, end_time, room_no, action_by)
//                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//                         "#,
//                         Uuid::new_v4().to_string(),
//                         req.course_operation_id,
//                         class_master_id,
//                         date,
//                         start_t,
//                         end_t,
//                         d.room,
//                         action_by,
//                     )
//                         .execute(&mut *tx)
//                         .await;
//
//                     if let Err(e) = res_class {
//                         tx.rollback().await.unwrap();
//                         return HttpResponse::InternalServerError()
//                             .json(json!({ "error": "Failed inserting class", "detail": e.to_string() }));
//                     }
//
//                     classes_count += 1;
//                 }
//             }
//         }
//
//         date = date.succ_opt().unwrap();
//     }
//
//     tx.commit().await.unwrap();
//
//     HttpResponse::Ok().json(json!({
//         "status": "success",
//         "class_master_id": class_master_id,
//         "total_classes_generated": classes_count
//     }))
// }



// pub async fn delete_course_operation(
//     req: web::Json<DeleteCourseOperationRequest>,
//     db: web::Data<PgPool>,
// ) -> impl Responder {
//     let mut tx = match db.begin().await {
//         Ok(t) => t,
//         Err(_) => return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Failed to start database transaction."})),
//     };
//
//     let op_id = &req.course_operation_id;
//     let mut rows_deleted: i64 = 0;
//
//     // IMPORTANT: Deletion order matters due to foreign key constraints (lms_classes -> lms_class_master -> lms_course_operation).
//     // We must delete the dependents first.
//
//
//     // --- CHECK: Block deletion if any attendance exists ---
//     let attendance_exists = sqlx::query_scalar!(
//     r#"
//     SELECT EXISTS(
//         SELECT 1
//         FROM ictcell.lms_class_attendance a
//         JOIN ictcell.lms_classes c ON a.class_id = c.id
//         WHERE c.course_operation_id = $1
//     ) AS "exists!: bool"
//     "#,
//         op_id
//     )
//         .fetch_one(&mut *tx)
//         .await;
//
//     match attendance_exists {
//         Ok(true) => {
//             let _ = tx.rollback().await;
//             return HttpResponse::BadRequest().json(json!({
//             "status": "error",
//             "message": "Cannot delete this course operation because attendance records exist."
//         }));
//         }
//         Ok(false) => {}  // safe to continue
//         Err(e) => {
//             let _ = tx.rollback().await;
//             return HttpResponse::InternalServerError().json(json!({
//             "status": "error",
//             "message": "Failed to check attendance.",
//             "detail": e.to_string()
//         }));
//         }
//     }
//
//     // 1. Delete associated lms_classes
//     let result_cl = sqlx::query!(
//         r#"
//         DELETE FROM ictcell.lms_classes
//         WHERE course_operation_id = $1
//         "#,
//         op_id,
//     )
//     .execute(&mut *tx)
//     .await;
//
//     if let Err(e) = result_cl {
//         eprintln!("lms_classes delete error for {}: {:?}", op_id, e);
//         let _ = tx.rollback().await;
//         return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Failed to delete associated classes.", "detail": e.to_string()}));
//     }
//     rows_deleted += result_cl.unwrap().rows_affected() as i64;
//
//
//     // 2. Delete associated lms_class_master
//     let result_cm = sqlx::query!(
//         r#"
//         DELETE FROM ictcell.lms_class_master
//         WHERE course_operation_id = $1
//         "#,
//         op_id,
//     )
//     .execute(&mut *tx)
//     .await;
//
//     if let Err(e) = result_cm {
//         eprintln!("lms_class_master delete error for {}: {:?}", op_id, e);
//         let _ = tx.rollback().await;
//         return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Failed to delete class master record.", "detail": e.to_string()}));
//     }
//     rows_deleted += result_cm.unwrap().rows_affected() as i64;
//
//
//     // 3. Delete lms_course_operation itself
//     let result_co = sqlx::query!(
//         r#"
//         DELETE FROM ictcell.lms_course_operation
//         WHERE id = $1
//         "#,
//         op_id,
//     )
//     .execute(&mut *tx)
//     .await;
//
//     if let Err(e) = result_co {
//         eprintln!("lms_course_operation delete error for {}: {:?}", op_id, e);
//         let _ = tx.rollback().await;
//         return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Failed to delete course operation record.", "detail": e.to_string()}));
//     }
//
//     // Check if the operation itself was deleted
//     let op_rows_deleted = result_co.unwrap().rows_affected() as i64;
//     rows_deleted += op_rows_deleted;
//
//     if op_rows_deleted == 0 {
//         let _ = tx.rollback().await;
//         return HttpResponse::NotFound().json(json!({
//             "status": "error",
//             "message": format!("Course operation ID '{}' not found.", op_id),
//         }));
//     }
//
//     // Commit the transaction
//     if let Err(e) = tx.commit().await {
//         eprintln!("Transaction commit error during deletion: {:?}", e);
//         return HttpResponse::InternalServerError().json(json!({"status": "error", "message": "Failed to commit deletion.", "detail": e.to_string()}));
//     }
//
//     HttpResponse::Ok().json(json!({
//         "status": "success",
//         "message": format!("Course operation '{}' and its associated records deleted successfully.", op_id),
//         "total_rows_deleted": rows_deleted,
//     }))
// }

//
// pub async fn class_by_course_operation(
//     req: web::Json<DeleteCourseOperationRequest>,
//     db: web::Data<PgPool>,
// ) -> impl Responder {
//     let op_id = &req.course_operation_id;
//
//     // 1. Execute SQL query with the new join and faculty name selection
//     let result = sqlx::query!(
//         r#"
//         SELECT
//             cl.id, cl.course_operation_id, cl.class_date, cl.start_time, cl.end_time, cl.room_no,
//             cl.course_master_id, cl.action_by,
//             cl.attendance_status, -- ADDED: Selecting attendance_status from lms_classes
//
//             c.code AS course_code,
//             c.title AS course_title,
//             p.name AS program_name,
//             p.level AS program_level,
//
//             f.name AS faculty_name
//
//         FROM ictcell.lms_classes cl
//         INNER JOIN ictcell.lms_course_operation co ON cl.course_operation_id = co.id
//         INNER JOIN ictcell.lms_course c ON co.course_id = c.id
//         INNER JOIN ictcell.lms_program p ON co.program_id = p.id
//         INNER JOIN ictcell.lms_faculty f ON co.faculty_id = f.id
//
//         WHERE cl.course_operation_id = $1
//         AND cl.domain_status = 1
//         ORDER BY cl.class_date, cl.start_time
//         "#,
//         op_id
//     )
//     .fetch_all(db.get_ref())
//     .await;
//
//     match result {
//         Ok(rows) => {
//             if rows.is_empty() {
//                 return HttpResponse::NotFound().json(json!({
//                     "status": "warning",
//                     "message": format!("No active classes found for Course Operation ID '{}'.", op_id),
//                 }));
//             }
//
//             // 1. Extract Course Info from the FIRST row
//             let first_row = &rows[0];
//
//             // Assuming CourseInfoOutput struct remains the same
//             let course_info = CourseInfoOutput {
//                 course_operation_id: first_row.course_operation_id.clone(),
//                 course_name: Some(first_row.course_title.clone()),
//                 program_name: Some(first_row.program_name.clone()),
//                 course_code: Some(first_row.course_code.clone()),
//                 faculty_name: Some(first_row.faculty_name.clone()),
//             };
//
//             // 2. Map all rows into the ClassDataOutput structure
//             let classes_data: Vec<ClassDataOutput> = rows
//                 .into_iter()
//                 .map(|row| {
//                     ClassDataOutput {
//                         id: row.id,
//                         class_date: row.class_date,
//                         start_time: row.start_time,
//                         end_time: row.end_time,
//                         room_no: row.room_no,
//                         // NEW MAPPING: Assigning the attendance status
//                         attendance_status: row.attendance_status,
//                     }
//                 })
//                 .collect();
//
//             // 3. Construct the final response structure
//             let final_response = FinalResponse {
//                 course_info,
//                 data: classes_data,
//             };
//
//             HttpResponse::Ok().json(json!({
//                 "status": "success",
//                 "total_classes": final_response.data.len(),
//                 "data": final_response,
//             }))
//         },
//         Err(e) => {
//             eprintln!("SQL query execution error: {:?}", e);
//             HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": "Failed to retrieve class schedule and faculty details.",
//                 "detail": e.to_string(),
//             }))
//         }
//     }
// }


pub async fn single_course_operation_info_back(
    req: web::Json<DeleteCourseOperationRequest>,
    db: web::Data<PgPool>,
) -> impl Responder {
    let op_id = &req.course_operation_id;

    // Execute SQL query to fetch course operation details
    let result = sqlx::query!(
        r#"
        SELECT
            co.id,
            co.course_id,
            co.program_id,
            co.faculty_id,
            co.course_year,
            co.course_section,
            co.course_semester,
            co.course_outline,
            co.book_reference,
            c.code AS course_code,
            c.title AS course_title,
            p.name AS program_name,
            p.level AS program_level,
            p.dept_id AS department_id,
            f.name AS faculty_name,
            d.name as department_name
        FROM ictcell.lms_course_operation co
        INNER JOIN ictcell.lms_course c ON co.course_id = c.id
        INNER JOIN ictcell.lms_program p ON co.program_id = p.id
        INNER JOIN ictcell.lms_department d ON p.dept_id = d.id
        INNER JOIN ictcell.lms_faculty f ON co.faculty_id = f.id
        WHERE co.id = $1
        "#,
        op_id
    )
    .fetch_optional(db.get_ref())
    .await;

    match result {
        Ok(Some(row)) => {
            let course_info = SingleCourseInfoOutput {
                course_operation_id: row.id.clone(),
                course_year: row.course_year.clone(),
                course_semester: row.course_semester.clone(),
                course_section: row.course_section.clone(),
                course_id: row.course_id.clone(),
                program_id: row.program_id.clone(),
                dept_id: row.department_id.clone(),
                department_name: Some(row.department_name.clone()),
                course_name: Some(row.course_title.clone()),
                program_name: Some(row.program_name.clone()),
                course_code: Some(row.course_code.clone()),
                faculty_name: Some(row.faculty_name.clone()),
                course_outline: row.course_outline.clone(),
                book_reference: row.book_reference.clone(),
            };


            let final_response = FinalResponseCourseOperation {
                data: course_info,
            };
            HttpResponse::Ok().json(json!({
                "status": "success",
                "data": final_response,
            }))
        },
        Ok(None) => {
            HttpResponse::NotFound().json(json!({
                "status": "warning",
                "message": format!("No course operation found with ID '{}'.", op_id),
            }))
        },
        Err(e) => {
            eprintln!("SQL query execution error: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": "Failed to retrieve course operation details.",
                "detail": e.to_string(),
            }))
        }
    }
}

pub async fn single_course_operation_info ( db: web::Data<PgPool>, req: web::Json<DeleteCourseOperationRequest>, ) -> impl Responder {

    let result = sqlx::query_scalar::<_, Value>(
        r#"
        SELECT ictcell.course_operation_get_single($1)
        "#,
    )
        .bind(&req.course_operation_id)
        .fetch_one(db.get_ref())
        .await;

    match result {
        Ok(json) => HttpResponse::Ok().json(json),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

// pub async fn delete_class(
//     req: web::Json<DeleteClassRequest>,
//     db: web::Data<PgPool>,
// ) -> impl Responder {
//     let class_id = &req.class_id;
//
//     // Use sqlx::query! to perform the UPDATE operation
//     let result = sqlx::query!(
//         r#"
//         UPDATE ictcell.lms_classes
//         SET domain_status = 0
//         WHERE id = $1
//         "#,
//         class_id
//     )
//     .execute(db.get_ref())
//     .await;
//
//     match result {
//         Ok(query_result) => {
//             let rows_affected = query_result.rows_affected();
//
//             if rows_affected == 0 {
//                 HttpResponse::NotFound().json(json!({
//                     "status": "error",
//                     "message": format!("Class ID '{}' not found in the database.", class_id),
//                 }))
//             } else {
//                 HttpResponse::Ok().json(json!({
//                     "status": "success",
//                     "message": format!("Successfully soft-deleted class with ID '{}'. Domain status updated to 0.", class_id),
//                     "rows_affected": rows_affected,
//                 }))
//             }
//         },
//         Err(e) => {
//             eprintln!("Database error during soft-delete: {:?}", e);
//             HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": "Failed to perform soft-delete operation due to a database error.",
//                 "detail": e.to_string(),
//             }))
//         }
//     }
// }

// pub async fn course_operation_info(
//     req: web::Json<DeleteCourseOperationRequest>,
//     db: web::Data<PgPool>,
// ) -> impl Responder {
//     let op_id = &req.course_operation_id;
//
//     let result = sqlx::query!(
//         r#"
//         SELECT
//             co.id AS course_operation_id,
//             co.course_id,
//             co.program_id,
//             co.faculty_id,
//             co.start_date AS co_start_date,
//             co.end_date AS co_end_date,
//
//             cm.start_date AS cm_start_date,
//             cm.end_date AS cm_end_date,
//             cm.class_configuration,
//             cm.domain_status
//
//         FROM ictcell.lms_course_operation co
//         INNER JOIN ictcell.lms_class_master cm
//             ON co.id = cm.course_operation_id
//         WHERE co.id = $1
//         "#,
//         op_id
//     )
//     .fetch_optional(db.get_ref())
//     .await;
//
//     match result {
//         Ok(Some(row)) => {
//             // Manual mapping to the final struct
//             let info = CourseOperationInfo {
//                 course_operation_id: row.course_operation_id,
//                 course_id: row.course_id,
//                 program_id: row.program_id,
//
//                 // FIX 1: Wrap the inferred String in Some()
//                 faculty_id: Some(row.faculty_id),
//
//                 co_start_date: row.co_start_date,
//                 co_end_date: row.co_end_date,
//                 cm_start_date: row.cm_start_date,
//                 cm_end_date: row.cm_end_date,
//
//                 // FIX 2 & 3: Direct assignment, relying on the struct update
//                 class_configuration: row.class_configuration,
//                 domain_status: row.domain_status,
//             };
//
//             HttpResponse::Ok().json(json!({
//                 "status": "success",
//                 "data": info,
//             }))
//         }
//         Ok(None) => {
//             HttpResponse::NotFound().json(json!({
//                 "status": "warning",
//                 "message": format!("Course Operation ID '{}' not found or has no associated class master record.", op_id),
//             }))
//         }
//         Err(e) => {
//             eprintln!("Database error: {:?}", e);
//             HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": "Failed to retrieve course operation info.",
//                 "detail": e.to_string(),
//             }))
//         }
//     }
// }

// pub async fn get_class(
//     req: web::Json<GetClassRequest>,
//     db: web::Data<PgPool>,
// ) -> impl Responder {
//     let class_id = &req.class_id;
//
//     let result = sqlx::query!(
//         r#"
//         SELECT
//             cl.id,
//             cl.course_operation_id,
//             cl.class_date,
//             cl.start_time,
//             cl.end_time,
//             cl.room_no,
//             cl.course_master_id,
//             cl.action_by,
//             cl.domain_status,
//             cl.attendance_status, -- Selecting the new field (Assumption: exists on lms_classes)
//
//             co.course_id AS course_id,
//             co.program_id AS program_id,
//
//             c.code AS course_code,
//             c.title AS course_title,
//             p.name AS program_name,
//             p.level AS program_level
//
//         FROM ictcell.lms_classes cl
//         INNER JOIN ictcell.lms_course_operation co ON cl.course_operation_id = co.id
//         INNER JOIN ictcell.lms_course c ON co.course_id = c.id
//         INNER JOIN ictcell.lms_program p ON co.program_id = p.id
//
//         WHERE cl.id = $1
//         "#,
//         class_id
//     )
//     .fetch_optional(db.get_ref())
//     .await;
//
//     match result {
//         Ok(Some(row)) => {
//             let class_info = ClassOutput {
//                 // Fields from lms_classes (cl)
//                 id: row.id,
//                 course_operation_id: row.course_operation_id,
//                 class_date: row.class_date,
//                 start_time: row.start_time,
//                 end_time: row.end_time,
//                 room_no: row.room_no,
//
//                 // String/ID fields requiring Some() wrapping
//                 course_master_id: Some(row.course_master_id),
//                 action_by: row.action_by,
//
//                 // Status fields (Option<i16>)
//                 domain_status: row.domain_status,
//                 attendance_status: row.attendance_status, // Mapping the new field
//
//                 // Course and Program IDs (Inferred as String)
//                 course_id: row.course_id,
//                 program_id: row.program_id,
//
//                 // Fields from Joins
//                 course_code: Some(row.course_code),
//                 course_title: Some(row.course_title),
//                 program_name: Some(row.program_name),
//                 program_level: row.program_level, // Direct assignment (Option<String>)
//             };
//
//             HttpResponse::Ok().json(json!({
//                 "status": "success",
//                 "data": class_info,
//             }))
//         }
//         Ok(None) => {
//             HttpResponse::NotFound().json(json!({
//                 "status": "warning",
//                 "message": format!("Class ID '{}' not found or is missing associated course/program data.", class_id),
//             }))
//         }
//         Err(e) => {
//             eprintln!("Database error: {:?}", e);
//             HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": "Failed to retrieve class information and associated details.",
//                 "detail": e.to_string(),
//             }))
//         }
//     }
// }

pub async fn student_by_course_operation_id(
    req: web::Json<DeleteCourseOperationRequest>,
    db: web::Data<PgPool>,
) -> impl Responder {
    let op_id = &req.course_operation_id;

    // Execute query joining only lms_course_student and lms_student
    let result = sqlx::query!(
        r#"
        SELECT
            cs.course_operation_id,
            cs.std_id AS student_id, 
            s.name AS student_name,
            s.reg_no,
            s.roll_no
        FROM ictcell.lms_course_student cs
        -- Join lms_course_student to lms_student on the correct foreign key (std_id)
        INNER JOIN ictcell.lms_student s ON cs.std_id = s.id 
        
        -- Filter by the provided course_operation_id
        WHERE cs.course_operation_id = $1
        AND cs.domain_status = 1
        ORDER BY s.roll_no
        "#,
        op_id
    )
    .fetch_all(db.get_ref())
    .await;

    match result {
        Ok(rows) => {
            if rows.is_empty() {
                return HttpResponse::NotFound().json(json!({
                    "status": "warning",
                    "message": format!("No active students found for Course Operation ID '{}'.", op_id),
                }));
            }

            // Map all rows into the StudentInfoOutput structure
            let student_list: Vec<StudentInfoOutput> = rows
                .into_iter()
                .map(|row| {
                    StudentInfoOutput {
                        // Keys
                        course_operation_id: row.course_operation_id,
                        student_id: row.student_id, 

                        // Student Details (Wrapped in Some() as required by compiler)
                        name: Some(row.student_name),
                        reg_no: Some(row.reg_no),
                        roll_no: Some(row.roll_no),
                    }
                })
                .collect();
            
            HttpResponse::Ok().json(json!({
                "status": "success",
                "total_students": student_list.len(),
                "data": student_list,
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": "Failed to retrieve student information due to a database error.",
                "detail": e.to_string(),
            }))
        }
    }
}

// pub async fn update_class(
//     req: web::Json<UpdateClassRequest>,
//     db: web::Data<PgPool>,
// ) -> impl Responder {
//     let class_id = &req.class_id;
//     let class_date = req.class_date;
//     let start_time = req.class_start_time;
//     let end_time = req.class_end_time;
//     let room_no = &req.room;
//
//     // Use sqlx::query! to perform the UPDATE operation
//     let result = sqlx::query!(
//         r#"
//         UPDATE ictcell.lms_classes
//         SET
//             class_date = $2,
//             start_time = $3,
//             end_time = $4,
//             room_no = $5
//         WHERE id = $1
//         "#,
//         class_id,
//         class_date,
//         start_time,
//         end_time,
//         room_no
//     )
//     .execute(db.get_ref())
//     .await;
//
//     match result {
//         Ok(query_result) => {
//             let rows_affected = query_result.rows_affected();
//
//             if rows_affected == 0 {
//                 HttpResponse::NotFound().json(json!({
//                     "status": "warning",
//                     "message": format!("Class ID '{}' not found. No records updated.", class_id),
//                 }))
//             } else {
//                 HttpResponse::Ok().json(json!({
//                     "status": "success",
//                     "message": format!("Successfully updated class with ID '{}'.", class_id),
//                     "rows_affected": rows_affected,
//                 }))
//             }
//         },
//         Err(e) => {
//             eprintln!("Database error during class update: {:?}", e);
//             HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": "Failed to update class information due to a database error.",
//                 "detail": e.to_string(),
//             }))
//         }
//     }
// }

pub async fn delete_student_from_course_operation(
    req: web::Json<DeleteStudentCourseRequest>,
    db: web::Data<PgPool>,
) -> impl Responder {
    let std_id = &req.std_id;
    let course_operation_id = &req.course_operation_id;

    // Perform a soft delete: update domain_status to 0
    let result = sqlx::query!(
        r#"
        UPDATE ictcell.lms_course_student
        SET domain_status = 0
        WHERE std_id = $1 AND course_operation_id = $2
        "#,
        std_id,
        course_operation_id
    )
    .execute(db.get_ref())
    .await;

    match result {
        Ok(query_result) => {
            let rows_affected = query_result.rows_affected();

            if rows_affected == 0 {
                HttpResponse::NotFound().json(json!({
                    "status": "warning",
                    "message": format!(
                        "Student ID '{}' not found in course operation '{}' or already soft-deleted.", 
                        std_id, course_operation_id
                    ),
                }))
            } else {
                HttpResponse::Ok().json(json!({
                    "status": "success",
                    "message": format!(
                        "Successfully soft-deleted student '{}' from course operation '{}'. Domain status updated to 0.", 
                        std_id, course_operation_id
                    ),
                    "rows_affected": rows_affected,
                }))
            }
        },
        Err(e) => {
            eprintln!("Database error during student soft-delete: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": "Failed to perform soft-delete operation due to a database error.",
                "detail": e.to_string(),
            }))
        }
    }
}

pub async fn update_course_outline(
    req: web::Json<UpdateCourseOutlineRequest>,
    db: web::Data<PgPool>,
) -> impl Responder {
    let course_operation_id = &req.course_operation_id;
    let course_outline = &req.course_outline;

    // Use sqlx::query! to perform the UPDATE operation
    let result = sqlx::query!(
        r#"
        UPDATE ictcell.lms_course_operation
        SET 
            course_outline = $2
        WHERE id = $1
        "#,
        course_operation_id,
        course_outline
    )
    .execute(db.get_ref())
    .await;

    match result {
        Ok(query_result) => {
            let rows_affected = query_result.rows_affected();

            if rows_affected == 0 {
                HttpResponse::NotFound().json(json!({
                    "status": "warning",
                    "message": format!("Course Operation ID '{}' not found. No records updated.", course_operation_id),
                }))
            } else {
                HttpResponse::Ok().json(json!({
                    "status": "success",
                    "message": format!("Successfully updated course outline for ID '{}'.", course_operation_id),
                    "rows_affected": rows_affected,
                }))
            }
        },
        Err(e) => {
            eprintln!("Database error during course outline update: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": "Failed to update course outline due to a database error.",
                "detail": e.to_string(),
            }))
        }
    }
}

pub async fn update_book_reference(
    req: web::Json<UpdateBookReferenceRequest>,
    db: web::Data<PgPool>,
) -> impl Responder {
    let course_operation_id = &req.course_operation_id;
    // Convert JSON to string
    let book_reference_str = match serde_json::to_string(&req.book_reference) {
        Ok(v) => v,
        Err(_) => {
            return HttpResponse::BadRequest().json(json!({
                "status": "error",
                "message": "Invalid JSON format for book_reference"
            }));
        }
    };


    // Use sqlx::query! to perform the UPDATE operation
    let result = sqlx::query!(
        r#"
        UPDATE ictcell.lms_course_operation
        SET
            book_reference = $2
        WHERE id = $1
        "#,
        course_operation_id,
        book_reference_str
    )
        .execute(db.get_ref())
        .await;

    match result {
        Ok(query_result) => {
            let rows_affected = query_result.rows_affected();

            if rows_affected == 0 {
                HttpResponse::NotFound().json(json!({
                    "status": "warning",
                    "message": format!("Course Operation ID '{}' not found. No records updated.", course_operation_id),
                }))
            } else {
                HttpResponse::Ok().json(json!({
                    "status": "success",
                    "message": format!("Successfully updated book reference for ID '{}'.", course_operation_id),
                    "rows_affected": rows_affected,
                }))
            }
        },
        Err(e) => {
            eprintln!("Database error during course outline update: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": "Failed to update book reference due to a database error.",
                "detail": e.to_string(),
            }))
        }
    }
}

// pub async fn get_plo_by_program(
//     req: web::Json<GetPloByProgramRequest>,
//     db: web::Data<PgPool>,
// ) -> impl Responder {
//     let program_id = &req.program_id;
//
//     let result = sqlx::query!(
//         r#"
//         SELECT
//             id,
//             sl,
//             statement,
//             domain_status,
//             program_id
//         FROM ictcell.lms_program_plo
//         WHERE program_id = $1
//         AND domain_status = 1
//         ORDER BY sl
//         "#,
//         program_id
//     )
//     .fetch_all(db.get_ref())
//     .await;
//
//     match result {
//         Ok(rows) => {
//             if rows.is_empty() {
//                 return HttpResponse::NotFound().json(json!({
//                     "status": "warning",
//                     "message": format!("No active PLOs found for Program ID '{}'.", program_id),
//                 }));
//             }
//
//             // Map all rows into the ProgramPloOutput structure
//             let plo_list: Vec<ProgramPloOutput> = rows
//                 .into_iter()
//                 .map(|row| {
//                     ProgramPloOutput {
//                         id: row.id,
//                         program_id: row.program_id,
//
//                         sl: row.sl,
//                         // FIX: Wrap the inferred non-optional String in Some()
//                         statement: Some(row.statement),
//                         domain_status: row.domain_status,
//                     }
//                 })
//                 .collect();
//
//             HttpResponse::Ok().json(json!({
//                 "status": "success",
//                 "total_plos": plo_list.len(),
//                 "data": plo_list,
//             }))
//         }
//         Err(e) => {
//             eprintln!("Database error during PLO retrieval: {:?}", e);
//             HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": "Failed to retrieve Program Learning Outcomes.",
//                 "detail": e.to_string(),
//             }))
//         }
//     }
// }

// pub async fn save_clo(
//     req: web::Json<SaveCloRequest>,
//     db: web::Data<PgPool>,
// ) -> impl Responder {
//     // Start the transaction
//     let mut transaction = match db.begin().await {
//         Ok(t) => t,
//         Err(e) => {
//             eprintln!("Failed to start transaction: {:?}", e);
//             return HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": "Failed to start database transaction.",
//             }));
//         }
//     };
//
//     // --- 1. Insert into lms_course_clo and get the new ID (clo_id) ---
//
//     let clo_insert_result = sqlx::query!(
//         r#"
//         INSERT INTO ictcell.lms_course_clo (
//             sl,
//             statement,
//             course_operation_id,
//             domain_status
//         )
//         VALUES ($1, $2, $3, 1)
//         RETURNING id
//         "#,
//         req.sl, // Now expected to be i32
//         req.statement,
//         req.course_operation_id
//     )
//     .fetch_one(&mut *transaction)
//     .await;
//
//     let clo_id: String;
//     match clo_insert_result {
//         Ok(row) => clo_id = row.id,
//         Err(e) => {
//             eprintln!("Error inserting CLO: {:?}", e);
//             let _ = transaction.rollback().await;
//             return HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": "Failed to save Course Learning Outcome (CLO).",
//                 "detail": e.to_string(),
//             }));
//         }
//     }
//
//     // --- 2. Insert into lms_plo_clo_mapping for each plo_id ---
//     let mut mapping_count = 0;
//     for plo_id in &req.plo_ids {
//         // Generate a new UUID for the mapping table's primary key (id)
//         let mapping_id = Uuid::new_v4().to_string();
//
//         let mapping_result = sqlx::query!(
//             r#"
//             INSERT INTO ictcell.lms_plo_clo_mapping (
//                 id,
//                 plo_id,
//                 clo_id,
//                 domain_status
//             )
//             VALUES ($1, $2, $3, 1)
//             "#,
//             mapping_id,
//             plo_id,
//             clo_id
//         )
//         .execute(&mut *transaction)
//         .await;
//
//         if let Err(e) = mapping_result {
//             eprintln!("Error inserting PLO-CLO mapping for PLO ID '{}': {:?}", plo_id, e);
//             let _ = transaction.rollback().await;
//             return HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": format!("Failed to save PLO-CLO mapping for PLO ID: {}", plo_id),
//                 "detail": e.to_string(),
//             }));
//         }
//         mapping_count += 1;
//     }
//
//     // --- 3. Commit the transaction ---
//     if let Err(e) = transaction.commit().await {
//         eprintln!("Error committing transaction: {:?}", e);
//         return HttpResponse::InternalServerError().json(json!({
//             "status": "error",
//             "message": "Failed to commit changes to the database.",
//             "detail": e.to_string(),
//         }));
//     }
//
//     // --- Success Response ---
//     HttpResponse::Created().json(json!({
//         "status": "success",
//         "message": "CLO and associated PLO mappings saved successfully.",
//         "clo_id": clo_id,
//         "mappings_created": mapping_count,
//     }))
// }

// pub async fn list_of_clo(
//     req: web::Json<CourseOperationIdRequest>,
//     db: web::Data<PgPool>,
// ) -> impl Responder {
//     let course_operation_id = &req.course_operation_id;
//
//     let result = sqlx::query!(
//         r#"
//         SELECT
//             id,
//             sl,
//             statement,
//             course_operation_id,
//             domain_status
//         FROM ictcell.lms_course_clo
//         WHERE course_operation_id = $1
//         AND domain_status = 1 -- Filter for active records
//         ORDER BY sl
//         "#,
//         course_operation_id
//     )
//     .fetch_all(db.get_ref())
//     .await;
//
//     match result {
//         Ok(rows) => {
//             if rows.is_empty() {
//                 return HttpResponse::NotFound().json(json!({
//                     "status": "warning",
//                     "message": format!("No active CLOs found for Course Operation ID '{}'.", course_operation_id),
//                 }));
//             }
//
//             // Map all rows into the CloOutput structure
//             let clo_list: Vec<CloOutput> = rows
//                 .into_iter()
//                 .map(|row| {
//                     CloOutput {
//                         // Assuming these are NOT NULL based on schema keys
//                         id: row.id,
//                         course_operation_id: row.course_operation_id,
//
//                         // Fields that are Option<T> or need to be wrapped (sl is int4, statement is varchar)
//                         sl: row.sl,
//                         // Based on past errors, statement is inferred as NOT NULL String, so we wrap it
//                         statement: Some(row.statement),
//                         domain_status: row.domain_status,
//                     }
//                 })
//                 .collect();
//
//             HttpResponse::Ok().json(json!({
//                 "status": "success",
//                 "total_clos": clo_list.len(),
//                 "data": clo_list,
//             }))
//         }
//         Err(e) => {
//             eprintln!("Database error during CLO retrieval: {:?}", e);
//             HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": "Failed to retrieve Course Learning Outcomes.",
//                 "detail": e.to_string(),
//             }))
//         }
//     }
// }

// pub async fn delete_clo(
//     req: web::Json<DeleteCloRequest>,
//     db: web::Data<PgPool>,
// ) -> impl Responder {
//     let clo_id = &req.clo_id;
//
//     // Start the transaction
//     let mut transaction = match db.begin().await {
//         Ok(t) => t,
//         Err(e) => {
//             eprintln!("Failed to start transaction: {:?}", e);
//             return HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": "Failed to start database transaction.",
//             }));
//         }
//     };
//
//     // --- 1. Soft Delete the CLO record ---
//     let clo_delete_result = sqlx::query!(
//         r#"
//         UPDATE ictcell.lms_course_clo
//         SET domain_status = 0
//         WHERE id = $1 AND domain_status = 1
//         "#,
//         clo_id
//     )
//     .execute(&mut *transaction)
//     .await;
//
//     let rows_affected_clo: u64;
//     match clo_delete_result {
//         Ok(res) => {
//             rows_affected_clo = res.rows_affected();
//             if rows_affected_clo == 0 {
//                 let _ = transaction.rollback().await;
//                 // It's possible the record was not found or already deleted
//                 return HttpResponse::NotFound().json(json!({
//                     "status": "warning",
//                     "message": format!("CLO ID '{}' not found or already deleted (domain_status != 1).", clo_id),
//                 }));
//             }
//         },
//         Err(e) => {
//             eprintln!("Error soft deleting CLO: {:?}", e);
//             let _ = transaction.rollback().await;
//             return HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": "Failed to soft delete Course Learning Outcome (CLO).",
//                 "detail": e.to_string(),
//             }));
//         }
//     }
//
//     // --- 2. Soft Delete the associated PLO-CLO Mapping records ---
//     let mapping_delete_result = sqlx::query!(
//         r#"
//         UPDATE ictcell.lms_plo_clo_mapping
//         SET domain_status = 0
//         WHERE clo_id = $1 AND domain_status = 1
//         "#,
//         clo_id
//     )
//     .execute(&mut *transaction)
//     .await;
//
//     let rows_affected_mapping: u64;
//     match mapping_delete_result {
//         Ok(res) => {
//             rows_affected_mapping = res.rows_affected();
//         },
//         Err(e) => {
//             eprintln!("Error soft deleting PLO-CLO mappings: {:?}", e);
//             let _ = transaction.rollback().await;
//             return HttpResponse::InternalServerError().json(json!({
//                 "status": "error",
//                 "message": "Failed to soft delete associated PLO-CLO mappings.",
//                 "detail": e.to_string(),
//             }));
//         }
//     }
//
//     // --- 3. Commit the transaction ---
//     if let Err(e) = transaction.commit().await {
//         eprintln!("Error committing transaction: {:?}", e);
//         return HttpResponse::InternalServerError().json(json!({
//             "status": "error",
//             "message": "Failed to commit changes to the database.",
//             "detail": e.to_string(),
//         }));
//     }
//
//     // --- Success Response ---
//     HttpResponse::Ok().json(json!({
//         "status": "success",
//         "message": format!("Successfully soft-deleted CLO ID '{}'.", clo_id),
//         "clo_rows_affected": rows_affected_clo,
//         "mapping_rows_affected": rows_affected_mapping,
//     }))
// }

pub async fn get_course_students(
    db: web::Data<PgPool>,
    req: web::Json<CourseStudentRequest>,
) -> impl Responder {
    // Note: We use course_section in the WHERE clause to match your DB schema
    let query_result = sqlx::query(
        r#"
        SELECT s.* FROM ictcell.lms_course_operation co
        JOIN ictcell.lms_course_student cs ON co.id = cs.course_operation_id
        JOIN ictcell.lms_student s ON cs.std_id = s.id
        WHERE co.course_id = $1 AND co.course_section = $2
        "#
    )
    .bind(&req.course_id)
    .bind(req.course_section_id) // No & needed for i32 as it implements Copy
    .fetch_all(db.get_ref())
    .await;

    match query_result {
        Ok(rows) => {
            let mut student_list = Vec::new();

            for row in rows {
                let mut map = Map::new();
                
                for (i, column) in row.columns().iter().enumerate() {
                    let name = column.name();
                    
                    // Attempting to extract value dynamically. 
                    // This handles Strings, Uuids, and Integers found in the student table.
                    let value = row.try_get::<String, usize>(i)
                        .map(|s| json!(s))
                        .unwrap_or_else(|_| {
                            row.try_get::<Uuid, usize>(i)
                                .map(|u| json!(u.to_string()))
                                .unwrap_or_else(|_| {
                                    row.try_get::<i32, usize>(i)
                                        .map(|i| json!(i))
                                        .unwrap_or(Value::Null)
                                })
                        });

                    map.insert(name.to_string(), value);
                }
                student_list.push(Value::Object(map));
            }

            HttpResponse::Ok().json(student_list)
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(format!("Database error: {}", e))
        }
    }
}
// --- Configuration Function ---

/// Function to configure and register department and program routes
pub fn department_routes(cfg: &mut web::ServiceConfig) {
    // Registers the store_course_operation handler (POST /store_course_operation)
    cfg.route(
        "/store_course_operation",
        web::post().to(store_course_operation)
    );

    // cfg.route(
    //     "/delete_course_operation",
    //     web::post().to(delete_course_operation)
    // );

    // cfg.route(
    //     "/class_by_course_operation",
    //     web::post().to(class_by_course_operation)
    // );

    cfg.route(
            "/single_course_operation_info",
            web::post().to(single_course_operation_info)
        );

    //  cfg.route(
    //     "/delete_class",
    //     web::post().to(delete_class)
    // );

    // cfg.route(
    //     "/course_operation_info",
    //     web::post().to(course_operation_info)
    // );

    //  cfg.route(
    //     "/get_class",
    //     web::post().to(get_class)
    // );

    cfg.route(
        "/student_by_course_operation_id",
        web::post().to(student_by_course_operation_id)
    );

    // cfg.route(
    //     "/update_class",
    //     web::post().to(update_class)
    // );

    cfg.route(
        "/delete_student_from_course_operation",
        web::delete().to(delete_student_from_course_operation)
    );

    cfg.route(
        "/update_course_outline",
        web::post().to(update_course_outline)
    );

    cfg.route(
        "/update_book_reference",
        web::post().to(update_book_reference)
    );

    // cfg.route(
    //     "/store_course_class",
    //     web::post().to(store_course_class)
    // );

    // cfg.route(
    //     "/get_plo_by_program",
    //     web::post().to(get_plo_by_program)
    // );
    //
    // cfg.route(
    //     "/save_clo",
    //     web::post().to(save_clo)
    // );
    //
    // cfg.route(
    //     "/list_of_clo",
    //     web::post().to(list_of_clo)
    // );
    //
    // cfg.route(
    //     "/delete_clo",
    //     web::post().to(delete_clo)
    // );

    cfg.route(
        "/get_course_students",
        web::post().to(get_course_students)
    );


    

    cfg.service(
        web::scope("/department")
            // Registers the get_departments handler (POST /department/list)
            .route("/list", web::post().to(get_departments)) 
            
            // Registers the get_programs_by_department handler (POST /department/program_list)
            .route("/program_list", web::post().to(get_programs_by_department))
    );
}