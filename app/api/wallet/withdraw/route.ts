import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";

// Validation schemas
const createWithdrawalSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .min(10, "Minimum withdrawal amount is $10"),
  method: z.enum(["bank_transfer", "crypto", "paypal"], {
    errorMap: () => ({ message: "Invalid withdrawal method" }),
  }),
  destination: z
    .object({
      // Bank transfer fields
      accountName: z.string().optional(),
      accountNumber: z.string().optional(),
      bankName: z.string().optional(),
      routingNumber: z.string().optional(),
      swiftCode: z.string().optional(),
      // Crypto fields
      walletAddress: z.string().optional(),
      cryptoCurrency: z.string().optional(),
      network: z.string().optional(),
      // PayPal fields
      email: z.string().email("Invalid PayPal email").optional(),
    })
    .optional(),
});

// Withdrawal limits and fees
const MIN_WITHDRAWAL_AMOUNT = 10; // $10 minimum
const MAX_WITHDRAWAL_AMOUNT = 10000; // $10,000 maximum per withdrawal
const WITHDRAWAL_FEE_PERCENTAGE = 0.02; // 2% fee
const MIN_WITHDRAWAL_FEE = 1; // $1 minimum fee
const MAX_DAILY_WITHDRAWAL = 500; // $500 daily limit for new users

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await rateLimit.check(
      `withdraw:ip:${ip}`,
      3,
      300000
    ); // 3 per 5 min

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many withdrawal attempts. Please try again later.",
        },
        { status: 429 }
      );
    }

    // Get authenticated user
    const auth = await getAuthenticatedUser(request);

    if (!auth.user || false) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = auth.user.id;
    const body = await request.json();

    // Validate input
    const validatedData = createWithdrawalSchema.parse(body);

    // Validate amount limits
    if (validatedData.amount > MAX_WITHDRAWAL_AMOUNT) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum withdrawal amount is $${MAX_WITHDRAWAL_AMOUNT}`,
        },
        { status: 400 }
      );
    }

    // Get user wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "Wallet not found" },
        { status: 404 }
      );
    }

    // Check sufficient balance
    if (Number(wallet.balance) < validatedData.amount) {
      return NextResponse.json(
        { success: false, error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Check daily withdrawal limit for new users (less than 30 days old)
    const userAge = Date.now() - new Date(auth.user.createdAt).getTime();
    const isUserNew = userAge < 30 * 24 * 60 * 60 * 1000; // 30 days

    if (isUserNew) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyWithdrawals = await prisma.withdrawal.aggregate({
        where: {
          userId,
          status: { not: "failed" },
          createdAt: { gte: today },
        },
        _sum: { amount: true },
      });

      const todayTotal = Number(dailyWithdrawals._sum.amount || 0);
      if (todayTotal + validatedData.amount > MAX_DAILY_WITHDRAWAL) {
        return NextResponse.json(
          {
            success: false,
            error: `Daily withdrawal limit of $${MAX_DAILY_WITHDRAWAL} exceeded`,
          },
          { status: 400 }
        );
      }
    }

    // Calculate fees
    const withdrawalFee = Math.max(
      validatedData.amount * WITHDRAWAL_FEE_PERCENTAGE,
      MIN_WITHDRAWAL_FEE
    );
    const netAmount = validatedData.amount - withdrawalFee;

    // Validate destination details based on method
    const destination = validatedData.destination || {};
    if (validatedData.method === "bank_transfer") {
      if (
        !destination.accountName ||
        !destination.accountNumber ||
        !destination.bankName
      ) {
        return NextResponse.json(
          { success: false, error: "Bank account details are required" },
          { status: 400 }
        );
      }
    } else if (validatedData.method === "crypto") {
      if (!destination.walletAddress || !destination.cryptoCurrency) {
        return NextResponse.json(
          { success: false, error: "Crypto wallet details are required" },
          { status: 400 }
        );
      }
    } else if (validatedData.method === "paypal") {
      if (!destination.email) {
        return NextResponse.json(
          { success: false, error: "PayPal email is required" },
          { status: 400 }
        );
      }
    }

    // Generate transaction ID
    const transactionId = `wd_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Process withdrawal
    const withdrawal = await prisma.$transaction(async (tx) => {
      // Create withdrawal record
      const newWithdrawal = await tx.withdrawal.create({
        data: {
          userId,
          amount: validatedData.amount,
          currency: "USD",
          method: validatedData.method,
          destination: destination,
          fee: withdrawalFee,
          netAmount,
          status: "pending",
          transactionId,
        },
      });

      // Update wallet (put balance on hold)
      await tx.wallet.update({
        where: { userId },
        data: {
          balance: { decrement: validatedData.amount },
        },
      });

      return newWithdrawal;
    });

    // Track withdrawal analytics
    await prisma.analyticsEvent.create({
      data: {
        userId,
        type: "withdrawal_requested",
        payload: {
          withdrawalId: withdrawal.id,
          transactionId: withdrawal.transactionId,
          amount: validatedData.amount,
          method: validatedData.method,
          fee: withdrawalFee,
          netAmount,
          timestamp: new Date().toISOString(),
        },
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted successfully",
      data: {
        withdrawal: {
          id: withdrawal.id,
          transactionId: withdrawal.transactionId,
          amount: Number(withdrawal.amount),
          fee: Number(withdrawal.fee),
          netAmount: Number(withdrawal.netAmount),
          method: withdrawal.method,
          status: withdrawal.status,
          createdAt: withdrawal.createdAt,
        },
        wallet: {
          newBalance: Number(wallet.balance) - validatedData.amount,
        },
        estimatedProcessingTime: "1-3 business days",
      },
    });
  } catch (error) {
    console.error("Withdrawal POST error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint: Get withdrawal history and available methods
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const auth = await getAuthenticatedUser(request);

    if (!auth.user || false) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = auth.user.id;

    // Get user wallet and withdrawal history
    const [wallet, withdrawals] = await Promise.all([
      prisma.wallet.findUnique({
        where: { userId },
      }),
      prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "Wallet not found" },
        { status: 404 }
      );
    }

    // Get withdrawal statistics
    const stats = await prisma.withdrawal.aggregate({
      where: { userId },
      _sum: { amount: true, fee: true },
      _count: { id: true },
    });

    const totalWithdrawn = Number(stats._sum.amount || 0);
    const totalFees = Number(stats._sum.fee || 0);
    const totalWithdrawals = stats._count.id || 0;

    // Check today's withdrawals for limit tracking
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayWithdrawals = await prisma.withdrawal.aggregate({
      where: {
        userId,
        status: { not: "failed" },
        createdAt: { gte: today },
      },
      _sum: { amount: true },
    });

    const todayTotal = Number(todayWithdrawals._sum.amount || 0);

    // Calculate withdrawal limits
    const userAge = Date.now() - new Date(auth.user.createdAt).getTime();
    const isUserNew = userAge < 30 * 24 * 60 * 60 * 1000; // 30 days
    const dailyLimit = isUserNew ? MAX_DAILY_WITHDRAWAL : Infinity;
    const remainingDailyLimit = Math.max(0, dailyLimit - todayTotal);

    return NextResponse.json({
      success: true,
      data: {
        wallet: {
          balance: Number(wallet.balance),
          currency: wallet.currency,
          totalEarned: Number(wallet.totalEarned),
          totalWithdrawn: Number(wallet.totalWithdrawn),
        },
        limits: {
          minimumAmount: MIN_WITHDRAWAL_AMOUNT,
          maximumAmount: MAX_WITHDRAWAL_AMOUNT,
          dailyLimit: isUserNew ? MAX_DAILY_WITHDRAWAL : null,
          todayTotal,
          remainingDailyLimit: isUserNew ? remainingDailyLimit : null,
        },
        fees: {
          percentage: WITHDRAWAL_FEE_PERCENTAGE * 100,
          minimum: MIN_WITHDRAWAL_FEE,
        },
        statistics: {
          totalWithdrawn,
          totalFees,
          totalWithdrawals,
        },
        availableMethods: [
          {
            id: "bank_transfer",
            name: "Bank Transfer",
            description: "Direct transfer to your bank account",
            processingTime: "1-3 business days",
            fee: `${(WITHDRAWAL_FEE_PERCENTAGE * 100).toFixed(
              1
            )}% (min $${MIN_WITHDRAWAL_FEE})`,
            fields: [
              "accountName",
              "accountNumber",
              "bankName",
              "routingNumber",
              "swiftCode",
            ],
          },
          {
            id: "crypto",
            name: "Cryptocurrency",
            description: "Transfer to your crypto wallet",
            processingTime: "24-48 hours",
            fee: `${(WITHDRAWAL_FEE_PERCENTAGE * 100).toFixed(
              1
            )}% (min $${MIN_WITHDRAWAL_FEE})`,
            fields: ["walletAddress", "cryptoCurrency", "network"],
          },
          {
            id: "paypal",
            name: "PayPal",
            description: "Transfer to your PayPal account",
            processingTime: "1-2 business days",
            fee: `${(WITHDRAWAL_FEE_PERCENTAGE * 100).toFixed(
              1
            )}% (min $${MIN_WITHDRAWAL_FEE})`,
            fields: ["email"],
          },
        ],
        history: withdrawals.map((withdrawal) => ({
          id: withdrawal.id,
          transactionId: withdrawal.transactionId,
          amount: Number(withdrawal.amount),
          fee: Number(withdrawal.fee),
          netAmount: Number(withdrawal.netAmount),
          method: withdrawal.method,
          status: withdrawal.status,
          destination: withdrawal.destination,
          processedAt: withdrawal.processedAt,
          failureReason: withdrawal.failureReason,
          createdAt: withdrawal.createdAt,
          updatedAt: withdrawal.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Withdrawal GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
