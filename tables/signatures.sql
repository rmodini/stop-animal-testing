-- if we update this file we need to run it again to have any effect

DROP TABLE IF EXISTS signatures;

CREATE TABLE signatures (
    id SERIAL PRIMARY KEY,
    signature TEXT NOT NULL CHECK(signature != ''),
    user_id INTEGER NOT NULL REFERENCES users(id),
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);