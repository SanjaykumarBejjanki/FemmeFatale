import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Session } from "@supabase/supabase-js";

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
} from "./lib/measurementService";

import {
  createOrder as createSupabaseOrder,
  fetchOrders,
  updateOrder as updateSupabaseOrder,
} from "./lib/orderService";

import AuthScreen from "./screens/auth/AuthScreen";

import CustomersScreen, {
  Customer,
} from "./screens/CustomersScreen";

import MeasurementsScreen, {
  Measurement,
} from "./screens/measurements/MeasurementsScreen";

import OrdersScreen, {
  Order,
} from "./screens/OrdersScreen";

import BillingScreen, {
  Bill,
  Payment,
} from "./screens/BillingScreen";

import {
  createBill as createSupabaseBill,
  createPayment as createSupabasePayment,
  fetchBillingData,
} from "./lib/billService";

type Screen =
  | "home"
  | "customers"
  | "measurements"
  | "orders"
  | "billing";

/* -------------------------------------------------------
   APP
------------------------------------------------------- */

export default function App() {
  /* -------------------------------------------------------
     AUTHENTICATION
  ------------------------------------------------------- */

  const [session, setSession] = useState<Session | null>(null);

  const [authLoading, setAuthLoading] = useState(true);

  /* -------------------------------------------------------
     SCREEN
  ------------------------------------------------------- */

 const [currentScreen, setCurrentScreen] =
  useState<string>("home");

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  /* -------------------------------------------------------
     CUSTOMERS
  ------------------------------------------------------- */

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [customersLoading, setCustomersLoading] =
    useState(false);

  /* -------------------------------------------------------
     MEASUREMENTS
  ------------------------------------------------------- */

  const [measurements, setMeasurements] =
    useState<Record<string, Measurement[]>>({});

  const [measurementsLoading, setMeasurementsLoading] =
    useState(false);

  /* -------------------------------------------------------
     ORDERS
  ------------------------------------------------------- */

  const [orders, setOrders] =
    useState<Order[]>([]);

  /* -------------------------------------------------------
     BILLS
  ------------------------------------------------------- */

  const [bills, setBills] =
    useState<Bill[]>([]);

  /* -------------------------------------------------------
     PAYMENTS
  ------------------------------------------------------- */

  const [payments, setPayments] =
    useState<Payment[]>([]);

  /* -------------------------------------------------------
     SUPABASE AUTH SESSION
  ------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } =
        await supabase.auth.getSession();

      if (error) {
        console.error(
          "Unable to get Supabase session:",
          error.message
        );
      }

      if (mounted) {
        setSession(data.session);
        setAuthLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (mounted) {
          setSession(newSession);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* -------------------------------------------------------
     LOAD CUSTOMERS FROM SUPABASE
  ------------------------------------------------------- */

  useEffect(() => {
    if (!session) {
      setCustomers([]);
      return;
    }

    let mounted = true;

    async function loadCustomers() {
      setCustomersLoading(true);

      try {
        const data = await fetchCustomers();

        if (!mounted) {
          return;
        }

        const formattedCustomers: Customer[] =
          data.map((customer) => ({
            id: customer.id,
            name: customer.name,
            phone: customer.phone || "",
            email: customer.email || "",
            address: customer.address || "",
            notes: customer.notes || "",
            orders: 0,
          }));

        setCustomers(formattedCustomers);
      } catch (error) {
        console.error(
          "Failed to load customers:",
          error
        );

        if (mounted) {
          Alert.alert(
            "Unable to load customers",
            error instanceof Error
              ? error.message
              : "Something went wrong while loading customers."
          );
        }
      } finally {
        if (mounted) {
          setCustomersLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      mounted = false;
    };
  }, [session]);

  /* -------------------------------------------------------
     LOAD MEASUREMENTS FROM SUPABASE
  ------------------------------------------------------- */

  useEffect(() => {
    if (!session || !selectedCustomer) {
      setMeasurementsLoading(false);
      return;
    }

    let mounted = true;

    async function loadMeasurements() {
      setMeasurementsLoading(true);

      try {
        const data =
          await fetchSupabaseMeasurements(
            selectedCustomer!.id
          );

        if (!mounted) {
          return;
        }

        const formattedMeasurements: Measurement[] =
          data.map((measurement) => ({
            id: measurement.id,
            date: measurement.date,
            type: measurement.type,
            bust: measurement.bust || "",
            waist: measurement.waist || "",
            hip: measurement.hip || "",
            shoulder:
              measurement.shoulder || "",
            sleeveLength:
              measurement.sleeve_length || "",
            blouseLength:
              measurement.blouse_length || "",
            frontNeck:
              measurement.front_neck || "",
            backNeck:
              measurement.back_neck || "",
            armhole:
              measurement.armhole || "",
            pantLength:
              measurement.pant_length || "",
            notes:
              measurement.notes || "",
          }));

        setMeasurements((previousMeasurements) => ({
          ...previousMeasurements,
          [selectedCustomer!.id]:
            formattedMeasurements,
        }));
      } catch (error) {
        console.error(
          "Failed to load measurements:",
          error
        );

        if (mounted) {
          Alert.alert(
            "Unable to load measurements",
            error instanceof Error
              ? error.message
              : "Something went wrong while loading measurements."
          );
        }
      } finally {
        if (mounted) {
          setMeasurementsLoading(false);
        }
      }
    }

    loadMeasurements();

    return () => {
      mounted = false;
    };
  }, [session, selectedCustomer]);

  /* -------------------------------------------------------
     LOAD ORDERS FROM SUPABASE
  ------------------------------------------------------- */

  useEffect(() => {
    if (!session) {
      setOrders([]);
      return;
    }

    let mounted = true;

    async function loadOrders() {
      try {
        const data = await fetchOrders();

        if (!mounted) {
          return;
        }

        setOrders(data);
      } catch (error) {
        console.error(
          "Failed to load orders:",
          error
        );

        if (mounted) {
          Alert.alert(
            "Unable to load orders",
            error instanceof Error
              ? error.message
              : "Something went wrong while loading orders."
          );
        }
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, [session]);

  /* -------------------------------------------------------
     LOAD BILLING DATA FROM SUPABASE
  ------------------------------------------------------- */

  useEffect(() => {
    if (!session) {
      setBills([]);
      setPayments([]);
      return;
    }

    let mounted = true;

    async function loadBilling() {
      try {
        const data = await fetchBillingData();

        if (!mounted) {
          return;
        }

        setBills(data.bills);
        setPayments(data.payments);
      } catch (error) {
        console.error(
          "Failed to load billing data:",
          error
        );

        if (mounted) {
          Alert.alert(
            "Unable to load billing data",
            error instanceof Error
              ? error.message
              : "Something went wrong while loading bills and payments."
          );
        }
      }
    }

    loadBilling();

    return () => {
      mounted = false;
    };
  }, [session]);

  /* -------------------------------------------------------
     AUTH LOADING SCREEN
  ------------------------------------------------------- */

  if (authLoading) {
    return (
      <View style={styles.authLoadingContainer}>
        <View style={styles.authLoadingCard}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>F</Text>
          </View>

          <Text style={styles.authLoadingTitle}>
            Femme Fatale Boutique
          </Text>

          <Text style={styles.authLoadingSubtitle}>
            Connecting securely...
          </Text>

          <ActivityIndicator
            size="small"
            color="#C43D6C"
            style={styles.authSpinner}
          />
        </View>
      </View>
    );
  }

  /* -------------------------------------------------------
     AUTH SCREEN
  ------------------------------------------------------- */

  if (!session) {
    return <AuthScreen />;
  }

  /* -------------------------------------------------------
     LIVE CUSTOMER DATA
  ------------------------------------------------------- */

  const liveCustomers = customers.map((customer) => ({
    ...customer,

    orders: orders.filter(
      (order) =>
        order.customerId === customer.id
    ).length,
  }));

  /* -------------------------------------------------------
     CUSTOMER HANDLERS
  ------------------------------------------------------- */

  async function handleAddCustomer(
    newCustomer: Customer
  ) {
    try {
      const savedCustomer =
        await createSupabaseCustomer({
          name: newCustomer.name,
          phone: newCustomer.phone,
          email: newCustomer.email,
          address: newCustomer.address,
          notes: newCustomer.notes,
        });

      const formattedCustomer: Customer = {
        id: savedCustomer.id,
        name: savedCustomer.name,
        phone: savedCustomer.phone || "",
        email: savedCustomer.email || "",
        address: savedCustomer.address || "",
        notes: savedCustomer.notes || "",
        orders: 0,
      };

      setCustomers((previousCustomers) => [
        formattedCustomer,
        ...previousCustomers,
      ]);

      setSelectedCustomer(formattedCustomer);

      Alert.alert(
        "Customer Saved",
        `${formattedCustomer.name} has been added successfully.`
      );
    } catch (error) {
      console.error(
        "Failed to create customer:",
        error
      );

      Alert.alert(
        "Unable to save customer",
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the customer."
      );
    }
  }

  async function handleUpdateCustomer(
    updatedCustomer: Customer
  ) {
    try {
      const savedCustomer =
        await updateSupabaseCustomer(
          updatedCustomer.id,
          {
            name: updatedCustomer.name,
            phone: updatedCustomer.phone,
            email: updatedCustomer.email,
            address: updatedCustomer.address,
            notes: updatedCustomer.notes,
          }
        );

      const formattedCustomer: Customer = {
        id: savedCustomer.id,
        name: savedCustomer.name,
        phone: savedCustomer.phone || "",
        email: savedCustomer.email || "",
        address: savedCustomer.address || "",
        notes: savedCustomer.notes || "",
        orders: updatedCustomer.orders,
      };

      setCustomers((previousCustomers) =>
        previousCustomers.map((customer) =>
          customer.id === formattedCustomer.id
            ? formattedCustomer
            : customer
        )
      );

      setSelectedCustomer((previousCustomer) =>
        previousCustomer &&
        previousCustomer.id === formattedCustomer.id
          ? formattedCustomer
          : previousCustomer
      );

      Alert.alert(
        "Customer Updated",
        `${formattedCustomer.name}'s details have been updated.`
      );
    } catch (error) {
      console.error(
        "Failed to update customer:",
        error
      );

      Alert.alert(
        "Unable to update customer",
        error instanceof Error
          ? error.message
          : "Something went wrong while updating the customer."
      );
    }
  }

  /* -------------------------------------------------------
     MEASUREMENT HANDLERS
  ------------------------------------------------------- */

  async function handleAddMeasurement(
    newMeasurement: Omit<Measurement, "id">
  ) {
    if (!selectedCustomer) {
      Alert.alert(
        "Customer Required",
        "Please select a customer first."
      );
      return;
    }

    try {
      const dateParts = newMeasurement.date
        .trim()
        .split("/");

      let databaseDate =
        newMeasurement.date.trim();

      if (dateParts.length === 3) {
        const [day, month, year] = dateParts;

        if (
          day.length === 2 &&
          month.length === 2 &&
          year.length === 4
        ) {
          databaseDate =
            `${year}-${month}-${day}`;
        }
      }

      console.log(
        "APP MEASUREMENT DATE:",
        newMeasurement.date,
        "=>",
        databaseDate
      );

      const savedMeasurement =
        await createSupabaseMeasurement({
          customerId: selectedCustomer.id,
          date: databaseDate,
          type: newMeasurement.type,
          bust: newMeasurement.bust,
          waist: newMeasurement.waist,
          hip: newMeasurement.hip,
          shoulder: newMeasurement.shoulder,
          sleeveLength:
            newMeasurement.sleeveLength,
          blouseLength:
            newMeasurement.blouseLength,
          frontNeck:
            newMeasurement.frontNeck,
          backNeck:
            newMeasurement.backNeck,
          armhole:
            newMeasurement.armhole,
          pantLength:
            newMeasurement.pantLength,
          notes: newMeasurement.notes,
        });

      const formattedMeasurement: Measurement = {
        id: savedMeasurement.id,
        date: savedMeasurement.date,
        type: savedMeasurement.type,
        bust: savedMeasurement.bust || "",
        waist: savedMeasurement.waist || "",
        hip: savedMeasurement.hip || "",
        shoulder:
          savedMeasurement.shoulder || "",
        sleeveLength:
          savedMeasurement.sleeve_length || "",
        blouseLength:
          savedMeasurement.blouse_length || "",
        frontNeck:
          savedMeasurement.front_neck || "",
        backNeck:
          savedMeasurement.back_neck || "",
        armhole:
          savedMeasurement.armhole || "",
        pantLength:
          savedMeasurement.pant_length || "",
        notes:
          savedMeasurement.notes || "",
      };

      setMeasurements((previousMeasurements) => ({
        ...previousMeasurements,
        [selectedCustomer.id]: [
          ...(previousMeasurements[
            selectedCustomer.id
          ] || []),
          formattedMeasurement,
        ],
      }));
    } catch (error) {
      console.error(
        "Failed to create measurement:",
        error
      );

      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to save measurement."
      );
    }
  }

  async function handleUpdateMeasurement(
    measurementId: string,
    updatedMeasurement: Omit<Measurement, "id">
  ) {
    if (!selectedCustomer) {
      Alert.alert(
        "Customer Required",
        "Please select a customer first."
      );
      return;
    }

    try {
      const savedMeasurement =
        await updateSupabaseMeasurement(
          measurementId,
          {
            date: updatedMeasurement.date,
            type: updatedMeasurement.type,
            bust: updatedMeasurement.bust,
            waist: updatedMeasurement.waist,
            hip: updatedMeasurement.hip,
            shoulder: updatedMeasurement.shoulder,
            sleeveLength:
              updatedMeasurement.sleeveLength,
            blouseLength:
              updatedMeasurement.blouseLength,
            frontNeck:
              updatedMeasurement.frontNeck,
            backNeck:
              updatedMeasurement.backNeck,
            armhole:
              updatedMeasurement.armhole,
            pantLength:
              updatedMeasurement.pantLength,
            notes: updatedMeasurement.notes,
          }
        );

      const formattedMeasurement: Measurement = {
        id: savedMeasurement.id,
        date: savedMeasurement.date,
        type: savedMeasurement.type,
        bust: savedMeasurement.bust || "",
        waist: savedMeasurement.waist || "",
        hip: savedMeasurement.hip || "",
        shoulder:
          savedMeasurement.shoulder || "",
        sleeveLength:
          savedMeasurement.sleeve_length || "",
        blouseLength:
          savedMeasurement.blouse_length || "",
        frontNeck:
          savedMeasurement.front_neck || "",
        backNeck:
          savedMeasurement.back_neck || "",
        armhole:
          savedMeasurement.armhole || "",
        pantLength:
          savedMeasurement.pant_length || "",
        notes:
          savedMeasurement.notes || "",
      };

      setMeasurements((previousMeasurements) => ({
        ...previousMeasurements,
        [selectedCustomer.id]: (
          previousMeasurements[
            selectedCustomer.id
          ] || []
        ).map((measurement) =>
          measurement.id === measurementId
            ? formattedMeasurement
            : measurement
        ),
      }));
    } catch (error) {
      console.error(
        "Failed to update measurement:",
        error
      );

      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to update measurement."
      );
    }
  }

  /* -------------------------------------------------------
     ORDER HANDLERS
  ------------------------------------------------------- */

  async function handleCreateOrder(
    newOrder: Order
  ): Promise<Order> {
    try {
      const savedOrder =
        await createSupabaseOrder(newOrder);

      setOrders((previousOrders) => [
        savedOrder,
        ...previousOrders.filter(
          (order) => order.id !== savedOrder.id
        ),
      ]);

      return savedOrder;
    } catch (error) {
      console.error(
        "Failed to create order:",
        error
      );

      Alert.alert(
        "Unable to save order",
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the order."
      );

      throw error;
    }
  }

  async function handleUpdateOrder(
    updatedOrder: Order
  ): Promise<Order> {
    try {
      const savedOrder =
        await updateSupabaseOrder(
          updatedOrder
        );

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order.id === savedOrder.id
            ? savedOrder
            : order
        )
      );

      return savedOrder;
    } catch (error) {
      console.error(
        "Failed to update order:",
        error
      );

      Alert.alert(
        "Unable to update order",
        error instanceof Error
          ? error.message
          : "Something went wrong while updating the order."
      );

      throw error;
    }
  }

  /* -------------------------------------------------------
     BILLING HANDLERS
  ------------------------------------------------------- */

  function handleCreateBill(
    newBill: Bill,
    newPayment?: Payment
  ) {
    setBills((previousBills) => [
      newBill,
      ...previousBills.filter(
        (bill) => bill.id !== newBill.id
      ),
    ]);

    if (newPayment) {
      setPayments((previousPayments) => [
        newPayment,
        ...previousPayments.filter(
          (payment) => payment.id !== newPayment.id
        ),
      ]);
    }

    void (async () => {
      try {
        await createSupabaseBill(newBill);

        if (newPayment) {
          await createSupabasePayment(newPayment);
        }

        const latestBilling =
          await fetchBillingData();

        setBills(latestBilling.bills);
        setPayments(latestBilling.payments);
      } catch (error) {
        console.error(
          "Failed to save bill:",
          error
        );

        try {
          const latestBilling =
            await fetchBillingData();

          setBills(latestBilling.bills);
          setPayments(latestBilling.payments);
        } catch (refreshError) {
          console.error(
            "Failed to refresh billing data:",
            refreshError
          );
        }

        Alert.alert(
          "Unable to save bill",
          error instanceof Error
            ? error.message
            : "Something went wrong while saving the bill."
        );
      }
    })();
  }

  function handleUpdateBill(
    updatedBill: Bill
  ) {
    setBills((previousBills) =>
      previousBills.map((bill) =>
        bill.id === updatedBill.id
          ? updatedBill
          : bill
      )
    );
  }

  function handleAddPayment(
    newPayment: Payment
  ) {
    setPayments((previousPayments) => [
      newPayment,
      ...previousPayments.filter(
        (payment) => payment.id !== newPayment.id
      ),
    ]);

    void (async () => {
      try {
        const result =
          await createSupabasePayment(
            newPayment
          );

        setBills((previousBills) =>
          previousBills.map((bill) =>
            bill.id === result.bill.id
              ? result.bill
              : bill
          )
        );

        setPayments((previousPayments) => [
          result.payment,
          ...previousPayments.filter(
            (payment) =>
              payment.id !== newPayment.id &&
              payment.id !== result.payment.id
          ),
        ]);
      } catch (error) {
        console.error(
          "Failed to save payment:",
          error
        );

        try {
          const latestBilling =
            await fetchBillingData();

          setBills(latestBilling.bills);
          setPayments(latestBilling.payments);
        } catch (refreshError) {
          console.error(
            "Failed to refresh billing data:",
            refreshError
          );
        }

        Alert.alert(
          "Unable to save payment",
          error instanceof Error
            ? error.message
            : "Something went wrong while saving the payment."
        );
      }
    })();
  }

  /* -------------------------------------------------------
     LOGOUT
  ------------------------------------------------------- */

  async function handleLogout() {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Logout failed:",
        error.message
      );

      Alert.alert(
        "Logout Failed",
        error.message
      );

      return;
    }

    setCurrentScreen("home");
    setSelectedCustomer(null);

    setCustomers([]);
    setMeasurements({});
    setOrders([]);
    setBills([]);
    setPayments([]);
  }

  /* -------------------------------------------------------
     CUSTOMERS
  ------------------------------------------------------- */

  if (currentScreen === "customers") {
    return (
      <View style={styles.fullScreen}>
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

        {customersLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator
                size="small"
                color="#C43D6C"
              />

              <Text style={styles.loadingText}>
                Loading customers...
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            setCurrentScreen("home")
          }
        >
          <Text style={styles.backButtonText}>
            ← Home
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* -------------------------------------------------------
     MEASUREMENTS
  ------------------------------------------------------- */

  if (currentScreen === "measurements") {
    return (
      <View style={styles.fullScreen}>
        <MeasurementsScreen
          customer={selectedCustomer!}
          measurements={
            selectedCustomer
              ? measurements[
                  selectedCustomer.id
                ] || []
              : []
          }
          onAddMeasurement={
            handleAddMeasurement
          }
          onUpdateMeasurement={
            handleUpdateMeasurement
          }
        />

        {measurementsLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator
                size="small"
                color="#C43D6C"
              />

              <Text style={styles.loadingText}>
                Loading measurements...
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            setCurrentScreen("customers")
          }
        >
          <Text style={styles.backButtonText}>
            ← Customers
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* -------------------------------------------------------
     ORDERS
  ------------------------------------------------------- */

  if (currentScreen === "orders") {
    return (
      <View style={styles.fullScreen}>
        <OrdersScreen
          customers={liveCustomers}
          selectedCustomer={selectedCustomer}
          measurements={measurements}
          orders={orders}
          onCreateOrder={handleCreateOrder}
          onUpdateOrder={handleUpdateOrder}
          onBack={() =>
            setCurrentScreen("home")
          }
        />
      </View>
    );
  }

  /* -------------------------------------------------------
     BILLING
  ------------------------------------------------------- */

  if (currentScreen === "billing") {
    return (
      <View style={styles.fullScreen}>
        <BillingScreen
          customers={liveCustomers}
          orders={orders}
          bills={bills}
          payments={payments}
          onCreateBill={handleCreateBill}
          onUpdateBill={handleUpdateBill}
          onAddPayment={handleAddPayment}
          onBack={() =>
            setCurrentScreen("home")
          }
        />
      </View>
    );
  }

  /* -------------------------------------------------------
     DASHBOARD
  ------------------------------------------------------- */

  function parseDashboardDate(value: string | undefined): Date | null {
    if (!value) return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );
    }

    const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function isSameCalendarDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  const customerCount = liveCustomers.length;
  const orderCount = orders.length;
  const billCount = bills.length;

  const totalBilled = bills.reduce(
    (total, bill) => total + Number(bill.total || 0),
    0
  );

  const totalCollected = payments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );

  const totalPending = Math.max(totalBilled - totalCollected, 0);

  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const inProgressOrders = orders.filter(
    (order) => order.status === "In Progress"
  ).length;

  const readyOrders = orders.filter(
    (order) => order.status === "Ready"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "Delivered"
  ).length;

  const now = new Date();
  const todayRevenue = payments.reduce((total, payment) => {
    const paymentDate = parseDashboardDate(payment.paymentDate);

    if (!paymentDate || !isSameCalendarDay(paymentDate, now)) {
      return total;
    }

    return total + Number(payment.amount || 0);
  }, 0);

  const monthRevenue = payments.reduce((total, payment) => {
    const paymentDate = parseDashboardDate(payment.paymentDate);

    if (!paymentDate) return total;

    const sameMonth =
      paymentDate.getFullYear() === now.getFullYear() &&
      paymentDate.getMonth() === now.getMonth();

    return sameMonth
      ? total + Number(payment.amount || 0)
      : total;
  }, 0);

  function formatRevenue(amount: number) {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }

    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }

    return `₹${amount.toLocaleString("en-IN")}`;
  }

  const recentOrders = [...orders]
    .sort((a, b) => {
      const aDate = parseDashboardDate(a.orderDate)?.getTime() || 0;
      const bDate = parseDashboardDate(b.orderDate)?.getTime() || 0;
      return bDate - aDate;
    })
    .slice(0, 4);

  const outstandingBills = bills.filter(
    (bill) => Number(bill.balance || 0) > 0
  ).length;

  /* -------------------------------------------------------
     CUSTOMERS
  ------------------------------------------------------- */

  if (currentScreen === "customers") {
    return (
      <View style={styles.fullScreen}>
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
        />

        {customersLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#C43D6C" />
              <Text style={styles.loadingText}>Loading customers...</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentScreen("home")}
        >
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* -------------------------------------------------------
     MEASUREMENTS
  ------------------------------------------------------- */

  if (currentScreen === "measurements") {
    return (
      <View style={styles.fullScreen}>
        <MeasurementsScreen
          customer={selectedCustomer!}
          measurements={
            selectedCustomer
              ? measurements[selectedCustomer.id] || []
              : []
          }
          onAddMeasurement={handleAddMeasurement}
          onUpdateMeasurement={handleUpdateMeasurement}
        />

        {measurementsLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#C43D6C" />
              <Text style={styles.loadingText}>Loading measurements...</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentScreen("customers")}
        >
          <Text style={styles.backButtonText}>← Customers</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* -------------------------------------------------------
     ORDERS
  ------------------------------------------------------- */

  if (currentScreen === "orders") {
    return (
      <View style={styles.fullScreen}>
        <OrdersScreen
          customers={liveCustomers}
          selectedCustomer={selectedCustomer}
          measurements={measurements}
          orders={orders}
          onCreateOrder={handleCreateOrder}
          onUpdateOrder={handleUpdateOrder}
          onBack={() => setCurrentScreen("home")}
        />
      </View>
    );
  }

  /* -------------------------------------------------------
     BILLING
  ------------------------------------------------------- */

  if (currentScreen === "billing") {
    return (
      <View style={styles.fullScreen}>
        <BillingScreen
          customers={liveCustomers}
          orders={orders}
          bills={bills}
          payments={payments}
          onCreateBill={handleCreateBill}
          onUpdateBill={handleUpdateBill}
          onAddPayment={handleAddPayment}
          onBack={() => setCurrentScreen("home")}
        />
      </View>
    );
  }

  /* -------------------------------------------------------
     DASHBOARD UI
  ------------------------------------------------------- */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dashboardHeader}>
          <View style={styles.dashboardHeaderText}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.dashboardTitle}>Femme Fatale Boutique</Text>
            <Text style={styles.dashboardSubtitle}>
              Style Speaks Louder ♡
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerLogoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.headerLogoutIcon}>↪</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroEyebrow}>TODAY'S COLLECTION</Text>
              <Text style={styles.heroAmount}>{formatRevenue(todayRevenue)}</Text>
              <Text style={styles.heroCaption}>Payments received today</Text>
            </View>

            <View style={styles.heroIconCircle}>
              <Text style={styles.heroIcon}>₹</Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{orderCount}</Text>
              <Text style={styles.heroStatLabel}>Total orders</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{formatRevenue(totalPending)}</Text>
              <Text style={styles.heroStatLabel}>Outstanding</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{formatRevenue(monthRevenue)}</Text>
              <Text style={styles.heroStatLabel}>This month</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionHint}>Start here</Text>
        </View>

        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => setCurrentScreen("customers")}
          >
            <View style={styles.quickIconCircle}>
              <Text style={styles.quickIcon}>👥</Text>
            </View>
            <Text style={styles.quickTitle}>Customers</Text>
            <Text style={styles.quickSubtitle}>Add & manage</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => setCurrentScreen("customers")}
          >
            <View style={styles.quickIconCircle}>
              <Text style={styles.quickIcon}>📏</Text>
            </View>
            <Text style={styles.quickTitle}>Measurements</Text>
            <Text style={styles.quickSubtitle}>Open customer records</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => setCurrentScreen("orders")}
          >
            <View style={styles.quickIconCircle}>
              <Text style={styles.quickIcon}>🧵</Text>
            </View>
            <Text style={styles.quickTitle}>New Order</Text>
            <Text style={styles.quickSubtitle}>Create an order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => setCurrentScreen("billing")}
          >
            <View style={styles.quickIconCircle}>
              <Text style={styles.quickIcon}>🧾</Text>
            </View>
            <Text style={styles.quickTitle}>Create Bill</Text>
            <Text style={styles.quickSubtitle}>Bill & collect</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Business Overview</Text>
          <TouchableOpacity onPress={() => setCurrentScreen("customers")}>
            <Text style={styles.viewAll}>Customers →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.overviewGrid}>
          <TouchableOpacity
            style={styles.overviewCard}
            onPress={() => setCurrentScreen("customers")}
          >
            <View style={styles.overviewIconBox}>
              <Text>👥</Text>
            </View>
            <Text style={styles.overviewValue}>{customerCount}</Text>
            <Text style={styles.overviewLabel}>Customers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.overviewCard}
            onPress={() => setCurrentScreen("orders")}
          >
            <View style={styles.overviewIconBox}>
              <Text>🧵</Text>
            </View>
            <Text style={styles.overviewValue}>{orderCount}</Text>
            <Text style={styles.overviewLabel}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.overviewCard}
            onPress={() => setCurrentScreen("billing")}
          >
            <View style={styles.overviewIconBox}>
              <Text>🧾</Text>
            </View>
            <Text style={styles.overviewValue}>{billCount}</Text>
            <Text style={styles.overviewLabel}>Bills</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Order Pipeline</Text>
          <TouchableOpacity onPress={() => setCurrentScreen("orders")}>
            <Text style={styles.viewAll}>View all →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pipelineGrid}>
          <TouchableOpacity style={styles.pipelineCard} onPress={() => setCurrentScreen("orders")}>
            <View style={styles.pipelineTopRow}>
              <Text style={styles.pipelineIcon}>⏳</Text>
              <Text style={styles.pipelineValue}>{pendingOrders}</Text>
            </View>
            <Text style={styles.pipelineLabel}>Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pipelineCard} onPress={() => setCurrentScreen("orders")}>
            <View style={styles.pipelineTopRow}>
              <Text style={styles.pipelineIcon}>🧵</Text>
              <Text style={styles.pipelineValue}>{inProgressOrders}</Text>
            </View>
            <Text style={styles.pipelineLabel}>In Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pipelineCard} onPress={() => setCurrentScreen("orders")}>
            <View style={styles.pipelineTopRow}>
              <Text style={styles.pipelineIcon}>✅</Text>
              <Text style={styles.pipelineValue}>{readyOrders}</Text>
            </View>
            <Text style={styles.pipelineLabel}>Ready</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pipelineCard} onPress={() => setCurrentScreen("orders")}>
            <View style={styles.pipelineTopRow}>
              <Text style={styles.pipelineIcon}>📦</Text>
              <Text style={styles.pipelineValue}>{deliveredOrders}</Text>
            </View>
            <Text style={styles.pipelineLabel}>Delivered</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity onPress={() => setCurrentScreen("orders")}>
            <Text style={styles.viewAll}>View all →</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyOrderCard}>
            <View style={styles.emptyOrderIconCircle}>
              <Text style={styles.emptyOrderIcon}>🧵</Text>
            </View>
            <Text style={styles.emptyOrderText}>No orders yet</Text>
            <Text style={styles.emptyOrderSubtext}>
              Your latest orders will appear here.
            </Text>
            <TouchableOpacity
              style={styles.emptyOrderButton}
              onPress={() => setCurrentScreen("orders")}
            >
              <Text style={styles.emptyOrderButtonText}>Create Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => setCurrentScreen("orders")}
            >
              <View style={styles.orderAvatar}>
                <Text style={styles.orderAvatarText}>
                  {(order.customerName || "C").charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.orderInfo}>
                <Text style={styles.orderCustomerName} numberOfLines={1}>
                  {order.customerName}
                </Text>
                <Text style={styles.orderItem} numberOfLines={1}>
                  {order.item} • Qty {order.quantity}
                </Text>
                <Text style={styles.orderId}>
                  {order.orderNumber || order.id}
                </Text>
              </View>

              <View style={styles.orderRight}>
                <Text style={styles.orderAmount}>
                  ₹{(
                    Number(order.price || 0) * Number(order.quantity || 1)
                  ).toLocaleString("en-IN")}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    order.status === "Ready"
                      ? styles.statusReady
                      : order.status === "In Progress"
                      ? styles.statusProgress
                      : order.status === "Delivered"
                      ? styles.statusDelivered
                      : styles.statusPending,
                  ]}
                >
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payments</Text>
          <TouchableOpacity onPress={() => setCurrentScreen("billing")}>
            <Text style={styles.viewAll}>Open billing →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.paymentOverviewCard}>
          <View style={styles.paymentMainRow}>
            <View style={styles.paymentMainIcon}>
              <Text>₹</Text>
            </View>
            <View style={styles.paymentMainInfo}>
              <Text style={styles.paymentMainLabel}>Collected</Text>
              <Text style={styles.paymentMainValue}>{formatRevenue(totalCollected)}</Text>
            </View>
            <View style={styles.paymentMainRight}>
              <Text style={styles.paymentMainSmall}>{payments.length}</Text>
              <Text style={styles.paymentMainSmallLabel}>payments</Text>
            </View>
          </View>

          <View style={styles.paymentProgressTrack}>
            <View
              style={[
                styles.paymentProgressFill,
                {
                  width: `${Math.min(
                    totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
                    100
                  )}%`,
                },
              ]}
            />
          </View>

          <View style={styles.paymentBottomRow}>
            <View>
              <Text style={styles.paymentBottomLabel}>Billed</Text>
              <Text style={styles.paymentBottomValue}>{formatRevenue(totalBilled)}</Text>
            </View>
            <View style={styles.paymentBottomDivider} />
            <View>
              <Text style={styles.paymentBottomLabel}>Outstanding</Text>
              <Text style={styles.paymentBottomValue}>{formatRevenue(totalPending)}</Text>
            </View>
            <View style={styles.paymentOutstandingBadge}>
              <Text style={styles.paymentOutstandingBadgeText}>
                {outstandingBills} due
              </Text>
            </View>
          </View>
        </View>

        {totalPending > 0 && (
          <TouchableOpacity
            style={styles.paymentAlertCard}
            onPress={() => setCurrentScreen("billing")}
          >
            <View style={styles.paymentAlertIcon}>
              <Text>💳</Text>
            </View>
            <View style={styles.paymentAlertInfo}>
              <Text style={styles.paymentAlertTitle}>Pending Payments</Text>
              <Text style={styles.paymentAlertText}>
                {formatRevenue(totalPending)} is still outstanding.
              </Text>
            </View>
            <Text style={styles.paymentAlertArrow}>→</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen("home")}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navText, styles.navTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen("customers")}
        >
          <Text style={styles.navIcon}>👥</Text>
          <Text style={styles.navText}>Customers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen("orders")}
        >
          <Text style={styles.navIcon}>🧵</Text>
          <Text style={styles.navText}>Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen("billing")}
        >
          <Text style={styles.navIcon}>🧾</Text>
          <Text style={styles.navText}>Billing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={handleLogout}
        >
          <Text style={styles.navIcon}>🚪</Text>
          <Text style={styles.navText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------
   STYLES
------------------------------------------------------- */

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 105,
  },

  dashboardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  dashboardHeaderText: {
    flex: 1,
    paddingRight: 14,
  },

  greeting: {
    fontSize: 13,
    color: "#75656C",
    fontWeight: "600",
    marginBottom: 3,
  },

  dashboardTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#2A2025",
    letterSpacing: -0.5,
  },

  dashboardSubtitle: {
    fontSize: 12,
    color: "#806F76",
    marginTop: 4,
  },

  headerLogoutButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FCE8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  headerLogoutIcon: {
    fontSize: 20,
    color: "#C43D6C",
    fontWeight: "800",
  },

  heroCard: {
    backgroundColor: "#C43D6C",
    borderRadius: 24,
    padding: 20,
    marginBottom: 25,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  heroEyebrow: {
    color: "#E8B7C8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  heroAmount: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 5,
  },

  heroCaption: {
    color: "#F2DDE6",
    fontSize: 11,
    marginTop: 2,
  },

  heroIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroIcon: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },

  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 18,
  },

  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroStat: {
    flex: 1,
  },

  heroStatValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  heroStatLabel: {
    color: "#E8B7C8",
    fontSize: 10,
    marginTop: 3,
  },

  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginHorizontal: 10,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2A2025",
    marginBottom: 13,
  },

  sectionHint: {
    color: "#A08F96",
    fontSize: 11,
    marginBottom: 13,
  },

  viewAll: {
    color: "#C43D6C",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 13,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  quickCard: {
    width: "48.2%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0EBF1",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  quickIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF9F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  quickIcon: {
    fontSize: 21,
  },

  quickTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#30252A",
  },

  quickSubtitle: {
    fontSize: 10,
    color: "#918791",
    marginTop: 3,
  },

  overviewGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  overviewCard: {
    width: "31.7%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0EBF1",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  overviewIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF9F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  overviewValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2E2328",
  },

  overviewLabel: {
    fontSize: 10,
    color: "#8B7B82",
    marginTop: 2,
  },

  pipelineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  pipelineCard: {
    width: "48.2%",
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0EBF1",
  },

  pipelineTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pipelineIcon: {
    fontSize: 20,
  },

  pipelineValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2E2328",
  },

  pipelineLabel: {
    fontSize: 11,
    color: "#806F76",
    marginTop: 8,
  },

  emptyOrderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#F0EBF1",
  },

  emptyOrderIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF9F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  emptyOrderIcon: {
    fontSize: 24,
  },

  emptyOrderText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#34282E",
  },

  emptyOrderSubtext: {
    fontSize: 11,
    color: "#8A7B81",
    marginTop: 5,
    textAlign: "center",
  },

  emptyOrderButton: {
    backgroundColor: "#C43D6C",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 14,
  },

  emptyOrderButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EBF1",
  },

  orderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FCE8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  orderAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#C43D6C",
  },

  orderInfo: {
    flex: 1,
    paddingRight: 8,
  },

  orderCustomerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#30252A",
  },

  orderItem: {
    fontSize: 10,
    color: "#806F76",
    marginTop: 4,
  },

  orderId: {
    fontSize: 9,
    color: "#A4989D",
    marginTop: 3,
  },

  orderRight: {
    alignItems: "flex-end",
  },

  orderAmount: {
    fontSize: 12,
    fontWeight: "800",
    color: "#34282E",
    marginBottom: 6,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },

  statusReady: {
    backgroundColor: "#E7F8ED",
  },

  statusProgress: {
    backgroundColor: "#FFF3D9",
  },

  statusPending: {
    backgroundColor: "#FCE8F0",
  },

  statusDelivered: {
    backgroundColor: "#E3F2FD",
  },

  statusText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#554C56",
  },

  paymentOverviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F0EBF1",
  },

  paymentMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  paymentMainIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF9F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  paymentMainInfo: {
    flex: 1,
  },

  paymentMainLabel: {
    fontSize: 10,
    color: "#8A7B81",
  },

  paymentMainValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#30252A",
    marginTop: 2,
  },

  paymentMainRight: {
    alignItems: "flex-end",
  },

  paymentMainSmall: {
    fontSize: 18,
    fontWeight: "800",
    color: "#C43D6C",
  },

  paymentMainSmallLabel: {
    fontSize: 9,
    color: "#948A95",
  },

  paymentProgressTrack: {
    height: 7,
    backgroundColor: "#F4E7ED",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 16,
  },

  paymentProgressFill: {
    height: "100%",
    backgroundColor: "#C43D6C",
    borderRadius: 4,
  },

  paymentBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },

  paymentBottomLabel: {
    fontSize: 9,
    color: "#948A95",
  },

  paymentBottomValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#34282E",
    marginTop: 2,
  },

  paymentBottomDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#F4E7ED",
    marginHorizontal: 16,
  },

  paymentOutstandingBadge: {
    marginLeft: "auto",
    backgroundColor: "#FFF4D9",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  paymentOutstandingBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#806A2E",
  },

  paymentAlertCard: {
    backgroundColor: "#FFF8E8",
    borderRadius: 18,
    padding: 15,
    marginTop: 2,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F4E1A9",
  },

  paymentAlertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF0C4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  paymentAlertInfo: {
    flex: 1,
  },

  paymentAlertTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#5F4A16",
  },

  paymentAlertText: {
    fontSize: 11,
    color: "#806A2E",
    marginTop: 3,
  },

  paymentAlertArrow: {
    fontSize: 20,
    color: "#806A2E",
    fontWeight: "700",
  },

  /* -----------------------------------------------------
     BACK BUTTON
  ----------------------------------------------------- */

  backButton: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#222",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  backButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },

  /* -----------------------------------------------------
     BOTTOM NAV
  ----------------------------------------------------- */

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 75,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  navItem: {
    alignItems: "center",
    justifyContent: "center",
  },

  navIcon: {
    fontSize: 21,
    marginBottom: 3,
  },

  navText: {
    fontSize: 10,
    color: "#666",
  },

  navTextActive: {
    color: "#C43D6C",
    fontWeight: "800",
  },

  /* -----------------------------------------------------
     LOADING
  ----------------------------------------------------- */

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  loadingText: {
    marginTop: 10,
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
  },

  /* -----------------------------------------------------
     AUTH LOADING
  ----------------------------------------------------- */

  authLoadingContainer: {
    flex: 1,
    backgroundColor: "#FFF9F2",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  authLoadingCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#C43D6C",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  logoText: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
  },

  authLoadingTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#30252A",
  },

  authLoadingSubtitle: {
    fontSize: 13,
    color: "#77707a",
    marginTop: 5,
  },

  authSpinner: {
    marginTop: 20,
  },
});