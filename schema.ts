import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar,
  boolean,
  json
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "super_admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Customers table for loyalty program
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  pin: varchar("pin", { length: 255 }).notNull(),
  totalPoints: int("totalPoints").default(0).notNull(),
  currentTierId: int("currentTierId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Reward Tiers table (e.g., Bronze, Silver, Gold, Platinum)
 */
export const rewardTiers = mysqlTable("rewardTiers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  minPoints: int("minPoints").notNull(),
  maxPoints: int("maxPoints"),
  description: text("description"),
  benefits: json("benefits"),
  color: varchar("color", { length: 50 }),
  icon: varchar("icon", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RewardTier = typeof rewardTiers.$inferSelect;
export type InsertRewardTier = typeof rewardTiers.$inferInsert;

/**
 * Rewards table (e.g., vouchers, products, discounts)
 */
export const rewards = mysqlTable("rewards", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  pointsRequired: int("pointsRequired").notNull(),
  quantity: int("quantity"),
  quantityRemaining: int("quantityRemaining"),
  category: varchar("category", { length: 100 }),
  image: varchar("image", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  expiryDate: timestamp("expiryDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reward = typeof rewards.$inferSelect;
export type InsertReward = typeof rewards.$inferInsert;

/**
 * Point Transactions table
 */
export const pointTransactions = mysqlTable("pointTransactions", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  points: int("points").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  notes: text("notes"),
  adminId: int("adminId"),
  adminName: varchar("adminName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = typeof pointTransactions.$inferInsert;

/**
 * Reward Redemptions table
 */
export const rewardRedemptions = mysqlTable("rewardRedemptions", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  rewardId: int("rewardId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "completed"]).default("pending").notNull(),
  pointsUsed: int("pointsUsed").notNull(),
  approvedBy: int("approvedBy"),
  approvedByName: varchar("approvedByName", { length: 255 }),
  rejectionReason: text("rejectionReason"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RewardRedemption = typeof rewardRedemptions.$inferSelect;
export type InsertRewardRedemption = typeof rewardRedemptions.$inferInsert;

/**
 * Admin Users table
 */
export const adminUsers = mysqlTable("adminUsers", {
  id: int("id").autoincrement().primaryKey(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  pin: varchar("pin", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "super_admin"]).default("admin").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
