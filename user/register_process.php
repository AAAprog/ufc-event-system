<?php
require_once '../db/config.php';
require_once '../db/app.php';

ensure_session_started();
require_valid_csrf_token($_POST['csrf_token'] ?? null);

$username = normalize_username($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$confirm = $_POST['confirm_password'] ?? '';
$email = trim($_POST['email'] ?? '');
$gender = trim($_POST['gender'] ?? '');
$nationality = trim($_POST['nationality'] ?? '');

$_SESSION['register_old'] = [
    'username' => $username,
    'email' => $email,
    'gender' => $gender,
    'nationality' => $nationality,
];

function redirect_with_flash(string $message, string $type, string $target): void
{
    set_flash_message($message, $type);
    header('Location: ' . $target);
    exit;
}

if (
    $username === '' ||
    $password === '' ||
    $confirm === '' ||
    $email === '' ||
    $gender === '' ||
    $nationality === ''
) {
    redirect_with_flash('Please fill in all fields.', 'status-error', 'register.php');
}

if (!is_valid_username($username)) {
    redirect_with_flash('Username must be 3 to 30 characters and use only letters, numbers, or underscores.', 'status-error', 'register.php');
}

if (!is_valid_email_address($email)) {
    redirect_with_flash('Please enter a valid email address.', 'status-error', 'register.php');
}

if (!is_valid_gender($gender)) {
    redirect_with_flash('Please choose a valid gender option.', 'status-error', 'register.php');
}

if (!is_valid_nationality($nationality)) {
    redirect_with_flash('Please choose a valid nationality.', 'status-error', 'register.php');
}

if ($password !== $confirm) {
    redirect_with_flash('Passwords do not match.', 'status-error', 'register.php');
}

if (!is_strong_enough_password($password)) {
    redirect_with_flash('Password must be at least 8 characters long.', 'status-error', 'register.php');
}

$check = mysqli_prepare($conn, "SELECT id FROM users WHERE username = ?");
mysqli_stmt_bind_param($check, "s", $username);
mysqli_stmt_execute($check);
$existing = mysqli_stmt_get_result($check);

if (mysqli_num_rows($existing) > 0) {
    mysqli_stmt_close($check);
    redirect_with_flash('Username already taken.', 'status-error', 'register.php');
}
mysqli_stmt_close($check);

$emailCheck = mysqli_prepare($conn, "SELECT id FROM users WHERE email = ?");
mysqli_stmt_bind_param($emailCheck, "s", $email);
mysqli_stmt_execute($emailCheck);
$existingEmail = mysqli_stmt_get_result($emailCheck);

if (mysqli_num_rows($existingEmail) > 0) {
    mysqli_stmt_close($emailCheck);
    redirect_with_flash('Email already registered.', 'status-error', 'register.php');
}
mysqli_stmt_close($emailCheck);

$hashed_password = password_hash($password, PASSWORD_DEFAULT);

$insert = mysqli_prepare(
    $conn,
    "INSERT INTO users (username, password, email, gender, nationality) VALUES (?, ?, ?, ?, ?)"
);
mysqli_stmt_bind_param($insert, "sssss", $username, $hashed_password, $email, $gender, $nationality);
try {
    $saved = mysqli_stmt_execute($insert);
    mysqli_stmt_close($insert);
} catch (mysqli_sql_exception $exception) {
    mysqli_stmt_close($insert);

    if ((int) $exception->getCode() === 1062) {
        redirect_with_flash('That username or email is already in use.', 'status-error', 'register.php');
    }

    redirect_with_flash('Registration failed. Please try again.', 'status-error', 'register.php');
}

if ($saved) {
    unset($_SESSION['register_old']);
    redirect_with_flash('Registration successful. You can sign in now.', 'status-success', 'login.php');
} else {
    redirect_with_flash('Registration failed. Please try again.', 'status-error', 'register.php');
}
?>
