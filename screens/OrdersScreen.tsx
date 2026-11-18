import { MaterialCommunityIcons } from "@expo/vector-icons";
import { File } from "expo-file-system";
import {
  uploadOrderDesignAsset,
  uploadSketchPaths,
  getOrderDesignAssets,
  downloadSketchPaths,
  deleteOrderDesignAsset,
  type OrderDesignAsset,
} from "../lib/orderDesignAssetService";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import Svg, { Path } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { Customer } from "./CustomersScreen";
import { createMeasurement, updateMeasurement } from "../lib/measurementService";
import { supabase } from "../lib/supabase";
import type { Measurement } from "./measurements/MeasurementsScreen";

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

type OrdersScreenProps = {
  customers: Customer[];
  selectedCustomer: Customer | null;
  measurements: Record<string, Measurement[]>;
  orders: Order[];
  onCreateOrder: (order: Order) => Promise<Order>;
  onUpdateOrder: (order: Order) => Promise<Order>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onBack: () => void;
  openCreateForSelectedCustomer?: boolean;
  onCreateFormOpened?: () => void;
  onCreateCustomer?: (customer: Customer) => Promise<Customer | null>;
};

const colors = {
  PrimaryWine: "#C2185B",
  Magenta: "#C2185B",
  Gold: "#C2185B",
  Cream: "#FFF5F8",
  SoftPink: "#FCE4EC",
  DarkText: "#4A1730",
  White: "#FFFFFF",
  Gray: "#777777",
  LightGray: "#FFF5F8",
  Border: "#F8BBD0",
  Green: "#C2185B",
  Orange: "#C2185B",
  Blue: "#C2185B",
  Red: "#C2185B",
};

const STATUS_LIST: OrderStatus[] = [
  "New",
  "Cutting",
  "Ready",
  "Delivered",
];

const emptyForm = {
  customerId: "",
  item: "",
  measurementId: "",
  quantity: "1",
  price: "",
  orderDate: "",
  deliveryDate: "",
  status: "New" as OrderStatus,
  notes: "",
};

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/* -------------------------------------------------------
   SAFE LOCAL DATE HELPERS
------------------------------------------------------- */

const pad2 = (value: number) => String(value).padStart(2, "0");

const today = () => {
  const date = new Date();

  return `${date.getFullYear()}-${pad2(
    date.getMonth() + 1,
  )}-${pad2(date.getDate())}`;
};

const parseLocalDate = (value: string): Date | null => {
  if (!value) return null;

  const trimmed = value.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    date.setHours(0, 0, 0, 0);
    return date;
  }

  const displayMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (displayMatch) {
    const day = Number(displayMatch[1]);
    const month = Number(displayMatch[2]);
    const year = Number(displayMatch[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    date.setHours(0, 0, 0, 0);
    return date;
  }

  return null;
};

const normalizeDate = (value: string) => {
  if (!value) return "";

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return toDbDate(trimmed);
  }

  return trimmed;
};

const formatDate = (value: string) => {
  if (!value) return "-";

  const date = parseLocalDate(value);

  if (!date) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toDisplayDate = (value: string) => {
  if (!value) return "";

  const normalized = normalizeDate(value);

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  return value;
};

const toDbDate = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return today();
  }

  const displayMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (displayMatch) {
    const day = Number(displayMatch[1]);
    const month = Number(displayMatch[2]);
    const year = Number(displayMatch[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return "";
    }

    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    const date = parseLocalDate(trimmed);

    if (!date) {
      return "";
    }

    return trimmed;
  }

  return trimmed;
};

/* -------------------------------------------------------
   DISPLAY HELPERS
------------------------------------------------------- */

const money = (value: number) =>
  "Rs. " +
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const orderTotal = (order: Order) =>
  Number(order.price || 0) * Number(order.quantity || 1);

const statusColor = (status: OrderStatus) => {
  switch (status) {
    case "New":
      return "#AD1457";
    case "Measurement":
      return "#C2185B";
    case "Cutting":
      return "#C2185B";
    case "Stitching":
      return "#C2185B";
    case "Trial":
      return "#AD1457";
    case "Ready":
      return "#C2185B";
    case "Delivered":
      return "#AD8293";
    default:
      return colors.PrimaryWine;
  }
};

const statusIcon = (status: OrderStatus) => {
  switch (status) {
    case "New":
      return "NEW";
    case "Measurement":
      return "MEASURE";
    case "Cutting":
      return "CUT";
    case "Stitching":
      return "SEW";
    case "Trial":
      return "TRIAL";
    case "Ready":
      return "READY";
    case "Delivered":
      return "DONE";
    default:
      return "";
  }
};

const statusIndex = (status: OrderStatus) => {
  switch (status) {
    case "New":
    case "Measurement":
      return 0;

    case "Cutting":
    case "Stitching":
      return 1;

    case "Trial":
    case "Ready":
      return 2;

    case "Delivered":
      return 3;

    default:
      return 0;
  }
};

const progressPercent = (status: OrderStatus) => {
  const index = statusIndex(status);

  if (index < 0) return 0;

  return Math.round((index / (STATUS_LIST.length - 1)) * 100);
};

/* -------------------------------------------------------
   DELIVERY STATUS
------------------------------------------------------- */

type DeliveryInfo = {
  label: string;
  shortLabel: string;
  color: string;
  background: string;
};

const getDeliveryInfo = (order: Order): DeliveryInfo => {
  if (order.status === "Delivered") {
    return {
      label: "Delivered",
      shortLabel: "Delivered",
      color: colors.Green,
      background: "#FCE4EC",
    };
  }

  if (!order.deliveryDate) {
    return {
      label: "Upcoming",
      shortLabel: "Upcoming",
      color: colors.Blue,
      background: "#FCE4EC",
    };
  }

  const delivery = parseLocalDate(order.deliveryDate);

  const current = parseLocalDate(today());

  if (!delivery || !current) {
    return {
      label: "Upcoming",
      shortLabel: "Upcoming",
      color: colors.Blue,
      background: "#FCE4EC",
    };
  }

  const difference = Math.round(
    (delivery.getTime() - current.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (difference < 0) {
    const days = Math.abs(difference);

    return {
      label: `Overdue by ${days} day${days === 1 ? "" : "s"}`,
      shortLabel: "Overdue",
      color: colors.Red,
      background: "#FCE4EC",
    };
  }

  if (difference === 0) {
    return {
      label: "Due Today",
      shortLabel: "Due Today",
      color: colors.Orange,
      background: "#FCE4EC",
    };
  }

  return {
    label: "Upcoming",
    shortLabel: "Upcoming",
    color: colors.Blue,
    background: "#FCE4EC",
  };
};

/* -------------------------------------------------------
   MEASUREMENT SNAPSHOT
------------------------------------------------------- */

const makeSnapshot = (measurement: Measurement): MeasurementSnapshot => ({
  id: measurement.id,
  date: measurement.date,
  type: measurement.type,
  bust: measurement.bust,
  waist: measurement.waist,
  hip: measurement.hip,
  shoulder: measurement.shoulder,
  sleeveLength: measurement.sleeveLength,
  blouseLength: measurement.blouseLength,
  frontNeck: measurement.frontNeck,
  backNeck: measurement.backNeck,
  armhole: measurement.armhole,
  pantLength: measurement.pantLength,
  notes: measurement.notes,
});

/* -------------------------------------------------------
   MAIN SCREEN
------------------------------------------------------- */

export default function OrdersScreen({
  customers,
  selectedCustomer,
  measurements,
  orders,
  onCreateOrder,
  onUpdateOrder,
  onDeleteOrder,
  onBack,
  openCreateForSelectedCustomer,
  onCreateFormOpened,
  onCreateCustomer,
}: OrdersScreenProps) {
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");

  const [showForm, setShowForm] = useState(false);

  const [showDetails, setShowDetails] = useState(false);

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [form, setForm] = useState({
    ...emptyForm,
  });

  const ordersScrollRef = useRef<ScrollView>(null);
  const sketchSectionOffset = useRef(0);

  const [sketchPaths, setSketchPaths] = useState<string[]>([]);
  const [currentSketchPath, setCurrentSketchPath] = useState("");
  const [sketchTool, setSketchTool] = useState<"pen" | "eraser">("pen");
  const [fabricPhotos, setFabricPhotos] = useState<string[]>([]);
  const [savedDesignAssets, setSavedDesignAssets] = useState<
    OrderDesignAsset[]
  >([]);
const [selectedOrderFabricPhotos, setSelectedOrderFabricPhotos] = useState<
  string[]
>([]);
  const [sketchDirty, setSketchDirty] = useState(false);
  const [designUploadBusy, setDesignUploadBusy] = useState(false);

  const [measurementDraft, setMeasurementDraft] = useState({
    length: "",
    shoulder: "",
    frontNeck: "",
    backNeck: "",
    highChest: "",
    lowChest: "",
    waist: "",
    armhole: "",
    handsLength: "",
    handsLoose: "",
  });

  const setMeasurementDraftFromMeasurement = (
    measurement: Measurement | undefined,
  ) => {
    setMeasurementDraft({
      length: measurement?.blouseLength || "",
      shoulder: measurement?.shoulder || "",
      frontNeck: measurement?.frontNeck || "",
      backNeck: measurement?.backNeck || "",
      highChest: "",
      lowChest: "",
      waist: measurement?.waist || "",
      armhole: measurement?.armhole || "",
      handsLength: measurement?.sleeveLength || "",
      handsLoose: "",
    });
  };

  const updateMeasurementDraft = (
    field: keyof typeof measurementDraft,
    value: string,
  ) => {
    setMeasurementDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) {
      return orders;
    }

    return orders.filter((order) => order.customerId === selectedCustomer.id);
  }, [orders, selectedCustomer]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customerOrders.filter((order) => {
      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;

      const matchesSearch =
        !query ||
        order.customerName.toLowerCase().includes(query) ||
        order.item.toLowerCase().includes(query) ||
        order.orderNumber?.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [customerOrders, search, statusFilter]);

  const stats = useMemo(() => {
    const total = customerOrders.length;

    const active = customerOrders.filter(
      (order) => order.status !== "Delivered",
    ).length;

    const ready = customerOrders.filter(
      (order) => order.status === "Ready",
    ).length;

    const delivered = customerOrders.filter(
      (order) => order.status === "Delivered",
    ).length;

    const overdue = customerOrders.filter(
      (order) => getDeliveryInfo(order).shortLabel === "Overdue",
    ).length;

    const dueToday = customerOrders.filter(
      (order) => getDeliveryInfo(order).shortLabel === "Due Today",
    ).length;

    const value = customerOrders.reduce(
      (sum, order) => sum + orderTotal(order),
      0,
    );

    return {
      total,
      active,
      ready,
      delivered,
      overdue,
      dueToday,
      value,
    };
  }, [customerOrders]);

  const customerMeasurements = form.customerId
    ? measurements[form.customerId] || []
    : [];

  const openCreateForm = () => {
    setSketchPaths([]);
    setCurrentSketchPath("");
    setFabricPhotos([]);
    setSavedDesignAssets([]);
    setSketchDirty(false);
    const defaultCustomer = selectedCustomer?.id || customers[0]?.id || "";

    const customerMeasurementList = defaultCustomer
      ? measurements[defaultCustomer] || []
      : [];

    setEditingOrder(null);

    setForm({
      ...emptyForm,
      customerId: defaultCustomer,
      measurementId: customerMeasurementList[0]?.id || "",
      orderDate: toDisplayDate(today()),
      deliveryDate: "",
    });

    setMeasurementDraftFromMeasurement(customerMeasurementList[0]);

    setShowForm(true);
  };

  useEffect(() => {
    if (openCreateForSelectedCustomer && selectedCustomer) {
      openCreateForm();
      onCreateFormOpened?.();
    }
  }, [openCreateForSelectedCustomer, selectedCustomer?.id]);
  const openEditForm = async (order: Order) => {
    setEditingOrder(order);

    setForm({
      customerId: order.customerId,
      item: order.item,
      measurementId: order.measurementId || "",
      quantity: String(order.quantity || 1),
      price: String(order.price || ""),
      orderDate: toDisplayDate(order.orderDate),
      deliveryDate: toDisplayDate(order.deliveryDate),
      status: order.status,
      notes: order.notes || "",
    });

    const existingMeasurement = (measurements[order.customerId] || []).find(
      (item) => item.id === order.measurementId,
    );

    setMeasurementDraftFromMeasurement(existingMeasurement);

    setShowForm(true);
    setSketchPaths([]);
    setCurrentSketchPath("");
    setFabricPhotos([]);
    setSavedDesignAssets([]);
    setSketchDirty(false);

    try {
      const assets = await getOrderDesignAssets(order.id);
      setSavedDesignAssets(assets);

      const photos = assets
        .filter(
          (asset) => asset.asset_type === "fabric_photo" && !!asset.signedUrl,
        )
        .map((asset) => asset.signedUrl as string);

      setFabricPhotos(photos);

      const sketches = assets.filter((asset) => asset.asset_type === "sketch");

      if (sketches.length > 0) {
        const latestSketch = sketches[sketches.length - 1];
        const paths = await downloadSketchPaths(latestSketch);
        setSketchPaths(paths);
      }
    } catch (error) {
      console.error("LOAD DESIGN ASSETS ERROR:", error);
      Alert.alert(
        "Design Files",
        "Could not load saved sketches or fabric photos.",
      );
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingOrder(null);
  };

  const updateField = (field: keyof typeof emptyForm, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const persistMeasurementDraft = async (): Promise<Measurement | null> => {
    const selectedMeasurement = customerMeasurements.find(
      (item) => item.id === form.measurementId,
    );

    const hasInput = Object.values(measurementDraft).some(
      (value) => value.trim().length > 0,
    );

    if (!selectedMeasurement && !hasInput) {
      return null;
    }

    const payload = {
      customerId: form.customerId,
      date: selectedMeasurement?.date || today(),
      type:
        selectedMeasurement?.type ||
        form.item.trim() ||
        "Custom",
      bust: selectedMeasurement?.bust || "",
      waist: measurementDraft.waist,
      hip: selectedMeasurement?.hip || "",
      shoulder: measurementDraft.shoulder,
      sleeveLength: measurementDraft.handsLength,
      blouseLength: measurementDraft.length,
      frontNeck: measurementDraft.frontNeck,
      backNeck: measurementDraft.backNeck,
      armhole: measurementDraft.armhole,
      pantLength: selectedMeasurement?.pantLength || "",
      notes: selectedMeasurement?.notes || "",
    };

    if (selectedMeasurement) {
      return updateMeasurement(
        selectedMeasurement.id,
        payload,
      );
    }

    return createMeasurement(payload);
  };

  const saveOrder = async () => {
    if (!form.customerId) {
      Alert.alert("Customer Required", "Please select a customer.");
      return;
    }

    if (!form.item.trim()) {
      Alert.alert("Item Required", "Please enter the item name.");
      return;
    }

    const quantity = Number(form.quantity) || 1;

    const price = Number(form.price) || 0;

    if (quantity <= 0) {
      Alert.alert("Invalid Quantity", "Quantity must be at least 1.");
      return;
    }

    if (price < 0) {
      Alert.alert("Invalid Price", "Price cannot be negative.");
      return;
    }

    const customer = customers.find((item) => item.id === form.customerId);

    let measurement = customerMeasurements.find(
      (item) => item.id === form.measurementId,
    );

    try {
      const persistedMeasurement = await persistMeasurementDraft();

      if (persistedMeasurement) {
        measurement = persistedMeasurement;
      }
    } catch (error) {
      console.error("SAVE MEASUREMENT ERROR:", error);
      Alert.alert(
        "Measurement Save Failed",
        "The order was not saved because the measurement could not be saved.",
      );
      return;
    }

    const orderDate = toDbDate(form.orderDate);

    const deliveryDate = form.deliveryDate.trim()
      ? toDbDate(form.deliveryDate)
      : "";

    if (!orderDate) {
      Alert.alert(
        "Invalid Order Date",
        "Please enter a valid date in DD/MM/YYYY format.",
      );
      return;
    }

    if (form.deliveryDate.trim() && !deliveryDate) {
      Alert.alert(
        "Invalid Delivery Date",
        "Please enter a valid date in DD/MM/YYYY format.",
      );
      return;
    }

    if (deliveryDate && deliveryDate < orderDate) {
      Alert.alert(
        "Invalid Delivery Date",
        "Delivery date cannot be before the order date.",
      );
      return;
    }

    const orderData: Order = {
      id: editingOrder?.id || createId(),

      orderNumber:
        editingOrder?.orderNumber?.match(/^FF-(\d+)$/i)
          ? editingOrder.orderNumber.toUpperCase()
          : `FF-${String(
              Math.max(
                0,
                ...orders
                  .map((order) => {
                    const match =
                      order.orderNumber?.match(/^FF-(\d{3})$/i);
                    return match ? Number(match[1]) : 0;
                  }),
              ) + 1,
            ).padStart(3, "0")}`,

      customerId: form.customerId,

      customerName: customer?.name || "",

      item: form.item.trim(),

      measurementId: measurement?.id || "",

      measurementUsed: measurement
        ? `${measurement.type} - ${formatDate(measurement.date)}`
        : "",

      measurementSnapshot: measurement
        ? makeSnapshot(measurement)
        : editingOrder?.measurementSnapshot || null,

      quantity,

      price,

      orderDate,

      deliveryDate,

      status: form.status,

      notes: form.notes.trim(),
    };

    if (designUploadBusy) {
      Alert.alert("Please wait", "Design files are being uploaded.");
      return;
    }

    setDesignUploadBusy(true);

    let savedOrder: Order;

    try {
      if (editingOrder) {
        savedOrder = await onUpdateOrder(orderData);
      } else {
        savedOrder = await onCreateOrder(orderData);
      }
    } catch (error) {
      console.error("SAVE ORDER ERROR:", error);
      setDesignUploadBusy(false);
      Alert.alert("Save Failed", "Unable to save order.");
      return;
    }

    if (!savedOrder?.id) {
      setDesignUploadBusy(false);
      Alert.alert(
        "Order Saved",
        "The order was saved, but its database ID was not returned. Design files were not uploaded.",
      );
      return;
    }

    try {
      if (sketchDirty) {
        await uploadSketchPaths(savedOrder.id, sketchPaths);
      }

      const newFabricPhotos = fabricPhotos.filter(
        (uri) => !uri.startsWith("http"),
      );

      for (const photoUri of newFabricPhotos) {
        await uploadOrderDesignAsset(savedOrder.id, photoUri, "fabric_photo");
      }

      const refreshedAssets = await getOrderDesignAssets(savedOrder.id);

      setSavedDesignAssets(refreshedAssets);

      const refreshedFabricPhotos = refreshedAssets
        .filter(
          (asset) => asset.asset_type === "fabric_photo" && !!asset.signedUrl,
        )
        .map((asset) => asset.signedUrl as string);

      setFabricPhotos(refreshedFabricPhotos);
      setSketchDirty(false);

      setDesignUploadBusy(false);
      closeForm();
    } catch (error) {
      console.error("DESIGN UPLOAD ERROR:", error);
      setDesignUploadBusy(false);

      Alert.alert(
        "Order Saved",
        "Your order was saved, but a design file could not be uploaded. The form remains open. Please try again.",
      );
    }
  };
  const updateOrderStatus = async (order: Order, status: OrderStatus) => {
    if (order.status === status) {
      return;
    }

    try {
      const updated: Order = {
        ...order,
        status,
      };

      await onUpdateOrder(updated);

      setSelectedOrder(updated);
    } catch (error) {
      console.error("STATUS UPDATE ERROR:", error);

      Alert.alert("Update Failed", "Unable to update order status.");
    }
  };

  const handleDeleteOrder = (order: Order) => {
    Alert.alert(
      "Delete Order",
      `Are you sure you want to delete ${order.orderNumber || "this order"}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await onDeleteOrder(order.id);

              setShowDetails(false);
              setSelectedOrder(null);
            } catch (error) {
              console.error("DELETE ORDER ERROR:", error);

              if (
                error instanceof Error &&
                error.message === "This order has a bill and cannot be deleted."
              ) {
                Alert.alert(
                  "Cannot Delete Order",
                  "This order already has a bill. Please keep the order because it is linked to billing history.",
                );
                return;
              }

              Alert.alert("Delete Failed", "Unable to delete order.");
            }
          },
        },
      ],
    );
  };

  const pickFabricPhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow photo access to select fabric images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.8,
      });

      if (!result.canceled) {
        setFabricPhotos((previous) =>
          [...previous, ...result.assets.map((asset) => asset.uri)].slice(0, 5),
        );
      }
    } catch {
      Alert.alert("Error", "Unable to open the photo library.");
    }
  };

  const removeFabricPhoto = async (uri: string) => {
    const asset = savedDesignAssets.find(
      (item) => item.asset_type === "fabric_photo" && item.signedUrl === uri,
    );

    if (asset) {
      try {
        await deleteOrderDesignAsset(asset);

        setSavedDesignAssets((previous) =>
          previous.filter((item) => item.id !== asset.id),
        );
      } catch (error) {
        console.error("DELETE FABRIC PHOTO ERROR:", error);
        Alert.alert(
          "Delete Failed",
          "Could not delete the saved fabric photo.",
        );
        return;
      }
    }

    setFabricPhotos((previous) =>
      previous.filter((photoUri) => photoUri !== uri),
    );
  };
  const clearSketch = () => {
    setSketchPaths([]);
    setCurrentSketchPath("");
    setSketchDirty(true);
  };

  const eraseSketchPath = (locationX: number, locationY: number) => {
    if (sketchPaths.length === 0) {
      return;
    }

    const remainingPaths = sketchPaths.filter((path) => {
      const points = path.match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g);

      if (!points) {
        return true;
      }

      const touched = points.some((point) => {
        const [x, y] = point.split(",").map(Number);

        return (
          Math.abs(x - locationX) <= 22 &&
          Math.abs(y - locationY) <= 22
        );
      });

      return !touched;
    });

    if (remainingPaths.length !== sketchPaths.length) {
      setSketchPaths(remainingPaths);
      setSketchDirty(true);
    }
  };

  const sketchCanvasRef = useRef<View>(null);
  const [enhancedSketchUri, setEnhancedSketchUri] = useState("");

  const enhanceSketch = async () => {
    if (sketchPaths.length === 0 && !currentSketchPath) {
      Alert.alert(
        "No Sketch",
        "Please draw your garment design first.",
      );
      return;
    }

    try {
      if (!sketchCanvasRef.current) {
        Alert.alert(
          "Capture Failed",
          "The sketch canvas is not ready yet.",
        );
        return;
      }

      const capturedUri = await captureRef(sketchCanvasRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      setEnhancedSketchUri(capturedUri);

      const capturedFile = new File(capturedUri);
      const imageBase64 = await capturedFile.base64();

      const { data, error } = await supabase.functions.invoke(
        "enhance-sketch",
        {
          body: {
            imageData: imageBase64,
          },
        },
      );

      if (error) {
        console.error("ENHANCE FUNCTION ERROR:", error);

        Alert.alert(
          "AI Enhance",
          "The sketch was captured, but the enhancement service could not be reached.",
        );

        return;
      }

      console.log("ENHANCE FUNCTION RESPONSE:", data);

      Alert.alert(
        "Sketch Sent",
        data?.message ||
          "The sketch was successfully sent to the enhancement service.",
      );
    } catch (error) {
      console.error("AI ENHANCE ERROR:", error);

      Alert.alert(
        "AI Enhance",
        "The sketch was captured, but it could not be sent for enhancement.",
      );
    }
  };
  return (
    <View style={styles.container}>
      <ScrollView
        ref={ordersScrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
  <MaterialCommunityIcons
    name="chevron-left"
    size={30}
    color={colors.PrimaryWine}
  />
</TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.brand}>FEMME FATALE BOUTIQUE</Text>

            <Text style={styles.title}>Orders</Text>

            <Text style={styles.subtitle}>
              {selectedCustomer
                ? selectedCustomer.name
                : "Manage boutique orders"}
            </Text>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={openCreateForm}>
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY */}
        <View style={styles.summaryRow}>
          <SummaryCard label="Total" value={String(stats.total)} />

          <SummaryCard label="Active" value={String(stats.active)} />

          <SummaryCard label="Ready" value={String(stats.ready)} />

          <SummaryCard label="Delivered" value={String(stats.delivered)} />
        </View>

        {/* DELIVERY ALERT */}
        {(stats.overdue > 0 || stats.dueToday > 0) && (
          <View style={styles.alertSummaryCard}>
            <View style={styles.alertSummaryIcon}>
              <Text style={styles.alertIconText}>!</Text>
            </View>

            <View style={styles.alertSummaryText}>
              <Text style={styles.alertSummaryTitle}>Delivery Attention</Text>

              <Text style={styles.alertSummarySubtitle}>
                {stats.overdue > 0
                  ? `${stats.overdue} overdue order${
                      stats.overdue === 1 ? "" : "s"
                    }`
                  : ""}

                {stats.overdue > 0 && stats.dueToday > 0 ? "" : ""}

                {stats.dueToday > 0 ? `${stats.dueToday} due today` : ""}
              </Text>
            </View>
          </View>
        )}

        {/* VALUE */}
        <View style={styles.valueCard}>
          <View>
            <Text style={styles.valueLabel}>ORDER VALUE</Text>

            <Text style={styles.valueAmount}>{money(stats.value)}</Text>
          </View>

          <Text style={styles.valueIcon}>{"\u20B9"}</Text>
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>{"\u{1F50D}"}</Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search orders..."
            placeholderTextColor="#999"
            style={styles.searchInput}
          />

          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={styles.clearText}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FILTER */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              statusFilter === "All" && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter("All")}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === "All" && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {STATUS_LIST.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ORDER LIST */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCustomer ? "Customer Orders" : "All Orders"}
          </Text>

          <Text style={styles.sectionCount}>{filteredOrders.length}</Text>
        </View>

        {filteredOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              {"\u{1F9F5}"}
            </Text>

            <Text style={styles.emptyTitle}>No orders found</Text>

            <Text style={styles.emptyText}>
              Create a new boutique order to get started.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={openCreateForm}
            >
              <Text style={styles.emptyButtonText}>+ Create Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const deliveryInfo = getDeliveryInfo(order);

            const progress = progressPercent(order.status);

            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                activeOpacity={0.9}
                onPress={async () => {
  setSelectedOrder(order);
  setShowDetails(true);

  try {
    const assets = await getOrderDesignAssets(order.id);

    const photos = assets
      .filter((asset) => asset.asset_type === "fabric_photo")
      .map((asset) => asset.signedUrl)
      .filter((url): url is string => Boolean(url));

    setSelectedOrderFabricPhotos(photos);
  } catch (error) {
    console.error("LOAD ORDER FABRIC PHOTOS ERROR:", error);
    setSelectedOrderFabricPhotos([]);
  }
}}
              >
                <View style={styles.orderCardTop}>
                  <View style={styles.orderIdentity}>
                    <View style={styles.customerInitialBadge}>
                      {order.customerName?.trim() ? (
                        <Text style={styles.customerInitialText}>
                          {order.customerName.trim().charAt(0).toUpperCase()}
                        </Text>
                      ) : (
                        <MaterialCommunityIcons
                          name="account-outline"
                          size={20}
                          color={colors.PrimaryWine}
                        />
                      )}
                    </View>

                    <View style={styles.orderNumberBox}>
                      <Text style={styles.orderNumber} numberOfLines={1}>
                        {order.orderNumber || "FF-001"}
                      </Text>

                      <Text style={styles.orderDate}>
                        {formatDate(order.orderDate)}
                      </Text>
                    </View>
                  </View>

                  <StatusBadge status={order.status} />
                </View>

                <View style={styles.orderMain}>
                  <View style={styles.itemIcon}>
                    <MaterialCommunityIcons
                      name="tshirt-crew"
                      size={26}
                      color={colors.PrimaryWine}
                    />
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{order.item}</Text>

                    <Text style={styles.customerText}>
                      {order.customerName}
                    </Text>

                    {order.measurementUsed ? (
                      <Text style={styles.measurementText}>
                        " {order.measurementUsed}
                      </Text>
                    ) : null}
                  </View>
                </View>

              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* CREATE / EDIT MODAL */}
      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={closeForm}
      >
        <View style={styles.overlay}>
          <View style={styles.formModal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editingOrder ? "Edit Order" : "New Order"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {editingOrder
                    ? editingOrder.orderNumber
                    : "Create boutique order"}
                </Text>
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={closeForm}>
                <Text style={styles.closeText}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={{
                  paddingHorizontal: 2,
                  paddingTop: 4,
                  paddingBottom: 18,
                }}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "900",
                    color: colors.DarkText,
                    letterSpacing: -0.3,
                  }}
                >
                  Femme Fatale Boutique
                </Text>

                <Text
                  style={{
                    marginTop: 3,
                    fontSize: 12,
                    color: colors.PrimaryWine,
                    fontWeight: "700",
                  }}
                >
                  Style Speaks Louder ♡
                </Text>

                <View
                  style={{
                    marginTop: 18,
                    padding: 15,
                    borderRadius: 18,
                    backgroundColor: "#FFF8FB",
                    borderWidth: 1,
                    borderColor: "#F8BBD0",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#9B647A",
                      fontWeight: "800",
                      textTransform: "uppercase",
                    }}
                  >
                    Order
                  </Text>

                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 18,
                      color: colors.DarkText,
                      fontWeight: "900",
                    }}
                  >
                    {editingOrder?.orderNumber?.match(/^FF-(\d+)$/i)
                      ? `#${editingOrder.orderNumber.toUpperCase()}`
                      : `#FF-${String(
                          Math.max(
                            0,
                            ...orders.map((order) => {
                              const match =
                                order.orderNumber?.match(/^FF-(\d{3})$/i);

                              return match ? Number(match[1]) : 0;
                            }),
                          ) + 1,
                        ).padStart(3, "0")}`}
                  </Text>

                  <Text
                    style={{
                      marginTop: 10,
                      fontSize: 16,
                      color: colors.DarkText,
                      fontWeight: "800",
                    }}
                  >
                    {customers.find(
                      (customer) => customer.id === form.customerId,
                    )?.name || "Select Customer"}
                  </Text>

                  <Text
                    style={{
                      marginTop: 3,
                      fontSize: 13,
                      color: "#8F4564",
                      fontWeight: "600",
                    }}
                  >
                    {customers.find(
                      (customer) => customer.id === form.customerId,
                    )?.phone || ""}
                  </Text>
                </View>

                <Text style={styles.formSectionTitle}>
                  Select Garment Type
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 9,
                  }}
                >
                  {[
                    ["👚", "Blouse"],
                    ["👗", "Gagra / Lehenga"],
                    ["🥻", "Saree Care"],
                    ["👘", "Salwar Suit"],
                  ].map(([icon, garment]) => (
                    <TouchableOpacity
                      key={garment}
                      style={{
                        width: "48%",
                        minHeight: 76,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        borderRadius: 16,
                        backgroundColor:
                          form.item === garment
                            ? colors.PrimaryWine
                            : "#FFF8FB",
                        borderWidth: 1,
                        borderColor:
                          form.item === garment
                            ? colors.PrimaryWine
                            : "#F0C3D5",
                        justifyContent: "center",
                      }}
                      onPress={() => updateField("item", garment)}
                    >
                      <Text
                        style={{
                          fontSize: 22,
                          marginBottom: 5,
                        }}
                      >
                        {icon}
                      </Text>

                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "800",
                          color:
                            form.item === garment
                              ? "#FFFFFF"
                              : colors.DarkText,
                        }}
                      >
                        {garment}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.formSectionTitle}>
                  Measurements (inches)
                </Text>

                <Text
                  style={{
                    fontSize: 12,
                    lineHeight: 18,
                    color: "#8F4564",
                    marginBottom: 13,
                  }}
                >
                  Auto-filled from saved customer profile where available —
                  supported measurement edits are saved permanently.
                </Text>

                {customerMeasurements.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      gap: 8,
                      paddingBottom: 12,
                    }}
                  >
                    {customerMeasurements.map((measurement) => (
                      <TouchableOpacity
                        key={measurement.id}
                        onPress={() => {
                          updateField("measurementId", measurement.id);
                          setMeasurementDraftFromMeasurement(measurement);
                        }}
                        style={{
                          paddingHorizontal: 13,
                          paddingVertical: 9,
                          borderRadius: 20,
                          backgroundColor:
                            form.measurementId === measurement.id
                              ? colors.PrimaryWine
                              : "#FFF8FB",
                          borderWidth: 1,
                          borderColor:
                            form.measurementId === measurement.id
                              ? colors.PrimaryWine
                              : "#F0C3D5",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "800",
                            color:
                              form.measurementId === measurement.id
                                ? "#FFFFFF"
                                : colors.DarkText,
                          }}
                        >
                          {measurement.type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noMeasurementBox}>
                    <Text style={styles.noMeasurementText}>
                      No saved measurements. Enter the values below and they
                      will be saved with this customer.
                    </Text>
                  </View>
                )}

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    marginHorizontal: -4,
                  }}
                >
                  {[
                    ["length", "Length"],
                    ["shoulder", "Shoulder"],
                    ["frontNeck", "Front Neck"],
                    ["backNeck", "Back Neck"],
                    ["highChest", "High Chest"],
                    ["lowChest", "Low Chest"],
                    ["waist", "Waist"],
                    ["armhole", "Armhole"],
                    ["handsLength", "Hands Length"],
                    ["handsLoose", "Hands Loose"],
                  ].map(([field, label]) => (
                    <View
                      key={field}
                      style={{
                        width: "50%",
                        paddingHorizontal: 4,
                        marginBottom: 13,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "800",
                          color: "#8F4564",
                          marginBottom: 6,
                        }}
                      >
                        {label}
                      </Text>

                      <TextInput
                        value={
                          measurementDraft[
                            field as keyof typeof measurementDraft
                          ]
                        }
                        onChangeText={(value) =>
                          updateMeasurementDraft(
                            field as keyof typeof measurementDraft,
                            value,
                          )
                        }
                        placeholder="—"
                        placeholderTextColor="#B99AAA"
                        keyboardType="decimal-pad"
                        style={{
                          height: 46,
                          borderWidth: 1,
                          borderColor: "#F0C3D5",
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          backgroundColor: "#FFFFFF",
                          color: colors.DarkText,
                          fontSize: 14,
                          fontWeight: "700",
                        }}
                      />
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={{
                    marginTop: 3,
                    minHeight: 58,
                    borderRadius: 15,
                    borderWidth: 1,
                    borderColor: "#F0C3D5",
                    backgroundColor: "#FFF8FB",
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 15,
                  }}
                  onPress={() => {
                    Alert.alert(
                      "Snap Paper Note",
                      "Paper-note AI Auto-Fill can be connected to an OCR/image-processing service. Your manual measurements remain available.",
                    );
                  }}
                >
                  <MaterialCommunityIcons
                    name="camera-outline"
                    size={24}
                    color={colors.PrimaryWine}
                  />

                  <View style={{ flex: 1, marginLeft: 11 }}>
                    <Text
                      style={{
                        color: colors.DarkText,
                        fontSize: 13,
                        fontWeight: "900",
                      }}
                    >
                      Snap Paper Note (AI Auto-Fill)
                    </Text>

                    <Text
                      style={{
                        marginTop: 2,
                        color: "#9B647A",
                        fontSize: 10,
                      }}
                    >
                      Scan a handwritten measurement note
                    </Text>
                  </View>

                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={colors.PrimaryWine}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    marginTop: 16,
                    minHeight: 52,
                    borderRadius: 14,
                    backgroundColor: colors.PrimaryWine,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                  }}
                  onPress={async () => {
                    try {
                      await persistMeasurementDraft();

                      Alert.alert(
                        "Measurements Saved",
                        "Your measurement changes have been saved permanently.",
                        [
                          {
                            text: "Continue",
                            onPress: () => {
                              requestAnimationFrame(() => {
                                ordersScrollRef.current?.scrollTo({
                                  y: Math.max(
                                    0,
                                    sketchSectionOffset.current - 12,
                                  ),
                                  animated: true,
                                });
                              });
                            },
                          },
                        ],
                      );
                    } catch (error) {
                      console.error(
                        "MEASUREMENT CONTINUE SAVE ERROR:",
                        error,
                      );

                      Alert.alert(
                        "Save Failed",
                        "Unable to save the measurement changes.",
                      );
                    }
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: "900",
                    }}
                  >
                    Continue to Sketch & Fabric
                  </Text>

                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={19}
                    color="#FFFFFF"
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              </View>

              {/* SKETCH AND FABRIC REFERENCE */}
              <View
  style={styles.sketchSection}
  onLayout={(event) => {
    sketchSectionOffset.current = event.nativeEvent.layout.y;
  }}
>
                <Text style={styles.fieldLabel}>Design Sketch</Text>

                <View style={styles.sketchToolbar}>
                  <TouchableOpacity
                    style={[
                      styles.sketchToolButton,
                      sketchTool === "pen" && styles.sketchToolButtonActive,
                    ]}
                    onPress={() => setSketchTool("pen")}
                  >
                    <Text style={styles.sketchToolText}>Pen</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sketchToolButton,
                      sketchTool === "eraser" && styles.sketchToolButtonActive,
                    ]}
                    onPress={() => setSketchTool("eraser")}
                  >
                    <Text style={styles.sketchToolText}>Eraser</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sketchToolButton}
                    onPress={clearSketch}
                  >
                    <Text style={styles.sketchToolText}>Clear</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sketchToolButton}
                    onPress={enhanceSketch}
                  >
                    <Text style={styles.sketchToolText}>AI Enhance</Text>
                  </TouchableOpacity>
                </View>

                <View
                  ref={sketchCanvasRef}
                  style={styles.sketchCanvas}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={(event) => {
                    const { locationX, locationY } = event.nativeEvent;

                    if (sketchTool === "eraser") {
                      eraseSketchPath(locationX, locationY);
                      return;
                    }

                    setCurrentSketchPath(`M${locationX},${locationY}`);
                  }}
                  onResponderMove={(event) => {
                    const { locationX, locationY } = event.nativeEvent;

                    if (sketchTool === "eraser") {
                      eraseSketchPath(locationX, locationY);
                      return;
                    }

                    setCurrentSketchPath(
                      (previous) => `${previous} L${locationX},${locationY}`,
                    );
                  }}
                  onResponderRelease={() => {
                    if (sketchTool === "eraser") {
                      return;
                    }

                    if (currentSketchPath) {
                      setSketchPaths((previous) => [
                        ...previous,
                        currentSketchPath,
                      ]);
                      setCurrentSketchPath("");
                      setSketchDirty(true);
                    }
                  }}
                >
                  <Svg
                    width="100%"
                    height="240"
                    viewBox="0 0 320 240"
                    preserveAspectRatio="none"
                  >
                    {sketchPaths.map((path, index) => (
                      <Path
                        key={index}
                        d={path}
                        stroke="#8E4565"
                        strokeWidth={3}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}

                    {currentSketchPath ? (
                      <Path
                        d={currentSketchPath}
                        stroke="#8E4565"
                        strokeWidth={3}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}
                  </Svg>
                </View>

                {enhancedSketchUri ? (
                  <View style={styles.enhancedSketchPreview}>
                    <Text style={styles.fieldLabel}>
                      Captured Sketch
                    </Text>

                    <Image
                      source={{ uri: enhancedSketchUri }}
                      style={styles.enhancedSketchImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}

                <Text style={styles.sketchHint}>
                  Draw your garment design using your finger.
                </Text>

                <Text style={styles.fieldLabel}>Fabric Reference Photos</Text>

                <TouchableOpacity
                  style={styles.fabricPickerButton}
                  onPress={pickFabricPhoto}
                >
                  <Text style={styles.fabricPickerText}>
                    + Add Fabric Photos
                  </Text>
                </TouchableOpacity>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.fabricPhotoRow}
                >
                  {fabricPhotos.map((uri, index) => (
                    <View
                      key={`${uri}-${index}`}
                      style={styles.fabricPhotoWrapper}
                    >
                      <Image source={{ uri }} style={styles.fabricPhoto} />

                      <TouchableOpacity
                        style={styles.removeFabricPhoto}
                        onPress={() => removeFabricPhoto(uri)}
                      >
                        <Text style={styles.removeFabricPhotoText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.twoColumn}>
                <View style={styles.column}>
                  <Text style={styles.fieldLabel}>Quantity</Text>

                  <TextInput
                    value={form.quantity}
                    onChangeText={(value) => updateField("quantity", value)}
                    placeholder="1"
                    placeholderTextColor="#999"
                    style={styles.input}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.column}>
                  <Text style={styles.fieldLabel}>Price / Piece</Text>

                  <TextInput
                    value={form.price}
                    onChangeText={(value) => updateField("price", value)}
                    placeholder="0"
                    placeholderTextColor="#999"
                    style={styles.input}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.twoColumn}>
                <View style={styles.column}>
                  <Text style={styles.fieldLabel}>Order Date</Text>

                  <TextInput
                    value={form.orderDate}
                    onChangeText={(value) => updateField("orderDate", value)}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#999"
                    style={styles.input}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <View style={styles.column}>
                  <Text style={styles.fieldLabel}>Delivery Date</Text>

                  <TextInput
                    value={form.deliveryDate}
                    onChangeText={(value) => updateField("deliveryDate", value)}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#999"
                    style={styles.input}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              <Text style={styles.formSectionTitle}>Notes</Text>

              <TextInput
                value={form.notes}
                onChangeText={(value) => updateField("notes", value)}
                placeholder="Special instructions..."
                placeholderTextColor="#999"
                multiline
                style={[styles.input, styles.notesInput]}
              />

              <TouchableOpacity style={styles.saveButton} onPress={saveOrder}>
                <Text style={styles.saveButtonText}>
                  {editingOrder ? "Update Order" : "Create Order"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={closeForm}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DETAILS MODAL */}
      <Modal
        visible={showDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.detailsModal}>
            {selectedOrder && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedOrder.item}</Text>

                    <Text style={styles.modalSubtitle}>
                      {selectedOrder.orderNumber ||
                        `#${selectedOrder.id.slice(-6)}`}
                      {" • "}
                      {selectedOrder.customerName}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDetails(false)}
                  >
                    <Text style={styles.closeText}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>

{/* DELIVERY */}
                  <View style={styles.deliveryStatusCard}>
                    <View style={styles.deliveryStatusLeft}>
                      <Text style={styles.deliveryStatusLabel}>
                        DELIVERY STATUS
                      </Text>

                      <Text style={styles.deliveryStatusDate}>
                        {formatDate(selectedOrder.deliveryDate)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.deliveryInfoBadge,
                        {
                          backgroundColor:
                            getDeliveryInfo(selectedOrder).background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.deliveryInfoBadgeText,
                          {
                            color: getDeliveryInfo(selectedOrder).color,
                          },
                        ]}
                      >
                        {getDeliveryInfo(selectedOrder).label}
                      </Text>
                    </View>
                  </View>

                  {/* ORDER INFORMATION */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>
                      Order Information
                    </Text>

                    <DetailRow
                      label="Customer"
                      value={selectedOrder.customerName}
                    />

                    <DetailRow label="Item" value={selectedOrder.item} />

                    <DetailRow
                      label="Quantity"
                      value={String(selectedOrder.quantity)}
                    />

                    <DetailRow
                      label="Price / Piece"
                      value={money(Number(selectedOrder.price || 0))}
                    />

                    <DetailRow
                      label="Total"
                      value={money(orderTotal(selectedOrder))}
                    />

                    <DetailRow
                      label="Order Date"
                      value={formatDate(selectedOrder.orderDate)}
                    />

                    <DetailRow
                      label="Delivery Date"
                      value={formatDate(selectedOrder.deliveryDate)}
                    />

                    <DetailRow
                      label="Measurement"
                      value={selectedOrder.measurementUsed || "Not selected"}
                    />
                  </View>

                  {/* SNAPSHOT */}
                  {selectedOrder.measurementSnapshot && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsSectionTitle}>
                        Measurement Snapshot
                      </Text>

                      <View style={styles.snapshotGrid}>
                        <SnapshotValue
                          label="Bust"
                          value={selectedOrder.measurementSnapshot.bust}
                        />

                        <SnapshotValue
                          label="Waist"
                          value={selectedOrder.measurementSnapshot.waist}
                        />

                        <SnapshotValue
                          label="Hip"
                          value={selectedOrder.measurementSnapshot.hip}
                        />

                        <SnapshotValue
                          label="Shoulder"
                          value={selectedOrder.measurementSnapshot.shoulder}
                        />

                        <SnapshotValue
                          label="Sleeve"
                          value={selectedOrder.measurementSnapshot.sleeveLength}
                        />

                        <SnapshotValue
                          label="Blouse"
                          value={selectedOrder.measurementSnapshot.blouseLength}
                        />

                        <SnapshotValue
                          label="Front Neck"
                          value={selectedOrder.measurementSnapshot.frontNeck}
                        />

                        <SnapshotValue
                          label="Back Neck"
                          value={selectedOrder.measurementSnapshot.backNeck}
                        />

                        <SnapshotValue
                          label="Armhole"
                          value={selectedOrder.measurementSnapshot.armhole}
                        />
                      </View>
                    </View>
                  )}
                                    {/* FABRIC REFERENCE PHOTOS */}
                  {selectedOrderFabricPhotos.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsSectionTitle}>
                        Fabric Reference Photos
                      </Text>

                      <View style={styles.photoGrid}>
                        {selectedOrderFabricPhotos.map((uri, index) => (
                          <Image
                            key={`${uri}-${index}`}
                            source={{ uri }}
                            style={styles.orderFabricImage}
                          />
                        ))}
                      </View>
                    </View>
                  )}
{/* DESIGN ASSETS */}
{savedDesignAssets.length > 0 && (
  <View style={styles.detailsSection}>

    <Text style={styles.detailsSectionTitle}>
      Design References
    </Text>

    <View style={styles.photoGrid}>

      {savedDesignAssets.map((asset) => (
        asset.signedUrl ? (
          <Image
            key={asset.id}
            source={{ uri: asset.signedUrl }}
            style={styles.orderFabricImage}
          />
        ) : null
      ))}

    </View>

  </View>
)}

                  {/* NOTES */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>Notes</Text>

                    <Text style={styles.detailsNotes}>
                      {selectedOrder.notes || "No notes added."}
                    </Text>
                  </View>

                  {/* EDIT */}
                  <TouchableOpacity
                    style={styles.editOrderButton}
                    onPress={() => {
                      setShowDetails(false);
                      openEditForm(selectedOrder);
                    }}
                  >
                    <Text style={styles.editOrderText}>Edit Order</Text>
                  </TouchableOpacity>

                  {/* DELETE */}
                  <TouchableOpacity
                    style={styles.deleteOrderButton}
                    onPress={() => handleDeleteOrder(selectedOrder)}
                  >
                    <Text style={styles.deleteOrderText}>Delete Order</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeDetailsButton}
                    onPress={() => setShowDetails(false)}
                  >
                    <Text style={styles.closeDetailsText}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* -------------------------------------------------------
   SMALL COMPONENTS
------------------------------------------------------- */

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>

      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: `${statusColor(status)}18`,
          borderColor: `${statusColor(status)}40`,
        },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          {
            color: statusColor(status),
          },
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>

      <Text style={styles.detailValue}>{value || "-"}</Text>
    </View>
  );
}

function SnapshotValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.snapshotItem}>
      <Text style={styles.snapshotLabel}>{label}</Text>

      <Text style={styles.snapshotValue}>{value || "-"}</Text>
    </View>
  );
}

/* -------------------------------------------------------
   STYLES
------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.Cream,
  },

  scrollContent: {
    padding: 18,
    paddingBottom: 45,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  backButtonText: {
    fontSize: 31,
    color: colors.PrimaryWine,
    marginTop: -5,
  },

  headerText: {
    flex: 1,
  },

  brand: {
    color: colors.Gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  title: {
    color: colors.DarkText,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
  },

  subtitle: {
    color: colors.Gray,
    fontSize: 12,
    marginTop: 3,
  },

  addButton: {
    backgroundColor: colors.PrimaryWine,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginLeft: 8,
  },

  addButtonText: {
    color: colors.White,
    fontSize: 13,
    fontWeight: "900",
  },

  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: colors.White,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.Border,
    paddingVertical: 12,
    alignItems: "center",
  },

  summaryValue: {
    color: colors.PrimaryWine,
    fontSize: 18,
    fontWeight: "900",
  },

  summaryLabel: {
    color: colors.Gray,
    fontSize: 9,
    marginTop: 2,
    fontWeight: "700",
  },

  alertSummaryCard: {
    backgroundColor: "#FFF5F8",
    borderWidth: 1,
    borderColor: "#F8BBD0",
    borderRadius: 14,
    padding: 11,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  alertSummaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FCE5EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  alertIconText: {
    color: colors.Orange,
    fontSize: 18,
    fontWeight: "900",
  },

  alertSummaryText: {
    flex: 1,
  },

  alertSummaryTitle: {
    color: colors.DarkText,
    fontSize: 12,
    fontWeight: "900",
  },

  alertSummarySubtitle: {
    color: colors.Orange,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },

  valueCard: {
    backgroundColor: colors.PrimaryWine,
    borderRadius: 16,
    padding: 15,
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  valueLabel: {
    color: "#FCE4EC",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  valueAmount: {
    color: colors.White,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 3,
  },

  valueIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#C2185B20",
    color: colors.White,
    textAlign: "center",
    textAlignVertical: "center",
    paddingTop: 9,
    fontSize: 21,
    fontWeight: "900",
  },

  searchBox: {
    height: 49,
    backgroundColor: colors.White,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.Border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginBottom: 11,
  },

  searchIcon: {
    color: colors.PrimaryWine,
    fontSize: 18,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    color: colors.DarkText,
    fontSize: 14,
  },

  clearText: {
    color: colors.Gray,
    fontSize: 24,
    paddingLeft: 8,
  },

  filterRow: {
    gap: 7,
    paddingBottom: 15,
  },

  filterChip: {
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  filterChipActive: {
    backgroundColor: colors.PrimaryWine,
    borderColor: colors.PrimaryWine,
  },

  filterChipText: {
    color: colors.Gray,
    fontSize: 10,
    fontWeight: "800",
  },

  filterChipTextActive: {
    color: colors.White,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: {
    flex: 1,
    color: colors.DarkText,
    fontSize: 18,
    fontWeight: "900",
  },

  sectionCount: {
    minWidth: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: colors.SoftPink,
    color: colors.PrimaryWine,
    textAlign: "center",
    textAlignVertical: "center",
    paddingTop: 6,
    fontSize: 11,
    fontWeight: "900",
  },

  orderCard: {
    backgroundColor: colors.White,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F8BBD0",
    padding: 17,
    marginBottom: 15,
    shadowColor: "#C2185B",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  orderCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  orderIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },

  customerInitialBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.SoftPink,
    borderWidth: 1,
    borderColor: "#F8BBD0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  customerInitialText: {
    color: colors.PrimaryWine,
    fontSize: 17,
    fontWeight: "900",
  },

  orderNumberBox: {
    flex: 1,
  },

  orderNumber: {
    color: colors.DarkText,
    fontSize: 13,
    fontWeight: "900",
  },

  orderDate: {
    color: colors.Gray,
    fontSize: 10,
    marginTop: 3,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    minHeight: 30,
  },

  statusBadgeIcon: {
    fontSize: 11,
    marginRight: 5,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  orderMain: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },

  itemIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: colors.SoftPink,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  itemIconText: {
    fontSize: 20,
  },

  itemInfo: {
    flex: 1,
  },

  itemName: {
    color: colors.DarkText,
    fontSize: 15,
    fontWeight: "900",
  },

  customerText: {
    color: colors.Gray,
    fontSize: 11,
    marginTop: 3,
  },

  measurementText: {
    color: colors.PrimaryWine,
    fontSize: 10,
    marginTop: 4,
    fontWeight: "700",
  },

  progressSection: {
    marginTop: 14,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  progressLabel: {
    color: colors.Gray,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  progressPercent: {
    fontSize: 10,
    fontWeight: "900",
  },

  progressTrack: {
    height: 6,
    backgroundColor: "#FCE5EF",
    borderRadius: 6,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 6,
  },

  miniStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },

  miniStatusCurrent: {
    color: colors.DarkText,
    fontSize: 9,
    fontWeight: "900",
  },

  miniStatusHint: {
    color: colors.Gray,
    fontSize: 8,
    fontWeight: "700",
  },

  orderBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.Border,
  },

  deliveryBox: {
    flex: 1,
  },

  deliveryLabel: {
    color: colors.Gray,
    fontSize: 8,
    fontWeight: "800",
  },

  deliveryDate: {
    color: colors.DarkText,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },

  deliveryBadge: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 6,
  },

  deliveryBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  quantityBox: {
    marginLeft: "auto",
    alignItems: "center",
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#FFF5F8",
    borderRadius: 12,
  },

  quantityLabel: {
    color: colors.Gray,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  quantityValue: {
    color: colors.DarkText,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
  },

  priceBox: {
    marginLeft: 12,
    alignItems: "flex-end",
    paddingLeft: 8,
  },

  priceLabel: {
    color: colors.Gray,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  priceValue: {
    color: colors.PrimaryWine,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
  },

  emptyCard: {
    backgroundColor: colors.White,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.Border,
    alignItems: "center",
    padding: 30,
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    color: colors.DarkText,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
  },

  emptyText: {
    color: colors.Gray,
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },

  emptyButton: {
    backgroundColor: colors.PrimaryWine,
    borderRadius: 11,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 15,
  },

  emptyButtonText: {
    color: colors.White,
    fontWeight: "900",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(20,10,15,0.5)",
    justifyContent: "flex-end",
  },

  formModal: {
    maxHeight: "95%",
    backgroundColor: colors.Cream,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
  },

  detailsModal: {
    maxHeight: "94%",
    backgroundColor: colors.Cream,
    borderRadius: 24,
    margin: 15,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },

  modalTitle: {
    color: colors.DarkText,
    fontSize: 21,
    fontWeight: "900",
  },

  modalSubtitle: {
    color: colors.Gray,
    fontSize: 11,
    marginTop: 3,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.White,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  closeText: {
    color: colors.DarkText,
    fontSize: 25,
    marginTop: -2,
  },

  formSectionTitle: {
    color: colors.DarkText,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 9,
  },

  customerChipRow: {
    gap: 7,
    paddingBottom: 4,
  },

  customerChip: {
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  customerChipActive: {
    backgroundColor: colors.PrimaryWine,
    borderColor: colors.PrimaryWine,
  },

  customerChipText: {
    color: colors.Gray,
    fontSize: 11,
    fontWeight: "800",
  },

  customerChipTextActive: {
    color: colors.White,
  },

  fieldLabel: {
    color: colors.DarkText,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 5,
  },

  input: {
    minHeight: 46,
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    borderRadius: 11,
    paddingHorizontal: 12,
    color: colors.DarkText,
    fontSize: 13,
    marginBottom: 10,
  },

  measurementChipRow: {
    gap: 7,
    paddingBottom: 5,
  },

  measurementChip: {
    minWidth: 110,
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    borderRadius: 12,
    padding: 10,
  },

  measurementChipActive: {
    backgroundColor: colors.PrimaryWine,
    borderColor: colors.PrimaryWine,
  },

  measurementChipTitle: {
    color: colors.DarkText,
    fontSize: 11,
    fontWeight: "900",
  },

  measurementChipTitleActive: {
    color: colors.White,
  },

  measurementChipDate: {
    color: colors.Gray,
    fontSize: 9,
    marginTop: 3,
  },

  measurementChipDateActive: {
    color: "#FCE4EC",
  },

  noMeasurementBox: {
    backgroundColor: colors.SoftPink,
    borderRadius: 11,
    padding: 12,
  },

  noMeasurementText: {
    color: colors.PrimaryWine,
    fontSize: 11,
    fontWeight: "700",
  },

  twoColumn: {
    flexDirection: "row",
    gap: 10,
  },

  column: {
    flex: 1,
  },

  statusRow: {
    gap: 7,
    paddingBottom: 5,
  },

  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  statusOptionIcon: {
    fontSize: 10,
    marginRight: 4,
  },

  statusOptionText: {
    color: colors.Gray,
    fontSize: 10,
    fontWeight: "800",
  },

  statusOptionTextActive: {
    color: colors.White,
  },

  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },

  saveButton: {
    minHeight: 50,
    backgroundColor: colors.PrimaryWine,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  saveButtonText: {
    color: colors.White,
    fontSize: 15,
    fontWeight: "900",
  },

  cancelButton: {
    minHeight: 47,
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  cancelButtonText: {
    color: colors.DarkText,
    fontWeight: "800",
  },

  /* DETAILS */

  currentStatusCard: {
    backgroundColor: colors.White,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.Border,
    padding: 14,
    marginBottom: 15,
  },

  currentStatusTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  currentStatusLabel: {
    color: colors.Gray,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  currentStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  currentStatusIcon: {
    fontSize: 20,
    marginRight: 8,
  },

  currentStatusText: {
    fontSize: 17,
    fontWeight: "900",
  },

  progressCircleBox: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 58,
  },

  progressCircleValue: {
    fontSize: 18,
    fontWeight: "900",
  },

  progressCircleLabel: {
    color: colors.Gray,
    fontSize: 8,
    fontWeight: "700",
    marginTop: 1,
  },

  detailsProgressTrack: {
    height: 7,
    backgroundColor: "#FCE5EF",
    borderRadius: 7,
    overflow: "hidden",
    marginTop: 12,
  },

  detailsProgressFill: {
    height: "100%",
    borderRadius: 7,
  },

  /* FULL FLOW */

  progressFlowCard: {
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 13,
  },

  flowItem: {
    flexDirection: "row",
    minHeight: 65,
  },

  flowIndicatorColumn: {
    width: 32,
    alignItems: "center",
  },

  flowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.White,
    borderWidth: 1.5,
    borderColor: colors.Border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  flowCircleText: {
    color: colors.Gray,
    fontSize: 9,
    fontWeight: "900",
  },

  flowCircleTextCompleted: {
    color: colors.White,
  },

  flowLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#F8BBD0",
    marginVertical: -1,
  },

  flowContent: {
    flex: 1,
    marginLeft: 9,
    marginBottom: 8,
    padding: 9,
    borderRadius: 11,
    backgroundColor: "#FFF5F8",
  },

  flowContentActive: {
    backgroundColor: colors.SoftPink,
    borderWidth: 1,
    borderColor: "#F8BBD0",
  },

  flowTextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  flowTitleBox: {
    flexDirection: "row",
    alignItems: "center",
  },

  flowStatusIcon: {
    fontSize: 13,
    marginRight: 6,
  },

  flowStatusText: {
    color: colors.DarkText,
    fontSize: 11,
    fontWeight: "900",
  },

  flowStepText: {
    color: colors.Gray,
    fontSize: 8,
    fontWeight: "800",
  },

  flowStepTextActive: {
    color: colors.PrimaryWine,
  },

  flowDescription: {
    color: colors.Gray,
    fontSize: 8,
    marginTop: 4,
    lineHeight: 12,
  },

  deliveryStatusCard: {
    backgroundColor: colors.White,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.Border,
    padding: 14,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  deliveryStatusLeft: {
    flex: 1,
  },

  deliveryStatusLabel: {
    color: colors.Gray,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  deliveryStatusDate: {
    color: colors.DarkText,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
  },

  deliveryInfoBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 10,
  },

  deliveryInfoBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },

  detailsSection: {
    backgroundColor: colors.White,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.Border,
    padding: 14,
    marginBottom: 11,
  },

  detailsSectionTitle: {
    color: colors.DarkText,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },

  detailRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8BBD0",
  },

  detailLabel: {
    width: "40%",
    color: colors.Gray,
    fontSize: 10,
  },

  detailValue: {
    flex: 1,
    color: colors.DarkText,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },

  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  snapshotItem: {
    width: "31%",
    backgroundColor: colors.Cream,
    borderRadius: 10,
    padding: 9,
  },

  snapshotLabel: {
    color: colors.Gray,
    fontSize: 8,
  },

  snapshotValue: {
    color: colors.DarkText,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3,
  },

  detailsNotes: {
    color: colors.DarkText,
    fontSize: 12,
    lineHeight: 19,
  },

  editOrderButton: {
    minHeight: 49,
    backgroundColor: colors.PrimaryWine,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  deleteOrderButton: {
    minHeight: 49,
    backgroundColor: "#FFF5F8",
    borderWidth: 1,
    borderColor: "#F8BBD0",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  editOrderText: {
    color: colors.White,
    fontWeight: "900",
  },

  deleteOrderText: {
    color: colors.PrimaryWine,
    fontWeight: "900",
  },

  closeDetailsButton: {
    minHeight: 46,
    backgroundColor: colors.White,
    borderWidth: 1,
    borderColor: colors.Border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 8,
  },

  garmentChipRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 10,
  },
  garmentChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.Border,
    backgroundColor: colors.Cream,
  },
  garmentChipActive: {
    backgroundColor: colors.PrimaryWine,
    borderColor: colors.PrimaryWine,
  },
  garmentChipText: {
    color: colors.DarkText,
    fontWeight: "600",
  },
  garmentChipTextActive: {
    color: "#FFFFFF",
  },

  sketchSection: {
    marginTop: 18,
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFF5F8",
    borderWidth: 1,
    borderColor: "#F8BBD0",
    gap: 12,
  },

  sketchToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  sketchToolButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#FCE5EF",
    borderWidth: 1,
    borderColor: "#F8BBD0",
  },

  sketchToolButtonActive: {
    backgroundColor: "#C2185B",
    borderColor: "#C2185B",
  },

  sketchToolText: {
    color: "#C2185B",
    fontSize: 12,
    fontWeight: "700",
  },

  sketchCanvas: {
    height: 240,
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F8BBD0",
    backgroundColor: "#FFFFFF",
  },

  enhancedSketchPreview: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F8BBD0",
  },

  enhancedSketchImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  sketchHint: {
    fontSize: 12,
    color: "#8E4565",
    marginBottom: 8,
  },

  fabricPickerButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#C2185B",
  },

  fabricPickerText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  fabricPhotoRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 8,
  },

  fabricPhotoWrapper: {
    width: 100,
    height: 110,
    position: "relative",
  },

  fabricPhoto: {
    width: 100,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#FCE5EF",
  },

  removeFabricPhoto: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#C2185B",
    alignItems: "center",
    justifyContent: "center",
  },

  removeFabricPhotoText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  closeDetailsText: {
    color: colors.DarkText,
    fontWeight: "800",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  orderFabricImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#FCE5EF",
  },
});




































