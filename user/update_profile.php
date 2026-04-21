<?php
require_once '../db/config.php';
require_once '../db/app.php';

ensure_session_started();

if (!isset($_SESSION['user'])) {
    header("Location: login.php");
    exit;
}

$username = $_SESSION['user'];
$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_valid_csrf_token($_POST['csrf_token'] ?? null);

    $newUsername = normalize_username($_POST['username'] ?? '');
    $newEmail = trim($_POST['email'] ?? '');
    $currentPassword = $_POST['current_password'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';

    if ($newUsername === '' || $newEmail === '' || $currentPassword === '') {
        $message = "Please fill in all required fields.";
    } elseif (!is_valid_username($newUsername)) {
        $message = "Username must be 3 to 30 characters and use only letters, numbers, or underscores.";
    } elseif (!is_valid_email_address($newEmail)) {
        $message = "Please enter a valid email address.";
    } elseif ($newPassword !== '' && !is_strong_enough_password($newPassword)) {
        $message = "New password must be at least 8 characters long.";
    } else {
        $stmt = mysqli_prepare($conn, "SELECT password FROM users WHERE username = ?");
        mysqli_stmt_bind_param($stmt, "s", $username);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        $user = mysqli_fetch_assoc($result);
        mysqli_stmt_close($stmt);

        if (!$user || !password_verify($currentPassword, $user['password'])) {
            $message = "Current password is incorrect!";
        } else {
            $duplicateCheck = mysqli_prepare(
                $conn,
                "SELECT id FROM users WHERE username = ? AND username <> ?"
            );
            mysqli_stmt_bind_param($duplicateCheck, "ss", $newUsername, $username);
            mysqli_stmt_execute($duplicateCheck);
            $duplicateResult = mysqli_stmt_get_result($duplicateCheck);
            $hasDuplicate = mysqli_num_rows($duplicateResult) > 0;
            mysqli_stmt_close($duplicateCheck);

            $emailDuplicateCheck = mysqli_prepare(
                $conn,
                "SELECT id FROM users WHERE email = ? AND username <> ?"
            );
            mysqli_stmt_bind_param($emailDuplicateCheck, "ss", $newEmail, $username);
            mysqli_stmt_execute($emailDuplicateCheck);
            $emailDuplicateResult = mysqli_stmt_get_result($emailDuplicateCheck);
            $hasEmailDuplicate = mysqli_num_rows($emailDuplicateResult) > 0;
            mysqli_stmt_close($emailDuplicateCheck);

            if ($hasDuplicate) {
                $message = "That username is already in use.";
            } elseif ($hasEmailDuplicate) {
                $message = "That email address is already in use.";
            } else {
                if ($newPassword !== '') {
                    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
                    $stmt = mysqli_prepare(
                        $conn,
                        "UPDATE users SET username = ?, email = ?, password = ? WHERE username = ?"
                    );
                    mysqli_stmt_bind_param($stmt, "ssss", $newUsername, $newEmail, $hashedPassword, $username);
                } else {
                    $stmt = mysqli_prepare(
                        $conn,
                        "UPDATE users SET username = ?, email = ? WHERE username = ?"
                    );
                    mysqli_stmt_bind_param($stmt, "sss", $newUsername, $newEmail, $username);
                }

                try {
                    if (mysqli_stmt_execute($stmt)) {
                        regenerate_session_after_login();
                        $_SESSION['user'] = $newUsername;
                        $username = $newUsername;
                        $message = "Profile updated successfully!";
                    } else {
                        $message = "Error updating profile.";
                    }
                } catch (mysqli_sql_exception $exception) {
                    if ((int) $exception->getCode() === 1062) {
                        $message = "That username or email address is already in use.";
                    } else {
                        $message = "Error updating profile.";
                    }
                }
                mysqli_stmt_close($stmt);
            }
        }
    }
}

$stmt = mysqli_prepare($conn, "SELECT email FROM users WHERE username = ?");
mysqli_stmt_bind_param($stmt, "s", $username);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$userData = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);
?>

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Update Profile - UFC Fight Night</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Oswald:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>

<header>
    <div class="logo">UFC Fight Night</div>
    <nav>
        <a href="../index.php">Home</a>
        <a href="dashboard.php">Dashboard</a>
        <a href="register_event.php">Booking</a>
        <a href="logout.php">Logout</a>
    </nav>
</header>

<main class="auth-layout animate-in">
    <section class="auth-aside">
        <span class="eyebrow">Account Settings</span>
        <h1>Account Settings</h1>
        <div class="auth-points">
            <div class="auth-point">
                <strong>Username</strong>
                <span>Keep your account current.</span>
            </div>
            <div class="auth-point">
                <strong>Password</strong>
                <span>Change it when needed.</span>
            </div>
        </div>
        <a href="dashboard.php" class="auth-footer-link">Back to member dashboard</a>
    </section>

    <section class="auth-box">
        <span class="eyebrow">Profile</span>
        <h2>Update Profile</h2>
        <?php if ($message): ?>
            <p class="status-message <?= strpos($message, 'successfully') !== false ? 'status-success' : 'status-error' ?>">
                <?= htmlspecialchars($message) ?>
            </p>
        <?php endif; ?>

        <form method="POST" action="" class="clean-form">
            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') ?>">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" value="<?= htmlspecialchars($username) ?>" pattern="[A-Za-z0-9_]{3,30}" minlength="3" maxlength="30" required>
            </div>

            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" value="<?= htmlspecialchars($userData['email'] ?? '') ?>" required>
            </div>

            <div class="form-group">
                <label for="current_password">Current Password</label>
                <input type="password" id="current_password" name="current_password" required>
            </div>

            <div class="form-group">
                <label for="new_password">New Password</label>
                <input type="password" id="new_password" name="new_password" minlength="8" placeholder="Leave blank to keep the current password">
            </div>

            <div class="clean-actions">
                <button type="submit" class="btn">Save Changes</button>
                <a href="dashboard.php" class="btn danger-btn">Cancel</a>
            </div>
        </form>
    </section>
</main>

</body>
</html>
