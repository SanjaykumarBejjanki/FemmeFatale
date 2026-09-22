import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as Print from "expo-print";

import type { Customer } from "./CustomersScreen";
import type { Order } from "./OrdersScreen";

/* =========================================================
   TYPES
========================================================= */

export type PaymentMethod =
  | "Cash"
  | "UPI"
  | "Card"
  | "Other";

export type BillStatus =
  | "Unpaid"
  | "Partially Paid"
  | "Paid";

export type Payment = {
  id: string;
  billId: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
};

export type Bill = {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  item: string;
  quantity: number;
  price: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  balance: number;
  paymentMethod: PaymentMethod;
  status: BillStatus;
  billDate: string;
};

type BillingScreenProps = {
  customers: Customer[];
  orders: Order[];
  bills: Bill[];
  payments: Payment[];
  onCreateBill: (
    bill: Bill,
    payment?: Payment
  ) => void;
  onUpdateBill: (bill: Bill) => void;
  onAddPayment: (payment: Payment) => void;
  onBack: () => void;
};

/* =========================================================
   BRAND
========================================================= */

const colors = {
  PrimaryWine: "#8B1238",
  Magenta: "#C2185B",
  Gold: "#C69A3A",
  Cream: "#FFF9F2",
  SoftPink: "#FCE8F0",
  DarkText: "#242124",
  White: "#FFFFFF",
  Border: "#E8D9DE",
  Muted: "#777277",
  Green: "#2E7D32",
  Red: "#C62828",
  Orange: "#EF6C00",
};

/* =========================================================
   HELPERS
========================================================= */

const formatMoney = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: string) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN");
};

const todayString = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}`;

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/* =========================================================
   RECEIPT HTML
========================================================= */

const buildReceiptHtml = (
  bill: Bill,
  payments: Payment[]
) => {
  const billPayments = payments.filter(
    (payment) => payment.billId === bill.id
  );

  const paymentRows =
    billPayments.length > 0
      ? billPayments
          .map(
            (payment) => `
              <tr>
                <td>${escapeHtml(
                  formatDate(payment.paymentDate)
                )}</td>
                <td>${escapeHtml(payment.method)}</td>
                <td style="text-align:right;">
                  ${escapeHtml(formatMoney(payment.amount))}
                </td>
              </tr>
            `
          )
          .join("")
      : `
          <tr>
            <td colspan="3" style="text-align:center;">
              No payments recorded
            </td>
          </tr>
        `;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />

<style>

body {
  font-family: Arial, Helvetica, sans-serif;
  margin: 0;
  padding: 30px;
  color: #242124;
  background: #ffffff;
}

.invoice {
  max-width: 760px;
  margin: auto;
}

.header {
  text-align: center;
  border-bottom: 2px solid #8B1238;
  padding-bottom: 18px;
  margin-bottom: 20px;
}

.brand {
  font-size: 28px;
  font-weight: bold;
  color: #8B1238;
}

.tagline {
  color: #777277;
  margin-top: 5px;
}

.invoice-title {
  margin-top: 18px;
  font-size: 22px;
  font-weight: bold;
}

.info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 25px;
}

.info-box {
  width: 48%;
}

.label {
  color: #777277;
  font-size: 12px;
  margin-bottom: 3px;
}

.value {
  font-size: 15px;
  font-weight: bold;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

th {
  background: #8B1238;
  color: white;
  padding: 10px;
  text-align: left;
}

td {
  border-bottom: 1px solid #eeeeee;
  padding: 10px;
}

.summary {
  width: 300px;
  margin-left: auto;
  margin-top: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}

.total {
  border-top: 2px solid #8B1238;
  margin-top: 8px;
  padding-top: 10px;
  font-size: 18px;
  font-weight: bold;
}

.balance {
  color: #C2185B;
  font-size: 18px;
  font-weight: bold;
}

.footer {
  text-align: center;
  margin-top: 40px;
  padding-top: 15px;
  border-top: 1px solid #eeeeee;
  color: #777277;
  font-size: 12px;
}

</style>
</head>

<body>

<div class="invoice">

  <div class="header">
    <div class="brand">
      Femme Fatale Boutique
    </div>

    <div class="tagline">
      Style Speaks Louder ♡
    </div>

    <div class="invoice-title">
      INVOICE
    </div>
  </div>

  <div class="info">

    <div class="info-box">
      <div class="label">CUSTOMER</div>
      <div class="value">
        ${escapeHtml(bill.customerName)}
      </div>

      <div style="margin-top:12px;">
        <div class="label">ITEM</div>
        <div class="value">
          ${escapeHtml(bill.item)}
        </div>
      </div>
    </div>

    <div class="info-box">
      <div class="label">BILL DATE</div>
      <div class="value">
        ${escapeHtml(formatDate(bill.billDate))}
      </div>

      <div style="margin-top:12px;">
        <div class="label">BILL ID</div>
        <div class="value">
          ${escapeHtml(bill.id)}
        </div>
      </div>
    </div>

  </div>

  <table>

    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Rate</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>

    <tbody>

      <tr>
        <td>${escapeHtml(bill.item)}</td>

        <td>
          ${escapeHtml(bill.quantity)}
        </td>

        <td>
          ${escapeHtml(formatMoney(bill.price))}
        </td>

        <td style="text-align:right;">
          ${escapeHtml(formatMoney(bill.subtotal))}
        </td>
      </tr>

    </tbody>

  </table>

  <div class="summary">

    <div class="summary-row">
      <span>Subtotal</span>
      <span>${escapeHtml(
        formatMoney(bill.subtotal)
      )}</span>
    </div>

    <div class="summary-row">
      <span>Discount</span>
      <span>- ${escapeHtml(
        formatMoney(bill.discount)
      )}</span>
    </div>

    <div class="summary-row">
      <span>Tax</span>
      <span>${escapeHtml(
        formatMoney(bill.tax)
      )}</span>
    </div>

    <div class="summary-row total">
      <span>Total</span>
      <span>${escapeHtml(
        formatMoney(bill.total)
      )}</span>
    </div>

    <div class="summary-row">
      <span>Paid</span>
      <span>${escapeHtml(
        formatMoney(bill.paidAmount)
      )}</span>
    </div>

    <div class="summary-row balance">
      <span>Balance</span>
      <span>${escapeHtml(
        formatMoney(bill.balance)
      )}</span>
    </div>

  </div>

  <h3 style="margin-top:35px;">
    Payment History
  </h3>

  <table>

    <thead>
      <tr>
        <th>Date</th>
        <th>Method</th>
        <th style="text-align:right;">
          Amount
        </th>
      </tr>
    </thead>

    <tbody>

      ${paymentRows}

    </tbody>

  </table>

  <div class="footer">

    Thank you for choosing
    <strong>Femme Fatale Boutique</strong>.

    <br />

    Style Speaks Louder ♡

  </div>

</div>

</body>
</html>
`;
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function BillingScreen({
  customers,
  orders,
  bills,
  payments,
  onCreateBill,
  onUpdateBill,
  onAddPayment,
  onBack,
}: BillingScreenProps) {

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<"All" | BillStatus>("All");

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [showDetailsModal, setShowDetailsModal] =
    useState(false);

  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [showReceiptModal, setShowReceiptModal] =
    useState(false);

  const [selectedBill, setSelectedBill] =
    useState<Bill | null>(null);

  const [receiptBusy, setReceiptBusy] =
    useState<"export" | "print" | "share" | null>(
      null
    );

  const [selectedCustomerId, setSelectedCustomerId] =
    useState("");

  const [selectedOrderId, setSelectedOrderId] =
    useState("");

  const [item, setItem] = useState("");

  const [quantity, setQuantity] =
    useState("1");

  const [price, setPrice] =
    useState("");

  const [discount, setDiscount] =
    useState("0");

  const [tax, setTax] =
    useState("0");

  const [advance, setAdvance] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("Cash");

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [newPaymentMethod, setNewPaymentMethod] =
    useState<PaymentMethod>("Cash");

  /* =======================================================
     CALCULATIONS
  ======================================================= */

  const quantityNumber =
    Number(quantity) || 0;

  const priceNumber =
    Number(price) || 0;

  const discountNumber =
    Number(discount) || 0;

  const taxNumber =
    Number(tax) || 0;

  const subtotal =
    quantityNumber * priceNumber;

  const total = Math.max(
    0,
    subtotal - discountNumber + taxNumber
  );

  const advanceNumber =
    Math.min(
      Math.max(Number(advance) || 0, 0),
      total
    );

  const balance =
    Math.max(0, total - advanceNumber);

  /* =======================================================
     FILTERED BILLS
  ======================================================= */

  const filteredBills = useMemo(() => {
    const searchText =
      search.trim().toLowerCase();

    return bills.filter((bill) => {
      const matchesSearch =
        !searchText ||
        bill.customerName
          .toLowerCase()
          .includes(searchText) ||
        bill.item
          .toLowerCase()
          .includes(searchText) ||
        bill.id
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        bill.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [bills, search, statusFilter]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const totalRevenue = bills.reduce(
    (sum, bill) =>
      sum + Number(bill.paidAmount || 0),
    0
  );

  const totalOutstanding =
    bills.reduce(
      (sum, bill) =>
        sum + Number(bill.balance || 0),
      0
    );

  const paidBills = bills.filter(
    (bill) => bill.status === "Paid"
  ).length;

  const pendingBills = bills.filter(
    (bill) => bill.status !== "Paid"
  ).length;

  /* =======================================================
     RESET FORM
  ======================================================= */

  const resetCreateForm = () => {
    setSelectedCustomerId("");
    setSelectedOrderId("");
    setItem("");
    setQuantity("1");
    setPrice("");
    setDiscount("0");
    setTax("0");
    setAdvance("");
    setPaymentMethod("Cash");
  };

  /* =======================================================
     CUSTOMER ORDERS
  ======================================================= */

  const customerOrders = orders.filter(
    (order) =>
      order.customerId === selectedCustomerId
  );

  /* =======================================================
     CREATE BILL
  ======================================================= */

  const handleCreateBillPress = () => {

    if (!selectedCustomerId) {
      Alert.alert(
        "Select Customer",
        "Please select a customer."
      );
      return;
    }

    if (!item.trim()) {
      Alert.alert(
        "Item Required",
        "Please enter the item name."
      );
      return;
    }

    if (quantityNumber <= 0) {
      Alert.alert(
        "Invalid Quantity",
        "Quantity must be greater than zero."
      );
      return;
    }

    if (priceNumber <= 0) {
      Alert.alert(
        "Invalid Price",
        "Please enter a valid price."
      );
      return;
    }

    if (discountNumber < 0) {
      Alert.alert(
        "Invalid Discount",
        "Discount cannot be negative."
      );
      return;
    }

    if (taxNumber < 0) {
      Alert.alert(
        "Invalid Tax",
        "Tax cannot be negative."
      );
      return;
    }

    if (discountNumber > subtotal) {
      Alert.alert(
        "Invalid Discount",
        "Discount cannot be greater than subtotal."
      );
      return;
    }

    if (total <= 0) {
      Alert.alert(
        "Invalid Total",
        "Bill total must be greater than zero."
      );
      return;
    }

    const customer = customers.find(
      (c) => c.id === selectedCustomerId
    );

    if (!customer) {
      Alert.alert(
        "Customer Not Found",
        "Please select a valid customer."
      );
      return;
    }

    const billId = createId("BILL");

    const newBill: Bill = {
      id: billId,
      orderId: selectedOrderId,
      customerId: customer.id,
      customerName: customer.name,
      item: item.trim(),
      quantity: quantityNumber,
      price: priceNumber,
      subtotal,
      discount: discountNumber,
      tax: taxNumber,
      total,
      paidAmount: advanceNumber,
      balance,
      paymentMethod,
      status:
        balance <= 0
          ? "Paid"
          : advanceNumber > 0
          ? "Partially Paid"
          : "Unpaid",
      billDate: todayString(),
    };

    let initialPayment:
      | Payment
      | undefined;

    if (advanceNumber > 0) {
      initialPayment = {
        id: createId("PAY"),
        billId,
        amount: advanceNumber,
        method: paymentMethod,
        paymentDate: todayString(),
      };
    }

    onCreateBill(
      newBill,
      initialPayment
    );

    setShowCreateModal(false);
    resetCreateForm();

    Alert.alert(
      "Bill Created",
      "The invoice has been created successfully."
    );
  };

  /* =======================================================
     OPEN BILL
  ======================================================= */

  const openBill = (bill: Bill) => {
    setSelectedBill(bill);
    setShowDetailsModal(true);
  };

  /* =======================================================
     OPEN PAYMENT
  ======================================================= */

  const openPayment = (bill: Bill) => {
    setSelectedBill(bill);
    setPaymentAmount("");
    setNewPaymentMethod("Cash");
    setShowPaymentModal(true);
  };

  /* =======================================================
     ADD PAYMENT
  ======================================================= */

  const handleAddPaymentPress = () => {

    if (!selectedBill) return;

    const amount =
      Number(paymentAmount) || 0;

    if (amount <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid payment amount."
      );
      return;
    }

    if (amount > selectedBill.balance) {
      Alert.alert(
        "Amount Too High",
        `Maximum payable balance is ${formatMoney(
          selectedBill.balance
        )}.`
      );
      return;
    }

    const payment: Payment = {
      id: createId("PAY"),
      billId: selectedBill.id,
      amount,
      method: newPaymentMethod,
      paymentDate: todayString(),
    };

    const updatedPaidAmount =
      selectedBill.paidAmount + amount;

    const updatedBalance =
      Math.max(
        0,
        selectedBill.total -
          updatedPaidAmount
      );

    const updatedStatus: BillStatus =
      updatedBalance <= 0
        ? "Paid"
        : updatedPaidAmount > 0
        ? "Partially Paid"
        : "Unpaid";

    const updatedBill: Bill = {
      ...selectedBill,
      paidAmount: updatedPaidAmount,
      balance: updatedBalance,
      status: updatedStatus,
      paymentMethod: newPaymentMethod,
    };

    onAddPayment(payment);
    onUpdateBill(updatedBill);

    setSelectedBill(updatedBill);
    setShowPaymentModal(false);

    Alert.alert(
      "Payment Added",
      `${formatMoney(amount)} payment recorded successfully.`
    );
  };

  /* =======================================================
     SHARE RECEIPT
  ======================================================= */

  const handleShareReceipt = async () => {

    if (!selectedBill) return;

    try {
      setReceiptBusy("share");

      const message = `
Femme Fatale Boutique
Style Speaks Louder ♡

Customer: ${selectedBill.customerName}
Item: ${selectedBill.item}

Total: ${formatMoney(selectedBill.total)}
Paid: ${formatMoney(selectedBill.paidAmount)}
Balance: ${formatMoney(selectedBill.balance)}
`;

      await Share.share({
        message,
        title: "Femme Fatale Invoice",
      });

    } catch (error) {
      console.error(
        "SHARE RECEIPT ERROR:",
        error
      );
    } finally {
      setReceiptBusy(null);
    }
  };

  /* =======================================================
     PRINT RECEIPT
  ======================================================= */

  const handlePrintReceipt = async () => {

    if (!selectedBill) return;

    try {
      setReceiptBusy("print");

      const html = buildReceiptHtml(
        selectedBill,
        payments
      );

      await Print.printAsync({
        html,
      });

    } catch (error) {

      console.error(
        "PRINT RECEIPT ERROR:",
        error
      );

      Alert.alert(
        "Print Failed",
        "Unable to open the print screen."
      );

    } finally {
      setReceiptBusy(null);
    }
  };

  /* =======================================================
     EXPORT PDF
     
     Expo Go Android compatible implementation.
     
     printToFileAsync() creates a PDF inside Expo Go's
     protected sandbox. Expo Go cannot reliably copy/share
     that URI using expo-file-system.
     
     Therefore we directly open the native print screen.
     
     User can choose:
     
     Print screen
        ↓
     Save as PDF
        ↓
     Save
     
  ======================================================= */

  const handleExportReceipt = async () => {

    if (!selectedBill) return;

    try {

      setReceiptBusy("export");

      const html = buildReceiptHtml(
        selectedBill,
        payments
      );

      console.log(
        "OPENING PDF EXPORT..."
      );

      await Print.printAsync({
        html,
      });

      console.log(
        "PDF PRINT SCREEN OPENED"
      );

    } catch (error) {

      console.error(
        "EXPORT PDF ERROR:",
        error
      );

      Alert.alert(
        "Export Failed",
        "Unable to open the PDF export screen. Please try again."
      );

    } finally {

      setReceiptBusy(null);

    }
  };

  /* =======================================================
     STATUS COLOR
  ======================================================= */

  const getStatusColor = (
    status: BillStatus
  ) => {

    if (status === "Paid") {
      return colors.Green;
    }

    if (status === "Partially Paid") {
      return colors.Orange;
    }

    return colors.Red;
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>

          <Text style={styles.brandText}>
            Femme Fatale
          </Text>

          <Text style={styles.headerTitle}>
            Billing
          </Text>

        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetCreateForm();
            setShowCreateModal(true);
          }}
        >
          <Text style={styles.addButtonText}>
            +
          </Text>
        </TouchableOpacity>

      </View>

      {/* CONTENT */}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
      >

        {/* BRAND CARD */}

        <View style={styles.brandCard}>

          <Text style={styles.brandCardTitle}>
            Femme Fatale Boutique
          </Text>

          <Text style={styles.brandCardSubtitle}>
            Style Speaks Louder ♡
          </Text>

        </View>

        {/* SUMMARY */}

        <View style={styles.summaryGrid}>

          <View style={styles.summaryCard}>

            <Text style={styles.summaryLabel}>
              Revenue
            </Text>

            <Text style={styles.summaryValue}>
              {formatMoney(totalRevenue)}
            </Text>

          </View>

          <View style={styles.summaryCard}>

            <Text style={styles.summaryLabel}>
              Outstanding
            </Text>

            <Text
              style={[
                styles.summaryValue,
                {
                  color: colors.Magenta,
                },
              ]}
            >
              {formatMoney(totalOutstanding)}
            </Text>

          </View>

          <View style={styles.summaryCard}>

            <Text style={styles.summaryLabel}>
              Paid Bills
            </Text>

            <Text style={styles.summaryValue}>
              {paidBills}
            </Text>

          </View>

          <View style={styles.summaryCard}>

            <Text style={styles.summaryLabel}>
              Pending
            </Text>

            <Text style={styles.summaryValue}>
              {pendingBills}
            </Text>

          </View>

        </View>

        {/* SEARCH */}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search customer, item or bill..."
          placeholderTextColor="#999"
          style={styles.searchInput}
        />

        {/* FILTERS */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >

          {(
            [
              "All",
              "Unpaid",
              "Partially Paid",
              "Paid",
            ] as const
          ).map((status) => {

            const active =
              statusFilter === status;

            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  active &&
                    styles.filterButtonActive,
                ]}
                onPress={() =>
                  setStatusFilter(status)
                }
              >

                <Text
                  style={[
                    styles.filterText,
                    active &&
                      styles.filterTextActive,
                  ]}
                >
                  {status}
                </Text>

              </TouchableOpacity>
            );
          })}

        </ScrollView>

        {/* BILL LIST */}

        {filteredBills.length === 0 ? (

          <View style={styles.emptyCard}>

            <Text style={styles.emptyIcon}>
              ₹
            </Text>

            <Text style={styles.emptyTitle}>
              No Bills Found
            </Text>

            <Text style={styles.emptyText}>
              Create your first invoice using
              the + button above.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                resetCreateForm();
                setShowCreateModal(true);
              }}
            >

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Create Bill
              </Text>

            </TouchableOpacity>

          </View>

        ) : (

          filteredBills.map((bill) => {

            const statusColor =
              getStatusColor(
                bill.status
              );

            return (
              <TouchableOpacity
                key={bill.id}
                style={styles.billCard}
                onPress={() =>
                  openBill(bill)
                }
                activeOpacity={0.85}
              >

                <View
                  style={
                    styles.billTopRow
                  }
                >

                  <View
                    style={
                      styles.billCustomerSection
                    }
                  >

                    <Text
                      style={
                        styles.billCustomer
                      }
                    >
                      {bill.customerName}
                    </Text>

                    <Text
                      style={
                        styles.billItem
                      }
                    >
                      {bill.item}
                    </Text>

                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          `${statusColor}18`,
                      },
                    ]}
                  >

                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            statusColor,
                        },
                      ]}
                    >
                      {bill.status}
                    </Text>

                  </View>

                </View>

                <View
                  style={
                    styles.billDivider
                  }
                />

                <View
                  style={
                    styles.billInfoRow
                  }
                >

                  <View>

                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Total
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {formatMoney(
                        bill.total
                      )}
                    </Text>

                  </View>

                  <View>

                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Paid
                    </Text>

                    <Text
                      style={[
                        styles.infoValue,
                        {
                          color:
                            colors.Green,
                        },
                      ]}
                    >
                      {formatMoney(
                        bill.paidAmount
                      )}
                    </Text>

                  </View>

                  <View>

                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Due
                    </Text>

                    <Text
                      style={[
                        styles.infoValue,
                        {
                          color:
                            bill.balance >
                            0
                              ? colors.Magenta
                              : colors.Green,
                        },
                      ]}
                    >
                      {formatMoney(
                        bill.balance
                      )}
                    </Text>

                  </View>

                </View>

                <Text
                  style={
                    styles.billDate
                  }
                >
                  {formatDate(
                    bill.billDate
                  )}
                </Text>

              </TouchableOpacity>
            );
          })

        )}

      </ScrollView>

      {/* =================================================
          CREATE BILL MODAL
      ================================================= */}

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowCreateModal(false)
        }
      >

        <View style={styles.modalOverlay}>

          <View style={styles.modalCard}>

            <View
              style={
                styles.modalHeader
              }
            >

              <Text
                style={
                  styles.modalTitle
                }
              >
                Create Bill
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setShowCreateModal(false)
                }
              >

                <Text
                  style={
                    styles.closeButton
                  }
                >
                  ×
                </Text>

              </TouchableOpacity>

            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >

              {/* CUSTOMER */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Customer
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                style={
                  styles.customerSelector
                }
              >

                {customers.map(
                  (customer) => {

                    const active =
                      selectedCustomerId ===
                      customer.id;

                    return (
                      <TouchableOpacity
                        key={
                          customer.id
                        }
                        style={[
                          styles.customerChip,
                          active &&
                            styles.customerChipActive,
                        ]}
                        onPress={() => {
                          setSelectedCustomerId(
                            customer.id
                          );

                          setSelectedOrderId(
                            ""
                          );
                        }}
                      >

                        <Text
                          style={[
                            styles.customerChipText,
                            active &&
                              styles.customerChipTextActive,
                          ]}
                        >
                          {customer.name}
                        </Text>

                      </TouchableOpacity>
                    );
                  }
                )}

              </ScrollView>

              {/* ORDER */}

              {selectedCustomerId &&
                customerOrders.length >
                  0 && (

                <>

                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    Order
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                  >

                    {customerOrders.map(
                      (order) => {

                        const active =
                          selectedOrderId ===
                          order.id;

                        return (
                          <TouchableOpacity
                            key={order.id}
                            style={[
                              styles.customerChip,
                              active &&
                                styles.customerChipActive,
                            ]}
                            onPress={() => {

                              setSelectedOrderId(
                                order.id
                              );

                              setItem(
                                order.item
                              );

                              setQuantity(
                                String(
                                  order.quantity ||
                                    1
                                )
                              );

                              setPrice(
                                String(
                                  order.price ||
                                    ""
                                )
                              );

                            }}
                          >

                            <Text
                              style={[
                                styles.customerChipText,
                                active &&
                                  styles.customerChipTextActive,
                              ]}
                            >
                              {order.item}
                            </Text>

                          </TouchableOpacity>
                        );
                      }
                    )}

                  </ScrollView>

                </>
              )}

              {/* ITEM */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Item
              </Text>

              <TextInput
                value={item}
                onChangeText={setItem}
                placeholder="e.g. Blouse"
                placeholderTextColor="#999"
                style={
                  styles.textInput
                }
              />

              {/* QUANTITY */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Quantity
              </Text>

              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#999"
                style={
                  styles.textInput
                }
              />

              {/* RATE */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Rate
              </Text>

              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="₹0"
                placeholderTextColor="#999"
                style={
                  styles.textInput
                }
              />

              {/* DISCOUNT */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Discount
              </Text>

              <TextInput
                value={discount}
                onChangeText={setDiscount}
                keyboardType="numeric"
                placeholder="₹0"
                placeholderTextColor="#999"
                style={
                  styles.textInput
                }
              />

              {/* TAX */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Tax
              </Text>

              <TextInput
                value={tax}
                onChangeText={setTax}
                keyboardType="numeric"
                placeholder="₹0"
                placeholderTextColor="#999"
                style={
                  styles.textInput
                }
              />

              {/* ADVANCE */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Advance Payment
              </Text>

              <TextInput
                value={advance}
                onChangeText={setAdvance}
                keyboardType="numeric"
                placeholder="₹0"
                placeholderTextColor="#999"
                style={
                  styles.textInput
                }
              />

              {/* PAYMENT METHOD */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Payment Method
              </Text>

              <View
                style={
                  styles.paymentMethods
                }
              >

                {(
                  [
                    "Cash",
                    "UPI",
                    "Card",
                    "Other",
                  ] as PaymentMethod[]
                ).map((method) => {

                  const active =
                    paymentMethod ===
                    method;

                  return (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethodButton,
                        active &&
                          styles.paymentMethodActive,
                      ]}
                      onPress={() =>
                        setPaymentMethod(
                          method
                        )
                      }
                    >

                      <Text
                        style={[
                          styles.paymentMethodText,
                          active &&
                            styles.paymentMethodTextActive,
                        ]}
                      >
                        {method}
                      </Text>

                    </TouchableOpacity>
                  );
                })}

              </View>

              {/* CALCULATION */}

              <View
                style={
                  styles.calculationCard
                }
              >

                <View
                  style={
                    styles.calculationRow
                  }
                >
                  <Text>
                    Subtotal
                  </Text>

                  <Text>
                    {formatMoney(
                      subtotal
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.calculationRow
                  }
                >
                  <Text>
                    Discount
                  </Text>

                  <Text>
                    - {formatMoney(
                      discountNumber
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.calculationRow
                  }
                >
                  <Text>
                    Tax
                  </Text>

                  <Text>
                    {formatMoney(
                      taxNumber
                    )}
                  </Text>
                </View>

                <View
                  style={[
                    styles.calculationRow,
                    styles.calculationTotal,
                  ]}
                >

                  <Text
                    style={
                      styles.calculationTotalText
                    }
                  >
                    Total
                  </Text>

                  <Text
                    style={
                      styles.calculationTotalText
                    }
                  >
                    {formatMoney(
                      total
                    )}
                  </Text>

                </View>

                <View
                  style={
                    styles.calculationRow
                  }
                >
                  <Text>
                    Advance
                  </Text>

                  <Text>
                    {formatMoney(
                      advanceNumber
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.calculationRow
                  }
                >

                  <Text
                    style={{
                      color:
                        colors.Magenta,
                      fontWeight:
                        "700",
                    }}
                  >
                    Balance
                  </Text>

                  <Text
                    style={{
                      color:
                        colors.Magenta,
                      fontWeight:
                        "700",
                    }}
                  >
                    {formatMoney(
                      balance
                    )}
                  </Text>

                </View>

              </View>

              <TouchableOpacity
                style={
                  styles.primaryButton
                }
                onPress={
                  handleCreateBillPress
                }
              >

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Create Invoice
                </Text>

              </TouchableOpacity>

              <View
                style={
                  styles.bottomSpace
                }
              />

            </ScrollView>

          </View>

        </View>

      </Modal>

      {/* =================================================
          BILL DETAILS MODAL
      ================================================= */}

      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowDetailsModal(false)
        }
      >

        <View style={styles.modalOverlay}>

          <View style={styles.modalCard}>

            {selectedBill && (
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
              >

                <View
                  style={
                    styles.modalHeader
                  }
                >

                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Bill Details
                  </Text>

                  <TouchableOpacity
                    onPress={() =>
                      setShowDetailsModal(
                        false
                      )
                    }
                  >

                    <Text
                      style={
                        styles.closeButton
                      }
                    >
                      ×
                    </Text>

                  </TouchableOpacity>

                </View>

                <View
                  style={
                    styles.invoiceHeader
                  }
                >

                  <Text
                    style={
                      styles.invoiceBrand
                    }
                  >
                    Femme Fatale Boutique
                  </Text>

                  <Text
                    style={
                      styles.invoiceTagline
                    }
                  >
                    Style Speaks Louder ♡
                  </Text>

                </View>

                <View
                  style={
                    styles.detailCard
                  }
                >

                  <Text
                    style={
                      styles.detailCustomer
                    }
                  >
                    {selectedBill.customerName}
                  </Text>

                  <Text
                    style={
                      styles.detailItem
                    }
                  >
                    {selectedBill.item}
                  </Text>

                  <Text
                    style={
                      styles.detailDate
                    }
                  >
                    {formatDate(
                      selectedBill.billDate
                    )}
                  </Text>

                </View>

                <View
                  style={
                    styles.detailCard
                  }
                >

                  <DetailRow
                    label="Subtotal"
                    value={formatMoney(
                      selectedBill.subtotal
                    )}
                  />

                  <DetailRow
                    label="Discount"
                    value={`- ${formatMoney(
                      selectedBill.discount
                    )}`}
                  />

                  <DetailRow
                    label="Tax"
                    value={formatMoney(
                      selectedBill.tax
                    )}
                  />

                  <DetailRow
                    label="Total"
                    value={formatMoney(
                      selectedBill.total
                    )}
                    bold
                  />

                  <DetailRow
                    label="Paid"
                    value={formatMoney(
                      selectedBill.paidAmount
                    )}
                  />

                  <DetailRow
                    label="Balance"
                    value={formatMoney(
                      selectedBill.balance
                    )}
                    bold
                    valueColor={
                      selectedBill.balance >
                      0
                        ? colors.Magenta
                        : colors.Green
                    }
                  />

                </View>

                <TouchableOpacity
                  style={
                    styles.primaryButton
                  }
                  onPress={() => {

                    setShowDetailsModal(
                      false
                    );

                    setShowReceiptModal(
                      true
                    );

                  }}
                >

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    View Receipt
                  </Text>

                </TouchableOpacity>

                {selectedBill.balance >
                  0 && (

                  <TouchableOpacity
                    style={
                      styles.secondaryButton
                    }
                    onPress={() =>
                      openPayment(
                        selectedBill
                      )
                    }
                  >

                    <Text
                      style={
                        styles.secondaryButtonText
                      }
                    >
                      Add Payment
                    </Text>

                  </TouchableOpacity>
                )}

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

      {/* =================================================
          PAYMENT MODAL
      ================================================= */}

      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowPaymentModal(false)
        }
      >

        <View style={styles.modalOverlay}>

          <View style={styles.smallModalCard}>

            <View
              style={
                styles.modalHeader
              }
            >

              <Text
                style={
                  styles.modalTitle
                }
              >
                Add Payment
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setShowPaymentModal(
                    false
                  )
                }
              >

                <Text
                  style={
                    styles.closeButton
                  }
                >
                  ×
                </Text>

              </TouchableOpacity>

            </View>

            {selectedBill && (
              <>

                <Text
                  style={
                    styles.paymentCustomer
                  }
                >
                  {selectedBill.customerName}
                </Text>

                <Text
                  style={
                    styles.paymentDue
                  }
                >
                  Balance:{" "}
                  {formatMoney(
                    selectedBill.balance
                  )}
                </Text>

                <Text
                  style={
                    styles.fieldLabel
                  }
                >
                  Amount
                </Text>

                <TextInput
                  value={paymentAmount}
                  onChangeText={
                    setPaymentAmount
                  }
                  keyboardType="numeric"
                  placeholder="₹0"
                  placeholderTextColor="#999"
                  style={
                    styles.textInput
                  }
                />

                <Text
                  style={
                    styles.fieldLabel
                  }
                >
                  Payment Method
                </Text>

                <View
                  style={
                    styles.paymentMethods
                  }
                >

                  {(
                    [
                      "Cash",
                      "UPI",
                      "Card",
                      "Other",
                    ] as PaymentMethod[]
                  ).map((method) => {

                    const active =
                      newPaymentMethod ===
                      method;

                    return (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.paymentMethodButton,
                          active &&
                            styles.paymentMethodActive,
                        ]}
                        onPress={() =>
                          setNewPaymentMethod(
                            method
                          )
                        }
                      >

                        <Text
                          style={[
                            styles.paymentMethodText,
                            active &&
                              styles.paymentMethodTextActive,
                          ]}
                        >
                          {method}
                        </Text>

                      </TouchableOpacity>
                    );
                  })}

                </View>

                <TouchableOpacity
                  style={
                    styles.primaryButton
                  }
                  onPress={
                    handleAddPaymentPress
                  }
                >

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Record Payment
                  </Text>

                </TouchableOpacity>

              </>
            )}

          </View>

        </View>

      </Modal>

      {/* =================================================
          RECEIPT MODAL
      ================================================= */}

      <Modal
        visible={showReceiptModal}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowReceiptModal(false)
        }
      >

        <View style={styles.modalOverlay}>

          <View
            style={
              styles.receiptModalCard
            }
          >

            {selectedBill && (
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
              >

                <View
                  style={
                    styles.receiptTopBar
                  }
                >

                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Invoice Preview
                  </Text>

                  <TouchableOpacity
                    onPress={() =>
                      setShowReceiptModal(
                        false
                      )
                    }
                  >

                    <Text
                      style={
                        styles.closeButton
                      }
                    >
                      ×
                    </Text>

                  </TouchableOpacity>

                </View>

                <View
                  style={
                    styles.receiptPaper
                  }
                >

                  <Text
                    style={
                      styles.receiptBrand
                    }
                  >
                    Femme Fatale Boutique
                  </Text>

                  <Text
                    style={
                      styles.receiptTagline
                    }
                  >
                    Style Speaks Louder ♡
                  </Text>

                  <View
                    style={
                      styles.receiptLine
                    }
                  />

                  <Text
                    style={
                      styles.receiptInvoiceTitle
                    }
                  >
                    INVOICE
                  </Text>

                  <Text
                    style={
                      styles.receiptCustomer
                    }
                  >
                    {selectedBill.customerName}
                  </Text>

                  <Text
                    style={
                      styles.receiptItem
                    }
                  >
                    {selectedBill.item}
                  </Text>

                  <Text
                    style={
                      styles.receiptDate
                    }
                  >
                    {formatDate(
                      selectedBill.billDate
                    )}
                  </Text>

                  <View
                    style={
                      styles.receiptLine
                    }
                  />

                  <DetailRow
                    label="Quantity"
                    value={String(
                      selectedBill.quantity
                    )}
                  />

                  <DetailRow
                    label="Rate"
                    value={formatMoney(
                      selectedBill.price
                    )}
                  />

                  <DetailRow
                    label="Subtotal"
                    value={formatMoney(
                      selectedBill.subtotal
                    )}
                  />

                  <DetailRow
                    label="Discount"
                    value={`- ${formatMoney(
                      selectedBill.discount
                    )}`}
                  />

                  <DetailRow
                    label="Tax"
                    value={formatMoney(
                      selectedBill.tax
                    )}
                  />

                  <DetailRow
                    label="Total"
                    value={formatMoney(
                      selectedBill.total
                    )}
                    bold
                  />

                  <DetailRow
                    label="Paid"
                    value={formatMoney(
                      selectedBill.paidAmount
                    )}
                  />

                  <DetailRow
                    label="Balance"
                    value={formatMoney(
                      selectedBill.balance
                    )}
                    bold
                    valueColor={
                      selectedBill.balance >
                      0
                        ? colors.Magenta
                        : colors.Green
                    }
                  />

                  <View
                    style={
                      styles.receiptLine
                    }
                  />

                  <Text
                    style={
                      styles.receiptFooter
                    }
                  >
                    Thank you for choosing
                    {"\n"}
                    Femme Fatale Boutique
                    {"\n\n"}
                    Style Speaks Louder ♡
                  </Text>

                </View>

                {/* EXPORT PDF */}

                <ReceiptActionButton
                  icon="💾"
                  title="Save / Export PDF"
                  onPress={
                    handleExportReceipt
                  }
                  loading={
                    receiptBusy ===
                    "export"
                  }
                />

                {/* PRINT */}

                <ReceiptActionButton
                  icon="🖨️"
                  title="Print Invoice"
                  onPress={
                    handlePrintReceipt
                  }
                  loading={
                    receiptBusy ===
                    "print"
                  }
                />

                {/* SHARE */}

                <ReceiptActionButton
                  icon="↗️"
                  title="Share Receipt"
                  onPress={
                    handleShareReceipt
                  }
                  loading={
                    receiptBusy ===
                    "share"
                  }
                />

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

/* =========================================================
   DETAIL ROW
========================================================= */

function DetailRow({
  label,
  value,
  bold = false,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <View
      style={
        styles.detailRow
      }
    >

      <Text
        style={[
          styles.detailRowLabel,
          bold && {
            fontWeight: "700",
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.detailRowValue,
          bold && {
            fontWeight: "700",
          },
          valueColor && {
            color: valueColor,
          },
        ]}
      >
        {value}
      </Text>

    </View>
  );
}

/* =========================================================
   RECEIPT ACTION BUTTON
========================================================= */

function ReceiptActionButton({
  icon,
  title,
  onPress,
  loading,
}: {
  icon: string;
  title: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <TouchableOpacity
      style={
        styles.receiptActionButton
      }
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >

      <Text
        style={
          styles.receiptActionIcon
        }
      >
        {icon}
      </Text>

      <Text
        style={
          styles.receiptActionText
        }
      >
        {loading
          ? "Please wait..."
          : title}
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

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* HEADER */

  header: {
    height: 70,
    backgroundColor:
      colors.PrimaryWine,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    color: colors.White,
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  brandText: {
    color: colors.White,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  headerTitle: {
    color: colors.White,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },

  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      colors.Gold,
    alignItems: "center",
    justifyContent: "center",
  },

  addButtonText: {
    color: colors.White,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "300",
  },

  /* BRAND CARD */

  brandCard: {
    backgroundColor: colors.White,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.Border,
  },

  brandCardTitle: {
    color: colors.PrimaryWine,
    fontSize: 22,
    fontWeight: "800",
  },

  brandCardSubtitle: {
    color: colors.Muted,
    marginTop: 5,
    fontSize: 13,
  },

  /* SUMMARY */

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent:
      "space-between",
    marginBottom: 14,
  },

  summaryCard: {
    width: "48.5%",
    backgroundColor: colors.White,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.Border,
  },

  summaryLabel: {
    color: colors.Muted,
    fontSize: 12,
    fontWeight: "600",
  },

  summaryValue: {
    color: colors.DarkText,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 6,
  },

  /* SEARCH */

  searchInput: {
    height: 50,
    backgroundColor: colors.White,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.Border,
    color: colors.DarkText,
    marginBottom: 12,
  },

  filterScroll: {
    marginBottom: 15,
  },

  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor:
      colors.White,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.Border,
  },

  filterButtonActive: {
    backgroundColor:
      colors.PrimaryWine,
    borderColor:
      colors.PrimaryWine,
  },

  filterText: {
    color: colors.DarkText,
    fontSize: 12,
    fontWeight: "600",
  },

  filterTextActive: {
    color: colors.White,
  },

  /* BILL CARD */

  billCard: {
    backgroundColor: colors.White,
    borderRadius: 17,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.Border,
  },

  billTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  billCustomerSection: {
    flex: 1,
  },

  billCustomer: {
    color: colors.DarkText,
    fontSize: 17,
    fontWeight: "800",
  },

  billItem: {
    color: colors.Muted,
    fontSize: 13,
    marginTop: 4,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  billDivider: {
    height: 1,
    backgroundColor:
      "#F0E8EB",
    marginVertical: 14,
  },

  billInfoRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
  },

  infoLabel: {
    color: colors.Muted,
    fontSize: 10,
    marginBottom: 3,
  },

  infoValue: {
    color: colors.DarkText,
    fontSize: 14,
    fontWeight: "800",
  },

  billDate: {
    color: colors.Muted,
    fontSize: 11,
    marginTop: 13,
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: colors.White,
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.Border,
    marginTop: 10,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor:
      colors.SoftPink,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 26,
    fontWeight: "800",
    color: colors.PrimaryWine,
    paddingTop: 14,
    overflow: "hidden",
  },

  emptyTitle: {
    color: colors.DarkText,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 15,
  },

  emptyText: {
    color: colors.Muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    marginBottom: 18,
  },

  /* MODALS */

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: colors.Cream,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "92%",
    padding: 18,
  },

  smallModalCard: {
    backgroundColor: colors.Cream,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },

  receiptModalCard: {
    backgroundColor: colors.Cream,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "95%",
    padding: 16,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 18,
  },

  modalTitle: {
    color: colors.PrimaryWine,
    fontSize: 21,
    fontWeight: "800",
  },

  closeButton: {
    color: colors.PrimaryWine,
    fontSize: 32,
    lineHeight: 32,
    fontWeight: "300",
  },

  /* FIELDS */

  fieldLabel: {
    color: colors.DarkText,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 13,
    marginBottom: 7,
  },

  textInput: {
    height: 48,
    backgroundColor: colors.White,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.Border,
    paddingHorizontal: 14,
    color: colors.DarkText,
  },

  customerSelector: {
    marginBottom: 4,
  },

  customerChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor:
      colors.White,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.Border,
  },

  customerChipActive: {
    backgroundColor:
      colors.PrimaryWine,
    borderColor:
      colors.PrimaryWine,
  },

  customerChipText: {
    color: colors.DarkText,
    fontSize: 12,
    fontWeight: "600",
  },

  customerChipTextActive: {
    color: colors.White,
  },

  /* PAYMENT */

  paymentMethods: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  paymentMethodButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor:
      colors.White,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.Border,
  },

  paymentMethodActive: {
    backgroundColor:
      colors.PrimaryWine,
    borderColor:
      colors.PrimaryWine,
  },

  paymentMethodText: {
    color: colors.DarkText,
    fontSize: 12,
    fontWeight: "600",
  },

  paymentMethodTextActive: {
    color: colors.White,
  },

  /* CALCULATION */

  calculationCard: {
    backgroundColor:
      colors.SoftPink,
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
  },

  calculationRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    paddingVertical: 6,
  },

  calculationTotal: {
    borderTopWidth: 1,
    borderTopColor:
      "rgba(139,18,56,0.2)",
    marginTop: 6,
    paddingTop: 12,
  },

  calculationTotalText: {
    color: colors.PrimaryWine,
    fontSize: 17,
    fontWeight: "800",
  },

  /* BUTTONS */

  primaryButton: {
    backgroundColor:
      colors.PrimaryWine,
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 18,
  },

  primaryButtonText: {
    color: colors.White,
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryButton: {
    backgroundColor:
      colors.SoftPink,
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 10,
  },

  secondaryButtonText: {
    color: colors.PrimaryWine,
    fontSize: 15,
    fontWeight: "800",
  },

  /* DETAILS */

  invoiceHeader: {
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor:
      colors.Border,
  },

  invoiceBrand: {
    color: colors.PrimaryWine,
    fontSize: 22,
    fontWeight: "800",
  },

  invoiceTagline: {
    color: colors.Muted,
    fontSize: 12,
    marginTop: 4,
  },

  detailCard: {
    backgroundColor: colors.White,
    borderRadius: 15,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.Border,
  },

  detailCustomer: {
    color: colors.DarkText,
    fontSize: 18,
    fontWeight: "800",
  },

  detailItem: {
    color: colors.PrimaryWine,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },

  detailDate: {
    color: colors.Muted,
    fontSize: 11,
    marginTop: 7,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    paddingVertical: 7,
  },

  detailRowLabel: {
    color: colors.Muted,
    fontSize: 13,
  },

  detailRowValue: {
    color: colors.DarkText,
    fontSize: 13,
  },

  /* PAYMENT MODAL */

  paymentCustomer: {
    color: colors.DarkText,
    fontSize: 18,
    fontWeight: "800",
  },

  paymentDue: {
    color: colors.Magenta,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
  },

  /* RECEIPT */

  receiptTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 10,
  },

  receiptPaper: {
    backgroundColor: colors.White,
    borderRadius: 4,
    padding: 22,
    borderWidth: 1,
    borderColor:
      "#E3E3E3",
  },

  receiptBrand: {
    color: colors.PrimaryWine,
    textAlign: "center",
    fontSize: 23,
    fontWeight: "800",
  },

  receiptTagline: {
    color: colors.Muted,
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },

  receiptInvoiceTitle: {
    color: colors.DarkText,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 15,
  },

  receiptCustomer: {
    color: colors.DarkText,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
  },

  receiptItem: {
    color: colors.PrimaryWine,
    textAlign: "center",
    fontSize: 14,
    marginTop: 4,
  },

  receiptDate: {
    color: colors.Muted,
    textAlign: "center",
    fontSize: 11,
    marginTop: 5,
  },

  receiptLine: {
    height: 1,
    backgroundColor:
      "#E7E7E7",
    marginVertical: 15,
  },

  receiptFooter: {
    color: colors.Muted,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 19,
  },

  receiptActionButton: {
    backgroundColor: colors.White,
    borderRadius: 14,
    minHeight: 54,
    marginTop: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.Border,
  },

  receiptActionIcon: {
    fontSize: 20,
    width: 35,
  },

  receiptActionText: {
    color: colors.DarkText,
    fontSize: 14,
    fontWeight: "700",
  },

  bottomSpace: {
    height: 25,
  },

});