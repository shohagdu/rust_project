use std::env;
use std::future::{ready, Ready};
use std::rc::Rc;
use std::task::{Context, Poll};

use actix_service::{Service, Transform};
use actix_web::body::{EitherBody, MessageBody};
use actix_web::dev::{ServiceRequest, ServiceResponse};
use actix_web::{Error, HttpMessage, HttpResponse};
use futures_util::future::LocalBoxFuture;
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};

/// JWT Claims structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: u64, // username or user id
    pub exp: usize,  // expiration timestamp
}

/// Middleware factory
pub struct JwtMiddleware;

impl<S, B> Transform<S, ServiceRequest> for JwtMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Transform = JwtMiddlewareMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(JwtMiddlewareMiddleware {
            service: Rc::new(service),
        }))
    }
}

/// Middleware service
pub struct JwtMiddlewareMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for JwtMiddlewareMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, ctx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(ctx)
    }

    fn call(&self, mut req: ServiceRequest) -> Self::Future {
        let svc = Rc::clone(&self.service);

        Box::pin(async move {
            // Extract token from Authorization header
            let token = req
                .headers()
                .get("Authorization")
                .and_then(|h| h.to_str().ok())
                .and_then(|h| h.strip_prefix("Bearer "))
                .map(|t| t.to_string());

            // Reject if missing
            if token.is_none() {
                let res = HttpResponse::Unauthorized()
                    .json(serde_json::json!({ "error": "Missing token" }))
                    .map_into_right_body();
                return Ok(req.into_response(res));
            }

            let token = token.unwrap();

            // Decode and verify token
            let secret = env::var("JWT_SECRET").unwrap();
            let key = DecodingKey::from_secret(secret.as_ref());
            match decode::<Claims>(&token, &key, &Validation::default()) {
                Ok(token_data) => {
                    req.extensions_mut().insert(token_data.claims);
                    let res = svc.call(req).await?;
                    Ok(res.map_into_left_body())
                }
                Err(_) => {
                    let res = HttpResponse::Unauthorized()
                        .json(serde_json::json!({ "error": "Invalid or expired token" }))
                        .map_into_right_body();
                    Ok(req.into_response(res))
                }
            }
        })
    }
}
