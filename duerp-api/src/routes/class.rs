// use crate::models::model_class::{ClassInfo, ClassRequest, ClassResponse, CreateClassRequest, DeleteClassRequest, EnrichedClassResponse, GetClassRequest, UpdateClassRequest};
// use crate::utils::constants::{api_utils_course, SSL_SECRET_KEY};
// use crate::utils::date_utils::weekday_to_str;
// use crate::utils::jwt::get_session_id;
// use actix_web::{post, web, HttpResponse, Responder};
// use actix_web_httpauth::extractors::bearer::BearerAuth;
// use chrono::{Duration, NaiveDate, NaiveTime};
// use reqwest::Client;
// use serde_json::{json, Value};
// use sqlx::PgPool;
// use std::collections::HashMap;
// use std::env;
// use crate::models::model_course::CourseInfo;
//
// #[post("/create_class")]
// pub async fn create_class(
//     db: web::Data<PgPool>,
//     req: web::Json<CreateClassRequest>,
//     auth: BearerAuth,
// ) -> impl Responder {
//     // Parse JWT and extract teacher_id
//     let user_id = match get_session_id(auth.token()) {
//         Ok(sid) => sid,
//         Err(_) => {
//             return HttpResponse::Unauthorized()
//                 .json(json!({ "error": "Invalid or expired token" }));
//         }
//     };
//
//     // Convert u64 to i64 for SQL (safe unless you expect IDs > i64::MAX)
//     let teacher_id_num = user_id as i64;
//
//     // Parse start & end dates
//     let start_date = match NaiveDate::parse_from_str(&req.class_start_date, "%Y-%m-%d") {
//         Ok(date) => date,
//         Err(_) => return HttpResponse::BadRequest().json("Invalid start date format"),
//     };
//     let end_date = match NaiveDate::parse_from_str(&req.class_end_date, "%Y-%m-%d") {
//         Ok(date) => date,
//         Err(_) => return HttpResponse::BadRequest().json("Invalid end date format"),
//     };
//
//     // Parse start & end times
//     let start_time = match NaiveTime::parse_from_str(&req.start_time, "%H:%M") {
//         Ok(time) => time,
//         Err(_) => {
//             return HttpResponse::BadRequest().json("Invalid start time format (expected HH:MM)");
//         }
//     };
//     let end_time = match NaiveTime::parse_from_str(&req.end_time, "%H:%M") {
//         Ok(time) => time,
//         Err(_) => {
//             return HttpResponse::BadRequest().json("Invalid end time format (expected HH:MM)");
//         }
//     };
//
//     // Prepare selected_days for single-day classes
//     let mut selected_days = req.selected_days.clone();
//     if !req.is_recurring {
//         let weekday = weekday_to_str(start_date);
//         if !selected_days
//             .iter()
//             .any(|d| d.eq_ignore_ascii_case(weekday))
//         {
//             selected_days.push(weekday.to_string());
//         }
//     }
//
//     // Insert classes
//     let mut inserted_classes = Vec::new();
//     let mut date = start_date;
//
//     while date <= end_date {
//         let weekday = weekday_to_str(date);
//
//         if selected_days
//             .iter()
//             .any(|d| d.eq_ignore_ascii_case(weekday))
//         {
//             // Duplicate check
//             let exists = sqlx::query_scalar!(
//                 r#"
//                 SELECT COUNT(*) as "count!"
//                 FROM ictcell.class_master
//                 WHERE teacher_id = $1
//                   AND course_id = $2
//                   AND course_section_id = $3
//                   AND class_date = $4
//                   AND end_time > $5
//                   AND start_time < $6
//                 "#,
//                 teacher_id_num,
//                 req.course_id,
//                 req.course_section_id,
//                 date,
//                 start_time,
//                 end_time
//             )
//             .fetch_one(db.get_ref())
//             .await
//             .unwrap_or(0);
//
//             if exists == 0 {
//                 if let Ok(class) = sqlx::query_as!(
//                     ClassResponse,
//                     r#"
//                     INSERT INTO ictcell.class_master
//                         (teacher_id, course_id, course_section_id, class_date, topic, start_time, end_time, attendance_type, room)
//                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
//                     RETURNING id, teacher_id, course_id, course_section_id, class_date, topic, start_time, end_time, attendance_type, room, attendance_status
//                     "#,
//                     teacher_id_num,
//                     req.course_id,
//                     req.course_section_id,
//                     date,
//                     req.topic.clone().unwrap_or_default(),
//                     start_time,
//                     end_time,
//                     req.attendance_type,
//                     req.room
//
//                 )
//                     .fetch_one(db.get_ref())
//                     .await
//                 {
//                     inserted_classes.push(class);
//                 }
//             }
//         }
//
//         date += Duration::days(1);
//     }
//
//     if inserted_classes.is_empty() {
//         HttpResponse::Conflict().json("Requested classes already exist for the given schedule")
//     } else {
//         HttpResponse::Ok().json(json!({
//             "message": if req.is_recurring {
//                 "Recurring classes created successfully"
//             } else {
//                 "Class created successfully"
//             },
//             "count": inserted_classes.len(),
//             "classes": inserted_classes
//         }))
//     }
// }
//
// #[post("/get_class")]
// pub async fn get_class(
//     db: web::Data<PgPool>,
//     req: web::Json<GetClassRequest>,
//     auth: BearerAuth,
// ) -> impl Responder {
//     // Parse optional date filters
//     let class_start_date = match &req.class_start_date {
//         Some(d) if !d.trim().is_empty() => NaiveDate::parse_from_str(d, "%Y-%m-%d").ok(),
//         _ => None,
//     };
//     let class_end_date = match &req.class_end_date {
//         Some(d) if !d.trim().is_empty() => NaiveDate::parse_from_str(d, "%Y-%m-%d").ok(),
//         _ => None,
//     };
//
//     let user_id = match get_session_id(auth.token()) {
//         Ok(sid) => sid,
//         Err(_) => {
//             return HttpResponse::Unauthorized()
//                 .json(json!({ "error": "Invalid or expired token" }));
//         }
//     };
//
//     // Convert u64 to i64 for SQL (safe unless you expect IDs > i64::MAX)
//     let teacher_id_num = user_id as i64;
//
//     // Fetch classes from DB
//     let classes = sqlx::query_as!(
//        ClassResponse,
//             r#"
//             SELECT id, teacher_id, course_id, course_section_id, class_date, topic, start_time, end_time, attendance_type, room, attendance_status
//             FROM ictcell.class_master
//             WHERE teacher_id = $1
//           AND ($2::bigint IS NULL OR id = $2)
//           AND ($3::bigint IS NULL OR course_id = $3)
//           AND ($4::bigint IS NULL OR course_section_id = $4)
//           AND ( ($5::date IS NULL AND $6::date IS NULL) OR class_date BETWEEN COALESCE($5::date, class_date) AND COALESCE($6::date, class_date))
//         ORDER BY class_date DESC, start_time ASC
//             "#,
//             teacher_id_num,       // <- use teacher ID from token
//             req.class_id,
//             req.course_id,
//             req.course_section_id,
//             class_start_date,
//             class_end_date
//     )
//         .fetch_all(db.get_ref())
//         .await;
//
//     let Ok(classes) = classes else {
//         return HttpResponse::InternalServerError().json("Failed to fetch classes");
//     };
//
//     if classes.is_empty() {
//         return HttpResponse::Ok().json(Vec::<EnrichedClassResponse>::new());
//     }
//
//     // Collect all unique course IDs
//     let course_ids: Vec<i64> = classes.iter().map(|c| c.course_id).collect();
//     println!("Collected course IDs: {:?}", course_ids);
//
//     // Call external API to get full course names
//     let client = Client::new();
//     let api_resp = client
//         .post( env::var("SSL_API_ENDPOINT").unwrap() + api_utils_course::GET_COURSE_INFO)
//         .header("secret-key", SSL_SECRET_KEY)
//         .json(&json!({ "course_ids": course_ids }))
//         .send()
//         .await;
//
//     let mut course_map: HashMap<i64, String> = HashMap::new();
//     if let Ok(resp) = api_resp {
//         if let Ok(course_list) = resp.json::<Vec<CourseInfo>>().await {
//             for c in course_list {
//                 course_map.insert(c.id, c.full_course_name);
//             }
//         }
//     }
//
//     // Merge data: add full_course_name to each class
//     let enriched: Vec<EnrichedClassResponse> = classes
//         .into_iter()
//         .map(|c| EnrichedClassResponse {
//             id: c.id,
//             teacher_id: c.teacher_id,
//             course_id: c.course_id,
//             course_section_id: c.course_section_id,
//             class_date: c.class_date.to_string(),
//             topic: c.topic,
//             attendance_type: c.attendance_type,
//             room: c.room,
//             start_time: c.start_time.map(|t| t.format("%H:%M").to_string()),
//             end_time: c.end_time.map(|t| t.format("%H:%M").to_string()),
//             full_course_name: course_map.get(&c.course_id).cloned(),
//             attendance_status: c.attendance_status,
//         })
//         .collect();
//
//     HttpResponse::Ok().json(enriched)
// }
//
// #[post("/update_class")]
// pub async fn update_class(
//     db: web::Data<PgPool>,
//     req: web::Json<UpdateClassRequest>,
//     auth: BearerAuth,
// ) -> impl Responder {
//     // Extract teacher_id from JWT
//     let user_id = match get_session_id(auth.token()) {
//         Ok(id) => id as i64, // teacher_id column is int8
//         Err(_) => {
//             return HttpResponse::Unauthorized().json(json!({ "error": "Invalid or expired token" }));
//         }
//     };
//
//     // Convert class_date
//     let class_date: Option<NaiveDate> = req
//         .class_date
//         .as_ref()
//         .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());
//
//     // Convert times
//     let start_time: Option<NaiveTime> =
//         req.start_time.as_ref().and_then(|t| NaiveTime::parse_from_str(t, "%H:%M").ok());
//     let end_time: Option<NaiveTime> =
//         req.end_time.as_ref().and_then(|t| NaiveTime::parse_from_str(t, "%H:%M").ok());
//
//     // SQLx update
//     let result = sqlx::query!(
//         r#"
//         UPDATE ictcell.class_master
//         SET topic = COALESCE($1, topic),
//             start_time = COALESCE($2, start_time),
//             end_time = COALESCE($3, end_time),
//             attendance_type = COALESCE($4, attendance_type),
//             room = COALESCE($5, room),
//             class_date = COALESCE($6, class_date),
//             updated_by = $7,
//             updated_time = NOW()
//         WHERE id = $8 AND teacher_id = $7
//         "#,
//         req.topic,
//         start_time,
//         end_time,
//         req.attendance_type,
//         req.room,
//         class_date,
//         user_id,       // i64 → matches teacher_id int8
//         req.class_id   // i32 → matches id serial4
//     )
//         .execute(db.get_ref())
//         .await;
//
//     match result {
//         Ok(res) if res.rows_affected() > 0 => {
//             HttpResponse::Ok().json(json!({ "message": "Class updated successfully" }))
//         }
//         Ok(_) => HttpResponse::NotFound()
//             .json(json!({ "error": "Class not found or unauthorized" })),
//         Err(e) => {
//             eprintln!("DB error: {:?}", e);
//             HttpResponse::InternalServerError().json(json!({ "error": "Database error" }))
//         }
//     }
// }
//
//
// #[post("/delete_class")]
// pub async fn delete_class(db: web::Data<PgPool>, req: web::Json<DeleteClassRequest>, auth: BearerAuth,
// ) -> impl Responder {
//     // Extract teacher_id from JWT
//     let teacher_id = match get_session_id(auth.token()) {
//         Ok(id) => id as i64,
//         Err(_) => return HttpResponse::Unauthorized().json(json!({ "error": "Invalid or expired token" })),
//     };
//
//     // Check if attendance exists
//     let attendance_exists = match sqlx::query_scalar!(
//     "SELECT EXISTS(SELECT 1 FROM ictcell.attendance_master WHERE class_id = $1)", req.class_id)
//         .fetch_one(db.get_ref())
//         .await
//     {
//         Ok(exists) => exists.unwrap_or(false),
//         Err(e) => {
//             eprintln!("DB error checking attendance existence: {:?}", e);
//             return HttpResponse::InternalServerError()
//                 .json(json!({ "error": "Database error while checking attendance" }));
//         }
//     };
//
//     if attendance_exists {
//         return HttpResponse::BadRequest()
//             .json(json!({ "error": "Cannot delete class: attendance has already been recorded" }));
//     }
//
//     // Perform soft delete
//     let result = sqlx::query!(
//         r#"
//         UPDATE ictcell.class_master
//         SET status = 0, updated_by = $1, updated_time = NOW()
//         WHERE id = $2 AND teacher_id = $1 AND status = 1
//         "#,
//         teacher_id,
//         req.class_id as i32
//     )
//         .execute(db.get_ref())
//         .await;
//
//     match result {
//         Ok(res) if res.rows_affected() > 0 => {
//             HttpResponse::Ok().json(json!({ "message": "Class deleted successfully" }))
//         }
//         Ok(_) => HttpResponse::NotFound().json(json!({ "error": "Class not found or unauthorized" })),
//         Err(e) => {
//             eprintln!("DB error: {:?}", e);
//             HttpResponse::InternalServerError().json(json!({ "error": "Database error" }))
//         }
//     }
// }
//
// #[post("/get_class_students")]
// pub async fn get_class_students( db: web::Data<PgPool>, req: web::Json<ClassRequest>, ) -> impl Responder {
//     // Fetch class info from DB
//     let class_id_i32 = req.class_id.map(|id| id as i32);
//     let class_info = sqlx::query_as!(
//         ClassInfo,
//         r#"
//         SELECT id, course_id, course_section_id
//         FROM ictcell.class_master
//         WHERE id = $1
//         "#,
//         class_id_i32
//     )
//         .fetch_optional(db.get_ref())
//         .await;
//
//     let info = match class_info {
//         Ok(Some(data)) => data,
//         Ok(None) => {
//             return HttpResponse::NotFound().json("Class not found");
//         }
//         Err(e) => {
//             eprintln!("Database error: {:?}", e);
//             return HttpResponse::InternalServerError().json("Database error");
//         }
//     };
//
//     let client = Client::new();
//
//     // Prepare form data for external API
//     let form_data = [
//         ("eo_course_id", info.course_id.to_string()),
//         ("eo_course_section_id", info.course_section_id.to_string()),
//     ];
//
//     // Call external API
//     let response = client
//         .post(env::var("SSL_API_ENDPOINT").unwrap() + api_utils_course::GET_COURSE_STUDENT )
//         .header("secret-key", SSL_SECRET_KEY)
//         .form(&form_data)
//         .send()
//         .await;
//
//     match response {
//         Ok(resp) => {
//             if resp.status().is_success() {
//                 match resp.json::<Value>().await {
//                     Ok(api_json) => {
//                         // Extract "student_list"
//                         if let Some(student_list) = api_json.get("student_list") {
//                             HttpResponse::Ok().json(student_list)
//                         } else {
//                             HttpResponse::InternalServerError()
//                                 .json("student_list not found in API response")
//                         }
//                     }
//                     Err(_) => HttpResponse::InternalServerError().json("Invalid API response"),
//                 }
//             } else {
//                 HttpResponse::Unauthorized().json("External API returned error")
//             }
//         }
//         Err(err) => {
//             eprintln!("External API call failed: {:?}", err);
//             HttpResponse::InternalServerError().json("External service unavailable")
//         }
//     }
// }
//
// pub async fn get_course_students( db: web::Data<PgPool>, req: web::Json<ClassRequest>, ) -> impl Responder {
//     // Fetch class info from DB
//     let class_id_i32 = req.class_id.map(|id| id as i32);
//     let class_info = sqlx::query_as!(
//         ClassInfo,
//         r#"
//         SELECT id, course_id, course_section_id
//         FROM ictcell.class_master
//         WHERE id = $1
//         "#,
//         class_id_i32
//     )
//         .fetch_optional(db.get_ref())
//         .await;
//
//     let info = match class_info {
//         Ok(Some(data)) => data,
//         Ok(None) => {
//             return HttpResponse::NotFound().json("Class not found");
//         }
//         Err(e) => {
//             eprintln!("Database error: {:?}", e);
//             return HttpResponse::InternalServerError().json("Database error");
//         }
//     };
//
//     let client = Client::new();
//
//     // Prepare form data for external API
//     let form_data = [
//         ("eo_course_id", info.course_id.to_string()),
//         ("eo_course_section_id", info.course_section_id.to_string()),
//     ];
//
//     // Call external API
//     let response = client
//         .post(env::var("SSL_API_ENDPOINT").unwrap() + api_utils_course::GET_COURSE_STUDENT )
//         .header("secret-key", SSL_SECRET_KEY)
//         .form(&form_data)
//         .send()
//         .await;
//
//     match response {
//         Ok(resp) => {
//             if resp.status().is_success() {
//                 match resp.json::<Value>().await {
//                     Ok(api_json) => {
//                         // Extract "student_list"
//                         if let Some(student_list) = api_json.get("student_list") {
//                             HttpResponse::Ok().json(student_list)
//                         } else {
//                             HttpResponse::InternalServerError()
//                                 .json("student_list not found in API response")
//                         }
//                     }
//                     Err(_) => HttpResponse::InternalServerError().json("Invalid API response"),
//                 }
//             } else {
//                 HttpResponse::Unauthorized().json("External API returned error")
//             }
//         }
//         Err(err) => {
//             eprintln!("External API call failed: {:?}", err);
//             HttpResponse::InternalServerError().json("External service unavailable")
//         }
//     }
// }