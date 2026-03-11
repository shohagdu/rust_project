use crate::models::model_course::{};
use crate::utils::constants::{api_utils_course, SSL_SECRET_KEY};
use crate::utils::jwt::get_session_id;
use actix_web::{post, web, HttpResponse, Responder};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use reqwest::Client;
use serde_json::{json, Value};
use sqlx::PgPool;
use std::env;
use crate::models::model_class::{ClassInfo, ClassRequest};

#[post("/get_teacher_course")]
pub async fn get_teacher_course(auth: BearerAuth) -> impl Responder {
    let user_id = match get_session_id(auth.token()) {
        Ok(sid) => sid,
        Err(_) => {
            return HttpResponse::Unauthorized()
                .json(json!({ "error": "Invalid or expired token" }));
        }
    };

    // Convert u64 to i64 for SQL (safe unless you expect IDs > i64::MAX)
    let teacher_id_num = user_id as i64;

    let client = Client::new();

    // Prepare form data for external API
    let form_data = [("employee_id", teacher_id_num)];

    // Call external login API
    let response = client
        .post(env::var("SSL_API_ENDPOINT").unwrap() + api_utils_course::GET_TEACHER_COURSE)
        .header("secret-key", SSL_SECRET_KEY)
        .form(&form_data)
        .send()
        .await;

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                // Deserialize DU API response
                let api_json: Value = match resp.json().await {
                    Ok(json) => json,
                    Err(_) => {
                        return HttpResponse::InternalServerError().json("Invalid API response");
                    }
                };

                println!("DU API response: {}", api_json);

                // Return only the JSON from the external API
                HttpResponse::Ok().json(api_json)
            } else {
                HttpResponse::Unauthorized().json("Login failed at external API")
            }
        }
        Err(err) => {
            eprintln!("External login error: {:?}", err);
            HttpResponse::InternalServerError().json("Login service unavailable")
        }
    }
}
