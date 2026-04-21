<?php
require_once '../db/app.php';

ensure_session_started();

$flash = pull_flash_message();
$old = $_SESSION['register_old'] ?? [];

unset($_SESSION['register_old']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Registration - UFC Fight Night</title>
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
            <a href="login.php">Sign In</a>
            <a href="../admin/adminLogin.php" class="nav-admin-link">Admin Access</a>
        </nav>
    </header>

    <main class="auth-layout animate-in">
        <section class="auth-aside">
            <span class="eyebrow">Create Account</span>
            <h1>Create Your Account</h1>
            <div class="auth-points">
                <div class="auth-point">
                    <strong>Fast Access</strong>
                    <span>Register and start booking.</span>
                </div>
                <div class="auth-point">
                    <strong>Member Portal</strong>
                    <span>Booking, profile, and event status.</span>
                </div>
            </div>
            <a href="login.php" class="auth-footer-link">Already registered? Sign in</a>
        </section>

        <section class="auth-box">
            <span class="eyebrow">Registration</span>
            <h2>Create Your Member Account</h2>

            <?php if (is_array($flash) && !empty($flash['message'])): ?>
                <p class="status-message <?= htmlspecialchars($flash['type'] ?? 'status-error', ENT_QUOTES, 'UTF-8'); ?>">
                    <?= htmlspecialchars($flash['message'], ENT_QUOTES, 'UTF-8'); ?>
                </p>
            <?php endif; ?>

            <form action="register_process.php" method="POST" class="clean-form">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" placeholder="Choose a username" pattern="[A-Za-z0-9_]{3,30}" minlength="3" maxlength="30" value="<?= htmlspecialchars($old['username'] ?? '', ENT_QUOTES, 'UTF-8'); ?>" required>
                </div>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" placeholder="Enter your email" value="<?= htmlspecialchars($old['email'] ?? '', ENT_QUOTES, 'UTF-8'); ?>" required>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="Create a password" minlength="8" required>
                </div>
                <div class="form-group">
                    <label for="confirm_password">Confirm Password</label>
                    <input type="password" id="confirm_password" name="confirm_password" placeholder="Repeat your password" minlength="8" required>
                </div>
                <div class="form-group">
                    <label>Gender</label>
                    <div class="radio-group">
                        <label class="radio-option">
                            <input type="radio" name="gender" value="male" <?= (($old['gender'] ?? '') === 'male') ? 'checked' : ''; ?> required> Male
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="gender" value="female" <?= (($old['gender'] ?? '') === 'female') ? 'checked' : ''; ?> required> Female
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <label for="nationality">Nationality</label>
                    <input type="text" id="nationality" name="nationality" placeholder="Enter your nationality" value="<?= htmlspecialchars($old['nationality'] ?? '', ENT_QUOTES, 'UTF-8'); ?>" required>
                </div>
                <div class="clean-actions">
                    <button type="submit" class="btn">Register</button>
                    <a href="login.php" class="btn danger-btn">Sign In</a>
                </div>
            </form>
        </section>
    </main>
</body>
</html>
