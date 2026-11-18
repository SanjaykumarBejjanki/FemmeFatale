import { supabase } from "./supabase";

export type OrderStatus =
  | "New"
  | "Measurement"
  | "Cutting"
  | "Stitching"
  | "Trial"
  | "Ready"
  | "Delivered";

export type MeasurementSnapshot = {
  id: string;
  date: string;
  type: string;
  bust: string;
  waist: string;
  hip: string;
  shoulder: string;
  sleeveLength: string;
  blouseLength: string;
  frontNeck: string;
  backNeck: string;
  armhole: string;
  pantLength: string;
  notes: string;
};

export type Order = {
  id: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  item: string;
  measurementId: string;
  measurementUsed: string;
  measurementSnapshot: MeasurementSnapshot | null;
  quantity: number;
  price: number;
  orderDate: string;
  deliveryDate: string;
  status: OrderStatus;
  notes: string;
};

type OrderRow = {
  id: string;
  order_number: string | null;
  customer_id: string;
  customer_name: string | null;
  item: string | null;
  measurement_id: string | null;
  measurement_used: string | null;
  measurement_snapshot: MeasurementSnapshot | null;
  quantity: number | null;
  price: number | null;
  order_date: string | null;
  delivery_date: string | null;
  status: string | null;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const validStatuses: OrderStatus[] = [
  "New",
  "Measurement",
  "Cutting",
  "Stitching",
  "Trial",
  "Ready",
  "Delivered",
];

const normalizeStatus = (
  status: string | null | undefined
): OrderStatus => {
  if (
    status &&
    validStatuses.includes(
      status as OrderStatus
    )
  ) {
    return status as OrderStatus;
  }

  return "New";
};

const mapOrder = (
  row: OrderRow
): Order => {
  return {
    id: row.id,
    orderNumber:
      row.order_number ?? undefined,
    customerId:
      row.customer_id,
    customerName:
      row.customer_name ?? "",
    item:
      row.item ?? "",
    measurementId:
      row.measurement_id ?? "",
    measurementUsed:
      row.measurement_used ?? "",
    measurementSnapshot:
      row.measurement_snapshot ?? null,
    quantity:
      Number(row.quantity ?? 1),
    price:
      Number(row.price ?? 0),
    orderDate:
      row.order_date ?? "",
    deliveryDate:
      row.delivery_date ?? "",
    status:
      normalizeStatus(row.status),
    notes:
      row.notes ?? "",
  };
};

/* -------------------------------------------------------
   DATABASE PAYLOAD
   ------------------------------------------------------- */

const toDatabasePayload = async (
  order: Order
) => {
  const {
    data: shopId,
    error: shopError,
  } = await supabase.rpc(
    "get_my_shop_id"
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
      "No shop is connected to this account."
    );
  }

  return {
    shop_id:
      shopId,

    order_number:
      order.orderNumber ?? null,

    customer_id:
      order.customerId,

    item:
      order.item,

    measurement_id:
      order.measurementId || null,

    quantity:
      Number(order.quantity || 1),

    price:
      Number(order.price || 0),

    order_date:
      order.orderDate,

    delivery_date:
      order.deliveryDate,

    status:
      order.status,

    notes:
      order.notes,
  };
};

/* -------------------------------------------------------
   FETCH ORDERS
   ------------------------------------------------------- */

export const fetchOrders = async (
  customerId?: string
): Promise<Order[]> => {
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (customerId) {
    query = query.eq(
      "customer_id",
      customerId
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    console.error(
      "FETCH ORDERS ERROR:",
      error
    );

    throw error;
  }

  const orders = data ?? [];

  if (orders.length === 0) {
    return [];
  }

  const customerIds = [
    ...new Set(
      orders
        .map((row: OrderRow) => row.customer_id)
        .filter(Boolean)
    ),
  ];

  const {
    data: customers,
    error: customerError,
  } = await supabase
    .from("customers")
    .select("id, name")
    .in("id", customerIds);

  if (customerError) {
    console.error(
      "FETCH ORDER CUSTOMER NAMES ERROR:",
      customerError
    );

    throw customerError;
  }

  const customerMap = new Map(
    (customers ?? []).map(
      (customer: { id: string; name: string | null }) => [
        String(customer.id),
        customer.name ?? "",
      ]
    )
  );

  return orders.map((row: OrderRow) => {
    const mappedOrder = mapOrder(row);

    return {
      ...mappedOrder,
      customerName:
        mappedOrder.customerName?.trim() ||
        String(
          customerMap.get(
            String(row.customer_id)
          ) ?? ""
        ),
    };
  });
};
/* -------------------------------------------------------
   CREATE ORDER
   ------------------------------------------------------- */
export const createOrder = async (
  order: Order
): Promise<Order> => {
  const payload =
    await toDatabasePayload(order);

  console.log(
    "CREATE ORDER PAYLOAD:",
    payload
  );

  const {
    data,
    error,
  } = await supabase
    .from("orders")
    .insert(payload)
    .select("*")
    .single();

  console.log(
    "CREATE ORDER SUPABASE RESULT:",
    data
  );

  console.log(
    "CREATE ORDER SUPABASE ERROR:",
    error
  );

  if (error) {
    console.error(
      "CREATE ORDER ERROR:",
      error
    );

    throw error;
  }

  return mapOrder(
    data as OrderRow
  );
};
/* -------------------------------------------------------
   UPDATE ORDER
   ------------------------------------------------------- */

export const updateOrder = async (
  order: Order
): Promise<Order> => {
  const payload =
    await toDatabasePayload(order);

  console.log(
    "UPDATE ORDER PAYLOAD:",
    payload
  );

  const {
    data,
    error,
  } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", order.id)
    .select("*")
    .single();

  if (error) {
    console.error(
      "UPDATE ORDER ERROR:",
      error
    );

    throw error;
  }

  return mapOrder(
    data as OrderRow
  );
};

/* -------------------------------------------------------
   DELETE ORDER
   ------------------------------------------------------- */

export const deleteOrder = async (
  orderId: string
): Promise<void> => {
  const { data: bill, error: billError } =
    await supabase
      .from("bills")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

  if (billError) {
    console.error(
      "CHECK BILL BEFORE DELETE ERROR:",
      billError
    );
    throw billError;
  }

  if (bill) {
    throw new Error(
      "This order has a bill and cannot be deleted."
    );
  }

  const { error } =
    await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

  if (error) {
    console.error(
      "DELETE ORDER ERROR:",
      error
    );
    throw error;
  }
};

