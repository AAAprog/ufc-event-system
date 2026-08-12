<?php
require_once '../db/app.php';

require_once '../db/config.php';

$admin = require_admin_session();

$userCount = 0;
$eventCount = 0;
$adminCount = 0;
$bookedCount = 0;
$seatsLeft = 0;
$dashboardWarning = '';

try {
    $userCount = (int) mysqli_fetch_row(mysqli_query($conn, "SELECT COUNT(*) FROM users"))[0];
    $eventCount = (int) mysqli_fetch_row(mysqli_query($conn, "SELECT COUNT(*) FROM events"))[0];
    $adminCount = (int) mysqli_fetch_row(mysqli_query($conn, "SELECT COUNT(*) FROM admin"))[0];
    $bookedCount = (int) mysqli_fetch_row(mysqli_query($conn, "SELECT COUNT(*) FROM users WHERE registered_event IS NOT NULL"))[0];
    $seatsLeft = (int) mysqli_fetch_row(mysqli_query($conn, "SELECT COALESCE(SUM(GREATEST(quota - registered_count, 0)), 0) FROM events"))[0];
} catch (Throwable $e) {
    error_log('Admin dashboard stats failed: ' . $e->getMessage());
    $userCount = 0;
    $eventCount = 0;
    $adminCount = 0;
    $bookedCount = 0;
    $seatsLeft = 0;
    $dashboardWarning = 'Some dashboard stats could not be loaded right now.';
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard</title>
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
            <a href="manage_users.php">Users</a>
            <a href="manage_events.php">Events</a>
            <a href="adminLogout.php">Logout</a>
        </nav>
    </header>

<main class="panel-shell app-shell animate-in dashboard-layout">
  <?php if ($dashboardWarning !== ''): ?>
    <p class="status-message status-error"><?= htmlspecialchars($dashboardWarning, ENT_QUOTES, 'UTF-8'); ?></p>
  <?php endif; ?>
  <section class="decision-panel">
    <span class="eyebrow">Operations</span>
    <h1 class="decision-title">Admin Control Center</h1>
    <div class="context-pill-row">
      <span class="context-pill">Signed in as <?= htmlspecialchars($admin, ENT_QUOTES, 'UTF-8'); ?></span>
      <span class="context-pill"><?= $dashboardWarning === '' ? 'System status: online' : 'System status: limited' ?></span>
    </div>
    <div class="action-bar">
      <a href="manage_users.php" class="btn">Manage Users</a>
      <a href="manage_events.php" class="btn danger-btn">Manage Events</a>
    </div>
  </section>

  <section class="stat-grid" aria-label="Admin dashboard summary">
    <div class="metric-card">
      <span class="metric-label">Member Accounts</span>
      <strong class="metric-value"><?= $userCount; ?></strong>
    </div>
    <div class="metric-card">
      <span class="metric-label">Booked Members</span>
      <strong class="metric-value"><?= $bookedCount; ?></strong>
    </div>
    <div class="metric-card">
      <span class="metric-label">Event Setup</span>
      <strong class="metric-value"><?= $eventCount; ?></strong>
    </div>
    <div class="metric-card">
      <span class="metric-label">Seats Left</span>
      <strong class="metric-value"><?= $seatsLeft; ?></strong>
    </div>
    <div class="metric-card">
      <span class="metric-label">Admin Accounts</span>
      <strong class="metric-value"><?= $adminCount; ?></strong>
    </div>
  </section>
</main>


</body>
</html>
