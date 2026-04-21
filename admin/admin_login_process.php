<?php
require_once '../db/config.php';
require_once '../db/app.php';

ensure_session_started();
require_valid_csrf_token($_POST['csrf_token'] ?? null);

$username = normalize_username($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

$_SESSION['admin_login_old'] = [
    'username' => $username,
];

function redirect_admin_login_flash(string $message): void
{
    set_flash_message($message, 'status-error');
    header('Location: adminLogin.php');
    exit;
}

if ($username === '' || $password === '') {
    redirect_admin_login_flash('Please fill in all fields.');
}

if (!is_valid_username($username)) {
    redirect_admin_login_flash('Please enter a valid username.');
}

$stmt = mysqli_prepare($conn, "SELECT username, password FROM admin WHERE username = ?");
mysqli_stmt_bind_param($stmt, "s", $username);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$admin = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

if (!$admin) {
    redirect_admin_login_flash('Invalid username or password.');
}

$storedPassword = $admin['password'];
$isValid = password_verify($password, $storedPassword);

if (!$isValid && hash_equals($storedPassword, $password)) {
    $newHash = password_hash($password, PASSWORD_DEFAULT);
    $upgrade = mysqli_prepare($conn, "UPDATE admin SET password = ? WHERE username = ?");
    mysqli_stmt_bind_param($upgrade, "ss", $newHash, $username);
    mysqli_stmt_execute($upgrade);
    mysqli_stmt_close($upgrade);
    $isValid = true;
}

if (!$isValid) {
    redirect_admin_login_flash('Invalid username or password.');
}

regenerate_session_after_login();
unset($_SESSION['admin_login_old']);
$_SESSION['admin'] = $admin['username'];
header("Location: adminDashboard.php");
exit;
?>
