<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use App\Core\Response;
use App\Middleware\AuthMiddleware;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Family\Controllers\FamilyController;
use App\Modules\Finance\Controllers\BankAccountController;
use App\Modules\Finance\Controllers\TransactionController;
use App\Modules\Finance\Controllers\BillController;
use App\Modules\Finance\Controllers\CardController;
use App\Modules\AI\Controllers\AIController;
use App\Modules\User\Controllers\UserController;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$allowed_origins = array_map('trim', explode(',', $_ENV['CORS_ORIGIN'] ?? ''));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$is_allowed = false;

if ($origin) {
    // First, check for an exact match
    if (in_array($origin, $allowed_origins, true)) {
        $is_allowed = true;
    } else {
        // If no exact match, check for flexible localhost origins
        $is_localhost_request = preg_match('/^https?:\/\/localhost(:\d+)?$/', $origin);
        $localhost_allowed = in_array('http://localhost', $allowed_origins, true) || in_array('https://localhost', $allowed_origins, true);

        if ($is_localhost_request && $localhost_allowed) {
            $is_allowed = true;
        }
    }
}

if ($is_allowed) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: ' . ($_ENV['CORS_ORIGIN'] ?? '*'));
}
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
        } elseif ($path === '/admin/users' && $method === 'GET') {
            (new UserController())->listUsers($currentUser);
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
        } elseif (preg_match('/^\/families\/([a-f0-9-]+)\/members\/([a-f0-9-]+)$/', $path, $matches) && $method === 'PUT') {
            (new FamilyController())->updateMember($currentUser, $matches[1], $matches[2]);
        } elseif (preg_match('/^\/households\/([a-f0-9-]+)$/', $path, $matches) && $method === 'GET') {
            (new FamilyController())->get($currentUser, $matches[1]);
        } elseif (preg_match('/^\/households\/([a-f0-9-]+)$/', $path, $matches) && $method === 'PUT') {
            (new FamilyController())->update($currentUser, $matches[1]);
        } elseif (preg_match('/^\/households\/([a-f0-9-]+)\/members$/', $path, $matches) && $method === 'GET') {
            (new FamilyController())->listMembers($currentUser, $matches[1]);
        } elseif (preg_match('/^\/households\/([a-f0-9-]+)\/members$/', $path, $matches) && $method === 'POST') {
            (new FamilyController())->addMember($currentUser, $matches[1]);
        } elseif ($path === '/finance/accounts' && $method === 'POST') {
            (new BankAccountController())->create($currentUser);
        } elseif (preg_match('/^\/finance\/accounts\/([a-f0-9-]+)$/', $path, $matches) && $method === 'GET') {
            (new BankAccountController())->list($currentUser, $matches[1]);
        } elseif (preg_match('/^\/finance\/accounts\/([a-f0-9-]+)\/([a-f0-9-]+)$/', $path, $matches) && $method === 'PUT') {
            (new BankAccountController())->update($currentUser, $matches[2]);
        } elseif (preg_match('/^\/finance\/accounts\/([a-f0-9-]+)\/([a-f0-9-]+)$/', $path, $matches) && $method === 'DELETE') {
            (new BankAccountController())->delete($currentUser, $matches[2]);
        } elseif ($path === '/finance/transactions' && $method === 'POST') {
            (new TransactionController())->create($currentUser);
        } elseif (preg_match('/^\/finance\/transactions\/([a-f0-9-]+)$/', $path, $matches) && $method === 'GET') {
            (new TransactionController())->list($currentUser, $matches[1]);
        } elseif (preg_match('/^\/finance\/transactions\/([a-f0-9-]+)\/summary$/', $path, $matches) && $method === 'GET') {
            (new TransactionController())->summary($currentUser, $matches[1]);
        } elseif (preg_match('/^\/finance\/transactions\/([a-f0-9-]+)\/([a-f0-9-]+)$/', $path, $matches) && $method === 'DELETE') {
            (new TransactionController())->delete($currentUser, $matches[2]);
        } elseif ($path === '/finance/bills' && $method === 'POST') {
            (new BillController())->create($currentUser);
        } elseif (preg_match('/^\/finance\/bills\/([a-f0-9-]+)$/', $path, $matches) && $method === 'GET') {
            (new BillController())->list($currentUser, $matches[1]);
        } elseif (preg_match('/^\/finance\/bills\/([a-f0-9-]+)\/upcoming$/', $path, $matches) && $method === 'GET') {
            (new BillController())->upcoming($currentUser, $matches[1]);
        } elseif (preg_match('/^\/finance\/bills\/([a-f0-9-]+)\/([a-f0-9-]+)$/', $path, $matches) && $method === 'PUT') {
            (new BillController())->update($currentUser, $matches[2]);
        } elseif (preg_match('/^\/finance\/bills\/([a-f0-9-]+)\/([a-f0-9-]+)$/', $path, $matches) && $method === 'DELETE') {
            (new BillController())->delete($currentUser, $matches[2]);
        } elseif (preg_match('/^\/finance\/ai\/insights\/([a-f0-9-]+)$/', $path, $matches) && $method === 'GET') {
            (new AIController())->getFinanceInsights($currentUser, $matches[1]);
        } elseif (preg_match('/^\/finance\/ai\/savings-tips\/([a-f0-9-]+)$/', $path, $matches) && $method === 'GET') {
            (new AIController())->getSavingsTips($currentUser, $matches[1]);
        } elseif (preg_match('/^\/finance\/ai\/parse-sms\/([a-f0-9-]+)$/', $path, $matches) && $method === 'POST') { // /finance/ai/parse-sms/{accountId}
            (new AIController())->parseSMS($currentUser, $matches[1]);
        } elseif (preg_match('/^\/finance\/ai\/parse-sms-card\/([a-f0-9-]+)$/', $path, $matches) && $method === 'POST') {
            (new AIController())->parseSMSCard($currentUser, $matches[1]);
        } elseif ($path === '/finance/cards' && $method === 'POST') {
            (new CardController())->create($currentUser);
        } elseif (preg_match('/^\/finance\/cards\/([a-f0-9-]+)$/', $path, $matches) && $method === 'GET') {
            (new CardController())->list($currentUser, $matches[1]);
        } elseif (preg_match('/^\/finance\/cards\/([a-f0-9-]+)\/([a-f0-9-]+)$/', $path, $matches) && $method === 'PUT') {
            (new CardController())->update($currentUser, $matches[2]);
        } elseif (preg_match('/^\/finance\/cards\/([a-f0-9-]+)\/([a-f0-9-]+)$/', $path, $matches) && $method === 'DELETE') {
            (new CardController())->delete($currentUser, $matches[2]);
        } else {
            Response::error('Route not found', 404);
        }
    }
} catch (\Exception $e) {
    Response::error($e->getMessage(), 500);
}
