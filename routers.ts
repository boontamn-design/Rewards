import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { eq } from "drizzle-orm";
import { adminUsers, pointTransactions } from "../drizzle/schema";
import {
  createCustomer,
  getCustomerById,
  getCustomerByPhoneNumber,
  getAllCustomers,
  getRewardTiers,
  getRewardTierById,
  createRewardTier,
  updateRewardTier,
  deleteRewardTier,
  getActiveRewards,
  getAllRewards,
  getRewardById,
  createReward,
  updateReward,
  addPointTransaction,
  getPointTransactionHistory,
  redeemReward,
  getRewardRedemptions,
  getPendingRedemptions,
  getAllRedemptions,
  approveRedemption,
  rejectRedemption,
  getAdminByPhoneNumber,
  createAdminUser,
  getAdminById,
  getAllAdmins,
  getStatistics,
  getDb,
} from "./db";

// Helper to hash PIN
async function hashPin(pin: string): Promise<string> {
  return Buffer.from(pin).toString("base64");
}

async function verifyPinHash(pin: string, hash: string): Promise<boolean> {
  const computed = await hashPin(pin);
  return computed === hash;
}

// Role-based middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== Customer Procedures =====
  customer: router({
    verifyPin: publicProcedure
      .input(z.object({ phoneNumber: z.string().min(1), pin: z.string().min(4) }))
      .mutation(async ({ input }) => {
        const customer = await getCustomerByPhoneNumber(input.phoneNumber);
        if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบข้อมูลลูกค้า" });
        const isValid = await verifyPinHash(input.pin, customer.pin);
        if (!isValid) throw new TRPCError({ code: "UNAUTHORIZED", message: "PIN ไม่ถูกต้อง" });
        return { customerId: customer.id, name: customer.name };
      }),

    create: publicProcedure
      .input(z.object({
        phoneNumber: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email().optional(),
        pin: z.string().min(4),
      }))
      .mutation(async ({ input }) => {
        const existing = await getCustomerByPhoneNumber(input.phoneNumber);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "เบอร์โทรนี้มีในระบบแล้ว" });
        const hashedPin = await hashPin(input.pin);
        const customer = await createCustomer({
          phoneNumber: input.phoneNumber,
          name: input.name,
          email: input.email || null,
          pin: hashedPin,
          totalPoints: 200,
          isActive: true,
        });
        // บันทึกประวัติการได้แต้มฟรี
        const db = await getDb();
        if (db && customer) {
          await db.insert(pointTransactions).values({
            customerId: customer.id,
            points: 200,
            reason: "signup_bonus",
            notes: "โบนัสสมัครสมาชิก",
          });
        }
        return customer;
      }),

    getProfile: publicProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input }) => {
        const customer = await getCustomerById(input.customerId);
        if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบข้อมูลลูกค้า" });
        const tiers = await getRewardTiers();
        let currentTier = tiers[0] || { id: 0, name: "Bronze", minPoints: 0, maxPoints: 999, description: null, benefits: null, color: null, icon: null, createdAt: new Date(), updatedAt: new Date() };
        let nextTier = null;
        for (const tier of tiers) {
          if (customer.totalPoints >= tier.minPoints) {
            if (!tier.maxPoints || customer.totalPoints <= tier.maxPoints) {
              currentTier = tier;
            }
          }
        }
        for (const tier of tiers) {
          if (tier.minPoints > customer.totalPoints) {
            nextTier = tier;
            break;
          }
        }
        const progressToNextTier = nextTier
          ? Math.min(100, Math.round(((customer.totalPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100))
          : 100;
        return { ...customer, currentTier, nextTier, progressToNextTier };
      }),

    getPointHistory: publicProcedure
      .input(z.object({ customerId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await getPointTransactionHistory(input.customerId, input.limit || 50);
      }),

    getRedemptionHistory: publicProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input }) => {
        const redemptions = await getRewardRedemptions(input.customerId);
        const enriched = await Promise.all(redemptions.map(async (r) => {
          const reward = await getRewardById(r.rewardId);
          return { ...r, rewardName: reward?.name || "รางวัลที่ถูกลบ", rewardImage: reward?.image || null };
        }));
        return enriched;
      }),

    redeem: publicProcedure
      .input(z.object({ customerId: z.number(), rewardId: z.number() }))
      .mutation(async ({ input }) => {
        return await redeemReward(input.customerId, input.rewardId);
      }),

    checkExists: publicProcedure
      .input(z.object({ phoneNumber: z.string().min(1) }))
      .query(async ({ input }) => {
        const customer = await getCustomerByPhoneNumber(input.phoneNumber);
        return { exists: !!customer };
      }),
  }),

  // ===== Admin Procedures =====
  admin: router({
    checkExists: publicProcedure
      .input(z.object({ phoneNumber: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const admin = await db.select().from(adminUsers).where(eq(adminUsers.phoneNumber, input.phoneNumber)).limit(1);
        return { exists: admin.length > 0 };
      }),
    verifyPin: publicProcedure
      .input(z.object({ phoneNumber: z.string().min(1), pin: z.string().min(4) }))
      .mutation(async ({ input }) => {
        const admin = await getAdminByPhoneNumber(input.phoneNumber);
        if (!admin) throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบข้อมูล Admin" });
        const isValid = await verifyPinHash(input.pin, admin.pin);
        if (!isValid) throw new TRPCError({ code: "UNAUTHORIZED", message: "PIN ไม่ถูกต้อง" });
        return { adminId: admin.id, name: admin.name, role: admin.role };
      }),

    searchByPhone: publicProcedure
      .input(z.object({ phoneNumber: z.string().min(1) }))
      .query(async ({ input }) => {
        const customer = await getCustomerByPhoneNumber(input.phoneNumber);
        if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบลูกค้า" });
        return customer;
      }),

    addPoints: publicProcedure
      .input(z.object({
        customerId: z.number(),
        points: z.number().positive(),
        reason: z.string(),
        notes: z.string().optional(),
        adminId: z.number(),
        adminName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const customer = await getCustomerById(input.customerId);
        if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบลูกค้า" });
        return await addPointTransaction({
          customerId: input.customerId,
          points: input.points,
          reason: input.reason,
          notes: input.notes || null,
          adminId: input.adminId,
          adminName: input.adminName,
        });
      }),

    removePoints: publicProcedure
      .input(z.object({
        customerId: z.number(),
        points: z.number().positive(),
        reason: z.string(),
        notes: z.string().optional(),
        adminId: z.number(),
        adminName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const customer = await getCustomerById(input.customerId);
        if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบลูกค้า" });
        return await addPointTransaction({
          customerId: input.customerId,
          points: -input.points,
          reason: input.reason,
          notes: input.notes || null,
          adminId: input.adminId,
          adminName: input.adminName,
        });
      }),

    getPendingRedemptions: publicProcedure.query(async () => {
      const redemptions = await getPendingRedemptions();
      const enriched = await Promise.all(redemptions.map(async (r) => {
        const customer = await getCustomerById(r.customerId);
        const reward = await getRewardById(r.rewardId);
        return {
          ...r,
          customerName: customer?.name || "ไม่ทราบชื่อ",
          customerPhone: customer?.phoneNumber || "",
          rewardName: reward?.name || "รางวัลที่ถูกลบ",
        };
      }));
      return enriched;
    }),

    getAllRedemptions: publicProcedure.query(async () => {
      const redemptions = await getAllRedemptions();
      const enriched = await Promise.all(redemptions.map(async (r) => {
        const customer = await getCustomerById(r.customerId);
        const reward = await getRewardById(r.rewardId);
        return {
          ...r,
          customerName: customer?.name || "ไม่ทราบชื่อ",
          customerPhone: customer?.phoneNumber || "",
          rewardName: reward?.name || "รางวัลที่ถูกลบ",
        };
      }));
      return enriched;
    }),

    approveRedemption: publicProcedure
      .input(z.object({ redemptionId: z.number(), adminId: z.number(), adminName: z.string() }))
      .mutation(async ({ input }) => {
        return await approveRedemption(input.redemptionId, input.adminId, input.adminName);
      }),

    rejectRedemption: publicProcedure
      .input(z.object({ redemptionId: z.number(), rejectionReason: z.string() }))
      .mutation(async ({ input }) => {
        return await rejectRedemption(input.redemptionId, input.rejectionReason);
      }),

    getStatistics: publicProcedure.query(async () => {
      return await getStatistics();
    }),

    getAllCustomers: publicProcedure.query(async () => {
      return await getAllCustomers();
    }),
  }),

  // ===== Super Admin Procedures =====
  superAdmin: router({
    createReward: publicProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        pointsRequired: z.number().positive(),
        quantity: z.number().optional(),
        category: z.string().optional(),
        image: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createReward({
          name: input.name,
          description: input.description || null,
          pointsRequired: input.pointsRequired,
          quantity: input.quantity || null,
          quantityRemaining: input.quantity || null,
          category: input.category || null,
          image: input.image || null,
          isActive: true,
          expiryDate: null,
        });
      }),

    updateReward: publicProcedure
      .input(z.object({
        rewardId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        pointsRequired: z.number().optional(),
        quantity: z.number().optional(),
        category: z.string().optional(),
        image: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { rewardId, ...updates } = input;
        return await updateReward(rewardId, updates);
      }),

    deleteReward: publicProcedure
      .input(z.object({ rewardId: z.number() }))
      .mutation(async ({ input }) => {
        return await updateReward(input.rewardId, { isActive: false });
      }),

    getRewards: publicProcedure.query(async () => {
      return await getAllRewards();
    }),

    createRewardTier: publicProcedure
      .input(z.object({
        name: z.string(),
        minPoints: z.number(),
        maxPoints: z.number().optional(),
        description: z.string().optional(),
        benefits: z.array(z.string()).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createRewardTier({
          name: input.name,
          minPoints: input.minPoints,
          maxPoints: input.maxPoints || null,
          description: input.description || null,
          benefits: input.benefits ? JSON.stringify(input.benefits) : null,
          color: input.color || null,
          icon: input.icon || null,
        });
      }),

    updateRewardTier: publicProcedure
      .input(z.object({
        tierId: z.number(),
        name: z.string().optional(),
        minPoints: z.number().optional(),
        maxPoints: z.number().optional(),
        description: z.string().optional(),
        benefits: z.array(z.string()).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { tierId, benefits, ...updates } = input;
        const updateData: any = { ...updates };
        if (benefits) updateData.benefits = JSON.stringify(benefits);
        return await updateRewardTier(tierId, updateData);
      }),

    deleteRewardTier: publicProcedure
      .input(z.object({ tierId: z.number() }))
      .mutation(async ({ input }) => {
        return await deleteRewardTier(input.tierId);
      }),

    getRewardTiers: publicProcedure.query(async () => {
      return await getRewardTiers();
    }),

    createAdmin: publicProcedure
      .input(z.object({
        phoneNumber: z.string(),
        name: z.string(),
        pin: z.string().min(4),
        role: z.enum(["admin", "super_admin"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getAdminByPhoneNumber(input.phoneNumber);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "เบอร์โทรนี้มีในระบบแล้ว" });
        const hashedPin = await hashPin(input.pin);
        return await createAdminUser({
          phoneNumber: input.phoneNumber,
          name: input.name,
          pin: hashedPin,
          role: input.role || "admin",
          isActive: true,
        });
      }),

    getAllAdmins: publicProcedure.query(async () => {
      return await getAllAdmins();
    }),
  }),

  // ===== Reward Procedures =====
  reward: router({
    getAvailable: publicProcedure.query(async () => {
      return await getActiveRewards();
    }),

    getById: publicProcedure
      .input(z.object({ rewardId: z.number() }))
      .query(async ({ input }) => {
        const reward = await getRewardById(input.rewardId);
        if (!reward) throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบรางวัล" });
        return reward;
      }),
  }),

  // ===== Tier Procedures =====
  tier: router({
    getAll: publicProcedure.query(async () => {
      return await getRewardTiers();
    }),

    getById: publicProcedure
      .input(z.object({ tierId: z.number() }))
      .query(async ({ input }) => {
        const tier = await getRewardTierById(input.tierId);
        if (!tier) throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบ tier" });
        return tier;
      }),
  }),
});

export type AppRouter = typeof appRouter;
