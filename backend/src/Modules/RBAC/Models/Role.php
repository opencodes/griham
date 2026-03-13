<?php

namespace App\Modules\RBAC\Models;

use App\Core\Model;

class Role extends Model
{
    protected string $table = 'roles';

    public function createRole(array $data): string
    {
        $data['id'] = $this->generateUUID();
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        return $this->create($data);
    }

    public function getPermissions(string $roleId): array
    {
        $sql = "SELECT p.id, p.name, p.resource, p.action, p.description
                FROM permissions p
                INNER JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = :role_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':role_id' => $roleId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function setPermissions(string $roleId, array $permissionIds): void
    {
        $stmt = $this->db->prepare("DELETE FROM role_permissions WHERE role_id = :role_id");
        $stmt->execute([':role_id' => $roleId]);
        foreach ($permissionIds as $pid) {
            $stmt = $this->db->prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id)");
            $stmt->execute([':role_id' => $roleId, ':permission_id' => $pid]);
        }
    }

    public function getUserIds(string $roleId): array
    {
        $sql = "SELECT user_id FROM user_roles WHERE role_id = :role_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':role_id' => $roleId]);
        return array_column($stmt->fetchAll(\PDO::FETCH_ASSOC), 'user_id');
    }

    private function generateUUID(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}
