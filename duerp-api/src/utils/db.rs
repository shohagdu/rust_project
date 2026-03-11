use sqlx::{PgPool, postgres::PgPoolOptions, Pool, MySql, MySqlPool};
use std::env;

pub async fn get_db_pool() -> PgPool {
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL not set");
    PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to create PostgresSQL DB pool")
}

pub async fn get_mysql_conn_pool() -> Result<MySqlPool, sqlx::Error> {
    let mysql_pool = Pool::<MySql>::connect("mysql://sadikxx:S@dik3s@103.221.255.99/ict_mis").await?;
    Ok(mysql_pool)
}