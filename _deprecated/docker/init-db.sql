-- Initialize CreatorOS development database
-- This runs once when the PostgreSQL container first starts

-- Ensure the database is created (postgres already creates it from POSTGRES_DB env)
SELECT 'CreatorOS database initialized' AS status;
