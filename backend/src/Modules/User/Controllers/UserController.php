<?php

namespace App\Modules\User\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\TableNames;
use App\Modules\User\Models\User;

class UserController
{
    private User $userModel;

    public function __construct()
    {
        $this->userModel = new User();
    }

    private function requireRoot($currentUser): void
    {
        $requester = $this->userModel->findById($currentUser->userId);
        if (!$requester || ($requester['role'] ?? '') !== 'root') {
            Response::error('Forbidden', 403);
        }
    }

    public function listUsers($currentUser): void
    {
        $this->requireRoot($currentUser);

        $db = Database::getConnection();
        $sql = "SELECT u.*, r.id as rbac_role_id, r.name as rbac_role_name
                FROM " . TableNames::USERS . " u
                LEFT JOIN " . TableNames::RBAC_USER_ROLES . " ur ON u.id = ur.user_id
                LEFT JOIN " . TableNames::RBAC_ROLES . " r ON ur.role_id = r.id";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($users as &$user) {
            unset($user['password']);
        }

        Response::success($users);
    }

    public function createAdmin($currentUser): void
    {
        $this->requireRoot($currentUser);

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $fullName = trim((string) ($data['full_name'] ?? ''));
        $phone = isset($data['phone']) ? trim((string) $data['phone']) : null;
        $rbacRoleId = isset($data['rbac_role_id']) ? trim((string) $data['rbac_role_id']) : '';
        $rbacRoleName = isset($data['rbac_role_name']) ? trim((string) $data['rbac_role_name']) : '';

        if ($email === '' || $password === '' || $fullName === '') {
            Response::error('Email, password, and full name are required', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format', 400);
        }

        if (strlen($password) < 6) {
            Response::error('Password must be at least 6 characters', 400);
        }

        $existingUser = $this->userModel->findByEmail($email);
        if ($existingUser) {
            Response::error('Email already registered', 409);
        }

        $db = Database::getConnection();
        $roleRow = null;
        if ($rbacRoleId !== '') {
            $stmt = $db->prepare("SELECT id, name FROM " . TableNames::RBAC_ROLES . " WHERE id = :id");
            $stmt->execute([':id' => $rbacRoleId]);
            $roleRow = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
            if (!$roleRow) {
                Response::error('RBAC role not found', 404);
            }
        } else {
            $roleName = $rbacRoleName !== '' ? $rbacRoleName : 'admin';
            $stmt = $db->prepare("SELECT id, name FROM " . TableNames::RBAC_ROLES . " WHERE name = :name");
            $stmt->execute([':name' => $roleName]);
            $roleRow = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
            if (!$roleRow) {
                Response::error('RBAC role is required (admin role not found)', 400);
            }
        }

        $passwordHash = hash('sha256', $password);

        $userId = $this->userModel->createUser([
            'email' => $email,
            'password' => $passwordHash,
            'full_name' => $fullName,
            'phone' => $phone,
            'role' => 'user',
        ]);

        if ($roleRow) {
            $stmt = $db->prepare(
                "INSERT INTO " . TableNames::RBAC_USER_ROLES . " (user_id, role_id) VALUES (:user_id, :role_id)"
            );
            $stmt->execute([':user_id' => $userId, ':role_id' => $roleRow['id']]);
        }

        $user = $this->userModel->findById($userId);
        unset($user['password']);

        if ($roleRow) {
            $user['rbac_role_id'] = $roleRow['id'];
            $user['rbac_role_name'] = $roleRow['name'];
        }

        Response::success($user, 'User created with RBAC role', 201);
    }

    public function resetPassword($currentUser, string $userId): void
    {
        $this->requireRoot($currentUser);

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $newPassword = (string) ($data['new_password'] ?? '');
        if ($newPassword === '') {
            Response::error('New password is required', 400);
        }
        if (strlen($newPassword) < 6) {
            Response::error('New password must be at least 6 characters', 400);
        }

        $user = $this->userModel->findById($userId);
        if (!$user) {
            Response::error('User not found', 404);
        }

        $this->userModel->updatePassword($userId, $newPassword);
        Response::success(null, 'Password reset successfully');
    }
}
