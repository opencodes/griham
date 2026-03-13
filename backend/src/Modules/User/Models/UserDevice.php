<?php

namespace App\Modules\User\Models;

use App\Core\Model;
use App\Core\TableNames;

class UserDevice extends Model
{
    protected string $table = TableNames::USER_DEVICES;

    public function upsertLoginDevice(string $userId, array $device): void
    {
        $deviceId = trim((string)($device['device_id'] ?? ''));
        if ($deviceId === '') {
            return;
        }

        $sql = "INSERT INTO {$this->table}
                (id, user_id, device_id, device_name, platform, os_version, app_version, last_login_at, created_at, updated_at)
                VALUES
                (:id, :user_id, :device_id, :device_name, :platform, :os_version, :app_version, :last_login_at, :created_at, :updated_at)
                ON DUPLICATE KEY UPDATE
                    device_name = VALUES(device_name),
                    platform = VALUES(platform),
                    os_version = VALUES(os_version),
                    app_version = VALUES(app_version),
                    last_login_at = VALUES(last_login_at),
                    updated_at = VALUES(updated_at)";

        $now = date('Y-m-d H:i:s');
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':id' => $this->generateUUID(),
            ':user_id' => $userId,
            ':device_id' => substr($deviceId, 0, 100),
            ':device_name' => $this->nullOrTrim($device['device_name'] ?? null, 120),
            ':platform' => $this->nullOrTrim($device['platform'] ?? null, 40),
            ':os_version' => $this->nullOrTrim($device['os_version'] ?? null, 255),
            ':app_version' => $this->nullOrTrim($device['app_version'] ?? null, 40),
            ':last_login_at' => $now,
            ':created_at' => $now,
            ':updated_at' => $now,
        ]);
    }

    private function nullOrTrim($value, int $maxLen): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim((string)$value);
        if ($trimmed === '') {
            return null;
        }
        return substr($trimmed, 0, $maxLen);
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
