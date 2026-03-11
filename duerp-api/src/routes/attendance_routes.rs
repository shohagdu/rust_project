use crate::utils::jwt::get_session_id;
use actix_web::{HttpRequest, HttpResponse, Responder, post, web};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use chrono::{NaiveDate, NaiveTime};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use serde_json::json;
use sqlx::PgPool;

#[derive(Debug, Serialize, Deserialize)]
pub struct AttendanceItem {
    pub std_id: String,
    pub reg_no: Option<String>,
    pub is_present: i16,
}

#[derive(Debug, Deserialize)]
pub struct AttendanceRequest {
    pub course_operation_id: String,
    pub attendance: Vec<AttendanceItem>,
    pub attendance_date: NaiveDate,
    pub start_time: NaiveTime,
    pub end_time: NaiveTime,
    pub remarks: Option<String>,
}

#[derive(Deserialize)]
pub struct AttendanceFetchRequest {
    pub course_operation_id: String,
}

#[derive(Deserialize)]
pub struct AttendanceStudentFetchRequest {
    pub class_id: String,
}

#[derive(Deserialize)]
pub struct AttendanceWithCOIDRequest {
    pub course_operation_id: String,
    pub attendance_date: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct AttendanceRecord {
    pub id: String,
    pub attendance_date: NaiveDate,
    pub attendance_type: Option<String>,
    pub room: Option<String>,
    pub course_operation_id: Option<String>,
    pub start_time: Option<NaiveTime>,
    pub end_time: Option<NaiveTime>,
}

pub async fn update_attendance(
    req: web::Json<AttendanceRequest>,
    db: web::Data<PgPool>,
    auth: BearerAuth,
    req_head: HttpRequest,
) -> impl Responder {

    let user_id = match get_session_id(auth.token()) {
        Ok(sid) => sid.to_string(),
        Err(_) => {
            return HttpResponse::Unauthorized().json(json!({
                "status": "error",
                "message": "Invalid token"
            }));
        }
    };

    let client_ip = req_head
        .connection_info()
        .realip_remote_addr()
        .unwrap_or("0.0.0.0")
        .to_string();

    let attendance_json = match serde_json::to_value(&req.attendance) {
        Ok(v) => v,
        Err(_) => {
            return HttpResponse::BadRequest().json(json!({
                "status": "error",
                "message": "Invalid attendance data"
            }));
        }
    };

    let result = sqlx::query_scalar::<_, serde_json::Value>(
        r#"
        SELECT ictcell.update_attendance_fn(
            $1, $2, $3, $4, $5, $6, $7
        )
        "#
    )
        .bind(&req.course_operation_id)
        .bind(req.attendance_date)
        .bind(req.start_time)
        .bind(req.end_time)
        .bind(&user_id)
        .bind(&client_ip)
        .bind(attendance_json)
        .fetch_one(db.get_ref())
        .await;

    match result {
        Ok(json) => match json.get("status").and_then(|v| v.as_str()) {
            Some("success") => HttpResponse::Ok().json(json),
            Some("error")   => HttpResponse::BadRequest().json(json),
            _ => HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": "Unexpected DB response"
            })),
        },
        Err(err) => {
            eprintln!("DB error: {:?}", err);
            HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": "Database execution failed"
            }))
        }
    }
}


// pub async fn get_attendance(
//     db: web::Data<PgPool>,
//     req: web::Json<AttendanceFetchRequest>,
// ) -> impl Responder {
//     // Fetch class info
//     let class_row = sqlx::query!(
//         r#"
//         SELECT id, attendance_status
//         FROM ictcell.lms_classes
//         WHERE id = $1
//         "#,
//         req.class_id
//     )
//     .fetch_optional(db.get_ref())
//     .await;
//
//     let class = match class_row {
//         Ok(Some(row)) => row,
//         Ok(None) => return HttpResponse::NotFound().json("Class not found"),
//         Err(e) => return HttpResponse::InternalServerError().json(e.to_string()),
//     };
//
//     // Fetch attendance list
//     let attendance_rows = sqlx::query_as!(
//         AttendanceRecord,
//         r#"
//         SELECT
//             id,
//             student_id,
//             is_present,
//             revised_present,
//             remarks
//         FROM ictcell.lms_class_attendance
//         WHERE class_id = $1
//         "#,
//         class.id
//     )
//     .fetch_all(db.get_ref())
//     .await;
//
//     match attendance_rows {
//         Ok(list) => HttpResponse::Ok().json(AttendanceResponse {
//             class_id: class.id,
//             attendance_status: class.attendance_status.unwrap_or(0),
//             attendance: list,
//         }),
//         Err(err) => HttpResponse::InternalServerError().json(err.to_string()),
//     }
// }

pub async fn get_single_course_operation(
    db: web::Data<PgPool>,
    req: web::Json<AttendanceFetchRequest>,
) -> impl Responder {
    let result = sqlx::query_scalar::<_, Value>(
        r#"
        SELECT ictcell.get_single_course_operation($1)
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

pub async fn get_attendance_class(
    db: web::Data<PgPool>,
    req: web::Json<AttendanceFetchRequest>,
) -> impl Responder {
    let result = sqlx::query_scalar::<_, Value>(
        r#"
        SELECT ictcell.get_attendance_class_list_by_co_id($1)
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

pub async fn get_attendance_class_std(
    db: web::Data<PgPool>,
    req: web::Json<AttendanceStudentFetchRequest>,
) -> impl Responder {
    let result = sqlx::query_scalar::<_, Value>(
        r#"
        SELECT ictcell.get_attendance_std_list_by_class_id($1)
        "#,
    )
    .bind(&req.class_id)
    .fetch_one(db.get_ref())
    .await;

    match result {
        Ok(json) => HttpResponse::Ok().json(json),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

pub async fn get_attendance_by_coid(
    db: web::Data<PgPool>,
    req: web::Json<AttendanceWithCOIDRequest>,
) -> impl Responder {

    // ---- Parse Dates ----
    let attendance_date = match NaiveDate::parse_from_str(&req.attendance_date, "%Y-%m-%d") {
        Ok(d) => d,
        Err(_) => return HttpResponse::BadRequest().json(json!({"status": "error", "message": "Invalid start_date format"})),
    };

    let result = sqlx::query_scalar::<_, Value>(
        r#"
        SELECT ictcell.get_attendance_class_list_coId_date($1, $2)
        "#,
    )
        .bind(&req.course_operation_id)
        .bind(attendance_date)
        .fetch_one(db.get_ref())
        .await;

    match result {
        Ok(json) => HttpResponse::Ok().json(json),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

// GROUP ALL ROUTES HERE
pub fn attendance_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/attendance")
            .route("/store_attendance", web::post().to(store_attendance))
            .route("/update_attendance", web::post().to(update_attendance))
            // .route("/get_attendance", web::post().to(get_attendance)),
            .route(
                "/get_single_course_operation",
                web::post().to(get_single_course_operation),
            )
            .route("/get_attendance", web::post().to(get_attendance))
            .route(
                "/get_attendance_class",
                web::post().to(get_attendance_class),
            )
            .route(
                "/get_attendance_class_list",
                web::post().to(get_attendance_by_coid),
            )
            .route(
                "/get_attendance_class_std",
                web::post().to(get_attendance_class_std),
            ),
    );
}

// pub async fn store_attendance( req: web::Json<AttendanceRequest>, db: web::Data<PgPool>, auth: BearerAuth, req_head: HttpRequest, ) -> impl Responder {
//
//     // Start transaction
//     let mut tx = match db.begin().await {
//         Ok(tx) => tx,
//         Err(_) => return HttpResponse::InternalServerError().json("Failed to start transaction"),
//     };
//
//     // Extract teacher_id from JWT
//     let user_id = match get_session_id(auth.token()) {
//         Ok(sid) => sid.to_string(),
//         Err(_) => {
//             return HttpResponse::Unauthorized()
//                 .json(json!({ "error": "Invalid or expired token" }));
//         }
//     };
//
//     // Get client IP
//     let client_ip = req_head
//         .connection_info()
//         .realip_remote_addr()
//         .unwrap_or("0.0.0.0")
//         .to_string();
//
//     // Check duplicate attendance (class_id + date)
//     let duplicate = sqlx::query_scalar!(
//         r#"
//         SELECT id
//         FROM ictcell.lms_class_attendance
//         WHERE class_id = $1
//         LIMIT 1
//         "#,
//         req.class_id.to_string()
//     )
//         .fetch_optional(&mut *tx)
//         .await
//         .unwrap_or(None);
//
//     if duplicate.is_some() {
//         return HttpResponse::BadRequest()
//             .json(json!({ "error": "Attendance already submitted for this class & date" }));
//     }
//
//     // Insert attendance rows
//     for item in &req.attendance {
//         let id = uuid::Uuid::new_v4().to_string();
//
//         if let Err(e) = sqlx::query!(
//             r#"
//             INSERT INTO ictcell.lms_class_attendance
//                 (id, class_id, student_id, is_present, revised_present, action_ip, action_by)
//             VALUES
//                 ($1, $2, $3, $4, $5, $6, $7)
//             "#,
//             id,
//             req.class_id,
//             item.std_id,
//             item.is_present,
//             item.is_present,
//             client_ip,
//             user_id
//         )
//             .execute(&mut *tx)
//             .await
//         {
//             eprintln!("Insert failed: {:?}", e);
//             return HttpResponse::InternalServerError().json("Failed to insert attendance details");
//         }
//     }
//
//     // Update class attendance_status
//     if let Err(e) = sqlx::query!(
//         "UPDATE ictcell.lms_classes SET attendance_status = 1 WHERE id = $1",
//         req.class_id
//     )
//         .execute(&mut *tx)
//         .await
//     {
//         eprintln!("Class update error: {:?}", e);
//         return HttpResponse::InternalServerError().json("Failed to update class status");
//     }
//
//     // Commit all
//     if let Err(e) = tx.commit().await {
//         return HttpResponse::InternalServerError().json(format!("Commit failed: {}", e));
//     }
//
//     HttpResponse::Ok().json(json!({
//         "status": "success",
//         "message": "Attendance stored successfully",
//         "class_id": req.class_id,
//         "total_students": req.attendance.len()
//     }))
// }


pub async fn store_attendance(
    req: web::Json<AttendanceRequest>,
    db: web::Data<PgPool>,
    auth: BearerAuth,
    req_head: HttpRequest,
) -> impl Responder {

    if req.start_time >= req.end_time {
        return HttpResponse::BadRequest().json(json!({
            "status": "error",
            "message": "Start time must be earlier than end time"
        }));
    }

    let user_id = match get_session_id(auth.token()) {
        Ok(sid) => sid.to_string(),
        Err(_) => {
            return HttpResponse::Unauthorized().json(json!({
                "status": "error",
                "message": "Invalid or expired token"
            }));
        }
    };

    let client_ip = req_head
        .connection_info()
        .realip_remote_addr()
        .unwrap_or("0.0.0.0")
        .to_string();

    let attendance_json = match serde_json::to_value(&req.attendance) {
        Ok(v) => v,
        Err(_) => {
            return HttpResponse::BadRequest().json(json!({
                "status": "error",
                "message": "Invalid attendance data"
            }));
        }
    };

    let result = sqlx::query_scalar::<_, Value>(
        r#"
        SELECT ictcell.store_attendance_fn(
            $1, $2, $3, $4, $5, $6, $7
        )
        "#
    )
        .bind(&req.course_operation_id)
        .bind(req.attendance_date)
        .bind(req.start_time)
        .bind(req.end_time)
        .bind(&user_id)
        .bind(&client_ip)
        .bind(attendance_json)
        .fetch_one(db.get_ref())
        .await;

    match result {
        Ok(json) => {
            match json.get("status").and_then(|v| v.as_str()) {
                Some("success") => HttpResponse::Ok().json(json),
                Some("error")   => HttpResponse::BadRequest().json(json),
                _ => HttpResponse::InternalServerError().json(json!({
                    "status": "error",
                    "message": "Unexpected response from database"
                }))
            }
        }
        Err(err) => {
            eprintln!("DB error: {:?}", err);
            HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": "Database execution failed"
            }))
        }
    }
}


pub async fn get_attendance(
    db: web::Data<PgPool>,
    req: web::Json<AttendanceFetchRequest>,
) -> impl Responder {
    let rows = sqlx::query_as!(
        AttendanceRecord,
        r#"
        SELECT id, attendance_date, attendance_type, room, course_operation_id, start_time, end_time
        FROM ictcell.lms_attendance_master
        WHERE course_operation_id = $1
        "#,
        req.course_operation_id
    )
    .fetch_all(db.get_ref())
    .await;

    match rows {
        Ok(attendance) => HttpResponse::Ok().json(attendance),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}
