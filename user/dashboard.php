<?php
require_once '../db/app.php';
require_once '../db/config.php';

ensure_session_started();

if (!isset($_SESSION['user'])) {
    header("Location: login.php");
    exit;
}

$username = $_SESSION['user'];
$userEmail = '';
$registeredEventName = null;
$primaryActionLabel = 'Register for Event';

$memberStmt = mysqli_prepare(
    $conn,
    "SELECT users.email, events.name AS event_name
     FROM users
     LEFT JOIN events ON users.registered_event = events.id
     WHERE users.username = ?
     LIMIT 1"
);
mysqli_stmt_bind_param($memberStmt, "s", $username);
mysqli_stmt_execute($memberStmt);
$memberResult = mysqli_stmt_get_result($memberStmt);
$userData = mysqli_fetch_assoc($memberResult);
mysqli_stmt_close($memberStmt);

if ($userData) {
    $userEmail = $userData['email'] ?? '';
    $registeredEventName = $userData['event_name'] ?? null;
}

if ($registeredEventName) {
    $primaryActionLabel = 'Manage Booking';
}

$featuredQuery = mysqli_query(
    $conn,
    "SELECT id, name, quota, registered_count
     FROM events
     WHERE quota > registered_count
     ORDER BY id
     LIMIT 1"
);
$featuredEvent = $featuredQuery ? mysqli_fetch_assoc($featuredQuery) : null;

$statsQuery = mysqli_query(
    $conn,
    "SELECT
        COUNT(*) AS total_events,
        COALESCE(SUM(GREATEST(quota - registered_count, 0)), 0) AS seats_left
     FROM events"
);
$stats = $statsQuery ? mysqli_fetch_assoc($statsQuery) : [];
$totalEvents = (int) ($stats['total_events'] ?? 0);
$seatsLeft = (int) ($stats['seats_left'] ?? 0);
$featuredSeatsLeft = $featuredEvent ? max((int) $featuredEvent['quota'] - (int) $featuredEvent['registered_count'], 0) : 0;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Dashboard</title>
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
        <a href="register_event.php">Booking</a>
        <a href="update_profile.php">Profile</a>
        <a href="logout.php">Logout</a>
    </nav>
</header>

<main class="panel-shell app-shell animate-in dashboard-layout">
    <section class="dashboard-hero">
        <div class="decision-panel">
            <span class="eyebrow">Member Dashboard</span>
            <h1 class="decision-title">Welcome, <?= htmlspecialchars($username, ENT_QUOTES, 'UTF-8'); ?></h1>

            <div class="context-pill-row">
                <span class="context-pill"><?= htmlspecialchars($userEmail !== '' ? $userEmail : 'No email on file', ENT_QUOTES, 'UTF-8'); ?></span>
                <span class="context-pill"><?= $registeredEventName ? 'Booked: ' . htmlspecialchars($registeredEventName, ENT_QUOTES, 'UTF-8') : 'No event booked yet'; ?></span>
            </div>

            <div class="decision-main-action">
                <a href="register_event.php" class="btn"><?= htmlspecialchars($primaryActionLabel, ENT_QUOTES, 'UTF-8'); ?></a>
                <a href="update_profile.php" class="btn danger-btn">Update Profile</a>
            </div>

            <div class="stat-grid">
                <div class="metric-card">
                    <span class="metric-label">Current Booking</span>
                    <strong class="metric-value"><?= htmlspecialchars($registeredEventName ?: 'None', ENT_QUOTES, 'UTF-8'); ?></strong>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Available Events</span>
                    <strong class="metric-value"><?= $totalEvents; ?></strong>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Seats Left</span>
                    <strong class="metric-value"><?= $seatsLeft; ?></strong>
                </div>
            </div>
        </div>

        <aside class="surface-card">
            <span class="eyebrow">Featured Event</span>
            <?php if ($featuredEvent): ?>
                <h2><?= htmlspecialchars($featuredEvent['name'], ENT_QUOTES, 'UTF-8'); ?></h2>
                <div class="info-list">
                    <div class="info-row">
                        <span class="info-row-label">Seat Status</span>
                        <span class="info-row-value"><?= $featuredSeatsLeft; ?> seats left out of <?= (int) $featuredEvent['quota']; ?></span>
                    </div>
                    <div class="info-row">
                        <span class="info-row-label">Next Step</span>
                        <span class="info-row-value"><?= $registeredEventName ? 'Manage booking' : 'Register now'; ?></span>
                    </div>
                </div>
                <div class="clean-actions">
                    <a href="register_event.php" class="btn">Open Booking</a>
                </div>
            <?php else: ?>
                <h2>No live event yet</h2>
            <?php endif; ?>
        </aside>
    </section>
</main>
</body>
</html>
