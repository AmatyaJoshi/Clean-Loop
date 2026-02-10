import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/* ── helpers ───────────────────────────────────────── */
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDec = (min: number, max: number) => +(Math.random() * (max - min) + min).toFixed(2);
const cuid = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'c';
  for (let i = 0; i < 24; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};
const pad = (n: number, w = 5) => String(n).padStart(w, '0');
const dateInRange = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

/* ── name pools ────────────────────────────────────── */
const FIRST_NAMES = [
  'Aarav','Aditi','Aditya','Akash','Amit','Amita','Anand','Anika','Anita','Anjali',
  'Ankita','Arjun','Asha','Bhavna','Chandra','Deepak','Deepika','Dev','Devi','Dhruv',
  'Divya','Gaurav','Gauri','Geeta','Harsh','Isha','Ishaan','Jaya','Kartik','Kavita',
  'Kiran','Kriti','Kunal','Lata','Madhavi','Manoj','Maya','Meena','Mohan','Mohini',
  'Nandini','Naveen','Neha','Nikhil','Nisha','Omkar','Pallavi','Pooja','Pradeep','Pranav',
  'Priya','Rahul','Rajat','Rajesh','Rakesh','Rani','Ravi','Rekha','Ritika','Rohit',
  'Sahil','Sakshi','Sandeep','Sapna','Sarita','Shanti','Shikha','Shivam','Shreya','Sneha',
  'Sonia','Sudhir','Sunita','Sunil','Suresh','Swati','Tanvi','Tarun','Uma','Varun',
  'Vidya','Vijay','Vikram','Vinay','Vinita','Virat','Yash','Yogesh','Zara','Aparna',
  'Siddharth','Arun','Kishore','Lakshmi','Padma','Ramesh','Sanjay','Usha','Vivek','Anuradha',
];
const LAST_NAMES = [
  'Agarwal','Banerjee','Bhat','Chauhan','Chawla','Chopra','Das','Desai','Deshpande','Dubey',
  'Ghosh','Gupta','Iyer','Jain','Jha','Joshi','Kapoor','Khan','Kumar','Malhotra',
  'Mehta','Mishra','Mukherjee','Nair','Patel','Pillai','Rao','Reddy','Roy','Saxena',
  'Sen','Shah','Sharma','Shukla','Singh','Sinha','Soni','Srivastava','Tiwari','Trivedi',
  'Varma','Verma','Yadav','Choudhary','Kulkarni','Menon','Naidu','Patil','Rathore','Thakur',
  'Pandey','Bajaj','Kaur','Gill','Bose','Chatterjee','Hegde','Mital','Tandon','Bhatt',
  'Dutta','Goswami','Khanna','Mathur','Sethi','Sood','Vohra','Walia','Arora','Bhatnagar',
];

const STREETS = [
  'MG Road','Park Street','Link Road','Station Road','Gandhi Nagar','Nehru Place',
  'Civil Lines','Mall Road','Ring Road','Race Course Road','Lakshmi Nagar','Sector 18',
  'Koramangala','Banjara Hills','Andheri West','Juhu Lane','HSR Layout','Whitefield',
  'Salt Lake','CP Area','Powai','Hiranandani','T Nagar','Anna Nagar','Jubilee Hills',
];

/* ── outlet definitions ────────────────────────────── */
const OUTLETS = [
  { code: 'MUM01', name: 'CleanLoop Mumbai Central',  city: 'Mumbai',    state: 'Maharashtra',  lat: 19.0760,  lng: 72.8777  },
  { code: 'PUN01', name: 'CleanLoop Pune Station',    city: 'Pune',      state: 'Maharashtra',  lat: 18.5204,  lng: 73.8567  },
  { code: 'DEL01', name: 'CleanLoop New Delhi Hub',   city: 'New Delhi',  state: 'Delhi',        lat: 28.6139,  lng: 77.2090  },
  { code: 'BLR01', name: 'CleanLoop Bengaluru CBD',   city: 'Bengaluru', state: 'Karnataka',    lat: 12.9716,  lng: 77.5946  },
  { code: 'CHN01', name: 'CleanLoop Chennai Central', city: 'Chennai',   state: 'Tamil Nadu',   lat: 13.0827,  lng: 80.2707  },
  { code: 'HYD01', name: 'CleanLoop Hyderabad Hub',   city: 'Hyderabad', state: 'Telangana',    lat: 17.3850,  lng: 78.4867  },
  { code: 'KOL01', name: 'CleanLoop Kolkata Park St', city: 'Kolkata',   state: 'West Bengal',  lat: 22.5726,  lng: 88.3639  },
  { code: 'AMD01', name: 'CleanLoop Ahmedabad SG',    city: 'Ahmedabad', state: 'Gujarat',      lat: 23.0225,  lng: 72.5714  },
  { code: 'JAI01', name: 'CleanLoop Jaipur MI Road',  city: 'Jaipur',    state: 'Rajasthan',    lat: 26.9124,  lng: 75.7873  },
  { code: 'LKO01', name: 'CleanLoop Lucknow Hazratganj', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
];

const OPERATING_HOURS = JSON.stringify({
  monday:    { open: '07:00', close: '21:00', isOpen: true },
  tuesday:   { open: '07:00', close: '21:00', isOpen: true },
  wednesday: { open: '07:00', close: '21:00', isOpen: true },
  thursday:  { open: '07:00', close: '21:00', isOpen: true },
  friday:    { open: '07:00', close: '21:00', isOpen: true },
  saturday:  { open: '08:00', close: '20:00', isOpen: true },
  sunday:    { open: '09:00', close: '18:00', isOpen: true },
});

/* ── service definitions ───────────────────────────── */
const CATEGORIES = [
  { name: 'Washing',      desc: 'Regular and delicate wash services',   order: 1 },
  { name: 'Ironing',      desc: 'Steam and press ironing services',     order: 2 },
  { name: 'Dry Cleaning', desc: 'Professional dry cleaning',            order: 3 },
  { name: 'Premium Care', desc: 'Luxury and specialty garment care',    order: 4 },
  { name: 'Home Textiles',desc: 'Curtains, bedsheets and home items',   order: 5 },
];

const SERVICES = [
  { cat: 0, name: 'Regular Wash',      code: 'WASH01',  price: 49,   hours: 24, express: true,  unit: 'piece' },
  { cat: 0, name: 'Delicate Wash',     code: 'WASH02',  price: 79,   hours: 36, express: true,  unit: 'piece' },
  { cat: 1, name: 'Steam Iron',        code: 'IRON01',  price: 29,   hours: 12, express: true,  unit: 'piece' },
  { cat: 1, name: 'Press Iron',        code: 'IRON02',  price: 19,   hours: 12, express: false, unit: 'piece' },
  { cat: 2, name: 'Suit Dry Clean',    code: 'DC01',    price: 299,  hours: 48, express: true,  unit: 'piece' },
  { cat: 2, name: 'Saree Dry Clean',   code: 'DC02',    price: 199,  hours: 48, express: true,  unit: 'piece' },
  { cat: 2, name: 'Jacket & Coat',     code: 'DC03',    price: 349,  hours: 48, express: false, unit: 'piece' },
  { cat: 3, name: 'Leather Care',      code: 'PREM01', price: 499,  hours: 72, express: false, unit: 'piece' },
  { cat: 3, name: 'Wedding Outfit',    code: 'PREM02', price: 799,  hours: 72, express: true,  unit: 'set'   },
  { cat: 4, name: 'Curtains',          code: 'HOME01', price: 149,  hours: 48, express: false, unit: 'piece' },
  { cat: 4, name: 'Bedsheet Set',      code: 'HOME02', price: 99,   hours: 36, express: true,  unit: 'set'   },
  { cat: 4, name: 'Carpet Cleaning',   code: 'HOME03', price: 599,  hours: 72, express: false, unit: 'piece' },
];

const MEMBERSHIP_PLANS = [
  {
    name: 'Basic',
    desc: 'Essential laundry savings plan',
    monthly: 299, yearly: 2999,
    discount: 5, freePickup: false, priority: false, maxOrders: 10, order: 1,
    features: ['5% discount on all orders', 'Up to 10 orders/month', 'Order tracking', 'Email support'],
  },
  {
    name: 'Premium',
    desc: 'Best value for regular customers',
    monthly: 599, yearly: 5999,
    discount: 12, freePickup: true, priority: false, maxOrders: 25, order: 2,
    features: ['12% discount on all orders', 'Up to 25 orders/month', 'Free pickup & delivery', 'Priority queue', 'SMS updates'],
  },
  {
    name: 'Elite',
    desc: 'Ultimate care for discerning customers',
    monthly: 999, yearly: 9999,
    discount: 20, freePickup: true, priority: true, maxOrders: null, order: 3,
    features: ['20% discount on all orders', 'Unlimited orders', 'Free pickup & delivery', 'Priority support', 'Dedicated agent', 'Same-day express'],
  },
];

const ORDER_STATUSES = ['pending', 'confirmed', 'picked_up', 'in_progress', 'quality_check', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
const PAYMENT_METHODS = ['card', 'upi', 'cash', 'cod', 'wallet', 'net_banking'];

/* ── main seed ─────────────────────────────────────── */
async function main() {

  await prisma.membershipTransaction.deleteMany();
  await prisma.customerMembership.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.paymentProof.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.upiAccount.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();


  /* ── Organization ───────────────────────────────── */
  const org = await prisma.organization.create({
    data: {
      id: cuid(),
      name: 'CleanLoop India Pvt. Ltd.',
      subscriptionTier: 'enterprise',
      status: 'active',
      settings: JSON.stringify({ currency: 'INR', taxRate: 18, country: 'IN' }),
    },
  });


  /* ── Admin users ────────────────────────────────── */
  const hashedAdmin = await bcrypt.hash('admin123', 10);
  await prisma.user.createMany({
    data: [
      { id: cuid(), name: 'Rajesh Sharma',  email: 'admin@cleanloop.com', password: hashedAdmin, phone: '9100000001', role: 'owner' },
      { id: cuid(), name: 'Anita Verma',    email: 'ops@cleanloop.com',   password: hashedAdmin, phone: '9100000002', role: 'admin' },
    ],
  });


  /* ── Outlets ────────────────────────────────────── */
  const outletIds: string[] = [];
  for (const o of OUTLETS) {
    const id = cuid();
    outletIds.push(id);
    await prisma.outlet.create({
      data: {
        id,
        organizationId: org.id,
        name: o.name,
        code: o.code,
        address: JSON.stringify({ street: pick(STREETS), city: o.city, state: o.state, zipCode: String(rand(100000, 999999)), country: 'India' }),
        geolocation: JSON.stringify({ lat: o.lat, lng: o.lng }),
        capacityPerDay: rand(80, 200),
        operatingHours: OPERATING_HOURS,
        contactDetails: JSON.stringify({ phone: `91${rand(70000, 99999)}${rand(10000, 99999)}`, email: `${o.code.toLowerCase()}@cleanloop.com` }),
        isActive: true,
      },
    });
  }


  /* ── Service categories & services ──────────────── */
  const catIds: string[] = [];
  for (const c of CATEGORIES) {
    const id = cuid();
    catIds.push(id);
    await prisma.serviceCategory.create({
      data: { id, name: c.name, description: c.desc, displayOrder: c.order, isActive: true },
    });
  }

  const serviceIds: string[] = [];
  const servicePrices: number[] = [];
  for (const s of SERVICES) {
    const id = cuid();
    serviceIds.push(id);
    servicePrices.push(s.price);
    await prisma.service.create({
      data: {
        id,
        organizationId: org.id,
        categoryId: catIds[s.cat],
        name: s.name,
        code: s.code,
        description: `Professional ${s.name.toLowerCase()} service`,
        basePrice: s.price,
        processingTimeHours: s.hours,
        isExpressAvailable: s.express,
        expressMultiplier: 1.5,
        unit: s.unit,
        isActive: true,
      },
    });
  }


  /* ── Membership plans ───────────────────────────── */
  const planIds: string[] = [];
  for (const p of MEMBERSHIP_PLANS) {
    const id = cuid();
    planIds.push(id);
    await prisma.membershipPlan.create({
      data: {
        id,
        name: p.name,
        description: p.desc,
        priceMonthly: p.monthly,
        priceYearly: p.yearly,
        features: JSON.stringify(p.features),
        discountPercentage: p.discount,
        freePickupDelivery: p.freePickup,
        prioritySupport: p.priority,
        maxOrders: p.maxOrders,
        isActive: true,
        displayOrder: p.order,
      },
    });
  }


  /* ── Staff (2 000) ──────────────────────────────── */
  const hashedStaff = await bcrypt.hash('staff123', 10);
  const STAFF_BATCH = 200;
  const TOTAL_STAFF = 2000;
  const positions = ['cleaner', 'delivery_agent', 'cleaner', 'delivery_agent', 'cleaner'];


  for (let b = 0; b < TOTAL_STAFF / STAFF_BATCH; b++) {
    const users: any[] = [];
    const staffRows: any[] = [];
    for (let i = 0; i < STAFF_BATCH; i++) {
      const idx = b * STAFF_BATCH + i;
      const uid = cuid();
      const fn = pick(FIRST_NAMES);
      const ln = pick(LAST_NAMES);
      const isManager = idx < 10; // first 10 = outlet managers
      const role = isManager ? 'outlet_manager' : 'staff';
      const isActive = Math.random() < 0.82;
      const joinDate = dateInRange(new Date('2016-01-01'), new Date('2025-12-31'));

      users.push({
        id: uid,
        name: `${fn} ${ln}`,
        email: `staff${pad(idx + 1)}@cleanloop.com`,
        password: hashedStaff,
        phone: `91${rand(60000, 99999)}${pad(rand(0, 99999))}`,
        role,
        createdAt: joinDate,
        updatedAt: joinDate,
      });
      staffRows.push({
        id: cuid(),
        userId: uid,
        outletId: outletIds[idx % 10],
        position: isManager ? 'manager' : pick(positions),
        isActive,
        createdAt: joinDate,
        updatedAt: joinDate,
      });
    }
    await prisma.user.createMany({ data: users, skipDuplicates: true });
    await prisma.staff.createMany({ data: staffRows, skipDuplicates: true });

  }


  /* ── Customers (10 000) ─────────────────────────── */
  const hashedCustomer = await bcrypt.hash('customer123', 10);
  const CUST_BATCH = 500;
  const TOTAL_CUST = 10000;
  const customerIds: string[] = [];
  const customerOutletMap: string[] = [];


  for (let b = 0; b < TOTAL_CUST / CUST_BATCH; b++) {
    const users: any[] = [];
    const custRows: any[] = [];
    for (let i = 0; i < CUST_BATCH; i++) {
      const idx = b * CUST_BATCH + i;
      const uid = cuid();
      const custId = cuid();
      const fn = pick(FIRST_NAMES);
      const ln = pick(LAST_NAMES);
      const outletIdx = idx % 10;
      const city = OUTLETS[outletIdx].city;
      const joinDate = dateInRange(new Date('2016-01-01'), new Date('2025-12-31'));

      customerIds.push(custId);
      customerOutletMap.push(outletIds[outletIdx]);

      users.push({
        id: uid,
        name: `${fn} ${ln}`,
        email: `cust${pad(idx + 1)}@example.com`,
        password: hashedCustomer,
        phone: `91${rand(60000, 99999)}${pad(rand(0, 99999))}`,
        role: 'customer',
        createdAt: joinDate,
        updatedAt: joinDate,
      });
      custRows.push({
        id: custId,
        userId: uid,
        organizationId: org.id,
        customerCode: `CL-${OUTLETS[outletIdx].code.slice(0, 3)}-${pad(idx + 1)}`,
        addresses: JSON.stringify([{ street: `${rand(1, 999)}, ${pick(STREETS)}`, city, state: OUTLETS[outletIdx].state, zipCode: String(rand(100000, 999999)), country: 'India', label: 'Home' }]),
        loyaltyPoints: 0,
        totalOrders: 0,
        lifetimeValue: 0,
        preferences: JSON.stringify({ preferredTime: pick(['morning', 'afternoon', 'evening']) }),
        tags: JSON.stringify(Math.random() < 0.3 ? ['vip'] : []),
        createdAt: joinDate,
        updatedAt: joinDate,
      });
    }
    await prisma.user.createMany({ data: users, skipDuplicates: true });
    await prisma.customer.createMany({ data: custRows, skipDuplicates: true });

  }


  /* ── Orders spanning 2016 → 2026 ────────────────── */


  // Growth: ~200/month in 2016 → ~3200/month in 2026 (~200K total)
  const monthlyGrowth = (year: number, month: number): number => {
    const t = (year - 2016) * 12 + month; // 0-based month index
    const base = 200 + (t / 120) * 3000;
    // seasonal multipliers
    const seasonalMultipliers: Record<number, number> = {
      0: 0.85,  // Jan – slow
      1: 0.92,
      2: 1.0,
      3: 1.05,
      4: 1.15,  // May – summer
      5: 1.15,  // Jun – summer
      6: 0.90,  // Jul – monsoon dip
      7: 0.88,
      8: 1.05,
      9: 1.30,  // Oct – festive season
      10: 1.30, // Nov – Diwali
      11: 1.10,
    };
    return Math.round(base * (seasonalMultipliers[month] ?? 1));
  };

  let orderSeq = 0;
  let totalOrdersGenerated = 0;

  const statusFlow = ['pending', 'confirmed', 'picked_up', 'in_progress', 'quality_check', 'ready', 'out_for_delivery', 'delivered'];

  const NOW = new Date(); // current date — no order after this can be delivered

  for (let year = 2016; year <= 2026; year++) {
    const maxMonth = year === 2026 ? 0 : 11; // only up to Jan 2026 (all past)
    for (let month = 0; month <= maxMonth; month++) {
      const count = monthlyGrowth(year, month);
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

      // process in sub-batches of 500 to reduce DB round trips
      for (let bStart = 0; bStart < count; bStart += 500) {
        const bEnd = Math.min(bStart + 500, count);
        const orderBatch: any[] = [];
        const itemBatch: any[] = [];
        const paymentBatch: any[] = [];

        for (let o = bStart; o < bEnd; o++) {
          orderSeq++;
          const orderId = cuid();
          const custIdx = rand(0, customerIds.length - 1);
          const outletId = customerOutletMap[custIdx];
          const city = OUTLETS[outletIds.indexOf(outletId)]?.city ?? 'Mumbai';

          const orderDate = dateInRange(monthStart, monthEnd);
          const isInFuture = orderDate > NOW;
          const isCancelled = !isInFuture && Math.random() < 0.04;
          const isPending = isInFuture || (!isCancelled && Math.random() < 0.02);
          const status = isCancelled ? 'cancelled' : isPending ? pick(['pending', 'confirmed', 'picked_up', 'in_progress']) : 'delivered';
          const priority = Math.random() < 0.15 ? 'express' : Math.random() < 0.03 ? 'urgent' : 'normal';

          // items (1-3 per order, realistic laundry basket)
          const numItems = rand(1, 3);
          let subtotal = 0;
          // Weight towards cheaper everyday services (wash, iron)
          const cheapServiceWeight = [0,0,0,1,1,1,2,2,3,3,4,5,6,7,8,9,10,11]; // heavier on wash & iron indices
          for (let it = 0; it < numItems; it++) {
            const sIdx = pick(cheapServiceWeight);
            const qty = rand(1, 3);
            const unitPrice = servicePrices[sIdx];
            const totalPrice = unitPrice * qty;
            subtotal += totalPrice;
            itemBatch.push({
              id: cuid(),
              orderId,
              serviceId: serviceIds[sIdx],
              itemName: SERVICES[sIdx].name,
              quantity: qty,
              unitPrice,
              totalPrice,
              garmentDetails: JSON.stringify({}),
              beforeImages: JSON.stringify([]),
              afterImages: JSON.stringify([]),
              status: status === 'delivered' ? 'delivered' : status === 'cancelled' ? 'cancelled' : 'pending',
              createdAt: orderDate,
              updatedAt: orderDate,
            });
          }

          const taxAmount = +(subtotal * 0.18).toFixed(2);
          const discountAmount = +(subtotal * (Math.random() < 0.3 ? randDec(0.05, 0.15) : 0)).toFixed(2);
          const deliveryCharges = Math.random() < 0.4 ? 0 : pick([29, 49, 59, 79]);
          const totalAmount = +(subtotal + taxAmount - discountAmount + deliveryCharges).toFixed(2);

          // status history
          const history: any[] = [];
          if (!isCancelled && !isPending) {
            let ts = new Date(orderDate);
            for (const st of statusFlow) {
              history.push({ status: st, timestamp: ts.toISOString(), note: '' });
              ts = new Date(ts.getTime() + rand(1, 12) * 3600000);
            }
          } else if (isCancelled) {
            history.push({ status: 'pending', timestamp: orderDate.toISOString(), note: '' });
            history.push({ status: 'cancelled', timestamp: new Date(orderDate.getTime() + rand(1, 24) * 3600000).toISOString(), note: 'Customer requested cancellation' });
          } else {
            history.push({ status: 'pending', timestamp: orderDate.toISOString(), note: '' });
          }

          const addr = JSON.stringify({ street: `${rand(1, 999)}, ${pick(STREETS)}`, city, state: 'India', zipCode: String(rand(100000, 999999)) });

          orderBatch.push({
            id: orderId,
            organizationId: org.id,
            orderNumber: `CL-${String(year).slice(-2)}${pad(orderSeq, 6)}`,
            customerId: customerIds[custIdx],
            outletId,
            status,
            priority,
            subtotal,
            taxAmount,
            discountAmount,
            deliveryCharges,
            totalAmount,
            pickupScheduledAt: orderDate,
            pickupCompletedAt: status !== 'pending' && status !== 'cancelled' ? new Date(orderDate.getTime() + rand(1, 4) * 3600000) : null,
            deliveryScheduledAt: new Date(orderDate.getTime() + 48 * 3600000),
            deliveryCompletedAt: status === 'delivered' ? new Date(orderDate.getTime() + rand(24, 72) * 3600000) : null,
            expectedCompletionAt: new Date(orderDate.getTime() + 48 * 3600000),
            pickupAddress: addr,
            deliveryAddress: addr,
            specialInstructions: Math.random() < 0.1 ? pick(['Handle with care', 'No starch please', 'Use mild detergent', 'Separate whites', 'Fold don\'t hang']) : null,
            statusHistory: JSON.stringify(history),
            metadata: JSON.stringify({}),
            createdAt: orderDate,
            updatedAt: status === 'delivered' ? new Date(orderDate.getTime() + rand(24, 72) * 3600000) : orderDate,
          });

          // payment for non-pending, non-cancelled orders
          if (!isPending && !isCancelled) {
            paymentBatch.push({
              id: cuid(),
              organizationId: org.id,
              orderId,
              customerId: customerIds[custIdx],
              amount: totalAmount,
              paymentMethod: pick(PAYMENT_METHODS),
              paymentGateway: 'manual',
              status: 'completed',
              paidAt: new Date(orderDate.getTime() + rand(1, 48) * 3600000),
              gatewayResponse: JSON.stringify({}),
              metadata: JSON.stringify({}),
              createdAt: orderDate,
              updatedAt: orderDate,
            });
          }
        }

        await prisma.order.createMany({ data: orderBatch, skipDuplicates: true });
        await prisma.orderItem.createMany({ data: itemBatch, skipDuplicates: true });
        if (paymentBatch.length) await prisma.payment.createMany({ data: paymentBatch, skipDuplicates: true });
        totalOrdersGenerated += orderBatch.length;
        // free memory
        orderBatch.length = 0;
        itemBatch.length = 0;
        paymentBatch.length = 0;
      }
    }
    // force GC between years if available
    if (typeof globalThis.gc === 'function') globalThis.gc();

  }


  /* ── Update customer aggregates ─────────────────── */

  await prisma.$executeRawUnsafe(`
    UPDATE customer c
    SET
      totalOrders = (SELECT COUNT(*) FROM \`order\` o WHERE o.customerId = c.id AND o.status != 'cancelled'),
      lifetimeValue = COALESCE((SELECT SUM(o.totalAmount) FROM \`order\` o WHERE o.customerId = c.id AND o.status = 'delivered'), 0),
      loyaltyPoints = FLOOR(COALESCE((SELECT SUM(o.totalAmount) FROM \`order\` o WHERE o.customerId = c.id AND o.status = 'delivered'), 0) / 100)
  `);


  /* ── Memberships (assign 15% of customers) ──────── */

  const membershipCustomers = customerIds.filter(() => Math.random() < 0.15);
  const memBatch: any[] = [];
  const memTxBatch: any[] = [];
  for (const custId of membershipCustomers) {
    const planIdx = Math.random() < 0.5 ? 0 : Math.random() < 0.6 ? 1 : 2;
    const memId = cuid();
    const startDate = dateInRange(new Date('2020-01-01'), new Date('2025-12-01'));
    const isYearly = Math.random() < 0.3;
    const expiryDate = new Date(startDate);
    if (isYearly) expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    else expiryDate.setMonth(expiryDate.getMonth() + 1);
    const isActive = expiryDate > new Date();
    
    memBatch.push({
      id: memId,
      customerId: custId,
      planId: planIds[planIdx],
      status: isActive ? 'active' : 'expired',
      billingCycle: isYearly ? 'yearly' : 'monthly',
      startDate,
      expiryDate,
      autoRenew: Math.random() < 0.6,
      createdAt: startDate,
      updatedAt: startDate,
    });
    memTxBatch.push({
      id: cuid(),
      membershipId: memId,
      type: 'purchase',
      amount: isYearly ? MEMBERSHIP_PLANS[planIdx].yearly : MEMBERSHIP_PLANS[planIdx].monthly,
      status: 'completed',
      description: `${MEMBERSHIP_PLANS[planIdx].name} plan ${isYearly ? 'yearly' : 'monthly'} subscription`,
      metadata: JSON.stringify({}),
      createdAt: startDate,
    });
  }
  // createMany in batches of 500 to avoid hitting limits
  for (let i = 0; i < memBatch.length; i += 500) {
    await prisma.customerMembership.createMany({ data: memBatch.slice(i, i + 500), skipDuplicates: true });
  }
  for (let i = 0; i < memTxBatch.length; i += 500) {
    await prisma.membershipTransaction.createMany({ data: memTxBatch.slice(i, i + 500), skipDuplicates: true });
  }


  /* ── UPI Account ────────────────────────────────── */
  await prisma.upiAccount.create({
    data: {
      id: cuid(),
      organizationId: org.id,
      upiId: 'cleanloop@ybl',
      name: 'CleanLoop India Pvt. Ltd.',
      isActive: true,
      isDefault: true,
    },
  });



}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
