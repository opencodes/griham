<?php

namespace App\Modules\Finance\Models;

use App\Core\Model;
use App\Core\TableNames;

class Transaction extends Model
{
    protected string $table = TableNames::TRANSACTIONS;

    public function createTransaction(array $data): string
    {
        $data['id'] = $this->generateUUID();
        $data['created_at'] = date('Y-m-d H:i:s');

        $columns = array_keys($data);
        $placeholders = array_map(fn($c) => ":$c", $columns);

        $sql = sprintf(
            "INSERT INTO %s (%s) VALUES (%s)",
            $this->table,
            implode(', ', $columns),
            implode(', ', $placeholders)
        );

        $stmt = $this->db->prepare($sql);
        $stmt->execute($data);

        return $data['id'];
    }

    public function findByFamilyId(string $familyId, array $filters = []): array
    {
        $sql = "SELECT t.*, ba.account_name, ba.bank_name, u.full_name as created_by_name
                FROM " . TableNames::TRANSACTIONS . " t
                LEFT JOIN " . TableNames::BANK_ACCOUNTS . " ba ON t.account_id = ba.id
                LEFT JOIN " . TableNames::USERS . " u ON t.created_by = u.id
                WHERE t.family_id = :family_id";

        $params = [':family_id' => $familyId];

        if (!empty($filters['type'])) {
            $sql .= " AND t.type = :type";
            $params[':type'] = $filters['type'];
        }

        if (!empty($filters['category'])) {
            $sql .= " AND t.category = :category";
            $params[':category'] = $filters['category'];
        }

        if (!empty($filters['month'])) {
            $sql .= " AND DATE_FORMAT(t.transaction_date, '%Y-%m') = :month";
            $params[':month'] = $filters['month'];
        }

        $sql .= " ORDER BY t.transaction_date DESC, t.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getMonthlySummary(string $familyId, string $month): array
    {
        $sql = "SELECT 
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
                FROM " . TableNames::TRANSACTIONS . "
                WHERE family_id = :family_id 
                AND DATE_FORMAT(transaction_date, '%Y-%m') = :month";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':family_id' => $familyId, ':month' => $month]);
        return $stmt->fetch() ?: ['total_income' => 0, 'total_expense' => 0];
    }

    private function generateUUID(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );
    }
}
