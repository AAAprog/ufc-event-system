<?php
require_once '../db/config.php';
require_once '../db/app.php';

ensure_session_started();
require_valid_csrf_token($_POST['csrf_token'] ?? null);

$username = normalize_username($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

$_SESSION['login_old'] = [
    'username' => $username,
];

function redirect_login_flash(string $message): void
{
    set_flash_message($message, 'status-error');
    header('Location: login.php');
    exit;
}

if ($username === '' || $password === '') {
    redirect_login_flash('Please fill in all fields.');
}

if (!is_valid_username($username)) {
    redirect_login_flash('Please enter a valid username.');
}

$stmt = mysqli_prepare($conn, "SELECT username, password FROM users WHERE username = ?");
mysqli_stmt_bind_param($stmt, "s", $username);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$user = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

if (!$user) {
    redirect_login_flash('Invalid username or password.');
}

if (!password_verify($password, $user['password'])) {
    redirect_login_flash('Invalid username or password.');
}

regenerate_session_after_login();
unset($_SESSION['login_old']);
$_SESSION['user'] = $user['username'];
header("Location: dashboard.php");
exit;
?>
