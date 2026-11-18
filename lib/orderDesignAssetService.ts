import { File } from "expo-file-system";
import { supabase } from "./supabase";

export type DesignAssetType = "sketch" | "fabric_photo";

export type OrderDesignAsset = {
  id: string;
  shop_id: string;
  order_id: string;
  asset_type: DesignAssetType;
  storage_path: string;
  created_at: string;
  signedUrl?: string;
};

const BUCKET = "order-designs";

async function getShopId(): Promise<string> {
  const { data, error } = await supabase.rpc("get_my_shop_id");

  if (error) throw error;
  if (!data) throw new Error("No shop is connected to this account.");

  return data;
}

export async function uploadOrderDesignAsset(
  orderId: string,
  localUri: string,
  assetType: DesignAssetType
): Promise<OrderDesignAsset> {
  if (!orderId || !localUri) {
    throw new Error("Order and file are required.");
  }

  const shopId = await getShopId();
  const file = new File(localUri);
  const bytes = await file.arrayBuffer();

  const extension =
    assetType === "sketch"
      ? "json"
      : file.name.split(".").pop() || "jpg";

  const storagePath =
    `${shopId}/${orderId}/${Date.now()}-${Math.random()
      .toString(36).slice(2, 10)}.${extension}`;

  const contentType =
    assetType === "sketch"
      ? "application/json"
      : "image/jpeg";

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from("order_design_assets")
    .insert({
      shop_id: shopId,
      order_id: orderId,
      asset_type: assetType,
      storage_path: storagePath,
    })
    .select("*")
    .single();

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }

  return data as OrderDesignAsset;
}

export async function uploadSketchPaths(
  orderId: string,
  paths: string[]
): Promise<OrderDesignAsset> {
  const shopId = await getShopId();

  const json = JSON.stringify({ paths });
  const bytes = new TextEncoder().encode(json);

  const storagePath =
    `${shopId}/${orderId}/${Date.now()}-sketch.json`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: "application/json",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from("order_design_assets")
    .insert({
      shop_id: shopId,
      order_id: orderId,
      asset_type: "sketch",
      storage_path: storagePath,
    })
    .select("*")
    .single();

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }

  return data as OrderDesignAsset;
}

export async function getOrderDesignAssets(
  orderId: string
): Promise<OrderDesignAsset[]> {
  const { data, error } = await supabase
    .from("order_design_assets")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return Promise.all(
    ((data ?? []) as OrderDesignAsset[]).map(async (asset) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(asset.storage_path, 3600);

      return signedError
        ? asset
        : { ...asset, signedUrl: signed.signedUrl };
    })
  );
}

export async function downloadSketchPaths(
  asset: OrderDesignAsset
): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(asset.storage_path);

  if (error) throw error;

  const json = await data.text();
  const parsed = JSON.parse(json);

  return Array.isArray(parsed.paths) ? parsed.paths : [];
}

export async function deleteOrderDesignAsset(
  asset: OrderDesignAsset
): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([asset.storage_path]);

  if (storageError) throw storageError;

  const { error: rowError } = await supabase
    .from("order_design_assets")
    .delete()
    .eq("id", asset.id);

  if (rowError) throw rowError;
}
