<?php
require_once '../db/app.php';

ensure_session_started();

$flash = pull_flash_message();
$old = $_SESSION['admin_login_old'] ?? [];

unset($_SESSION['admin_login_old']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login - UFC Fight Night</title>
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
      <a href="../user/login.php">Member Access</a>
    </nav>
  </header>

  <main class="auth-layout animate-in">
    <section class="auth-aside">
      <span class="eyebrow">Operations</span>
      <h1>Admin Access</h1>
      <div class="auth-points">
        <div class="auth-point">
          <strong>Users</strong>
          <span>Search and manage accounts.</span>
        </div>
        <div class="auth-point">
          <strong>Events</strong>
          <span>Control quotas and availability.</span>
        </div>
      </div>
      <a href="../user/login.php" class="auth-footer-link">Return to member access</a>
    </section>

    <section class="auth-box">
      <span class="eyebrow">Admin Login</span>
      <h2>Operations Sign In</h2>

      <?php if (is_array($flash) && !empty($flash['message'])): ?>
        <p class="status-message <?= htmlspecialchars($flash['type'] ?? 'status-error', ENT_QUOTES, 'UTF-8'); ?>">
          <?= htmlspecialchars($flash['message'], ENT_QUOTES, 'UTF-8'); ?>
        </p>
      <?php endif; ?>

      <form action="admin_login_process.php" method="POST" class="clean-form">
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
        <div class="form-group">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" placeholder="Admin username" value="<?= htmlspecialchars($old['username'] ?? '', ENT_QUOTES, 'UTF-8'); ?>" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" placeholder="Admin password" required>
        </div>
        <div class="clean-actions">
          <input type="submit" value="Login" class="btn">
        </div>
      </form>
    </section>
  </main>
</body>
</html>
