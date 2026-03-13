<?php

namespace App\Core;

final class TableNames
{
    public const USERS = 'users';
    public const USER_DEVICES = 'user_devices';
    public const FAMILIES = 'families';
    public const FAMILY_MEMBERS = 'family_members';

    public const BANK_ACCOUNTS = 'bank_accounts';
    public const TRANSACTIONS = 'transactions';
    public const BILLS = 'bills';
    public const CARDS = 'cards';
    public const SMS_INGESTION_LOGS = 'sms_ingestion_logs';

    public const RBAC_ROLES = 'rbac_roles';
    public const RBAC_PERMISSIONS = 'rbac_permissions';
    public const RBAC_ROLE_PERMISSIONS = 'rbac_role_permissions';
    public const RBAC_USER_ROLES = 'rbac_user_roles';
    public const RBAC_GROUPS = 'rbac_groups';
    public const RBAC_USER_GROUPS = 'rbac_user_groups';
    public const RBAC_GROUP_ROLES = 'rbac_group_roles';

    private function __construct()
    {
    }
}
