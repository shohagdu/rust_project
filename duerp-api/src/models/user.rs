use serde::{Serialize, Deserialize};
use sqlx::FromRow;
use serde_json::Value;

#[derive(Serialize, Deserialize, FromRow, Debug)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub role_name: String,
    pub menu_json: Option<Value>,
}
