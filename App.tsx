import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,

  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Session } from "@supabase/supabase-js";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "./lib/supabase";

import {
  createCustomer as createSupabaseCustomer,
  fetchCustomers,
  updateCustomer as updateSupabaseCustomer,
} from "./lib/customerService";

import {
  createMeasurement as createSupabaseMeasurement,
  fetchMeasurements as fetchSupabaseMeasurements,
  updateMeasurement as updateSupabaseMeasurement,
  deleteMeasurement as deleteSupabaseMeasurement,
} from "./lib/measurementService";

import {
  fetchOrders,
  createOrder,
  updateOrder,
  deleteOrder,
} from "./lib/orderService";

import {
  createBill as createSupabaseBill,
  createPayment as createSupabasePayment,
  deletePayment as deleteSupabasePayment,
  fetchBillingData,
  updateBill as updateSupabaseBill,
} from "./lib/billService";

import AuthScreen from "./screens/auth/AuthScreen";
import OwnerPinScreen from "./screens/auth/OwnerPinScreen";

import CustomersScreen, { Customer } from "./screens/CustomersScreen";

import MeasurementsScreen, {
  Measurement,
} from "./screens/measurements/MeasurementsScreen";

import OrdersScreen, { Order } from "./screens/OrdersScreen";

import BillingScreen from "./screens/BillingScreen";
import ReceiptScreen from "./screens/ReceiptScreen";
import ExpensesScreen from "./screens/ExpensesScreen";
import StaffScreen from "./screens/StaffScreen";
import SketchScreen from "./screens/SketchScreen";
import { fetchExpenses, type Expense } from "./lib/expenseService";

import type { Bill, Payment } from "./lib/billService";

type Screen =
  | "home"
  | "customers"
  | "measurements"
  | "orders"
  | "billing"
  | "expenses"
  | "staff"
  | "receipt"
  | "sketch";

type DeliveryStatus =
  "Upcoming" | "Due Today" | "Overdue" | "Delivered" | "No Date";

const colors = {
  PrimaryWine: "#B51655",
  Magenta: "#D63384",
  Gold: "#D98AA8",
  Cream: "#FFF5F8",
  SoftPink: "#FCE4EF",
  DarkText: "#242124",
  White: "#FFFFFF",
  Gray: "#777777",
  LightGray: "#FFF0F5",
  Green: "#2E7D32",
  Red: "#C62828",
  Orange: "#EF6C00",
  Blue: "#1565C0",
  Purple: "#7B1FA2",
};

const STATUS_LIST = ["New", "Stitching", "Delivered"] as const;

/* =========================================================
   DATE HELPERS
========================================================= */

const pad2 = (value: number) => String(value).padStart(2, "0");

const localToday = () => {
  const date = new Date();

  return `${date.getFullYear()}-${pad2(
    date.getMonth() + 1,
  )}-${pad2(date.getDate())}`;
};

const normalizeDate = (value: unknown): string => {
  if (!value) {
    return "";
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split("/").map(Number);

    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  return text;
};

const parseDateOnly = (value: unknown): Date | null => {
  const normalized = normalizeDate(value);

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

  if (!match) {
    return null;
  }

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

const getDeliveryStatus = (order: Order): DeliveryStatus => {
  if (order.status === "Delivered") {
    return "Delivered";
  }

  const deliveryDate = parseDateOnly(order.deliveryDate);

  if (!deliveryDate) {
    return "No Date";
  }

  const today = parseDateOnly(localToday());

  if (!today) {
    return "No Date";
  }

  if (deliveryDate.getTime() < today.getTime()) {
    return "Overdue";
  }

  if (deliveryDate.getTime() === today.getTime()) {
    return "Due Today";
  }

  return "Upcoming";
};

const getProgressPercent = (status: string) => {
  const index = STATUS_LIST.indexOf(status as (typeof STATUS_LIST)[number]);

  if (index < 0) {
    return 0;
  }

  return Math.round(((index + 1) / STATUS_LIST.length) * 100);
};

/* =========================================================
   APP
========================================================= */

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);

  const [authLoading, setAuthLoading] = useState(true);

  const [pinUnlocked, setPinUnlocked] = useState(false);

  const [loading, setLoading] = useState(false);

  const [currentScreen, setCurrentScreen] = useState<Screen>("home");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [openCreateForSelectedCustomer, setOpenCreateForSelectedCustomer] =
    useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [measurements, setMeasurements] = useState<
    Record<string, Measurement[]>
  >({});

  const [orders, setOrders] = useState<Order[]>([]);

  const [bills, setBills] = useState<Bill[]>([]);
  const [customerLookup, setCustomerLookup] = useState("");

  const [showNewCustomerRegistration, setShowNewCustomerRegistration] =
    useState(false);

  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [savingNewCustomer, setSavingNewCustomer] = useState(false);

  const [payments, setPayments] = useState<Payment[]>([]);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"7d" | "30d" | "12m">(
    "7d",
  );
  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        console.log(
          "SESSION CHECK:",
          currentSession
            ? {
                userId: currentSession.user.id,
                expiresAt: currentSession.expires_at,
              }
            : null,
        );

        if (mounted) {
          setSession(currentSession);
        }
      } catch (error) {
        console.error("SESSION ERROR:", error);
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        setPinUnlocked(false);
      }

      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  const loadAllData = async () => {
    if (!session?.user?.id) {
      return;
    }

    try {
      setLoading(true);

      const [
        customerData,
        measurementData,
        orderData,
        billingData,
        expenseData,
      ] = await Promise.all([
        fetchCustomers(),
        fetchSupabaseMeasurements(),
        fetchOrders(),
        fetchBillingData(),
        fetchExpenses(),
      ]);

      setCustomers(
        (customerData || []).map((customer) => ({
          ...customer,
          orders: 0,
        })),
      );

      setOrders(orderData || []);

      const groupedMeasurements: Record<string, Measurement[]> = {};

      (measurementData || []).forEach(
        (
          measurement: Measurement & {
            customerId?: string;
            customer_id?: string;
          },
        ) => {
          const customerId =
            measurement.customerId || measurement.customer_id || "";

          if (!customerId) {
            return;
          }

          if (!groupedMeasurements[customerId]) {
            groupedMeasurements[customerId] = [];
          }

          groupedMeasurements[customerId].push(measurement);
        },
      );

      setMeasurements(groupedMeasurements);

      setBills(billingData?.bills || []);

      setPayments(billingData?.payments || []);

      setExpenses(expenseData || []);
    } catch (error) {
      console.error("LOAD DATA ERROR:", error);

      Alert.alert("Loading Error", "Unable to load boutique data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadAllData();
    }
  }, [session]);

  /* =========================================================
     CUSTOMER HANDLERS
  ========================================================= */

  const handleAddCustomer = async (
    customer: Customer,
  ): Promise<Customer | null> => {
    try {
      const created = await createSupabaseCustomer({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
      });

      const finalCustomer: Customer = {
        ...created,
        orders: 0,
      };

      setCustomers((previous) => [...previous, finalCustomer]);

      return finalCustomer;
    } catch (error) {
      console.error("ADD CUSTOMER ERROR:", error);

      Alert.alert("Error", "Unable to save customer.");

      return null;
    }
  };

  const handleUpdateCustomer = async (customer: Customer) => {
    try {
      const updated = await updateSupabaseCustomer(customer.id, {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
      });

      const finalCustomer: Customer = {
        ...updated,
        orders: customer.orders,
      };

      setCustomers((previous) =>
        previous.map((item) =>
          item.id === customer.id ? finalCustomer : item,
        ),
      );

      setSelectedCustomer(finalCustomer);
    } catch (error) {
      console.error("UPDATE CUSTOMER ERROR:", error);

      Alert.alert("Error", "Unable to update customer.");
    }
  };

  /* =========================================================
     MEASUREMENT HANDLERS
  ========================================================= */

  const handleAddMeasurement = async (
    customerId: string,
    measurement: Omit<Measurement, "id">,
  ) => {
    try {
      const serviceMeasurement = {
        ...measurement,
        customerId,
      };

      const created = await createSupabaseMeasurement(serviceMeasurement);

      const finalMeasurement = created || {
        ...serviceMeasurement,
        id: `measurement-${Date.now()}`,
      };

      setMeasurements((previous) => ({
        ...previous,
        [customerId]: [...(previous[customerId] || []), finalMeasurement],
      }));
    } catch (error) {
      console.error("ADD MEASUREMENT ERROR:", error);

      Alert.alert("Error", "Unable to save measurement.");

      throw error;
    }
  };

  const handleUpdateMeasurement = async (
    customerId: string,
    measurementId: string,
    measurement: Omit<Measurement, "id">,
  ) => {
    try {
      const serviceMeasurement = {
        ...measurement,
        customerId,
      };

      const updated = await updateSupabaseMeasurement(
        measurementId,
        serviceMeasurement,
      );

      const finalMeasurement = updated || {
        ...measurement,
        id: measurementId,
      };

      setMeasurements((previous) => ({
        ...previous,
        [customerId]: (previous[customerId] || []).map((item) =>
          item.id === measurementId ? finalMeasurement : item,
        ),
      }));
    } catch (error) {
      console.error("UPDATE MEASUREMENT ERROR:", error);

      Alert.alert("Error", "Unable to update measurement.");

      throw error;
    }
  };

  const handleDeleteMeasurement = async (
    customerId: string,
    measurementId: string,
  ) => {
    try {
      await deleteSupabaseMeasurement(measurementId);

      setMeasurements((previous) => ({
        ...previous,
        [customerId]: (previous[customerId] || []).filter(
          (item) => item.id !== measurementId,
        ),
      }));
    } catch (error) {
      console.error("DELETE MEASUREMENT ERROR:", error);

      throw error;
    }
  };


  const handleRegisterAndCreateOrder = async () => {
    const name = newCustomerForm.name.trim();
    const phone = newCustomerForm.phone.trim();

    if (!phone) {
      Alert.alert(
        "Missing Phone",
        "Please enter the customer's phone number.",
      );
      return;
    }

    try {
      setSavingNewCustomer(true);

      const createdCustomer = await handleAddCustomer({
        id: "",
        name,
        phone,
        email: newCustomerForm.email.trim(),
        address: newCustomerForm.address.trim(),
        notes: newCustomerForm.notes.trim(),
        orders: 0,
      });

      if (!createdCustomer) {
        return;
      }

      setSelectedCustomer(createdCustomer);
      setOpenCreateForSelectedCustomer(true);
      setShowNewCustomerRegistration(false);
      setCustomerLookup("");

      setNewCustomerForm({
        name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
      });

      setCurrentScreen("orders");
    } finally {
      setSavingNewCustomer(false);
    }
  };
  /* =========================================================
     ORDER HANDLERS
  ========================================================= */

  const handleCreateOrder = async (order: Order) => {
    try {
      const created = await createOrder(order);

      const finalOrder = created || order;

      setOrders((previous) => [...previous, finalOrder]);

      return finalOrder;
    } catch (error) {
      console.error("CREATE ORDER ERROR:", error);

      Alert.alert("Error", "Unable to create order.");

      throw error;
    }
  };

  const handleUpdateOrder = async (order: Order) => {
    try {
      const updated = await updateOrder(order);

      const finalOrder = updated || order;

      setOrders((previous) =>
        previous.map((item) => (item.id === order.id ? finalOrder : item)),
      );

      return finalOrder;
    } catch (error) {
      console.error("UPDATE ORDER ERROR:", error);

      Alert.alert("Error", "Unable to update order.");

      throw error;
    }
  };

  /* =========================================================
     BILL HANDLERS
  ========================================================= */

  const handleCreateBill = async (bill: Bill, payment?: Payment) => {
    try {
      const createdBill = await createSupabaseBill(bill);

      const finalBill = createdBill || bill;

      setBills((previous) => [...previous, finalBill]);

      if (payment) {
        const paymentForDatabase: Payment = {
          ...payment,
          billId: finalBill.id,
        };

        const createdPayment = await createSupabasePayment(paymentForDatabase);

        setPayments((previous) => [
          ...previous,
          createdPayment || paymentForDatabase,
        ]);
      }
    } catch (error) {
      console.error("CREATE BILL ERROR:", error);

      Alert.alert("Error", "Unable to create bill.");
    }
  };

  const handleUpdateBill = async (bill: Bill) => {
    try {
      const updatedBill = await updateSupabaseBill(bill);

      setBills((previous) =>
        previous.map((item) =>
          item.id === updatedBill.id ? updatedBill : item,
        ),
      );

      await loadAllData();
    } catch (error) {
      console.error("UPDATE BILL ERROR:", error);

      Alert.alert("Error", "Unable to update bill.");
    }
  };

  const handleAddPayment = async (
    payment: Payment,
    updatedBill: Bill,
  ): Promise<boolean> => {
    let createdPayment: Payment | null = null;

    try {
      createdPayment = await createSupabasePayment(payment);

      try {
        await updateSupabaseBill(updatedBill);
      } catch (billError) {
        console.error("PAYMENT BILL UPDATE ERROR:", billError);

        try {
          await deleteSupabasePayment(createdPayment.id);
        } catch (rollbackError) {
          console.error("PAYMENT ROLLBACK ERROR:", rollbackError);
          Alert.alert(
            "Payment Needs Attention",
            "The bill update failed and the payment could not be rolled back. Please check the payment and bill in the app before recording another payment.",
          );
          return false;
        }

        Alert.alert(
          "Error",
          "The bill could not be updated. The payment was rolled back.",
        );
        return false;
      }

      await loadAllData();
      return true;
    } catch (error) {
      console.error("ADD PAYMENT ERROR:", error);
      Alert.alert("Error", "Unable to save payment.");
      return false;
    }
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("LOGOUT ERROR:", error);
        Alert.alert("Logout Failed", "Unable to log out. Please try again.");
        return;
      }

      setSession(null);
      setCustomers([]);
      setMeasurements({});
      setOrders([]);
      setBills([]);
      setPayments([]);
      setExpenses([]);
      setSelectedCustomer(null);
      setCurrentScreen("home");
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
      Alert.alert("Logout Failed", "Something went wrong while logging out.");
    }
  };

  /* =========================================================
     DERIVED DATA
  ========================================================= */

  const liveCustomers = useMemo(
    () =>
      customers.map((customer) => ({
        ...customer,
        orders: orders.filter((order) => order.customerId === customer.id)
          .length,
      })),
    [customers, orders],
  );

  const customerMeasurements = selectedCustomer
    ? measurements[selectedCustomer.id] || []
    : [];

  /* =========================================================
     AUTH LOADING
  ========================================================= */

  if (authLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.PrimaryWine} />

        <Text style={styles.loadingText}>Loading Femme Fatale Boutique...</Text>
      </SafeAreaView>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (!pinUnlocked) {
    return <OwnerPinScreen onUnlock={() => setPinUnlocked(true)} />;
  }

  /* =========================================================
     HOME DASHBOARD
  ========================================================= */

  const renderHome = () => {
    const todayKey = localToday();

    const todayFabricExpenseTotal = expenses
      .filter(
        (expense) =>
          normalizeDate(expense.expense_date) === todayKey &&
          expense.category === "Fabric & Materials",
      )
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    // SALES ANALYTICS
    const analyticsNow = new Date();
    const analyticsDays =
      analyticsPeriod === "7d" ? 7 : analyticsPeriod === "30d" ? 30 : 365;

    const analyticsStart = new Date(
      analyticsNow.getFullYear(),
      analyticsNow.getMonth(),
      analyticsNow.getDate(),
    );

    if (analyticsPeriod === "12m") {
      analyticsStart.setMonth(analyticsStart.getMonth() - 11, 1);
    } else {
      analyticsStart.setDate(analyticsStart.getDate() - (analyticsDays - 1));
    }

    const dateKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(date.getDate()).padStart(2, "0")}`;

    const analyticsStartKey = dateKey(analyticsStart);
    const analyticsEndKey = dateKey(analyticsNow);

    const analyticsBills = bills.filter((bill) => {
      const billDate = normalizeDate(bill.billDate);
      return billDate >= analyticsStartKey && billDate <= analyticsEndKey;
    });

    const analyticsRevenue = analyticsBills.reduce(
      (sum, bill) => sum + Number(bill.total || 0),
      0,
    );

    const analyticsOutstanding = analyticsBills.reduce(
      (sum, bill) => sum + Number(bill.balance || 0),
      0,
    );

    const analyticsPayments = payments.filter((payment) => {
      const paymentDate = normalizeDate(payment.paymentDate);

      return paymentDate >= analyticsStartKey && paymentDate <= analyticsEndKey;
    });

    const analyticsCollected = analyticsPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

    // EXPENSE ANALYTICS
    const analyticsExpenses = expenses.filter((expense) => {
      const expenseDate = normalizeDate(expense.expense_date);

      return expenseDate >= analyticsStartKey && expenseDate <= analyticsEndKey;
    });

    const analyticsExpenseTotal = analyticsExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );

    // Actual collections minus recorded expenses
    const analyticsNetCashFlow = analyticsCollected - analyticsExpenseTotal;

    // Category-wise expense totals
    const analyticsExpensesByCategory = Object.entries(
      analyticsExpenses.reduce<Record<string, number>>((totals, expense) => {
        const category = expense.category || "Other";

        totals[category] =
          (totals[category] || 0) + Number(expense.amount || 0);

        return totals;
      }, {}),
    )
      .map(([category, amount]) => ({
        category,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    const analyticsBuckets: {
      label: string;
      revenue: number;
      collected: number;
    }[] = [];

    if (analyticsPeriod === "12m") {
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(
          analyticsStart.getFullYear(),
          analyticsStart.getMonth() + i,
          1,
        );

        const monthKey = `${monthDate.getFullYear()}-${String(
          monthDate.getMonth() + 1,
        ).padStart(2, "0")}`;

        const monthLabel = monthDate.toLocaleDateString("en-IN", {
          month: "short",
        });

        analyticsBuckets.push({
          label: monthLabel,
          revenue: analyticsBills
            .filter((bill) => normalizeDate(bill.billDate).startsWith(monthKey))
            .reduce((sum, bill) => sum + Number(bill.total || 0), 0),
          collected: analyticsPayments
            .filter((payment) =>
              normalizeDate(payment.paymentDate).startsWith(monthKey),
            )
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        });
      }
    } else {
      for (let i = 0; i < analyticsDays; i++) {
        const bucketDate = new Date(analyticsStart);
        bucketDate.setDate(analyticsStart.getDate() + i);

        const bucketKey = dateKey(bucketDate);

        analyticsBuckets.push({
          label:
            analyticsPeriod === "7d"
              ? bucketDate.toLocaleDateString("en-IN", { weekday: "short" })
              : String(bucketDate.getDate()),
          revenue: analyticsBills
            .filter((bill) => normalizeDate(bill.billDate) === bucketKey)
            .reduce((sum, bill) => sum + Number(bill.total || 0), 0),
          collected: analyticsPayments
            .filter(
              (payment) => normalizeDate(payment.paymentDate) === bucketKey,
            )
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        });
      }
    }

    const analyticsMaxValue = Math.max(
      1,
      ...analyticsBuckets.map((bucket) =>
        Math.max(bucket.revenue, bucket.collected),
      ),
    );

    const revenue = bills.reduce(
      (sum, bill) => sum + Number(bill.total || 0),
      0,
    );

    const paidAmount = bills.reduce(
      (sum, bill) => sum + Number(bill.paidAmount || 0),
      0,
    );

    const outstanding = bills.reduce(
      (sum, bill) => sum + Number(bill.balance || 0),
      0,
    );

    const isToday = (value: unknown) => {
      return normalizeDate(value) === todayKey;
    };

    const todaySales = bills
      .filter((bill) => isToday(bill.billDate))
      .reduce((sum, bill) => sum + Number(bill.total || 0), 0);

    const todayPayments = payments
      .filter((payment) => {
        const data = payment as Payment & {
          paymentDate?: string;
          payment_date?: string;
        };

        return isToday(data.paymentDate || data.payment_date);
      })
      .reduce((sum, payment) => {
        const data = payment as Payment & {
          amount?: number;
          paidAmount?: number;
        };

        return sum + Number(data.amount ?? data.paidAmount ?? 0);
      }, 0);

    const activeOrders = orders.filter((order) => order.status !== "Delivered");

    const deliveredOrders = orders.filter(
      (order) => order.status === "Delivered",
    );

    const overdueOrders = orders.filter(
      (order) => getDeliveryStatus(order) === "Overdue",
    );

    const dueTodayOrders = orders.filter(
      (order) => getDeliveryStatus(order) === "Due Today",
    );

    const upcomingOrders = orders.filter(
      (order) => getDeliveryStatus(order) === "Upcoming",
    );

    const readyOrders = orders.filter((order) => order.status === "Stitching");

    const attentionOrders = orders.filter((order) => {
      const delivery = getDeliveryStatus(order);

      return (
        delivery === "Overdue" ||
        delivery === "Due Today" ||
        order.status === "Stitching"
      );
    });

    const recentOrders = [...orders].reverse().slice(0, 5);

    const recentBills = [...bills].reverse().slice(0, 4);

    const getCount = (status: string) =>
      orders.filter((order) => order.status === status).length;

    const getOrderCustomerName = (order: Order) => {
      const data = order as Order & {
        customerName?: string;
      };

      if (data.customerName) {
        return data.customerName;
      }

      return (
        liveCustomers.find((customer) => customer.id === order.customerId)
          ?.name || "Customer"
      );
    };

    const getOrderItem = (order: Order) => {
      const data = order as Order & {
        item?: string;
        service?: string;
        dressType?: string;
      };

      return data.item || data.service || data.dressType || "Boutique Order";
    };

    /* =====================================================
       BUSINESS INTELLIGENCE
    ===================================================== */

    const totalCustomers = liveCustomers.length;

    const customersWithOrders = liveCustomers.filter(
      (customer) => customer.orders > 0,
    ).length;

    const customersWithoutOrders = liveCustomers.filter(
      (customer) => customer.orders === 0,
    ).length;

    const customersWithDue = liveCustomers.filter((customer) => {
      const customerDue = bills
        .filter((bill) => bill.customerId === customer.id)
        .reduce((sum, bill) => sum + Number(bill.balance || 0), 0);

      return customerDue > 0;
    }).length;

    const paidBills = bills.filter(
      (bill) => String(bill.status || "").toLowerCase() === "paid",
    ).length;

    const unpaidBills = bills.filter(
      (bill) => String(bill.status || "").toLowerCase() === "unpaid",
    ).length;

    const partiallyPaidBills = bills.filter(
      (bill) => String(bill.status || "").toLowerCase() === "partially paid",
    ).length;

    const paymentMethodTotals = {
      Cash: 0,
      UPI: 0,
      Card: 0,
      Other: 0,
    };

    payments.forEach((payment) => {
      const data = payment as Payment & {
        method?: string;
        paymentMethod?: string;
        amount?: number;
        paidAmount?: number;
      };

      const method = String(
        data.method || data.paymentMethod || "Other",
      ).toLowerCase();

      const amount = Number(data.amount ?? data.paidAmount ?? 0);

      if (method === "cash") {
        paymentMethodTotals.Cash += amount;
      } else if (method === "upi") {
        paymentMethodTotals.UPI += amount;
      } else if (method === "card") {
        paymentMethodTotals.Card += amount;
      } else {
        paymentMethodTotals.Other += amount;
      }
    });

    const totalPaymentValue = Object.values(paymentMethodTotals).reduce(
      (sum, value) => sum + value,
      0,
    );

    const averageOrderValue =
      orders.length > 0
        ? orders.reduce(
            (sum, order) =>
              sum + Number(order.price || 0) * Number(order.quantity || 1),
            0,
          ) / orders.length
        : 0;

    const completionRate =
      orders.length > 0
        ? Math.round((deliveredOrders.length / orders.length) * 100)
        : 0;

    const activeRate =
      orders.length > 0
        ? Math.round((activeOrders.length / orders.length) * 100)
        : 0;

    const getStatusColor = (status: string) => {
      switch (status) {
        case "Delivered":
          return colors.Green;

        case "Ready":
          return colors.Orange;

        case "Trial":
          return colors.Purple;

        case "Stitching":
          return colors.Blue;

        case "Cutting":
          return "#F57F17";

        case "Measurement":
          return colors.Magenta;

        default:
          return colors.PrimaryWine;
      }
    };

    const getDeliveryStyle = (delivery: DeliveryStatus) => {
      switch (delivery) {
        case "Overdue":
          return {
            backgroundColor: "#FFEBEE",
            color: colors.Red,
          };

        case "Due Today":
          return {
            backgroundColor: "#FFF3E0",
            color: colors.Orange,
          };

        case "Upcoming":
          return {
            backgroundColor: "#E3F2FD",
            color: colors.Blue,
          };

        case "Delivered":
          return {
            backgroundColor: "#E8F5E9",
            color: colors.Green,
          };

        default:
          return {
            backgroundColor: colors.LightGray,
            color: colors.Gray,
          };
      }
    };

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.homeContent}
      >
        {/* HERO */}

        <View style={styles.hero}>
          {/* BRAND AND NOTIFICATION ROW */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <Text style={styles.brand}>FEMME FATALE</Text>

            <View
              accessibilityLabel="Notifications"
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: "rgba(255,255,255,0.18)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.35)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={24}
                color="#FFFFFF"
              />
              <View
                style={{
                  position: "absolute",
                  top: 6,
                  right: 7,
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: "#FFB3D0",
                  borderWidth: 1,
                  borderColor: "#C2185B",
                }}
              />
            </View>
          </View>

          {/* TITLE AND DATE ROW */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.heroTitle}>Today at Your Boutique</Text>

              <Text style={styles.heroSubtitle}>
                Know your boutique. Run it smarter.
              </Text>
            </View>

            <View style={styles.todayBadge}>
              <Text style={styles.todayDayNumber}>{new Date().getDate()}</Text>

              <Text style={styles.todayWeekday}>
                {new Date()
                  .toLocaleDateString("en-IN", {
                    weekday: "short",
                  })
                  .toUpperCase()}
              </Text>

              <Text style={styles.todayMonthYear}>
                {new Date()
                  .toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })
                  .toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        {/* TODAY'S BUSINESS */}
        <Text style={styles.sectionTitle}>Today's Business</Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            rowGap: 12,
            marginBottom: 18,
          }}
        >
          {[
            {
              title: "Today's Sales",
              value: `Rs. ${todaySales.toLocaleString("en-IN")}`,
              icon: "cash-register",
              danger: false,
            },
            {
              title: "Today's Payments",
              value: `Rs. ${todayPayments.toLocaleString("en-IN")}`,
              icon: "credit-card-check-outline",
              danger: false,
            },
            {
              title: "Outstanding",
              value: `Rs. ${outstanding.toLocaleString("en-IN")}`,
              icon: "alert-circle-outline",
              danger: outstanding > 0,
            },
            {
              title: "Active Orders",
              value: String(activeOrders.length),
              icon: "clipboard-list-outline",
              danger: false,
            },
          ].map((item) => (
            <View
              key={item.title}
              style={{
                width: "48%",
                minHeight: 112,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: item.danger ? "#FFF0F5" : "#FFFFFF",
                borderRadius: 18,
                padding: 12,
                borderWidth: 1,
                borderColor: item.danger ? "#F3C1D5" : "#F0DCE5",
                elevation: 2,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 58,
                  borderRadius: 16,
                  backgroundColor: item.danger ? "#FADCE8" : "#FCE5EF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={27}
                  color="#C2185B"
                />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={2}
                  style={{
                    color: "#5F4551",
                    fontSize: 12,
                    fontWeight: "600",
                    lineHeight: 17,
                  }}
                >
                  {item.title}
                </Text>

                <Text
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  style={{
                    marginTop: 8,
                    color: item.danger ? "#C2185B" : "#8B1238",
                    fontSize: 19,
                    fontWeight: "900",
                  }}
                >
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* CUSTOMER LOOKUP */}
<View style={styles.customerLookupCard}>
  <View style={styles.customerLookupHeader}>
    <View>
      <Text style={styles.cardSectionTitle}>
        Customer Lookup
      </Text>

      <Text style={styles.cardSectionSubtitle}>
        Search by name, phone or order ID
      </Text>
    </View>

    <MaterialCommunityIcons
      name="account-search-outline"
      size={28}
      color={colors.PrimaryWine}
    />
  </View>

  <View style={styles.customerSearchBox}>
    <MaterialCommunityIcons
      name="magnify"
      size={22}
      color="#A3154B"
    />

    <TextInput
      value={customerLookup}
      onChangeText={setCustomerLookup}
      placeholder="Name, phone or FF-001"
      placeholderTextColor="#A98A96"
      style={styles.customerSearchInput}
      autoCapitalize="none"
      autoCorrect={false}
    />

    {customerLookup.length > 0 && (
      <TouchableOpacity
        onPress={() => setCustomerLookup("")}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="close-circle"
          size={20}
          color="#A98A96"
        />
      </TouchableOpacity>
    )}
  </View>

  {(() => {
    const search = customerLookup.trim().toLowerCase();

    if (!search) {
      return null;
    }

    const matchingCustomer = liveCustomers.find((customer) => {
      const nameMatch = customer.name
        .toLowerCase()
        .includes(search);

      const phoneMatch = customer.phone
        .toLowerCase()
        .includes(search);

      const orderMatch = orders.some(
        (order) =>
          order.customerId === customer.id &&
          order.orderNumber?.toLowerCase() === search,
      );

      return nameMatch || phoneMatch || orderMatch;
    });

    if (!matchingCustomer) {
      return (
        <View style={styles.customerLookupNoRecord}>
          <View style={styles.customerLookupNoRecordIcon}>
            <MaterialCommunityIcons
              name="account-plus-outline"
              size={27}
              color="#A3154B"
            />
          </View>

          <Text style={styles.customerLookupNoRecordTitle}>
            No record found
          </Text>

          <Text style={styles.customerLookupNoRecordSubtitle}>
            Register this customer and create a new order instantly.
          </Text>

          <TouchableOpacity
            style={styles.customerLookupRegisterButton}
            activeOpacity={0.82}
            onPress={() => {
              setNewCustomerForm({
                name: customerLookup.trim(),
                phone: "",
                email: "",
                address: "",
                notes: "",
              });

              setShowNewCustomerRegistration(true);
            }}
          >
            <MaterialCommunityIcons
              name="account-plus"
              size={19}
              color="#FFFFFF"
            />

            <Text style={styles.customerLookupRegisterButtonText}>
              Register & New Order
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    const customerOrders = orders
      .filter((order) => order.customerId === matchingCustomer.id)
      .sort(
        (a, b) =>
          new Date(b.orderDate).getTime() -
          new Date(a.orderDate).getTime(),
      );

    const previousOrder = customerOrders[0] || null;
    const customerMeasurementCount =
      measurements[matchingCustomer.id]?.length || 0;

    return (
      <View style={styles.customerLookupFound}>
        <View style={styles.customerLookupCustomerRow}>
          <View style={styles.customerLookupAvatar}>
            <Text style={styles.customerLookupAvatarText}>
              {matchingCustomer.name
                .trim()
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.customerLookupInfo}>
            <Text
              style={styles.customerLookupName}
              numberOfLines={1}
            >
              {matchingCustomer.name}
            </Text>

            <Text style={styles.customerLookupPhone}>
              {matchingCustomer.phone}
            </Text>
          </View>
        </View>

        <View style={styles.customerLookupDetails}>
          <View style={styles.customerLookupDetailItem}>
            <Text style={styles.customerLookupDetailLabel}>
              Previous Order
            </Text>

            <Text style={styles.customerLookupDetailValue}>
              {previousOrder?.orderNumber || "No previous order"}
            </Text>
          </View>

          <View style={styles.customerLookupDetailItem}>
            <Text style={styles.customerLookupDetailLabel}>
              Last Visit
            </Text>

            <Text style={styles.customerLookupDetailValue}>
              {previousOrder?.orderDate || "No visit yet"}
            </Text>
          </View>

          <View style={styles.customerLookupDetailItem}>
            <Text style={styles.customerLookupDetailLabel}>
              Measurements
            </Text>

            <Text style={styles.customerLookupDetailValue}>
              {customerMeasurementCount}
            </Text>
          </View>

          <View style={styles.customerLookupDetailItem}>
            <Text style={styles.customerLookupDetailLabel}>
              Vault
            </Text>

            <Text style={styles.customerLookupDetailValue}>
              0
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.customerLookupNewOrderButton}
          activeOpacity={0.82}
          onPress={() => {
            setSelectedCustomer(matchingCustomer);
            setOpenCreateForSelectedCustomer(true);
            setCurrentScreen("orders");
          }}
        >
          <MaterialCommunityIcons
            name="clipboard-plus-outline"
            size={20}
            color="#FFFFFF"
          />

          <Text style={styles.customerLookupNewOrderButtonText}>
            Create New Order For This Customer
          </Text>
        </TouchableOpacity>
      </View>
    );
  })()}
</View>

{showNewCustomerRegistration && (
  <View style={styles.newCustomerRegistrationCard}>

    <View style={styles.newCustomerRegistrationHeader}>

      <View style={styles.newCustomerRegistrationIcon}>
        <MaterialCommunityIcons
          name="account-plus-outline"
          size={24}
          color={colors.PrimaryWine}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.newCustomerRegistrationTitle}>
          Register New Customer
        </Text>

        <Text style={styles.newCustomerRegistrationSubtitle}>
          Add customer details and continue directly to a new order.
        </Text>
      </View>

    </View>

    <Text style={styles.newCustomerFieldLabel}>
      Customer Name (Optional)
    </Text>

    <TextInput
      style={styles.newCustomerInput}
      value={newCustomerForm.name}
      onChangeText={(text) =>
        setNewCustomerForm((previous) => ({
          ...previous,
          name: text,
        }))
      }
      placeholder="Enter customer name"
      placeholderTextColor="#B58A9D"
    />

    <Text style={styles.newCustomerFieldLabel}>
      Phone Number *
    </Text>

    <TextInput
      style={styles.newCustomerInput}
      value={newCustomerForm.phone}
      onChangeText={(text) =>
        setNewCustomerForm((previous) => ({
          ...previous,
          phone: text,
        }))
      }
      placeholder="Enter phone number"
      placeholderTextColor="#B58A9D"
      keyboardType="phone-pad"
    />



    <Text style={styles.newCustomerFieldLabel}>
      Notes
    </Text>

    <TextInput
      style={styles.newCustomerMultilineInput}
      value={newCustomerForm.notes}
      onChangeText={(text) =>
        setNewCustomerForm((previous) => ({
          ...previous,
          notes: text,
        }))
      }
      placeholder="Add any customer notes"
      placeholderTextColor="#B58A9D"
      multiline
      textAlignVertical="top"
    />

    <TouchableOpacity
      style={[
        styles.newCustomerContinueButton,
        savingNewCustomer && { opacity: 0.6 },
      ]}
      activeOpacity={0.82}
      disabled={savingNewCustomer}
      onPress={handleRegisterAndCreateOrder}
    >
      <MaterialCommunityIcons
        name={
          savingNewCustomer
            ? "loading"
            : "account-check-outline"
        }
        size={21}
        color="#FFFFFF"
      />

      <Text style={styles.newCustomerContinueButtonText}>
        {savingNewCustomer
          ? "Saving Customer..."
          : "Save Customer & Continue"}
      </Text>
    </TouchableOpacity>

  </View>
)}

{/* QUICK ACTIONS */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.cardSectionTitle}>Quick Actions</Text>

          <Text style={styles.cardSectionSubtitle}>
            Manage your boutique faster
          </Text>

          <View style={styles.quickActionsRow}>

            <TouchableOpacity
              style={styles.quickActionButton}
              activeOpacity={0.8}
              onPress={() => setCurrentScreen("orders")}
            >
              <MaterialCommunityIcons
                name="clipboard-plus-outline"
                size={25}
                color={colors.PrimaryWine}
              />
              <Text style={styles.quickActionText}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              activeOpacity={0.8}
              onPress={() => setCurrentScreen("billing")}
            >
              <MaterialCommunityIcons
                name="receipt-text-plus"
                size={25}
                color={colors.PrimaryWine}
              />
              <Text style={styles.quickActionText}>Billing</Text>
            </TouchableOpacity>
            
          </View>
        </View>
        {/* FABRIC & MATERIALS EXPENSE SUMMARY */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setCurrentScreen("expenses")}
          style={{
            backgroundColor: "#C2185B",
            borderRadius: 22,
            padding: 20,
            marginBottom: 18,
            overflow: "hidden",
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 18,
                backgroundColor: "#FFF0F6",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              <MaterialCommunityIcons
                name="tshirt-crew-outline"
                size={34}
                color="#A3154B"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 18,
                  fontWeight: "900",
                }}
              >
                Fabric & Materials
              </Text>

              <Text
                style={{
                  color: "#FFE3ED",
                  fontSize: 12,
                  marginTop: 5,
                  lineHeight: 17,
                }}
              >
                Today's fabric and materials spending
              </Text>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={27}
              color="#FFFFFF"
            />
          </View>

          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 29,
              fontWeight: "900",
              marginTop: 18,
            }}
          >
            Rs.{" "}
            {todayFabricExpenseTotal.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>

          <Text
            style={{
              color: "#FFE3ED",
              fontSize: 12,
              marginTop: 5,
            }}
          >
            Tap to record or view fabric expenses
          </Text>
        </TouchableOpacity>
        {/* RECENT ORDERS */}

        <View style={styles.recentSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitleInside}>Recent Orders</Text>

              <Text style={styles.cardSectionSubtitle}>
                Latest boutique activity
              </Text>
            </View>

            <TouchableOpacity onPress={() => setCurrentScreen("orders")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <EmptyDashboard
              icon="clipboard-list-outline"
              title="No orders yet"
              subtitle="Create your first boutique order."
            />
          ) : (
            recentOrders.map((order) => {
              const progress = getProgressPercent(
                String(order.status || "New"),
              );

              const delivery = getDeliveryStatus(order);

              const deliveryStyle = getDeliveryStyle(delivery);

              return (
                <TouchableOpacity
                  key={String(order.id)}
                  style={styles.orderCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedCustomer(
                      liveCustomers.find(
                        (customer) => customer.id === order.customerId,
                      ) || null,
                    );

                    setCurrentScreen("orders");
                  }}
                >
                  <View style={styles.orderCardHeader}>

  <View style={styles.recentIcon}>
    <Text style={styles.recentIconText}>
      {getOrderCustomerName(order)?.trim()?.charAt(0)?.toUpperCase() || "?"}
    </Text>
  </View>


  <View style={styles.recentMain}>

    <Text style={styles.recentTitle} numberOfLines={1}>
      {getOrderCustomerName(order)}
    </Text>


    <Text style={styles.recentSubtitle} numberOfLines={1}>
      {getOrderItem(order)}
    </Text>


    <Text style={styles.orderIdText}>
      Boutique Order
    </Text>

  </View>


  <View style={styles.orderRight}>

    <Text
      style={[
        styles.deliverySmall,
        {
          backgroundColor: deliveryStyle.backgroundColor,
          color: deliveryStyle.color,
        },
      ]}
    >
      {delivery}
    </Text>


    <Text style={styles.orderProgressText}>
      {progress}%
    </Text>

  </View>

</View>
<View style={styles.orderProgressRow}>
                    <Text style={styles.orderStageText}>
                      {String(order.status || "New")}
                    </Text>

                    <Text style={styles.orderStageCount}>Stage</Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progress}%`,
                          backgroundColor: getStatusColor(
                            String(order.status || "New"),
                          ),
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* RECENT BILLS */}

        <View style={styles.recentSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleInside}>Recent Bills</Text>

            <TouchableOpacity onPress={() => setCurrentScreen("billing")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentBills.length === 0 ? (
            <EmptyDashboard
              icon="cash-multiple"
              title="No bills yet"
              subtitle="Create a bill after completing an order."
            />
          ) : (
            recentBills.map((bill) => (
              <TouchableOpacity
                key={String(bill.id)}
                style={styles.recentCard}
                activeOpacity={0.85}
                onPress={() => setCurrentScreen("billing")}
              >
                <View style={styles.recentIcon}>
                  <Text style={styles.recentIconText}>Rs.</Text>
                </View>

                <View style={styles.recentMain}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {bill.customerName || "Customer"}
                  </Text>

                  <Text style={styles.recentSubtitle} numberOfLines={1}>
                    {bill.billNumber || bill.id || "Bill"}
                  </Text>
                </View>

                <View style={styles.billAmountWrap}>
                  <Text style={styles.billAmount}>
                    Rs.
                    {Number(bill.total || 0).toLocaleString("en-IN")}
                  </Text>

                  <Text style={styles.billStatus}>
                    {String(bill.status || "Unpaid")}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* LOGOUT */}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  /* =========================================================
     SCREEN ROUTER
  ========================================================= */

  const renderScreen = () => {
    switch (currentScreen) {
      case "customers":
        return (
          <CustomersScreen
            customers={liveCustomers}
            measurements={measurements}
            orders={orders}
            bills={bills}
            payments={payments}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onOpenMeasurements={(customer) => {
              setSelectedCustomer(customer);
              setCurrentScreen("measurements");
            }}
            onOpenOrders={(customer) => {
              setSelectedCustomer(customer);
              setCurrentScreen("orders");
            }}
            onOpenBilling={(customer) => {
              setSelectedCustomer(customer);
              setCurrentScreen("billing");
            }}
            onAddPayment={(customer) => {
              setSelectedCustomer(customer);
              setCurrentScreen("billing");
            }}
          />
        );

      case "measurements":
        if (!selectedCustomer) {
          return renderHome();
        }

        return (
          <MeasurementsScreen
            customer={selectedCustomer}
            measurements={customerMeasurements}
            onAddMeasurement={(measurement) =>
              handleAddMeasurement(selectedCustomer.id, measurement)
            }
            onUpdateMeasurement={(measurementId, measurement) =>
              handleUpdateMeasurement(
                selectedCustomer.id,
                measurementId,
                measurement,
              )
            }
            onDeleteMeasurement={(measurementId) =>
              handleDeleteMeasurement(selectedCustomer.id, measurementId)
            }
          />
        );

      case "orders":
        return (
          <OrdersScreen
            customers={liveCustomers}
            selectedCustomer={selectedCustomer}
            openCreateForSelectedCustomer={openCreateForSelectedCustomer}
            onCreateFormOpened={() => setOpenCreateForSelectedCustomer(false)}
            onCreateCustomer={handleAddCustomer}
            measurements={measurements}
            orders={orders}
            onCreateOrder={handleCreateOrder}
            onUpdateOrder={handleUpdateOrder}
            onDeleteOrder={async (orderId) => {
              await deleteOrder(orderId);

              setOrders((previous) =>
                previous.filter((item) => item.id !== orderId),
              );
            }}
            onBack={() => {
              setCurrentScreen("home");
              setSelectedCustomer(null);
            }}
          />
        );

      case "billing":
        return (
          <BillingScreen
            customers={liveCustomers}
            orders={orders}
            bills={bills}
            payments={payments}
            onCreateBill={handleCreateBill}
            onUpdateBill={handleUpdateBill}
            onAddPayment={handleAddPayment}
            onBack={() => {
              setCurrentScreen("home");
            }}
            onOpenReceipt={() => {
              setCurrentScreen("receipt");
            }}
          />
        );

      case "staff":
        return <StaffScreen onBack={() => setCurrentScreen("home")} />;

      case "expenses":
        return (
          <ExpensesScreen
            onBack={() => {
              setCurrentScreen("home");
              void loadAllData();
            }}
          />
        );

      case "receipt":
        return (
          <ReceiptScreen
            bills={bills}
            customers={liveCustomers}
            onBack={() => {
              setCurrentScreen("billing");
            }}
          />
        );

      case "sketch":
        return (
          <SketchScreen
            onBack={() => setCurrentScreen("home")}
            onGenerateReceipt={() => setCurrentScreen("receipt")}
          />
        );

      case "home":
      default:
        return renderHome();
    }
  };

  /* =========================================================
     MAIN UI
  ========================================================= */

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenContainer}>
        

        <View style={styles.appHeader}>
          <Text style={styles.appBrand}>
            FEMME FATALE BOUTIQUE
          </Text>
        </View>
{loading ? (
          <View style={styles.refreshOverlay}>
            <ActivityIndicator color={colors.PrimaryWine} />
          </View>
        ) : null}

        {renderScreen()}
      </View>

      <View style={styles.bottomNav}>
        <NavButton
          label="Boutique"
          icon="store-outline"
          active={currentScreen === "home"}
          onPress={() => {
            setSelectedCustomer(null);
            setCurrentScreen("home");
          }}
        />

        <NavButton
          label="Orders"
          icon="clipboard-list-outline"
          active={currentScreen === "orders"}
          onPress={() => setCurrentScreen("orders")}
        />

        <NavButton
          label="Billing"
          icon="receipt-text-outline"
          active={currentScreen === "billing"}
          onPress={() => setCurrentScreen("billing")}
        />
        <NavButton
          label="Staff"
          icon="account-group-outline"
          active={currentScreen === "staff"}
          onPress={() => setCurrentScreen("staff")}
        />
      

      </View></SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
/* =========================================================
   STAT CARD
========================================================= */
function StatCard({
  title,
  value,
  icon,
  danger,
}: {
  title: string;
  value: string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statTopRow}>
        <Text style={styles.statTitle}>{title}</Text>

        <View style={[styles.statIcon, danger && styles.statIconDanger]}>
          <MaterialCommunityIcons
            name={icon as any}
            size={21}
            color={danger ? colors.Red : colors.PrimaryWine}
          />
        </View>
      </View>

      <Text style={[styles.statValue, danger && { color: colors.Red }]}>
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   FINANCE ITEM
========================================================= */

function FinanceItem({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.financeItem}>
      <Text style={styles.financeLabel}>{label}</Text>

      <Text
        style={[
          styles.financeValue,
          danger && {
            color: colors.Red,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   INSIGHT METRIC
========================================================= */

function InsightMetric({
  label,
  value,
  icon,
  danger,
}: {
  label: string;
  value: number;
  icon: string;
  danger?: boolean;
}) {
  return (
    <View style={[styles.insightMetric, danger && styles.insightMetricDanger]}>
      <View style={[styles.insightIcon, danger && styles.insightIconDanger]}>
        <Text style={styles.insightIconText}>{icon}</Text>
      </View>

      <Text
        style={[
          styles.insightMetricValue,
          danger && {
            color: colors.Red,
          },
        ]}
      >
        {value}
      </Text>

      <Text style={styles.insightMetricLabel}>{label}</Text>
    </View>
  );
}

/* =========================================================
   PAYMENT METHOD ROW
========================================================= */

function PaymentMethodRow({
  label,
  value,
  total,
  icon,
  last,
}: {
  label: string;
  value: number;
  total: number;
  icon: string;
  last?: boolean;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <View
      style={[styles.paymentMethodRow, last && styles.paymentMethodRowLast]}
    >
      <View style={styles.paymentMethodIcon}>
        <Text style={styles.paymentMethodIconText}>{icon}</Text>
      </View>

      <View style={styles.paymentMethodMain}>
        <View style={styles.paymentMethodTop}>
          <Text style={styles.paymentMethodLabel}>{label}</Text>

          <Text style={styles.paymentMethodValue}>
            Rs.
            {Math.round(value).toLocaleString("en-IN")}
          </Text>
        </View>

        <View style={styles.paymentBarTrack}>
          <View
            style={[
              styles.paymentBarFill,
              {
                width: `${percentage}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.paymentPercentage}>{percentage}% of payments</Text>
      </View>
    </View>
  );
}

/* =========================================================
   BILLING METRIC
========================================================= */

function BillingMetric({
  label,
  value,
  color,
  background,
}: {
  label: string;
  value: number;
  color: string;
  background: string;
}) {
  return (
    <View
      style={[
        styles.billingMetric,
        {
          backgroundColor: background,
        },
      ]}
    >
      <Text
        style={[
          styles.billingMetricValue,
          {
            color,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.billingMetricLabel,
          {
            color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   DELIVERY METRIC
========================================================= */

function DeliveryMetric({
  label,
  value,
  color,
  background,
}: {
  label: string;
  value: number;
  color: string;
  background: string;
}) {
  return (
    <View
      style={[
        styles.deliveryMetric,
        {
          backgroundColor: background,
        },
      ]}
    >
      <Text
        style={[
          styles.deliveryMetricValue,
          {
            color,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.deliveryMetricLabel,
          {
            color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   PIPELINE ROW
========================================================= */

function PipelineRow({
  label,
  value,
  percentage,
  index,
  last,
}: {
  label: string;
  value: number;
  percentage: number;
  index: number;
  last?: boolean;
}) {
  return (
    <View style={[styles.pipelineRow, last && styles.pipelineRowLast]}>
      <View style={styles.pipelineLabelWrap}>
        <View
          style={[
            styles.pipelineDot,
            {
              backgroundColor: STATUS_COLORS[index],
            },
          ]}
        />

        <View>
          <Text style={styles.pipelineLabel}>{label}</Text>

          <Text style={styles.pipelinePercent}>{percentage}% of orders</Text>
        </View>
      </View>

      <Text style={styles.pipelineValue}>{value}</Text>
    </View>
  );
}

const STATUS_COLORS = [
  "#8B1238",
  "#C2185B",
  "#F57F17",
  "#1565C0",
  "#7B1FA2",
  "#EF6C00",
  "#2E7D32",
];

/* =========================================================
   OVERVIEW ROW
========================================================= */

function OverviewRow({
  label,
  value,
  danger,
  last,
}: {
  label: string;
  value: number | string;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.overviewRow, last && styles.overviewRowLast]}>
      <Text style={styles.overviewLabel}>{label}</Text>

      <Text
        style={[
          styles.overviewValue,
          danger && {
            color: colors.Red,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   EMPTY DASHBOARD
========================================================= */

function EmptyDashboard({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.emptyDashboard}>
      <View style={styles.emptyIconCircle}>
        <MaterialCommunityIcons
          name={icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
          size={22}
          color={colors.PrimaryWine}
        />
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>

      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

/* =========================================================
   NAV BUTTON
========================================================= */
function NavButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.navButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={23}
        color={active ? colors.PrimaryWine : colors.Gray}
      />

      <Text
        style={[
          styles.navLabel,
          active && {
            color: colors.PrimaryWine,
            fontWeight: "900",
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.Cream,
  },

  screenContainer: {
    flex: 1,
  },

  appHeader: {
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8EB",
  },

  appBrand: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.PrimaryWine,
    letterSpacing: 1,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: colors.Cream,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: colors.DarkText,
    fontSize: 14,
    fontWeight: "600",
  },

  refreshOverlay: {
    position: "absolute",
    top: 10,
    right: 20,
    zIndex: 20,
  },

  homeContent: {
    padding: 18,
    paddingBottom: 40,
    backgroundColor: "#FFF5F8",
  },

  hero: {
    backgroundColor: "#C2185B",
    borderRadius: 24,
    padding: 21,
    marginBottom: 20,
    borderColor: "#A3154B",
    borderWidth: 1,
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
  },

  heroBrandWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  brand: {
    color: "#FFE3ED",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
    flexShrink: 1,
  },

  heroTitle: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    flexShrink: 1,
  },

  heroSubtitle: {
    marginTop: 5,
    color: "#FFE3ED",
    fontSize: 13,
  },

  todayBadge: {
    minWidth: 66,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    borderColor: "#F5B6CF",
    borderWidth: 1,
  },

  todayBadgeText: {
    color: "#C2185B",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  todayDateColumn: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
    backgroundColor: "#FFFFFF",
  },

  todayDayNumber: {
    color: "#B51655",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
  },

  todayWeekday: {
    marginTop: 2,
    color: "#C2185B",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  todayMonthYear: {
    marginTop: 3,
    color: "#777777",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },

  sectionTitle: {
    fontSize: 18,
    color: "#B51655",
    fontWeight: "900",
    marginBottom: 11,
  },

  sectionTitleInside: {
    fontSize: 17,
    color: "#B51655",
    fontWeight: "900",
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  cardSectionTitle: {
    color: "#B51655",
    fontSize: 17,
    fontWeight: "900",
  },

  cardSectionSubtitle: {
    marginTop: 3,
    color: colors.Gray,
    fontSize: 10,
    fontWeight: "600",
  },

  viewAllText: {
    color: "#C2185B",
    fontSize: 12,
    fontWeight: "800",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    columnGap: 0,
    rowGap: 12,
    marginBottom: 18,
  },

  statCard: {
    width: "48%",
    minHeight: 118,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0C3D5",
    elevation: 2,
  },

  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statTitle: {
    flex: 1,
    fontSize: 11,
    color: colors.Gray,
    fontWeight: "700",
  },

  statIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: "#FCE0EB",
    alignItems: "center",
    justifyContent: "center",
  },

  statIconDanger: {
    backgroundColor: "#FFEBEE",
  },

  statIconText: {
    color: "#C2185B",
    fontSize: 13,
    fontWeight: "900",
  },

  statValue: {
    marginTop: 10,
    fontSize: 19,
    color: colors.PrimaryWine,
    fontWeight: "900",
  },

  financeCard: {
    backgroundColor: colors.White,
    borderRadius: 17,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8DDE1",
  },

  financeGrid: {
    flexDirection: "row",
    marginTop: 15,
  },

  financeItem: {
    flex: 1,
    alignItems: "center",
  },

  financeLabel: {
    color: colors.Gray,
    fontSize: 10,
    fontWeight: "700",
  },

  financeValue: {
    marginTop: 6,
    color: colors.PrimaryWine,
    fontSize: 14,
    fontWeight: "900",
  },

  performanceDivider: {
    height: 1,
    backgroundColor: "#F0E8EB",
    marginVertical: 15,
  },

  performanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  performanceRight: {
    alignItems: "flex-end",
  },

  performanceLabel: {
    color: colors.Gray,
    fontSize: 10,
    fontWeight: "700",
  },

  performanceValue: {
    marginTop: 5,
    color: colors.PrimaryWine,
    fontSize: 15,
    fontWeight: "900",
  },

  analyticsExpenseBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFF9F2",
    borderWidth: 1,
    borderColor: "#E8DDE1",
  },

  analyticsExpenseHeading: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.DarkText,
    marginBottom: 10,
  },

  analyticsExpenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8EB",
  },

  analyticsExpenseCategory: {
    flex: 1,
    fontSize: 22,
    color: colors.DarkText,
    fontWeight: "600",
    marginRight: 10,
  },

  analyticsExpenseAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.PrimaryWine,
  },
  analyticsCard: {
    backgroundColor: colors.White,
    borderRadius: 17,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8DDE1",
  },

  analyticsPeriodRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 16,
    marginBottom: 16,
  },

  analyticsPeriodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#F7F1F3",
    borderWidth: 1,
    borderColor: "#E8DDE1",
  },

  analyticsPeriodButtonActive: {
    backgroundColor: colors.PrimaryWine,
    borderColor: colors.PrimaryWine,
  },

  analyticsPeriodText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.Gray,
  },

  analyticsPeriodTextActive: {
    color: colors.White,
  },

  analyticsSummary: {
    flexDirection: "row",
    gap: 10,
  },

  analyticsSummaryItem: {
    flex: 1,
    backgroundColor: "#FFF9F2",
    borderRadius: 12,
    padding: 12,
  },

  analyticsSummaryLabel: {
    fontSize: 11,
    color: colors.Gray,
    fontWeight: "700",
  },

  analyticsSummaryValue: {
    marginTop: 7,
    fontSize: 16,
    fontWeight: "900",
    color: colors.PrimaryWine,
  },

  analyticsOutstandingBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFF1F0",
  },

  analyticsOutstandingValue: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: "900",
    color: colors.Red,
  },

  analyticsLegend: {
    flexDirection: "row",
    gap: 18,
    marginTop: 18,
    marginBottom: 8,
  },

  analyticsLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  analyticsLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  analyticsLegendText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.Gray,
  },

  analyticsChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 155,
    paddingTop: 8,
  },

  analyticsChartColumn: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },

  analyticsBarArea: {
    height: 125,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  analyticsBarPair: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
    height: 115,
  },

  analyticsBar: {
    width: 5,
    minHeight: 2,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  analyticsRevenueBar: {
    backgroundColor: colors.PrimaryWine,
  },

  analyticsCollectedBar: {
    backgroundColor: colors.Green,
  },

  analyticsChartLabel: {
    marginTop: 5,
    fontSize: 9,
    color: colors.Gray,
    fontWeight: "700",
    textAlign: "center",
  },

  analyticsEmptyText: {
    marginTop: 12,
    textAlign: "center",
    color: colors.Gray,
    fontSize: 22,
  },

  intelligenceCard: {
    backgroundColor: colors.White,
    borderRadius: 17,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8DDE1",
  },

  attentionCount: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.SoftPink,
    color: colors.PrimaryWine,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 14,
    fontWeight: "900",
    overflow: "hidden",
    paddingTop: 8,
  },

  deliveryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  deliveryMetric: {
    width: "48%",
    minHeight: 72,
    borderRadius: 13,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  deliveryMetricValue: {
    fontSize: 21,
    fontWeight: "900",
  },

  deliveryMetricLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "800",
  },

  attentionCard: {
    backgroundColor: colors.White,
    borderRadius: 17,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#E8DDE1",
  },

  attentionOrder: {
    backgroundColor: "#FFFDFC",
    borderRadius: 13,
    padding: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#F0E8EB",
  },

  attentionOrderTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  attentionOrderMain: {
    flex: 1,
    marginRight: 8,
  },

  orderCustomer: {
    color: colors.DarkText,
    fontSize: 13,
    fontWeight: "900",
  },

  orderItem: {
    marginTop: 3,
    color: colors.Gray,
    fontSize: 10,
  },

  orderIdText: {
    marginTop: 3,
    color: colors.Gray,
    fontSize: 10,
  },

  deliveryBadge: {
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 7,
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
  },

  progressMeta: {
    marginTop: 11,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  progressStage: {
    color: colors.Gray,
    fontSize: 10,
    fontWeight: "800",
  },

  progressPercent: {
    color: colors.PrimaryWine,
    fontSize: 10,
    fontWeight: "900",
  },

  progressTrack: {
    height: 6,
    backgroundColor: "#F0E8EB",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 6,
  },

  progressFill: {
    height: "100%",
    borderRadius: 5,
  },

  clearCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 17,
    padding: 15,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },

  clearIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.White,
    color: colors.Green,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    paddingTop: 6,
  },

  clearMain: {
    flex: 1,
    marginLeft: 11,
  },

  clearTitle: {
    color: colors.Green,
    fontSize: 13,
    fontWeight: "900",
  },

  clearSubtitle: {
    marginTop: 3,
    color: "#4E6B50",
    fontSize: 10,
  },

  customerInsightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  insightMetric: {
    width: "48%",
    minHeight: 92,
    borderRadius: 13,
    backgroundColor: "#FFF8FB",
    borderWidth: 1,
    borderColor: "#F0E1E7",
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  insightMetricDanger: {
    backgroundColor: "#FFF7F7",
    borderColor: "#F5D5D5",
  },

  insightIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: colors.SoftPink,
    alignItems: "center",
    justifyContent: "center",
  },

  insightIconDanger: {
    backgroundColor: "#FFEBEE",
  },

  insightIconText: {
    color: colors.PrimaryWine,
    fontSize: 22,
    fontWeight: "900",
  },

  insightMetricValue: {
    marginTop: 6,
    color: colors.PrimaryWine,
    fontSize: 18,
    fontWeight: "900",
  },

  insightMetricLabel: {
    marginTop: 2,
    color: colors.Gray,
    fontSize: 9,
    fontWeight: "700",
  },

  paymentTotal: {
    color: colors.PrimaryWine,
    fontSize: 13,
    fontWeight: "900",
  },

  paymentMethodRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8EB",
  },

  paymentMethodRowLast: {
    borderBottomWidth: 0,
  },

  paymentMethodIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.SoftPink,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentMethodIconText: {
    color: colors.PrimaryWine,
    fontSize: 13,
    fontWeight: "900",
  },

  paymentMethodMain: {
    flex: 1,
    marginLeft: 10,
  },

  paymentMethodTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  paymentMethodLabel: {
    color: colors.DarkText,
    fontSize: 11,
    fontWeight: "800",
  },

  paymentMethodValue: {
    color: colors.PrimaryWine,
    fontSize: 11,
    fontWeight: "900",
  },

  paymentBarTrack: {
    height: 5,
    backgroundColor: "#F0E8EB",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 6,
  },

  paymentBarFill: {
    height: "100%",
    backgroundColor: colors.PrimaryWine,
    borderRadius: 5,
  },

  paymentPercentage: {
    marginTop: 3,
    color: colors.Gray,
    fontSize: 8,
  },

  billingStatusGrid: {
    flexDirection: "row",
    gap: 8,
  },

  billingMetric: {
    flex: 1,
    minHeight: 72,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  billingMetricValue: {
    fontSize: 21,
    fontWeight: "900",
  },

  billingMetricLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "800",
  },

  pipeline: {
    backgroundColor: colors.White,
    borderRadius: 17,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#E8DDE1",
  },

  pipelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8EB",
  },

  pipelineRowLast: {
    borderBottomWidth: 0,
  },

  pipelineLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
  },

  pipelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 10,
  },

  pipelineLabel: {
    color: colors.DarkText,
    fontSize: 22,
    fontWeight: "800",
  },

  pipelinePercent: {
    marginTop: 2,
    color: colors.Gray,
    fontSize: 9,
  },

  pipelineValue: {
    minWidth: 30,
    textAlign: "right",
    color: colors.PrimaryWine,
    fontSize: 15,
    fontWeight: "900",
  },

  productionSummary: {
    flexDirection: "row",
    marginTop: 16,
    marginBottom: 15,
  },

  productionItem: {
    flex: 1,
    alignItems: "center",
  },

  productionValue: {
    color: colors.PrimaryWine,
    fontSize: 22,
    fontWeight: "900",
  },

  productionLabel: {
    marginTop: 3,
    color: colors.Gray,
    fontSize: 9,
    fontWeight: "700",
  },

  productionProgressTrack: {
    height: 7,
    backgroundColor: "#F0E8EB",
    borderRadius: 6,
    overflow: "hidden",
  },

  productionProgressFill: {
    height: "100%",
    backgroundColor: colors.Green,
    borderRadius: 6,
  },

  productionProgressText: {
    marginTop: 7,
    color: colors.Green,
    fontSize: 10,
    fontWeight: "900",
  },

  productionSecondaryText: {
    marginTop: 3,
    color: colors.Gray,
    fontSize: 9,
  },

  recentSection: {
    marginTop: 6,
    marginBottom: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0C3D5",
  },

  orderCard: {
    backgroundColor: "#FFF8FB",
    borderRadius: 16,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#F0C3D5",
  },

  orderCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  recentCard: {
    minHeight: 68,
    backgroundColor: colors.White,
    borderRadius: 15,
    marginBottom: 9,
    padding: 11,
    borderWidth: 1,
    borderColor: "#E8DDE1",
    flexDirection: "row",
    alignItems: "center",
  },

  recentIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.SoftPink,
    borderWidth: 1,
    borderColor: "#F8BBD0",
    alignItems: "center",
    justifyContent: "center",
  },

  recentIconText: {
    color: colors.PrimaryWine,
    fontSize: 16,
    fontWeight: "900",
  },

  recentMain: {
    flex: 1,
    marginLeft: 11,
    marginRight: 7,
  },

  recentTitle: {
    color: colors.DarkText,
    fontSize: 13,
    fontWeight: "900",
  },

  recentSubtitle: {
    marginTop: 4,
    color: colors.Gray,
    fontSize: 11,
  },

  orderRight: {
    alignItems: "flex-end",
  },

  deliverySmall: {
    overflow: "hidden",
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 8,
    fontWeight: "900",
  },

  orderProgressText: {
    marginTop: 5,
    color: colors.PrimaryWine,
    fontSize: 10,
    fontWeight: "900",
  },

  orderProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 11,
  },

  orderStageText: {
    color: colors.PrimaryWine,
    fontSize: 10,
    fontWeight: "900",
  },

  orderStageCount: {
    color: colors.Gray,
    fontSize: 9,
  },

  billAmountWrap: {
    alignItems: "flex-end",
  },

  billAmount: {
    color: colors.PrimaryWine,
    fontSize: 13,
    fontWeight: "900",
  },

  billStatus: {
    marginTop: 4,
    color: colors.Gray,
    fontSize: 9,
    fontWeight: "700",
  },

  emptyDashboard: {
    backgroundColor: colors.White,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E8DDE1",
    alignItems: "center",
    paddingVertical: 25,
    paddingHorizontal: 18,
  },

  emptyIconCircle: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: colors.SoftPink,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    color: colors.PrimaryWine,
    fontSize: 20,
  },

  emptyTitle: {
    marginTop: 10,
    color: colors.DarkText,
    fontSize: 13,
    fontWeight: "900",
  },

  emptySubtitle: {
    marginTop: 5,
    color: colors.Gray,
    fontSize: 11,
    textAlign: "center",
  },

  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8EB",
  },

  overviewRowLast: {
    borderBottomWidth: 0,
  },

  overviewLabel: {
    color: colors.Gray,
    fontSize: 13,
  },

  overviewValue: {
    color: colors.PrimaryWine,
    fontSize: 14,
    fontWeight: "900",
  },

  logoutButton: {
    borderWidth: 1,
    borderColor: colors.PrimaryWine,
    borderRadius: 13,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  logoutText: {
    color: colors.PrimaryWine,
    fontWeight: "900",
  },

  bottomNav: {
    minHeight: 70,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0D5E0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 2,
  },

  navButton: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    paddingVertical: 3,
    paddingHorizontal: 0,
  },

  navIcon: {
    fontSize: 22,
    color: "#C2185B",
  },

  navLabel: {
    marginTop: 3,
    fontSize: 9,
    color: "#B51655",
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
  },
  newCustomerRegistrationCard: {
    marginTop: 14,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0C3D5",
  },

  newCustomerRegistrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  newCustomerRegistrationIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  newCustomerRegistrationTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.DarkText,
  },

  newCustomerRegistrationSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: colors.Gray,
  },

  newCustomerFieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.DarkText,
    marginBottom: 7,
    marginTop: 10,
  },

  newCustomerInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#F0C3D5",
    borderRadius: 13,
    backgroundColor: "#FFF8FB",
    paddingHorizontal: 13,
    fontSize: 14,
    color: colors.DarkText,
  },

  newCustomerMultilineInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: "#F0C3D5",
    borderRadius: 13,
    backgroundColor: "#FFF8FB",
    paddingHorizontal: 13,
    paddingTop: 12,
    fontSize: 14,
    color: colors.DarkText,
  },

  newCustomerContinueButton: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: colors.PrimaryWine,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  newCustomerContinueButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },
  customerLookupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F0C3D5",
    elevation: 2,
  },

  customerLookupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  customerSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F6",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8A5C0",
    paddingHorizontal: 13,
    marginTop: 16,
    minHeight: 50,
  },

  customerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#242124",
    paddingHorizontal: 9,
    paddingVertical: 10,
  },

  customerLookupResults: {
    marginTop: 16,
  },

  customerLookupLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8F4564",
    marginBottom: 9,
  },

  customerLookupItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8FB",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F3D6E1",
    paddingVertical: 10,
    paddingHorizontal: 11,
    marginBottom: 8,
  },

  customerLookupAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FCE4EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  customerLookupAvatarText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#B51655",
  },

  customerLookupInfo: {
    flex: 1,
    marginRight: 8,
  },

  customerLookupName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#242124",
    marginBottom: 2,
  },

  customerLookupPhone: {
    fontSize: 12,
    color: "#777777",
  },

  customerLookupEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },

  customerLookupEmptyText: {
    marginTop: 6,
    fontSize: 12,
    color: "#8F4564",
    fontWeight: "700",
  },
  quickActionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F0C3D5",
    elevation: 2,
  },

  quickActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginTop: 16,
  },

  quickActionButton: {
    width: "48%",
    flexBasis: "48%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F6",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8A5C0",
    paddingVertical: 18,
    gap: 9,
  },

  customerLookupNoRecord: {
    marginTop: 16,
    alignItems: "center",
    backgroundColor: "#FFF8FB",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0C3D5",
    padding: 18,
  },

  customerLookupNoRecordIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE8F1",
    marginBottom: 10,
  },

  customerLookupNoRecordTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7D2147",
    marginBottom: 5,
  },

  customerLookupNoRecordSubtitle: {
    fontSize: 12,
    color: "#8F4564",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
  },

  customerLookupRegisterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A3154B",
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
  },

  customerLookupRegisterButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 7,
  },

  customerLookupFound: {
    marginTop: 16,
    backgroundColor: "#FFF8FB",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0C3D5",
    padding: 15,
  },

  customerLookupCustomerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  customerLookupDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 15,
    marginHorizontal: -4,
  },

  customerLookupDetailItem: {
    width: "50%",
    paddingHorizontal: 4,
    marginBottom: 12,
  },

  customerLookupDetailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9B647A",
    marginBottom: 3,
    textTransform: "uppercase",
  },

  customerLookupDetailValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4A2434",
  },

  customerLookupNewOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A3154B",
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 3,
  },

  customerLookupNewOrderButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 7,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#A3154B",
    textAlign: "center",
  },
});
































