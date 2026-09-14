-- CreateTable
CREATE TABLE `WorkspaceRole` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `color` VARCHAR(191) NOT NULL DEFAULT '#a1a1aa',
  `permissions` TEXT NOT NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `isManaged` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `WorkspaceRole_workspaceId_name_key`(`workspaceId`, `name`),
  INDEX `WorkspaceRole_workspaceId_position_idx`(`workspaceId`, `position`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed built-in roles for existing workspaces.
INSERT INTO `WorkspaceRole` (`id`, `workspaceId`, `name`, `color`, `permissions`, `position`, `isDefault`, `isManaged`, `createdAt`, `updatedAt`)
SELECT CONCAT('role_admin_', `id`), `id`, 'Admin', '#fafafa', '["manage_workspace","manage_channels","manage_invites","manage_roles","manage_members"]', 100, false, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Workspace`;

INSERT INTO `WorkspaceRole` (`id`, `workspaceId`, `name`, `color`, `permissions`, `position`, `isDefault`, `isManaged`, `createdAt`, `updatedAt`)
SELECT CONCAT('role_member_', `id`), `id`, 'Member', '#a1a1aa', '[]', 0, true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Workspace`;

-- AlterTable
ALTER TABLE `Membership` ADD COLUMN `roleId` VARCHAR(191) NULL;

UPDATE `Membership`
SET `roleId` = CASE
  WHEN LOWER(COALESCE(`role`, 'member')) = 'admin' THEN CONCAT('role_admin_', `workspaceId`)
  ELSE CONCAT('role_member_', `workspaceId`)
END;

CREATE INDEX `Membership_roleId_idx` ON `Membership`(`roleId`);

-- CreateTable
CREATE TABLE `WorkspaceInviteLink` (
  `id` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `roleId` VARCHAR(191) NULL,
  `maxUses` INTEGER NULL,
  `useCount` INTEGER NOT NULL DEFAULT 0,
  `expiresAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `WorkspaceInviteLink_token_key`(`token`),
  INDEX `WorkspaceInviteLink_workspaceId_createdAt_idx`(`workspaceId`, `createdAt`),
  INDEX `WorkspaceInviteLink_roleId_idx`(`roleId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkspaceDomainRule` (
  `id` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NOT NULL,
  `domain` VARCHAR(191) NOT NULL,
  `roleId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `WorkspaceDomainRule_workspaceId_domain_key`(`workspaceId`, `domain`),
  INDEX `WorkspaceDomainRule_domain_idx`(`domain`),
  INDEX `WorkspaceDomainRule_roleId_idx`(`roleId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WorkspaceRole` ADD CONSTRAINT `WorkspaceRole_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `WorkspaceRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `WorkspaceInviteLink` ADD CONSTRAINT `WorkspaceInviteLink_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WorkspaceInviteLink` ADD CONSTRAINT `WorkspaceInviteLink_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `WorkspaceRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `WorkspaceDomainRule` ADD CONSTRAINT `WorkspaceDomainRule_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WorkspaceDomainRule` ADD CONSTRAINT `WorkspaceDomainRule_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `WorkspaceRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
