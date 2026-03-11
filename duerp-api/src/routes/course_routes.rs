use crate::routes::attendance_routes::AttendanceFetchRequest;
use crate::utils::jwt::get_session_id;
use actix_web::{web, HttpRequest, HttpResponse, Responder};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::PgPool;

#[derive(Debug, Serialize)]
pub struct Course {
    pub id: String,
    pub code: String,
    pub title: String,
}

#[derive(Deserialize)]
pub struct ProgramRequest {
    pub program_id: String,
}

#[derive(Serialize)]
pub struct CourseOperation {
    pub id: String,
    pub course_id: String,
    pub course_code: String,
    pub program_id: String,
    pub faculty_id: String,
    pub start_date: Option<chrono::NaiveDate>,
    pub end_date: Option<chrono::NaiveDate>,
    pub course_year: Option<i32>,
    pub course_section: Option<i32>,
    pub course_semester: Option<String>,
    pub course_title: Option<String>,
    pub program_name: Option<String>,
    pub department_name: Option<String>,
}

#[derive(Deserialize)]
pub struct FacultyRequest {
    pub faculty_id: String
}


#[derive(Debug, Deserialize)]
pub struct CourseStudentRequest {
    pub std_id: String,
    pub course_operation_id: String,
    pub roll_no: Option<String>,
    pub domain_status: Option<i32>,     // optional
    pub action_by: Option<String>,
}

#[derive(Deserialize)]
pub struct CourseOperationRequest {
    pub course_operation_id: String,
}

#[derive(Serialize)]
pub struct CourseStudent {
    pub std_id: String,
    pub roll_no: Option<String>,
    pub name: String,
    pub reg_no: String,
}

#[derive(Serialize, Deserialize)]
pub struct CourseStudentBulkRequest {
    pub course_operation_id: String,
    pub students: Vec<StudentItem>,
}

#[derive(Serialize, Deserialize)]
pub struct StudentItem {
    pub std_id: String,      // better as String
    pub roll_no: String,
}


#[derive(Serialize, Deserialize)]
pub struct CourseStudentDeleteBulkRequest {
    pub course_operation_id: String,
    pub students: Vec<StudentDeleteItem>,
}

#[derive(Serialize, Deserialize)]
pub struct StudentDeleteItem {
    pub std_id: String,
}

#[derive(Deserialize)]
pub struct UpdateCourseRoutineRequest {
    pub course_operation_id: String,
    pub selected_days: Vec<SelectedDay>,
}

#[derive(Serialize, Deserialize)]
pub struct SelectedDay {
    pub day: String,
    pub start_time: String,
    pub end_time: String,
    pub room: String,
}

pub async fn get_courses_by_program(
    db: web::Data<PgPool>,
    req: web::Json<ProgramRequest>,
) -> impl Responder {
    let courses = sqlx::query_as!(
        Course,
        r#"
        SELECT
            c.id,
            c.code,
            c.title
        FROM ictcell.lms_course_program cp
        INNER JOIN ictcell.lms_course c
                ON cp.course_id = c.id
        WHERE cp.program_id = $1
        order by c.code
        "#,
        req.program_id,
    )
    .fetch_all(db.get_ref())
    .await;

    match courses {
        Ok(list) => HttpResponse::Ok().json(list),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

pub async fn get_course_operations_by_faculty(
    db: web::Data<PgPool>,
    req: web::Json<FacultyRequest>,
) -> impl Responder {
    let rows = sqlx::query_as!(
        CourseOperation,
        r#"
        SELECT
            op.id,
            op.course_id,
            op.program_id,
            op.faculty_id,
            op.start_date,
            op.end_date,
            op.course_year,
            op.course_section,
            op.course_semester,
            c.title AS course_title,
            p.name AS program_name,
            ld.name as department_name,
            c.code as course_code
        FROM ictcell.lms_course_operation op
        INNER JOIN ictcell.lms_course c ON op.course_id = c.id
        INNER JOIN ictcell.lms_program p ON op.program_id = p.id
        INNER JOIN  ictcell.lms_faculty lf on op.faculty_id = lf.id
        INNER JOIN ictcell.lms_faculty_dept lfd on lfd.faculty_id = lf.id
        INNER JOIN ictcell.lms_department ld on lfd.dept_id = ld.id
        WHERE lf.emp_id = $1 AND op.domain_status=1 AND op.end_date > NOW()
        order by course_code
        "#,
        req.faculty_id
    )
        .fetch_all(db.get_ref())
        .await;

    match rows {
        Ok(list) => HttpResponse::Ok().json(list),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}


pub async fn store_course_student(
    db: web::Data<PgPool>,
    req: web::Json<CourseStudentRequest>,
    req_head: HttpRequest,
    auth: BearerAuth,
) -> impl Responder {
    let client_ip = req_head
        .connection_info()
        .realip_remote_addr()
        .unwrap_or("0.0.0.0")
        .to_string();

    // Extract user/teacher id from JWT
    let user_id = match get_session_id(auth.token()) {
        Ok(sid) => sid as i64,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(json!({ "error": "Invalid or expired token" }));
        }
    };

    // STEP 1: Check for existing record
    let existing = sqlx::query!(
        r#"
        SELECT domain_status
        FROM ictcell.lms_course_student
        WHERE std_id = $1 AND course_operation_id = $2
        "#,
        req.std_id,
        req.course_operation_id
    )
        .fetch_optional(db.get_ref())
        .await;

    let existing = match existing {
        Ok(row) => row,
        Err(e) => {
            return HttpResponse::InternalServerError()
                .json(json!({ "error": format!("DB read error: {}", e) }));
        }
    };

    // STEP 2: Decision logic
    match existing {
        // CASE A: No record → INSERT new
        None => {
            let result = sqlx::query!(
                r#"
                INSERT INTO ictcell.lms_course_student
                    (std_id, course_operation_id, roll_no, domain_status, action_ip, action_by)
                VALUES
                    ($1, $2, $3, 1, $4, $5)
                "#,
                req.std_id,
                req.course_operation_id,
                req.roll_no,
                client_ip,
                user_id.to_string()
            )
                .execute(db.get_ref())
                .await;

            return match result {
                Ok(_) => HttpResponse::Ok().json(json!({
                    "status": "success",
                    "message": "Student added to course operation"
                })),
                Err(e) => HttpResponse::InternalServerError().json(e.to_string()),
            };
        }

        // CASE B: Exists but soft-deleted → UPDATE domain_status back to 1
        Some(row) if row.domain_status == Some(0) => {
            let update = sqlx::query!(
                r#"
                UPDATE ictcell.lms_course_student
                SET domain_status = 1,
                    roll_no = $3,
                    action_ip = $4,
                    action_by = $5
                WHERE std_id = $1 AND course_operation_id = $2
                "#,
                req.std_id,
                req.course_operation_id,
                req.roll_no,
                client_ip,
                user_id.to_string()
            )
                .execute(db.get_ref())
                .await;

            return match update {
                Ok(_) => HttpResponse::Ok().json(json!({
                    "status": "success",
                    "message": "Previously deleted student restored"
                })),
                Err(e) => HttpResponse::InternalServerError().json(e.to_string()),
            };
        }

        // CASE C: Exists and active → Reject
        Some(_) => {
            return HttpResponse::BadRequest().json(json!({
                "status": "error",
                "message": "Student already exists in this course operation"
            }));
        }
    }
}

pub async fn store_course_student_bulk(
    db: web::Data<PgPool>,
    req: web::Json<CourseStudentBulkRequest>,
    req_head: HttpRequest,
    auth: BearerAuth,
) -> impl Responder {

    let client_ip = req_head
        .connection_info()
        .realip_remote_addr()
        .unwrap_or("0.0.0.0")
        .to_string();

    let user_id = match get_session_id(auth.token()) {
        Ok(sid) => sid as i64,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(json!({ "error": "Invalid or expired token" }));
        }
    };

    let course_operation_id = &req.course_operation_id;

    for s in &req.students {
        // 1. Check existing record
        let existing = sqlx::query!(
            r#"
            SELECT domain_status
            FROM ictcell.lms_course_student
            WHERE std_id = $1 AND course_operation_id = $2
            "#,
            s.std_id,
            course_operation_id,
        )
            .fetch_optional(db.get_ref())
            .await;

        match existing {
            Ok(Some(record)) => {
                // Reactivate if domain_status = 0
                if record.domain_status == Some(0) {
                    let _ = sqlx::query!(
                        r#"
                        UPDATE ictcell.lms_course_student
                        SET domain_status = 1,
                            roll_no = $1,
                            action_ip = $2,
                            action_by = $3,
                            action_at = NOW()
                        WHERE std_id = $4 AND course_operation_id = $5
                        "#,
                        s.roll_no,
                        client_ip,
                        user_id.to_string(),
                        s.std_id,
                        course_operation_id,
                    )
                        .execute(db.get_ref())
                        .await;
                }
                // If active, skip
            }

            Ok(None) => {
                // Insert new student
                let _ = sqlx::query!(
                    r#"
                    INSERT INTO ictcell.lms_course_student
                        (std_id, course_operation_id, roll_no, domain_status, action_ip, action_by)
                    VALUES ($1, $2, $3, 1, $4, $5)
                    "#,
                    s.std_id,
                    course_operation_id,
                    s.roll_no,
                    client_ip,
                    user_id.to_string(),
                )
                    .execute(db.get_ref())
                    .await;
            }

            Err(e) => {
                return HttpResponse::InternalServerError()
                    .body(format!("Database error: {}", e));
            }
        }
    }

    HttpResponse::Ok().json(json!({
        "status": "success",
        "message": "Students processed successfully"
    }))
}


pub async fn get_students_by_course_operation(
    db: web::Data<PgPool>,
    req: web::Json<CourseOperationRequest>,
) -> impl Responder {
    let students = sqlx::query_as!(
        CourseStudent,
        r#"
        SELECT
            cs.std_id,
            cs.roll_no,
            s.name,
            s.reg_no
        FROM ictcell.lms_course_student cs
        INNER JOIN ictcell.lms_student s
            ON cs.std_id = s.id
        WHERE  cs.domain_status=1 AND cs.course_operation_id = $1
        "#,
        req.course_operation_id
    )
        .fetch_all(db.get_ref())
        .await;

    match students {
        Ok(list) => HttpResponse::Ok().json(list),
        Err(err) => HttpResponse::InternalServerError().json(err.to_string()),
    }
}


pub async fn delete_course_student_bulk( db: web::Data<PgPool>, req: web::Json<CourseStudentDeleteBulkRequest>, req_head: HttpRequest, auth: BearerAuth, ) -> impl Responder {

    let client_ip = req_head
        .connection_info()
        .realip_remote_addr()
        .unwrap_or("0.0.0.0")
        .to_string();

    let user_id = match get_session_id(auth.token()) {
        Ok(sid) => sid as i64,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(json!({ "error": "Invalid or expired token" }));
        }
    };

    let course_operation_id = &req.course_operation_id;

    let mut deleted = Vec::new();
    let mut not_found = Vec::new();

    for s in &req.students {
        let result = sqlx::query!(
            r#"
            UPDATE ictcell.lms_course_student
            SET domain_status = 0,
                action_ip = $1,
                action_by = $2,
                action_at = NOW()
            WHERE std_id = $3 AND course_operation_id = $4
            "#,
            client_ip,
            user_id.to_string(),
            s.std_id,
            course_operation_id,
        )
            .execute(db.get_ref())
            .await;

        match result {
            Ok(res) => {
                if res.rows_affected() > 0 {
                    deleted.push(s.std_id.clone());
                } else {
                    not_found.push(s.std_id.clone());
                }
            }
            Err(e) => {
                return HttpResponse::InternalServerError()
                    .body(format!("DB error: {}", e));
            }
        }
    }

    HttpResponse::Ok().json(json!({
        "status": "success",
        "deleted_count": deleted.len(),
        "not_found_count": not_found.len(),
        "deleted": deleted,
        "not_found": not_found
    }))
}

pub async fn delete_course_operation_record ( db: web::Data<PgPool>, req: web::Json<AttendanceFetchRequest>, ) -> impl Responder {
    let result = sqlx::query_scalar::<_, Value>(
        r#"
        SELECT ictcell.delete_course_operation_record($1)
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

pub async fn update_course_routine(
    req: web::Json<UpdateCourseRoutineRequest>,
    db: web::Data<PgPool>,
    http_req: HttpRequest,
    auth: BearerAuth,
) -> impl Responder {
    let user_id = match get_session_id(auth.token()) {
        Ok(sid) => sid as i64,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(json!({ "error": "Invalid or expired token" }));
        }
    };


    let client_ip = http_req
        .connection_info()
        .realip_remote_addr()
        .unwrap_or("0.0.0.0")
        .to_string();


    let now = chrono::Utc::now(); // timestamptz expects DateTime<Utc>

    let user_id_str = user_id.to_string();

    let selected_days_json: serde_json::Value =
        match serde_json::to_value(&req.selected_days) {
            Ok(val) => val,
            Err(_) => {
                return HttpResponse::BadRequest().json(json!({
                "status": "error",
                "message": "Invalid selected_days format"
            }));
            }
        };

    let result = sqlx::query!(
    r#"
    SELECT ictcell.course_operation_routine_update(
        $1,
        $2::jsonb,
        $3,
        $4,
        $5
    ) as response
    "#,
    req.course_operation_id,
    selected_days_json,
    now,
    user_id_str,
    client_ip
)
        .fetch_one(db.get_ref())
        .await;

    match result {
        Ok(row) => {
            HttpResponse::Ok().json(json!({
                "status": "success",
                "message": "Course routine updated successfully",
                "db_response": row.response
            }))
        }
        Err(e) => {
            eprintln!("Routine update error: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": "Failed to update routine",
                "detail": e.to_string()
            }))
        }
    }
}

// GROUP ALL ROUTES HERE
pub fn course_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/course")
            .route("/courses-by-program", web::post().to(get_courses_by_program))
            .route("/course-operation-by-faculty", web::post().to(get_course_operations_by_faculty))
            .route("/course-student/store", web::post().to(store_course_student))
            .route("/course-student-bulk/store", web::post().to(store_course_student_bulk))
            .route("/course-student", web::post().to(get_students_by_course_operation))
            .route("/course-student-bulk/delete", web::delete().to(delete_course_student_bulk))
            .route("/course-operation/delete", web::delete().to(delete_course_operation_record))
            .route("/course-routine/update", web::post().to(update_course_routine))
        //              .route("/course-operation/delete", web::post().to(delete_course_operation_record))

    );
}
