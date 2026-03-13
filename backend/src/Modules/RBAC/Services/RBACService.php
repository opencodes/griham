<?php

namespace App\Modules\RBAC\Services;

use App\Core\Database;
use App\Core\TableNames;
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
                FROM " . TableNames::RBAC_ROLES . " r
                INNER JOIN " . TableNames::RBAC_USER_ROLES . " ur ON r.id = ur.role_id
                WHERE ur.user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getPermissionsForUser(string $userId): array
    {
        $sql = "SELECT DISTINCT p.id, p.name, p.resource, p.action
                FROM " . TableNames::RBAC_PERMISSIONS . " p
                INNER JOIN " . TableNames::RBAC_ROLE_PERMISSIONS . " rp ON p.id = rp.permission_id
                INNER JOIN " . TableNames::RBAC_USER_ROLES . " ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getGroupIdsForUser(string $userId): array
    {
        $sql = "SELECT group_id FROM " . TableNames::RBAC_USER_GROUPS . " WHERE user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        return array_column($stmt->fetchAll(\PDO::FETCH_ASSOC), 'group_id');
    }

    public function userHasPermission(string $userId, string $resource, string $action): bool
    {
        $stmt = $this->db->prepare("SELECT role FROM " . TableNames::USERS . " WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $role = $stmt->fetchColumn();
        if ($role === 'root') {
            return true;
        }

        $sql = "SELECT 1
                FROM " . TableNames::RBAC_USER_ROLES . " ur
                INNER JOIN " . TableNames::RBAC_ROLE_PERMISSIONS . " rp ON ur.role_id = rp.role_id
                INNER JOIN " . TableNames::RBAC_PERMISSIONS . " p ON p.id = rp.permission_id
                WHERE ur.user_id = :user_id AND p.resource = :resource AND p.action = :action
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':resource' => $resource,
            ':action' => $action,
        ]);
        if ($stmt->fetchColumn()) {
            return true;
        }

        $sql = "SELECT 1
                FROM " . TableNames::RBAC_USER_GROUPS . " ug
                INNER JOIN " . TableNames::RBAC_GROUP_ROLES . " gr ON ug.group_id = gr.group_id
                INNER JOIN " . TableNames::RBAC_ROLE_PERMISSIONS . " rp ON gr.role_id = rp.role_id
                INNER JOIN " . TableNames::RBAC_PERMISSIONS . " p ON p.id = rp.permission_id
                WHERE ug.user_id = :user_id AND p.resource = :resource AND p.action = :action
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':resource' => $resource,
            ':action' => $action,
        ]);

        return (bool) $stmt->fetchColumn();
    }
}
