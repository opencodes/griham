-- Seed RBAC permissions, roles, and groups for all modules.
-- Safe to run multiple times (idempotent inserts where possible).

-- Roles
INSERT INTO rbac_roles (id, name, description)
VALUES
  (UUID(), 'Admin', 'Full access to all modules'),
  (UUID(), 'Finance Manager', 'Manage finance modules'),
  (UUID(), 'Family Manager', 'Manage family module and members'),
  (UUID(), 'Events Manager', 'Manage events module'),
  (UUID(), 'Assets Manager', 'Manage assets module'),
  (UUID(), 'Health Manager', 'Manage health module'),
  (UUID(), 'Contacts Manager', 'Manage contacts module'),
  (UUID(), 'Organizer Manager', 'Manage organizer module'),
  (UUID(), 'Messages Manager', 'Manage messages module'),
  (UUID(), 'Viewer', 'Read-only access across modules')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Permissions: Family
INSERT INTO rbac_permissions (id, name, resource, action, description)
VALUES
  (UUID(), 'family.create', 'family', 'create', 'Create family'),
  (UUID(), 'family.read', 'family', 'read', 'View family'),
  (UUID(), 'family.update', 'family', 'update', 'Update family'),
  (UUID(), 'family.members.read', 'family.members', 'read', 'View family members'),
  (UUID(), 'family.members.write', 'family.members', 'write', 'Manage family members')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Permissions: Finance
INSERT INTO rbac_permissions (id, name, resource, action, description)
VALUES
  (UUID(), 'finance.accounts.read', 'finance.accounts', 'read', 'View bank accounts'),
  (UUID(), 'finance.accounts.write', 'finance.accounts', 'write', 'Create or edit bank accounts'),
  (UUID(), 'finance.transactions.read', 'finance.transactions', 'read', 'View transactions'),
  (UUID(), 'finance.transactions.write', 'finance.transactions', 'write', 'Create or edit transactions'),
  (UUID(), 'finance.transactions.delete', 'finance.transactions', 'delete', 'Delete transactions'),
  (UUID(), 'finance.bills.read', 'finance.bills', 'read', 'View bills'),
  (UUID(), 'finance.bills.write', 'finance.bills', 'write', 'Create or edit bills'),
  (UUID(), 'finance.bills.delete', 'finance.bills', 'delete', 'Delete bills'),
  (UUID(), 'finance.cards.read', 'finance.cards', 'read', 'View cards'),
  (UUID(), 'finance.cards.write', 'finance.cards', 'write', 'Create or edit cards'),
  (UUID(), 'finance.cards.delete', 'finance.cards', 'delete', 'Delete cards'),
  (UUID(), 'finance.ai.read', 'finance.ai', 'read', 'View AI finance insights'),
  (UUID(), 'finance.ai.write', 'finance.ai', 'write', 'Submit AI finance parsing requests')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Permissions: Other modules
INSERT INTO rbac_permissions (id, name, resource, action, description)
VALUES
  (UUID(), 'events.read', 'events', 'read', 'View events'),
  (UUID(), 'events.write', 'events', 'write', 'Manage events'),
  (UUID(), 'assets.read', 'assets', 'read', 'View assets'),
  (UUID(), 'assets.write', 'assets', 'write', 'Manage assets'),
  (UUID(), 'health.read', 'health', 'read', 'View health'),
  (UUID(), 'health.write', 'health', 'write', 'Manage health'),
  (UUID(), 'contacts.read', 'contacts', 'read', 'View contacts'),
  (UUID(), 'contacts.write', 'contacts', 'write', 'Manage contacts'),
  (UUID(), 'organizer.read', 'organizer', 'read', 'View organizer'),
  (UUID(), 'organizer.write', 'organizer', 'write', 'Manage organizer'),
  (UUID(), 'messages.read', 'messages', 'read', 'View messages'),
  (UUID(), 'messages.write', 'messages', 'write', 'Manage messages')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Role -> permissions
INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r
JOIN rbac_permissions p ON 1=1
WHERE r.name = 'Admin';

INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r
JOIN rbac_permissions p ON p.resource LIKE 'finance.%'
WHERE r.name = 'Finance Manager';

INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r
JOIN rbac_permissions p ON p.resource LIKE 'family%'
WHERE r.name = 'Family Manager';

INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r
JOIN rbac_permissions p ON p.resource = 'events'
WHERE r.name = 'Events Manager';

INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r
JOIN rbac_permissions p ON p.resource = 'assets'
WHERE r.name = 'Assets Manager';

INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r
JOIN rbac_permissions p ON p.resource = 'health'
WHERE r.name = 'Health Manager';

INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r
JOIN rbac_permissions p ON p.resource = 'contacts'
WHERE r.name = 'Contacts Manager';

INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r
JOIN rbac_permissions p ON p.resource = 'organizer'
WHERE r.name = 'Organizer Manager';

INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r
JOIN rbac_permissions p ON p.resource = 'messages'
WHERE r.name = 'Messages Manager';

INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r
JOIN rbac_permissions p ON p.action = 'read'
WHERE r.name = 'Viewer';

-- Groups
INSERT INTO rbac_groups (id, name, description)
SELECT UUID(), 'All Members', 'Default group for read-only access'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM rbac_groups WHERE name = 'All Members');

INSERT INTO rbac_groups (id, name, description)
SELECT UUID(), 'Finance Team', 'Users who manage finance'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM rbac_groups WHERE name = 'Finance Team');

INSERT INTO rbac_groups (id, name, description)
SELECT UUID(), 'Family Team', 'Users who manage family'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM rbac_groups WHERE name = 'Family Team');

INSERT INTO rbac_groups (id, name, description)
SELECT UUID(), 'Events Team', 'Users who manage events'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM rbac_groups WHERE name = 'Events Team');

INSERT INTO rbac_groups (id, name, description)
SELECT UUID(), 'Assets Team', 'Users who manage assets'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM rbac_groups WHERE name = 'Assets Team');

INSERT INTO rbac_groups (id, name, description)
SELECT UUID(), 'Health Team', 'Users who manage health'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM rbac_groups WHERE name = 'Health Team');

INSERT INTO rbac_groups (id, name, description)
SELECT UUID(), 'Contacts Team', 'Users who manage contacts'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM rbac_groups WHERE name = 'Contacts Team');

INSERT INTO rbac_groups (id, name, description)
SELECT UUID(), 'Organizer Team', 'Users who manage organizer'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM rbac_groups WHERE name = 'Organizer Team');

INSERT INTO rbac_groups (id, name, description)
SELECT UUID(), 'Messages Team', 'Users who manage messages'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM rbac_groups WHERE name = 'Messages Team');

-- Group -> role mappings
INSERT IGNORE INTO rbac_group_roles (group_id, role_id)
SELECT g.id, r.id
FROM rbac_groups g
JOIN rbac_roles r ON r.name = 'Viewer'
WHERE g.name = 'All Members';

INSERT IGNORE INTO rbac_group_roles (group_id, role_id)
SELECT g.id, r.id
FROM rbac_groups g
JOIN rbac_roles r ON r.name = 'Finance Manager'
WHERE g.name = 'Finance Team';

INSERT IGNORE INTO rbac_group_roles (group_id, role_id)
SELECT g.id, r.id
FROM rbac_groups g
JOIN rbac_roles r ON r.name = 'Family Manager'
WHERE g.name = 'Family Team';

INSERT IGNORE INTO rbac_group_roles (group_id, role_id)
SELECT g.id, r.id
FROM rbac_groups g
JOIN rbac_roles r ON r.name = 'Events Manager'
WHERE g.name = 'Events Team';

INSERT IGNORE INTO rbac_group_roles (group_id, role_id)
SELECT g.id, r.id
FROM rbac_groups g
JOIN rbac_roles r ON r.name = 'Assets Manager'
WHERE g.name = 'Assets Team';

INSERT IGNORE INTO rbac_group_roles (group_id, role_id)
SELECT g.id, r.id
FROM rbac_groups g
JOIN rbac_roles r ON r.name = 'Health Manager'
WHERE g.name = 'Health Team';

INSERT IGNORE INTO rbac_group_roles (group_id, role_id)
SELECT g.id, r.id
FROM rbac_groups g
JOIN rbac_roles r ON r.name = 'Contacts Manager'
WHERE g.name = 'Contacts Team';

INSERT IGNORE INTO rbac_group_roles (group_id, role_id)
SELECT g.id, r.id
FROM rbac_groups g
JOIN rbac_roles r ON r.name = 'Organizer Manager'
WHERE g.name = 'Organizer Team';

INSERT IGNORE INTO rbac_group_roles (group_id, role_id)
SELECT g.id, r.id
FROM rbac_groups g
JOIN rbac_roles r ON r.name = 'Messages Manager'
WHERE g.name = 'Messages Team';
