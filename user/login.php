<?php
require_once '../db/app.php';

ensure_session_started();

$flash = pull_flash_message();
$old = $_SESSION['login_old'] ?? [];

unset($_SESSION['login_old']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Login - UFC Fight Night</title>
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
      <a href="register.php">Create Account</a>
    </nav>
  </header>

  <main class="auth-layout animate-in">
    <section class="auth-aside">
      <span class="eyebrow">Member Access</span>
      <h1>Member Sign In</h1>
      <div class="auth-points">
        <div class="auth-point">
          <strong>Dashboard</strong>
          <span>Booking status and next action.</span>
        </div>
        <div class="auth-point">
          <strong>Profile</strong>
          <span>Update account details anytime.</span>
        </div>
      </div>
      <a href="register.php" class="auth-footer-link">Need an account? Create one</a>
    </section>

    <section class="auth-box">
      <span class="eyebrow">Login</span>
      <h2>Member Sign In</h2>

      <?php if (is_array($flash) && !empty($flash['message'])): ?>
        <p class="status-message <?= htmlspecialchars($flash['type'] ?? 'status-error', ENT_QUOTES, 'UTF-8'); ?>">
          <?= htmlspecialchars($flash['message'], ENT_QUOTES, 'UTF-8'); ?>
        </p>
      <?php endif; ?>

      <form action="login_process.php" method="POST" class="clean-form">
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
        <div class="form-group">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" placeholder="Enter your username" value="<?= htmlspecialchars($old['username'] ?? '', ENT_QUOTES, 'UTF-8'); ?>" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" placeholder="Enter your password" required>
        </div>
        <div class="clean-actions">
          <input type="submit" value="Login" class="btn">
          <a href="register.php" class="btn danger-btn">Create Account</a>
        </div>
      </form>
    </section>
  </main>
</body>
</html>
