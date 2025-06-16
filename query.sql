CREATE DATABASE gpsc_organization_chart_db CHARACTER
SET utf8mb4 COLLATE utf8mb4_general_ci;

USE gpsc_organization_chart_db;

DROP TABLE IF EXISTS `O_1000`;
CREATE TABLE
    `O_1000` (
        `id` int unsigned NOT NULL AUTO_INCREMENT,
        `otype` varchar(2),
        `objid` varchar(8),
        `begda` date,
        `endda` date,
        `short` varchar(12),
        `stext` varchar(40),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `O_1001`;
CREATE TABLE
    `O_1001` (
        `id` int unsigned NOT NULL AUTO_INCREMENT,
        `otype` varchar(2),
        `objid` varchar(8),
        `rsign` varchar(1),
        `relat` varchar(3),
        `begda` date,
        `endda` date,
        `sclass` varchar(3),
        `sobid` varchar(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `O_1010`;
CREATE TABLE
    `O_1010` (
        `id` int unsigned NOT NULL AUTO_INCREMENT,
        `otype` varchar(2),
        `objid` varchar(8),
        `begda` date,
        `endda` date,
        `hilfm` varchar(3),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `P_0002`;
CREATE TABLE
    `P_0002` (
        `id` int unsigned NOT NULL AUTO_INCREMENT,
        `pernr` varchar(8),
        `begda` date,
        `endda` date,
        `titel` varchar(100),
        `vorna` varchar(100),
        `nachn` varchar(100),
        `natio` varchar(2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

DROP TABLE IF EXISTS `org_chart`;
CREATE TABLE
    `org_chart` (
        `id` int unsigned NOT NULL AUTO_INCREMENT,
        `key` VARCHAR(20),
        `value` VARCHAR(255),
        `parent_key` VARCHAR(20),
        `dropdown_type` ENUM ('FIELD', 'DEPARTMENT', 'DIVISION', 'NONE'),
        PRIMARY KEY (`id`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;


DROP PROCEDURE IF EXISTS sp_generate_org_chart;
DELIMITER $$
CREATE PROCEDURE sp_generate_org_chart()
BEGIN
	TRUNCATE org_chart;
	INSERT INTO
		org_chart (`key`, `value`, `parent_key`, `dropdown_type`)
	SELECT
		o01.OBJID AS `key`,
		o00.STEXT AS `value`,
		o01.SOBID AS `parent_key`,
		CASE
			WHEN o10.HILFM IN ('010', '020', '030') THEN 'FIELD'
			WHEN o10.HILFM IN ('040', '050', '060') THEN 'DEPARTMENT'
			WHEN o10.HILFM IN ('070', '080', '090') THEN 'DIVISION'
			ELSE 'NONE'
		END AS dropdown_type
	FROM
		O_1001 o01
		JOIN O_1000 o00 ON o01.OBJID = o00.OBJID
		JOIN O_1010 o10 ON o01.OBJID = o10.OBJID
	WHERE
		o01.RSIGN = 'A'
		AND o01.RELAT = '002';

	INSERT INTO org_chart (`key`, `value`, `parent_key`, `dropdown_type`)
	SELECT
		o01.SOBID AS `key`,
		CASE
			WHEN p02.VORNA IS NOT NULL THEN CONCAT(s00.STEXT, ' - ', p02.VORNA, ' ', p02.NACHN)
			WHEN p02.VORNA IS NULL THEN CONCAT(s00.STEXT)
		END AS `value`,
		o01.OBJID AS `parent_key`,
		'POSITION' AS `dropdown_type`
	FROM 
		O_1001 o01
	LEFT JOIN 
		S_1000 s00 ON o01.SOBID = s00.OBJID
	LEFT JOIN 
		S_1001 s01 ON o01.SOBID = s01.OBJID AND s01.RSIGN = "A" AND s01.RELAT = "008"
	LEFT JOIN
		P_0002 p02 ON s01.SOBID = p02.PERNR
	WHERE o01.RSIGN = "B" AND o01.RELAT = "003"
	ORDER BY o01.SOBID;
END $$
DELIMITER ;