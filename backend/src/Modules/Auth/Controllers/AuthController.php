<?php

namespace App\Modules\Auth\Controllers;

use App\Modules\User\Models\User;
use App\Modules\User\Models\UserDevice;
use App\Modules\RBAC\Services\RBACService;
use App\Utils\JWT;
use App\Core\Response;

class AuthController
{
    private User $userModel;
    private UserDevice $userDeviceModel;
    private RBACService $rbacService;

    public function __construct()
    {
        $this->userModel = new User();
        $this->userDeviceModel = new UserDevice();
        $this->rbacService = new RBACService();
    }

    public function register(): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['email']) || !isset($data['password']) || !isset($data['full_name'])) {
            Response::error('Email, password, and full name are required', 400);
        }

        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format', 400);
        }

        if (strlen($data['password']) < 6) {
            Response::error('Password must be at least 6 characters', 400);
        }

        $existingUser = $this->userModel->findByEmail($data['email']);
        if ($existingUser) {
            Response::error('Email already registered', 409);
        }

        $passwordHash = hash('sha256', $data['password']);

        $userId = $this->userModel->createUser([
            'email' => $data['email'],
            'password' => $passwordHash,
            'full_name' => $data['full_name'],
            'role' => 'user'
        ]);

        $user = $this->userModel->findById($userId);
        unset($user['password']);

        $user['rbac_roles'] = $this->rbacService->getRolesForUser($user['id']);
        $user['rbac_permissions'] = $this->rbacService->getPermissionsForUser($user['id']);

        $token = JWT::encode(['userId' => $user['id'], 'email' => $user['email']]);

        Response::success([
            'user' => $user,
            'token' => $token
        ], 'User registered successfully', 201);
    }

    public function login(): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['email']) || !isset($data['password'])) {
            Response::error('Email and password are required', 400);
        }

        $user = $this->userModel->findByEmail($data['email']);
        if (!$user) {
            Response::error('Invalid credentials', 401);
        }

        $rawPassword = $data['password'];
        $sha2Password = hash('sha256', $rawPassword);

        $isValid = $this->userModel->verifyPassword($rawPassword, $user['password'])
            || $this->userModel->verifyPassword($sha2Password, $user['password']);

        if (!$isValid) {
            Response::error('Invalid credentials', 401);
        }

        // Track first and repeat logins per device; multiple devices per user are allowed.
        if (isset($data['device']) && is_array($data['device'])) {
            try {
                $this->userDeviceModel->upsertLoginDevice($user['id'], $data['device']);
            } catch (\Throwable $e) {
                // Device tracking should not block successful login.
            }
        }

        unset($user['password']);
        $user['rbac_roles'] = $this->rbacService->getRolesForUser($user['id']);
        $user['rbac_permissions'] = $this->rbacService->getPermissionsForUser($user['id']);

        $token = JWT::encode(['userId' => $user['id'], 'email' => $user['email']]);

        Response::success([
            'user' => $user,
            'token' => $token
        ], 'Login successful');
    }

    public function me($currentUser): void
    {
        $user = $this->userModel->findById($currentUser->userId);
        if (!$user) {
            Response::error('User not found', 404);
        }

        unset($user['password']);
        $user['rbac_roles'] = $this->rbacService->getRolesForUser($user['id']);
        $user['rbac_permissions'] = $this->rbacService->getPermissionsForUser($user['id']);
        Response::success($user);
    }

    public function changePassword($currentUser): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $currentPassword = (string) ($data['current_password'] ?? '');
        $newPassword = (string) ($data['new_password'] ?? '');

        if ($currentPassword === '' || $newPassword === '') {
            Response::error('Current password and new password are required', 400);
        }

        if (strlen($newPassword) < 6) {
            Response::error('New password must be at least 6 characters', 400);
        }

        $user = $this->userModel->findById($currentUser->userId);
        if (!$user) {
            Response::error('User not found', 404);
        }

        $isValid = $this->userModel->verifyPassword($currentPassword, $user['password'])
            || $this->userModel->verifyPassword(hash('sha256', $currentPassword), $user['password']);
        if (!$isValid) {
            Response::error('Current password is incorrect', 401);
        }

        $this->userModel->updatePassword($user['id'], $newPassword);
        Response::success(null, 'Password updated successfully');
    }

    public function resetPassword(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim((string) ($data['email'] ?? ''));
        $newPassword = (string) ($data['new_password'] ?? '');

        if ($email === '' || $newPassword === '') {
            Response::error('Email and new password are required', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format', 400);
        }

        if (strlen($newPassword) < 6) {
            Response::error('New password must be at least 6 characters', 400);
        }

        $user = $this->userModel->findByEmail($email);
        if (!$user) {
            Response::error('User not found', 404);
        }

        $this->userModel->updatePassword($user['id'], $newPassword);
        Response::success(null, 'Password reset successfully');
    }
}
