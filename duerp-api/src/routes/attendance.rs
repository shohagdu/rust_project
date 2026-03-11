// use crate::models::model_attendance::{
//     AttendanceRequest, AttendanceStudent, GetAttendanceRequest, UpdateAttendanceRequest,
// };
// use crate::utils::jwt::get_session_id;
// use actix_web::{HttpResponse, Responder, post, web};
// use actix_web_httpauth::extractors::bearer::BearerAuth;
// use serde_json::json;
// use sqlx::PgPool;
//
// #[post("/store_attendance")]
// pub async fn store_attendance(
//     req: web::Json<AttendanceRequest>,
//     db: web::Data<PgPool>,
//     auth: BearerAuth,
// ) -> impl Responder {
//     let mut tx = match db.begin().await {
//         Ok(tx) => tx,
//         Err(_) => return HttpResponse::InternalServerError().json("Failed to start transaction"),
//     };
//
//     // Extract teacher_id from JWT
//     let user_id = match get_session_id(auth.token()) {
//         Ok(sid) => sid as i64,
//         Err(_) => {
//             return HttpResponse::Unauthorized()
//                 .json(json!({ "error": "Invalid or expired token" }));
//         }
//     };
// 
//     // Check for duplicate attendance
//     let exists: Option<i32> = sqlx::query_scalar!(
//         r#"
//         SELECT id FROM ictcell.attendance_master
//         WHERE class_id = $1 AND attendance_date = $2
//         "#,
//         req.class_id,
//         req.attendance_date
//     )
//     .fetch_optional(&mut *tx)
//     .await
//     .unwrap_or(None);
//
//     if exists.is_some() {
//         return HttpResponse::BadRequest()
//             .json(json!({ "error": "Attendance for this class and date already exists" }));
//     }
//
//     // Insert into master table
//     let master_id: i64 = match sqlx::query_scalar!(
//         r#"
//         INSERT INTO ictcell.attendance_master (class_id, attendance_date)
//         VALUES ($1, $2)
//         RETURNING id
//         "#,
//         req.class_id,
//         req.attendance_date
//     )
//     .fetch_one(&mut *tx)
//     .await
//     {
//         Ok(id) => id as i64,
//         Err(e) => {
//             eprintln!("Master insert error: {:?}", e);
//             return HttpResponse::InternalServerError().json("Failed to insert attendance master");
//         }
//     };
//
//     // Insert details
//     for item in &req.attendance {
//         if let Err(e) = sqlx::query!(
//             r#"
//             INSERT INTO ictcell.attendance_details
//             (attendance_master_id, std_id, reg_no, is_present, rev_attendance)
//             VALUES ($1, $2, $3, $4, $5)
//             "#,
//             master_id as i64,
//             item.std_id,
//             item.reg_no,
//             item.is_present.unwrap_or(0),
//             item.is_present.unwrap_or(0)
//         )
//         .execute(&mut *tx)
//         .await
//         {
//             eprintln!("Detail insert error: {:?}", e);
//             return HttpResponse::InternalServerError().json("Failed to insert attendance details");
//         }
//     }
//
//     // Update class_master status
//     if let Err(e) = sqlx::query!(
//         r#"
//         UPDATE ictcell.class_master
//         SET attendance_status = 1
//         WHERE id = $1
//         "#,
//         req.class_id as i64
//     )
//     .execute(&mut *tx)
//     .await
//     {
//         eprintln!("Failed to update class_master attendance_status: {:?}", e);
//         return HttpResponse::InternalServerError()
//             .json("Failed to update class attendance status");
//     }
//
//     // Commit transaction
//     if let Err(e) = tx.commit().await {
//         eprintln!("Transaction commit error: {:?}", e);
//         return HttpResponse::InternalServerError().json("Failed to commit attendance data");
//     }
//
//     HttpResponse::Ok().json(json!({
//         "status": "success",
//         "message": "Attendance stored successfully",
//         "master_id": master_id,
//         "total_students": req.attendance.len()
//     }))
// }
//
// #[post("/get_attendance")]
// pub async fn get_attendance(
//     req: web::Json<GetAttendanceRequest>,
//     db: web::Data<PgPool>,
//     auth: BearerAuth,
// ) -> impl Responder {
//     // Decode token
//     let user_id = match get_session_id(auth.token()) {
//         Ok(sid) => sid,
//         Err(_) => {
//             return HttpResponse::Unauthorized()
//                 .json(json!({ "error": "Invalid or expired token" }));
//         }
//     };
//
//     // Fetch attendance master
//     let master = match sqlx::query!(
//         r#"
//         SELECT am.id, am.class_id, am.attendance_date
//         FROM ictcell.attendance_master am
//         JOIN ictcell.class_master cm ON am.class_id = cm.id
//         WHERE am.class_id = $1
// --           AND cm.status = 1
//         "#,
//         req.class_id
//     )
//     .fetch_optional(db.get_ref())
//     .await
//     {
//         Ok(opt) => opt,
//         Err(e) => {
//             eprintln!("DB error: {:?}", e);
//             return HttpResponse::InternalServerError().json(json!({ "error": "Database error" }));
//         }
//     };
//
//     // Fetch details or return 404
//     if let Some(m) = master {
//         let details = match sqlx::query_as!(
//             AttendanceStudent,
//             r#"
//             SELECT std_id, reg_no, is_present, rev_attendance
//             FROM ictcell.attendance_details
//             WHERE attendance_master_id = $1
//             "#,
//             m.id as i64
//         )
//         .fetch_all(db.get_ref())
//         .await
//         {
//             Ok(d) => d,
//             Err(e) => {
//                 eprintln!("DB error: {:?}", e);
//                 return HttpResponse::InternalServerError()
//                     .json(json!({ "error": "Database error" }));
//             }
//         };
//
//         HttpResponse::Ok().json(json!({
//             "class_id": m.class_id,
//             "attendance_date": m.attendance_date.to_string(),
//             "students": details
//         }))
//     } else {
//         HttpResponse::NotFound().json(json!({
//             "class_id": "",
//             "attendance_date": "",
//             "students": [],
//             "error": "Attendance record not found"
//         }))
//     }
// }
//
// #[post("/update_attendance")]
// pub async fn update_attendance(
//     req: web::Json<UpdateAttendanceRequest>,
//     db: web::Data<PgPool>,
//     auth: BearerAuth,
// ) -> impl Responder {
//     // Start transaction
//     let mut tx = match db.begin().await {
//         Ok(tx) => tx,
//         Err(_) => return HttpResponse::InternalServerError().json("Failed to start transaction"),
//     };
//
//     // Find attendance_master_id for this class
//     let master_id: i32 = match sqlx::query_scalar!(
//         "SELECT id FROM ictcell.attendance_master WHERE class_id = $1",
//         req.class_id
//     )
//     .fetch_optional(&mut *tx)
//     .await
//     {
//         Ok(Some(id)) => id,
//         Ok(None) => return HttpResponse::NotFound().json("Attendance master not found"),
//         Err(e) => {
//             eprintln!("DB error: {:?}", e);
//             return HttpResponse::InternalServerError().json("Database error");
//         }
//     };
//
//     // Update each student's attendance
//     for item in &req.attendance {
//         if let Err(e) = sqlx::query!(
//             r#"
//             UPDATE ictcell.attendance_details
//             SET rev_attendance = $1
//             WHERE attendance_master_id = $2 AND std_id = $3
//             "#,
//             item.rev_attendance.unwrap_or(0),
//             master_id as i64,
//             item.std_id
//         )
//         .execute(&mut *tx)
//         .await
//         {
//             eprintln!(
//                 "Failed to update attendance for std_id {}: {:?}",
//                 item.std_id, e
//             );
//             return HttpResponse::InternalServerError().json(format!(
//                 "Failed to update attendance for student {}",
//                 item.std_id
//             ));
//         }
//     }
//
//     // Update class_master attendance_status = 1
//     if let Err(e) = sqlx::query!(
//         "UPDATE ictcell.class_master SET attendance_status = 1 WHERE id = $1",
//         req.class_id as i64
//     )
//     .execute(&mut *tx)
//     .await
//     {
//         eprintln!("Failed to update class attendance_status: {:?}", e);
//         return HttpResponse::InternalServerError()
//             .json("Failed to update class attendance_status");
//     }
//
//     // Commit transaction
//     if let Err(e) = tx.commit().await {
//         eprintln!("Transaction commit error: {:?}", e);
//         return HttpResponse::InternalServerError().json("Failed to commit attendance update");
//     }
//
//     HttpResponse::Ok().json(json!({
//         "status": "success",
//         "message": "Attendance updated successfully",
//         "class_id": req.class_id,
//         "updated_students": req.attendance.len()
//     }))
// }
