import { supabase } from "./supabase";

export type CustomerInput = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export type Customer = CustomerInput & {
  id: string;
  orders?: number;
};

type CustomerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const mapCustomer = (row: CustomerRow): Customer => ({
  id: row.id,
  name: row.name ?? "",
  phone: row.phone ?? "",
  email: row.email ?? "",
  address: row.address ?? "",
  notes: row.notes ?? "",
});

export const getMyCustomerShopId = async (): Promise<string> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("User is not authenticated.");
  }

  const { data: shopId, error: shopError } =
    await supabase.rpc("get_my_shop_id");

  if (shopError) {
    throw shopError;
  }

  if (!shopId) {
    throw new Error(
      "No shop is assigned to the current user."
    );
  }

  return String(shopId);
};

export const fetchCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("FETCH CUSTOMERS ERROR:", error);
    throw error;
  }

  return (data ?? []).map((row: CustomerRow) =>
    mapCustomer(row)
  );
};

export const createCustomer = async (
  customer: CustomerInput
): Promise<Customer> => {
  const shopId = await getMyCustomerShopId();

  const payload = {
    shop_id: shopId,
    name: customer.name.trim(),
    phone: customer.phone.trim(),
    email: customer.email.trim(),
    address: customer.address.trim(),
    notes: customer.notes.trim(),
  };

  const { data, error } = await supabase
    .from("customers")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("CREATE CUSTOMER ERROR:", error);
    throw error;
  }

  return mapCustomer(data as CustomerRow);
};

export const updateCustomer = async (
  customerId: string,
  customer: CustomerInput
): Promise<Customer> => {
  const payload = {
    name: customer.name.trim(),
    phone: customer.phone.trim(),
    email: customer.email.trim(),
    address: customer.address.trim(),
    notes: customer.notes.trim(),
  };

  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", customerId)
    .select("*")
    .single();

  if (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);
    throw error;
  }

  return mapCustomer(data as CustomerRow);
};

export const deleteCustomer = async (
  customerId: string
): Promise<void> => {
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId);

  if (error) {
    console.error("DELETE CUSTOMER ERROR:", error);
    throw error;
  }
};

