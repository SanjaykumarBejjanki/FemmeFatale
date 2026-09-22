import { supabase } from "./supabase";

import type {
  Bill,
  Payment,
  PaymentMethod,
  BillStatus,
} from "../screens/BillingScreen";

function formatDate(value: string | null): string {
  if (!value) return "";

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (!match) return value;

  const [, year, month, day] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  ).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isValidCalendarDate(
  year: number,
  month: number,
  day: number
): boolean {
  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 2100
  ) {
    return false;
  }

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return false;
  }

  if (
    !Number.isInteger(day) ||
    day < 1
  ) {
    return false;
  }

  const daysInMonth = new Date(
    year,
    month,
    0
  ).getDate();

  return day <= daysInMonth;
}

function toDatabaseDate(
  value: string
): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(
      "Bill date is required."
    );
  }

  // --------------------------------------------------
  // YYYY-MM-DD
  // --------------------------------------------------
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (isoMatch) {
    const [
      ,
      yearText,
      monthText,
      dayText,
    ] = isoMatch;

    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    if (
      !isValidCalendarDate(
        year,
        month,
        day
      )
    ) {
      throw new Error(
        `Invalid bill date: ${value}`
      );
    }

    return `${yearText}-${monthText}-${dayText}`;
  }

  // --------------------------------------------------
  // DD/MM/YYYY
  // --------------------------------------------------
  const ddmmyyyy = trimmed.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  );

  if (ddmmyyyy) {
    const [
      ,
      dayText,
      monthText,
      yearText,
    ] = ddmmyyyy;

    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);

    if (
      !isValidCalendarDate(
        year,
        month,
        day
      )
    ) {
      throw new Error(
        `Invalid bill date: ${value}`
      );
    }

    return `${yearText}-${monthText}-${dayText}`;
  }

  // --------------------------------------------------
  // DD Mon YYYY / DD Month YYYY
  //
  // Examples:
  // 21 Sep 2026
  // 21 Sept 2026
  // 21 September 2026
  // --------------------------------------------------
  const textDate = trimmed.match(
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/
  );

  if (textDate) {
    const [
      ,
      dayText,
      monthText,
      yearText,
    ] = textDate;

    const monthMap: Record<
      string,
      number
    > = {
      jan: 1,
      january: 1,

      feb: 2,
      february: 2,

      mar: 3,
      march: 3,

      apr: 4,
      april: 4,

      may: 5,

      jun: 6,
      june: 6,

      jul: 7,
      july: 7,

      aug: 8,
      august: 8,

      sep: 9,
      sept: 9,
      september: 9,

      oct: 10,
      october: 10,

      nov: 11,
      november: 11,

      dec: 12,
      december: 12,
    };

    const month =
      monthMap[
        monthText.toLowerCase()
      ];

    if (!month) {
      throw new Error(
        `Invalid bill date: ${value}`
      );
    }

    const day = Number(dayText);
    const year = Number(yearText);

    if (
      !isValidCalendarDate(
        year,
        month,
        day
      )
    ) {
      throw new Error(
        `Invalid bill date: ${value}`
      );
    }

    const formattedMonth =
      String(month).padStart(2, "0");

    const formattedDay =
      String(day).padStart(2, "0");

    return `${year}-${formattedMonth}-${formattedDay}`;
  }

  // --------------------------------------------------
  // Fallback for other valid JS date strings
  // --------------------------------------------------
  const parsed = Date.parse(trimmed);

  if (!Number.isNaN(parsed)) {
    const date = new Date(parsed);

    const year =
      date.getFullYear();

    const month =
      date.getMonth() + 1;

    const day =
      date.getDate();

    if (
      !isValidCalendarDate(
        year,
        month,
        day
      )
    ) {
      throw new Error(
        `Invalid bill date: ${value}`
      );
    }

    return [
      String(year),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");
  }

  throw new Error(
    `Invalid bill date: ${value}`
  );
}

function formatPaymentDate(
  value: string | null
): string {
  if (!value) return "";

  return new Date(
    value
  ).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getBillStatus(
  total: number,
  paidAmount: number
): BillStatus {
  if (paidAmount >= total) {
    return "Paid";
  }

  if (paidAmount > 0) {
    return "Partially Paid";
  }

  return "Unpaid";
}

function normalizePaymentMethod(
  value: string
): PaymentMethod {
  if (
    value === "Cash" ||
    value === "UPI" ||
    value === "Card" ||
    value === "Other"
  ) {
    return value;
  }

  return "Other";
}

function mapPayment(
  row: any,
  billNumber: string
): Payment {
  return {
    id: row.id,
    billId: billNumber,
    amount: Number(
      row.amount || 0
    ),
    method:
      normalizePaymentMethod(
        row.method
      ),
    paymentDate:
      formatPaymentDate(
        row.payment_date
      ),
  };
}

function mapBill(
  row: any,
  paymentRows: any[]
): Bill {
  const paymentsForBill =
    paymentRows.filter(
      (payment) =>
        payment.bill_id === row.id
    );

  const paidAmount =
    paymentsForBill.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );

  const total =
    Number(row.total || 0);

  const latestPayment =
    paymentsForBill.length > 0
      ? paymentsForBill[
          paymentsForBill.length - 1
        ]
      : null;

  const customerName =
    Array.isArray(row.customers)
      ? row.customers[0]?.name ||
        "Unknown Customer"
      : row.customers?.name ||
        "Unknown Customer";

  const order =
    Array.isArray(row.orders)
      ? row.orders[0]
      : row.orders;

  return {
    id: row.bill_number,
    orderId: row.order_id,
    customerId: row.customer_id,
    customerName,

    item:
      order?.item || "",

    quantity: Number(
      order?.quantity || 1
    ),

    price: Number(
      order?.price || 0
    ),

    subtotal: Number(
      row.subtotal || 0
    ),

    discount: Number(
      row.discount || 0
    ),

    tax: Number(
      row.tax || 0
    ),

    total,

    paidAmount,

    balance: Math.max(
      total - paidAmount,
      0
    ),

    paymentMethod:
      latestPayment
        ? normalizePaymentMethod(
            latestPayment.method
          )
        : "Other",

    status: getBillStatus(
      total,
      paidAmount
    ),

    billDate: formatDate(
      row.bill_date
    ),
  };
}

async function getShopId(): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      userError.message
    );
  }

  if (!user) {
    throw new Error(
      "You must be logged in."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .select("shop_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!data?.shop_id) {
    throw new Error(
      "No shop is connected to this account."
    );
  }

  return data.shop_id;
}

export type BillingData = {
  bills: Bill[];
  payments: Payment[];
};

export async function fetchBillingData(): Promise<BillingData> {
  const {
    data: billRows,
    error: billError,
  } = await supabase
    .from("bills")
    .select(`
      *,
      customers(name),
      orders(item, quantity, price)
    `)
    .order("created_at", {
      ascending: false,
    });

  if (billError) {
    throw new Error(
      billError.message
    );
  }

  const rows = billRows ?? [];

  if (rows.length === 0) {
    return {
      bills: [],
      payments: [],
    };
  }

  const billIds = rows.map(
    (row: any) => row.id
  );

  const {
    data: paymentRows,
    error: paymentError,
  } = await supabase
    .from("payments")
    .select("*")
    .in(
      "bill_id",
      billIds
    )
    .order("payment_date", {
      ascending: true,
    });

  if (paymentError) {
    throw new Error(
      paymentError.message
    );
  }

  const payments =
    paymentRows ?? [];

  const bills = rows.map(
    (row: any) =>
      mapBill(
        row,
        payments
      )
  );

  const billNumberById =
    new Map<string, string>();

  for (const row of rows) {
    billNumberById.set(
      row.id,
      row.bill_number
    );
  }

  return {
    bills,

    payments: payments
      .filter(
        (payment: any) =>
          billNumberById.has(
            payment.bill_id
          )
      )
      .map(
        (payment: any) =>
          mapPayment(
            payment,
            billNumberById.get(
              payment.bill_id
            )!
          )
      ),
  };
}

export async function fetchBills(): Promise<Bill[]> {
  const data =
    await fetchBillingData();

  return data.bills;
}

export async function fetchPayments(): Promise<Payment[]> {
  const data =
    await fetchBillingData();

  return data.payments;
}

export async function createBill(
  input: Bill
): Promise<Bill> {
  const shopId =
    await getShopId();

  if (!input.orderId) {
    throw new Error(
      "Order is required."
    );
  }

  if (!input.customerId) {
    throw new Error(
      "Customer is required."
    );
  }

  if (!input.id.trim()) {
    throw new Error(
      "Bill number is required."
    );
  }

  const {
    data: existingOrderBill,
    error: existingError,
  } = await supabase
    .from("bills")
    .select("id")
    .eq(
      "order_id",
      input.orderId
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      existingError.message
    );
  }

  if (existingOrderBill) {
    throw new Error(
      `A bill already exists for order ${input.orderId}.`
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("bills")
    .insert({
      shop_id: shopId,

      order_id:
        input.orderId,

      customer_id:
        input.customerId,

      bill_number:
        input.id.trim(),

      subtotal:
        Number(
          input.subtotal || 0
        ),

      discount:
        Number(
          input.discount || 0
        ),

      tax:
        Number(
          input.tax || 0
        ),

      total:
        Number(
          input.total || 0
        ),

      status:
        input.status,

      bill_date:
        toDatabaseDate(
          input.billDate
        ),
    })
    .select(`
      *,
      customers(name),
      orders(item, quantity, price)
    `)
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!data) {
    throw new Error(
      "Bill was not returned after saving."
    );
  }

  return mapBill(
    data,
    []
  );
}

export async function updateBill(
  input: Bill
): Promise<Bill> {
  if (!input.id) {
    throw new Error(
      "Bill ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("bills")
    .update({
      status:
        input.status,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "bill_number",
      input.id
    )
    .select(`
      *,
      customers(name),
      orders(item, quantity, price)
    `)
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!data) {
    throw new Error(
      "Bill was not returned after updating."
    );
  }

  const {
    data: paymentRows,
    error: paymentError,
  } = await supabase
    .from("payments")
    .select("*")
    .eq(
      "bill_id",
      data.id
    )
    .order("payment_date", {
      ascending: true,
    });

  if (paymentError) {
    throw new Error(
      paymentError.message
    );
  }

  return mapBill(
    data,
    paymentRows ?? []
  );
}

export async function createPayment(
  input: Payment
): Promise<{
  payment: Payment;
  bill: Bill;
}> {
  if (!input.billId) {
    throw new Error(
      "Bill ID is required."
    );
  }

  if (
    !Number.isFinite(
      input.amount
    ) ||
    input.amount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than 0."
    );
  }

  const {
    data: billRow,
    error: billError,
  } = await supabase
    .from("bills")
    .select(`
      *,
      customers(name),
      orders(item, quantity, price)
    `)
    .eq(
      "bill_number",
      input.billId
    )
    .single();

  if (billError) {
    throw new Error(
      billError.message
    );
  }

  if (!billRow) {
    throw new Error(
      "Bill was not found."
    );
  }

  const {
    data: existingPayments,
    error: paymentsError,
  } = await supabase
    .from("payments")
    .select("*")
    .eq(
      "bill_id",
      billRow.id
    )
    .order("payment_date", {
      ascending: true,
    });

  if (paymentsError) {
    throw new Error(
      paymentsError.message
    );
  }

  const paidBefore =
    (existingPayments ?? [])
      .reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );

  const total =
    Number(
      billRow.total || 0
    );

  const balanceBefore =
    Math.max(
      total - paidBefore,
      0
    );

  if (
    input.amount >
    balanceBefore
  ) {
    throw new Error(
      `Payment cannot be greater than the remaining balance of ₹${balanceBefore}.`
    );
  }

  const {
    data: paymentRow,
    error: paymentError,
  } = await supabase
    .from("payments")
    .insert({
      bill_id:
        billRow.id,

      amount:
        Number(
          input.amount
        ),

      method:
        input.method,

      payment_date:
        new Date().toISOString(),

      notes: null,
    })
    .select("*")
    .single();

  if (paymentError) {
    throw new Error(
      paymentError.message
    );
  }

  if (!paymentRow) {
    throw new Error(
      "Payment was not returned after saving."
    );
  }

  const allPayments = [
    ...(existingPayments ?? []),
    paymentRow,
  ];

  const totalPaid =
    allPayments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );

  const status =
    getBillStatus(
      total,
      totalPaid
    );

  const {
    data: updatedBillRow,
    error: updateError,
  } = await supabase
    .from("bills")
    .update({
      status,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      billRow.id
    )
    .select(`
      *,
      customers(name),
      orders(item, quantity, price)
    `)
    .single();

  if (updateError) {
    await supabase
      .from("payments")
      .delete()
      .eq(
        "id",
        paymentRow.id
      );

    throw new Error(
      updateError.message
    );
  }

  const bill =
    mapBill(
      updatedBillRow,
      allPayments
    );

  return {
    payment:
      mapPayment(
        paymentRow,
        billRow.bill_number
      ),

    bill,
  };
}