<?php
require_once '../db/config.php';
require_once '../db/app.php';

ensure_session_started();

if (!isset($_SESSION['admin'])) {
    header("Location: adminLogin.php");
    exit;
}

$message = '';
$messageClass = 'status-error';
$flash = pull_flash_message();

if (isset($_POST['add_event'])) {
    require_valid_csrf_token($_POST['csrf_token'] ?? null);
    $eventName = trim($_POST['event_name'] ?? '');
    $quota = (int) ($_POST['quota'] ?? 0);

    if ($eventName !== '' && $quota > 0) {
        $duplicateCheck = mysqli_prepare($conn, "SELECT id FROM events WHERE name = ?");
        mysqli_stmt_bind_param($duplicateCheck, "s", $eventName);
        mysqli_stmt_execute($duplicateCheck);
        $duplicateResult = mysqli_stmt_get_result($duplicateCheck);
        $hasDuplicate = mysqli_num_rows($duplicateResult) > 0;
        mysqli_stmt_close($duplicateCheck);

        if ($hasDuplicate) {
            $message = "An event with that name already exists.";
        } else {
            $insert = mysqli_prepare($conn, "INSERT INTO events (name, quota, registered_count) VALUES (?, ?, 0)");
            mysqli_stmt_bind_param($insert, "si", $eventName, $quota);

            try {
                $saved = mysqli_stmt_execute($insert);
                mysqli_stmt_close($insert);
            } catch (mysqli_sql_exception $exception) {
                mysqli_stmt_close($insert);

                if ((int) $exception->getCode() === 1062) {
                    $message = "An event with that name already exists.";
                } else {
                    $message = "Failed to add event.";
                }
                $saved = false;
            }

            $message = $saved ? "New sub-event added." : "Failed to add event.";
            $messageClass = $saved ? 'status-success' : 'status-error';
        }
    } else {
        $message = "Please enter a valid name and quota.";
    }

    set_flash_message($message, $messageClass);
    header('Location: manage_events.php');
    exit;
}

if (isset($_POST['save_all_events'])) {
    require_valid_csrf_token($_POST['csrf_token'] ?? null);
    $eventNames = $_POST['event_name'] ?? [];
    $eventQuotas = $_POST['new_quota'] ?? [];

    if (!is_array($eventNames) || !is_array($eventQuotas) || $eventNames === [] || $eventQuotas === []) {
        $message = "No event updates were submitted.";
    } else {
        $eventIds = array_unique(
            array_map(
                'intval',
                array_intersect(array_keys($eventNames), array_keys($eventQuotas))
            )
        );

        if ($eventIds === []) {
            $message = "No valid event updates were submitted.";
        } else {
            mysqli_begin_transaction($conn);

            try {
                $fetchStmt = mysqli_prepare($conn, "SELECT id, name, quota, registered_count FROM events WHERE id = ? FOR UPDATE");
                $duplicateStmt = mysqli_prepare($conn, "SELECT id FROM events WHERE name = ? AND id <> ?");
                $updateStmt = mysqli_prepare($conn, "UPDATE events SET name = ?, quota = ? WHERE id = ?");

                $updatedCount = 0;

                foreach ($eventIds as $eventId) {
                    mysqli_stmt_bind_param($fetchStmt, "i", $eventId);
                    mysqli_stmt_execute($fetchStmt);
                    $currentResult = mysqli_stmt_get_result($fetchStmt);
                    $currentEvent = mysqli_fetch_assoc($currentResult);

                    if (!$currentEvent) {
                        throw new RuntimeException("An event could not be found while saving changes.");
                    }

                    $newName = trim((string) ($eventNames[(string) $eventId] ?? ''));
                    $newQuota = (int) ($eventQuotas[(string) $eventId] ?? 0);
                    $registeredCount = (int) $currentEvent['registered_count'];

                    if ($newName === '') {
                        throw new RuntimeException("Event names cannot be empty.");
                    }

                    if ($newQuota <= 0) {
                        throw new RuntimeException("Quota must be a positive number.");
                    }

                    if ($newQuota < $registeredCount) {
                        throw new RuntimeException("Quota cannot be lower than the registered count.");
                    }

                    mysqli_stmt_bind_param($duplicateStmt, "si", $newName, $eventId);
                    mysqli_stmt_execute($duplicateStmt);
                    $duplicateResult = mysqli_stmt_get_result($duplicateStmt);

                    if (mysqli_num_rows($duplicateResult) > 0) {
                        throw new RuntimeException("Each event name must be unique.");
                    }

                    $currentName = (string) $currentEvent['name'];
                    if ($currentName !== $newName || $newQuota !== (int) $currentEvent['quota']) {
                        mysqli_stmt_bind_param($updateStmt, "sii", $newName, $newQuota, $eventId);
                        mysqli_stmt_execute($updateStmt);
                        $updatedCount++;
                    }
                }

                mysqli_stmt_close($fetchStmt);
                mysqli_stmt_close($duplicateStmt);
                mysqli_stmt_close($updateStmt);

                mysqli_commit($conn);
                $message = $updatedCount > 0 ? "Event changes saved successfully." : "No event changes were detected.";
                $messageClass = 'status-success';
            } catch (Throwable $exception) {
                mysqli_rollback($conn);

                if (isset($fetchStmt) && $fetchStmt instanceof mysqli_stmt) {
                    mysqli_stmt_close($fetchStmt);
                }
                if (isset($duplicateStmt) && $duplicateStmt instanceof mysqli_stmt) {
                    mysqli_stmt_close($duplicateStmt);
                }
                if (isset($updateStmt) && $updateStmt instanceof mysqli_stmt) {
                    mysqli_stmt_close($updateStmt);
                }

                $message = $exception->getMessage();
            }
        }
    }

    set_flash_message($message, $messageClass);
    header('Location: manage_events.php');
    exit;
}

if (isset($_POST['delete_event'])) {
    require_valid_csrf_token($_POST['csrf_token'] ?? null);
    $eventId = (int) ($_POST['delete_event'] ?? 0);

    if ($eventId <= 0) {
        $message = "Invalid event selected.";
    } else {
        $delete = mysqli_prepare($conn, "DELETE FROM events WHERE id = ?");
        mysqli_stmt_bind_param($delete, "i", $eventId);
        $deleted = mysqli_stmt_execute($delete);
        $affectedRows = mysqli_stmt_affected_rows($delete);
        mysqli_stmt_close($delete);

        if ($deleted && $affectedRows === 1) {
            $message = "Event deleted successfully.";
            $messageClass = 'status-success';
        } else {
            $message = "Failed to delete event.";
        }
    }

    set_flash_message($message, $messageClass);
    header('Location: manage_events.php');
    exit;
}

$statsResult = mysqli_query(
    $conn,
    "SELECT
        COUNT(*) AS total_events,
        COALESCE(SUM(registered_count), 0) AS total_registered,
        COALESCE(SUM(GREATEST(quota - registered_count, 0)), 0) AS seats_left
     FROM events"
);
$stats = $statsResult ? mysqli_fetch_assoc($statsResult) : [];
$totalEvents = (int) ($stats['total_events'] ?? 0);
$totalRegistered = (int) ($stats['total_registered'] ?? 0);
$seatsLeft = (int) ($stats['seats_left'] ?? 0);

$eventsResult = mysqli_query($conn, "SELECT * FROM events ORDER BY id");
$events = [];
while ($row = mysqli_fetch_assoc($eventsResult)) {
    $events[] = $row;
}

$currentResults = count($events);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Events</title>
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
            <a href="adminDashboard.php">Dashboard</a>
            <a href="manage_users.php">Users</a>
            <a href="adminLogout.php">Logout</a>
        </nav>
    </header>

    <main class="panel-shell manage-events-shell animate-in">
        <?php if (is_array($flash) && !empty($flash['message'])): ?>
            <p class="status-message <?= htmlspecialchars($flash['type'] ?? 'status-success', ENT_QUOTES, 'UTF-8'); ?>">
                <?= htmlspecialchars($flash['message'], ENT_QUOTES, 'UTF-8'); ?>
            </p>
        <?php endif; ?>

        <section class="events-hero">
            <div class="intro-card">
                <span class="eyebrow">Events</span>
                <h1>Manage Events</h1>
                <p>Create sub-events, monitor booking pressure, and update capacity from one control screen with the same structure as the user directory.</p>
                <div class="events-meta">
                    <span>Signed in as <?= htmlspecialchars($_SESSION['admin'], ENT_QUOTES, 'UTF-8'); ?></span>
                    <span>Capacity controls ready</span>
                </div>
                <div class="events-stats">
                    <div class="events-stat">
                        <span class="events-stat-label">Total Events</span>
                        <strong class="events-stat-value"><?= $totalEvents; ?></strong>
                    </div>
                    <div class="events-stat">
                        <span class="events-stat-label">Booked Seats</span>
                        <strong class="events-stat-value"><?= $totalRegistered; ?></strong>
                    </div>
                    <div class="events-stat">
                        <span class="events-stat-label">Current Results</span>
                        <strong class="events-stat-value"><?= $currentResults; ?></strong>
                    </div>
                </div>
            </div>

            <section class="control-card">
                <h2>Create Directory</h2>
                <p>Add a new event entry with its initial quota, then adjust capacity directly from the command table when needed.</p>
                <form method="post" class="control-form">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                    <div class="form-group">
                        <label for="event_name">Create An Event</label>
                        <input
                            type="text"
                            id="event_name"
                            name="event_name"
                            placeholder="Event name"
                            required
                        >
                    </div>
                    <div class="form-group">
                        <label for="quota">Set Capacity</label>
                        <input
                            type="number"
                            id="quota"
                            name="quota"
                            min="1"
                            placeholder="Maximum seats"
                            required
                        >
                    </div>
                    <div class="control-actions">
                        <input type="submit" name="add_event" value="Add Event">
                        <a href="manage_events.php" class="btn danger-btn">Refresh Page</a>
                        <a href="adminDashboard.php" class="btn danger-btn">Back to Dashboard</a>
                    </div>
                </form>
            </section>
        </section>

        <section class="event-table-card">
            <div class="table-head">
                <div>
                    <span class="eyebrow">Directory</span>
                    <h2>Event Command Table</h2>
                </div>
                <p><?= $currentResults > 0 ? 'Showing all configured events' : 'No events available yet'; ?></p>
            </div>

            <?php if ($currentResults === 0): ?>
                <div class="empty-state">
                    <h3>No events found</h3>
                    <p>Create the first event from the panel above to begin managing capacity.</p>
                </div>
            <?php else: ?>
                <form method="post" class="events-bulk-form">
                    <div class="events-scroll">
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                        <table>
                            <thead>
                                <tr>
                                    <th class="col-id">ID</th>
                                    <th class="col-name">Name</th>
                                    <th class="col-number">Quota</th>
                                    <th class="col-number">Registered</th>
                                    <th class="col-number">Seats Left</th>
                                    <th class="col-status">Status</th>
                                    <th class="col-action col-action-delete">Delete</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($events as $event): ?>
                                    <?php
                                        $quota = (int) $event['quota'];
                                        $registered = (int) $event['registered_count'];
                                        $remaining = max($quota - $registered, 0);
                                        $status = $remaining === 0 ? 'Full' : ($remaining <= 5 ? 'Low seats' : 'Open');
                                        $statusClass = $remaining === 0 ? 'is-full' : ($remaining <= 5 ? 'is-low' : 'is-open');
                                    ?>
                                    <tr>
                                        <td class="col-id"><?= (int) $event['id']; ?></td>
                                        <td class="col-name">
                                            <input
                                                type="text"
                                                name="event_name[<?= (int) $event['id']; ?>]"
                                                value="<?= htmlspecialchars($event['name'], ENT_QUOTES, 'UTF-8'); ?>"
                                                class="table-text-input"
                                                required
                                            >
                                        </td>
                                        <td class="col-number">
                                            <input
                                                type="number"
                                                name="new_quota[<?= (int) $event['id']; ?>]"
                                                value="<?= $quota; ?>"
                                                min="<?= max(1, $registered); ?>"
                                                class="table-number-input"
                                                required
                                            >
                                        </td>
                                        <td class="col-number"><?= $registered; ?></td>
                                        <td class="col-number"><?= $remaining; ?></td>
                                        <td class="col-status"><span class="status-pill <?= $statusClass; ?>"><?= htmlspecialchars($status, ENT_QUOTES, 'UTF-8'); ?></span></td>
                                        <td class="col-action col-action-delete">
                                            <button
                                                type="button"
                                                class="btn danger-btn quota-btn js-delete-event"
                                                data-event-id="<?= (int) $event['id']; ?>"
                                                data-event-name="<?= htmlspecialchars($event['name'], ENT_QUOTES, 'UTF-8'); ?>"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                        </tbody>
                    </table>
                    </div>
                    <div class="bulk-update-bar">
                        <button type="submit" name="save_all_events" class="btn">Update All Events</button>
                    </div>
                </form>
            <?php endif; ?>
        </section>

    </main>
    <div class="confirm-overlay" id="deleteConfirmOverlay" hidden>
        <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="deleteConfirmTitle">
            <span class="eyebrow">Confirm Delete</span>
            <h3 id="deleteConfirmTitle">Delete Event?</h3>
            <p id="deleteConfirmMessage">This action will remove the selected event.</p>
            <form method="post" id="deleteConfirmForm">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="delete_event" id="deleteConfirmEventId" value="">
                <div class="confirm-actions">
                    <button type="button" class="btn danger-btn" id="deleteConfirmCancel">Cancel</button>
                    <button type="submit" class="btn">Delete Event</button>
                </div>
            </form>
        </div>
    </div>
    <script>
        (function () {
            const overlay = document.getElementById('deleteConfirmOverlay');
            const message = document.getElementById('deleteConfirmMessage');
            const eventIdInput = document.getElementById('deleteConfirmEventId');
            const cancelButton = document.getElementById('deleteConfirmCancel');
            const triggerButtons = document.querySelectorAll('.js-delete-event');

            if (!overlay || !message || !eventIdInput || !cancelButton || triggerButtons.length === 0) {
                return;
            }

            let lastTrigger = null;

            const closeDialog = () => {
                overlay.hidden = true;
                document.body.classList.remove('modal-open');
                eventIdInput.value = '';
                if (lastTrigger) {
                    lastTrigger.focus();
                }
            };

            triggerButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    const eventId = button.getAttribute('data-event-id') || '';
                    const eventName = button.getAttribute('data-event-name') || 'this event';

                    lastTrigger = button;
                    eventIdInput.value = eventId;
                    message.textContent = `Delete "${eventName}"? This action will remove the event and clear linked registrations.`;
                    document.body.classList.add('modal-open');
                    overlay.hidden = false;
                    cancelButton.focus();
                });
            });

            cancelButton.addEventListener('click', closeDialog);

            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    closeDialog();
                }
            });

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && !overlay.hidden) {
                    closeDialog();
                }
            });
        })();
    </script>
</body>
</html>
