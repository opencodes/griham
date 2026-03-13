<?php

namespace App\Modules\RBAC\Models;

use App\Core\Model;
use App\Core\TableNames;

class Permission extends Model
{
    protected string $table = TableNames::RBAC_PERMISSIONS;

    public function createPermission(array $data): string
    {
        $data['id'] = $this->generateUUID();
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        return $this->create($data);
    }

    public function getRoleIds(string $permissionId): array
    {
        $sql = "SELECT role_id FROM " . TableNames::RBAC_ROLE_PERMISSIONS . " WHERE permission_id = :permission_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':permission_id' => $permissionId]);
        return array_column($stmt->fetchAll(\PDO::FETCH_ASSOC), 'role_id');
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
