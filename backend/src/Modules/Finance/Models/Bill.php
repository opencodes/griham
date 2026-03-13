<?php

namespace App\Modules\Finance\Models;

use App\Core\Model;
use App\Core\TableNames;

class Bill extends Model
{
    protected string $table = TableNames::BILLS;

    public function createBill(array $data): string
    {
        $data['id'] = $this->generateUUID();
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        return $this->create($data);
    }

    public function findByFamilyId(string $familyId): array
    {
        $sql = "SELECT * FROM " . TableNames::BILLS . " 
                WHERE family_id = :family_id 
                ORDER BY due_date ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':family_id' => $familyId]);
        return $stmt->fetchAll();
    }

    public function findUpcoming(string $familyId, int $days = 7): array
    {
        $sql = "SELECT * FROM " . TableNames::BILLS . " 
                WHERE family_id = :family_id 
                AND status = 'pending'
                AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL :days DAY)
                ORDER BY due_date ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':family_id' => $familyId, ':days' => $days]);
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
