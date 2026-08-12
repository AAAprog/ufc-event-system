# UFC Event Management System

A role-based PHP and MySQL application for managing UFC event bookings, member accounts, and event capacity.

[Live interactive preview](https://aaaprog.github.io/ufc-event-system/) | [Source code](https://github.com/AAAprog/ufc-event-system)

## Overview

The system gives members a clear path from registration to event booking, while administrators can manage accounts, event inventory, and capacity from one place. The interface is responsive and keeps primary actions visible on desktop and mobile.

## Features

- Secure member registration and sign-in with hashed passwords
- CSRF protection for all state-changing forms
- Member profile updates, including optional password changes
- Nationality selection and validated account data
- Event booking and booking changes with seat availability checks
- Transaction-safe seat counts to prevent overbooking
- Administrator authentication and dashboard reporting
- User search and account deletion controls
- Event creation, editing, quota management, and deletion
- Interactive GitHub Pages preview for portfolios and LinkedIn

## Roles

| Role | Capabilities |
| --- | --- |
| Member | Register, sign in, update profile, book an available event, and change an existing booking. |
| Administrator | View operational totals, search members, manage member accounts, and create or update event capacity. |

## Technology

- PHP 8+
- MySQL / MariaDB
- MySQLi prepared statements
- HTML and CSS
- Vanilla JavaScript for the GitHub Pages preview

## Local Setup

### 1. Prerequisites

- PHP 8.0 or later
- MySQL or MariaDB
- Apache, XAMPP, or an equivalent local PHP server

### 2. Create the database

Create a database named `ufc_event`, then import [`db/setup.sql`](db/setup.sql). The schema creates the member, administrator, and event tables and provides initial event data.

### 3. Configure the connection

For local XAMPP, the default configuration in [`db/config.php`](db/config.php) uses:

```text
Host: localhost
User: root
Password: (empty)
Database: ufc_event
```

For another environment, copy `db/config.runtime.example.php` to `db/config.runtime.php` and update the values. The runtime configuration file is ignored by Git.

### 4. Run the application

Place the project inside your server directory, for example:

```text
C:\xampp\htdocs\ufc_event_system
```

Start Apache and MySQL, then open:

```text
http://localhost/ufc_event_system/
```

The included [`sync-to-xampp.ps1`](sync-to-xampp.ps1) script can mirror this project into the XAMPP web directory.

## Administrator Access

The schema seeds an `admin` account. Its password is stored only as a hash. Before a production deployment, generate a password hash with PHP and replace the seeded value in `db/setup.sql` with one you control.

## Deployment

For a PHP/MySQL host, follow [`DEPLOY-FREE-HOSTING.md`](DEPLOY-FREE-HOSTING.md). The `docs/` directory is separate from the PHP application and is published by GitHub Pages for the interactive preview.

## Project Structure

```text
admin/       Administrator authentication, dashboard, user management, and event management
user/        Member registration, authentication, profile, dashboard, and booking workflows
db/          Database connection, shared application helpers, and schema
css/         Shared application styles
docs/        Static interactive preview published through GitHub Pages
```

## Security Notes

- Passwords use PHP's `password_hash()` and `password_verify()` APIs.
- POST requests that alter data require a CSRF token.
- Database operations use prepared statements where user input is involved.
- Database credentials belong in `db/config.runtime.php` or environment variables, never in the repository.

## Portfolio Link

Use this GitHub Pages URL in the LinkedIn Projects section so visitors can explore the member and administrator flows directly:

`https://aaaprog.github.io/ufc-event-system/`
