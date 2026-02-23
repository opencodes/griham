<?php

namespace App\Middleware;

use App\Utils\JWT;
use App\Core\Response;

class AuthMiddleware
{
    public static function handle(): ?object
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;

        if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            Response::error('Unauthorized - No token provided', 401);
        }

        $token = $matches[1];
        $decoded = JWT::decode($token);

        if (!$decoded) {
            Response::error('Unauthorized - Invalid token', 401);
        }

        return $decoded;
    }
}
