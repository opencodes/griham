<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use App\Core\Response;
use App\Middleware\AuthMiddleware;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Family\Controllers\FamilyController;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

header('Access-Control-Allow-Origin: ' . ($_ENV['CORS_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api', '', $path);

try {
    if ($path === '/auth/register' && $method === 'POST') {
        (new AuthController())->register();
    } elseif ($path === '/auth/login' && $method === 'POST') {
        (new AuthController())->login();
    } else {
        $currentUser = AuthMiddleware::handle();

        if ($path === '/auth/me' && $method === 'GET') {
            (new AuthController())->me($currentUser);
        } elseif ($path === '/families' && $method === 'POST') {
            (new FamilyController())->create($currentUser);
        } elseif ($path === '/families' && $method === 'GET') {
            (new FamilyController())->list($currentUser);
        } elseif (preg_match('/^\/families\/([a-f0-9-]+)$/', $path, $matches) && $method === 'GET') {
            (new FamilyController())->get($currentUser, $matches[1]);
        } elseif (preg_match('/^\/families\/([a-f0-9-]+)$/', $path, $matches) && $method === 'PUT') {
            (new FamilyController())->update($currentUser, $matches[1]);
        } elseif (preg_match('/^\/families\/([a-f0-9-]+)\/members$/', $path, $matches) && $method === 'GET') {
            (new FamilyController())->listMembers($currentUser, $matches[1]);
        } elseif (preg_match('/^\/families\/([a-f0-9-]+)\/members$/', $path, $matches) && $method === 'POST') {
            (new FamilyController())->addMember($currentUser, $matches[1]);
        } elseif (preg_match('/^\/households\/([a-f0-9-]+)$/', $path, $matches) && $method === 'GET') {
            (new FamilyController())->get($currentUser, $matches[1]);
        } elseif (preg_match('/^\/households\/([a-f0-9-]+)$/', $path, $matches) && $method === 'PUT') {
            (new FamilyController())->update($currentUser, $matches[1]);
        } elseif (preg_match('/^\/households\/([a-f0-9-]+)\/members$/', $path, $matches) && $method === 'GET') {
            (new FamilyController())->listMembers($currentUser, $matches[1]);
        } elseif (preg_match('/^\/households\/([a-f0-9-]+)\/members$/', $path, $matches) && $method === 'POST') {
            (new FamilyController())->addMember($currentUser, $matches[1]);
        } else {
            Response::error('Route not found', 404);
        }
    }
} catch (\Exception $e) {
    Response::error($e->getMessage(), 500);
}
