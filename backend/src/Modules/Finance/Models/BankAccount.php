<?php

namespace App\Modules\Finance\Models;

use App\Core\Model;
use App\Core\TableNames;

class BankAccount extends Model
{
    protected string $table = TableNames::BANK_ACCOUNTS;

    public function createAccount(array $data): string
    {
        $data['id'] = $this->generateUUID();
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        return $this->create($data);
    }

    public function findByFamilyId(string $familyId): array
    {
        return $this->findAll(['family_id' => $familyId]);
    }

    public function updateBalance(string $id, float $amount, string $type): bool
    {
        $account = $this->findById($id);
        if (!$account) return false;

        $newBalance = $type === 'income' 
            ? $account['balance'] + $amount 
            : $account['balance'] - $amount;

        return $this->update($id, ['balance' => $newBalance]);
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
