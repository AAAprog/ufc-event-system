<?php
require_once '../db/config.php';
require_once '../db/app.php';

$username = require_member_session();
$message = '';
$messageClass = 'status-error';
$currentEventName = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['event_id'])) {
    require_valid_csrf_token($_POST['csrf_token'] ?? null);
    $eventId = (int) ($_POST['event_id'] ?? 0);

    if ($eventId <= 0) {
        $message = "Please select a valid event.";
    } else {
        mysqli_begin_transaction($conn);

        try {
            // Lock the member and target event so concurrent bookings cannot exceed capacity.
            $userStmt = mysqli_prepare($conn, "SELECT registered_event FROM users WHERE username = ? FOR UPDATE");
            mysqli_stmt_bind_param($userStmt, "s", $username);
            mysqli_stmt_execute($userStmt);
            $userResult = mysqli_stmt_get_result($userStmt);
            $userRow = mysqli_fetch_assoc($userResult);
            mysqli_stmt_close($userStmt);

            if (!$userRow) {
                throw new RuntimeException("User account was not found.");
            }

            $currentEventId = $userRow['registered_event'] !== null ? (int) $userRow['registered_event'] : null;
            if ($currentEventId === $eventId) {
                throw new RuntimeException("You are already registered for this event.");
            }

            $eventStmt = mysqli_prepare(
                $conn,
                "SELECT id, quota, registered_count FROM events WHERE id = ? FOR UPDATE"
            );
            mysqli_stmt_bind_param($eventStmt, "i", $eventId);
            mysqli_stmt_execute($eventStmt);
            $eventResult = mysqli_stmt_get_result($eventStmt);
            $eventRow = mysqli_fetch_assoc($eventResult);
            mysqli_stmt_close($eventStmt);

            if (!$eventRow) {
                throw new RuntimeException("Selected event was not found.");
            }

            if ((int) $eventRow['registered_count'] >= (int) $eventRow['quota']) {
                throw new RuntimeException("This event is already full.");
            }

            $updateUser = mysqli_prepare($conn, "UPDATE users SET registered_event = ? WHERE username = ?");
            mysqli_stmt_bind_param($updateUser, "is", $eventId, $username);
            mysqli_stmt_execute($updateUser);
            mysqli_stmt_close($updateUser);

            if ($currentEventId !== null && $currentEventId > 0) {
                $decrement = mysqli_prepare(
                    $conn,
                    "UPDATE events SET registered_count = GREATEST(registered_count - 1, 0) WHERE id = ?"
                );
                mysqli_stmt_bind_param($decrement, "i", $currentEventId);
                mysqli_stmt_execute($decrement);
                mysqli_stmt_close($decrement);
            }

            $increment = mysqli_prepare(
                $conn,
                "UPDATE events SET registered_count = registered_count + 1 WHERE id = ? AND registered_count < quota"
            );
            mysqli_stmt_bind_param($increment, "i", $eventId);
            mysqli_stmt_execute($increment);
            $affectedRows = mysqli_stmt_affected_rows($increment);
            mysqli_stmt_close($increment);

            if ($affectedRows !== 1) {
                throw new RuntimeException("The event became full while you were registering.");
            }

            mysqli_commit($conn);
            $message = 'Booking updated successfully.';
            $messageClass = 'status-success';
        } catch (Throwable $exception) {
            mysqli_rollback($conn);
            error_log('Event booking update failed: ' . $exception->getMessage());
            $message = $exception instanceof RuntimeException
                ? $exception->getMessage()
                : 'Unable to update the booking. Please try again.';
        }
    }
}

$userSummaryStmt = mysqli_prepare(
    $conn,
    "SELECT users.registered_event, events.name AS event_name
     FROM users
     LEFT JOIN events ON users.registered_event = events.id
     WHERE users.username = ?
     LIMIT 1"
);
mysqli_stmt_bind_param($userSummaryStmt, "s", $username);
mysqli_stmt_execute($userSummaryStmt);
$userSummaryResult = mysqli_stmt_get_result($userSummaryStmt);
$userSummary = mysqli_fetch_assoc($userSummaryResult);
mysqli_stmt_close($userSummaryStmt);

if ($userSummary) {
    $currentEventName = $userSummary['event_name'] ?? null;
}

$statsResult = mysqli_query(
    $conn,
    "SELECT
        COUNT(*) AS total_events,
        COALESCE(SUM(GREATEST(quota - registered_count, 0)), 0) AS seats_left
     FROM events"
);
$stats = mysqli_fetch_assoc($statsResult);
$totalEvents = (int) ($stats['total_events'] ?? 0);
$seatsLeft = (int) ($stats['seats_left'] ?? 0);

$events = mysqli_query(
    $conn,
    "SELECT id, name, quota, registered_count FROM events WHERE quota > registered_count ORDER BY name"
);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register for Event - UFC Fight Night</title>
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
        <a href="update_profile.php">Profile</a>
        <a href="logout.php">Logout</a>
    </nav>
</header>
<main class="panel-shell animate-in">
    <div class="page-intro compact">
        <span class="eyebrow">Booking</span>
        <h1>Book or switch your UFC event</h1>
    </div>

    <?php if ($message !== ''): ?>
        <p class="status-message <?= $messageClass; ?>">
            <?= escape_html($message) ?>
        </p>
    <?php endif; ?>

    <div class="split-grid">
        <section class="surface-card booking-action-panel">
            <span class="eyebrow">Booking Form</span>
            <h3>Select Event</h3>
            <form method="POST" class="clean-form">
                <input type="hidden" name="csrf_token" value="<?= escape_html(csrf_token()) ?>">
                <div class="form-group">
                    <label for="event_id">Select Event</label>
                    <select id="event_id" name="event_id" required>
                        <option value="">-- Select an Event --</option>
                        <?php while ($event = mysqli_fetch_assoc($events)): ?>
                            <option value="<?= (int) $event['id'] ?>">
                                <?= escape_html($event['name']) ?> (<?= (int) $event['registered_count'] ?>/<?= (int) $event['quota'] ?>)
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div class="clean-actions">
                    <button type="submit" class="btn">Register</button>
                    <a href="dashboard.php" class="btn danger-btn">Cancel</a>
                </div>
            </form>
        </section>

        <section class="surface-card">
            <span class="eyebrow">Context</span>
            <h3>Booking Overview</h3>
            <div class="action-bar">
                <a href="dashboard.php" class="btn">Dashboard</a>
            </div>

            <div class="hero-grid booking-overview-grid">
                <div class="hero-stat">
                    <span class="hero-stat-label">Total Events</span>
                    <strong class="hero-stat-value"><?= $totalEvents ?></strong>
                </div>
                <div class="hero-stat">
                    <span class="hero-stat-label">Seats Left</span>
                    <strong class="hero-stat-value"><?= $seatsLeft ?></strong>
                </div>
                <div class="hero-stat booking-stat-booking">
                    <span class="hero-stat-label">Current Booking</span>
                    <strong class="hero-stat-value"><?= escape_html($currentEventName ?: 'None') ?></strong>
                </div>
            </div>
        </section>
    </div>
</main>
</body>
</html>
