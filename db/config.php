<?php
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function get_database_config(): array
{
    $defaults = [
        'host' => 'localhost',
        'username' => 'root',
        'password' => '',
        'database' => 'ufc_event',
    ];

    $runtimeConfigPath = __DIR__ . '/config.runtime.php';
    if (is_file($runtimeConfigPath)) {
        $runtimeConfig = require $runtimeConfigPath;
        if (is_array($runtimeConfig)) {
            return array_merge($defaults, $runtimeConfig);
        }
    }

    return [
        'host' => getenv('DB_HOST') ?: $defaults['host'],
        'username' => getenv('DB_USER') ?: $defaults['username'],
        'password' => getenv('DB_PASS') !== false ? getenv('DB_PASS') : $defaults['password'],
        'database' => getenv('DB_NAME') ?: $defaults['database'],
    ];
}

$dbConfig = get_database_config();
$conn = mysqli_connect(
    $dbConfig['host'],
    $dbConfig['username'],
    $dbConfig['password'],
    $dbConfig['database']
);

if (!$conn) {
    error_log('Database connection failed: ' . mysqli_connect_error());
    http_response_code(500);
    exit('The service is temporarily unavailable. Please try again later.');
}

mysqli_set_charset($conn, "utf8mb4");
?>
