import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import type {
  Bill,
  BillStatus,
  Payment,
  PaymentMethod,
} from "../lib/billService";

const colors = {
  PrimaryWine: "#AD1457",
  Magenta: "#AD1457",
  Gold: "#AD1457",
  Cream: "#FFF5F8",
  SoftPink: "#FCE5EF",
  DarkText: "#242124",
  White: "#FFFFFF",
  Muted: "#81777D",
  Border: "#F3C6D8",
  Green: "#27844B",
  Red: "#C43D4B",
  Orange: "#D9822B",
};

type BillingScreenProps = {
  customers: Customer[];
  orders: Order[];
  bills: Bill[];
  payments: Payment[];
  onBack: () => void;
  onCreateBill: (
    bill: Bill,
    initialPayment?: Payment
  ) => void;
  onAddPayment: (payment: Payment, updatedBill: Bill) => Promise<boolean>;
  onUpdateBill: (bill: Bill) => void;
  onOpenReceipt: () => void;
};

const money = (value: number | string | null | undefined) => {
  const amount = Number(value || 0);

  return "Rs. " + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const today = () => {
  const date = new Date();

  return date.toISOString().split("T")[0];
};

const makeId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
};

const calculateStatus = (
  total: number,
  paid: number
): BillStatus => {
  if (paid <= 0) {
    return "Unpaid";
  }

  if (paid >= total) {
    return "Paid";
  }

  return "Partially Paid";
};

const statusColor = (status: BillStatus) => {
  switch (status) {
    case "Paid":
      return colors.Green;

    case "Partially Paid":
      return colors.Orange;

    default:
      return colors.Red;
  }
};

const statusBackground = (status: BillStatus) => {
  switch (status) {
    case "Paid":
      return "#E8F6EC";

    case "Partially Paid":
      return "#FFF3E2";

    default:
      return "#FCEBED";
  }
};

/*
 * IMPORTANT:
 * Always prefer billNumber.
 * If a bill was created using BILL-xxxx as its id,
 * that id is also accepted as the invoice number.
 */
const getInvoiceNumber = (bill: Bill) => {
  const billNumber = String(
    bill.billNumber ?? ""
  ).trim();

  if (billNumber) {
    return billNumber;
  }

  const billId = String(
    bill.id ?? ""
  ).trim();

  if (billId.startsWith("BILL-")) {
    return billId;
  }

  return billId || "-";
};

export default function BillingScreen({
  customers,
  orders,
  bills,
  payments,
  onBack,
  onCreateBill,
  onAddPayment,
  onUpdateBill,
  onOpenReceipt,
}: BillingScreenProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "All" | BillStatus
  >("All");

  const [
    showCreateModal,
    setShowCreateModal,
  ] = useState(false);

  const [
    showDetailsModal,
    setShowDetailsModal,
  ] = useState(false);

  const [
    showPaymentModal,
    setShowPaymentModal,
  ] = useState(false);

  const [
    showReceiptModal,
    setShowReceiptModal,
  ] = useState(false);

  const [
    selectedBill,
    setSelectedBill,
  ] = useState<Bill | null>(null);

  const [
    selectedCustomerId,
    setSelectedCustomerId,
  ] = useState("");

  const [
    selectedOrderId,
    setSelectedOrderId,
  ] = useState("");

  
const [item,setItem] = useState("");

const [quantity,setQuantity] = useState("1");

const [price,setPrice] = useState("");

const [discount,setDiscount] = useState("0");

const [tax,setTax] = useState("0");




const [orderItems,setOrderItems] = useState([
 {
  description:"Plain Salwar Suit",
  quantity:1,
  amount:""
 },
 {
  description:"Lining Salwar Suit",
  quantity:1,
  amount:""
 },
 {
  description:"Gagras",
  quantity:1,
  amount:""
 },
 {
  description:"Langa-Blouse",
  quantity:1,
  amount:""
 },
 {
  description:"Models",
  quantity:1,
  amount:""
 },
 {
  description:"Blouse",
  quantity:1,
  amount:""
 },
 {
  description:"Sarees",
  quantity:1,
  amount:""
 }
]);

const [items, setItems] = useState<
{
  name: string;
  quantity: number;
  amount: number;
}[]
>([]);




const [advancePaid,setAdvancePaid] = useState("");

const [mobileNumber,setMobileNumber] = useState("");

const [dueDate,setDueDate] = useState("");

const [orderStatus,setOrderStatus] = useState("Cutting");



const updateOrderItemAmount = (
 index:number,
 value:string
)=>{
 setOrderItems(prev =>
   prev.map((item,i)=>
     i===index
       ? {...item,amount:value}
       : item
   )
 );
};


const addOrderItem = ()=>{
 setOrderItems(prev=>[
   ...prev,
   {
    description:"New Item",
    quantity:1,
    amount:""
   }
 ]);
};


const removeOrderItem = (
 index:number
)=>{
 setOrderItems(prev =>
   prev.filter((_,i)=>i!==index)
 );
};
const totalAmount =
orderItems.reduce(
  (sum,item)=>
    sum + Number(item.amount || 0),
  0
);
const balance =
totalAmount -
Number(advancePaid || 0);

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState<PaymentMethod>("Cash");

  const [advance, setAdvance] = useState("0");

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState("");

  const [
    paymentMethodForNewPayment,
    setPaymentMethodForNewPayment,
  ] = useState<PaymentMethod>("Cash");

  const [
    receiptBusy,
    setReceiptBusy,
  ] = useState<"print" | "share" | null>(null);

  const customerOrders = useMemo(() => {
    if (!selectedCustomerId) {
      return [];
    }

    return orders.filter(
      (order: any) =>
        String(
          order.customerId ??
            order.customer_id ??
            ""
        ) === String(selectedCustomerId)
    );
  }, [
    orders,
    selectedCustomerId,
  ]);

  const existingBillForSelectedOrder =
    useMemo(() => {
      if (!selectedOrderId) {
        return null;
      }

      return (
        bills.find(
          (bill) =>
            String(bill.orderId) ===
            String(selectedOrderId)
        ) ?? null
      );
    }, [
      bills,
      selectedOrderId,
    ]);

  const selectedBillPayments =
    useMemo(() => {
      if (!selectedBill) {
        return [];
      }

      return payments.filter(
        (payment) =>
          String(payment.billId) ===
          String(selectedBill.id)
      );
    }, [
      payments,
      selectedBill,
    ]);

  const filteredBills = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return bills.filter((bill) => {
      const matchesFilter =
        filter === "All" ||
        bill.status === filter;

      if (!matchesFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        bill.customerName,
        bill.item,
        bill.id,
        bill.billNumber,
        bill.orderId,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        );
    });
  }, [
    bills,
    search,
    filter,
  ]);

  const totalRevenue = useMemo(
    () =>
      bills.reduce(
        (sum, bill) =>
          sum + Number(bill.total || 0),
        0
      ),
    [bills]
  );

  const totalPending = useMemo(
    () =>
      bills.reduce(
        (sum, bill) =>
          sum + Number(bill.balance || 0),
        0
      ),
    [bills]
  );

  const paidBills = useMemo(
    () =>
      bills.filter(
        (bill) =>
          bill.status === "Paid"
      ).length,
    [bills]
  );

  const pendingBills = useMemo(
    () =>
      bills.filter(
        (bill) =>
          bill.balance > 0
      ).length,
    [bills]
  );

  const subtotal =
    Number(quantity || 0) *
    Number(price || 0);

  const discountValue =
    Number(discount || 0);

  const taxValue =
    Number(tax || 0);

  const calculatedTotal = Math.max(
    0,
    subtotal -
      discountValue +
      taxValue
  );

  const advanceValue = Math.min(
    Math.max(
      Number(advance || 0),
      0
    ),
    calculatedTotal
  );

  const calculatedBalance =
    Math.max(
      0,
      calculatedTotal -
        advanceValue
    );

  const resetCreateForm = () => {
    setSelectedCustomerId("");
    setSelectedOrderId("");
    setItem("");
    setQuantity("1");
    setPrice("");
    setDiscount("0");
    setTax("0");
    setPaymentMethod("Cash");
    setAdvance("0");
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const openDetails = (bill: Bill) => {
    setSelectedBill(bill);
    setShowDetailsModal(true);
  };

  const openPaymentModal = (bill: Bill) => {
    setSelectedBill(bill);
    setPaymentAmount("");
    setPaymentMethodForNewPayment(
      "Cash"
    );
    setShowPaymentModal(true);
  };

  /*
   * FIX:
   * Whenever a customer changes, reset the order
   * and all order-dependent invoice fields.
   */
  const handleCustomerChange = (
    customerId: string
  ) => {
    setSelectedCustomerId(customerId);
    setSelectedOrderId("");
    setItem("");
    setPrice("");
  };

  /*
   * FIX:
   * When an order is selected, read common property
   * names so the screen works with both camelCase
   * and Supabase-style objects.
   */
  const handleOrderChange = (
    orderId: string
  ) => {
    setSelectedOrderId(orderId);

    const order: any = orders.find(
      (item: any) =>
        String(item.id) ===
        String(orderId)
    );

    if (!order) {
      return;
    }

    const orderItem =
      order.item ??
      order.itemName ??
      order.productName ??
      order.product ??
      order.service ??
      "";

    const orderPrice =
      order.price ??
      order.amount ??
      order.total ??
      "";

    setItem(String(orderItem));
    setPrice(
      orderPrice === ""
        ? ""
        : String(orderPrice)
    );
  };

  const handleViewExistingInvoice = () => {
    if (!existingBillForSelectedOrder) {
      return;
    }

    setShowCreateModal(false);
    openDetails(
      existingBillForSelectedOrder
    );
  };

  const handleCreateBill = () => {
    if (!selectedCustomerId) {
      Alert.alert(
        "Customer Required",
        "Please select a customer."
      );
      return;
    }

    if (!selectedOrderId) {
      Alert.alert(
        "Order Required",
        "Please select an order."
      );
      return;
    }

    if (!item.trim()) {
      Alert.alert(
        "Item Required",
        "Please enter the item."
      );
      return;
    }

    if (Number(quantity || 0) <= 0) {
      Alert.alert(
        "Invalid Quantity",
        "Quantity must be greater than 0."
      );
      return;
    }

    if (Number(price || 0) < 0) {
      Alert.alert(
        "Invalid Price",
        "Price cannot be negative."
      );
      return;
    }

    if (
      Number(discount || 0) >
      subtotal
    ) {
      Alert.alert(
        "Invalid Discount",
        "Discount cannot be greater than subtotal."
      );
      return;
    }

    if (advanceValue > calculatedTotal) {
      Alert.alert(
        "Invalid Payment",
        "Advance cannot exceed total."
      );
      return;
    }

    if (
      existingBillForSelectedOrder
    ) {
      Alert.alert(
        "Invoice Already Exists",
        "This order already has an invoice. Please use the existing invoice.",
        [
          {
            text: "View Invoice",
            onPress:
              handleViewExistingInvoice,
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );

      return;
    }

    const customer =
      customers.find(
        (item) =>
          String(item.id) ===
          String(selectedCustomerId)
      );

    const order: any =
      orders.find(
        (item: any) =>
          String(item.id) ===
          String(selectedOrderId)
      );

    if (!customer) {
      Alert.alert(
        "Customer Not Found",
        "Please select a valid customer."
      );
      return;
    }

    if (!order) {
      Alert.alert(
        "Order Not Found",
        "Please select a valid order."
      );
      return;
    }

    /*
     * IMPORTANT:
     * Keep BILL-xxxxxxxx as both id and billNumber.
     * This guarantees the invoice number survives
     * through creation and database mapping.
     */
    const billId = `BILL-${Date.now()
      .toString()
      .slice(-8)}`;

    const bill: Bill = {
      id: billId,
      billNumber: billId,
      orderId: order.id,
      customerId:
        selectedCustomerId,
      customerName:
        customer.name,
      item: orderItems
        .filter((i)=>i.amount)
        .map((i)=>i.description)
        .join(", "),

      items:
        orderItems
          .filter((i)=>i.amount)
          .map((i)=>({
            description: i.description,
            quantity: Number(i.quantity || 0),
            amount: Number(i.amount || 0),
          })),

      quantity:
        orderItems.reduce(
          (sum,i)=>
            sum + Number(i.quantity || 0),
          0
        ),

      price:
        orderItems.reduce(
          (sum,i)=>
            sum + Number(i.amount || 0),
          0
        ),

      subtotal,
      discount:
        discountValue,
      tax:
        taxValue,
      total:
        calculatedTotal,
      paidAmount:
        advanceValue,
      balance:
        calculatedBalance,
      paymentMethod,
      status:
        calculateStatus(
          calculatedTotal,
          advanceValue
        ),
      billDate:
        today(),
    };

    let initialPayment:
      | Payment
      | undefined;

    if (advanceValue > 0) {
      initialPayment = {
        id: makeId("PAY"),
        billId: billId,
        amount: advanceValue,
        method: paymentMethod,
        paymentDate: today(),
      };
    }

    onCreateBill(
      bill,
      initialPayment
    );

    setShowCreateModal(false);
    resetCreateForm();

    Alert.alert(
      "Invoice Created",
      `${getInvoiceNumber(
        bill
      )} created successfully.`
    );
  };

  const handleAddPayment = async () => {
    if (!selectedBill) {
      return;
    }

    const amount = Number(paymentAmount || 0);

    if (amount <= 0) {
      Alert.alert("Invalid Amount", "Enter a payment amount greater than 0.");
      return;
    }

    if (amount > Number(selectedBill.balance || 0)) {
      Alert.alert("Invalid Amount", "Payment cannot be greater than the outstanding balance.");
      return;
    }

    const newPaidAmount =
      Number(selectedBill.paidAmount || 0) + amount;

    const newBalance = Math.max(
      0,
      Number(selectedBill.total || 0) - newPaidAmount
    );

    const updatedBill: Bill = {
      ...selectedBill,
      paidAmount: newPaidAmount,
      balance: newBalance,
      status: calculateStatus(
        Number(selectedBill.total || 0),
        newPaidAmount
      ),
    };

    const payment: Payment = {
      id: makeId("PAY"),
      billId: selectedBill.id,
      amount,
      method: paymentMethodForNewPayment,
      paymentDate: today(),
    };

    const saved = await onAddPayment(payment, updatedBill);

    if (!saved) {
      return;
    }

    setSelectedBill(updatedBill);
    setPaymentAmount("");
    setShowPaymentModal(false);

    Alert.alert(
      "Payment Recorded",
      `${money(amount)} payment recorded successfully.`
    );
  };

  /*
   * IMPORTANT RECEIPT FIX
   *
   * Before opening Receipt Preview, take the latest
   * bill object from the current bills array.
   *
   * This prevents an old selectedBill object from
   * showing blank invoice/customer/item/quantity.
   */
  const openReceipt = (bill: Bill) => {
    const latestBill =
      bills.find(
        (item) =>
          String(item.id) ===
          String(bill.id)
      ) ?? bill;

    setSelectedBill(
      latestBill
    );

    setShowDetailsModal(false);
    setShowReceiptModal(true);
  };

  const buildReceiptHtml = (
    bill: Bill
  ) => {
    const invoiceNumber =
      getInvoiceNumber(bill);

    const customerName =
      bill.customerName || "-";

    const billItem =
      bill.item || "-";

    const billQuantity =
      String(
        bill.quantity || 0
      );

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body {
    font-family: Arial, sans-serif;
    padding: 24px;
    color: #242124;
  }

  .receipt {
    max-width: 500px;
    margin: auto;
  }

  .brand {
    text-align: center;
    color: #AD1457;
    font-size: 30px;
    font-weight: 800;
  }

  .boutique {
    text-align: center;
    color: #C69A3A;
    font-size: 12px;
    letter-spacing: 5px;
    font-weight: bold;
    margin-top: 5px;
  }

  .tagline {
    text-align: center;
    color: #81777D;
    font-size: 12px;
    font-style: italic;
    margin-top: 7px;
  }

  .divider {
    border-top: 1px solid #E9DDE2;
    margin: 20px 0;
  }

  .info {
    font-size: 13px;
    margin-bottom: 8px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    padding: 7px 0;
    font-size: 13px;
  }

  .total {
    color: #AD1457;
    font-size: 17px;
    font-weight: 800;
  }

  .balance {
    color: #C43D4B;
    font-size: 15px;
    font-weight: 800;
  }

  .footer {
    text-align: center;
    color: #81777D;
    font-size: 12px;
    margin-top: 30px;
  }

  .footer-brand {
    color: #AD1457;
    font-weight: 800;
    font-size: 14px;
    margin-top: 4px;
  }
</style>
</head>

<body>
<div class="receipt">

 <div class="brand">
  Femme Fatale <b>BOUTIQUE</b>
</div>

<div class="subtitle">
  FASHION DESIGN WEAR & GARMENTS
</div>

<div class="tagline">
  Style Speaks Louder â™¡
</div>

  <div class="divider"></div>

  <div class="info">
    <strong>Bill:</strong>
${invoiceNumber}
  </div>

  <div class="info">
    <strong>Customer:</strong>
    ${customerName}
  </div>

  <div class="info">
    <strong>Item:</strong>
    ${billItem}
  </div>

  <div class="info">
    <strong>Quantity:</strong>
    ${billQuantity}
  </div>

  <div class="divider"></div>

  <div class="row">
    <span>Subtotal</span>
    <span>${money(
      bill.subtotal
    )}</span>
  </div>

  <div class="row">
    <span>Discount</span>
    <span>-${money(
      bill.discount
    )}</span>
  </div>


  <div class="row total">
    <span>Total</span>
    <span>${money(
      bill.total
    )}</span>
  </div>

  <div class="row">
    <span>Paid</span>
    <span>${money(
      bill.paidAmount
    )}</span>
  </div>

  <div class="row balance">
    <span>Balance</span>
    <span>${money(
      bill.balance
    )}</span>
  </div>

  <div class="divider"></div>

 <div class="footer">

  <div>
    * This bill is valid up to 30 days only.
  </div>

  <div class="footer-brand">
    Thank you for choosing Femme Fatale Boutique
  </div>

  <div>
    Shop No. 27, VMRDA Complex,
    Udyog Bhavan Complex,
    Siripuram Junction,
    Visakhapatnam - 530003,
    Andhra Pradesh.
  </div>

</div>

</div>
</body>
</html>
`;
  };

  const handlePrintReceipt = async () => {
    if (!selectedBill) {
      return;
    }

    try {
      setReceiptBusy("print");

      const html =
        buildReceiptHtml(
          selectedBill
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
        "Print Error",
        "Unable to open the print screen."
      );
    } finally {
      setReceiptBusy(null);
    }
  };

  const handleShareReceipt = async () => {
    if (!selectedBill) {
      return;
    }

    try {
      setReceiptBusy("share");

      const invoiceNumber =
        getInvoiceNumber(
          selectedBill
        );

      const message = `
Femme Fatale Boutique

Invoice: ${invoiceNumber}
Customer: ${
        selectedBill.customerName ||
        "-"
      }
Item: ${
        selectedBill.item ||
        "-"
      }
Quantity: ${String(
        selectedBill.quantity || 0
      )}

Subtotal: ${money(
        selectedBill.subtotal
      )}
Discount: -${money(
        selectedBill.discount
      )}
Tax: ${money(
        selectedBill.tax
      )}
Total: ${money(
        selectedBill.total
      )}
Paid: ${money(
        selectedBill.paidAmount
      )}
Balance: ${money(
        selectedBill.balance
      )}

Thank you for choosing Femme Fatale Boutique
`;

      await Share.share({
        message:
          message.trim(),
        title:
          `Receipt ${invoiceNumber}`,
      });
    } catch (error) {
      console.error(
        "SHARE RECEIPT ERROR:",
        error
      );

      Alert.alert(
        "Share Error",
        "Unable to share the receipt."
      );
    } finally {
      setReceiptBusy(null);
    }
  };

  return (
    <View
      style={
        styles.container
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <View
          style={
            styles.header
          }
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={onBack}
          >
            <MaterialCommunityIcons name="chevron-left" size={30} color="#AD1457" />
          </TouchableOpacity>

          <View
            style={
              styles.headerTextArea
            }
          >
            <Text
              style={
                styles.title
              }
            >
              Billing
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Manage invoices & boutique payments
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.addButton
            }
            onPress={
              openCreateModal
            }
          >
            <Text
              style={
                styles.addButtonText
              }
            >
              + BILL
            </Text>
          </TouchableOpacity>
        </View>

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <View
          style={
            styles.summaryGrid
          }
        >
          <SummaryCard
            title="Total Revenue"
            value={money(
              totalRevenue
            )}
            icon="currency-inr"
          />

          <SummaryCard
            title="Pending Amount"
            value={money(
              totalPending
            )}
            icon="alert-circle-outline"
          />

          <SummaryCard
            title="Paid Invoices"
            value={String(
              paidBills
            )}
            icon="check-circle-outline"
          />

          <SummaryCard
            title="Pending Invoices"
            value={String(
              pendingBills
            )}
            icon="clock-outline"
          />
        </View>

        {/* =====================================================
            SEARCH
        ===================================================== */}

        <View
          style={
            styles.searchContainer
          }
        >
          <MaterialCommunityIcons name="magnify" size={23} color="#AD1457" style={{ marginRight: 7 }} />

          <TextInput
            value={search}
            onChangeText={
              setSearch
            }
            placeholder="Search invoice, customer or item..."
            placeholderTextColor="#A59BA0"
            style={
              styles.searchInput
            }
          />
        </View>

        {/* =====================================================
            FILTERS
        ===================================================== */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterRow
          }
        >
          {(
            [
              "All",
              "Unpaid",
              "Partially Paid",
              "Paid",
            ] as const
          ).map(
            (status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  filter ===
                    status &&
                    styles.filterChipActive,
                ]}
                onPress={() =>
                  setFilter(
                    status
                  )
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    filter ===
                      status &&
                      styles.filterTextActive,
                  ]}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {/* =====================================================
            BILL SECTION
        ===================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Invoices
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {filteredBills.length} invoice
              {filteredBills.length ===
              1
                ? ""
                : "s"} found
            </Text>
          </View>

          {pendingBills > 0 && (
            <Text
              style={
                styles.pendingText
              }
            >
              {pendingBills} pending
            </Text>
          )}
        </View>

        {filteredBills.length ===
        0 ? (
          <EmptyState
            onCreate={
              openCreateModal
            }
          />
        ) : (
          filteredBills.map(
            (bill) => (
              <BillCard
                key={
                  bill.id
                }
                bill={
                  bill
                }
                onPress={() =>
                  openDetails(
                    bill
                  )
                }
                onPayment={() =>
                  openPaymentModal(
                    bill
                  )
                }
              />
            )
          )
        )}
      </ScrollView>

      {/* =====================================================
          Create Bill MODAL
      ===================================================== */}

      <Modal
        visible={
          showCreateModal
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowCreateModal(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Create Bill
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Create a new boutique bill
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setShowCreateModal(
                    false
                  )
                }
              >
                <MaterialCommunityIcons
  name="close"
  size={24}
  color="#AD1457"
/>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
            >
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
                contentContainerStyle={
                  styles.chipList
                }
              >
                {customers.filter((customer) => customer.name?.trim()).map(
                  (customer) => (
                    <TouchableOpacity
                      key={
                        customer.id
                      }
                      style={[
                        styles.choiceChip,
                        selectedCustomerId ===
                          String(
                            customer.id
                          ) &&
                          styles.choiceChipActive,
                      ]}
                      onPress={() =>
                        handleCustomerChange(
                          String(
                            customer.id
                          )
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.choiceChipText,
                          selectedCustomerId ===
                            String(
                              customer.id
                            ) &&
                            styles.choiceChipTextActive,
                        ]}
                      >
                        {
                          customer.name
                        }
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>

              {selectedCustomerId && (
                <>
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    Order
                  </Text>

                  {customerOrders.length ===
                  0 ? (
                    <Text
                      style={
                        styles.emptyHistory
                      }
                    >
                      No orders found for this customer.
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={
                        false
                      }
                      contentContainerStyle={
                        styles.chipList
                      }
                    >
                      {customerOrders.map(
                        (
                          order: any
                        ) => {
                          const alreadyBilled =
                            bills.some(
                              (
                                bill
                              ) =>
                                String(
                                  bill.orderId
                                ) ===
                                String(
                                  order.id
                                )
                            );

                          return (
                            <TouchableOpacity
                              key={
                                order.id
                              }
                              style={[
                                styles.choiceChip,
                                selectedOrderId ===
                                  String(
                                    order.id
                                  ) &&
                                  styles.choiceChipActive,
                                alreadyBilled &&
                                  styles.choiceChipBilled,
                              ]}
                              onPress={() =>
                                handleOrderChange(
                                  String(
                                    order.id
                                  )
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.choiceChipText,
                                  selectedOrderId ===
                                    String(
                                      order.id
                                    ) &&
                                    styles.choiceChipTextActive,
                                ]}
                              >
                                {String(
                                  order.orderNumber ??
                                    order.id
                                )}
                                {alreadyBilled
                                  ? "| Billed"
                                  : ""}
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                      )}
                    </ScrollView>
                  )}
                </>
              )}

              {existingBillForSelectedOrder && (
                <View
                  style={
                    styles.existingBillWarning
                  }
                >
                  <Text
                    style={
                      styles.existingBillWarningTitle
                    }
                  >
                    Invoice already exists
                  </Text>

                  <Text
                    style={
                      styles.existingBillWarningText
                    }
                  >
                    This order already has an invoice.
                  </Text>

                  <Text
                    style={
                      styles.existingBillNumber
                    }
                  >
                    {getInvoiceNumber(
                      existingBillForSelectedOrder
                    )}
                  </Text>

                  <Text
                    style={
                      styles.existingBillAmount
                    }
                  >
                    Total:{" "}
                    {money(
                      existingBillForSelectedOrder.total
                    )}
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.viewExistingButton
                    }
                    onPress={
                      handleViewExistingInvoice
                    }
                  >
                    <Text
                      style={
                        styles.viewExistingButtonText
                      }
                    >
                      View Existing Invoice
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              
<Field
  label="Mobile Number"
  value={mobileNumber}
  onChangeText={setMobileNumber}
  placeholder="9876543210"
  keyboardType="numeric"
/>


<Field
  label="Due Date"
  value={dueDate}
  onChangeText={setDueDate}
  placeholder="DD-MM-YYYY"
/>


<Text
  style={styles.fieldLabel}
>
  Order Status
</Text>


<View style={styles.statusRow}>

{
[
"New",
"Cutting",
"Delivered"
].map((status)=>(
<TouchableOpacity
 key={status}
 style={[
 styles.choiceChip,
 orderStatus===status &&
 styles.choiceChipActive
 ]}
 onPress={()=>
 setOrderStatus(status)
 }
>

<Text
style={[
styles.choiceChipText,
orderStatus===status &&
styles.choiceChipTextActive
]}
>
{status}
</Text>

</TouchableOpacity>
))
}

</View>

<Text
  style={styles.fieldLabel}
>
  Items
</Text>


{
orderItems.map((orderItem,index)=>(
<View
key={index}
style={styles.itemCard}
>

<Field
label="Item Name"
value={orderItem.description}
onChangeText={(value)=>
setOrderItems(prev=>
prev.map((item,i)=>
i===index
? {...item,description:value}
:item
)
)
}
placeholder="Dress, Blouse, Saree..."
/>


<View
style={styles.twoColumn}
>

<View
style={styles.column}
>

<Field
label="Quantity"
value={String(orderItem.quantity)}
onChangeText={(value)=>
setOrderItems(prev=>
prev.map((item,i)=>
i===index
? {
...item,
quantity:Number(value || 1)
}
:item
)
)
}
placeholder="1"
keyboardType="numeric"
/>

</View>


<View
style={styles.column}
>

<Field
label="Amount"
value={orderItem.amount}
onChangeText={(value)=>
setOrderItems(prev=>
prev.map((item,i)=>
i===index
? {
...item,
amount:value
}
:item
)
)
}
placeholder="0"
keyboardType="numeric"
/>

</View>

</View>


<TouchableOpacity
onPress={()=>
setOrderItems(prev=>
prev.filter((_,i)=>i!==index)
)
}
>
<Text>
Remove Item
</Text>
</TouchableOpacity>


</View>
))
}


<TouchableOpacity
style={styles.primaryButton}
onPress={()=>
setOrderItems(prev=>[
...prev,
{
description:"",
quantity:1,
amount:""
}
])
}
>
<Text style={styles.primaryButtonText}>
+ Add Item
</Text>
</TouchableOpacity>


<View
style={styles.twoColumn}
>
                <View
                  style={
                    styles.column
                  }
                >
                  <Field
                    label="Discount"
                    value={
                      discount
                    }
                    onChangeText={
                      setDiscount
                    }
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
</View>

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Payment Method
              </Text>

              <PaymentMethods
                selected={
                  paymentMethod
                }
                onSelect={
                  setPaymentMethod
                }
              />

              <Field
                label="Advance Payment"
                value={
                  advance
                }
                onChangeText={
                  setAdvance
                }
                placeholder="0"
                keyboardType="numeric"
              />

              <View
                style={
                  styles.calculationCard
                }
              >
                <CalculationRow
                  label="Subtotal"
                  value={money(
                    subtotal
                  )}
                />

                <CalculationRow
                  label="Discount"
                  value={`-${money(
                    discountValue
                  )}`}
                />

                <CalculationRow
                  label="Tax"
                  value={money(
                    taxValue
                  )}
                />

                <View
                  style={
                    styles.calculationDivider
                  }
                />

                <CalculationRow
                  label="Total"
                  value={money(
                    calculatedTotal
                  )}
                  strong
                />

                <CalculationRow
                  label="Advance"
                  value={money(
                    advanceValue
                  )}
                />

                <CalculationRow
                  label="Balance"
                  value={money(
                    calculatedBalance
                  )}
                  strong
                  danger={
                    calculatedBalance >
                    0
                  }
                />
              </View>

              <TouchableOpacity
                style={
                  styles.primaryButton
                }
                onPress={
                  handleCreateBill
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Create Bill
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

      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      <Modal
        visible={
          showDetailsModal
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowDetailsModal(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            {selectedBill && (
              <>
                <View
                  style={
                    styles.modalHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.modalTitle
                      }
                    >
                      BILL DETAILS
                    </Text>

                    <Text
                      style={
                        styles.modalSubtitle
                      }
                    >
                      {getInvoiceNumber(
                        selectedBill
                      )}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      setShowDetailsModal(
                        false
                      )
                    }
                  >
                    <MaterialCommunityIcons
  name="close"
  size={24}
  color="#AD1457"
/>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={
                    false
                  }
                >
                  <View
                    style={
                      styles.detailHero
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.detailCustomer
                        }
                      >
                        {
                          selectedBill.customerName
                        }
                      </Text>

                      
                    </View>

                    <StatusBadge
                      status={
                        selectedBill.status
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.detailsSection
                    }
                  >
                    <Text
                      style={
                        styles.detailsSectionTitle
                      }
                    >
                      BILL INFORMATION
                    </Text>

                    <DetailRow
                      label="Invoice"
                      value={getInvoiceNumber(
                        selectedBill
                      )}
                    />

                    <DetailRow
                      label="Date"
                      value={formatDate(
                        selectedBill.billDate
                      )}
                    />

                    <DetailRow
                      label="Item"
                      value={"â€”"}
                    />

                    <DetailRow
                      label="Quantity"
                      value={String(
                        selectedBill.quantity ||
                          0
                      )}
                    />

                    <DetailRow
                      label="Payment Method"
                      value={
                        selectedBill.paymentMethod ||
                        "-"
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.detailsSection
                    }
                  >
                    <Text
                      style={
                        styles.detailsSectionTitle
                      }
                    >
                      Amount Details
                    </Text>

                    <DetailRow
                      label="Subtotal"
                      value={money(
                        selectedBill.subtotal
                      )}
                    />

                    <DetailRow
                      label="Discount"
                      value={`-${money(
                        selectedBill.discount
                      )}`}
                    />

                    <DetailRow
                      label="Total"
                      value={money(
                        selectedBill.total
                      )}
                      strong
                    />

                    <DetailRow
                      label="Paid"
                      value={money(
                        selectedBill.paidAmount
                      )}
                    />

                    <DetailRow
                      label="Balance"
                      value={money(
                        selectedBill.balance
                      )}
                      strong
                      danger={
                        selectedBill.balance >
                        0
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.detailsSection
                    }
                  >
                    <Text
                      style={
                        styles.detailsSectionTitle
                      }
                    >
                      Payment History
                    </Text>

                    {selectedBillPayments.length ===
                    0 ? (
                      <Text
                        style={
                          styles.emptyHistory
                        }
                      >
                        No payments recorded yet.
                      </Text>
                    ) : (
                      selectedBillPayments.map(
                        (
                          payment
                        ) => (
                          <View
                            key={
                              payment.id
                            }
                            style={
                              styles.paymentHistoryRow
                            }
                          >
                            <View>
                              <Text
                                style={
                                  styles.paymentHistoryMethod
                                }
                              >
                                {
                                  payment.method
                                }
                              </Text>

                              <Text
                                style={
                                  styles.paymentHistoryDate
                                }
                              >
                                {formatDate(
                                  payment.paymentDate
                                )}
                              </Text>
                            </View>

                            <Text
                              style={
                                styles.paymentHistoryAmount
                              }
                            >
                              {money(
                                payment.amount
                              )}
                            </Text>
                          </View>
                        )
                      )
                    )}
                  </View>

                  <View
                    style={
                      styles.actionGrid
                    }
                  >
                    {selectedBill.balance >
                      0 && (
                      <ActionButton
                        title="Add Payment"
                        icon="â‚¹"
                        onPress={() => {
                          setShowDetailsModal(
                            false
                          );

                          openPaymentModal(
                            selectedBill
                          );
                        }}
                      />
                    )}

                    {/* =================================================
                        RECEIPT FIX
                    ================================================= */}

                    <ActionButton
                      title="Receipt"
                      icon="file-document-outline"
                      onPress={() => {
                        openReceipt(
                          selectedBill
                        );
                      }}
                    />

                    <ActionButton
                      title="Receipt History"
                      icon="â—·"
                      onPress={() => {
                        setShowDetailsModal(
                          false
                        );

                        onOpenReceipt();
                      }}
                    />
                  </View>

                  <View
                    style={
                      styles.bottomSpace
                    }
                  />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* =====================================================
          PAYMENT MODAL
      ===================================================== */}

      <Modal
        visible={
          showPaymentModal
        }
        animationType="fade"
        transparent
        onRequestClose={() =>
          setShowPaymentModal(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.smallModalCard
            }
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Add Payment
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Record customer payment
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setShowPaymentModal(
                    false
                  )
                }
              >
                <MaterialCommunityIcons
  name="close"
  size={24}
  color="#AD1457"
/>
              </TouchableOpacity>
            </View>

            {selectedBill && (
              <>
                <View
                  style={
                    styles.balanceHighlight
                  }
                >
                  <Text
                    style={
                      styles.balanceHighlightLabel
                    }
                  >
                    Outstanding Balance
                  </Text>

                  <Text
                    style={
                      styles.balanceHighlightValue
                    }
                  >
                    {money(
                      selectedBill.balance
                    )}
                  </Text>
                </View>

                <Field
                  label="Payment Amount"
                  value={
                    paymentAmount
                  }
                  onChangeText={
                    setPaymentAmount
                  }
                  placeholder="Enter amount"
                  keyboardType="numeric"
                />

                <Text
                  style={
                    styles.fieldLabel
                  }
                >
                  Payment Method
                </Text>

                <PaymentMethods
                  selected={
                    paymentMethodForNewPayment
                  }
                  onSelect={
                    setPaymentMethodForNewPayment
                  }
                />

                <TouchableOpacity
                  style={
                    styles.primaryButton
                  }
                  onPress={
                    handleAddPayment
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

      {/* =====================================================
          RECEIPT PREVIEW
      ===================================================== */}

      <Modal
        visible={
          showReceiptModal
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowReceiptModal(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            {selectedBill && (
              <>
                <View
                  style={
                    styles.modalHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.modalTitle
                      }
                    >
                      Receipt Preview
                    </Text>

                    <Text
                      style={
                        styles.modalSubtitle
                      }
                    >
                      {getInvoiceNumber(
                        selectedBill
                      )}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      setShowReceiptModal(
                        false
                      )
                    }
                  >
                    <MaterialCommunityIcons
  name="close"
  size={24}
  color="#AD1457"
/>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={
                    false
                  }
                >
                  <View style={styles.receiptPreview}>

  {/* HEADER */}
  <Text style={styles.receiptLogo}>
    FEMMEFATALE
  </Text>

  <Text style={styles.receiptBoutique}>
    B O U T I Q U E
  </Text>

  <Text style={styles.receiptService}>
    Trendy Outfits | Custom Stitching | Tailoring
  </Text>

  <Text style={styles.receiptContact}>
    Phone: +91 8790902827    GSTIN: 37AABCU0026A1Z2
  </Text>

  <View style={styles.receiptDivider}/>

  {/* BILL INFO */}
  <View style={styles.invoiceInfo}>
    <View style={{flex:1}}>
      <ReceiptRow
        label="Bill Number"
        value={getInvoiceNumber(selectedBill)}
      />

      <ReceiptRow
        label="Customer Name"
        value={
          selectedBill.customerName ||
          customers.find(
            (c) =>
              String(c.id) ===
              String(selectedBill.customerId)
          )?.name ||
          "-"
        }
      />

      <ReceiptRow
        label="GST No"
        value="No Gst Number"
      />
    </View>

    <View style={{flex:1}}>
      <ReceiptRow
        label="Booking Date"
        value={selectedBill.billDate || "-"}
      />

      <ReceiptRow
        label="Delivery Date"
        value="-"
      />

      <ReceiptRow
        label="Payment"
        value={selectedBill.paymentMethod}
      />
    </View>
  </View>

  <View style={styles.receiptDivider}/>

  {/* ITEM TABLE HEADER */}
  <View style={styles.tableHeader}>
    <Text style={styles.tableItem}>
      Item Name | Service | Remarks
    </Text>

    <Text style={styles.tableQty}>
      Qty
    </Text>

    <Text style={styles.tableAmount}>
      Amount
    </Text>
  </View>

  {/* ITEMS */}
  {selectedBill.items &&
  selectedBill.items.length > 0 ? (
    selectedBill.items.map(
      (item: any, index: number) => (
        <View
          key={index}
          style={styles.tableRow}
        >
          <Text style={styles.tableItem}>
            {item.description}
          </Text>

          <Text style={styles.tableQty}>
            {item.quantity}
          </Text>

          <Text style={styles.tableAmount}>
            {money(item.amount)}
          </Text>
        </View>
      )
    )
  ) : (
    <View style={styles.tableRow}>
      <Text style={styles.tableItem}>
        {
          selectedBill.item ||
          (orders as any).find(
            (o: any) =>
              String(o.id) ===
              String(selectedBill.orderId)
          )?.item ||
          (orders as any).find(
            (o: any) =>
              String(o.id) ===
              String(selectedBill.orderId)
          )?.itemName ||
          (orders as any).find(
            (o: any) =>
              String(o.id) ===
              String(selectedBill.orderId)
          )?.productName ||
          (orders as any).find(
            (o: any) =>
              String(o.id) ===
              String(selectedBill.orderId)
          )?.product ||
          "-"
        }
      </Text>

      <Text style={styles.tableQty}>
        {
          String(
            selectedBill.quantity ||
            (orders as any).find(
              (o: any) =>
                String(o.id) ===
                String(selectedBill.orderId)
            )?.quantity ||
            (orders as any).find(
              (o: any) =>
                String(o.id) ===
                String(selectedBill.orderId)
            )?.qty ||
            1
          )
        }
      </Text>

      <Text style={styles.tableAmount}>
        {
          money(
            selectedBill.price ||
            (orders as any).find(
              (o: any) =>
                String(o.id) ===
                String(selectedBill.orderId)
            )?.price ||
            (orders as any).find(
              (o: any) =>
                String(o.id) ===
                String(selectedBill.orderId)
            )?.amount ||
            (orders as any).find(
              (o: any) =>
                String(o.id) ===
                String(selectedBill.orderId)
            )?.total ||
            0
          )
        }
      </Text>
    </View>
  )}

  <View style={styles.receiptDivider}/>

  {/* TOTAL SECTION */}
  <ReceiptRow
    label="Total Pieces"
    value={
      String(
        selectedBill.quantity ||
        (orders as any).find(
          (o: any) =>
            String(o.id) ===
            String(selectedBill.orderId)
        )?.quantity ||
        (orders as any).find(
          (o: any) =>
            String(o.id) ===
            String(selectedBill.orderId)
        )?.qty ||
        1
      )
    }
  />

  <ReceiptRow
    label="Total Price"
    value={money(selectedBill.subtotal)}
  />

  <ReceiptRow
    label="Discount"
    value={`-${money(selectedBill.discount)}`}
  />

  <ReceiptRow
    label="Net Price"
    value={money(
      Number(selectedBill.subtotal) -
      Number(selectedBill.discount)
    )}
  />

  <ReceiptRow
    label="CGST (9%)"
    value={money(Number(selectedBill.tax) / 2)}
  />

  <ReceiptRow
    label="SGST (9%)"
    value={money(Number(selectedBill.tax) / 2)}
  />

  <View style={styles.grandTotalBox}>
    <Text style={styles.grandTotalLabel}>
      Grand Total
    </Text>

    <Text style={styles.grandTotalValue}>
      {money(selectedBill.total)}
    </Text>
  </View>

  <View style={styles.receiptDivider}/>

  <Text style={styles.receiptFooterBrand}>
    Thank you for choosing FemmeFatale!
  </Text>

  <Text style={styles.receiptFooter}>
    We look forward to serving you again!
  </Text>

  <Text style={styles.receiptFooterBrand}>
    FemmeFatale Boutique
  </Text>

</View>
<View
                    style={
                      styles.receiptActions
                    }
                  >
                    <ReceiptActionButton
                      icon="P"
                      title="Print"
                      onPress={
                        handlePrintReceipt
                      }
                      loading={
                        receiptBusy ===
                        "print"
                      }
                    />

                    <ReceiptActionButton
                      icon="S"
                      title="Share"
                      onPress={
                        handleShareReceipt
                      }
                      loading={
                        receiptBusy ===
                        "share"
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.exportNote
                    }
                  >
                    Print opens the device print screen. From there you can choose "Save as PDF".
                  </Text>

                  <View
                    style={
                      styles.bottomSpace
                    }
                  />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <View
      style={
        styles.summaryCard
      }
    >
      <View
        style={
          styles.summaryIcon
        }
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={22}
          color="#AD1457"
        />
      </View>

      <Text
        style={
          styles.summaryTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   BILL CARD
========================================================= */

function BillCard({
  bill,
  onPress,
  onPayment,
}: {
  bill: Bill;
  onPress: () => void;
  onPayment: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={
        styles.billCard
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.billTop
        }
      >
        <View
          style={
            styles.invoiceIcon
          }
        >
          <MaterialCommunityIcons name="file-document-outline" size={23} color="#AD1457" />
        </View>

        <View
          style={
            styles.billMain
          }
        >
          <Text
            style={
              styles.billCustomer
            }
          >
            {
              bill.customerName
            }
          </Text>

          <Text
            style={
              styles.billItem
            }
          >
            {
              bill.item
            }
          </Text>

          <Text
            style={
              styles.billNumber
            }
          >
            {getInvoiceNumber(
              bill
            )}{" "}
            |{" "}{" "}
            {formatDate(
              bill.billDate
            )}
          </Text>
        </View>

        <StatusBadge
          status={
            bill.status
          }
        />
      </View>

      <View
        style={
          styles.billDivider
        }
      />

      <View
        style={
          styles.billAmountRow
        }
      >
        <View>
          <Text
            style={
              styles.amountLabel
            }
          >
            Total
          </Text>

          <Text
            style={
              styles.totalAmount
            }
          >
            {money(
              bill.total
            )}
          </Text>
        </View>

        <View
          style={
            styles.amountMiddle
          }
        >
          <Text
            style={
              styles.amountLabel
            }
          >
            Paid
          </Text>

          <Text
            style={
              styles.paidAmount
            }
          >
            {money(
              bill.paidAmount
            )}
          </Text>
        </View>

        <View
          style={
            styles.amountRight
          }
        >
          <Text
            style={
              styles.amountLabel
            }
          >
            Due
          </Text>

          <Text
            style={[
              styles.dueAmount,
              bill.balance <=
                0 &&
                styles.paidAmount,
            ]}
          >
            {money(
              bill.balance
            )}
          </Text>
        </View>
      </View>

      {bill.balance >
        0 && (
        <TouchableOpacity
          style={
            styles.payButton
          }
          onPress={(
            event
          ) => {
            event.stopPropagation();
            onPayment();
          }}
        >
          <Text
            style={
              styles.payButtonText
            }
          >
            + Add Payment
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

/* =========================================================
   STATUS
========================================================= */

function StatusBadge({
  status,
}: {
  status: BillStatus;
}) {
  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor:
            statusBackground(
              status
            ),
        },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor:
              statusColor(
                status
              ),
          },
        ]}
      />

      <Text
        style={[
          styles.statusText,
          {
            color:
              statusColor(
                status
              ),
          },
        ]}
      >{status === "Paid" || status === "Partially Paid" || status === "Unpaid" ? status : "Status"}</Text>
    </View>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (
    value: string
  ) => void;
  placeholder: string;
  keyboardType?:
    | "default"
    | "numeric";
}) {
  return (
    <View
      style={
        styles.fieldContainer
      }
    >
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#A59BA0"
        keyboardType={
          keyboardType
        }
        style={
          styles.input
        }
      />
    </View>
  );
}

/* =========================================================
   PAYMENT METHODS
========================================================= */

function PaymentMethods({
  selected,
  onSelect,
}: {
  selected: PaymentMethod;
  onSelect: (
    method: PaymentMethod
  ) => void;
}) {
  const methods: PaymentMethod[] =
    [
      "Cash",
      "UPI",
      "Card",
      "Other",
    ];

  return (
    <View
      style={
        styles.paymentMethodGrid
      }
    >
      {methods.map(
        (method) => (
          <TouchableOpacity
            key={
              method
            }
            style={[
              styles.paymentMethodButton,
              selected ===
                method &&
                styles.paymentMethodButtonActive,
            ]}
            onPress={() =>
              onSelect(
                method
              )
            }
          >
            <Text
              style={[
                styles.paymentMethodText,
                selected ===
                  method &&
                  styles.paymentMethodTextActive,
              ]}
            >
              {method}
            </Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

/* =========================================================
   CALCULATION ROW
========================================================= */

function CalculationRow({
  label,
  value,
  strong = false,
  danger = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <View
      style={
        styles.calculationRow
      }
    >
      <Text
        style={[
          styles.calculationLabel,
          strong &&
            styles.calculationStrong,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.calculationValue,
          strong &&
            styles.calculationStrong,
          danger &&
            styles.calculationDanger,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   DETAIL ROW
========================================================= */

function DetailRow({
  label,
  value,
  strong = false,
  danger = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
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
        {label}
      </Text>

      <Text
        style={[
          styles.detailValue,
          strong &&
            styles.detailValueStrong,
          danger &&
            styles.detailValueDanger,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   RECEIPT ROW
========================================================= */

function ReceiptRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View
      style={
        styles.receiptRow
      }
    >
      <Text
        style={[
          styles.receiptRowLabel,
          strong &&
            styles.receiptRowStrong,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.receiptRowValue,
          strong &&
            styles.receiptRowStrong,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   ACTION BUTTON
========================================================= */

function ActionButton({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={
        styles.actionButton
      }
      onPress={
        onPress
      }
    >
      <Text
        style={
          styles.actionButtonIcon
        }
      >{title === "Receipt" ? "R" : title === "Receipt History" ? "H" : title === "Add Payment" ? "+" : ""}</Text>

      <Text
        style={
          styles.actionButtonText
        }
      >
        {title}
      </Text>
    </TouchableOpacity>
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
      onPress={
        onPress
      }
      disabled={
        loading
      }
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            colors.PrimaryWine
          }
        />
      ) : (
        <Text
          style={
            styles.receiptActionIcon
          }
        >{title === "Print" ? "P" : title === "Share" ? "S" : ""}</Text>
      )}

      <Text
        style={
          styles.receiptActionText
        }
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  onCreate,
}: {
  onCreate: () => void;
}) {
  return (
    <View
      style={
        styles.emptyState
      }
    >
      <View
        style={
          styles.emptyIcon
        }
      >
        <MaterialCommunityIcons name="receipt-text-outline" size={30} color="#AD1457" />
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        No invoices found
      </Text>

      <Text
        style={
          styles.emptyDescription
        }
      >
        Create your first invoice to start tracking boutique payments.
      </Text>

      <TouchableOpacity
        style={
          styles.emptyButton
        }
        onPress={
          onCreate
        }
      >
        <Text
          style={
            styles.emptyButtonText
          }
        >
          + Create Bill
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        colors.Cream,
    },

    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 30,
      paddingBottom: 50,
    },

    header: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      marginBottom: 20,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        colors.White,
      justifyContent:
        "center",
      alignItems:
        "center",
      borderWidth: 1,
      borderColor:
        colors.Border,
      marginRight: 12,
    },

    backText: {
      color:
        colors.PrimaryWine,
      fontSize: 30,
      lineHeight: 32,
    },

    headerTextArea: {
      flex: 1,
    },

    title: {
      color:
        colors.DarkText,
      fontSize: 28,
      fontWeight: "800",
    },

    subtitle: {
      color:
        colors.Muted,
      fontSize: 13,
      marginTop: 3,
    },

    addButton: {
      backgroundColor:
        colors.PrimaryWine,
      paddingHorizontal: 15,
      paddingVertical: 11,
      borderRadius: 12,
    },

    addButtonText: {
      color:
        colors.White,
      fontSize: 13,
      fontWeight: "800",
    },

    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      columnGap: 0,
      rowGap: 12,
      marginBottom: 20,
    },

    summaryCard: {
      width: "48%",
      minHeight: 116,
      backgroundColor: colors.White,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: "#F3C6D8",
      shadowColor: "#AD1457",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 3,
    },
    summaryIcon: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor:
        colors.SoftPink,
      justifyContent:
        "center",
      alignItems:
        "center",
      marginBottom: 7,
    },

    summaryIconText: {
      color:
        colors.PrimaryWine,
      fontSize: 13,
      fontWeight: "800",
    },

    summaryTitle: {
      color:
        colors.Muted,
      fontSize: 11,
      fontWeight: "600",
    },

    summaryValue: {
      color:
        colors.DarkText,
      fontSize: 16,
      fontWeight: "800",
      marginTop: 3,
    },

    searchContainer: {
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.White,
      borderWidth: 1,
      borderColor: "#F3C6D8",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
      marginBottom: 14,
      shadowColor: "#AD1457",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    searchIcon: {
      color:
        colors.PrimaryWine,
      fontSize: 23,
      marginRight: 7,
    },

    searchInput: {
      flex: 1,
      color:
        colors.DarkText,
      fontSize: 14,
    },

    filterRow: {
      gap: 8,
      paddingBottom: 18,
    },

    filterChip: {
      borderWidth: 1,
      borderColor:
        colors.Border,
      backgroundColor:
        colors.White,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
    },

    filterChipActive: {
      backgroundColor:
        colors.PrimaryWine,
      borderColor:
        colors.PrimaryWine,
    },

    filterText: {
      color:
        colors.DarkText,
      fontSize: 12,
      fontWeight: "700",
    },

    filterTextActive: {
      color:
        colors.White,
    },

    sectionHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "flex-end",
      marginBottom: 12,
    },

    sectionTitle: {
      color:
        colors.DarkText,
      fontSize: 18,
      fontWeight: "800",
    },

    sectionSubtitle: {
      color:
        colors.Muted,
      fontSize: 11,
      marginTop: 2,
    },

    pendingText: {
      color:
        colors.Orange,
      fontSize: 12,
      fontWeight: "700",
    },

    billCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "#F3C6D8",
      padding: 18,
      marginBottom: 16,
      shadowColor: "#AD1457",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.09,
      shadowRadius: 12,
      elevation: 4,
    },
    billTop: {
      flexDirection: "row",
      alignItems: "flex-start",
    },

    invoiceIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: "#FCE5EF",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      borderWidth: 1,
      borderColor: "#F3D4E0",
    },

    invoiceIconText: {
      color:
        colors.PrimaryWine,
      fontSize: 18,
      fontWeight: "800",
    },

    billMain: {
      flex: 1,
      minWidth: 0,
      paddingRight: 4,
    },

    billCustomer: {
      color: "#33232B",
      fontSize: 15,
      fontWeight: "900",
      flexShrink: 1,
    },

    billItem: {
      color:
        colors.PrimaryWine,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 3,
    },

    billNumber: {
      color: "#8A737D",
      fontSize: 11,
      fontWeight: "600",
      marginTop: 6,
    },

    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      paddingHorizontal: 11,
      paddingVertical: 7,
      marginLeft: 6,
      minHeight: 30,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 5,
    },

    statusText: {
      fontSize: 9,
      fontWeight: "800",
    },

    billDivider: {
      height: 1,
      backgroundColor:
        colors.Border,
      marginVertical: 13,
    },

    billAmountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 2,
    },

    amountLabel: {
      color: "#8A737D",
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 5,
    },

    totalAmount: {
      color: "#AD1457",
      fontSize: 16,
      fontWeight: "900",
    },

    amountMiddle: {
      alignItems:
        "center",
    },

    paidAmount: {
      color: "#2E7D32",
      fontSize: 14,
      fontWeight: "800",
    },

    amountRight: {
      alignItems:
        "flex-end",
    },

    dueAmount: {
      color: "#C62828",
      fontSize: 14,
      fontWeight: "900",
    },

    payButton: {
      alignSelf: "flex-end",
      backgroundColor: "#FCE5EF",
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 13,
      marginTop: 13,
      borderWidth: 1,
      borderColor: "#F3C6D8",
    },
    payButtonText: {
      color:
        colors.PrimaryWine,
      fontSize: 11,
      fontWeight: "800",
    },

    emptyState: {
      backgroundColor:
        colors.White,
      borderRadius: 18,
      padding: 30,
      alignItems:
        "center",
      borderWidth: 1,
      borderColor:
        colors.Border,
      marginTop: 5,
    },

    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        colors.SoftPink,
      justifyContent:
        "center",
      alignItems:
        "center",
      marginBottom: 12,
    },

    emptyIconText: {
      color:
        colors.PrimaryWine,
      fontSize: 23,
      fontWeight: "800",
    },

    emptyTitle: {
      color:
        colors.DarkText,
      fontSize: 17,
      fontWeight: "800",
    },

    emptyDescription: {
      color:
        colors.Muted,
      fontSize: 12,
      textAlign:
        "center",
      lineHeight: 18,
      marginTop: 7,
      maxWidth: 280,
    },

    emptyButton: {
      backgroundColor:
        colors.PrimaryWine,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 11,
      marginTop: 17,
    },

    emptyButtonText: {
      color:
        colors.White,
      fontSize: 12,
      fontWeight: "800",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        "rgba(36,33,36,0.55)",
      justifyContent:
        "flex-end",
    },
    modalCard: {
      backgroundColor: colors.White,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      maxHeight: "94%",
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 28,
    },

    smallModalCard: {
      backgroundColor:
        colors.White,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 30,
    },

    modalHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "flex-start",
      marginBottom: 18,
    },

    modalTitle: {
      color:
        colors.DarkText,
      fontSize: 21,
      fontWeight: "800",
    },

    modalSubtitle: {
      color:
        colors.Muted,
      fontSize: 11,
      marginTop: 3,
    },

    closeText: {
      color:
        colors.PrimaryWine,
      fontSize: 30,
      lineHeight: 28,
      fontWeight: "300",
    },

    fieldContainer: {
      marginBottom: 15,
    },

    fieldLabel: {
      color:
        colors.DarkText,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 7,
    },

    input: {
      height: 48,
      borderRadius: 11,
      borderWidth: 1,
      borderColor:
        colors.Border,
      backgroundColor:
        colors.White,
      paddingHorizontal: 13,
      color:
        colors.DarkText,
      fontSize: 13,
    },
    chipList: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 2,
      paddingBottom: 18,
      paddingTop: 6,
    },
    choiceChip: {
      borderWidth: 1,
      borderColor: colors.Border,
      backgroundColor: colors.White,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 24,
      minHeight: 46,
      justifyContent: "center",
      alignItems: "center",
    },

    choiceChipActive: {
      backgroundColor:
        "#AD1457",
      borderColor:
        "#AD1457",
    },

    choiceChipBilled: {
      borderColor:
        colors.Orange,
      backgroundColor:
        "#FFF8EF",
    },
    choiceChipText: {
      color: colors.DarkText,
      fontSize: 13,
      fontWeight: "700",
    },

    choiceChipTextActive: {
      color:
        colors.White,
    },

    existingBillWarning: {
      backgroundColor:
        "#FFF1DE",
      borderWidth: 1,
      borderColor:
        colors.Orange,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },

    existingBillWarningTitle: {
      color:
        colors.DarkText,
      fontSize: 13,
      fontWeight: "800",
    },

    existingBillWarningText: {
      color:
        colors.Muted,
      fontSize: 11,
      marginTop: 5,
    },

    existingBillNumber: {
      color:
        colors.PrimaryWine,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 5,
    },

    existingBillAmount: {
      color:
        colors.DarkText,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3,
    },

    viewExistingButton: {
      alignSelf:
        "flex-start",
      backgroundColor:
        colors.PrimaryWine,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 9,
      marginTop: 11,
    },

    viewExistingButtonText: {
      color:
        colors.White,
      fontSize: 11,
      fontWeight: "800",
    },

    twoColumn: {
      flexDirection:
        "row",
      gap: 10,
    },

    column: {
      flex: 1,
    },

    paymentMethodGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: 7,
      marginBottom: 15,
    },

    paymentMethodButton: {
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor:
        colors.White,
      borderWidth: 1,
      borderColor:
        colors.Border,
    },

    paymentMethodButtonActive: {
      backgroundColor:
        colors.PrimaryWine,
      borderColor:
        colors.PrimaryWine,
    },

    paymentMethodText: {
      color:
        colors.DarkText,
      fontSize: 11,
      fontWeight: "700",
    },

    paymentMethodTextActive: {
      color:
        colors.White,
    },

    calculationCard: {
      backgroundColor:
        colors.White,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor:
        colors.Border,
      marginBottom: 17,
    },

    calculationRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      paddingVertical: 5,
    },

    calculationLabel: {
      color:
        colors.Muted,
      fontSize: 12,
    },

    calculationValue: {
      color:
        colors.DarkText,
      fontSize: 12,
      fontWeight: "700",
    },

    calculationStrong: {
      color:
        colors.PrimaryWine,
      fontSize: 14,
      fontWeight: "800",
    },

    calculationDanger: {
      color:
        colors.Red,
    },

    calculationDivider: {
      height: 1,
      backgroundColor:
        colors.Border,
      marginVertical: 5,
    },

    primaryButton: {
      height: 52,
      borderRadius: 12,
      backgroundColor:
        "#AD1457",
      justifyContent:
        "center",
      alignItems:
        "center",
      marginBottom: 15,
    },

    primaryButtonDisabled: {
      backgroundColor:
        colors.Muted,
      opacity: 0.7,
    },

    primaryButtonText: {
      color:
        colors.White,
      fontSize: 14,
      fontWeight: "800",
    },

    detailHero: {
      backgroundColor:
        colors.SoftPink,
      borderRadius: 15,
      padding: 15,
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      marginBottom: 17,
    },

    detailCustomer: {
      color:
        colors.DarkText,
      fontSize: 17,
      fontWeight: "800",
    },

    detailItem: {
      color:
        colors.PrimaryWine,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 4,
    },

    detailsSection: {
      backgroundColor:
        colors.White,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor:
        colors.Border,
      marginBottom: 12,
    },

    detailsSectionTitle: {
      color:
        colors.PrimaryWine,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 9,
    },

    detailRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor:
        "#F2EAED",
    },

    detailLabel: {
      color:
        colors.Muted,
      fontSize: 11,
    },

    detailValue: {
      color:
        colors.DarkText,
      fontSize: 11,
      fontWeight: "700",
      maxWidth: "62%",
      textAlign:
        "right",
    },

    detailValueStrong: {
      color:
        colors.PrimaryWine,
      fontSize: 13,
      fontWeight: "800",
    },

    detailValueDanger: {
      color:
        colors.Red,
    },

    emptyHistory: {
      color:
        colors.Muted,
      fontSize: 11,
      paddingVertical: 5,
    },

    paymentHistoryRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor:
        "#F2EAED",
    },

    paymentHistoryMethod: {
      color:
        colors.DarkText,
      fontSize: 12,
      fontWeight: "700",
    },

    paymentHistoryDate: {
      color:
        colors.Muted,
      fontSize: 10,
      marginTop: 3,
    },

    paymentHistoryAmount: {
      color:
        colors.Green,
      fontSize: 13,
      fontWeight: "800",
    },

    actionGrid: {
      flexDirection:
        "row",
      gap: 10,
      marginBottom: 15,
    },

    actionButton: {
      flex: 1,
      minHeight: 55,
      borderRadius: 12,
      backgroundColor:
        colors.White,
      borderWidth: 1,
      borderColor:
        colors.Border,
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    actionButtonIcon: {
      color:
        colors.PrimaryWine,
      fontSize: 17,
      fontWeight: "800",
    },

    actionButtonText: {
      color:
        colors.DarkText,
      fontSize: 10,
      fontWeight: "700",
      marginTop: 3,
    },

    balanceHighlight: {
      backgroundColor:
        colors.SoftPink,
      borderRadius: 14,
      padding: 15,
      alignItems:
        "center",
      marginBottom: 18,
    },

    balanceHighlightLabel: {
      color:
        colors.Muted,
      fontSize: 11,
    },

    balanceHighlightValue: {
      color:
        colors.Red,
      fontSize: 25,
      fontWeight: "800",
      marginTop: 4,
    },
receiptPreview: {
  backgroundColor: "#FFFFFF",
  padding: 20,
  borderRadius: 12,
},

receiptBrand: {
  color: "#AD1457",
  fontSize: 24,
  fontWeight: "900",
},

receiptFashion: {
  color: "#AD1457",
  fontSize: 13,
  textAlign: "center",
  marginTop: 5,
  letterSpacing: 1,
},

receiptBoutique: {
  textAlign: "center",
  color: colors.Gold,
  fontSize: 10,
  letterSpacing: 4,
  fontWeight: "800",
  marginTop: 3,
},

receiptTagline: {
  textAlign: "center",
  color: colors.Muted,
  fontSize: 10,
  fontStyle: "italic",
  marginTop: 5,
},

receiptDivider: {
  height: 1,
  backgroundColor: colors.Border,
  marginVertical: 14,
},

receiptPreviewText: {
  color: "#5A1645",
  fontSize: 14,
  marginVertical: 4,
},

receiptRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 5,
},
    receiptRowLabel: {
      color:
        colors.Muted,
      fontSize: 11,
    },

    receiptRowValue: {
      color:
        colors.DarkText,
      fontSize: 11,
      fontWeight: "700",
    },

    receiptRowStrong: {
      color:
        colors.PrimaryWine,
      fontSize: 14,
      fontWeight: "800",
    },

    receiptFooter: {
      textAlign:
        "center",
      color:
        colors.Muted,
      fontSize: 10,
    },
receiptFooterBrand:{
  color:"#AD1457",
  fontWeight:"800",
  textAlign:"center",
  marginTop:8,
},

receiptLogo: {
  fontSize: 27,
  fontWeight: "900",
  color: "#AD1457",
  textAlign: "center",
  marginBottom: 2,
},
receiptService: {
  fontSize: 10,
  color: "#666666",
  textAlign: "center",
  marginTop: 8,
},
receiptContact: {
  fontSize: 9,
  color: "#444444",
  textAlign: "center",
  marginTop: 8,
  marginBottom: 8,
},
invoiceInfo: {
  flexDirection: "row",
  justifyContent: "space-between",
  gap: 8,
  marginVertical: 10,
},
tableHeader: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#FCE4EC",
  paddingVertical: 8,
  paddingHorizontal: 4,
  marginTop: 8,
},
tableItem: {
  flex: 1,
  fontSize: 10,
  color: "#333333",
  flexWrap: "wrap",
},
tableQty: {
  width: 40,
  textAlign: "center",
  fontSize: 10,
  color: "#333333",
},
tableAmount: {
  width: 75,
  textAlign: "right",
  fontSize: 10,
  color: "#333333",
},
tableRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 8,
  paddingHorizontal: 4,
  borderBottomWidth: 0.5,
  borderBottomColor: "#EEEEEE",
},
grandTotalBox: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#FCE4EC",
  padding: 12,
  borderRadius: 8,
  marginTop: 12,
  marginBottom: 8,
},
grandTotalLabel: {
  fontSize: 15,
  fontWeight: "900",
  color: "#880E4F",
},
grandTotalValue: {
  fontSize: 17,
  fontWeight: "900",
  color: "#AD1457",
},
    receiptActions:{
      flexDirection:
        "row",
      gap: 10,
      marginTop: 15,
    },

    receiptActionButton: {
      flex: 1,
      height: 52,
      borderRadius: 12,
      backgroundColor:
        colors.White,
      borderWidth: 1,
      borderColor:
        colors.Border,
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    receiptActionIcon: {
      fontSize: 17,
      color:
        colors.PrimaryWine,
    },

    receiptActionText: {
      color:
        colors.DarkText,
      fontSize: 11,
      fontWeight: "800",
      marginTop: 3,
    },

    exportNote: {
      color:
        colors.Muted,
      fontSize: 10,
      textAlign:
        "center",
      lineHeight: 15,
      marginTop: 10,
      paddingHorizontal: 15,
    },

    statusRow: {


      flexDirection: "row",


      flexWrap: "wrap",


      gap: 8,


      marginBottom: 12,


    },    
    itemCard: {
      backgroundColor: "#FFF7F8",
      borderWidth: 1,
      borderColor: colors.Border,
      borderRadius: 18,
      padding: 18,
      marginBottom: 16,
      gap: 12,
    },

bottomSpace: {
      height: 140,
    },
  });























































