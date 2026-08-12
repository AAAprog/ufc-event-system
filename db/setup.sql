
-- Core event inventory and booking counters.
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    quota INT NOT NULL,
    registered_count INT NOT NULL DEFAULT 0,
    CONSTRAINT events_name_unique UNIQUE (name)
);

-- Member accounts retain the selected event as an optional foreign key.
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    registered_event INT NULL,
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT fk_users_registered_event
        FOREIGN KEY (registered_event) REFERENCES events(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- Preserve unique constraints when importing into an existing development database.
SET @users_email_unique := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND index_name = 'users_email_unique'
);
SET @users_email_sql := IF(
    @users_email_unique = 0,
    'ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)',
    'SELECT 1'
);
PREPARE users_email_stmt FROM @users_email_sql;
EXECUTE users_email_stmt;
DEALLOCATE PREPARE users_email_stmt;

SET @events_name_unique := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'events'
      AND index_name = 'events_name_unique'
);
SET @events_name_sql := IF(
    @events_name_unique = 0,
    'ALTER TABLE events ADD CONSTRAINT events_name_unique UNIQUE (name)',
    'SELECT 1'
);
PREPARE events_name_stmt FROM @events_name_sql;
EXECUTE events_name_stmt;
DEALLOCATE PREPARE events_name_stmt;

-- Administrative accounts are separate from member accounts.
CREATE TABLE IF NOT EXISTS admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Seed records make a fresh local installation immediately usable.
INSERT INTO events (name, quota, registered_count)
SELECT 'Main Card VIP', 150, 0
WHERE NOT EXISTS (SELECT 1 FROM events WHERE name = 'Main Card VIP');

INSERT INTO events (name, quota, registered_count)
SELECT 'Heavyweight Showcase', 120, 0
WHERE NOT EXISTS (SELECT 1 FROM events WHERE name = 'Heavyweight Showcase');

INSERT INTO events (name, quota, registered_count)
SELECT 'Lightweight Contenders', 100, 0
WHERE NOT EXISTS (SELECT 1 FROM events WHERE name = 'Lightweight Contenders');

INSERT INTO admin (username, password)
SELECT 'admin', '$2y$10$zYx10zeOYkvLkbRAfUwy2O32OVRT9POXlPwiYjTd2.w5JvcooyfvS'
WHERE NOT EXISTS (SELECT 1 FROM admin WHERE username = 'admin');
