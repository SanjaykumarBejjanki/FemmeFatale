import { supabase } from "./supabase";

export type SupabaseMeasurement = {
  id: string;
  customer_id: string;
  date: string;
  type: string;
  bust: string | null;
  waist: string | null;
  hip: string | null;
  shoulder: string | null;
  sleeve_length: string | null;
  blouse_length: string | null;
  front_neck: string | null;
  back_neck: string | null;
  armhole: string | null;
  pant_length: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateMeasurementInput = {
  customerId: string;
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

export type UpdateMeasurementInput = {
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

function cleanValue(value: string): string | null {
  const cleaned = value.trim();

  return cleaned === "" ? null : cleaned;
}

export async function fetchMeasurements(
  customerId: string
): Promise<SupabaseMeasurement[]> {
  const { data, error } = await supabase
    .from("measurements")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SupabaseMeasurement[];
}

export async function createMeasurement(
  input: CreateMeasurementInput
): Promise<SupabaseMeasurement> {
  const { data, error } = await supabase
    .from("measurements")
    .insert({
      customer_id: input.customerId,
      date: input.date,
      type: input.type.trim(),
      bust: cleanValue(input.bust),
      waist: cleanValue(input.waist),
      hip: cleanValue(input.hip),
      shoulder: cleanValue(input.shoulder),
      sleeve_length: cleanValue(input.sleeveLength),
      blouse_length: cleanValue(input.blouseLength),
      front_neck: cleanValue(input.frontNeck),
      back_neck: cleanValue(input.backNeck),
      armhole: cleanValue(input.armhole),
      pant_length: cleanValue(input.pantLength),
      notes: cleanValue(input.notes),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SupabaseMeasurement;
}

export async function updateMeasurement(
  measurementId: string,
  input: UpdateMeasurementInput
): Promise<SupabaseMeasurement> {
  const { data, error } = await supabase
    .from("measurements")
    .update({
      date: input.date,
      type: input.type.trim(),
      bust: cleanValue(input.bust),
      waist: cleanValue(input.waist),
      hip: cleanValue(input.hip),
      shoulder: cleanValue(input.shoulder),
      sleeve_length: cleanValue(input.sleeveLength),
      blouse_length: cleanValue(input.blouseLength),
      front_neck: cleanValue(input.frontNeck),
      back_neck: cleanValue(input.backNeck),
      armhole: cleanValue(input.armhole),
      pant_length: cleanValue(input.pantLength),
      notes: cleanValue(input.notes),
      updated_at: new Date().toISOString(),
    })
    .eq("id", measurementId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SupabaseMeasurement;
}