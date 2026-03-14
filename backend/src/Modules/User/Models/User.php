<?php

namespace App\Modules\User\Models;

use App\Core\Model;
use App\Core\TableNames;

class User extends Model
{
    protected string $table = TableNames::USERS;

    public function createUser(array $data): string
    {
        $data['id'] = $this->generateUUID();
        $data['is_active'] = true;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        // Hash the password
        $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        
        return $this->create($data);
    }

    public function findByEmail(string $email): ?array
    {
        return $this->findOne(['email' => $email]);
    }

    public function verifyPassword(string $password, string $hash): bool
    {
        // Legacy/seeded SHA-256 hex hashes (e.g., from SQL SHA2)
        if (strlen($hash) === 64 && ctype_xdigit($hash)) {
            return hash('sha256', $password) === strtolower($hash);
        }

        return password_verify($password, $hash);
    }

    public function updatePassword(string $userId, string $newPassword): bool
    {
        $hash = password_hash($newPassword, PASSWORD_BCRYPT);
        return $this->update($userId, [
            'password' => $hash,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
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
