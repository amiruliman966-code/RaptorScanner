-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 10, 2026 at 07:02 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `raptorscanner_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `scans`
--

CREATE TABLE `scans` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_size` bigint(20) NOT NULL,
  `md5_hash` varchar(255) DEFAULT NULL,
  `sha1_hash` varchar(255) DEFAULT NULL,
  `sha256_hash` varchar(255) DEFAULT NULL,
  `scan_result` varchar(100) DEFAULT NULL,
  `risk_level` varchar(50) DEFAULT NULL,
  `scanned_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `scans`
--

INSERT INTO `scans` (`id`, `user_id`, `original_name`, `file_name`, `file_size`, `md5_hash`, `sha1_hash`, `sha256_hash`, `scan_result`, `risk_level`, `scanned_at`) VALUES
(1, 1, 'Screenshot 2026-07-01 224139.png', '1783420597054-Screenshot 2026-07-01 224139.png', 78831, '7e594659815d91c581882e2316f43f6f', '1d9cec331462b06c1abc8fcde1536ecc420d4c59', 'b8127662841bf716768291e0bdddbdf5515d0adc4b4a1bfe54b2aea06e8f1fd9', 'Not scanned with ClamAV yet', 'Low', '2026-07-07 10:36:37'),
(2, 1, 'Screenshot 2026-07-01 224139.png', '1783420616546-Screenshot 2026-07-01 224139.png', 78831, '7e594659815d91c581882e2316f43f6f', '1d9cec331462b06c1abc8fcde1536ecc420d4c59', 'b8127662841bf716768291e0bdddbdf5515d0adc4b4a1bfe54b2aea06e8f1fd9', 'Not scanned with ClamAV yet', 'Low', '2026-07-07 10:36:56'),
(3, 1, 'FYP_12_Week_Plan.docx', '1783420627373-FYP_12_Week_Plan.docx', 37224, '1be9341298efa5bf84d8cfbcb17d944f', 'bf90fdb4430cd7d75a869c267c02bbda8c400340', 'bc3e052f1378ed32f35c0e58b82413aa02b3fa25a8628f4b9d7d9c510a11f7c1', 'Not scanned with ClamAV yet', 'Low', '2026-07-07 10:37:07'),
(4, 1, 'FYP_12_Week_Plan.docx', '1783420733862-FYP_12_Week_Plan.docx', 37224, '1be9341298efa5bf84d8cfbcb17d944f', 'bf90fdb4430cd7d75a869c267c02bbda8c400340', 'bc3e052f1378ed32f35c0e58b82413aa02b3fa25a8628f4b9d7d9c510a11f7c1', 'Not scanned with ClamAV yet', 'Low', '2026-07-07 10:38:53'),
(5, 1, 'FYP_12_Week_Plan.docx', '1783420984990-FYP_12_Week_Plan.docx', 37224, '1be9341298efa5bf84d8cfbcb17d944f', 'bf90fdb4430cd7d75a869c267c02bbda8c400340', 'bc3e052f1378ed32f35c0e58b82413aa02b3fa25a8628f4b9d7d9c510a11f7c1', 'Not scanned with ClamAV yet', 'Low', '2026-07-07 10:43:04'),
(6, 1, '9. BORANG AKUAN PELAJAR (BERMULA SESI 1 2022_2023).pdf', '1783439252840-9. BORANG AKUAN PELAJAR (BERMULA SESI 1 2022_2023).pdf', 334507, '82ef0a37935a2a73c145721705f89e5a', 'ca7455a1b76cfb215cddeb1a354bdb746c8e5338', 'fb2ad9f76d54218b87a3ff3827e9760987ccb7a92c5d0f2f62a03cee1203d078', 'Not scanned with ClamAV yet', 'Low', '2026-07-07 15:47:32'),
(7, 1, 'Screenshot 2026-07-01 224139.png', '1783440069425-Screenshot 2026-07-01 224139.png', 78831, '7e594659815d91c581882e2316f43f6f', '1d9cec331462b06c1abc8fcde1536ecc420d4c59', 'b8127662841bf716768291e0bdddbdf5515d0adc4b4a1bfe54b2aea06e8f1fd9', 'ClamAV Scan Error', 'Low', '2026-07-07 16:01:09'),
(8, 1, 'Screenshot 2026-06-09 033413.png', '1783470431002-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'ClamAV Scan Error', 'Low', '2026-07-08 00:27:11'),
(9, 1, 'Screenshot 2026-06-09 033413.png', '1783502581771-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'ClamAV Scan Error', 'Low', '2026-07-08 09:23:01'),
(10, 1, 'Screenshot 2026-06-09 033413.png', '1783504298427-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-08 09:52:19'),
(11, 1, 'Screenshot 2026-06-09 033413.png', '1783504300993-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-08 09:52:20'),
(12, 1, 'Screenshot 2026-06-09 033413.png', '1783504302061-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-08 09:52:21'),
(13, 1, 'Screenshot 2026-06-09 033413.png', '1783504301860-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-08 09:52:21'),
(14, 1, 'Screenshot 2026-06-09 033413.png', '1783504304054-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-08 09:52:26'),
(15, 1, 'Screenshot 2026-06-09 033413.png', '1783504308056-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-08 09:52:30'),
(16, 1, 'Screenshot 2026-07-01 230048.png', '1783504319846-Screenshot 2026-07-01 230048.png', 300176, 'ca4da9e9e02589d6a321c0abecec63c7', 'fda5397705faf1e1e86091109b83399c546be34b', '3de516b729b761feef35637cd26063b9777fb11949a35175bd2975b3fb6ea27a', 'Clean', 'Low', '2026-07-08 09:52:39'),
(17, 1, '9. BORANG AKUAN PELAJAR (BERMULA SESI 1 2022_2023).pdf', '1783504356089-9. BORANG AKUAN PELAJAR (BERMULA SESI 1 2022_2023).pdf', 334507, '82ef0a37935a2a73c145721705f89e5a', 'ca7455a1b76cfb215cddeb1a354bdb746c8e5338', 'fb2ad9f76d54218b87a3ff3827e9760987ccb7a92c5d0f2f62a03cee1203d078', 'Clean', 'Low', '2026-07-08 09:53:10'),
(18, 1, '9. BORANG AKUAN PELAJAR (BERMULA SESI 1 2022_2023).pdf', '1783504365919-9. BORANG AKUAN PELAJAR (BERMULA SESI 1 2022_2023).pdf', 334507, '82ef0a37935a2a73c145721705f89e5a', 'ca7455a1b76cfb215cddeb1a354bdb746c8e5338', 'fb2ad9f76d54218b87a3ff3827e9760987ccb7a92c5d0f2f62a03cee1203d078', 'Clean', 'Low', '2026-07-08 09:53:21'),
(19, 1, '9. BORANG AKUAN PELAJAR (BERMULA SESI 1 2022_2023).pdf', '1783504366251-9. BORANG AKUAN PELAJAR (BERMULA SESI 1 2022_2023).pdf', 334507, '82ef0a37935a2a73c145721705f89e5a', 'ca7455a1b76cfb215cddeb1a354bdb746c8e5338', 'fb2ad9f76d54218b87a3ff3827e9760987ccb7a92c5d0f2f62a03cee1203d078', 'Clean', 'Low', '2026-07-08 09:53:21'),
(20, 1, '9. BORANG AKUAN PELAJAR (BERMULA SESI 1 2022_2023).pdf', '1783504366115-9. BORANG AKUAN PELAJAR (BERMULA SESI 1 2022_2023).pdf', 334507, '82ef0a37935a2a73c145721705f89e5a', 'ca7455a1b76cfb215cddeb1a354bdb746c8e5338', 'fb2ad9f76d54218b87a3ff3827e9760987ccb7a92c5d0f2f62a03cee1203d078', 'Clean', 'Low', '2026-07-08 09:53:21'),
(21, 1, '9. BORANG AKUAN PELAJAR (BERMULA SESI 1 2022_2023).pdf', '1783504364949-9. BORANG AKUAN PELAJAR (BERMULA SESI 1 2022_2023).pdf', 334507, '82ef0a37935a2a73c145721705f89e5a', 'ca7455a1b76cfb215cddeb1a354bdb746c8e5338', 'fb2ad9f76d54218b87a3ff3827e9760987ccb7a92c5d0f2f62a03cee1203d078', 'Clean', 'Low', '2026-07-08 09:53:21'),
(22, 1, 'FYP_12_Week_Plan.docx', '1783504398607-FYP_12_Week_Plan.docx', 37224, '1be9341298efa5bf84d8cfbcb17d944f', 'bf90fdb4430cd7d75a869c267c02bbda8c400340', 'bc3e052f1378ed32f35c0e58b82413aa02b3fa25a8628f4b9d7d9c510a11f7c1', 'Clean', 'Low', '2026-07-08 09:53:47'),
(23, 1, 'Screenshot 2026-07-01 224139.png', '1783504452201-Screenshot 2026-07-01 224139.png', 78831, '7e594659815d91c581882e2316f43f6f', '1d9cec331462b06c1abc8fcde1536ecc420d4c59', 'b8127662841bf716768291e0bdddbdf5515d0adc4b4a1bfe54b2aea06e8f1fd9', 'Clean', 'Low', '2026-07-08 09:54:38'),
(24, 1, 'Screenshot 2026-06-09 033413.png', '1783505523861-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-08 10:12:30'),
(25, 1, 'Screenshot 2026-06-09 033413.png', '1783519826243-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-08 14:10:39'),
(26, 1, 'Screenshot 2026-07-01 230048.png', '1783523833705-Screenshot 2026-07-01 230048.png', 300176, 'ca4da9e9e02589d6a321c0abecec63c7', 'fda5397705faf1e1e86091109b83399c546be34b', '3de516b729b761feef35637cd26063b9777fb11949a35175bd2975b3fb6ea27a', 'Clean', 'Low', '2026-07-08 15:17:27'),
(27, 1, 'Screenshot 2026-06-09 033413.png', '1783588447717-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-09 09:14:22'),
(28, 1, 'Screenshot 2026-06-09 033413.png', '1783589119977-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-09 09:25:33'),
(29, 1, 'Screenshot 2026-06-09 033413.png', '1783589945504-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-09 09:39:15'),
(30, 1, 'Screenshot 2026-06-09 033413.png', '1783596453208-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-09 11:27:41'),
(31, 1, 'Screenshot 2026-06-09 033413.png', '1783612368753-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-09 15:53:01'),
(32, 1, 'Screenshot 2026-06-09 033413.png', '1783652540121-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-10 03:02:34'),
(33, 1, 'Screenshot 2026-06-09 033413.png', '1783652623153-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-10 03:04:00'),
(34, 1, 'Screenshot 2026-06-09 033413.png', '1783652808047-Screenshot 2026-06-09 033413.png', 116707, 'f37f11b3f5f064adb38b8b83b6ba2735', '7912066e8c5c6162f11cb5c41f089b66026be125', '65257aae3ef930a2799381679623d340326e22e238c2b649c213ec20f5032724', 'Clean', 'Low', '2026-07-10 03:07:03');

-- --------------------------------------------------------

--
-- Table structure for table `url_scans`
--

CREATE TABLE `url_scans` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `url` text NOT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `protocol` varchar(50) DEFAULT NULL,
  `risk_level` varchar(50) DEFAULT NULL,
  `scan_result` varchar(100) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `scanned_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `url_scans`
--

INSERT INTO `url_scans` (`id`, `user_id`, `url`, `domain`, `protocol`, `risk_level`, `scan_result`, `reason`, `scanned_at`) VALUES
(1, 1, 'https://xhtotal.com/search/porn', 'xhtotal.com', 'https', 'Low', 'Clean', 'No suspicious pattern found.', '2026-07-08 10:06:35'),
(2, 1, 'https://www.virustotal.com/gui/home/search', 'www.virustotal.com', 'https', 'Low', 'Clean', 'No suspicious pattern found.', '2026-07-08 14:11:20'),
(3, 1, 'https://www.virustotal.com/gui/home/search', 'www.virustotal.com', 'https', 'Low', 'Clean', 'No suspicious pattern found.', '2026-07-08 14:12:33'),
(4, 1, 'http://testsafebrowsing.appspot.com/apiv4/ANY_PLATFORM/MALWARE/URL/', 'testsafebrowsing.appspot.com', 'http', 'Medium', 'Possibly Suspicious', 'URL does not use HTTPS.', '2026-07-08 14:23:59'),
(5, 1, 'http://testsafebrowsing.appspot.com/apiv4/ANY_PLATFORM/SOCIAL_ENGINEERING/URL/', 'testsafebrowsing.appspot.com', 'http', 'Medium', 'Possibly Suspicious', 'URL does not use HTTPS.', '2026-07-08 14:24:22'),
(6, 1, 'http://testsafebrowsing.appspot.com/apiv4/ANY_PLATFORM/UNWANTED_SOFTWARE/URL/', 'testsafebrowsing.appspot.com', 'http', 'Medium', 'Possibly Suspicious', 'URL does not use HTTPS.', '2026-07-08 14:25:11'),
(7, 1, 'https://www.amtso.org/security-features-check/', 'www.amtso.org', 'https', 'Low', 'Clean', 'No suspicious pattern found.', '2026-07-08 14:25:22'),
(8, 1, 'https://www.eicar.org/download-anti-malware-testfile/', 'www.eicar.org', 'https', 'Low', 'Clean', 'No suspicious pattern found.', '2026-07-08 14:25:45'),
(9, 1, 'https://www.amtso.org/feature-settings-check-download-of-malware/', 'www.amtso.org', 'https', 'Low', 'Clean', 'No suspicious pattern found.', '2026-07-08 14:26:03'),
(10, 1, 'https://www.amtso.org/security-features-check/', 'www.amtso.org', 'https', 'Low', 'Clean', 'No suspicious pattern found.', '2026-07-08 14:29:23'),
(11, 1, 'https://www.amtso.org/security-features-check/', 'www.amtso.org', 'https', 'Low', 'Clean', 'No suspicious pattern found.', '2026-07-08 14:39:53'),
(12, 1, 'http://testsafebrowsing.appspot.com/apiv4/ANY_PLATFORM/UNWANTED_SOFTWARE/URL/', 'testsafebrowsing.appspot.com', 'http', 'Medium', 'Possibly Suspicious', 'URL does not use HTTPS.', '2026-07-08 15:10:34'),
(13, 1, 'http://spmp.pmj.edu.my/', 'spmp.pmj.edu.my', 'http', 'Medium', 'Possibly Suspicious', 'URL does not use HTTPS.', '2026-07-08 15:11:02'),
(14, 1, 'https://www.eicar.org/download-anti-malware-testfile/', 'www.eicar.org', 'https', 'Low', 'Clean', 'No suspicious pattern found.', '2026-07-08 15:11:12'),
(15, 1, 'http://spmp.pmj.edu.my/', 'spmp.pmj.edu.my', 'http', 'Medium', 'Possibly Suspicious', 'URL does not use HTTPS.', '2026-07-08 15:24:01'),
(16, 1, 'http://spmp.pmj.edu.my/', 'spmp.pmj.edu.my', 'http', 'Medium', 'Possibly Suspicious', 'URL does not use HTTPS.', '2026-07-09 13:17:08'),
(17, 1, 'http://spmp.pmj.edu.my/', 'spmp.pmj.edu.my', 'http', 'Medium', 'Possibly Suspicious', 'URL does not use HTTPS.', '2026-07-10 03:03:11'),
(18, 1, 'http://spmp.pmj.edu.my/', 'spmp.pmj.edu.my', 'http', 'Medium', 'Possibly Suspicious', 'URL does not use HTTPS.', '2026-07-10 03:03:32'),
(19, 1, 'http://spmp.pmj.edu.my/', 'spmp.pmj.edu.my', 'http', 'Medium', 'Possibly Suspicious', 'URL does not use HTTPS.', '2026-07-10 03:05:31'),
(20, 1, 'http://testsafebrowsing.appspot.com/apiv4/ANY_PLATFORM/MALWARE/URL/', 'testsafebrowsing.appspot.com', 'http', 'Medium', 'Possibly Suspicious', 'URL does not use HTTPS.', '2026-07-10 03:05:46'),
(21, 1, 'http://spmp.pmj.edu.my/', 'spmp.pmj.edu.my', 'http', 'Medium', 'Possibly Suspicious', 'URL does not use HTTPS.', '2026-07-10 03:17:10');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `google_id` varchar(255) DEFAULT NULL,
  `auth_provider` varchar(50) DEFAULT 'local',
  `facebook_id` varchar(255) DEFAULT NULL,
  `apple_id` varchar(255) DEFAULT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'user',
  `phone` varchar(30) DEFAULT NULL,
  `profile_picture` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `created_at`, `google_id`, `auth_provider`, `facebook_id`, `apple_id`) VALUES
(1, 'F1075_Amirul Iman Bin Mohd Kamarudin', 'amiruliman966@gmail.com', '$2b$10$F7froNQ8lihTuSB0Dibn4.QH2LsI8O2Wv8bzvbv5Ao75P9Xfi9KBm', '2026-07-07 09:44:29', '113007017328243050953', 'google', NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `scans`
--
ALTER TABLE `scans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `url_scans`
--
ALTER TABLE `url_scans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `scans`
--
ALTER TABLE `scans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `url_scans`
--
ALTER TABLE `url_scans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `scans`
--
ALTER TABLE `scans`
  ADD CONSTRAINT `scans_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `url_scans`
--
ALTER TABLE `url_scans`
  ADD CONSTRAINT `url_scans_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
