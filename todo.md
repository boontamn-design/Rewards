# Reward System - Loyalty Program TODO

## Database & Schema
- [x] สร้าง schema: customers, rewardTiers, rewards, pointTransactions, rewardRedemptions, adminUsers
- [x] รัน migration ผ่าน webdev_execute_sql
- [x] Seed data: 4 tiers (Bronze/Silver/Gold/Platinum), super admin, admin

## Backend API
- [x] นำ db.ts เดิมมาใช้ (customer, admin, reward, tier functions)
- [x] นำ routers.ts เดิมมาใช้ (customer, admin, superAdmin, reward, tier procedures)

## Design System
- [x] index.css (Art Deco Gold & Black, Tailwind 4 compatible)
- [x] LuxuryCard component
- [x] TierBadge component
- [x] OnScreenKeypad component
- [x] Google Fonts: Playfair Display + Montserrat
- [x] .progress-art-deco CSS class

## Frontend Pages - Customer
- [x] Home page (ฟอร์มล็อกอินรวมรองรับทั้งลูกค้าและ Admin)
- [x] CustomerProfile page
- [x] RewardsShop page
- [x] RedemptionStatus page

## Frontend Pages - Admin
- [x] AdminDashboard page (ค้นหาลูกค้า + เพิ่ม/ลดแต้ม)
- [x] AdminRedemptionApproval page
- [x] AdminReports page

## Frontend Pages - SuperAdmin
- [x] SuperAdminPanel page (จัดการรางวัลและ tier)

## App.tsx Routes
- [x] ลงทะเบียน routes ทั้งหมด (/, /login, /customer-profile, /rewards-shop, /redemption-status, /admin-dashboard, /admin-redemptions, /admin-reports, /super-admin)

## Features
- [x] ลูกค้าใหม่ได้ 200 แต้มฟรี
- [x] บันทึกประวัติการได้แต้มฟรี
- [x] admin.checkExists procedure
- [x] Home page รองรับทั้งลูกค้าและ Admin ในหน้าเดียว
- [x] ลบหน้า UnifiedLogin และ AdminLogin
- [x] แก้ไข createCustomer ให้ return insertId ถูกต้อง
- [x] สมัครสมาชิกเสร็จแจ้งด้วย toast และเด้งไปหน้า CustomerProfile
- [x] แก้ไข pointTransactions ให้ใช้ reason และ notes แทน type และ description

## Testing & Deploy
- [x] vitest tests: 8 tests passing (loyalty.test.ts + auth.logout.test.ts)
- [x] TypeScript: no errors
- [x] สร้าง checkpoint

## CSV Import Feature
- [x] เพิ่มปุ่ม "นำเข้า CSV" ใน AdminDashboard header
- [x] สร้าง handleCsvUpload function เพื่อ parse CSV file
- [x] ค้นหาชื่อลูกค้าจากเบอร์โทรในไฟล์ CSV
- [x] แสดง preview ข้อมูล CSV ก่อนยืนยัน
- [x] สร้าง CSV preview dialog
- [ ] ทดสอบ CSV import flow จริงบน Admin Dashboard: login admin -> upload CSV -> preview names -> confirm -> update points
- [x] สร้าง vitest test สำหรับ CSV import (6 tests passing)

## CSV Template Download
- [x] สร้างปุ่ม "ดาวน์โหลด Template" ข้างปุ่ม "นำเข้า CSV"
- [x] สร้าง CSV template file ที่มีตัวอย่างข้อมูล
- [x] เพิ่ม handler function สำหรับดาวน์โหลด CSV template
- [ ] ทดสอบการดาวน์โหลด template ผ่าน Admin Dashboard

## Session Management
- [x] เพิ่ม sessionStorage สำหรับเก็บ admin session (adminSessionTime)
- [x] ตรวจสอบ session expiration เมื่อเข้า AdminDashboard และ SuperAdminPanel
- [x] ลบ session เมื่อ logout
- [x] เพิ่ม session expiration time (24 hours)
- [x] สร้าง vitest tests สำหรับ session management (10 tests passing)
