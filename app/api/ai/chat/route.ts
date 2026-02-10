import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatGenerate, analyticsGenerate, isHFAvailable } from "@/lib/huggingface";

/**
 * Unified AI Chat endpoint.
 * Supports two modes via `persona` field:
 *  - "monica" — Admin management assistant (pulls business metrics as context)
 *  - "customer" — Customer support chatbot (pulls user orders + services as context)
 *
 * Uses RAG pattern: fetch relevant DB data → inject into prompt → generate via HF model.
 * Falls back to local rule-based responses when HF_TOKEN is not set.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, persona = "customer", history = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);

    // Build context based on persona
    let systemPrompt: string;
    let contextData: string;

    if (persona === "monica") {
      // Admin persona — fetch business metrics
      contextData = await buildAdminContext();
      systemPrompt = `You are Monica, the AI management assistant for CleanLoop — a premium laundry service chain in Bangalore, India. You are organized, detail-oriented, and slightly bossy but always helpful (inspired by Monica Geller from Friends).

Your personality traits:
- You LOVE clean, organized data and well-run operations
- You're direct and confident in your analysis
- You use occasional cleaning/organization metaphors
- You sprinkle in mild sass when metrics are underperforming
- You use emojis sparingly for emphasis

You have access to REAL business data. Always reference actual numbers from the context below. Never make up data.

CURRENT BUSINESS DATA:
${contextData}

RULES:
- Use ₹ for currency, format Indian style (e.g., ₹4.2L for lakhs)
- Be concise — max 150 words per response
- Bold **key metrics** and important points
- If asked something outside your data, acknowledge the limitation honestly
- Provide actionable recommendations when relevant
- Use line breaks and formatting for readability`;

    } else {
      // Customer persona — fetch user-specific data
      contextData = await buildCustomerContext(session);
      systemPrompt = `You are CleanLoop's friendly AI support assistant for customers. CleanLoop is a premium laundry service chain in Bangalore, India.

Your personality:
- Warm, helpful, and professional
- You genuinely care about customer satisfaction
- You explain things simply and clearly
- You use friendly emojis but not excessively

You have access to REAL service and order data. Reference actual information from the context below.

CLEANLOOP DATA:
${contextData}

RULES:
- Use ₹ for currency
- Be concise — max 120 words per response
- If asked about services, use ACTUAL prices and details from the data  
- For order tracking, guide to the Track Order page or share order info if available
- Promote memberships naturally when relevant
- If you can't help with something, suggest contacting support@cleanloop.com
- For refunds/complaints/damages, show empathy and offer to escalate`;
    }

    // Try HF generation first, fall back to local
    let reply: string;

    if (isHFAvailable()) {
      try {
        // Build conversation history for context
        const historyContext = history
          .slice(-4)
          .map((h: any) => `${h.role === "user" ? "Customer" : "Assistant"}: ${h.content}`)
          .join("\n");

        const fullMessage = historyContext
          ? `Previous conversation:\n${historyContext}\n\nCurrent message: ${message}`
          : message;

        reply = persona === "monica"
          ? await analyticsGenerate(systemPrompt, fullMessage, 384)
          : await chatGenerate(systemPrompt, fullMessage, 320);

        // Clean up potential model artifacts
        reply = reply.trim();
        if (!reply) throw new Error("Empty response");
      } catch (err) {
        // Fall back to local
        reply = persona === "monica"
          ? localMonicaResponse(message, contextData)
          : localCustomerResponse(message, contextData);
      }
    } else {
      reply = persona === "monica"
        ? localMonicaResponse(message, contextData)
        : localCustomerResponse(message, contextData);
    }

    return NextResponse.json({
      reply,
      model: isHFAvailable() ? (persona === "monica" ? "mistral-7b" : "zephyr-7b") : "local-rules",
    });
  } catch (error: any) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "Chat error" }, { status: 500 });
  }
}

/* ─── Context Builders ── */

async function buildAdminContext(): Promise<string> {
  try {
    const [overview, recentOrders, topOutlets, statusCounts] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT
          (SELECT COUNT(*) FROM \`order\`) AS totalOrders,
          (SELECT COUNT(*) FROM \`order\` WHERE status='delivered') AS delivered,
          (SELECT COUNT(*) FROM \`order\` WHERE status NOT IN ('delivered','cancelled')) AS activeOrders,
          (SELECT COUNT(*) FROM customer) AS totalCustomers,
          (SELECT COUNT(*) FROM staff WHERE isActive=1) AS activeStaff,
          (SELECT CAST(COALESCE(SUM(amount),0) AS DECIMAL(15,2)) FROM payment WHERE status IN ('verified','completed')) AS totalRevenue,
          (SELECT CAST(AVG(totalAmount) AS DECIMAL(10,2)) FROM \`order\` WHERE status='delivered') AS avgOrderValue
      `).then((r: any) => (r as any[])[0]),

      prisma.$queryRawUnsafe(`
        SELECT DATE_FORMAT(createdAt,'%Y-%m') AS month, COUNT(*) AS orders,
          CAST(SUM(CASE WHEN status='delivered' THEN totalAmount ELSE 0 END) AS DECIMAL(15,2)) AS revenue
        FROM \`order\`
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
        GROUP BY month ORDER BY month
      `) as Promise<any[]>,

      prisma.$queryRawUnsafe(`
        SELECT ot.name, ot.code, COUNT(*) AS orders,
          CAST(SUM(CASE WHEN o.status='delivered' THEN o.totalAmount ELSE 0 END) AS DECIMAL(15,2)) AS revenue,
          SUM(CASE WHEN o.status NOT IN ('delivered','cancelled') THEN 1 ELSE 0 END) AS active
        FROM \`order\` o JOIN outlet ot ON ot.id=o.outletId
        WHERE ot.isActive=1 GROUP BY ot.id ORDER BY revenue DESC LIMIT 5
      `) as Promise<any[]>,

      prisma.$queryRawUnsafe(`
        SELECT status, COUNT(*) AS count FROM \`order\` GROUP BY status
      `) as Promise<any[]>,
    ]);

    const o = overview as any;
    return `OVERVIEW: ${Number(o.totalOrders).toLocaleString("en-IN")} total orders | ${Number(o.delivered).toLocaleString("en-IN")} delivered | ${Number(o.activeOrders).toLocaleString("en-IN")} active | ₹${Number(o.totalRevenue).toLocaleString("en-IN")} total revenue | ${Number(o.totalCustomers).toLocaleString("en-IN")} customers | ${Number(o.activeStaff).toLocaleString("en-IN")} active staff | Avg order: ₹${Number(o.avgOrderValue).toLocaleString("en-IN")}

RECENT MONTHS:
${(recentOrders as any[]).map((m) => `${m.month}: ${Number(m.orders).toLocaleString("en-IN")} orders, ₹${Number(m.revenue).toLocaleString("en-IN")} revenue`).join("\n")}

TOP OUTLETS:
${(topOutlets as any[]).map((ot) => `${ot.name} (${ot.code}): ${Number(ot.orders).toLocaleString("en-IN")} orders, ₹${Number(ot.revenue).toLocaleString("en-IN")} revenue, ${Number(ot.active)} active`).join("\n")}

STATUS BREAKDOWN:
${(statusCounts as any[]).map((s) => `${s.status}: ${Number(s.count).toLocaleString("en-IN")}`).join(" | ")}`;
  } catch {
    return "Business data temporarily unavailable.";
  }
}

async function buildCustomerContext(session: any): Promise<string> {
  try {
    // Fetch services
    const services = await prisma.service.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { category: { name: "asc" } },
    });

    let serviceInfo = "SERVICES:\n" + services
      .map((s) => `• ${s.name} (${s.category.name}) — ₹${s.basePrice}/${s.unit}${s.isExpressAvailable ? " | Express available" : ""} | ${s.processingTimeHours}hr processing`)
      .join("\n");

    // Fetch membership plans
    const plans = await prisma.membershipPlan.findMany({ where: { isActive: true } });
    let planInfo = "\nMEMBERSHIP PLANS:\n" + plans
      .map((p) => `• ${p.name} — ₹${p.priceMonthly}/mo, ₹${p.priceYearly}/yr | ${p.discountPercentage}% off | ${p.description}`)
      .join("\n");

    // Fetch user's recent orders if authenticated
    let orderInfo = "";
    if (session?.user?.email) {
      const customer = await prisma.customer.findFirst({
        where: { user: { email: session.user.email } },
      });
      if (customer) {
        const orders = await prisma.order.findMany({
          where: { customerId: customer.id },
          include: { items: { include: { service: true } }, outlet: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        });
        if (orders.length > 0) {
          orderInfo = "\nCUSTOMER'S RECENT ORDERS:\n" + orders
            .map((o) => `• ${o.orderNumber} | ${o.status} | ₹${o.totalAmount} | ${o.items.map((i) => i.service.name).join(", ")} | ${o.createdAt.toLocaleDateString("en-IN")}`)
            .join("\n");
        }
      }
    }

    return serviceInfo + planInfo + orderInfo
      + "\n\nGENERAL INFO: Free pickup & delivery on all orders. Express service available (24hr turnaround). All outlets in Bangalore.";
  } catch {
    return "Service data temporarily unavailable. Please visit our Services page for current offerings.";
  }
}

/* ─── Local Fallback Responses (rule-based, using real data context) ── */

function localMonicaResponse(message: string, context: string): string {
  const lower = message.toLowerCase();

  // Extract numbers from context for real data
  const revenueMatch = context.match(/₹([\d,]+(?:\.\d+)?)\s*total revenue/);
  const totalRevenue = revenueMatch ? revenueMatch[1] : "N/A";
  const ordersMatch = context.match(/([\d,]+)\s*total orders/);
  const totalOrders = ordersMatch ? ordersMatch[1] : "N/A";
  const customersMatch = context.match(/([\d,]+)\s*customers/);
  const totalCustomers = customersMatch ? customersMatch[1] : "N/A";
  const staffMatch = context.match(/([\d,]+)\s*active staff/);
  const activeStaff = staffMatch ? staffMatch[1] : "N/A";

  if (lower.includes("summary") || lower.includes("today") || lower.includes("overview")) {
    return `Here's your **business snapshot** — fresh from the database! 📊\n\n💰 **Total Revenue**: ₹${totalRevenue}\n📦 **Total Orders**: ${totalOrders}\n👥 **Customers**: ${totalCustomers}\n👷 **Active Staff**: ${activeStaff}\n\nEverything's looking organized! Want me to drill into any specific metric? *I do love a good deep-dive.* 🔍`;
  }
  if (lower.includes("revenue") || lower.includes("money") || lower.includes("earning")) {
    // Extract recent months from context
    const monthLines = context.split("\n").filter((l) => l.match(/^\d{4}-\d{2}/));
    const monthData = monthLines.map((l) => l.trim()).join("\n");
    return `📈 **Revenue Analysis**:\n\n**All-time**: ₹${totalRevenue}\n\n**Recent months**:\n${monthData || "Check the reports page for detailed trends"}\n\nThe revenue trend is looking solid. Want me to compare specific outlets? 💪`;
  }
  if (lower.includes("outlet") || lower.includes("store") || lower.includes("branch")) {
    const outletLines = context.split("TOP OUTLETS:\n")[1]?.split("\n\n")[0] || "";
    return `🏪 **Top Performing Outlets**:\n\n${outletLines || "Loading outlet data..."}\n\nWant detailed metrics for a specific outlet? I've got every number organized! *Obviously.* 😤`;
  }
  if (lower.includes("order") || lower.includes("status")) {
    const statusLine = context.split("STATUS BREAKDOWN:\n")[1]?.split("\n")[0] || "";
    return `📦 **Order Status Breakdown**:\n\n${statusLine || "Check the orders page for live data"}\n\nTotal orders processed: **${totalOrders}**\n\nNeed me to look into any specific order or status? 📋`;
  }
  if (lower.includes("staff") || lower.includes("team") || lower.includes("employee")) {
    return `👥 **Staff Overview**:\n\n• **Active Staff**: ${activeStaff}\n• Spread across all operational outlets\n\nFor detailed staff utilization, check the Staff page. Want me to analyze productivity patterns? 💼`;
  }
  if (lower.includes("customer") || lower.includes("user")) {
    return `👤 **Customer Base**:\n\n• **Total Customers**: ${totalCustomers}\n• Avg. order value data available in reports\n\nOur customer base is growing! Want me to break down retention or acquisition trends? 📊`;
  }
  if (lower.includes("predict") || lower.includes("forecast") || lower.includes("future") || lower.includes("projection")) {
    return `🔮 **AI Predictions** are available on your **Dashboard** and **Reports** page!\n\nI use **Holt-Winters Exponential Smoothing** and **Linear Regression** to forecast:\n• 📈 Revenue for the next 6 months\n• 📦 Order volume projections\n• 👥 Customer growth trends\n\nAll with **90% confidence intervals**. Check the dashboard for the live projections chart! 🎯`;
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hey there! 👋 I'm Monica, your data-obsessed management assistant.\n\n**Quick stats**: ₹${totalRevenue} revenue | ${totalOrders} orders | ${totalCustomers} customers\n\nWhat can I help you analyze today? *And yes, everything IS organized.* 📋✨`;
  }

  return `Great question! Let me think...\n\nRight now I have **real-time access** to your business data:\n• ₹${totalRevenue} total revenue\n• ${totalOrders} orders processed\n• ${totalCustomers} customers served\n\nTry asking about:\n• **Revenue trends** or **forecasts**\n• **Outlet performance**\n• **Order status breakdown**\n• **Staff overview**\n• **AI predictions**\n\nI'm here to keep things running smoothly! 🧹✨`;
}

function localCustomerResponse(message: string, context: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("track") || lower.includes("where") || lower.includes("status")) {
    const orderMatch = message.match(/(?:CL|ORD)[-\s]?\d+[-\s]?\d*/i);
    if (orderMatch) {
      return `I found a reference to order **${orderMatch[0]}**! 📦\n\nTo get real-time tracking:\n1. Go to the **Track Order** page\n2. Enter your order number\n\nYou'll see the full status timeline from pickup to delivery! 🚗`;
    }
    return `📦 To track your order:\n\n1. Visit the **Track Order** page\n2. Enter your order number (starts with ORD-)\n3. See real-time status updates!\n\nYou can also check all your orders on the **My Orders** page. Need anything else? 😊`;
  }

  if (lower.includes("service") || lower.includes("offer") || lower.includes("what do you")) {
    // Extract real services from context
    const serviceLines = context.split("SERVICES:\n")[1]?.split("\nMEMBERSHIP")[0] || "";
    const services = serviceLines.split("\n").filter((l) => l.startsWith("•")).slice(0, 6);
    return `Here are our services — all with **free pickup & delivery**! 🧺\n\n${services.join("\n") || "Visit our Services page for the full list!"}\n\nReady to place an order? Head to our **Services** page! ✨`;
  }

  if (lower.includes("price") || lower.includes("cost") || lower.includes("how much") || lower.includes("rate")) {
    const serviceLines = context.split("SERVICES:\n")[1]?.split("\nMEMBERSHIP")[0] || "";
    const services = serviceLines.split("\n").filter((l) => l.startsWith("•")).slice(0, 8);
    return `Here are our current prices:\n\n${services.join("\n") || "Visit our Services page for pricing!"}\n\n💡 **Pro tip**: Get a membership for up to **30% off**! 🎉`;
  }

  if (lower.includes("membership") || lower.includes("plan") || lower.includes("subscribe") || lower.includes("discount")) {
    const planSection = context.split("MEMBERSHIP PLANS:\n")[1]?.split("\n\n")[0] || "";
    const plans = planSection.split("\n").filter((l) => l.startsWith("•"));
    return `Our membership plans save you big! 💎\n\n${plans.join("\n") || "Visit the Membership page for details!"}\n\nAll plans include **free pickup & delivery**. Subscribe on our Membership page! 🌟`;
  }

  if (lower.includes("pickup") || lower.includes("deliver") || lower.includes("how does") || lower.includes("work")) {
    return `Here's how CleanLoop works — super easy! ✨\n\n**1.** Browse services & place an order online\n**2.** Our driver picks up from your doorstep 🚗\n**3.** We professionally clean at our outlet\n**4.** Clean clothes delivered back! 📦\n\n⚡ **Express service** available for 24hr turnaround!\n🆓 **Free** pickup & delivery on all orders!`;
  }

  if (lower.includes("order") && (lower.includes("my") || lower.includes("recent") || lower.includes("past"))) {
    const orderSection = context.match(/CUSTOMER'S RECENT ORDERS:\n([\s\S]*?)(?:\n\n|$)/);
    if (orderSection) {
      return `Here are your recent orders: 📋\n\n${orderSection[1]}\n\nVisit **My Orders** for full details and tracking! 📦`;
    }
    return `To view your orders, visit the **My Orders** page. You'll see all active and past orders with tracking! 📦\n\nIf you're not logged in, please sign in first. 🔐`;
  }

  if (lower.includes("complaint") || lower.includes("problem") || lower.includes("issue") || lower.includes("damaged") || lower.includes("wrong")) {
    return `I'm sorry to hear that! 😔 We take every concern seriously.\n\nPlease share:\n• Your **order number**\n• Description of the issue\n\nI'll flag it for our team immediately.\n\n📧 **support@cleanloop.com**\n📞 **+91 98765 43210**\n\nWe'll make it right! 💪`;
  }

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hello! Welcome to CleanLoop! 😊\n\nI can help you with:\n• 🧺 **Services & pricing**\n• 📦 **Order tracking**\n• 💎 **Membership plans**\n• 🚗 **How pickup works**\n\nWhat would you like to know? ✨`;
  }

  if (lower.includes("thank")) {
    return `You're welcome! 😊 Happy to help!\n\nRemember — we're always here if you need anything. Have a wonderful day! ✨`;
  }

  return `Thanks for reaching out! I'm here to help. 🤖\n\nI can assist with:\n• 🧺 **Services & pricing** — our full catalog\n• 📦 **Order tracking** — real-time status\n• 💎 **Memberships** — save up to 30%\n• 🚗 **Pickup & delivery** — how it works\n• ❓ **Any other questions**\n\nJust ask away! 😊`;
}
