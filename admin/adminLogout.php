<?php
require_once '../db/app.php';

destroy_active_session();
header("Location: ../index.php");
exit;
