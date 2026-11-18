import { supabase } from "./supabase";

export type StaffMember = {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

async function getShopId(): Promise<string> {
  const { data, error } = await supabase.rpc("get_my_shop_id");

  if (error) throw error;
  if (!data) throw new Error("No shop is connected to this account.");

  return data as string;
}

export async function fetchStaff(): Promise<StaffMember[]> {
  const shopId = await getShopId();

  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []) as StaffMember[];
}

export async function createStaff(
  name: string,
  phone: string,
  role: string,
): Promise<StaffMember> {
  const shopId = await getShopId();

  const { data, error } = await supabase
    .from("staff")
    .insert({
      shop_id: shopId,
      name: name.trim(),
      phone: phone.trim(),
      role: role.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;

  return data as StaffMember;
}

export async function deleteStaff(id: string): Promise<void> {
  const shopId = await getShopId();

  const { error } = await supabase
    .from("staff")
    .delete()
    .eq("id", id)
    .eq("shop_id", shopId);

  if (error) throw error;
}
