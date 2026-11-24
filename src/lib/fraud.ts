import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { FraudScore } from "@/models/FraudScore";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

const { fraud } = COMMERCE_CONFIG;

interface FraudFactor {
  factor: string;
  points: number;
  description: string;
}

export async function scoreOrder(orderId: Types.ObjectId): Promise<{ score: number; factors: FraudFactor[]; decision: "auto_approve" | "manual_review" | "hold" }> {
  await connectToDatabase();

  const order = await Order.findById(orderId).lean();
  if (!order) throw new Error("Order not found");

  const factors: FraudFactor[] = [];
  let score = 0;

  const customerId = order.customerId;
  if (customerId) {
    const customer = await Customer.findById(customerId).lean();
    if (customer && customer.createdAt) {
      const accountAgeDays = (Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeDays < fraud.newAccountDays) {
        score += fraud.factors.newAccount;
        factors.push({
          factor: "new_account",
          points: fraud.factors.newAccount,
          description: `Account created ${Math.round(accountAgeDays)} days ago`,
        });
      }

      const userAvgOrder = customer.orderCount > 0 ? customer.lifetimeValue / customer.orderCount : 0;
      if (userAvgOrder > 0 && order.total > userAvgOrder * fraud.orderValueMultiplier) {
        score += fraud.factors.orderValueHigh;
        factors.push({
          factor: "high_order_value",
          points: fraud.factors.orderValueHigh,
          description: `Order value ${order.total} RWF is ${fraud.orderValueMultiplier}x user average ${Math.round(userAvgOrder)} RWF`,
        });
      }

      const recentFailedPayments = await Order.countDocuments({
        customerId,
        paymentStatus: "unpaid",
        createdAt: { $gte: new Date(Date.now() - fraud.failedPaymentsWindowHours * 60 * 60 * 1000) },
      });
      if (recentFailedPayments >= 3) {
        score += fraud.factors.failedPayments;
        factors.push({
          factor: "failed_payments",
          points: fraud.factors.failedPayments,
          description: `${recentFailedPayments} failed payments in last ${fraud.failedPaymentsWindowHours} hour(s)`,
        });
      }

      const rapidOrders = await Order.countDocuments({
        customerId,
        createdAt: { $gte: new Date(Date.now() - fraud.rapidRepeatWindowHours * 60 * 60 * 1000) },
      });
      if (rapidOrders >= 3) {
        score += fraud.factors.rapidRepeatOrders;
        factors.push({
          factor: "rapid_repeat_orders",
          points: fraud.factors.rapidRepeatOrders,
          description: `${rapidOrders} orders in last ${fraud.rapidRepeatWindowHours} hour(s)`,
        });
      }
    }
  }

  if (order.delivery.line1 && order.customer.phone) {
    const phoneOrders = await Order.countDocuments({
      "customer.phone": order.customer.phone,
      _id: { $ne: orderId },
    });
    if (phoneOrders >= 3) {
      const uniqueCustomers = await Order.distinct("customerId", { "customer.phone": order.customer.phone });
      if (uniqueCustomers.length >= 3) {
        score += fraud.factors.multiAccountPhone;
        factors.push({
          factor: "multi_account_phone",
          points: fraud.factors.multiAccountPhone,
          description: `${uniqueCustomers.length} accounts share phone ${order.customer.phone}`,
        });
      }
    }
  }

  // Note: deviceFingerprint would need to be stored in order metadata
  // This is a placeholder for when that field is added

  // High-risk categories check would need category info in order items
  // This is a placeholder for when that field is added

  score = Math.min(100, score);

  let decision: "auto_approve" | "manual_review" | "hold";
  if (score <= fraud.scoreThresholds.autoApprove) decision = "auto_approve";
  else if (score <= fraud.scoreThresholds.manualReview) decision = "manual_review";
  else decision = "hold";

  await FraudScore.updateOne(
    { orderId },
    {
      $set: {
        score,
        factors,
        decision,
        reviewed: false,
      },
    },
    { upsert: true },
  );

  return { score, factors, decision };
}

export async function getFraudReviewQueue(): Promise<Array<{
  orderId: Types.ObjectId;
  orderNumber: string;
  score: number;
  factors: FraudFactor[];
  customerName: string;
  customerPhone: string;
  total: number;
  createdAt: Date;
}>> {
  await connectToDatabase();

  const fraudScores = await FraudScore.find({ decision: { $in: ["manual_review", "hold"] }, reviewed: false })
    .sort({ score: -1, createdAt: -1 })
    .lean();

  const orderIds = fraudScores.map((fs) => fs.orderId);
  const orders = await Order.find({ _id: { $in: orderIds } })
    .select("orderNumber customer.name customer.phone total createdAt")
    .lean();

  const orderMap = new Map(orders.map((o) => [o._id.toString(), o]));

  return fraudScores.map((fs) => {
    const order = orderMap.get(fs.orderId.toString());
    return {
      orderId: fs.orderId,
      orderNumber: order?.orderNumber ?? "Unknown",
      score: fs.score,
      factors: fs.factors,
      customerName: order?.customer?.name ?? "Unknown",
      customerPhone: order?.customer?.phone ?? "Unknown",
      total: order?.total ?? 0,
      createdAt: fs.createdAt,
    };
  });
}

export async function reviewFraudScore(
  orderId: Types.ObjectId,
  reviewerId: Types.ObjectId,
  decision: "approve" | "reject",
  note?: string,
): Promise<void> {
  await connectToDatabase();

  const fraudScore = await FraudScore.findOne({ orderId });
  if (!fraudScore) throw new Error("Fraud score not found");

  fraudScore.reviewed = true;
  fraudScore.reviewedBy = reviewerId;
  fraudScore.reviewedAt = new Date();
  fraudScore.reviewNote = note ?? "";
  fraudScore.decision = decision === "approve" ? "auto_approve" : "hold";

  await fraudScore.save();

  if (decision === "approve") {
    await Order.updateOne({ _id: orderId }, { $set: { "metadata.fraudReviewed": true } });
  }
}