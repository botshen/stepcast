use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
    pub id: String,
    pub title: String,
    pub step_count: usize,
    pub updated_at: String,
}

pub struct Database {
    db_path: PathBuf,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
        let db_path = app_data_dir.join("stepcast.sqlite3");
        let db = Self { db_path };
        db.init()?;
        Ok(db)
    }

    fn conn(&self) -> Result<Connection, String> {
        Connection::open(&self.db_path).map_err(|e| e.to_string())
    }

    fn init(&self) -> Result<(), String> {
        let conn = self.conn()?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                step_count INTEGER NOT NULL DEFAULT 0,
                payload_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );",
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_sessions(&self) -> Result<Vec<SessionSummary>, String> {
        let conn = self.conn()?;
        let mut stmt = conn
            .prepare(
                "SELECT id, title, step_count, updated_at
                 FROM sessions
                 ORDER BY updated_at DESC
                 LIMIT 50",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(SessionSummary {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    step_count: row.get::<_, i64>(2)? as usize,
                    updated_at: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for item in rows {
            list.push(item.map_err(|e| e.to_string())?);
        }
        Ok(list)
    }

    pub fn load_session(&self, id: &str) -> Result<Option<String>, String> {
        let conn = self.conn()?;
        let mut stmt = conn
            .prepare("SELECT payload_json FROM sessions WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let json: String = row.get(0).map_err(|e| e.to_string())?;
            Ok(Some(json))
        } else {
            Ok(None)
        }
    }

    pub fn save_session(
        &self,
        id: &str,
        title: &str,
        step_count: usize,
        payload_json: &str,
    ) -> Result<(), String> {
        let conn = self.conn()?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO sessions (id, title, step_count, payload_json, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET
               title = excluded.title,
               step_count = excluded.step_count,
               payload_json = excluded.payload_json,
               updated_at = excluded.updated_at",
            params![id, title, step_count as i64, payload_json, now],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_session(&self, id: &str) -> Result<(), String> {
        let conn = self.conn()?;
        conn.execute("DELETE FROM sessions WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sqlite_session_crud_roundtrip() {
        let dir = std::env::temp_dir().join(format!("stepcast-db-{}", uuid::Uuid::new_v4()));
        let db = Database::new(dir.clone()).expect("init sqlite");

        db.save_session("s1", "First Flow", 3, r#"{"id":"s1","title":"First Flow"}"#)
            .expect("save s1");
        db.save_session("s2", "Second Flow", 5, r#"{"id":"s2","title":"Second Flow"}"#)
            .expect("save s2");

        let list = db.list_sessions().expect("list");
        assert_eq!(list.len(), 2);

        let loaded = db.load_session("s1").expect("load s1").expect("exists");
        assert!(loaded.contains("First Flow"));

        // Update existing session
        db.save_session("s1", "Updated Flow", 4, r#"{"id":"s1","title":"Updated Flow"}"#)
            .expect("update s1");
        let updated = db.load_session("s1").unwrap().unwrap();
        assert!(updated.contains("Updated Flow"));

        db.delete_session("s1").expect("delete s1");
        assert!(db.load_session("s1").unwrap().is_none());

        let _ = std::fs::remove_dir_all(&dir);
    }
}
