<?php

namespace App\Modules\Family\Models;

use App\Core\Model;
use App\Core\TableNames;

class Family extends Model
{
    protected string $table = TableNames::FAMILIES;

    public function createFamily(array $data): string
    {
        $data['id'] = $this->generateUUID();
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        return $this->create($data);
    }

    public function findByUserId(string $userId): array
    {
        $sql = "SELECT f.* FROM " . TableNames::FAMILIES . " f
                INNER JOIN " . TableNames::FAMILY_MEMBERS . " fm ON f.id = fm.family_id
                WHERE fm.user_id = :user_id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll();
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
