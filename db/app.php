<?php

function ensure_session_started(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        $isHttps = (
            (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
            (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443)
        );

        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function csrf_token(): string
{
    ensure_session_started();

    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function verify_csrf_token(?string $token): bool
{
    ensure_session_started();

    return isset($_SESSION['csrf_token']) &&
        is_string($token) &&
        hash_equals($_SESSION['csrf_token'], $token);
}

function require_valid_csrf_token(?string $token): void
{
    if (!verify_csrf_token($token)) {
        http_response_code(403);
        exit('Invalid form submission. Please refresh the page and try again.');
    }
}

function set_flash_message(string $message, string $type = 'status-success'): void
{
    ensure_session_started();

    $_SESSION['flash'] = [
        'message' => $message,
        'type' => $type,
    ];
}

function pull_flash_message(): ?array
{
    ensure_session_started();

    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);

    return is_array($flash) ? $flash : null;
}

function regenerate_session_after_login(): void
{
    ensure_session_started();
    session_regenerate_id(true);
}

function destroy_active_session(): void
{
    ensure_session_started();

    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            (bool) $params['secure'],
            (bool) $params['httponly']
        );
    }

    session_destroy();
}

function normalize_username(string $username): string
{
    return trim($username);
}

function is_valid_username(string $username): bool
{
    return $username !== '' && preg_match('/^[A-Za-z0-9_]{3,30}$/', $username) === 1;
}

function is_valid_email_address(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function is_valid_gender(string $gender): bool
{
    return in_array($gender, ['male', 'female'], true);
}

function is_strong_enough_password(string $password): bool
{
    return strlen($password) >= 8;
}
?>
