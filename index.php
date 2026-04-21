<?php
require_once 'db/config.php';

$featuredEvent = null;

$featuredQuery = mysqli_query(
    $conn,
    "SELECT id, name, quota, registered_count
     FROM events
     WHERE quota > registered_count
     ORDER BY id
     LIMIT 1"
);

if ($featuredQuery) {
    $featuredEvent = mysqli_fetch_assoc($featuredQuery) ?: null;
}

if (!$featuredEvent) {
    $fallbackQuery = mysqli_query(
        $conn,
        "SELECT id, name, quota, registered_count
         FROM events
         ORDER BY id
         LIMIT 1"
    );
    if ($fallbackQuery) {
        $featuredEvent = mysqli_fetch_assoc($fallbackQuery) ?: null;
    }
}

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

$landingEvents = [];
$landingEventsQuery = mysqli_query(
    $conn,
    "SELECT id, name, quota, registered_count
     FROM events
     ORDER BY
       CASE WHEN quota > registered_count THEN 0 ELSE 1 END,
       id
     LIMIT 4"
);

if ($landingEventsQuery) {
    while ($event = mysqli_fetch_assoc($landingEventsQuery)) {
        $landingEvents[] = $event;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UFC Fight Night - Home</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Oswald:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header>
    <div class="logo">UFC Fight Night</div>
    <nav>
      <a href="index.php">Home</a>
      <a href="user/login.php">Member Access</a>
      <a href="admin/adminLogin.php" class="nav-admin-link">Admin Access</a>
    </nav>
  </header>

  <main class="landing-container app-shell animate-in section-stack">
    <section class="split-grid">
      <div class="featured-event-card">
        <span class="eyebrow">Fight Night Access</span>
        <h1 class="featured-event-title">Book your next UFC event.</h1>

        <div class="action-bar">
          <a href="user/register.php" class="btn">Create Account</a>
          <a href="user/login.php" class="btn danger-btn">Sign In</a>
        </div>
      </div>

      <aside class="featured-event-aside">
        <section class="surface-card">
          <span class="eyebrow">Featured Events</span>
          <?php if ($landingEvents !== []): ?>
            <div class="landing-event-list">
              <?php foreach ($landingEvents as $index => $event): ?>
                <?php
                  $quota = (int) $event['quota'];
                  $registered = (int) $event['registered_count'];
                  $remaining = max($quota - $registered, 0);
                ?>
                <article class="landing-event-item<?= $index === 0 ? ' landing-event-item-featured' : ''; ?>">
                  <div class="landing-event-head">
                    <div class="landing-event-title-block">
                      <?php if ($index === 0): ?>
                        <span class="landing-event-kicker">Main Pick</span>
                      <?php endif; ?>
                      <h2><?= htmlspecialchars($event['name'], ENT_QUOTES, 'UTF-8'); ?></h2>
                    </div>
                    <span class="landing-event-badge"><?= $remaining > 0 ? 'Open' : 'Full'; ?></span>
                  </div>
                  <div class="landing-event-meta-row">
                    <span><?= $remaining; ?> seats left</span>
                    <span><?= $registered; ?>/<?= $quota; ?> booked</span>
                  </div>
                </article>
              <?php endforeach; ?>
            </div>
          <?php else: ?>
            <h2>No events yet</h2>
          <?php endif; ?>
        </section>
      </aside>
    </section>
  </main>
</body>
</html>
