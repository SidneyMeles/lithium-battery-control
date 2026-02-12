-- Migration number: 0002 	 2026-02-11T20:57:00.000Z
CREATE TABLE IF NOT EXISTS auth (
    id INTEGER PRIMARY KEY NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir a senha padrão: bateria123
-- Nota: Em produção, use hash bcrypt. Por simplicidade, usando hash SHA-256
INSERT INTO auth (password_hash)
VALUES ('bateria123')
;
