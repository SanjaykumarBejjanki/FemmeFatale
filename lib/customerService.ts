import { supabase } from "./supabase";

export type SupabaseCustomer = {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function getMyCustomerShopId() {
  const { data, error } = await supabase
    .from("profiles")
    .select("shop_id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.shop_id) {
    throw new Error("No shop is connected to this account.");
  }

  return data.shop_id;
}

export async function fetchCustomers(): Promise<SupabaseCustomer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createCustomer(input: {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}) {
  const shopId = await getMyCustomerShopId();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      shop_id: shopId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: input.address.trim(),
      notes: input.notes.trim(),
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SupabaseCustomer;
}

export async function updateCustomer(
  customerId: string,
  input: {
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
  }
) {
  const { data, error } = await supabase
    .from("customers")
    .update({
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: input.address.trim(),
      notes: input.notes.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SupabaseCustomer;
}

export async function deactivateCustomer(customerId: string) {
  const { error } = await supabase
    .from("customers")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  if (error) {
    throw new Error(error.message);
  }
}