import { supabase } from "./supabase";

import type {
  Order,
  MeasurementSnapshot,
} from "../screens/OrdersScreen";

/* =========================================================
   DATE HELPERS
========================================================= */

function formatDisplayDate(value: string | null): string {
  if (!value) return "";

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) return value;

  const [, year, month, day] = match;

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  return date.toLocaleDateString("en-GB", {
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
  value: string | null | undefined
): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();

  /* -------------------------------------------------------
     YYYY-MM-DD
  ------------------------------------------------------- */

  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (isoMatch) {
    const [, yearText, monthText, dayText] =
      isoMatch;

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
        `Invalid date: ${value}`
      );
    }

    return `${yearText}-${monthText}-${dayText}`;
  }

  /* -------------------------------------------------------
     DD/MM/YYYY
     Also accepts D/M/YYYY
  ------------------------------------------------------- */

  const slashMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (slashMatch) {
    const [, dayText, monthText, yearText] =
      slashMatch;

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
        `Invalid date: ${value}`
      );
    }

    return [
      yearText,
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");
  }

  /* -------------------------------------------------------
     DD Mon YYYY
     DD Sept YYYY
     DD September YYYY
  ------------------------------------------------------- */

  const textDate = trimmed.match(
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/
  );

  if (textDate) {
    const [, dayText, monthText, yearText] =
      textDate;

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
        `Invalid date: ${value}`
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
        `Invalid date: ${value}`
      );
    }

    return [
      String(year),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");
  }

  /* -------------------------------------------------------
     JavaScript Date fallback
  ------------------------------------------------------- */

  const parsed = Date.parse(trimmed);

  if (!Number.isNaN(parsed)) {
    const date = new Date(parsed);

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (
      !isValidCalendarDate(
        year,
        month,
        day
      )
    ) {
      throw new Error(
        `Invalid date: ${value}`
      );
    }

    return [
      String(year),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");
  }

  throw new Error(
    `Invalid date: ${value}`
  );
}

/* =========================================================
   SNAPSHOT MAPPING
========================================================= */

function mapSnapshot(
  row: any
): MeasurementSnapshot {
  return {
    id:
      row.measurement_id ||
      row.id ||
      "",

    date: formatDisplayDate(
      row.measurement_date
    ),

    type:
      row.measurement_type || "",

    bust:
      row.bust || "",

    waist:
      row.waist || "",

    hip:
      row.hip || "",

    shoulder:
      row.shoulder || "",

    sleeveLength:
      row.sleeve_length || "",

    blouseLength:
      row.blouse_length || "",

    frontNeck:
      row.front_neck || "",

    backNeck:
      row.back_neck || "",

    armhole:
      row.armhole || "",

    pantLength:
      row.pant_length || "",

    notes:
      row.notes || "",
  };
}

/* =========================================================
   ORDER MAPPING
========================================================= */

function mapOrder(
  row: any,
  snapshot?: any
): Order {
  const customerName =
    Array.isArray(row.customers)
      ? row.customers[0]?.name ||
        "Unknown Customer"
      : row.customers?.name ||
        "Unknown Customer";

  return {
    id: row.id,

    orderNumber:
      row.order_number,

    customerId:
      row.customer_id,

    customerName,

    item:
      row.item,

    measurementId:
      row.measurement_id ||
      snapshot?.measurement_id ||
      "",

    measurementUsed: snapshot
      ? `${formatDisplayDate(
          snapshot.measurement_date
        )} • ${
          snapshot.measurement_type ||
          "Measurement"
        }`
      : row.measurement_id
      ? "Saved measurement"
      : "No measurement",

    measurementSnapshot:
      snapshot
        ? mapSnapshot(snapshot)
        : null,

    quantity: Number(
      row.quantity || 1
    ),

    price: Number(
      row.price || 0
    ),

    orderDate:
      formatDisplayDate(
        row.order_date
      ),

    deliveryDate:
      formatDisplayDate(
        row.delivery_date
      ),

    status:
      row.status,

    notes:
      row.notes || "",
  };
}

/* =========================================================
   SHOP ID
========================================================= */

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

/* =========================================================
   FETCH ORDERS
========================================================= */

export async function fetchOrders(): Promise<
  Order[]
> {
  const {
    data,
    error,
  } = await supabase
    .from("orders")
    .select(
      "*, customers(name)"
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      error.message
    );
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return [];
  }

  const orderIds = rows.map(
    (row: any) => row.id
  );

  const {
    data: snapshotRows,
    error: snapshotError,
  } = await supabase
    .from(
      "order_measurement_snapshots"
    )
    .select("*")
    .in(
      "order_id",
      orderIds
    );

  if (snapshotError) {
    throw new Error(
      snapshotError.message
    );
  }

  const snapshotByOrderId =
    new Map<string, any>();

  for (
    const snapshot of
    snapshotRows ?? []
  ) {
    snapshotByOrderId.set(
      snapshot.order_id,
      snapshot
    );
  }

  return rows.map(
    (row: any) =>
      mapOrder(
        row,
        snapshotByOrderId.get(
          row.id
        )
      )
  );
}

/* =========================================================
   ORDER NUMBER
========================================================= */

function createOrderNumber(): string {
  const now = new Date();

  const year =
    now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  const time = String(
    Date.now()
  ).slice(-8);

  return `ORD-${year}${month}${day}-${time}`;
}

/* =========================================================
   CREATE ORDER
========================================================= */

export async function createOrder(
  input: Order
): Promise<Order> {
  const shopId =
    await getShopId();

  if (!input.customerId) {
    throw new Error(
      "Customer is required."
    );
  }

  if (!input.item.trim()) {
    throw new Error(
      "Item is required."
    );
  }

  if (!input.measurementId) {
    throw new Error(
      "Measurement is required."
    );
  }

  if (
    !Number.isFinite(
      input.quantity
    ) ||
    input.quantity <= 0
  ) {
    throw new Error(
      "Quantity must be greater than 0."
    );
  }

  if (
    !Number.isFinite(
      input.price
    ) ||
    input.price < 0
  ) {
    throw new Error(
      "Price cannot be negative."
    );
  }

  /* -------------------------------------------------------
     Convert dates before saving
  ------------------------------------------------------- */

  const orderDate =
    toDatabaseDate(
      input.orderDate
    ) ??
    new Date()
      .toISOString()
      .slice(0, 10);

  const deliveryDate =
    toDatabaseDate(
      input.deliveryDate
    );

  const orderNumber =
    input.orderNumber?.trim() ||
    createOrderNumber();

  /* -------------------------------------------------------
     Save order
  ------------------------------------------------------- */

  const {
    data: orderRow,
    error: orderError,
  } = await supabase
    .from("orders")
    .insert({
      shop_id:
        shopId,

      customer_id:
        input.customerId,

      order_number:
        orderNumber,

      item:
        input.item.trim(),

      measurement_id:
        input.measurementId,

      quantity:
        Math.trunc(
          input.quantity
        ),

      price:
        Number(
          input.price
        ),

      order_date:
        orderDate,

      delivery_date:
        deliveryDate,

      status:
        input.status,

      notes:
        input.notes.trim() ||
        null,
    })
    .select(
      "*, customers(name)"
    )
    .single();

  if (orderError) {
    throw new Error(
      orderError.message
    );
  }

  if (!orderRow) {
    throw new Error(
      "Order was not returned after saving."
    );
  }

  /* -------------------------------------------------------
     Measurement snapshot
  ------------------------------------------------------- */

  const snapshot =
    input.measurementSnapshot;

  if (!snapshot) {
    await supabase
      .from("orders")
      .delete()
      .eq(
        "id",
        orderRow.id
      );

    throw new Error(
      "Measurement snapshot is required for this order."
    );
  }

  const {
    data: snapshotRow,
    error: snapshotError,
  } = await supabase
    .from(
      "order_measurement_snapshots"
    )
    .insert({
      order_id:
        orderRow.id,

      measurement_id:
        input.measurementId ||
        null,

      measurement_date:
        toDatabaseDate(
          snapshot.date
        ),

      measurement_type:
        snapshot.type ||
        null,

      bust:
        snapshot.bust ||
        null,

      waist:
        snapshot.waist ||
        null,

      hip:
        snapshot.hip ||
        null,

      shoulder:
        snapshot.shoulder ||
        null,

      sleeve_length:
        snapshot.sleeveLength ||
        null,

      blouse_length:
        snapshot.blouseLength ||
        null,

      front_neck:
        snapshot.frontNeck ||
        null,

      back_neck:
        snapshot.backNeck ||
        null,

      armhole:
        snapshot.armhole ||
        null,

      pant_length:
        snapshot.pantLength ||
        null,

      notes:
        snapshot.notes ||
        null,
    })
    .select("*")
    .single();

  if (snapshotError) {
    await supabase
      .from("orders")
      .delete()
      .eq(
        "id",
        orderRow.id
      );

    throw new Error(
      snapshotError.message
    );
  }

  return mapOrder(
    orderRow,
    snapshotRow
  );
}

/* =========================================================
   UPDATE ORDER
========================================================= */

export async function updateOrder(
  input: Order
): Promise<Order> {
  if (!input.id) {
    throw new Error(
      "Order ID is required."
    );
  }

  const {
    data: orderRow,
    error: orderError,
  } = await supabase
    .from("orders")
    .update({
      status:
        input.status,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      input.id
    )
    .select(
      "*, customers(name)"
    )
    .single();

  if (orderError) {
    throw new Error(
      orderError.message
    );
  }

  if (!orderRow) {
    throw new Error(
      "Order was not returned after updating."
    );
  }

  const {
    data: snapshotRow,
    error: snapshotError,
  } = await supabase
    .from(
      "order_measurement_snapshots"
    )
    .select("*")
    .eq(
      "order_id",
      input.id
    )
    .maybeSingle();

  if (snapshotError) {
    throw new Error(
      snapshotError.message
    );
  }

  return mapOrder(
    orderRow,
    snapshotRow ?? undefined
  );
}