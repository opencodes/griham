<?php

namespace App\Modules\RBAC\Models;

use App\Core\Model;
use App\Core\TableNames;

class Group extends Model
{
    protected string $table = TableNames::RBAC_GROUPS;

    public function createGroup(array $data): string
    {
        $data['id'] = $this->generateUUID();
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        return $this->create($data);
    }

    public function getMemberIds(string $groupId): array
    {
        $sql = "SELECT user_id FROM " . TableNames::RBAC_USER_GROUPS . " WHERE group_id = :group_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':group_id' => $groupId]);
        return array_column($stmt->fetchAll(\PDO::FETCH_ASSOC), 'user_id');
    }

    public function addMember(string $groupId, string $userId): void
    {
        $stmt = $this->db->prepare("INSERT IGNORE INTO " . TableNames::RBAC_USER_GROUPS . " (user_id, group_id) VALUES (:user_id, :group_id)");
        $stmt->execute([':user_id' => $userId, ':group_id' => $groupId]);
    }

    public function removeMember(string $groupId, string $userId): void
    {
        $stmt = $this->db->prepare("DELETE FROM " . TableNames::RBAC_USER_GROUPS . " WHERE group_id = :group_id AND user_id = :user_id");
        $stmt->execute([':group_id' => $groupId, ':user_id' => $userId]);
    }

    public function setMembers(string $groupId, array $userIds): void
    {
        $stmt = $this->db->prepare("DELETE FROM " . TableNames::RBAC_USER_GROUPS . " WHERE group_id = :group_id");
        $stmt->execute([':group_id' => $groupId]);
        foreach ($userIds as $uid) {
            $stmt = $this->db->prepare("INSERT INTO " . TableNames::RBAC_USER_GROUPS . " (user_id, group_id) VALUES (:user_id, :group_id)");
            $stmt->execute([':user_id' => $uid, ':group_id' => $groupId]);
        }
    }

    public function getRoleIds(string $groupId): array
    {
        $sql = "SELECT role_id FROM " . TableNames::RBAC_GROUP_ROLES . " WHERE group_id = :group_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':group_id' => $groupId]);
        return array_column($stmt->fetchAll(\PDO::FETCH_ASSOC), 'role_id');
    }

    public function setRoles(string $groupId, array $roleIds): void
    {
        $stmt = $this->db->prepare("DELETE FROM " . TableNames::RBAC_GROUP_ROLES . " WHERE group_id = :group_id");
        $stmt->execute([':group_id' => $groupId]);
        foreach ($roleIds as $rid) {
            $stmt = $this->db->prepare("INSERT INTO " . TableNames::RBAC_GROUP_ROLES . " (group_id, role_id) VALUES (:group_id, :role_id)");
            $stmt->execute([':group_id' => $groupId, ':role_id' => $rid]);
        }
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
