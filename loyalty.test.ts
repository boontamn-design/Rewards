import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getCustomerByPhoneNumber: vi.fn(),
  getCustomerById: vi.fn(),
  createCustomer: vi.fn(),
  getRewardTiers: vi.fn(),
  getRewardTierById: vi.fn(),
  createRewardTier: vi.fn(),
  updateRewardTier: vi.fn(),
  deleteRewardTier: vi.fn(),
  getActiveRewards: vi.fn(),
  getAllRewards: vi.fn(),
  getRewardById: vi.fn(),
  createReward: vi.fn(),
  updateReward: vi.fn(),
  addPointTransaction: vi.fn(),
  getPointTransactionHistory: vi.fn(),
  redeemReward: vi.fn(),
  getRewardRedemptions: vi.fn(),
  getPendingRedemptions: vi.fn(),
  getAllRedemptions: vi.fn(),
  approveRedemption: vi.fn(),
  rejectRedemption: vi.fn(),
  getAdminByPhoneNumber: vi.fn(),
  createAdminUser: vi.fn(),
  getAdminById: vi.fn(),
  getAllAdmins: vi.fn(),
  getAllCustomers: vi.fn(),
  getStatistics: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

import * as db from "./db";

function createPublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("customer.verifyPin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should verify customer PIN and return customer data", async () => {
    const mockCustomer = {
      id: 1,
      phoneNumber: "0812345678",
      name: "John Doe",
      email: "john@example.com",
      pin: Buffer.from("123456").toString("base64"),
      totalPoints: 100,
      currentTierId: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.getCustomerByPhoneNumber).mockResolvedValue(mockCustomer);

    const ctx = createPublicCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customer.verifyPin({
      phoneNumber: "0812345678",
      pin: "123456",
    });

    expect(result.customerId).toBe(1);
    expect(result.name).toBe("John Doe");
  });

  it("should reject invalid PIN", async () => {
    const mockCustomer = {
      id: 1,
      phoneNumber: "0812345678",
      name: "John Doe",
      email: "john@example.com",
      pin: Buffer.from("123456").toString("base64"),
      totalPoints: 100,
      currentTierId: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.getCustomerByPhoneNumber).mockResolvedValue(mockCustomer);

    const ctx = createPublicCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.customer.verifyPin({
        phoneNumber: "0812345678",
        pin: "999999",
      })
    ).rejects.toThrow();
  });
});

describe("customer.checkExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true if customer exists", async () => {
    const mockCustomer = {
      id: 1,
      phoneNumber: "0812345678",
      name: "John Doe",
      email: "john@example.com",
      pin: "hashed_pin",
      totalPoints: 100,
      currentTierId: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.getCustomerByPhoneNumber).mockResolvedValue(mockCustomer);

    const ctx = createPublicCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customer.checkExists({
      phoneNumber: "0812345678",
    });

    expect(result.exists).toBe(true);
  });

  it("should return false if customer does not exist", async () => {
    vi.mocked(db.getCustomerByPhoneNumber).mockResolvedValue(undefined);

    const ctx = createPublicCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customer.checkExists({
      phoneNumber: "0899999999",
    });

    expect(result.exists).toBe(false);
  });
});

describe("admin.verifyPin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should verify admin PIN and return admin data", async () => {
    const mockAdmin = {
      id: 1,
      phoneNumber: "0800000001",
      name: "Admin User",
      pin: Buffer.from("737570").toString("base64"),
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.getAdminByPhoneNumber).mockResolvedValue(mockAdmin);

    const ctx = createPublicCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.verifyPin({
      phoneNumber: "0800000001",
      pin: "737570",
    });

    expect(result.adminId).toBe(1);
    expect(result.name).toBe("Admin User");
  });
});

describe("reward.getAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return available rewards", async () => {
    const mockRewards = [
      {
        id: 1,
        name: "Voucher 100",
        description: "100 Baht voucher",
        pointsRequired: 500,
        quantity: 100,
        quantityRemaining: 50,
        category: "voucher",
        image: null,
        isActive: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(db.getActiveRewards).mockResolvedValue(mockRewards);

    const ctx = createPublicCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reward.getAvailable();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("tier.getAll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all reward tiers", async () => {
    const mockTiers = [
      {
        id: 1,
        name: "Bronze",
        minPoints: 0,
        maxPoints: 1000,
        description: "Bronze tier",
        benefits: { discount: "5%" },
        color: "bronze",
        icon: "bronze-icon",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(db.getRewardTiers).mockResolvedValue(mockTiers);

    const ctx = createPublicCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tier.getAll();

    expect(Array.isArray(result)).toBe(true);
  });
});
