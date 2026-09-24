-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nim_nip` VARCHAR(191) NULL,
    `nama` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('admin', 'fasil', 'penghuni') NOT NULL,
    `id_kamar` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_nim_nip_key`(`nim_nip`),
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Gedung` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama_gedung` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Kamar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_gedung` INTEGER NOT NULL,
    `no_kamar` VARCHAR(191) NOT NULL,
    `lantai` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Presensi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_user` INTEGER NOT NULL,
    `jenis_presensi` ENUM('subuh', 'malam') NOT NULL,
    `tanggal` DATE NOT NULL,
    `waktu_presensi` DATETIME(3) NOT NULL,
    `lat` DOUBLE NOT NULL,
    `long` DOUBLE NOT NULL,
    `foto_wajah` VARCHAR(191) NOT NULL,
    `status` ENUM('hadir', 'terlambat', 'alpa', 'izin') NOT NULL,
    `keterangan` VARCHAR(191) NULL,

    UNIQUE INDEX `Presensi_id_user_jenis_presensi_tanggal_key`(`id_user`, `jenis_presensi`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Izin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_user` INTEGER NOT NULL,
    `tanggal_izin` DATE NOT NULL,
    `alasan` VARCHAR(191) NOT NULL,
    `file_bukti` VARCHAR(191) NOT NULL,
    `status_izin` ENUM('pending', 'disetujui', 'ditolak') NOT NULL DEFAULT 'pending',
    `approved_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_id_kamar_fkey` FOREIGN KEY (`id_kamar`) REFERENCES `Kamar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kamar` ADD CONSTRAINT `Kamar_id_gedung_fkey` FOREIGN KEY (`id_gedung`) REFERENCES `Gedung`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Presensi` ADD CONSTRAINT `Presensi_id_user_fkey` FOREIGN KEY (`id_user`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Izin` ADD CONSTRAINT `Izin_id_user_fkey` FOREIGN KEY (`id_user`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Izin` ADD CONSTRAINT `Izin_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
