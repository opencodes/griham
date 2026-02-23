<?php

namespace App\Modules\Family\Models;

use App\Core\Model;

class FamilyMember extends Model
{
    protected string $table = 'family_members';

    public function addMember(array $data): string
    {
        $data['id'] = $this->generateUUID();
        $data['joined_at'] = date('Y-m-d H:i:s');
        return $this->create($data);
    }

    public function findOne(array $conditions): ?array
    {
        $where = [];
        $params = [];
        foreach ($conditions as $key => $value) {
            $where[] = "$key = :$key";
            $params[":$key"] = $value;
        }

        $sql = "SELECT * FROM {$this->table} WHERE " . implode(' AND ', $where) . " LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function findByFamilyId(string $familyId): array
    {
        $sql = "SELECT fm.*, u.email as user_email, u.full_name 
                FROM family_members fm
                LEFT JOIN users u ON fm.user_id = u.id
                WHERE fm.family_id = :family_id
                ORDER BY fm.status ASC, fm.joined_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':family_id' => $familyId]);
        return $stmt->fetchAll();
    }

    public function isUserMember(string $userId, string $familyId): bool
    {
        $member = $this->findOne([
            'user_id' => $userId,
            'family_id' => $familyId
        ]);
        return $member !== null;
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
