use chrono::{NaiveDate, Datelike, Weekday};

/// Convert a `NaiveDate` weekday into a lowercase short string like "mon", "tue", etc.
pub fn weekday_to_str(date: NaiveDate) -> &'static str {
    match date.weekday() {
        Weekday::Mon => "mon",
        Weekday::Tue => "tue",
        Weekday::Wed => "wed",
        Weekday::Thu => "thu",
        Weekday::Fri => "fri",
        Weekday::Sat => "sat",
        Weekday::Sun => "sun",
    }
}
