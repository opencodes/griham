<?php

namespace App\Modules\RBAC\Services;

use App\Core\Database;
use PDO;

/**
 * Resolves roles and permissions for a user (from user_roles + role_permissions).
 * Root user (users.role = 'root') is not expanded from RBAC tables; they have full access by convention.
 */
class RBACService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function getRolesForUser(string $userId): array
    {
        $sql = "SELECT r.id, r.name, r.description
                FROM roles r
                INNER JOIN user_roles ur ON r.id = ur.role_id
                WHERE ur.user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getPermissionsForUser(string $userId): array
    {
        $sql = "SELECT DISTINCT p.id, p.name, p.resource, p.action
                FROM permissions p
                INNER JOIN role_permissions rp ON p.id = rp.permission_id
                INNER JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getGroupIdsForUser(string $userId): array
    {
        $sql = "SELECT group_id FROM user_groups WHERE user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        return array_column($stmt->fetchAll(\PDO::FETCH_ASSOC), 'group_id');
    }
}
