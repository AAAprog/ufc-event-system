<?php
require_once '../db/config.php';
require_once '../db/app.php';

ensure_session_started();

if (!isset($_SESSION['admin'])) {
    header("Location: adminLogin.php");
    exit;
}

$search = trim($_GET['q'] ?? '');
$flash = pull_flash_message();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete_user') {
    require_valid_csrf_token($_POST['csrf_token'] ?? null);

    $userId = (int) ($_POST['id'] ?? 0);
    $currentSearch = trim($_POST['current_search'] ?? '');
    $message = 'Invalid user selected.';
    $type = 'status-error';

    if ($userId > 0) {
        mysqli_begin_transaction($conn);

        try {
            $userStmt = mysqli_prepare(
                $conn,
                "SELECT registered_event FROM users WHERE id = ? FOR UPDATE"
            );
            mysqli_stmt_bind_param($userStmt, "i", $userId);
            mysqli_stmt_execute($userStmt);
            $userResult = mysqli_stmt_get_result($userStmt);
            $userData = mysqli_fetch_assoc($userResult);
            mysqli_stmt_close($userStmt);

            if (!$userData) {
                throw new RuntimeException('User not found.');
            }

            $eventId = $userData['registered_event'] !== null ? (int) $userData['registered_event'] : null;

            if ($eventId !== null && $eventId > 0) {
                $eventStmt = mysqli_prepare(
                    $conn,
                    "UPDATE events SET registered_count = GREATEST(registered_count - 1, 0) WHERE id = ?"
                );
                mysqli_stmt_bind_param($eventStmt, "i", $eventId);
                mysqli_stmt_execute($eventStmt);
                mysqli_stmt_close($eventStmt);
            }

            $deleteStmt = mysqli_prepare($conn, "DELETE FROM users WHERE id = ?");
            mysqli_stmt_bind_param($deleteStmt, "i", $userId);
            mysqli_stmt_execute($deleteStmt);
            $deletedRows = mysqli_stmt_affected_rows($deleteStmt);
            mysqli_stmt_close($deleteStmt);

            if ($deletedRows !== 1) {
                throw new RuntimeException('Failed to delete the user.');
            }

            mysqli_commit($conn);
            $message = 'User deleted successfully.';
            $type = 'status-success';
        } catch (Throwable $exception) {
            mysqli_rollback($conn);
            $message = $exception->getMessage();
        }
    }

    $redirectQuery = [];
    if ($currentSearch !== '') {
        $redirectQuery['q'] = $currentSearch;
    }
    set_flash_message($message, $type);

    header('Location: manage_users.php?' . http_build_query($redirectQuery));
    exit;
}

$totalUsersResult = mysqli_query($conn, "SELECT COUNT(*) AS total FROM users");
$totalUsers = (int) mysqli_fetch_assoc($totalUsersResult)['total'];

$registeredUsersResult = mysqli_query(
    $conn,
    "SELECT COUNT(*) AS total FROM users WHERE registered_event IS NOT NULL"
);
$registeredUsers = (int) mysqli_fetch_assoc($registeredUsersResult)['total'];

$query = "
    SELECT users.id, users.username, users.email, users.gender, users.nationality, events.name AS event_name
    FROM users
    LEFT JOIN events ON users.registered_event = events.id
";
$types = '';
$params = [];

if ($search !== '') {
    $query .= " WHERE users.username LIKE ? OR users.email LIKE ? OR users.nationality LIKE ? ";
    $searchTerm = '%' . $search . '%';
    $types = 'sss';
    $params = [$searchTerm, $searchTerm, $searchTerm];
}

$query .= " ORDER BY users.username";

if ($params !== []) {
    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, $types, ...$params);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
} else {
    $result = mysqli_query($conn, $query);
}

$users = [];
while ($row = mysqli_fetch_assoc($result)) {
    $users[] = $row;
}

if (isset($stmt)) {
    mysqli_stmt_close($stmt);
}

$filteredCount = count($users);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Users</title>
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
            <a href="manage_events.php">Events</a>
            <a href="adminLogout.php">Logout</a>
        </nav>
    </header>

    <main class="panel-shell manage-users-shell animate-in">
        <?php if (is_array($flash) && !empty($flash['message'])): ?>
            <p class="status-message <?= htmlspecialchars($flash['type'] ?? 'status-success', ENT_QUOTES, 'UTF-8'); ?>">
                <?= htmlspecialchars($flash['message'], ENT_QUOTES, 'UTF-8'); ?>
            </p>
        <?php endif; ?>

        <section class="users-hero">
            <div class="intro-card">
                <span class="eyebrow">Users</span>
                <h1>Manage Users</h1>
                <p>Search the roster, review registrations, and remove accounts from one control screen instead of bouncing across separate pages.</p>
                <div class="users-meta">
                    <span>Signed in as <?= htmlspecialchars($_SESSION['admin'], ENT_QUOTES, 'UTF-8'); ?></span>
                    <span>User operations ready</span>
                </div>
                <div class="users-stats">
                    <div class="users-stat">
                        <span class="users-stat-label">Total Users</span>
                        <strong class="users-stat-value"><?= $totalUsers; ?></strong>
                    </div>
                    <div class="users-stat">
                        <span class="users-stat-label">Event Registrations</span>
                        <strong class="users-stat-value"><?= $registeredUsers; ?></strong>
                    </div>
                    <div class="users-stat">
                        <span class="users-stat-label">Current Results</span>
                        <strong class="users-stat-value"><?= $filteredCount; ?></strong>
                    </div>
                </div>
            </div>

            <section class="search-card" id="search-directory">
                <h2>Search Directory</h2>
                <p>Filter by username, email, or nationality, then delete users directly from the table when needed.</p>
                <form method="get" class="search-form">
                    <div class="form-group">
                        <label for="q">Find A User</label>
                        <input
                            type="text"
                            id="q"
                            name="q"
                            placeholder="Username, email, or nationality"
                            value="<?= htmlspecialchars($search, ENT_QUOTES, 'UTF-8'); ?>"
                        >
                    </div>
                    <div class="search-actions">
                        <input type="submit" value="Search">
                        <a href="manage_users.php" class="btn danger-btn">Clear Filter</a>
                        <a href="adminDashboard.php" class="btn danger-btn">Back to Dashboard</a>
                    </div>
                </form>
            </section>
        </section>

        <section class="user-table-card">
            <div class="table-head">
                <div>
                    <span class="eyebrow">Directory</span>
                    <h2>User Command Table</h2>
                </div>
                <p><?= $search !== '' ? 'Filtered results for "' . htmlspecialchars($search, ENT_QUOTES, 'UTF-8') . '"' : 'Showing all registered users'; ?></p>
            </div>

            <?php if ($filteredCount === 0): ?>
                <div class="empty-state">
                    <h3>No users found</h3>
                    <p>Try a different search term or clear the filter to view the full directory.</p>
                </div>
            <?php else: ?>
                <div class="users-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Gender</th>
                                <th>Nationality</th>
                                <th>Event</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($users as $user): ?>
                                <tr>
                                    <td><?= (int) $user['id']; ?></td>
                                    <td><?= htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td><?= htmlspecialchars($user['email'], ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td><?= htmlspecialchars($user['gender'], ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td><?= htmlspecialchars($user['nationality'], ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td><?= htmlspecialchars($user['event_name'] ?? 'Not registered', ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td>
                                        <form method="post" class="table-inline-form">
                                            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                                            <input type="hidden" name="action" value="delete_user">
                                            <input type="hidden" name="id" value="<?= (int) $user['id']; ?>">
                                            <input type="hidden" name="current_search" value="<?= htmlspecialchars($search, ENT_QUOTES, 'UTF-8'); ?>">
                                            <button
                                                type="button"
                                                class="btn danger-btn delete-btn js-delete-user"
                                                data-user-id="<?= (int) $user['id']; ?>"
                                                data-username="<?= htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8'); ?>"
                                                data-current-search="<?= htmlspecialchars($search, ENT_QUOTES, 'UTF-8'); ?>"
                                            >
                                                Delete
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </section>
    </main>
    <div class="confirm-overlay" id="deleteUserConfirmOverlay" hidden>
        <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="deleteUserConfirmTitle">
            <span class="eyebrow">Confirm Delete</span>
            <h3 id="deleteUserConfirmTitle">Delete User?</h3>
            <p id="deleteUserConfirmMessage">This action will remove the selected user.</p>
            <form method="post" id="deleteUserConfirmForm">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="action" value="delete_user">
                <input type="hidden" name="id" id="deleteUserConfirmId" value="">
                <input type="hidden" name="current_search" id="deleteUserConfirmSearch" value="">
                <div class="confirm-actions">
                    <button type="button" class="btn danger-btn" id="deleteUserConfirmCancel">Cancel</button>
                    <button type="submit" class="btn">Delete User</button>
                </div>
            </form>
        </div>
    </div>
    <script>
        (function () {
            const overlay = document.getElementById('deleteUserConfirmOverlay');
            const message = document.getElementById('deleteUserConfirmMessage');
            const userIdInput = document.getElementById('deleteUserConfirmId');
            const currentSearchInput = document.getElementById('deleteUserConfirmSearch');
            const cancelButton = document.getElementById('deleteUserConfirmCancel');
            const triggerButtons = document.querySelectorAll('.js-delete-user');

            if (!overlay || !message || !userIdInput || !currentSearchInput || !cancelButton || triggerButtons.length === 0) {
                return;
            }

            let lastTrigger = null;

            const closeDialog = () => {
                overlay.hidden = true;
                document.body.classList.remove('modal-open');
                userIdInput.value = '';
                currentSearchInput.value = '';
                if (lastTrigger) {
                    lastTrigger.focus();
                }
            };

            triggerButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    const userId = button.getAttribute('data-user-id') || '';
                    const username = button.getAttribute('data-username') || 'this user';
                    const currentSearch = button.getAttribute('data-current-search') || '';

                    lastTrigger = button;
                    userIdInput.value = userId;
                    currentSearchInput.value = currentSearch;
                    message.textContent = `Delete "${username}"? This action will remove the account and clear any linked registration.`;
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
