import { supabase } from "./supabase";

export type Measurement = {
  id: string;
  customerId?: string;

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

  // Backward compatibility with existing App.tsx
  sleeve_length?: string;
  blouse_length?: string;
  front_neck?: string;
  back_neck?: string;
  pant_length?: string;

  notes: string;
};

type MeasurementRow = {
  id: string;
  customer_id: string | null;

  date: string | null;
  type: string | null;

  bust: string | number | null;
  waist: string | number | null;
  hip: string | number | null;
  shoulder: string | number | null;

  sleeve_length: string | number | null;
  blouse_length: string | number | null;
  front_neck: string | number | null;
  back_neck: string | number | null;
  armhole: string | number | null;
  pant_length: string | number | null;

  notes: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

const textValue = (
  value: string | number | null | undefined
): string => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
};

const mapMeasurement = (
  row: MeasurementRow
): Measurement => {
  const sleeveLength =
    textValue(row.sleeve_length);

  const blouseLength =
    textValue(row.blouse_length);

  const frontNeck =
    textValue(row.front_neck);

  const backNeck =
    textValue(row.back_neck);

  const pantLength =
    textValue(row.pant_length);

  return {
    id: row.id,

    customerId:
      row.customer_id ?? undefined,

    date: row.date ?? "",

    type:
      row.type ?? "Custom",

    bust:
      textValue(row.bust),

    waist:
      textValue(row.waist),

    hip:
      textValue(row.hip),

    shoulder:
      textValue(row.shoulder),

    sleeveLength,

    blouseLength,

    frontNeck,

    backNeck,

    armhole:
      textValue(row.armhole),

    pantLength,

    // Backward-compatible aliases
    sleeve_length:
      sleeveLength,

    blouse_length:
      blouseLength,

    front_neck:
      frontNeck,

    back_neck:
      backNeck,

    pant_length:
      pantLength,

    notes:
      row.notes ?? "",
  };
};

const toDatabasePayload = (
  measurement: Omit<
    Measurement,
    "id"
  >
) => {
  return {
    customer_id:
      measurement.customerId ?? null,

    date:
      measurement.date,

    type:
      measurement.type,

    bust:
      measurement.bust,

    waist:
      measurement.waist,

    hip:
      measurement.hip,

    shoulder:
      measurement.shoulder,

    sleeve_length:
      measurement.sleeveLength ??
      measurement.sleeve_length ??
      "",

    blouse_length:
      measurement.blouseLength ??
      measurement.blouse_length ??
      "",

    front_neck:
      measurement.frontNeck ??
      measurement.front_neck ??
      "",

    back_neck:
      measurement.backNeck ??
      measurement.back_neck ??
      "",

    armhole:
      measurement.armhole,

    pant_length:
      measurement.pantLength ??
      measurement.pant_length ??
      "",

    notes:
      measurement.notes,
  };
};

export const fetchMeasurements =
  async (
    customerId?: string
  ): Promise<Measurement[]> => {
    let query = supabase
      .from("measurements")
      .select("*")
      .order("date", {
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
        "FETCH MEASUREMENTS ERROR:",
        error
      );

      throw error;
    }

    return (
      data ?? []
    ).map(
      (
        row: MeasurementRow
      ) =>
        mapMeasurement(row)
    );
  };

export const createMeasurement =
  async (
    measurement: Omit<
      Measurement,
      "id"
    >
  ): Promise<Measurement> => {
    const payload =
      toDatabasePayload(
        measurement
      );

    const {
      data,
      error,
    } = await supabase
      .from("measurements")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error(
        "CREATE MEASUREMENT ERROR:",
        error
      );

      throw error;
    }

    return mapMeasurement(
      data as MeasurementRow
    );
  };

export const updateMeasurement =
  async (
    measurementId: string,
    measurement: Omit<
      Measurement,
      "id"
    >
  ): Promise<Measurement> => {
    const payload =
      toDatabasePayload(
        measurement
      );

    const {
      data,
      error,
    } = await supabase
      .from("measurements")
      .update(payload)
      .eq(
        "id",
        measurementId
      )
      .select("*")
      .single();

    if (error) {
      console.error(
        "UPDATE MEASUREMENT ERROR:",
        error
      );

      throw error;
    }

    return mapMeasurement(
      data as MeasurementRow
    );
  };

export const deleteMeasurement =
  async (
    measurementId: string
  ): Promise<void> => {
    const {
      error,
    } = await supabase
      .from("measurements")
      .delete()
      .eq(
        "id",
        measurementId
      );

    if (error) {
      console.error(
        "DELETE MEASUREMENT ERROR:",
        error
      );

      throw error;
    }
  };