use actix_web::{HttpResponse, Responder, web};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Debug, Serialize)]
pub struct ProgramDetails {
    pub student_id: String,
    pub name: String,
    pub reg_no: String,
    pub roll_no: String,
}

#[derive(Deserialize)]
pub struct ProgramRequest {
    pub course_operation_id: String,
}

pub async fn get_student_by_course_operation(
    db: web::Data<PgPool>,
    req: web::Json<ProgramRequest>,
) -> impl Responder {
    let program_details = sqlx::query_as!(
        ProgramDetails,
        r#"
        SELECT
           ls.id as student_id,
           ls.name,
           ls.reg_no,
           ls.roll_no
        FROM ictcell.lms_course_operation lco
        INNER JOIN ictcell.lms_program lp on lco.program_id = lp.id
        INNER JOIN ictcell.lms_student_program lsp ON lp.id = lsp.program_id
        INNER JOIN ictcell.lms_student ls ON ls.id = lsp.student_id
        WHERE lco.id = $1
        "#,
        req.course_operation_id,
    )
        .fetch_all(db.get_ref())
        .await;

    match program_details {
        Ok(list) => HttpResponse::Ok().json(list),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

// GROUP ALL ROUTES HERE
pub fn program_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/program")
            .route("/student-by-program", web::post().to(get_student_by_course_operation))
    );
}
