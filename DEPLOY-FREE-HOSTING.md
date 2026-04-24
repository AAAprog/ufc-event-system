# Free Hosting Deployment

This project is ready to deploy on a shared PHP + MySQL host such as InfinityFree or AwardSpace.

## 1. Create hosting and database

1. Create a free hosting account.
2. Create a new website or subdomain.
3. Create a MySQL database in the host control panel.
4. Save the database host, database name, username, and password.

## 2. Upload files

1. Upload the full project to your site root such as `htdocs/` or `public_html/`.
2. Keep the folder structure the same.
3. Make sure `.htaccess` is uploaded too.

## 3. Configure database access

1. Copy `db/config.runtime.example.php` to `db/config.runtime.php`.
2. Put your hosting database values into `db/config.runtime.php`.

Example:

```php
<?php

return [
    'host' => 'sql123.epizy.com',
    'username' => 'epiz_xxxxx',
    'password' => 'your_password',
    'database' => 'epiz_xxxxx_ufc_event',
];
```

## 4. Import the database

1. Open phpMyAdmin from your host panel.
2. Select your database.
3. Import `db/setup.sql`.

## 5. First admin login

The seed admin account from `db/setup.sql` is:

- Username: `admin`
- Password: the password that matches the hash in your SQL seed

If you want a custom admin password before deploying, update the insert in `db/setup.sql` with a fresh PHP password hash.

## 6. Final check

Open:

- `/`
- `/user/register.php`
- `/user/login.php`
- `/admin/adminLogin.php`

Then test:

- user registration
- user login
- booking an event
- admin login
- manage users
- manage events

## Notes

- `db/config.runtime.php` is ignored by Git so your real credentials stay out of GitHub.
- The app falls back to local XAMPP defaults only when no runtime config is present.
- `db/.htaccess` blocks direct web access to files inside the database folder on Apache hosting.
