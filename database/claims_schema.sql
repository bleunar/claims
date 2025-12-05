-- CLAIMS Database Schema
-- Version: 4.0 (Normalized)
-- Date: 2025-11-20

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+08:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `claims`
--

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` ENUM('admin', 'dean', 'itsd', 'technician') NOT NULL DEFAULT 'technician',
  `year` varchar(50) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `profile_image` varchar(255) DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `laboratories`
--

CREATE TABLE `laboratories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `computers`
--

CREATE TABLE `computers` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `lab_id` int(11) NOT NULL,
  `specs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specs`)),
  `other_parts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`other_parts`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `lab_id` (`lab_id`),
  CONSTRAINT `fk_computers_lab` FOREIGN KEY (`lab_id`) REFERENCES `laboratories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `computer_parts`
-- Replaces computer_status and other_part_status
--

CREATE TABLE `computer_parts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `computer_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL, -- User defined name (e.g. "Dell Monitor")
  `serial_number` varchar(255) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL, -- System defined type (e.g. "monitor", "keyboard")
  `type` ENUM('standard', 'custom') NOT NULL DEFAULT 'standard',
  `status` ENUM('operational', 'not_operational', 'damaged', 'missing') NOT NULL DEFAULT 'operational',
  `notes` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `computer_id` (`computer_id`),
  CONSTRAINT `fk_parts_computer` FOREIGN KEY (`computer_id`) REFERENCES `computers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `computer_id` varchar(255) DEFAULT NULL,
  `part_name` varchar(255) DEFAULT NULL,
  `issue_description` text DEFAULT NULL,
  `status` ENUM('pending', 'in_progress', 'resolved') NOT NULL DEFAULT 'pending',
  `submitted_by` varchar(255) DEFAULT 'System',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `computer_id` (`computer_id`),
  CONSTRAINT `fk_reports_computer` FOREIGN KEY (`computer_id`) REFERENCES `computers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `technician_logs`
--

CREATE TABLE `technician_logs` (
  `id` varchar(36) NOT NULL, -- UUID
  `report_id` int(11) NOT NULL,
  `technician_id` varchar(255) DEFAULT NULL, -- Optional link to users table
  `technician_name` varchar(255) NOT NULL,
  `action_taken` text NOT NULL,
  `status_after` ENUM('operational', 'not_operational', 'damaged', 'missing') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  CONSTRAINT `fk_logs_report` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
