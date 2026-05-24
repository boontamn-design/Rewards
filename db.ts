import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  customers,
  rewardTiers,
  rewards,
  pointTransactions,
  rewardRedemptions,
  adminUsers,
  InsertCustomer,
  InsertPointTransaction,
  InsertRewardTier,
  InsertReward,
  InsertAdminUser,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== User Functions =====

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== Customer Functions =====

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(data);
  // MySQL2 returns insertId in result metadata
  const insertId = (result as any)?.[0]?.insertId || (result as any)?.insertId;
  if (!insertId) throw new Error("Failed to get insert ID");
  return await getCustomerById(Number(insertId));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCustomerByPhoneNumber(phoneNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.phoneNumber, phoneNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(customers).orderBy(desc(customers.createdAt));
}

// ===== Reward Tier Functions =====

export async function getRewardTiers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(rewardTiers).orderBy(rewardTiers.minPoints);
}

export async function getRewardTierById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rewardTiers).where(eq(rewardTiers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createRewardTier(data: InsertRewardTier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(rewardTiers).values(data);
  const id = (result[0] as any)?.insertId || 0;
  return await getRewardTierById(Number(id));
}

export async function updateRewardTier(id: number, data: Partial<InsertRewardTier>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(rewardTiers).set({ ...data, updatedAt: new Date() }).where(eq(rewardTiers.id, id));
  return await getRewardTierById(id);
}

export async function deleteRewardTier(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(rewardTiers).where(eq(rewardTiers.id, id));
  return { success: true };
}

// ===== Reward Functions =====

export async function getActiveRewards() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(rewards).where(eq(rewards.isActive, true));
}

export async function getAllRewards() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(rewards).orderBy(desc(rewards.createdAt));
}

export async function getRewardById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rewards).where(eq(rewards.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createReward(data: InsertReward) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(rewards).values(data);
  const id = (result[0] as any)?.insertId || 0;
  return await getRewardById(Number(id));
}

export async function updateReward(id: number, data: Partial<InsertReward>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(rewards).set({ ...data, updatedAt: new Date() }).where(eq(rewards.id, id));
  return await getRewardById(id);
}

// ===== Point Transaction Functions =====

export async function addPointTransaction(data: InsertPointTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(pointTransactions).values(data);
  const customer = await getCustomerById(data.customerId);
  if (customer) {
    const newTotal = Math.max(0, customer.totalPoints + data.points);
    await db.update(customers).set({ totalPoints: newTotal }).where(eq(customers.id, data.customerId));
  }
  return { success: true };
}

export async function getPointTransactionHistory(customerId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pointTransactions)
    .where(eq(pointTransactions.customerId, customerId))
    .orderBy(desc(pointTransactions.createdAt))
    .limit(limit);
}

// ===== Reward Redemption Functions =====

export async function redeemReward(customerId: number, rewardId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const customer = await getCustomerById(customerId);
  if (!customer) throw new Error("Customer not found");
  const reward = await getRewardById(rewardId);
  if (!reward) throw new Error("Reward not found");
  if (customer.totalPoints < reward.pointsRequired) throw new Error("Insufficient points");
  if (reward.quantityRemaining !== null && reward.quantityRemaining !== undefined && reward.quantityRemaining <= 0) throw new Error("Reward out of stock");
  await db.insert(rewardRedemptions).values({ customerId, rewardId, pointsUsed: reward.pointsRequired, status: "pending" });
  return { success: true };
}

export async function getRewardRedemptions(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(rewardRedemptions)
    .where(eq(rewardRedemptions.customerId, customerId))
    .orderBy(desc(rewardRedemptions.createdAt));
}

export async function getPendingRedemptions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(rewardRedemptions)
    .where(eq(rewardRedemptions.status, "pending"))
    .orderBy(desc(rewardRedemptions.createdAt));
}

export async function getAllRedemptions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(rewardRedemptions).orderBy(desc(rewardRedemptions.createdAt));
}

export async function approveRedemption(redemptionId: number, adminId: number, adminName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const redemption = await db.select().from(rewardRedemptions).where(eq(rewardRedemptions.id, redemptionId)).limit(1);
  if (!redemption || redemption.length === 0) throw new Error("Redemption not found");
  if (redemption[0].status !== "pending") throw new Error("Redemption is not pending");
  const customer = await getCustomerById(redemption[0].customerId);
  if (customer) {
    const newTotal = Math.max(0, customer.totalPoints - redemption[0].pointsUsed);
    await db.update(customers).set({ totalPoints: newTotal }).where(eq(customers.id, redemption[0].customerId));
  }
  const reward = await getRewardById(redemption[0].rewardId);
  if (reward && reward.quantityRemaining !== null && reward.quantityRemaining !== undefined) {
    await db.update(rewards).set({ quantityRemaining: reward.quantityRemaining - 1 }).where(eq(rewards.id, redemption[0].rewardId));
  }
  await db.update(rewardRedemptions).set({ status: "approved", approvedBy: adminId, approvedByName: adminName, completedAt: new Date(), updatedAt: new Date() }).where(eq(rewardRedemptions.id, redemptionId));
  return { success: true };
}

export async function rejectRedemption(redemptionId: number, rejectionReason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const redemption = await db.select().from(rewardRedemptions).where(eq(rewardRedemptions.id, redemptionId)).limit(1);
  if (!redemption || redemption.length === 0) throw new Error("Redemption not found");
  if (redemption[0].status !== "pending") throw new Error("Redemption is not pending");
  await db.update(rewardRedemptions).set({ status: "rejected", rejectionReason, updatedAt: new Date() }).where(eq(rewardRedemptions.id, redemptionId));
  return { success: true };
}

// ===== Admin User Functions =====

export async function getAdminByPhoneNumber(phoneNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminUsers).where(eq(adminUsers.phoneNumber, phoneNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAdminUser(data: InsertAdminUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(adminUsers).values(data);
  const id = (result[0] as any)?.insertId || 0;
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.id, Number(id))).limit(1);
  return rows[0];
}

export async function getAdminById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllAdmins() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
}

// ===== Statistics Functions =====

export async function getStatistics() {
  const db = await getDb();
  if (!db) return null;
  const totalCustomers = await db.select().from(customers);
  const totalTransactions = await db.select().from(pointTransactions);
  const totalRedemptions = await db.select().from(rewardRedemptions);
  const pointsOut = totalTransactions.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0);
  const pointsUsed = totalRedemptions.filter(r => r.status === "approved").reduce((sum, r) => sum + r.pointsUsed, 0);
  return {
    totalCustomers: totalCustomers.length,
    totalPointsDistributed: pointsOut,
    totalPointsRedeemed: pointsUsed,
    pendingRedemptions: totalRedemptions.filter(r => r.status === "pending").length,
    activeCustomers: totalCustomers.filter(c => c.isActive).length,
  };
}
