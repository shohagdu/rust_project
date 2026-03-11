mod middleware;
mod models;
mod routes;
mod utils;

use actix_web::{web, App, HttpServer};
use dotenv::dotenv;
use middleware::jwt_middleware::JwtMiddleware;
use utils::db;
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    // Postgres pool
    let db_pool = db::get_db_pool().await;

    // MySQL pool
    // let mysql_pool = get_mysql_conn_pool()
    //     .await
    //     .expect("Failed to connect to MySQL");

    println!("Server is starting at http://{}:{}", "127.0.0.1", "8080");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(db_pool.clone()))
            // .app_data(web::Data::new(mysql_pool.clone()))
            .wrap(actix_cors::Cors::permissive())
            .service(routes::auth::login)
            .service(
                web::scope("/api")
                    .wrap(JwtMiddleware)
                    // Example protected routes
                    // .service(routes::attendance::store_attendance)
                    // .service(routes::attendance::get_attendance)
                    // .service(routes::class::create_class)
                    // .service(routes::class::get_class)
                    // .service(routes::class::update_class)
                    // .service(routes::class::delete_class)
                    // .service(routes::course::get_teacher_course)
                    // .service(routes::class::get_class_students)
                    // .service(routes::attendance::update_attendance)
                    .configure(routes::course_routes::course_routes)
                    .configure(routes::program_routes::program_routes)
                    .configure(routes::department_routes::department_routes)
                    .configure(routes::attendance_routes::attendance_routes)

            )
    })
        .bind(("0.0.0.0", 8080))?
        .run()
        .await
}
