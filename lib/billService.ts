import { supabase } from "./supabase";

/* =========================================================
   TYPES
========================================================= */

export type PaymentMethod =
  | "Cash"
  | "UPI"
  | "Card"
  | "Other";

export type BillStatus =
  | "Unpaid"
  | "Partially Paid"
  | "Paid";

export type Payment = {
  id: string;
  billId: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
};

export type Bill = {
  id: string;

  /*
    Database UUID.
    This remains the internal bill ID.
  */
  billNumber?: string;

  /*
    Friendly invoice number.
    Example: BILL-75646186
  */

  orderId: string;
  customerId: string;
  customerName: string;
  item: string;

  /*
    Multiple boutique items support.
    Keeps old single-item bills working.
  */
  items?: {
    description: string;
    quantity: number;
    amount: number;
  }[];

  quantity: number;
  price: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  balance: number;
  paymentMethod: PaymentMethod;
  status: BillStatus;
  billDate: string;
};

/* =========================================================
   HELPERS
========================================================= */

const toNumber = (value: unknown): number => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const normalizePaymentMethod = (
  value: unknown
): PaymentMethod => {
  if (
    value === "Cash" ||
    value === "UPI" ||
    value === "Card" ||
    value === "Other"
  ) {
    return value;
  }

  return "Cash";
};

const calculateStatus = (
  total: number,
  paidAmount: number
): BillStatus => {
  if (total > 0 && paidAmount >= total) {
    return "Paid";
  }

  if (paidAmount > 0) {
    return "Partially Paid";
  }

  return "Unpaid";
};

/* =========================================================
   GET CURRENT USER + SHOP ID
========================================================= */

const getCurrentShopId = async (): Promise<string> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log(
    "BILL SERVICE USER ID:",
    user?.id
  );

  console.log(
    "BILL SERVICE USER EMAIL:",
    user?.email
  );

  if (userError) {
    console.error(
      "GET USER ERROR:",
      userError
    );

    throw userError;
  }

  if (!user) {
    throw new Error(
      "User is not authenticated."
    );
  }

  const {
    data: shopId,
    error: shopError,
  } = await supabase.rpc(
    "get_my_shop_id"
  );

  console.log(
    "BILL SERVICE SHOP ID:",
    shopId
  );

  if (shopError) {
    console.error(
      "GET SHOP ID ERROR:",
      shopError
    );

    throw shopError;
  }

  if (!shopId) {
    throw new Error(
      "No shop is assigned to the current user."
    );
  }

  return String(shopId);
};

/* =========================================================
   MAP DATABASE BILL → APP BILL
========================================================= */

const mapBill = (row: any): Bill => {
  const quantity = toNumber(
    row.quantity
  );

  const price = toNumber(
    row.price
  );

  const subtotal =
    row.subtotal !== undefined &&
    row.subtotal !== null
      ? toNumber(row.subtotal)
      : quantity * price;

  const discount = toNumber(
    row.discount
  );

  const tax = toNumber(
    row.tax
  );

  const calculatedTotal = Math.max(
    subtotal - discount + tax,
    0
  );

  const total =
    row.total !== undefined &&
    row.total !== null
      ? toNumber(row.total)
      : calculatedTotal;

  const paidAmount = toNumber(
    row.paid_amount ??
      row.paidAmount
  );

  const balance =
    row.balance !== undefined &&
    row.balance !== null
      ? Math.max(
          toNumber(row.balance),
          0
        )
      : Math.max(
          total - paidAmount,
          0
        );

  const status: BillStatus =
    row.status === "Paid" ||
    row.status === "Partially Paid" ||
    row.status === "Unpaid"
      ? row.status
      : calculateStatus(
          total,
          paidAmount
        );

  return {
    /*
      IMPORTANT:
      id = database UUID.
      Never replace this with bill_number because
      payments and updates depend on the UUID.
    */
    id: String(
      row.id ?? ""
    ),

    /*
      Friendly invoice number.
      Example: BILL-75646186
    */
    billNumber:
      row.bill_number ??
      row.billNumber ??
      undefined,

    orderId: String(
      row.order_id ??
        row.orderId ??
        ""
    ),

    customerId: String(
      row.customer_id ??
        row.customerId ??
        ""
    ),

    customerName:
      row.customer_name ??
      row.customerName ??
      "",

    item:
      row.item ??
      "",

    quantity,

    price,

    subtotal,

    discount,

    tax,

    total,

    paidAmount,

    balance,

    paymentMethod:
      normalizePaymentMethod(
        row.payment_method ??
          row.paymentMethod
      ),

    status,

    billDate:
      row.bill_date ??
      row.billDate ??
      new Date().toISOString(),
  };
};

/* =========================================================
   MAP DATABASE PAYMENT → APP PAYMENT
========================================================= */

const mapPayment = (
  row: any
): Payment => {
  return {
    id: String(
      row.id ?? ""
    ),

    billId: String(
      row.bill_id ??
        row.billId ??
        ""
    ),

    amount: toNumber(
      row.amount
    ),

    method:
      normalizePaymentMethod(
        row.method ??
          row.payment_method ??
          row.paymentMethod
      ),

    paymentDate:
      row.payment_date ??
      row.paymentDate ??
      new Date().toISOString(),
  };
};

/* =========================================================
   MAP APP BILL → DATABASE BILL
========================================================= */

const mapBillToDatabase = (
  bill: Bill,
  shopId: string
) => {
  /*
    IMPORTANT:

    bill.id = database UUID for existing bills.

    bill.billNumber = friendly invoice number.

    For a NEW bill created by the app,
    bill.id contains BILL-XXXXXXXX.
    Therefore we use bill.billNumber first,
    then fall back to bill.id.
  */

  const billNumber =
    bill.billNumber ||
    (
      bill.id &&
      bill.id.startsWith("BILL-")
        ? bill.id
        : null
    );

  return {
    shop_id: shopId,

    order_id:
      bill.orderId || null,

    customer_id:
      bill.customerId || null,

    bill_number:
      billNumber,

    subtotal:
      Number(
        bill.subtotal || 0
      ),

    discount:
      Number(
        bill.discount || 0
      ),

    tax:
      Number(
        bill.tax || 0
      ),

    total:
      Number(
        bill.total || 0
      ),

    paid_amount:
      Number(
        bill.paidAmount || 0
      ),

    balance:
      Number(
        bill.balance || 0
      ),

    status:
      bill.status,

    bill_date:
      bill.billDate,
  };
};

/* =========================================================
   MAP APP PAYMENT → DATABASE PAYMENT
========================================================= */

const mapPaymentToDatabase = (
  payment: Payment
) => {
  return {
    bill_id:
      payment.billId,

    amount:
      Number(
        payment.amount || 0
      ),

    method:
      payment.method,

    payment_date:
      payment.paymentDate,
  };
};

/* =========================================================
   FETCH BILLS
========================================================= */

export const fetchBills =
  async (): Promise<Bill[]> => {
    const {
      data,
      error,
    } = await supabase
      .from("bills")
      .select("*")
      .order(
        "bill_date",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "FETCH BILLS ERROR:",
        error
      );

      throw error;
    }

    return (
      data ?? []
    ).map(
      (row) =>
        mapBill(row)
    );
  };

/* =========================================================
   FETCH PAYMENTS
========================================================= */

export const fetchPayments =
  async (): Promise<Payment[]> => {
    const {
      data,
      error,
    } = await supabase
      .from("payments")
      .select("*")
      .order(
        "payment_date",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "FETCH PAYMENTS ERROR:",
        error
      );

      throw error;
    }

    return (
      data ?? []
    ).map(
      (row) =>
        mapPayment(row)
    );
  };

/* =========================================================
   FETCH BILLING DATA
========================================================= */

export const fetchBillingData =
  async (): Promise<{
    bills: Bill[];
    payments: Payment[];
  }> => {
    const [
      bills,
      payments,
    ] = await Promise.all([
      fetchBills(),
      fetchPayments(),
    ]);

    return {
      bills,
      payments,
    };
  };

/* =========================================================
   CREATE BILL
========================================================= */

export const createBill =
  async (
    bill: Bill
  ): Promise<Bill> => {
    try {
      const shopId =
        await getCurrentShopId();

      const databaseBill =
        mapBillToDatabase(
          bill,
          shopId
        );

      console.log(
        "================================"
      );

      console.log(
        "CREATE BILL SHOP ID:",
        shopId
      );

      console.log(
        "CREATE BILL PAYLOAD:",
        databaseBill
      );

      console.log(
        "================================"
      );

      const {
        data,
        error,
      } = await supabase
        .from("bills")
        .insert(
          databaseBill
        )
        .select("*")
        .single();

      if (error) {
        console.error(
          "CREATE BILL DATABASE ERROR:",
          error
        );

        throw error;
      }

      if (!data) {
        throw new Error(
          "Bill was created but no data was returned."
        );
      }

      const databaseBillMapped =
        mapBill(data);

      return {
        ...databaseBillMapped,

        customerName:
          bill.customerName,

        item:
          bill.item,

        quantity:
          bill.quantity,

        price:
          bill.price,

        paymentMethod:
          bill.paymentMethod,

        billNumber:
          databaseBillMapped.billNumber ||
          bill.billNumber ||
          (
            bill.id.startsWith("BILL-")
              ? bill.id
              : undefined
          ),
      };
    } catch (error) {
      console.error(
        "CREATE BILL SERVICE ERROR:",
        error
      );

      throw error;
    }
  };

/* =========================================================
   UPDATE BILL
========================================================= */

export const updateBill =
  async (
    bill: Bill
  ): Promise<Bill> => {
    try {
      const shopId =
        await getCurrentShopId();

      const databaseBill =
        mapBillToDatabase(
          bill,
          shopId
        );

      /*
        IMPORTANT:

        For existing bills, do NOT update
        bill_number from the UUID.

        Existing bill_number is already stored
        correctly in Supabase.
      */
      delete (databaseBill as any).bill_number;

      const {
        data,
        error,
      } = await supabase
        .from("bills")
        .update(
          databaseBill
        )
        .eq(
          "id",
          bill.id
        )
        .select("*")
        .single();

      if (error) {
        console.error(
          "UPDATE BILL ERROR:",
          error
        );

        throw error;
      }

      if (!data) {
        throw new Error(
          "Bill update returned no data."
        );
      }

      const databaseBillMapped =
        mapBill(data);

      return {
        ...databaseBillMapped,

        customerName:
          bill.customerName,

        item:
          bill.item,

        quantity:
          bill.quantity,

        price:
          bill.price,

        paymentMethod:
          bill.paymentMethod,

        billNumber:
          databaseBillMapped.billNumber ||
          bill.billNumber,
      };
    } catch (error) {
      console.error(
        "UPDATE BILL SERVICE ERROR:",
        error
      );

      throw error;
    }
  };

/* =========================================================
   CREATE PAYMENT
========================================================= */

export const createPayment =
  async (
    payment: Payment
  ): Promise<Payment> => {
    try {
      console.log(
        "CREATE PAYMENT:",
        payment
      );

      const {
        data,
        error,
      } = await supabase
        .from("payments")
        .insert(
          mapPaymentToDatabase(
            payment
          )
        )
        .select("*")
        .single();

      if (error) {
        console.error(
          "CREATE PAYMENT ERROR:",
          error
        );

        throw error;
      }

      if (!data) {
        throw new Error(
          "Payment was created but no data was returned."
        );
      }

      return mapPayment(
        data
      );
    } catch (error) {
      console.error(
        "CREATE PAYMENT SERVICE ERROR:",
        error
      );

      throw error;
    }
  };

/* =========================================================
   UPDATE PAYMENT
========================================================= */

export const updatePayment =
  async (
    payment: Payment
  ): Promise<Payment> => {
    const databasePayment =
      mapPaymentToDatabase(
        payment
      );

    const {
      data,
      error,
    } = await supabase
      .from("payments")
      .update(
        databasePayment
      )
      .eq(
        "id",
        payment.id
      )
      .select("*")
      .single();

    if (error) {
      console.error(
        "UPDATE PAYMENT ERROR:",
        error
      );

      throw error;
    }

    if (!data) {
      throw new Error(
        "Payment update returned no data."
      );
    }

    return mapPayment(
      data
    );
  };

/* =========================================================
   DELETE PAYMENT
========================================================= */

export const deletePayment =
  async (
    paymentId: string
  ): Promise<void> => {
    const {
      error,
    } = await supabase
      .from("payments")
      .delete()
      .eq(
        "id",
        paymentId
      );

    if (error) {
      console.error(
        "DELETE PAYMENT ERROR:",
        error
      );

      throw error;
    }
  };

/* =========================================================
   DELETE BILL
========================================================= */

export const deleteBill =
  async (
    billId: string
  ): Promise<void> => {
    const {
      error,
    } = await supabase
      .from("bills")
      .delete()
      .eq(
        "id",
        billId
      );

    if (error) {
      console.error(
        "DELETE BILL ERROR:",
        error
      );

      throw error;
    }
  };
