import React, { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { Measurement } from "./measurements/MeasurementsScreen";
import type { Order, OrderStatus } from "./OrdersScreen";
import type { Bill, Payment } from "../lib/billService";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  orders: number;
};

type CustomersScreenProps = {
  customers: Customer[];
  measurements: Record<string, Measurement[]>;
  orders: Order[];
  bills: Bill[];
  payments: Payment[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onOpenMeasurements: (customer: Customer) => void;
  onOpenOrders: (customer: Customer) => void;
  onOpenBilling: (customer: Customer) => void;
  onAddPayment: (customer: Customer) => void;
};

type CustomerFilter = "All" | "Active" | "Due" | "No Orders";

type CustomerStats = {
  orders: number;
  activeOrders: number;
  completedOrders: number;
  bills: number;
  paid: number;
  due: number;
  measurements: number;
  totalBilled: number;
  lastOrderDate: string;
  nextDeliveryDate: string;
  latestOrder: Order | null;
};

const STATUS_LIST: OrderStatus[] = [
  "New",
  "Measurement",
  "Cutting",
  "Stitching",
  "Trial",
  "Ready",
  "Delivered",
];

const ACTIVE_STATUSES: OrderStatus[] = [
  "New",
  "Measurement",
  "Cutting",
  "Stitching",
  "Trial",
  "Ready",
];

const pad2 = (value: number) => String(value).padStart(2, "0");

const localToday = () => {
  const date = new Date();

  return `${date.getFullYear()}-${pad2(
    date.getMonth() + 1
  )}-${pad2(date.getDate())}`;
};

const normalizeDate = (value?: string) => {
  if (!value) return "";

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split("/").map(Number);

    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  return trimmed;
};

const parseDateOnly = (value?: string) => {
  const normalized = normalizeDate(value);

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

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
};

const dateLabel = (value?: string) => {
  if (!value) return "-";

  const date = parseDateOnly(value);

  if (!date) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (value: number) => {
  return "Rs. " + Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const getOrderTotal = (order: Order) => {
  return Number(order.price || 0) * Number(order.quantity || 0);
};

const getStatusIndex = (status: OrderStatus) => {
  return STATUS_LIST.indexOf(status);
};

const getProgressPercent = (status: OrderStatus) => {
  const index = getStatusIndex(status);

  if (index < 0) return 0;

  return Math.round(((index + 1) / STATUS_LIST.length) * 100);
};

const getStatusLabel = (status: OrderStatus) => {
  return status;
};

const getStatusSymbol = (status: OrderStatus) => {
  switch (status) {
    case "New":
      return "•";
    case "Measurement":
      return "M";
    case "Cutting":
      return "C";
    case "Stitching":
      return "S";
    case "Trial":
      return "T";
    case "Ready":
      return "✓";
    case "Delivered":
      return "✓";
    default:
      return "•";
  }
};

const getDeliveryInfo = (order: Order) => {
  if (order.status === "Delivered") {
    return {
      label: "Delivered",
      tone: "success" as const,
    };
  }

  const deliveryDate = parseDateOnly(order.deliveryDate);

  if (!deliveryDate) {
    return {
      label: "No delivery date",
      tone: "neutral" as const,
    };
  }

  const todayDate = parseDateOnly(localToday());

  if (!todayDate) {
    return {
      label: dateLabel(order.deliveryDate),
      tone: "neutral" as const,
    };
  }

  const difference = Math.round(
    (deliveryDate.getTime() - todayDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (difference < 0) {
    return {
      label: `${Math.abs(difference)}d overdue`,
      tone: "danger" as const,
    };
  }

  if (difference === 0) {
    return {
      label: "Due today",
      tone: "warning" as const,
    };
  }

  if (difference === 1) {
    return {
      label: "Tomorrow",
      tone: "warning" as const,
    };
  }

  if (difference <= 7) {
    return {
      label: `Due in ${difference}d`,
      tone: "info" as const,
    };
  }

  return {
    label: dateLabel(order.deliveryDate),
    tone: "neutral" as const,
  };
};

const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

const getOrderSearchText = (order: Order) => {
  return [
    order.id,
    order.item,
    order.status,
    order.notes,
    order.orderDate,
    order.deliveryDate,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

const getBillSearchText = (bill: Bill) => {
  return [
    bill.id,
    bill.billNumber,
    bill.item,
    bill.status,
    bill.billDate,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

/*
  Payments do not contain customerId.

  Payment -> billId -> Bill -> customerId

  This helper keeps that relationship in one place.
*/
const getPaymentCustomerId = (
  payment: Payment,
  bills: Bill[]
) => {
  const bill = bills.find(
    (item) =>
      String(item.id) === String(payment.billId)
  );

  return bill?.customerId || "";
};

export default function CustomersScreen({
  customers,
  measurements,
  orders,
  bills,
  payments,
  onAddCustomer,
  onUpdateCustomer,
  onOpenMeasurements,
  onOpenOrders,
  onOpenBilling,
  onAddPayment,
}: CustomersScreenProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<CustomerFilter>("All");
  const [refreshing, setRefreshing] = useState(false);

  const [showCustomerModal, setShowCustomerModal] =
    useState(false);

  const [showProfileModal, setShowProfileModal] =
    useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const customerStats = useMemo(() => {
    const map: Record<string, CustomerStats> = {};

    customers.forEach((customer) => {
      const customerOrders = orders.filter(
        (order) =>
          String(order.customerId) ===
          String(customer.id)
      );

      const customerBills = bills.filter(
        (bill) =>
          String(bill.customerId) ===
          String(customer.id)
      );

      const customerPayments = payments.filter(
        (payment) =>
          String(
            getPaymentCustomerId(payment, bills)
          ) === String(customer.id)
      );

      const customerMeasurements =
        measurements[customer.id] || [];

      const activeOrders = customerOrders.filter(
        (order) =>
          ACTIVE_STATUSES.includes(order.status)
      );

      const completedOrders =
        customerOrders.filter(
          (order) =>
            order.status === "Delivered"
        );

      const totalBilled =
        customerBills.reduce(
          (sum, bill) =>
            sum + Number(bill.total || 0),
          0
        );

      const paidFromBills =
        customerBills.reduce(
          (sum, bill) =>
            sum + Number(bill.paidAmount || 0),
          0
        );

      const paidFromPayments =
        customerPayments.reduce(
          (sum, payment) =>
            sum + Number(payment.amount || 0),
          0
        );

      const paid = Math.max(
        paidFromBills,
        paidFromPayments
      );

      const dueFromBills =
        customerBills.reduce(
          (sum, bill) =>
            sum + Number(bill.balance || 0),
          0
        );

      const due = Math.max(
        0,
        totalBilled - paid,
        dueFromBills
      );

      const sortedOrders =
        [...customerOrders].sort(
          (a, b) => {
            const dateA =
              parseDateOnly(
                a.orderDate
              )?.getTime() || 0;

            const dateB =
              parseDateOnly(
                b.orderDate
              )?.getTime() || 0;

            return dateB - dateA;
          }
        );

      const latestOrder =
        sortedOrders.length > 0
          ? sortedOrders[0]
          : null;

      const activeWithDelivery =
        activeOrders
          .filter((order) =>
            parseDateOnly(
              order.deliveryDate
            )
          )
          .sort((a, b) => {
            const dateA =
              parseDateOnly(
                a.deliveryDate
              )?.getTime() || 0;

            const dateB =
              parseDateOnly(
                b.deliveryDate
              )?.getTime() || 0;

            return dateA - dateB;
          });

      const lastOrderDate =
        latestOrder?.orderDate || "";

      const nextDeliveryDate =
        activeWithDelivery[0]
          ?.deliveryDate || "";

      return {
        orders: customerOrders.length,
        activeOrders: activeOrders.length,
        completedOrders:
          completedOrders.length,
        bills: customerBills.length,
        paid,
        due,
        measurements:
          customerMeasurements.length,
        totalBilled,
        lastOrderDate,
        nextDeliveryDate,
        latestOrder,
      };
    });

    return map;
  }, [
    customers,
    orders,
    bills,
    payments,
    measurements,
  ]);

  const overallStats = useMemo(() => {
    const totalDue =
      bills.reduce(
        (sum, bill) =>
          sum + Number(bill.balance || 0),
        0
      );

    const totalPaid =
      bills.reduce(
        (sum, bill) =>
          sum + Number(bill.paidAmount || 0),
        0
      );

    const totalBilled =
      bills.reduce(
        (sum, bill) =>
          sum + Number(bill.total || 0),
        0
      );

    const activeOrders =
      orders.filter((order) =>
        ACTIVE_STATUSES.includes(
          order.status
        )
      ).length;

    const completedOrders =
      orders.filter(
        (order) =>
          order.status === "Delivered"
      ).length;

    const customersWithDue =
      customers.filter(
        (customer) =>
          Number(
            customerStats[
              customer.id
            ]?.due || 0
          ) > 0
      ).length;

    return {
      totalDue,
      totalPaid,
      totalBilled,
      activeOrders,
      completedOrders,
      customersWithDue,
    };
  }, [
    customers,
    orders,
    bills,
    customerStats,
  ]);

  const filteredCustomers = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return customers
      .filter((customer) => {
        const stats =
          customerStats[customer.id];

        if (filter === "Active") {
          return Boolean(
            stats?.activeOrders
          );
        }

        if (filter === "Due") {
          return (
            Number(stats?.due || 0) > 0
          );
        }

        if (filter === "No Orders") {
          return (
            Number(stats?.orders || 0) ===
            0
          );
        }

        return true;
      })
      .filter((customer) => {
        if (!query) return true;

        const customerText = [
          customer.name,
          customer.phone,
          customer.email,
          customer.address,
          customer.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const customerOrders =
          orders.filter(
            (order) =>
              String(
                order.customerId
              ) === String(customer.id)
          );

        const customerBills =
          bills.filter(
            (bill) =>
              String(
                bill.customerId
              ) === String(customer.id)
          );

        const orderText =
          customerOrders
            .map(getOrderSearchText)
            .join(" ");

        const billText =
          customerBills
            .map(getBillSearchText)
            .join(" ");

        return `${customerText} ${orderText} ${billText}`.includes(
          query
        );
      })
      .sort((a, b) => {
        const dateA =
          parseDateOnly(
            customerStats[a.id]
              ?.lastOrderDate
          )?.getTime() || 0;

        const dateB =
          parseDateOnly(
            customerStats[b.id]
              ?.lastOrderDate
          )?.getTime() || 0;

        if (dateA !== dateB) {
          return dateB - dateA;
        }

        return a.name.localeCompare(
          b.name
        );
      });
  }, [
    customers,
    search,
    filter,
    customerStats,
    orders,
    bills,
  ]);

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    setShowCustomerModal(true);
  };

  const openEditCustomer = (
    customer: Customer
  ) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email);
    setAddress(customer.address);
    setNotes(customer.notes);
    setShowCustomerModal(true);
  };

  const saveCustomer = () => {
    const cleanName =
      name.trim();

    const cleanPhone =
      phone.trim();
if (!cleanPhone) {
      Alert.alert(
        "Phone Required",
        "Please enter customer phone number."
      );
      return;
    }

    const customer: Customer = {
      id:
        editingCustomer?.id ||
        `CUS-${Date.now()
          .toString()
          .slice(-8)}`,

      name: cleanName,
      phone: cleanPhone,
      email: email.trim(),
      address: address.trim(),
      notes: notes.trim(),

      orders:
        editingCustomer?.orders || 0,
    };

    if (editingCustomer) {
      onUpdateCustomer(customer);
    } else {
      onAddCustomer(customer);
    }

    setShowCustomerModal(false);
  };

  const openProfile = (
    customer: Customer
  ) => {
    setSelectedCustomer(customer);
    setShowProfileModal(true);
  };

  const closeProfile = () => {
    setShowProfileModal(false);
  };

  const refreshCustomers = () => {
    setRefreshing(true);

    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  const selectedStats =
  selectedCustomer
    ? customerStats[selectedCustomer.id] ?? {
        orders: 0,
        activeOrders: 0,
        completedOrders: 0,
        bills: 0,
        paid: 0,
        due: 0,
        measurements: 0,
        totalBilled: 0,
        lastOrderDate: "",
        nextDeliveryDate: "",
        latestOrder: null,
      }
    : null;

  const selectedOrders =
    selectedCustomer
      ? orders
          .filter(
            (order) =>
              String(
                order.customerId
              ) ===
              String(
                selectedCustomer.id
              )
          )
          .sort((a, b) => {
            const dateA =
              parseDateOnly(
                a.orderDate
              )?.getTime() || 0;

            const dateB =
              parseDateOnly(
                b.orderDate
              )?.getTime() || 0;

            return dateB - dateA;
          })
      : [];

  const selectedBills =
    selectedCustomer
      ? bills
          .filter(
            (bill) =>
              String(
                bill.customerId
              ) ===
              String(
                selectedCustomer.id
              )
          )
          .sort((a, b) => {
            const dateA =
              parseDateOnly(
                a.billDate
              )?.getTime() || 0;

            const dateB =
              parseDateOnly(
                b.billDate
              )?.getTime() || 0;

            return dateB - dateA;
          })
      : [];

  /*
    Payment does not have customerId.

    Filter payment records using:
    payment.billId -> bill.id -> bill.customerId
  */
  const selectedPayments =
    selectedCustomer
      ? payments
          .filter(
            (payment) =>
              String(
                getPaymentCustomerId(
                  payment,
                  bills
                )
              ) ===
              String(
                selectedCustomer.id
              )
          )
          .sort((a, b) => {
            const dateA =
              parseDateOnly(
                a.paymentDate
              )?.getTime() || 0;

            const dateB =
              parseDateOnly(
                b.paymentDate
              )?.getTime() || 0;

            return dateB - dateA;
          })
      : [];

  const selectedMeasurements =
    selectedCustomer
      ? measurements[
          selectedCustomer.id
        ] || []
      : [];

  const getCustomerHealth = (
    stats: CustomerStats
  ) => {
    if (
      stats.due > 0 &&
      stats.activeOrders > 0
    ) {
      return {
        label: "Attention",
        symbol: "!",
        type: "warning" as const,
      };
    }

    if (stats.due > 0) {
      return {
        label: "Payment Due",
        symbol: "₹",
        type: "danger" as const,
      };
    }

    if (stats.activeOrders > 0) {
      return {
        label: "Active",
        symbol: "●",
        type: "info" as const,
      };
    }

    if (stats.orders > 0) {
      return {
        label: "Completed",
        symbol: "✓",
        type: "success" as const,
      };
    }

    return {
      label: "New",
      symbol: "+",
      type: "neutral" as const,
    };
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={
              refreshCustomers
            }
          />
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              CUSTOMER MANAGEMENT
            </Text>

            <Text style={styles.title}>
              Customers
            </Text>

            <Text style={styles.subtitle}>
              Track customers, orders,
              measurements and payments.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.85}
            onPress={
              openAddCustomer
            }
          >
            <Text
              style={
                styles.addButtonPlus
              }
            >
              +
            </Text>

            <Text
              style={
                styles.addButtonText
              }
            >
              Add Customer
            </Text>
          </TouchableOpacity>
        </View>

        {/* FINANCIAL SUMMARY */}
        <View style={styles.financeCard}>
          <View
            style={styles.financeHeader}
          >
            <View>
              <Text
                style={styles.financeTitle}
              >
                Financial Overview
              </Text>

              <Text
                style={
                  styles.financeSubtitle
                }
              >
                Billed vs collected
              </Text>
            </View>

            <Text
              style={styles.financeTotal}
            >
              {formatMoney(
                overallStats.totalBilled
              )}
            </Text>
          </View>

          <View style={styles.financeRow}>
            <View
              style={styles.financeItem}
            >
              <Text
                style={
                  styles.financeItemLabel
                }
              >
                Total Billed
              </Text>

              <Text
                style={
                  styles.financeItemValue
                }
              >
                {formatMoney(
                  overallStats.totalBilled
                )}
              </Text>
            </View>

            <View
              style={styles.financeDivider}
            />

            <View
              style={styles.financeItem}
            >
              <Text
                style={
                  styles.financeItemLabel
                }
              >
                Collected
              </Text>

              <Text
                style={[
                  styles.financeItemValue,
                  styles.paidText,
                ]}
              >
                {formatMoney(
                  overallStats.totalPaid
                )}
              </Text>
            </View>

            <View
              style={styles.financeDivider}
            />

            <View
              style={styles.financeItem}
            >
              <Text
                style={
                  styles.financeItemLabel
                }
              >
                Due
              </Text>

              <Text
                style={[
                  styles.financeItemValue,
                  styles.dueText,
                ]}
              >
                {formatMoney(
                  overallStats.totalDue
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* SEARCH */}
        <View
          style={
            styles.searchContainer
          }
        >
          <MaterialCommunityIcons
            name="magnify"
            size={23}
            color="#C2185B"
            style={{ marginRight: 8 }}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search customer, phone, order or bill..."
            placeholderTextColor="#A18D96"
            style={styles.searchInput}
          />

          {search.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                setSearch("")
              }
              style={
                styles.clearSearch
              }
            >
              <Text
                style={
                  styles.clearSearchText
                }
              >
                ×
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FILTERS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterRow
          }
        >
          {[
            "All",
            "Active",
            "Due",
            "No Orders",
          ].map((item) => {
            const active =
              filter === item;

            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.filterChip,
                  active &&
                    styles.filterChipActive,
                ]}
                onPress={() =>
                  setFilter(
                    item as CustomerFilter
                  )
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* LIST HEADER */}
        <View style={styles.listHeader}>
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Customer List
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {filteredCustomers.length}{" "}
              customer
              {filteredCustomers.length ===
              1
                ? ""
                : "s"}
              {filter !== "All"
                ? `• ${filter}`
                : ""}
            </Text>
          </View>
        </View>

        {/* CUSTOMER LIST */}
        {filteredCustomers.length ===
        0 ? (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={styles.emptyIcon}
            >
●‹
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              No customers found
            </Text>

            <Text
              style={styles.emptyText}
            >
              {search
                ? "Try a different search term."
                : filter !== "All"
                ? `There are no ${filter.toLowerCase()} customers.`
                : "Add your first customer to get started."}
            </Text>

            {!search &&
              filter === "All" && (
                <TouchableOpacity
                  style={
                    styles.emptyButton
                  }
                  onPress={
                    openAddCustomer
                  }
                >
                  <Text
                    style={
                      styles.emptyButtonText
                    }
                  >
                    + Add Customer
                  </Text>
                </TouchableOpacity>
              )}
          </View>
        ) : (
          filteredCustomers.map(
            (customer) => {
             const stats =
  customerStats[customer.id] ?? {
    orders: 0,
    activeOrders: 0,
    completedOrders: 0,
    bills: 0,
    paid: 0,
    due: 0,
    measurements: 0,
    totalBilled: 0,
    lastOrderDate: "",
    nextDeliveryDate: "",
    latestOrder: null,
  };

              const health =
                getCustomerHealth(
                  stats
                );

              const latestOrder =
                stats.latestOrder;

              const deliveryInfo =
                latestOrder
                  ? getDeliveryInfo(
                      latestOrder
                    )
                  : null;

              const progress =
                latestOrder
                  ? getProgressPercent(
                      latestOrder.status
                    )
                  : 0;

              return (
                <TouchableOpacity
                  key={customer.id}
                  style={
                    styles.customerCard
                  }
                  activeOpacity={0.92}
                  onPress={() =>
                    openProfile(
                      customer
                    )
                  }
                >
                  <View
                    style={
                      styles.customerTop
                    }
                  >
                    <View
                      style={
                        styles.avatar
                      }
                    >
                      <Text
                        style={
                          styles.avatarText
                        }
                      >
                        {getInitials(
                          customer.name
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.customerMain
                      }
                    >
                      <View
                        style={
                          styles.customerNameRow
                        }
                      >
                        <Text
                          style={
                            styles.customerName
                          }
                          numberOfLines={1}
                        >
                          {customer.name}
                        </Text>

                        <View
                          style={[
                            styles.healthBadge,
                            health.type ===
                              "danger" &&
                              styles.healthBadgeDanger,
                            health.type ===
                              "warning" &&
                              styles.healthBadgeWarning,
                            health.type ===
                              "info" &&
                              styles.healthBadgeInfo,
                            health.type ===
                              "success" &&
                              styles.healthBadgeSuccess,
                          ]}
                        >
                          <Text
                            style={[
                              styles.healthBadgeText,
                              health.type ===
                                "danger" &&
                                styles.healthBadgeTextDanger,
                              health.type ===
                                "warning" &&
                                styles.healthBadgeTextWarning,
                              health.type ===
                                "info" &&
                                styles.healthBadgeTextInfo,
                              health.type ===
                                "success" &&
                                styles.healthBadgeTextSuccess,
                            ]}
                          >
                            {
                              health.symbol
                            }{" "}
                            {
                              health.label
                            }
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.customerPhone
                        }
                      >
                        {customer.phone}
                      </Text>

                      {!!customer.email && (
                        <Text
                          style={
                            styles.customerEmail
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {
                            customer.email
                          }
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={
                        styles.editButton
                      }
                      onPress={() =>
                        openEditCustomer(
                          customer
                        )
                      }
                    >
                      <Text
                        style={
                          styles.editButtonText
                        }
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* CUSTOMER METRICS */}
                  <View
                    style={
                      styles.metricsRow
                    }
                  >
                    <View
                      style={
                        styles.metricBox
                      }
                    >
                      <Text
                        style={
                          styles.metricValue
                        }
                      >
                        {stats.orders}
                      </Text>

                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Orders
                      </Text>
                    </View>

                    <View
                      style={
                        styles.metricDivider
                      }
                    />

                    <View
                      style={
                        styles.metricBox
                      }
                    >
                      <Text
                        style={[
                          styles.metricValue,
                          stats.activeOrders >
                            0 &&
                            styles.activeMetric,
                        ]}
                      >
                        {
                          stats.activeOrders
                        }
                      </Text>

                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Active
                      </Text>
                    </View>

                    <View
                      style={
                        styles.metricDivider
                      }
                    />

                    <View
                      style={
                        styles.metricBox
                      }
                    >
                      <Text
                        style={
                          styles.metricValue
                        }
                      >
                        {
                          stats.measurements
                        }
                      </Text>

                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Measurements
                      </Text>
                    </View>

                    <View
                      style={
                        styles.metricDivider
                      }
                    />

                    <View
                      style={
                        styles.metricBox
                      }
                    >
                      <Text
                        style={[
                          styles.metricValue,
                          stats.due > 0 &&
                            styles.dueMetric,
                        ]}
                      >
                        {formatMoney(
                          stats?.due ?? 0
                        )}
                      </Text>

                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Due
                      </Text>
                    </View>
                  </View>

                  {/* LATEST ORDER */}
                  {latestOrder && (
                    <View
                      style={
                        styles.latestOrderBox
                      }
                    >
                      <View
                        style={
                          styles.latestOrderHeader
                        }
                      >
                        <Text
                          style={
                            styles.latestOrderTitle
                          }
                        >
                          Latest Order
                        </Text>

                        {deliveryInfo && (
                          <Text
                            style={[
                              styles.deliveryLabel,
                              deliveryInfo.tone ===
                                "danger" &&
                                styles.deliveryDanger,
                              deliveryInfo.tone ===
                                "warning" &&
                                styles.deliveryWarning,
                              deliveryInfo.tone ===
                                "success" &&
                                styles.deliverySuccess,
                              deliveryInfo.tone ===
                                "info" &&
                                styles.deliveryInfo,
                            ]}
                          >
                            {
                              deliveryInfo.label
                            }
                          </Text>
                        )}
                      </View>

                      <View
                        style={
                          styles.latestOrderRow
                        }
                      >
                        <View
                          style={
                            styles.latestOrderInfo
                          }
                        >
                          <Text
                            style={
                              styles.latestOrderItem
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {
                              latestOrder.item
                            }
                          </Text>

                          <Text
                            style={
                              styles.latestOrderMeta
                            }
                          >
                            {
                              latestOrder.status
                            }{" "}• Qty{" "}
                            {
                              latestOrder.quantity
                            }{" "}• {formatMoney(
                              getOrderTotal(
                                latestOrder
                              )
                            )}
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.latestOrderDate
                          }
                        >
                          {dateLabel(
                            latestOrder.deliveryDate
                          )}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.progressTrack
                        }
                      >
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${progress}%`,
                            },
                          ]}
                        />
                      </View>

                      <View
                        style={
                          styles.progressBottom
                        }
                      >
                        <Text
                          style={
                            styles.progressStatus
                          }
                        >
                          {getStatusSymbol(
                            latestOrder.status
                          )}{" "}
                          {getStatusLabel(
                            latestOrder.status
                          )}
                        </Text>

                        <Text
                          style={
                            styles.progressPercent
                          }
                        >
                          {progress}%
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* BOTTOM ACTIONS */}
                  <View
                    style={
                      styles.cardActions
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.cardAction
                      }
                      onPress={() =>
                        onOpenOrders(
                          customer
                        )
                      }
                    >
                      <Text
                        style={
                          styles.cardActionIcon
                        }
                      >OR</Text>

                      <Text
                        style={
                          styles.cardActionText
                        }
                      >
                        Orders
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.cardAction
                      }
                      onPress={() =>
                        onOpenMeasurements(
                          customer
                        )
                      }
                    >
                      <Text
                        style={
                          styles.cardActionIcon
                        }
                      >ME</Text>

                      <Text
                        style={
                          styles.cardActionText
                        }
                      >
                        Measurements
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.cardAction
                      }
                      onPress={() =>
                        onOpenBilling(
                          customer
                        )
                      }
                    >
                      <Text
                        style={
                          styles.cardActionIcon
                        }
                      >BI</Text>

                      <Text
                        style={
                          styles.cardActionText
                        }
                      >
                        Billing
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.cardAction
                      }
                      onPress={() =>
                        openProfile(
                          customer
                        )
                      }
                    >
                      <Text
                        style={
                          styles.cardActionIcon
                        }
                      >PR</Text>

                      <Text
                        style={
                          styles.cardActionText
                        }
                      >
                        Profile
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }
          )
        )}
      </ScrollView>

      {/* ADD / EDIT CUSTOMER MODAL */}
      <Modal
        visible={showCustomerModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowCustomerModal(
            false
          )
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalContainer}
          >
            <View
              style={styles.modalHeader}
            >
              <View>
                <Text
                  style={
                    styles.modalEyebrow
                  }
                >
                  CUSTOMER
                </Text>

                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  {editingCustomer
                    ? "Edit Customer"
                    : "Add Customer"}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.closeButton
                }
                onPress={() =>
                  setShowCustomerModal(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.closeButtonText
                  }
                >
×
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >
              <Text
                style={styles.inputLabel}
              >
                Customer Name (Optional)
              </Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter customer name"
                placeholderTextColor="#A18D96"
                style={styles.input}
              />

              <Text
                style={styles.inputLabel}
              >
                Phone Number *
              </Text>

              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#A18D96"
                keyboardType="phone-pad"
                style={styles.input}
              />

              <Text
                style={styles.inputLabel}
              >
                Notes
              </Text>

              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Customer preferences or notes"
                placeholderTextColor="#A18D96"
                multiline
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
              />

              <TouchableOpacity
                style={
                  styles.saveButton
                }
                onPress={
                  saveCustomer
                }
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {editingCustomer
                    ? "Update Customer"
                    : "Save Customer"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.cancelButton
                }
                onPress={() =>
                  setShowCustomerModal(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CUSTOMER PROFILE MODAL */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={
          closeProfile
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={
              styles.profileModalContainer
            }
          >
            <View
              style={styles.modalHeader}
            >
              <View>
                <Text
                  style={
                    styles.modalEyebrow
                  }
                >
                  CUSTOMER PROFILE
                </Text>

                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  {selectedCustomer?.name ||
                    "Customer"}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.closeButton
                }
                onPress={
                  closeProfile
                }
              >
                <Text
                  style={
                    styles.closeButtonText
                  }
                >
×
                </Text>
              </TouchableOpacity>
            </View>

            {selectedCustomer &&
              selectedStats && (
                <ScrollView
                  showsVerticalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.profileContent
                  }
                >
                  {/* PROFILE HEADER */}
                  <View
                    style={
                      styles.profileHero
                    }
                  >
                    <View
                      style={
                        styles.profileAvatar
                      }
                    >
                      <Text
                        style={
                          styles.profileAvatarText
                        }
                      >
                        {getInitials(
                          selectedCustomer.name
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.profileHeroText
                      }
                    >
                      <Text
                        style={
                          styles.profileName
                        }
                      >
                        {
                          selectedCustomer.name
                        }
                      </Text>

                      <Text
                        style={
                          styles.profilePhone
                        }
                      >
                        {
                          selectedCustomer.phone
                        }
                      </Text>

                      
                    </View>
                  </View>

                  {/* QUICK PROFILE STATUS */}
                  <View
                    style={
                      styles.profileStatusCard
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.profileStatusLabel
                        }
                      >
                        Customer Status
                      </Text>

                      <Text
                        style={
                          styles.profileStatusValue
                        }
                      >
                        {
                          getCustomerHealth(
                            selectedStats
                          ).label
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.profileStatusRight
                      }
                    >
                      <Text
                        style={
                          styles.profileStatusLabel
                        }
                      >
                        Last Order
                      </Text>

                      <Text
                        style={
                          styles.profileStatusValue
                        }
                      >
                        {dateLabel(
                          selectedStats.lastOrderDate
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* SUMMARY GRID */}
                  <Text
                    style={
                      styles.profileSectionTitle
                    }
                  >
                    Customer Summary
                  </Text>

                  <View
                    style={
                      styles.profileGrid
                    }
                  >
                    <View
                      style={
                        styles.profileStatCard
                      }
                    >
                      <Text
                        style={
                          styles.profileStatValue
                        }
                      >
                        {
                          selectedStats.orders
                        }
                      </Text>

                      <Text
                        style={
                          styles.profileStatLabel
                        }
                      >
                        Total Orders
                      </Text>
                    </View>

                    <View
                      style={
                        styles.profileStatCard
                      }
                    >
                      <Text
                        style={[
                          styles.profileStatValue,
                          selectedStats.activeOrders >
                            0 &&
                            styles.activeMetric,
                        ]}
                      >
                        {
                          selectedStats.activeOrders
                        }
                      </Text>

                      <Text
                        style={
                          styles.profileStatLabel
                        }
                      >
                        Active
                      </Text>
                    </View>

                    <View
                      style={
                        styles.profileStatCard
                      }
                    >
                      <Text
                        style={
                          styles.profileStatValue
                        }
                      >
                        {
                          selectedStats.completedOrders
                        }
                      </Text>

                      <Text
                        style={
                          styles.profileStatLabel
                        }
                      >
                        Completed
                      </Text>
                    </View>

                    <View
                      style={
                        styles.profileStatCard
                      }
                    >
                      <Text
                        style={
                          styles.profileStatValue
                        }
                      >
                        {
                          selectedStats.measurements
                        }
                      </Text>

                      <Text
                        style={
                          styles.profileStatLabel
                        }
                      >
                        Measurements
                      </Text>
                    </View>

                    <View
                      style={
                        styles.profileStatCard
                      }
                    >
                      <Text
                        style={[
                          styles.profileStatValue,
                          styles.paidText,
                        ]}
                      >
                        {formatMoney(
                          selectedStats.paid
                        )}
                      </Text>

                      <Text
                        style={
                          styles.profileStatLabel
                        }
                      >
                        Paid
                      </Text>
                    </View>

                    <View
                      style={
                        styles.profileStatCard
                      }
                    >
                      <Text
                        style={[
                          styles.profileStatValue,
                          selectedStats.due >
                            0 &&
                            styles.dueMetric,
                        ]}
                      >
                        {formatMoney(
                          selectedStats?.due ?? 0
                        )}
                      </Text>

                      <Text
                        style={
                          styles.profileStatLabel
                        }
                      >
                        Outstanding
                      </Text>
                    </View>
                  </View>

                  {/* PERSONAL DETAILS */}
                  <Text
                    style={
                      styles.profileSectionTitle
                    }
                  >
                    Personal Details
                  </Text>

                  <View
                    style={
                      styles.detailsCard
                    }
                  >
                    <View
                      style={
                        styles.detailRow
                      }
                    >
                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Phone
                      </Text>

                      <Text
                        style={
                          styles.detailValue
                        }
                      >
                        {
                          selectedCustomer.phone ||
                          "-"
                        }
                      </Text>
                    </View>

                    

                    

                    <View
                      style={
                        styles.detailRow
                      }
                    >
                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Notes
                      </Text>

                      <Text
                        style={
                          styles.detailValue
                        }
                        numberOfLines={
                          4
                        }
                      >
                        {
                          selectedCustomer.notes ||
                          "-"
                        }
                      </Text>
                    </View>
                  </View>

                  {/* CUSTOMER INSIGHTS */}
                  <Text
                    style={
                      styles.profileSectionTitle
                    }
                  >
                    Customer Insights
                  </Text>

                  <View
                    style={
                      styles.insightCard
                    }
                  >
                    <View
                      style={
                        styles.insightRow
                      }
                    >
                      <View
                        style={
                          styles.insightIconBox
                        }
                      >
                        <Text
                          style={
                            styles.insightIcon
                          }
                        >
                          ✦Â 
                        </Text>
                      </View>

                      <View
                        style={
                          styles.insightText
                        }
                      >
                        <Text
                          style={
                            styles.insightTitle
                          }
                        >
                          Latest Order
                        </Text>

                        <Text
                          style={
                            styles.insightValue
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {selectedStats.latestOrder
                            ? `${selectedStats.latestOrder.item} •${selectedStats.latestOrder.status}`
                            : "No orders yet"}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.insightRow
                      }
                    >
                      <View
                        style={
                          styles.insightIconBox
                        }
                      >
                        <Text
                          style={
                            styles.insightIcon
                          }
                        >
                          ✦
                        </Text>
                      </View>

                      <View
                        style={
                          styles.insightText
                        }
                      >
                        <Text
                          style={
                            styles.insightTitle
                          }
                        >
                          Next Delivery
                        </Text>

                        <Text
                          style={
                            styles.insightValue
                          }
                        >
                          {selectedStats.nextDeliveryDate
                            ? dateLabel(
                                selectedStats.nextDeliveryDate
                              )
                            : "No active delivery"}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.insightRow
                      }
                    >
                      <View
                        style={
                          styles.insightIconBox
                        }
                      >
                        <Text
                          style={
                            styles.insightIcon
                          }
                        >
                          ✦
                        </Text>
                      </View>

                      <View
                        style={
                          styles.insightText
                        }
                      >
                        <Text
                          style={
                            styles.insightTitle
                          }
                        >
                          Payment Status
                        </Text>

                        <Text
                          style={[
                            styles.insightValue,
                            selectedStats.due >
                              0 &&
                              styles.dueText,
                          ]}
                        >
                          {selectedStats.due >
                          0
                            ? `${formatMoney(
                                selectedStats.due
                              )} outstanding`
                            : "Payments up to date"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* QUICK ACTIONS */}
                  <Text
                    style={
                      styles.profileSectionTitle
                    }
                  >
                    Quick Actions
                  </Text>

                  <View
                    style={
                      styles.quickActionGrid
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.quickAction
                      }
                      onPress={() => {
                        closeProfile();

                        onOpenOrders(
                          selectedCustomer
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.quickActionIcon
                        }
                      >
                        ✦
                      </Text>

                      <Text
                        style={
                          styles.quickActionText
                        }
                      >
                        New Order
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.quickAction
                      }
                      onPress={() => {
                        closeProfile();

                        onOpenMeasurements(
                          selectedCustomer
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.quickActionIcon
                        }
                      >
                        ✦
                      </Text>

                      <Text
                        style={
                          styles.quickActionText
                        }
                      >
                        Measurements
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.quickAction
                      }
                      onPress={() => {
                        closeProfile();

                        onOpenBilling(
                          selectedCustomer
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.quickActionIcon
                        }
                      >
                        ✦
                      </Text>

                      <Text
                        style={
                          styles.quickActionText
                        }
                      >
                        Create Bill
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.quickAction
                      }
                      onPress={() => {
                        closeProfile();

                        onAddPayment(
                          selectedCustomer
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.quickActionIcon
                        }
                      >
                        ✦
                      </Text>

                      <Text
                        style={
                          styles.quickActionText
                        }
                      >
                        Add Payment
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* ORDER HISTORY */}
                  <Text
                    style={
                      styles.profileSectionTitle
                    }
                  >
                    Order History
                  </Text>

                  {selectedOrders.length ===
                  0 ? (
                    <View
                      style={
                        styles.historyEmpty
                      }
                    >
                      <Text
                        style={
                          styles.historyEmptyText
                        }
                      >
                        No orders found.
                      </Text>
                    </View>
                  ) : (
                    selectedOrders
                      .slice(0, 8)
                      .map((order) => {
                        const delivery =
                          getDeliveryInfo(
                            order
                          );

                        const progress =
                          getProgressPercent(
                            order.status
                          );

                        return (
                          <View
                            key={
                              order.id
                            }
                            style={
                              styles.historyCard
                            }
                          >
                            <View
                              style={
                                styles.historyTop
                              }
                            >
                              <View
                                style={
                                  styles.historyMain
                                }
                              >
                                <Text
                                  style={
                                    styles.historyTitle
                                  }
                                  numberOfLines={
                                    1
                                  }
                                >
                                  {
                                    order.item
                                  }
                                </Text>

                                <Text
                                  style={
                                    styles.historyMeta
                                  }
                                >
                                  {
                                    order.id
                                  }{" "}
                                  · Qty{" "}
                                  {
                                    order.quantity
                                  }
                                </Text>
                              </View>

                              <Text
                                style={
                                  styles.historyAmount
                                }
                              >
                                {formatMoney(
                                  getOrderTotal(
                                    order
                                  )
                                )}
                              </Text>
                            </View>

                            <View
                              style={
                                styles.historyStatusRow
                              }
                            >
                              <Text
                                style={
                                  styles.historyStatus
                                }
                              >
                                {getStatusSymbol(
                                  order.status
                                )}{" "}
                                {
                                  order.status
                                }
                              </Text>

                              <Text
                                style={[
                                  styles.historyDelivery,
                                  delivery.tone ===
                                    "danger" &&
                                    styles.deliveryDanger,
                                  delivery.tone ===
                                    "warning" &&
                                    styles.deliveryWarning,
                                  delivery.tone ===
                                    "success" &&
                                    styles.deliverySuccess,
                                ]}
                              >
                                {
                                  delivery.label
                                }
                              </Text>
                            </View>

                            <View
                              style={
                                styles.historyProgressTrack
                              }
                            >
                              <View
                                style={[
                                  styles.historyProgressFill,
                                  {
                                    width: `${progress}%`,
                                  },
                                ]}
                              />
                            </View>

                            <View
                              style={
                                styles.historyDateRow
                              }
                            >
                              <Text
                                style={
                                  styles.historyDate
                                }
                              >
                                Ordered{" "}
                                {dateLabel(
                                  order.orderDate
                                )}
                              </Text>

                              <Text
                                style={
                                  styles.historyDate
                                }
                              >
                                Delivery{" "}
                                {dateLabel(
                                  order.deliveryDate
                                )}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                  )}

                  {/* BILLING HISTORY */}
                  <Text
                    style={
                      styles.profileSectionTitle
                    }
                  >
                    Bills & Payments
                  </Text>

                  {selectedBills.length ===
                  0 ? (
                    <View
                      style={
                        styles.historyEmpty
                      }
                    >
                      <Text
                        style={
                          styles.historyEmptyText
                        }
                      >
                        No bills found.
                      </Text>
                    </View>
                  ) : (
                    selectedBills
                      .slice(0, 8)
                      .map((bill) => (
                        <View
                          key={
                            bill.id
                          }
                          style={
                            styles.billHistoryCard
                          }
                        >
                          <View
                            style={
                              styles.billHistoryTop
                            }
                          >
                            <View>
                              <Text
                                style={
                                  styles.billHistoryNumber
                                }
                              >
                                {bill.billNumber ||
                                  bill.id ||
                                  "Bill"}
                              </Text>

                              <Text
                                style={
                                  styles.billHistoryDate
                                }
                              >
                                {dateLabel(
                                  bill.billDate
                                )}
                              </Text>
                            </View>

                            <View
                              style={
                                styles.billHistoryAmountBox
                              }
                            >
                              <Text
                                style={
                                  styles.billHistoryAmount
                                }
                              >
                                {formatMoney(
                                  Number(
                                    bill.total ||
                                      0
                                  )
                                )}
                              </Text>

                              <Text
                                style={[
                                  styles.billStatus,
                                  Number(
                                    bill.balance ||
                                      0
                                  ) > 0 &&
                                    styles.billStatusDue,
                                ]}
                              >
                                {Number(
                                  bill.balance ||
                                    0
                                ) > 0
                                  ? "Due"
                                  : "Paid"}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={
                              styles.billHistoryRow
                            }
                          >
                            <Text
                              style={
                                styles.billHistoryLabel
                              }
                            >
                              Paid
                            </Text>

                            <Text
                              style={
                                styles.billHistoryPaid
                              }
                            >
                              {formatMoney(
                                Number(
                                  bill.paidAmount ||
                                    0
                                )
                              )}
                            </Text>

                            <Text
                              style={
                                styles.billHistoryLabel
                              }
                            >
                              Balance
                            </Text>

                            <Text
                              style={[
                                styles.billHistoryBalance,
                                Number(
                                  bill.balance ||
                                    0
                                ) > 0 &&
                                  styles.dueText,
                              ]}
                            >
                              {formatMoney(
                                Number(
                                  bill.balance ||
                                    0
                                )
                              )}
                            </Text>
                          </View>
                        </View>
                      ))
                  )}

                  {/* PAYMENT HISTORY */}
                  {selectedPayments.length >
                    0 && (
                    <>
                      <Text
                        style={
                          styles.profileSectionTitle
                        }
                      >
                        Recent Payments
                      </Text>

                      {selectedPayments
                        .slice(0, 6)
                        .map(
                          (
                            payment
                          ) => (
                            <View
                              key={
                                payment.id
                              }
                              style={
                                styles.paymentHistoryCard
                              }
                            >
                              <View>
                                <Text
                                  style={
                                    styles.paymentMethod
                                  }
                                >
                                  {payment.method ||
                                    "Payment"}
                                </Text>

                                <Text
                                  style={
                                    styles.paymentDate
                                  }
                                >
                                  {dateLabel(
                                    payment.paymentDate
                                  )}
                                </Text>
                              </View>

                              <Text
                                style={
                                  styles.paymentAmount
                                }
                              >
                                +
                                {formatMoney(
                                  Number(
                                    payment.amount ||
                                      0
                                  )
                                )}
                              </Text>
                            </View>
                          )
                        )}
                    </>
                  )}

                  {/* MEASUREMENTS */}
                  <Text
                    style={
                      styles.profileSectionTitle
                    }
                  >
                    Measurement History
                  </Text>

                  {selectedMeasurements.length ===
                  0 ? (
                    <View
                      style={
                        styles.historyEmpty
                      }
                    >
                      <Text
                        style={
                          styles.historyEmptyText
                        }
                      >
                        No measurements recorded.
                      </Text>
                    </View>
                  ) : (
                    selectedMeasurements
                      .slice(0, 6)
                      .map(
                        (
                          measurement,
                          index
                        ) => (
                          <View
                            key={String(
                              measurement.id ??
                                index
                            )}
                            style={
                              styles.measurementHistoryCard
                            }
                          >
                            <View>
                              <Text
                                style={
                                  styles.measurementTitle
                                }
                              >
                                Measurement Profile{" "}
                                {selectedMeasurements.length -
                                  index}
                              </Text>

                              {/*
                                Measurement type does not expose
                                createdAt, so we intentionally
                                don't display a fake date here.
                              */}
                              <Text
                                style={
                                  styles.measurementDate
                                }
                              >
                                Saved measurement profile
                              </Text>
                            </View>

                            <Text
                              style={
                                styles.measurementArrow
                              }
                            >
                              â€º
                            </Text>
                          </View>
                        )
                      )
                  )}

                  {/* EDIT CUSTOMER */}
                  <TouchableOpacity
                    style={
                      styles.editProfileButton
                    }
                    onPress={() => {
                      closeProfile();

                      openEditCustomer(
                        selectedCustomer
                      );
                    }}
                  >
                    <Text
                      style={
                        styles.editProfileButtonText
                      }
                    >
                      Edit Customer Details
                    </Text>
                  </TouchableOpacity>

                  <View
                    style={
                      styles.bottomSpace
                    }
                  />
                </ScrollView>
              )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F8",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 110,

  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingTop: 10,
    minHeight: 100,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: "#C2185B",
    marginBottom: 5,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#3A1727",
  },

  subtitle: {
    fontSize: 12,
    color: "#806773",
    marginTop: 4,
    lineHeight: 18,
  },

  addButton: {
    minWidth: 150,
    height: 46,
    paddingHorizontal: 17,
    borderRadius: 15,
    backgroundColor: "#C2185B",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    shadowColor: "#8B1238",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 4,
  },

  addButtonPlus: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "500",
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  sectionTitleRow: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#3A1727",
  },

  sectionSubtitle: {
    fontSize: 11,
    color: "#8A6A77",
    marginTop: 2,
  },

  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
    marginBottom: 20,

  },
  overviewCard: {
    width: "48%",
    minHeight: 124,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#F5D9E4",
    justifyContent: "space-between",
    shadowColor: "#8B1238",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  overviewIcon: {
    fontSize: 20,
    fontWeight: "900",
    color: "#C2185B",
  },

  overviewValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#3A1727",
    marginTop: 6,
  },

  overviewLabel: {
    fontSize: 11,
    color: "#8A6A77",
    fontWeight: "600",
  },

  dueValue: {
    color: "#C2185B",
  },

  financeCard: {
    backgroundColor: "#C2185B",
    borderRadius: 20,
    padding: 17,
    marginBottom: 16,
  },

  financeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  financeTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  financeSubtitle: {
    color: "#FFE0EC",
    fontSize: 10,
    marginTop: 2,
  },

  financeTotal: {
    color: "#FFE0EC",
    fontSize: 16,
    fontWeight: "900",
  },

  financeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 17,
  },

  financeItem: {
    flex: 1,
  },

  financeItemLabel: {
    color: "#FCE5EF",
    fontSize: 10,
    marginBottom: 4,
  },

  financeItemValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  financeDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#EAA9C3",
    marginHorizontal: 10,
  },

  paidText: {
    color: "#FFFFFF",
  },

  dueText: {
    color: "#FFFFFF",
  },

  searchContainer: {
    height: 50,
    backgroundColor: "#FFFFFF",

    borderColor: "#C2185B",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  searchIcon: {
    fontSize: 22,
    color: "#C2185B",
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    color: "#3A1727",
    fontSize: 13,
    paddingVertical: 0,
  },

  clearSearch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FCE5EF",
    alignItems: "center",
    justifyContent: "center",
  },

  clearSearchText: {
    fontSize: 19,
    lineHeight: 22,
    color: "#8B1238",
  },

  filterRow: {
    gap: 8,
    paddingBottom: 18,
  },

  filterChip: {
    paddingHorizontal: 17,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0B8CE",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  filterChipActive: {
    backgroundColor: "#C2185B",
    borderColor: "#C2185B",
  },

  filterChipText: {
    color: "#8B1238",
    fontSize: 11,
    fontWeight: "700",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  listHeader: {
    marginBottom: 12,
  },

  customerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F5D9E4",
    padding: 17,
    marginBottom: 15,
    shadowColor: "#8B1238",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  customerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FCE5EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  avatarText: {
    color: "#C2185B",
    fontSize: 15,
    fontWeight: "900",
  },

  customerMain: {
    flex: 1,
    minWidth: 0,
  },

  customerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  customerName: {
    flexShrink: 1,
    color: "#36222B",
    fontSize: 16,
    fontWeight: "900",
  },

  customerPhone: {
    color: "#725E67",
    fontSize: 11,
    marginTop: 4,
  },

  customerEmail: {
    color: "#A18E95",
    fontSize: 10,
    marginTop: 2,
  },

  healthBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#F1ECEE",
  },

  healthBadgeDanger: {
    backgroundColor: "#FBE7E9",
  },

  healthBadgeWarning: {
    backgroundColor: "#FFF2D9",
  },

  healthBadgeInfo: {
    backgroundColor: "#E8F0F7",
  },

  healthBadgeSuccess: {
    backgroundColor: "#E6F3EC",
  },

  healthBadgeText: {
    color: "#75616A",
    fontSize: 8,
    fontWeight: "800",
  },

  healthBadgeTextDanger: {
    color: "#AF3949",
  },

  healthBadgeTextWarning: {
    color: "#9B6A1D",
  },

  healthBadgeTextInfo: {
    color: "#456B88",
  },

  healthBadgeTextSuccess: {
    color: "#367557",
  },

  editButton: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: "#FCE5EF",
  },

  editButtonText: {
    color: "#C2185B",
    fontSize: 10,
    fontWeight: "800",
  },

  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F8",
    borderRadius: 14,
    marginTop: 14,
    paddingVertical: 11,
  },

  metricBox: {
    flex: 1,
    alignItems: "center",
  },

  metricValue: {
    color: "#3A2630",
    fontSize: 13,
    fontWeight: "900",
  },

  metricLabel: {
    color: "#97838B",
    fontSize: 8,
    marginTop: 3,
    textAlign: "center",
  },

  metricDivider: {
    width: 1,
    height: 25,
    backgroundColor: "#E5D9DD",
  },

  activeMetric: {
    color: "#4B7D65",
  },

  dueMetric: {
    color: "#C2185B",
  },

  latestOrderBox: {
    backgroundColor: "#FFF9FB",
    borderWidth: 1,
    borderColor: "#F0E4E8",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },

  latestOrderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  latestOrderTitle: {
    color: "#725965",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  deliveryLabel: {
    color: "#8B7780",
    fontSize: 9,
    fontWeight: "800",
  },

  deliveryDanger: {
    color: "#C2185B",
  },

  deliveryWarning: {
    color: "#A06C18",
  },

  deliverySuccess: {
    color: "#3D7C5D",
  },

  deliveryInfo: {
    color: "#4A6F89",
  },

  latestOrderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
  },

  latestOrderInfo: {
    flex: 1,
    minWidth: 0,
  },

  latestOrderItem: {
    color: "#3B2730",
    fontSize: 12,
    fontWeight: "800",
  },

  latestOrderMeta: {
    color: "#917E86",
    fontSize: 9,
    marginTop: 3,
  },

  latestOrderDate: {
    color: "#80616E",
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 8,
  },

  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#EDE4E7",
    overflow: "hidden",
    marginTop: 10,
  },

  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#C2185B",
  },

  progressBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },

  progressStatus: {
    color: "#806A73",
    fontSize: 8,
    fontWeight: "700",
  },

  progressPercent: {
    color: "#C2185B",
    fontSize: 8,
    fontWeight: "900",
  },

  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F0E5E8",
    marginTop: 13,
    paddingTop: 11,
  },

  cardAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  cardActionIcon: {
    color: "#C2185B",
    fontSize: 14,
    marginBottom: 3,
  },

  cardActionText: {
    color: "#8B1238",
    fontSize: 8,
    fontWeight: "700",
    textAlign: "center",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EDE1E5",
    padding: 30,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 34,
    color: "#C68AA1",
    marginBottom: 8,
  },

  emptyTitle: {
    color: "#3A1727",
    fontSize: 16,
    fontWeight: "900",
  },

  emptyText: {
    color: "#927D85",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 5,
  },

  emptyButton: {
    marginTop: 16,
    backgroundColor: "#C2185B",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(35, 20, 27, 0.52)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    maxHeight: "90%",
    backgroundColor: "#FFF5F8",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },

  profileModalContainer: {
    height: "94%",
    backgroundColor: "#FFF5F8",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  modalEyebrow: {
    color: "#C2185B",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 3,
  },

  modalTitle: {
    color: "#8B1238",
    fontSize: 22,
    fontWeight: "900",
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FCE5EF",
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    color: "#8B1238",
    fontSize: 25,
    lineHeight: 27,
  },

  inputLabel: {
    color: "#8B1238",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 8,
  },

  input: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#F0B8CE",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    color: "#38242D",
    fontSize: 13,
  },

  multilineInput: {
    minHeight: 80,
    paddingTop: 13,
    textAlignVertical: "top",
  },

  saveButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#C2185B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  cancelButton: {
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 10,
  },

  cancelButtonText: {
    color: "#8B1238",
    fontSize: 12,
    fontWeight: "800",
  },

  profileContent: {
    paddingBottom: 35,
  },

  profileHero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EDE1E5",
    padding: 15,
  },

  profileAvatar: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: "#FCE5EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  profileAvatarText: {
    color: "#C2185B",
    fontSize: 19,
    fontWeight: "900",
  },

  profileHeroText: {
    flex: 1,
  },

  profileName: {
    color: "#36222B",
    fontSize: 20,
    fontWeight: "900",
  },

  profilePhone: {
    color: "#705A64",
    fontSize: 11,
    marginTop: 4,
  },

  profileEmail: {
    color: "#9A858D",
    fontSize: 10,
    marginTop: 3,
  },

  profileStatusCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#C2185B",
    borderRadius: 17,
    padding: 15,
    marginTop: 10,
  },

  profileStatusRight: {
    alignItems: "flex-end",
  },

  profileStatusLabel: {
    color: "#CBBAC1",
    fontSize: 9,
    fontWeight: "700",
  },

  profileStatusValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },

  profileSectionTitle: {
    color: "#8B1238",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 9,
  },

  profileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  profileStatCard: {
    width: "31%",
    minHeight: 82,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDE1E5",
    padding: 10,
    justifyContent: "center",
  },

  profileStatValue: {
    color: "#3A2630",
    fontSize: 14,
    fontWeight: "900",
  },

  profileStatLabel: {
    color: "#97828A",
    fontSize: 8,
    marginTop: 4,
  },

  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#EDE1E5",
    paddingHorizontal: 14,
  },

  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1E8EB",
  },

  detailLabel: {
    color: "#9A858D",
    fontSize: 9,
    fontWeight: "800",
    marginBottom: 4,
  },

  detailValue: {
    color: "#443039",
    fontSize: 12,
    lineHeight: 17,
  },

  insightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#EDE1E5",
    padding: 13,
  },

  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
  },

  insightIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FCE5EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  insightIcon: {
    color: "#C2185B",
    fontSize: 15,
    fontWeight: "900",
  },

  insightText: {
    flex: 1,
  },

  insightTitle: {
    color: "#98828B",
    fontSize: 9,
    fontWeight: "700",
  },

  insightValue: {
    color: "#3C2931",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },

  quickActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  quickAction: {
    width: "48.5%",
    minHeight: 72,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDE1E5",
    alignItems: "center",
    justifyContent: "center",
  },

  quickActionIcon: {
    color: "#C2185B",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5,
  },

  quickActionText: {
    color: "#8B1238",
    fontSize: 10,
    fontWeight: "800",
  },

  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE1E5",
    padding: 13,
    marginBottom: 9,
  },

  historyTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  historyMain: {
    flex: 1,
    minWidth: 0,
  },

  historyTitle: {
    color: "#3C2931",
    fontSize: 12,
    fontWeight: "900",
  },

  historyMeta: {
    color: "#99848C",
    fontSize: 9,
    marginTop: 3,
  },

  historyAmount: {
    color: "#7E3E5A",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 8,
  },

  historyStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  historyStatus: {
    color: "#705965",
    fontSize: 9,
    fontWeight: "800",
  },

  historyDelivery: {
    color: "#85717A",
    fontSize: 9,
    fontWeight: "800",
  },

  historyProgressTrack: {
    height: 4,
    backgroundColor: "#EEE5E8",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 8,
  },

  historyProgressFill: {
    height: "100%",
    backgroundColor: "#A14E70",
    borderRadius: 2,
  },

  historyDateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
  },

  historyDate: {
    color: "#A08C94",
    fontSize: 8,
  },

  historyEmpty: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#EDE1E5",
    padding: 18,
    alignItems: "center",
  },

  historyEmptyText: {
    color: "#8A6A77",
    fontSize: 10,
  },

  billHistoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE1E5",
    padding: 13,
    marginBottom: 9,
  },

  billHistoryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  billHistoryNumber: {
    color: "#3B2730",
    fontSize: 11,
    fontWeight: "900",
  },

  billHistoryDate: {
    color: "#9A858D",
    fontSize: 9,
    marginTop: 3,
  },

  billHistoryAmountBox: {
    alignItems: "flex-end",
  },

  billHistoryAmount: {
    color: "#7E3E5A",
    fontSize: 13,
    fontWeight: "900",
  },

  billStatus: {
    color: "#3F7A5C",
    fontSize: 8,
    fontWeight: "900",
    marginTop: 2,
  },

  billStatusDue: {
    color: "#C2185B",
  },

  billHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#F1E8EB",
  },

  billHistoryLabel: {
    color: "#9A858D",
    fontSize: 9,
    marginRight: 5,
  },

  billHistoryPaid: {
    color: "#3E7B5B",
    fontSize: 10,
    fontWeight: "800",
    marginRight: 18,
  },

  billHistoryBalance: {
    color: "#443039",
    fontSize: 10,
    fontWeight: "800",
  },

  paymentHistoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#EDE1E5",
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  paymentMethod: {
    color: "#443039",
    fontSize: 10,
    fontWeight: "900",
  },

  paymentDate: {
    color: "#9A858D",
    fontSize: 8,
    marginTop: 3,
  },

  paymentAmount: {
    color: "#3D805E",
    fontSize: 13,
    fontWeight: "900",
  },

  measurementHistoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#EDE1E5",
    padding: 13,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  measurementTitle: {
    color: "#443039",
    fontSize: 10,
    fontWeight: "900",
  },

  measurementDate: {
    color: "#9A858D",
    fontSize: 8,
    marginTop: 3,
  },

  measurementArrow: {
    color: "#C2185B",
    fontSize: 18,
    fontWeight: "800",
  },

  editProfileButton: {
    height: 49,
    borderRadius: 14,
    backgroundColor: "#C2185B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  editProfileButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  bottomSpace: {
    height: 20,
  },
});








