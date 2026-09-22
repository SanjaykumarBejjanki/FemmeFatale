import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { Customer } from "./CustomersScreen";
import type { Measurement } from "./measurements/MeasurementsScreen";

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */

export type OrderStatus =
  | "New"
  | "Measurement"
  | "Cutting"
  | "Stitching"
  | "Trial"
  | "Ready"
  | "Delivered"
  // Legacy values are kept so existing Supabase rows do not
  // break while the app is being moved to the new workflow.
  | "Pending"
  | "In Progress";

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
  onBack: () => void;
};

/* -------------------------------------------------------
   CONSTANTS
------------------------------------------------------- */

const GARMENT_TYPES = [
  "Blouse",
  "Chudidar",
  "Dress",
  "Pant",
  "Lehenga",
  "Kurti",
  "Other",
];

const WORKFLOW_STATUSES: OrderStatus[] = [
  "New",
  "Measurement",
  "Cutting",
  "Stitching",
  "Trial",
  "Ready",
  "Delivered",
];

const LEGACY_STATUS_MAP: Record<string, OrderStatus> = {
  Pending: "New",
  "In Progress": "Stitching",
};

const BRAND = {
  wine: "#8B1238",
  magenta: "#C2185B",
  gold: "#C69A3A",
  cream: "#FFF9F2",
  softPink: "#FCE8F0",
  dark: "#242124",
  white: "#FFFFFF",
  muted: "#777177",
  border: "#E9DDE2",
  green: "#2E7D32",
  orange: "#C66A00",
};

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function normalizeStatus(status: OrderStatus | string): OrderStatus {
  return LEGACY_STATUS_MAP[status] || (status as OrderStatus);
}

function formatCurrency(value: number | string | undefined) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getOrderDisplayNumber(order: Order, index = 0) {
  if (order.orderNumber) return order.orderNumber;
  if (order.id) {
    const shortId = order.id.length > 8 ? order.id.slice(0, 8) : order.id;
    return `ORD-${shortId.toUpperCase()}`;
  }
  return `ORD-${String(index + 1).padStart(3, "0")}`;
}

function getMeasurementDateValue(value: string | undefined) {
  if (!value) return "";

  const trimmed = value.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  const displayMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (displayMatch) return trimmed;

  return trimmed;
}

function getLatestMeasurement(
  customerMeasurements: Measurement[] | undefined
): Measurement | null {
  if (!customerMeasurements || customerMeasurements.length === 0) {
    return null;
  }

  return [...customerMeasurements].sort((a, b) => {
    const aDate = new Date(a.date).getTime();
    const bDate = new Date(b.date).getTime();

    if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
      return bDate - aDate;
    }

    return String(b.date).localeCompare(String(a.date));
  })[0];
}

function createSnapshot(
  measurement: Measurement | undefined | null
): MeasurementSnapshot | null {
  if (!measurement) return null;

  return {
    id: measurement.id,
    date: measurement.date || "",
    type: measurement.type || "",
    bust: measurement.bust || "",
    waist: measurement.waist || "",
    hip: measurement.hip || "",
    shoulder: measurement.shoulder || "",
    sleeveLength: measurement.sleeveLength || "",
    blouseLength: measurement.blouseLength || "",
    frontNeck: measurement.frontNeck || "",
    backNeck: measurement.backNeck || "",
    armhole: measurement.armhole || "",
    pantLength: measurement.pantLength || "",
    notes: measurement.notes || "",
  };
}

function getStatusDescription(status: OrderStatus | string) {
  switch (normalizeStatus(status)) {
    case "New":
      return "Order received and waiting to be processed.";
    case "Measurement":
      return "Measurements are being taken or confirmed.";
    case "Cutting":
      return "Fabric cutting is in progress.";
    case "Stitching":
      return "Garment stitching is in progress.";
    case "Trial":
      return "Trial fitting is in progress.";
    case "Ready":
      return "Garment is ready for customer pickup.";
    case "Delivered":
      return "Order has been delivered.";
    default:
      return "Order status updated.";
  }
}

function getStatusStyle(status: OrderStatus | string) {
  switch (normalizeStatus(status)) {
    case "New":
      return {
        backgroundColor: "#F4E7EC",
        textColor: BRAND.wine,
      };
    case "Measurement":
      return {
        backgroundColor: "#FCEAF1",
        textColor: BRAND.magenta,
      };
    case "Cutting":
      return {
        backgroundColor: "#FFF2D8",
        textColor: "#946200",
      };
    case "Stitching":
      return {
        backgroundColor: "#F4E8F4",
        textColor: "#713A75",
      };
    case "Trial":
      return {
        backgroundColor: "#E9F1F8",
        textColor: "#28628A",
      };
    case "Ready":
      return {
        backgroundColor: "#E7F4E9",
        textColor: BRAND.green,
      };
    case "Delivered":
      return {
        backgroundColor: "#E5F4EE",
        textColor: "#216B4B",
      };
    default:
      return {
        backgroundColor: "#F2EFF1",
        textColor: BRAND.muted,
      };
  }
}

/* -------------------------------------------------------
   SMALL UI COMPONENTS
------------------------------------------------------- */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function SummaryPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryPillValue}>{value}</Text>
      <Text style={styles.summaryPillLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: OrderStatus | string }) {
  const normalized = normalizeStatus(status);
  const colors = getStatusStyle(normalized);

  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: colors.backgroundColor },
      ]}
    >
      <Text style={[styles.statusBadgeText, { color: colors.textColor }]}>
        {normalized}
      </Text>
    </View>
  );
}

function MeasurementValue({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) return null;

  return (
    <View style={styles.measurementValue}>
      <Text style={styles.measurementLabel}>{label}</Text>
      <Text style={styles.measurementNumber}>{value}</Text>
    </View>
  );
}

/* -------------------------------------------------------
   SCREEN
------------------------------------------------------- */

export default function OrdersScreen({
  customers,
  selectedCustomer,
  measurements,
  orders,
  onCreateOrder,
  onUpdateOrder,
  onBack,
}: OrdersScreenProps) {
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [customerId, setCustomerId] = useState(
    selectedCustomer?.id || customers[0]?.id || ""
  );
  const [item, setItem] = useState("Blouse");
  const [measurementId, setMeasurementId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [status, setStatus] = useState<OrderStatus>("New");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showGarmentPicker, setShowGarmentPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  useEffect(() => {
    if (selectedCustomer?.id) {
      setCustomerId(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const selectedCustomerForForm = useMemo(
    () => customers.find((customer) => customer.id === customerId) || null,
    [customers, customerId]
  );

  const customerMeasurements = useMemo(
    () => (customerId ? measurements[customerId] || [] : []),
    [measurements, customerId]
  );

  const latestMeasurement = useMemo(
    () => getLatestMeasurement(customerMeasurements),
    [customerMeasurements]
  );

  useEffect(() => {
    if (!measurementId && latestMeasurement) {
      setMeasurementId(latestMeasurement.id);
    }

    if (
      measurementId &&
      !customerMeasurements.some(
        (measurement) => measurement.id === measurementId
      )
    ) {
      setMeasurementId(latestMeasurement?.id || "");
    }
  }, [customerMeasurements, latestMeasurement, measurementId]);

  const selectedMeasurement = useMemo(
    () =>
      customerMeasurements.find(
        (measurement) => measurement.id === measurementId
      ) || null,
    [customerMeasurements, measurementId]
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return orders;

    return orders.filter((order) => {
      const displayNumber = getOrderDisplayNumber(order).toLowerCase();
      const customerName = order.customerName?.toLowerCase() || "";
      const garment = order.item?.toLowerCase() || "";
      const orderStatus = normalizeStatus(order.status).toLowerCase();

      return (
        displayNumber.includes(query) ||
        customerName.includes(query) ||
        garment.includes(query) ||
        orderStatus.includes(query)
      );
    });
  }, [orders, search]);

  const totalOrders = orders.length;
  const activeOrders = orders.filter(
    (order) => normalizeStatus(order.status) !== "Delivered"
  ).length;
  const readyOrders = orders.filter(
    (order) => normalizeStatus(order.status) === "Ready"
  ).length;

  function resetCreateForm() {
    setCustomerId(selectedCustomer?.id || customers[0]?.id || "");
    setItem("Blouse");
    setMeasurementId("");
    setQuantity("1");
    setPrice("");
    setDeliveryDate("");
    setStatus("New");
    setNotes("");
    setShowCustomerPicker(false);
    setShowGarmentPicker(false);
    setShowStatusPicker(false);
  }

  function openCreateModal() {
    resetCreateForm();

    const defaultCustomer = selectedCustomer?.id || customers[0]?.id || "";
    const defaultMeasurements = measurements[defaultCustomer] || [];
    const latest = getLatestMeasurement(defaultMeasurements);

    setCustomerId(defaultCustomer);
    setMeasurementId(latest?.id || "");
    setShowCreateModal(true);
  }

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);

    const nextMeasurements = measurements[nextCustomerId] || [];
    const latest = getLatestMeasurement(nextMeasurements);

    setMeasurementId(latest?.id || "");
    setShowCustomerPicker(false);
  }

  async function handleCreate() {
    if (!customerId) {
      Alert.alert("Customer Required", "Please select a customer.");
      return;
    }

    if (!item.trim()) {
      Alert.alert("Garment Required", "Please select a garment.");
      return;
    }

    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      Alert.alert("Invalid Quantity", "Quantity must be at least 1.");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      Alert.alert("Invalid Price", "Please enter a valid price.");
      return;
    }

    if (!deliveryDate.trim()) {
      Alert.alert("Delivery Date Required", "Please enter a delivery date.");
      return;
    }

    if (!selectedCustomerForForm) {
      Alert.alert("Customer Required", "Selected customer was not found.");
      return;
    }

    const measurement =
      customerMeasurements.find(
        (entry) => entry.id === measurementId
      ) || latestMeasurement;

    const now = new Date();
    const orderDate = [
      String(now.getDate()).padStart(2, "0"),
      String(now.getMonth() + 1).padStart(2, "0"),
      now.getFullYear(),
    ].join("/");

    const newOrder: Order = {
      id: `order-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      orderNumber: `ORD-${String(Date.now()).slice(-6)}`,
      customerId: selectedCustomerForForm.id,
      customerName: selectedCustomerForForm.name,
      item: item.trim(),
      measurementId: measurement?.id || "",
      measurementUsed: measurement
        ? `${measurement.type || "Saved measurement"} • ${getMeasurementDateValue(
            measurement.date
          )}`
        : "No measurement selected",
      measurementSnapshot: createSnapshot(measurement),
      quantity: parsedQuantity,
      price: parsedPrice,
      orderDate,
      deliveryDate: deliveryDate.trim(),
      status: normalizeStatus(status),
      notes: notes.trim(),
    };

    try {
      setSaving(true);
      const savedOrder = await onCreateOrder(newOrder);

      setShowCreateModal(false);
      resetCreateForm();
      setSelectedOrder(savedOrder);

      Alert.alert(
        "Order Created",
        `${getOrderDisplayNumber(savedOrder)} has been created successfully.`
      );
    } catch {
      // App.tsx handles the detailed Supabase error.
    } finally {
      setSaving(false);
    }
  }

  async function updateOrderStatus(nextStatus: OrderStatus) {
    if (!selectedOrder) return;

    const updatedOrder: Order = {
      ...selectedOrder,
      status: normalizeStatus(nextStatus),
    };

    try {
      setSaving(true);
      const savedOrder = await onUpdateOrder(updatedOrder);
      setSelectedOrder(savedOrder);
    } catch {
      // App.tsx handles the error.
    } finally {
      setSaving(false);
    }
  }

  function openOrderDetails(order: Order) {
    setSelectedOrder(order);
  }

  function closeOrderDetails() {
    if (!saving) {
      setSelectedOrder(null);
    }
  }

  function renderStatusTimeline(order: Order) {
    const current = normalizeStatus(order.status);
    const currentIndex = WORKFLOW_STATUSES.indexOf(current);

    return (
      <View style={styles.timeline}>
        {WORKFLOW_STATUSES.map((step, index) => {
          const completed = currentIndex >= index;
          const active = current === step;

          return (
            <View key={step} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View
                  style={[
                    styles.timelineDot,
                    completed && styles.timelineDotCompleted,
                    active && styles.timelineDotActive,
                  ]}
                >
                  {completed ? (
                    <Text style={styles.timelineCheck}>✓</Text>
                  ) : null}
                </View>

                {index < WORKFLOW_STATUSES.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      currentIndex > index && styles.timelineLineCompleted,
                    ]}
                  />
                )}
              </View>

              <View style={styles.timelineContent}>
                <Text
                  style={[
                    styles.timelineTitle,
                    active && styles.timelineTitleActive,
                  ]}
                >
                  {step}
                </Text>

                <Text style={styles.timelineDescription}>
                  {getStatusDescription(step)}
                </Text>

                {active && (
                  <View style={styles.currentStatusLabel}>
                    <Text style={styles.currentStatusLabelText}>
                      Current status
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  function renderMeasurementSnapshot(snapshot: MeasurementSnapshot | null) {
    if (!snapshot) {
      return (
        <View style={styles.emptyMeasurement}>
          <Text style={styles.emptyMeasurementIcon}>📏</Text>
          <Text style={styles.emptyMeasurementTitle}>
            No measurement snapshot
          </Text>
          <Text style={styles.emptyMeasurementText}>
            This order was created without a saved measurement.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.measurementCard}>
        <View style={styles.measurementHeader}>
          <View>
            <Text style={styles.measurementTitle}>
              {snapshot.type || "Saved Measurement"}
            </Text>
            <Text style={styles.measurementDate}>
              {getMeasurementDateValue(snapshot.date)}
            </Text>
          </View>

          <View style={styles.snapshotBadge}>
            <Text style={styles.snapshotBadgeText}>Snapshot</Text>
          </View>
        </View>

        <View style={styles.measurementGrid}>
          <MeasurementValue label="Bust" value={snapshot.bust} />
          <MeasurementValue label="Waist" value={snapshot.waist} />
          <MeasurementValue label="Hip" value={snapshot.hip} />
          <MeasurementValue label="Shoulder" value={snapshot.shoulder} />
          <MeasurementValue
            label="Sleeve"
            value={snapshot.sleeveLength}
          />
          <MeasurementValue
            label="Blouse"
            value={snapshot.blouseLength}
          />
          <MeasurementValue
            label="Front Neck"
            value={snapshot.frontNeck}
          />
          <MeasurementValue label="Back Neck" value={snapshot.backNeck} />
          <MeasurementValue label="Armhole" value={snapshot.armhole} />
          <MeasurementValue
            label="Pant Length"
            value={snapshot.pantLength}
          />
        </View>

        {!!snapshot.notes && (
          <View style={styles.measurementNotes}>
            <Text style={styles.measurementNotesLabel}>Notes</Text>
            <Text style={styles.measurementNotesText}>
              {snapshot.notes}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={onBack} style={styles.headerBack}>
            <Text style={styles.headerBackText}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Orders</Text>
            <Text style={styles.headerSubtitle}>
              New → Measurement → Cutting → Stitching → Trial → Ready → Delivered
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newOrderButton}
            onPress={openCreateModal}
            activeOpacity={0.85}
          >
            <Text style={styles.newOrderButtonText}>＋</Text>
            <Text style={styles.newOrderButtonLabel}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SUMMARY */}
      <View style={styles.summaryRow}>
        <SummaryPill label="Total" value={String(totalOrders)} />
        <SummaryPill label="Active" value={String(activeOrders)} />
        <SummaryPill label="Ready" value={String(readyOrders)} />
      </View>

      {/* SEARCH */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search order, customer, garment..."
          placeholderTextColor="#A59BA1"
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={styles.clearSearch}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ORDER LIST */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>🧵</Text>
            </View>

            <Text style={styles.emptyTitle}>
              {search ? "No orders found" : "No orders yet"}
            </Text>

            <Text style={styles.emptyText}>
              {search
                ? "Try a different search term."
                : "Create your first tailoring order to start tracking work."}
            </Text>

            {!search && (
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={openCreateModal}
              >
                <Text style={styles.emptyActionText}>Create First Order</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredOrders.map((order, index) => {
            const total = Number(order.price || 0) * Number(order.quantity || 0);
            const normalized = normalizeStatus(order.status);
            const statusColors = getStatusStyle(normalized);

            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => openOrderDetails(order)}
                activeOpacity={0.88}
              >
                <View style={styles.orderCardTop}>
                  <View style={styles.orderNumberBlock}>
                    <Text style={styles.orderNumber}>
                      {getOrderDisplayNumber(order, index)}
                    </Text>
                    <Text style={styles.orderCustomer}>
                      {order.customerName || "Customer"}
                    </Text>
                  </View>

                  <StatusBadge status={normalized} />
                </View>

                <View style={styles.orderDivider} />

                <View style={styles.orderMainRow}>
                  <View style={styles.garmentIcon}>
                    <Text style={styles.garmentIconText}>✂</Text>
                  </View>

                  <View style={styles.orderInfo}>
                    <Text style={styles.orderItem}>{order.item}</Text>
                    <Text style={styles.orderMeta}>
                      Qty {order.quantity || 1} • Delivery {order.deliveryDate}
                    </Text>
                  </View>

                  <View style={styles.orderPriceBlock}>
                    <Text style={styles.orderTotal}>
                      {formatCurrency(total)}
                    </Text>
                    <Text style={styles.orderUnitPrice}>
                      {formatCurrency(order.price)} / item
                    </Text>
                  </View>
                </View>

                <View style={styles.orderFooter}>
                  <View style={styles.measurementIndicator}>
                    <Text style={styles.measurementIndicatorIcon}>
                      {order.measurementSnapshot ? "📏" : "○"}
                    </Text>
                    <Text
                      style={[
                        styles.measurementIndicatorText,
                        !order.measurementSnapshot &&
                          styles.measurementIndicatorMuted,
                      ]}
                    >
                      {order.measurementSnapshot
                        ? "Measurement saved"
                        : "No measurement"}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.orderStatusHint,
                      { color: statusColors.textColor },
                    ]}
                  >
                    {normalized} →
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* CREATE ORDER MODAL */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!saving) setShowCreateModal(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create New Order</Text>
                <Text style={styles.modalSubtitle}>
                  Add tailoring details and delivery information
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                disabled={saving}
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FieldLabel>Customer *</FieldLabel>

              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowCustomerPicker((value) => !value)}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.selectInputText,
                    !selectedCustomerForForm &&
                      styles.selectInputPlaceholder,
                  ]}
                >
                  {selectedCustomerForForm?.name || "Select customer"}
                </Text>
                <Text style={styles.selectArrow}>
                  {showCustomerPicker ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {showCustomerPicker && (
                <View style={styles.pickerPanel}>
                  {customers.length === 0 ? (
                    <Text style={styles.pickerEmpty}>
                      No customers available.
                    </Text>
                  ) : (
                    customers.map((customer) => (
                      <TouchableOpacity
                        key={customer.id}
                        style={styles.pickerOption}
                        onPress={() => handleCustomerChange(customer.id)}
                      >
                        <View>
                          <Text style={styles.pickerOptionTitle}>
                            {customer.name}
                          </Text>
                          <Text style={styles.pickerOptionSub}>
                            {customer.phone || "No phone"}
                          </Text>
                        </View>

                        {customer.id === customerId && (
                          <Text style={styles.pickerCheck}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              <FieldLabel>Garment *</FieldLabel>

              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowGarmentPicker((value) => !value)}
                disabled={saving}
              >
                <Text style={styles.selectInputText}>{item}</Text>
                <Text style={styles.selectArrow}>
                  {showGarmentPicker ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {showGarmentPicker && (
                <View style={styles.pickerPanel}>
                  {GARMENT_TYPES.map((garment) => (
                    <TouchableOpacity
                      key={garment}
                      style={styles.pickerOption}
                      onPress={() => {
                        setItem(garment);
                        setShowGarmentPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionTitle}>{garment}</Text>
                      {item === garment && (
                        <Text style={styles.pickerCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <FieldLabel>Measurement</FieldLabel>

              {customerMeasurements.length === 0 ? (
                <View style={styles.noMeasurementBox}>
                  <Text style={styles.noMeasurementTitle}>
                    No saved measurement
                  </Text>
                  <Text style={styles.noMeasurementText}>
                    You can create the order now and add measurements later.
                  </Text>
                </View>
              ) : (
                <View style={styles.measurementSelectList}>
                  {customerMeasurements.map((measurement) => {
                    const active = measurement.id === measurementId;

                    return (
                      <TouchableOpacity
                        key={measurement.id}
                        style={[
                          styles.measurementOption,
                          active && styles.measurementOptionActive,
                        ]}
                        onPress={() => setMeasurementId(measurement.id)}
                      >
                        <View style={styles.measurementOptionRadio}>
                          {active && (
                            <View style={styles.measurementOptionRadioInner} />
                          )}
                        </View>

                        <View style={styles.measurementOptionInfo}>
                          <Text style={styles.measurementOptionTitle}>
                            {measurement.type || "Measurement"}
                          </Text>
                          <Text style={styles.measurementOptionDate}>
                            {getMeasurementDateValue(measurement.date)}
                          </Text>
                        </View>

                        {measurement.id === latestMeasurement?.id && (
                          <View style={styles.latestBadge}>
                            <Text style={styles.latestBadgeText}>Latest</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={styles.formTwoColumns}>
                <View style={styles.formColumn}>
                  <FieldLabel>Quantity *</FieldLabel>
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="number-pad"
                    style={styles.textInput}
                    placeholder="1"
                    placeholderTextColor="#A59BA1"
                    editable={!saving}
                  />
                </View>

                <View style={styles.formColumn}>
                  <FieldLabel>Price / item *</FieldLabel>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor="#A59BA1"
                    editable={!saving}
                  />
                </View>
              </View>

              <View style={styles.formTwoColumns}>
                <View style={styles.formColumn}>
                  <FieldLabel>Delivery Date *</FieldLabel>
                  <TextInput
                    value={deliveryDate}
                    onChangeText={setDeliveryDate}
                    style={styles.textInput}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#A59BA1"
                    editable={!saving}
                  />
                </View>

                <View style={styles.formColumn}>
                  <FieldLabel>Initial Status</FieldLabel>

                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() =>
                      setShowStatusPicker((value) => !value)
                    }
                    disabled={saving}
                  >
                    <Text style={styles.selectInputText}>{status}</Text>
                    <Text style={styles.selectArrow}>
                      {showStatusPicker ? "▲" : "▼"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showStatusPicker && (
                <View style={styles.pickerPanel}>
                  {WORKFLOW_STATUSES.map((workflowStatus) => (
                    <TouchableOpacity
                      key={workflowStatus}
                      style={styles.pickerOption}
                      onPress={() => {
                        setStatus(workflowStatus);
                        setShowStatusPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionTitle}>
                        {workflowStatus}
                      </Text>
                      {status === workflowStatus && (
                        <Text style={styles.pickerCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <FieldLabel>Notes</FieldLabel>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                style={[styles.textInput, styles.notesInput]}
                placeholder="Special instructions..."
                placeholderTextColor="#A59BA1"
                multiline
                textAlignVertical="top"
                editable={!saving}
              />

              {Number(price) > 0 && Number(quantity) > 0 && (
                <View style={styles.totalPreview}>
                  <Text style={styles.totalPreviewLabel}>Order Total</Text>
                  <Text style={styles.totalPreviewValue}>
                    {formatCurrency(Number(price) * Number(quantity))}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.createButton,
                  saving && styles.createButtonDisabled,
                ]}
                onPress={handleCreate}
                disabled={saving}
                activeOpacity={0.88}
              >
                <Text style={styles.createButtonText}>
                  {saving ? "Saving..." : "Create Order"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ORDER DETAILS MODAL */}
      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={closeOrderDetails}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsCard}>
            {selectedOrder && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>
                      {getOrderDisplayNumber(selectedOrder)}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedOrder.customerName}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={closeOrderDetails}
                    disabled={saving}
                    style={styles.modalClose}
                  >
                    <Text style={styles.modalCloseText}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={styles.detailsContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.detailsHero}>
                    <View style={styles.detailsHeroIcon}>
                      <Text style={styles.detailsHeroIconText}>✂</Text>
                    </View>

                    <View style={styles.detailsHeroInfo}>
                      <Text style={styles.detailsHeroItem}>
                        {selectedOrder.item}
                      </Text>
                      <Text style={styles.detailsHeroMeta}>
                        Qty {selectedOrder.quantity || 1} •{" "}
                        {formatCurrency(selectedOrder.price)} / item
                      </Text>
                    </View>

                    <StatusBadge status={selectedOrder.status} />
                  </View>

                  <View style={styles.detailsSummary}>
                    <View style={styles.detailsSummaryCell}>
                      <Text style={styles.detailsSummaryLabel}>Total</Text>
                      <Text style={styles.detailsSummaryValue}>
                        {formatCurrency(
                          Number(selectedOrder.price || 0) *
                            Number(selectedOrder.quantity || 0)
                        )}
                      </Text>
                    </View>

                    <View style={styles.detailsSummaryDivider} />

                    <View style={styles.detailsSummaryCell}>
                      <Text style={styles.detailsSummaryLabel}>Ordered</Text>
                      <Text style={styles.detailsSummaryValue}>
                        {selectedOrder.orderDate || "—"}
                      </Text>
                    </View>

                    <View style={styles.detailsSummaryDivider} />

                    <View style={styles.detailsSummaryCell}>
                      <Text style={styles.detailsSummaryLabel}>Delivery</Text>
                      <Text style={styles.detailsSummaryValue}>
                        {selectedOrder.deliveryDate || "—"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Status</Text>

                    <View style={styles.statusUpdatePanel}>
                      <Text style={styles.statusUpdateLabel}>
                        Update current status
                      </Text>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.statusChips}
                      >
                        {WORKFLOW_STATUSES.map((workflowStatus) => {
                          const active =
                            normalizeStatus(selectedOrder.status) ===
                            workflowStatus;

                          return (
                            <TouchableOpacity
                              key={workflowStatus}
                              style={[
                                styles.statusChip,
                                active && styles.statusChipActive,
                              ]}
                              onPress={() =>
                                updateOrderStatus(workflowStatus)
                              }
                              disabled={saving}
                            >
                              <Text
                                style={[
                                  styles.statusChipText,
                                  active && styles.statusChipTextActive,
                                ]}
                              >
                                {workflowStatus}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>

                    {renderStatusTimeline(selectedOrder)}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      Measurement Snapshot
                    </Text>

                    {renderMeasurementSnapshot(
                      selectedOrder.measurementSnapshot
                    )}
                  </View>

                  {!!selectedOrder.measurementUsed && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        Measurement Used
                      </Text>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoBoxText}>
                          {selectedOrder.measurementUsed}
                        </Text>
                      </View>
                    </View>
                  )}

                  {!!selectedOrder.notes && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Notes</Text>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoBoxText}>
                          {selectedOrder.notes}
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.closeDetailsButton}
                    onPress={closeOrderDetails}
                    disabled={saving}
                  >
                    <Text style={styles.closeDetailsButtonText}>
                      Close
                    </Text>
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
   STYLES
------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND.cream,
  },

  header: {
    backgroundColor: BRAND.wine,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginRight: 10,
  },

  headerBackText: {
    color: BRAND.white,
    fontSize: 24,
    fontWeight: "500",
  },

  headerTextBlock: {
    flex: 1,
    paddingRight: 8,
  },

  headerTitle: {
    color: BRAND.white,
    fontSize: 25,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  newOrderButton: {
    minWidth: 62,
    height: 44,
    borderRadius: 13,
    backgroundColor: BRAND.gold,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 10,
  },

  newOrderButtonText: {
    color: BRAND.white,
    fontSize: 21,
    fontWeight: "600",
    marginRight: 2,
  },

  newOrderButtonLabel: {
    color: BRAND.white,
    fontSize: 13,
    fontWeight: "800",
  },

  summaryRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  summaryPill: {
    flex: 1,
    backgroundColor: BRAND.white,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BRAND.border,
  },

  summaryPillValue: {
    color: BRAND.wine,
    fontSize: 19,
    fontWeight: "800",
  },

  summaryPillLabel: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 2,
  },

  searchWrap: {
    marginHorizontal: 16,
    marginTop: 13,
    marginBottom: 4,
    height: 48,
    borderRadius: 14,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },

  searchIcon: {
    fontSize: 22,
    color: BRAND.wine,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    color: BRAND.dark,
    fontSize: 14,
  },

  clearSearch: {
    color: BRAND.muted,
    fontSize: 25,
    paddingLeft: 8,
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  orderCard: {
    backgroundColor: BRAND.white,
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  orderCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  orderNumberBlock: {
    flex: 1,
  },

  orderNumber: {
    color: BRAND.wine,
    fontSize: 14,
    fontWeight: "800",
  },

  orderCustomer: {
    color: BRAND.dark,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  orderDivider: {
    height: 1,
    backgroundColor: "#F0E8EC",
    marginVertical: 12,
  },

  orderMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  garmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: BRAND.softPink,
    alignItems: "center",
    justifyContent: "center",
  },

  garmentIconText: {
    color: BRAND.wine,
    fontSize: 21,
  },

  orderInfo: {
    flex: 1,
    paddingHorizontal: 11,
  },

  orderItem: {
    color: BRAND.dark,
    fontSize: 15,
    fontWeight: "800",
  },

  orderMeta: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 4,
  },

  orderPriceBlock: {
    alignItems: "flex-end",
  },

  orderTotal: {
    color: BRAND.wine,
    fontSize: 15,
    fontWeight: "800",
  },

  orderUnitPrice: {
    color: BRAND.muted,
    fontSize: 9,
    marginTop: 3,
  },

  orderFooter: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  measurementIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },

  measurementIndicatorIcon: {
    fontSize: 13,
    marginRight: 5,
  },

  measurementIndicatorText: {
    color: BRAND.green,
    fontSize: 10,
    fontWeight: "700",
  },

  measurementIndicatorMuted: {
    color: BRAND.muted,
  },

  orderStatusHint: {
    fontSize: 10,
    fontWeight: "800",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 75,
  },

  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: BRAND.softPink,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    fontSize: 30,
  },

  emptyTitle: {
    color: BRAND.dark,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 16,
  },

  emptyText: {
    color: BRAND.muted,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },

  emptyAction: {
    marginTop: 18,
    backgroundColor: BRAND.wine,
    borderRadius: 12,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },

  emptyActionText: {
    color: BRAND.white,
    fontSize: 13,
    fontWeight: "800",
  },

  /* MODALS */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30,20,25,0.48)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: BRAND.cream,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "94%",
    paddingTop: 18,
  },

  detailsCard: {
    backgroundColor: BRAND.cream,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "94%",
    minHeight: "72%",
    paddingTop: 18,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingBottom: 12,
  },

  modalTitle: {
    color: BRAND.dark,
    fontSize: 21,
    fontWeight: "800",
  },

  modalSubtitle: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1E8EC",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  modalCloseText: {
    color: BRAND.dark,
    fontSize: 24,
    lineHeight: 25,
  },

  formContent: {
    paddingHorizontal: 18,
    paddingBottom: 35,
  },

  fieldLabel: {
    color: BRAND.dark,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 7,
  },

  textInput: {
    height: 47,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    color: BRAND.dark,
    fontSize: 13,
  },

  notesInput: {
    height: 90,
    paddingTop: 12,
  },

  selectInput: {
    minHeight: 47,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectInputText: {
    color: BRAND.dark,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },

  selectInputPlaceholder: {
    color: "#A59BA1",
    fontWeight: "400",
  },

  selectArrow: {
    color: BRAND.wine,
    fontSize: 10,
    marginLeft: 8,
  },

  pickerPanel: {
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 12,
    marginTop: 6,
    overflow: "hidden",
  },

  pickerOption: {
    minHeight: 47,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F2E9ED",
  },

  pickerOptionTitle: {
    color: BRAND.dark,
    fontSize: 13,
    fontWeight: "700",
  },

  pickerOptionSub: {
    color: BRAND.muted,
    fontSize: 10,
    marginTop: 2,
  },

  pickerCheck: {
    color: BRAND.wine,
    fontSize: 18,
    fontWeight: "800",
  },

  pickerEmpty: {
    color: BRAND.muted,
    padding: 15,
    fontSize: 12,
  },

  formTwoColumns: {
    flexDirection: "row",
    gap: 10,
  },

  formColumn: {
    flex: 1,
  },

  noMeasurementBox: {
    backgroundColor: "#FFF4E2",
    borderWidth: 1,
    borderColor: "#F0D9AA",
    borderRadius: 12,
    padding: 13,
  },

  noMeasurementTitle: {
    color: "#8A5B0A",
    fontSize: 12,
    fontWeight: "800",
  },

  noMeasurementText: {
    color: "#8A6D39",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  measurementSelectList: {
    gap: 7,
  },

  measurementOption: {
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  measurementOptionActive: {
    borderColor: BRAND.magenta,
    backgroundColor: "#FFF4F8",
  },

  measurementOptionRadio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBBBC2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  measurementOptionRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: BRAND.magenta,
  },

  measurementOptionInfo: {
    flex: 1,
  },

  measurementOptionTitle: {
    color: BRAND.dark,
    fontSize: 12,
    fontWeight: "800",
  },

  measurementOptionDate: {
    color: BRAND.muted,
    fontSize: 10,
    marginTop: 3,
  },

  latestBadge: {
    backgroundColor: BRAND.softPink,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  latestBadgeText: {
    color: BRAND.magenta,
    fontSize: 9,
    fontWeight: "800",
  },

  totalPreview: {
    marginTop: 15,
    borderRadius: 14,
    backgroundColor: BRAND.softPink,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  totalPreviewLabel: {
    color: BRAND.dark,
    fontSize: 12,
    fontWeight: "700",
  },

  totalPreviewValue: {
    color: BRAND.wine,
    fontSize: 19,
    fontWeight: "900",
  },

  createButton: {
    marginTop: 18,
    height: 50,
    borderRadius: 14,
    backgroundColor: BRAND.wine,
    alignItems: "center",
    justifyContent: "center",
  },

  createButtonDisabled: {
    opacity: 0.55,
  },

  createButtonText: {
    color: BRAND.white,
    fontSize: 14,
    fontWeight: "800",
  },

  cancelButton: {
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  cancelButtonText: {
    color: BRAND.muted,
    fontSize: 13,
    fontWeight: "700",
  },

  /* DETAILS */

  detailsContent: {
    paddingHorizontal: 18,
    paddingBottom: 35,
  },

  detailsHero: {
    backgroundColor: BRAND.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  detailsHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: BRAND.softPink,
    alignItems: "center",
    justifyContent: "center",
  },

  detailsHeroIconText: {
    color: BRAND.wine,
    fontSize: 23,
  },

  detailsHeroInfo: {
    flex: 1,
    paddingHorizontal: 10,
  },

  detailsHeroItem: {
    color: BRAND.dark,
    fontSize: 16,
    fontWeight: "800",
  },

  detailsHeroMeta: {
    color: BRAND.muted,
    fontSize: 10,
    marginTop: 4,
  },

  detailsSummary: {
    marginTop: 10,
    backgroundColor: BRAND.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingVertical: 12,
    flexDirection: "row",
  },

  detailsSummaryCell: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },

  detailsSummaryLabel: {
    color: BRAND.muted,
    fontSize: 9,
    fontWeight: "600",
  },

  detailsSummaryValue: {
    color: BRAND.dark,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center",
  },

  detailsSummaryDivider: {
    width: 1,
    backgroundColor: "#EDE4E8",
  },

  section: {
    marginTop: 18,
  },

  sectionTitle: {
    color: BRAND.dark,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 9,
  },

  statusUpdatePanel: {
    backgroundColor: BRAND.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 12,
  },

  statusUpdateLabel: {
    color: BRAND.muted,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 9,
  },

  statusChips: {
    gap: 7,
    paddingRight: 10,
  },

  statusChip: {
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: "#FAF7F8",
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  statusChipActive: {
    borderColor: BRAND.wine,
    backgroundColor: BRAND.wine,
  },

  statusChipText: {
    color: BRAND.dark,
    fontSize: 10,
    fontWeight: "700",
  },

  statusChipTextActive: {
    color: BRAND.white,
  },

  timeline: {
    marginTop: 14,
    backgroundColor: BRAND.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 14,
  },

  timelineRow: {
    flexDirection: "row",
    minHeight: 64,
  },

  timelineRail: {
    width: 28,
    alignItems: "center",
  },

  timelineDot: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D9CDD2",
    backgroundColor: BRAND.white,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  timelineDotCompleted: {
    borderColor: BRAND.wine,
    backgroundColor: BRAND.wine,
  },

  timelineDotActive: {
    borderColor: BRAND.gold,
  },

  timelineCheck: {
    color: BRAND.white,
    fontSize: 10,
    fontWeight: "900",
  },

  timelineLine: {
    position: "absolute",
    top: 20,
    bottom: 0,
    width: 2,
    backgroundColor: "#E8DDE1",
  },

  timelineLineCompleted: {
    backgroundColor: BRAND.wine,
  },

  timelineContent: {
    flex: 1,
    paddingLeft: 9,
    paddingBottom: 13,
  },

  timelineTitle: {
    color: BRAND.dark,
    fontSize: 12,
    fontWeight: "800",
  },

  timelineTitleActive: {
    color: BRAND.wine,
  },

  timelineDescription: {
    color: BRAND.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },

  currentStatusLabel: {
    alignSelf: "flex-start",
    backgroundColor: BRAND.softPink,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 5,
  },

  currentStatusLabelText: {
    color: BRAND.magenta,
    fontSize: 8,
    fontWeight: "800",
  },

  measurementCard: {
    backgroundColor: BRAND.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 13,
  },

  measurementHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E7EA",
  },

  measurementTitle: {
    color: BRAND.dark,
    fontSize: 13,
    fontWeight: "800",
  },

  measurementDate: {
    color: BRAND.muted,
    fontSize: 10,
    marginTop: 3,
  },

  snapshotBadge: {
    backgroundColor: "#EAF4ED",
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  snapshotBadgeText: {
    color: BRAND.green,
    fontSize: 8,
    fontWeight: "800",
  },

  measurementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: 8,
  },

  measurementValue: {
    width: "25%",
    marginBottom: 10,
  },

  measurementLabel: {
    color: BRAND.muted,
    fontSize: 8,
  },

  measurementNumber: {
    color: BRAND.dark,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },

  measurementNotes: {
    marginTop: 4,
    backgroundColor: "#FAF6F8",
    borderRadius: 10,
    padding: 9,
  },

  measurementNotesLabel: {
    color: BRAND.wine,
    fontSize: 9,
    fontWeight: "800",
  },

  measurementNotesText: {
    color: BRAND.dark,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  emptyMeasurement: {
    backgroundColor: BRAND.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 20,
    alignItems: "center",
  },

  emptyMeasurementIcon: {
    fontSize: 25,
  },

  emptyMeasurementTitle: {
    color: BRAND.dark,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 7,
  },

  emptyMeasurementText: {
    color: BRAND.muted,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 15,
    marginTop: 4,
  },

  infoBox: {
    backgroundColor: BRAND.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 12,
  },

  infoBoxText: {
    color: BRAND.dark,
    fontSize: 12,
    lineHeight: 18,
  },

  closeDetailsButton: {
    marginTop: 20,
    height: 47,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BRAND.wine,
    alignItems: "center",
    justifyContent: "center",
  },

  closeDetailsButtonText: {
    color: BRAND.wine,
    fontSize: 13,
    fontWeight: "800",
  },
});
