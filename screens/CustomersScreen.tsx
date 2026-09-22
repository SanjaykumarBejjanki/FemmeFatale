import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { Measurement } from "./measurements/MeasurementsScreen";
import type { Order, OrderStatus } from "./OrdersScreen";
import type { Bill, Payment } from "./BillingScreen";

/* =======================================================
   CUSTOMER TYPE
======================================================= */

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  orders: number;
};

/* =======================================================
   PROPS
======================================================= */

type CustomersScreenProps = {
  customers: Customer[];
  measurements: Record<string, Measurement[]>;
  orders: Order[];
  bills: Bill[];
  payments: Payment[];

  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onOpenMeasurements: (customer: Customer) => void;
};

/* =======================================================
   COMPONENT
======================================================= */

export default function CustomersScreen({
  customers,
  measurements,
  orders,
  bills,
  payments,
  onAddCustomer,
  onUpdateCustomer,
  onOpenMeasurements,
}: CustomersScreenProps) {
  /* =====================================================
     SEARCH
  ===================================================== */

  const [search, setSearch] = useState("");

  /* =====================================================
     MODALS
  ===================================================== */

  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] =
    useState(false);
  const [showEditModal, setShowEditModal] =
    useState(false);
  const [showHistoryModal, setShowHistoryModal] =
    useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] =
    useState(false);

  /* =====================================================
     SELECTED CUSTOMER / ORDER
  ===================================================== */

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  /* =====================================================
     FORM STATE
  ===================================================== */

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  /* =====================================================
     FILTER CUSTOMERS
  ===================================================== */

  const filteredCustomers = customers.filter(
    (customer) => {
      const query = search.trim().toLowerCase();

      if (!query) {
        return true;
      }

      return (
        customer.name
          .toLowerCase()
          .includes(query) ||
        customer.phone
          .toLowerCase()
          .includes(query) ||
        customer.id
          .toLowerCase()
          .includes(query)
      );
    }
  );

  /* =====================================================
     CUSTOMER HISTORY DATA
  ===================================================== */

  const customerOrders = selectedCustomer
    ? orders.filter(
        (order) =>
          order.customerId === selectedCustomer.id
      )
    : [];

  const customerBills = selectedCustomer
    ? bills.filter(
        (bill) =>
          bill.customerId === selectedCustomer.id
      )
    : [];

  const customerPayments = selectedCustomer
    ? payments.filter((payment) =>
        customerBills.some(
          (bill) => bill.id === payment.billId
        )
      )
    : [];

  const customerMeasurements = selectedCustomer
    ? measurements[selectedCustomer.id] || []
    : [];

  const totalBilled = customerBills.reduce(
    (total, bill) =>
      total + Number(bill.total || 0),
    0
  );

  const totalPaid = customerPayments.reduce(
    (total, payment) =>
      total + Number(payment.amount || 0),
    0
  );

  const totalPending = Math.max(
    totalBilled - totalPaid,
    0
  );

  const latestMeasurement =
    customerMeasurements.length > 0
      ? customerMeasurements[
          customerMeasurements.length - 1
        ]
      : null;

  /* =====================================================
     SELECTED ORDER DATA
  ===================================================== */

  const selectedOrderBill = selectedOrder
    ? bills.find(
        (bill) =>
          bill.orderId === selectedOrder.id
      ) || null
    : null;

  const selectedOrderPayments = selectedOrderBill
    ? payments.filter(
        (payment) =>
          payment.billId === selectedOrderBill.id
      )
    : [];

  const selectedOrderMeasurement =
    selectedOrder?.measurementSnapshot || null;

  /* =====================================================
     OPEN CUSTOMER PROFILE
  ===================================================== */

  function openCustomerProfile(
    customer: Customer
  ) {
    setSelectedCustomer(customer);
    setShowProfileModal(true);
  }

  /* =====================================================
     OPEN CUSTOMER HISTORY
  ===================================================== */

  function openCustomerHistory() {
    setShowProfileModal(false);

    setTimeout(() => {
      setShowHistoryModal(true);
    }, 150);
  }

  /* =====================================================
     OPEN ORDER DETAILS
  ===================================================== */

  function openOrderDetails(order: Order) {
    setSelectedOrder(order);
    setShowHistoryModal(false);

    setTimeout(() => {
      setShowOrderDetailsModal(true);
    }, 150);
  }

  /* =====================================================
     CLOSE ORDER DETAILS
  ===================================================== */

  function closeOrderDetails() {
    setShowOrderDetailsModal(false);

    setTimeout(() => {
      setShowHistoryModal(true);
    }, 150);
  }

  /* =====================================================
     OPEN ADD CUSTOMER
  ===================================================== */

  function openAddCustomer() {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");

    setShowAddModal(true);
  }

  /* =====================================================
     CREATE CUSTOMER
  ===================================================== */

  function handleCreateCustomer() {
    if (!name.trim()) {
      Alert.alert(
        "Name Required",
        "Please enter the customer name."
      );
      return;
    }

    if (!phone.trim()) {
      Alert.alert(
        "Phone Required",
        "Please enter the customer phone number."
      );
      return;
    }

    const newCustomer: Customer = {
      id: `CUS-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      notes: notes.trim(),
      orders: 0,
    };

    onAddCustomer(newCustomer);

    setShowAddModal(false);

    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");

    Alert.alert(
      "Customer Added",
      `${newCustomer.name} has been added successfully.`
    );
  }

  /* =====================================================
     OPEN EDIT CUSTOMER
  ===================================================== */

  function openEditCustomer() {
    if (!selectedCustomer) {
      return;
    }

    setName(selectedCustomer.name);
    setPhone(selectedCustomer.phone);
    setEmail(selectedCustomer.email);
    setAddress(selectedCustomer.address);
    setNotes(selectedCustomer.notes);

    setShowProfileModal(false);

    setTimeout(() => {
      setShowEditModal(true);
    }, 150);
  }

  /* =====================================================
     UPDATE CUSTOMER
  ===================================================== */

  function handleUpdateCustomer() {
    if (!selectedCustomer) {
      return;
    }

    if (!name.trim()) {
      Alert.alert(
        "Name Required",
        "Please enter the customer name."
      );
      return;
    }

    if (!phone.trim()) {
      Alert.alert(
        "Phone Required",
        "Please enter the customer phone number."
      );
      return;
    }

    const updatedCustomer: Customer = {
      ...selectedCustomer,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      notes: notes.trim(),
    };

    onUpdateCustomer(updatedCustomer);

    setSelectedCustomer(updatedCustomer);

    setShowEditModal(false);

    setTimeout(() => {
      setShowProfileModal(true);
    }, 150);

    Alert.alert(
      "Customer Updated",
      "Customer details have been updated."
    );
  }

  /* =====================================================
     CLOSE PROFILE
  ===================================================== */

  function closeProfile() {
    setShowProfileModal(false);
    setSelectedCustomer(null);
  }

  /* =====================================================
     CLOSE HISTORY
  ===================================================== */

  function closeHistory() {
    setShowHistoryModal(false);
    setSelectedCustomer(null);
  }

  /* =====================================================
     OPEN MEASUREMENTS
  ===================================================== */

  function handleOpenMeasurements() {
    if (!selectedCustomer) {
      return;
    }

    setShowProfileModal(false);
    setShowHistoryModal(false);

    onOpenMeasurements(selectedCustomer);
  }

  /* =====================================================
     FORMAT CURRENCY
  ===================================================== */

  function formatCurrency(
    amount: number
  ) {
    return `₹${Number(
      amount || 0
    ).toLocaleString("en-IN")}`;
  }

  /* =====================================================
     ORDER STATUS STEP
  ===================================================== */

  const statusSteps: OrderStatus[] = [
    "Pending",
    "In Progress",
    "Ready",
    "Delivered",
  ];

  function getStatusIndex(
    status: OrderStatus
  ) {
    return statusSteps.indexOf(status);
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <View style={styles.container}>
      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Customers
          </Text>

          <Text style={styles.subtitle}>
            Manage your customers and their history
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddCustomer}
        >
          <Text style={styles.addButtonText}>
            + Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* =================================================
          SEARCH
      ================================================= */}

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>
          🔍
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone or ID"
          placeholderTextColor="#999"
          style={styles.searchInput}
        />
      </View>

      {/* =================================================
          CUSTOMER COUNT
      ================================================= */}

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filteredCustomers.length}{" "}
          {filteredCustomers.length === 1
            ? "Customer"
            : "Customers"}
        </Text>

        {search.trim().length > 0 && (
          <Text style={styles.searchResultText}>
            Search results
          </Text>
        )}
      </View>

      {/* =================================================
          CUSTOMER LIST
      ================================================= */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.listContent
        }
      >
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              👥
            </Text>

            <Text style={styles.emptyTitle}>
              No customers found
            </Text>

            <Text style={styles.emptyText}>
              Try another search or add a new
              customer.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={openAddCustomer}
            >
              <Text style={styles.emptyButtonText}>
                + Add Customer
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredCustomers.map(
            (customer) => (
              <TouchableOpacity
                key={customer.id}
                style={styles.customerCard}
                activeOpacity={0.8}
                onPress={() =>
                  openCustomerProfile(
                    customer
                  )
                }
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {customer.name
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.customerInfo}>
                  <Text
                    style={
                      styles.customerName
                    }
                  >
                    {customer.name}
                  </Text>

                  <Text
                    style={
                      styles.customerPhone
                    }
                  >
                    📞 {customer.phone}
                  </Text>

                  <Text
                    style={styles.customerId}
                  >
                    ID: {customer.id}
                  </Text>
                </View>

                <View
                  style={
                    styles.customerRight
                  }
                >
                  <Text
                    style={
                      styles.orderCount
                    }
                  >
                    {customer.orders}
                  </Text>

                  <Text
                    style={
                      styles.orderLabel
                    }
                  >
                    orders
                  </Text>

                  <Text
                    style={
                      styles.arrow
                    }
                  >
                    ›
                  </Text>
                </View>
              </TouchableOpacity>
            )
          )
        )}
      </ScrollView>

      {/* =================================================
          ADD CUSTOMER MODAL
      ================================================= */}

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowAddModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
            >
              <View
                style={styles.modalHeader}
              >
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Add Customer
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Create a new customer profile
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeIconButton}
                  onPress={() =>
                    setShowAddModal(false)
                  }
                >
                  <Text
                    style={
                      styles.closeIconText
                    }
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                Customer Name *
              </Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter customer name"
                placeholderTextColor="#999"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>
                Phone Number *
              </Text>

              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>
                Email
              </Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>
                Address
              </Text>

              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Enter address"
                placeholderTextColor="#999"
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
                multiline
              />

              <Text style={styles.inputLabel}>
                Notes
              </Text>

              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add customer notes"
                placeholderTextColor="#999"
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
                multiline
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={
                  handleCreateCustomer
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Add Customer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() =>
                  setShowAddModal(false)
                }
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =================================================
          CUSTOMER PROFILE MODAL
      ================================================= */}

      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent
        onRequestClose={closeProfile}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModal}>
            {selectedCustomer && (
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
              >
                <View
                  style={
                    styles.profileHeader
                  }
                >
                  <View
                    style={
                      styles.largeAvatar
                    }
                  >
                    <Text
                      style={
                        styles.largeAvatarText
                      }
                    >
                      {selectedCustomer.name
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.profileHeaderInfo
                    }
                  >
                    <Text
                      style={
                        styles.profileName
                      }
                    >
                      {selectedCustomer.name}
                    </Text>

                    <Text
                      style={
                        styles.profilePhone
                      }
                    >
                      📞{" "}
                      {
                        selectedCustomer.phone
                      }
                    </Text>

                    <Text
                      style={
                        styles.profileCustomerId
                      }
                    >
                      {selectedCustomer.id}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.closeIconButton
                    }
                    onPress={
                      closeProfile
                    }
                  >
                    <Text
                      style={
                        styles.closeIconText
                      }
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Customer Information
                </Text>

                <View
                  style={
                    styles.infoCard
                  }
                >
                  <InfoRow
                    label="Phone"
                    value={
                      selectedCustomer.phone
                    }
                  />

                  <InfoRow
                    label="Email"
                    value={
                      selectedCustomer.email ||
                      "Not provided"
                    }
                  />

                  <InfoRow
                    label="Address"
                    value={
                      selectedCustomer.address ||
                      "Not provided"
                    }
                  />

                  <InfoRow
                    label="Notes"
                    value={
                      selectedCustomer.notes ||
                      "No notes"
                    }
                    last
                  />
                </View>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Customer Summary
                </Text>

                <View
                  style={
                    styles.summaryGrid
                  }
                >
                  <SummaryCard
                    icon="🧵"
                    value={
                      customerOrders.length
                    }
                    label="Orders"
                  />

                  <SummaryCard
                    icon="🧾"
                    value={
                      customerBills.length
                    }
                    label="Bills"
                  />

                  <SummaryCard
                    icon="📏"
                    value={
                      customerMeasurements.length
                    }
                    label="Measurements"
                  />
                </View>

                <View
                  style={
                    styles.balanceCard
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.balanceLabel
                      }
                    >
                      Outstanding Balance
                    </Text>

                    <Text
                      style={
                        styles.balanceAmount
                      }
                    >
                      {formatCurrency(
                        totalPending
                      )}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.balanceIcon
                    }
                  >
                    💰
                  </Text>
                </View>

                <View
                  style={
                    styles.sectionHeader
                  }
                >
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Latest Measurement
                  </Text>

                  <TouchableOpacity
                    onPress={
                      handleOpenMeasurements
                    }
                  >
                    <Text
                      style={
                        styles.linkText
                      }
                    >
                      View All
                    </Text>
                  </TouchableOpacity>
                </View>

                {latestMeasurement ? (
                  <View
                    style={
                      styles.measurementCard
                    }
                  >
                    <View
                      style={
                        styles.measurementHeader
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.measurementType
                          }
                        >
                          {
                            latestMeasurement.type
                          }
                        </Text>

                        <Text
                          style={
                            styles.measurementDate
                          }
                        >
                          {
                            latestMeasurement.date
                          }
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.measurementIcon
                        }
                      >
                        📏
                      </Text>
                    </View>

                    <View
                      style={
                        styles.measurementGrid
                      }
                    >
                      <MeasurementValue
                        label="Bust"
                        value={
                          latestMeasurement.bust
                        }
                      />

                      <MeasurementValue
                        label="Waist"
                        value={
                          latestMeasurement.waist
                        }
                      />

                      <MeasurementValue
                        label="Hip"
                        value={
                          latestMeasurement.hip
                        }
                      />

                      <MeasurementValue
                        label="Shoulder"
                        value={
                          latestMeasurement.shoulder
                        }
                      />
                    </View>

                    <TouchableOpacity
                      style={
                        styles.measurementButton
                      }
                      onPress={
                        handleOpenMeasurements
                      }
                    >
                      <Text
                        style={
                          styles.measurementButtonText
                        }
                      >
                        View All Measurements
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View
                    style={
                      styles.emptySmallCard
                    }
                  >
                    <Text
                      style={
                        styles.emptySmallIcon
                      }
                    >
                      📏
                    </Text>

                    <Text
                      style={
                        styles.emptySmallTitle
                      }
                    >
                      No measurements yet
                    </Text>

                    <TouchableOpacity
                      onPress={
                        handleOpenMeasurements
                      }
                    >
                      <Text
                        style={
                          styles.linkText
                        }
                      >
                        Add Measurement
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={
                    styles.historyButton
                  }
                  onPress={
                    openCustomerHistory
                  }
                >
                  <View
                    style={
                      styles.historyButtonIcon
                    }
                  >
                    <Text
                      style={
                        styles.historyIconText
                      }
                    >
                      📜
                    </Text>
                  </View>

                  <View
                    style={
                      styles.historyButtonInfo
                    }
                  >
                    <Text
                      style={
                        styles.historyButtonTitle
                      }
                    >
                      Customer History
                    </Text>

                    <Text
                      style={
                        styles.historyButtonSubtitle
                      }
                    >
                      Orders, bills, payments &
                      measurements
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.historyArrow
                    }
                  >
                    ›
                  </Text>
                </TouchableOpacity>

                <View
                  style={
                    styles.actionContainer
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.editButton
                    }
                    onPress={
                      openEditCustomer
                    }
                  >
                    <Text
                      style={
                        styles.editButtonText
                      }
                    >
                      ✏️ Edit Customer
                    </Text>
                  </TouchableOpacity>

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
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* =================================================
          CUSTOMER HISTORY MODAL
      ================================================= */}

      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent
        onRequestClose={closeHistory}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.historyModal}>
            {selectedCustomer && (
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
              >
                <View
                  style={
                    styles.historyHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.modalTitle
                      }
                    >
                      Customer History
                    </Text>

                    <Text
                      style={
                        styles.modalSubtitle
                      }
                    >
                      {
                        selectedCustomer.name
                      }
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.closeIconButton
                    }
                    onPress={
                      closeHistory
                    }
                  >
                    <Text
                      style={
                        styles.closeIconText
                      }
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.historySummary
                  }
                >
                  <HistorySummary
                    value={
                      customerOrders.length
                    }
                    label="Orders"
                  />

                  <HistorySummary
                    value={
                      customerBills.length
                    }
                    label="Bills"
                  />

                  <HistorySummary
                    value={formatCurrency(
                      totalPaid
                    )}
                    label="Paid"
                  />

                  <HistorySummary
                    value={formatCurrency(
                      totalPending
                    )}
                    label="Pending"
                  />
                </View>

                <Text
                  style={
                    styles.historySectionTitle
                  }
                >
                  🧵 Order History
                </Text>

                {customerOrders.length ===
                0 ? (
                  <EmptyHistory
                    text="No orders found for this customer."
                  />
                ) : (
                  customerOrders.map(
                    (order) => (
                      <TouchableOpacity
                        key={order.id}
                        activeOpacity={0.85}
                        onPress={() =>
                          openOrderDetails(
                            order
                          )
                        }
                        style={
                          styles.historyCard
                        }
                      >
                        <View
                          style={
                            styles.historyCardTop
                          }
                        >
                          <View
                            style={
                              styles.historyCardInfo
                            }
                          >
                            <Text
                              style={
                                styles.historyCardTitle
                              }
                            >
                              {order.orderNumber ||
                                order.id}
                            </Text>

                            <Text
                              style={
                                styles.historyCardSubtitle
                              }
                            >
                              {order.item}
                            </Text>
                          </View>

                          <View
                            style={
                              styles.historyStatus
                            }
                          >
                            <Text
                              style={
                                styles.historyStatusText
                              }
                            >
                              {order.status}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.historyCardBottom
                          }
                        >
                          <Text
                            style={
                              styles.historyMeta
                            }
                          >
                            Qty:{" "}
                            {order.quantity ||
                              1}
                          </Text>

                          <Text
                            style={
                              styles.historyAmount
                            }
                          >
                            {formatCurrency(
                              Number(
                                order.price ||
                                  0
                              ) *
                                Number(
                                  order.quantity ||
                                    1
                                )
                            )}
                          </Text>

                          <Text
                            style={
                              styles.historyCardArrow
                            }
                          >
                            ›
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.tapForDetails
                          }
                        >
                          Tap to view order details
                        </Text>
                      </TouchableOpacity>
                    )
                  )
                )}

                <Text
                  style={
                    styles.historySectionTitle
                  }
                >
                  🧾 Billing History
                </Text>

                {customerBills.length ===
                0 ? (
                  <EmptyHistory
                    text="No bills found for this customer."
                  />
                ) : (
                  customerBills.map(
                    (bill) => (
                      <View
                        key={bill.id}
                        style={
                          styles.historyCard
                        }
                      >
                        <View
                          style={
                            styles.historyCardTop
                          }
                        >
                          <View
                            style={
                              styles.historyCardInfo
                            }
                          >
                            <Text
                              style={
                                styles.historyCardTitle
                              }
                            >
                              {bill.id}
                            </Text>

                            <Text
                              style={
                                styles.historyCardSubtitle
                              }
                            >
                              {bill.item}
                            </Text>
                          </View>

                          <View
                            style={
                              styles.billStatusBadge
                            }
                          >
                            <Text
                              style={
                                styles.billStatusText
                              }
                            >
                              {bill.status}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.billDetailsRow
                          }
                        >
                          <View>
                            <Text
                              style={
                                styles.historyMeta
                              }
                            >
                              Bill Date
                            </Text>

                            <Text
                              style={
                                styles.historyDetailValue
                              }
                            >
                              {
                                bill.billDate
                              }
                            </Text>
                          </View>

                          <View>
                            <Text
                              style={
                                styles.historyMeta
                              }
                            >
                              Total
                            </Text>

                            <Text
                              style={
                                styles.historyDetailValue
                              }
                            >
                              {formatCurrency(
                                Number(
                                  bill.total ||
                                    0
                                )
                              )}
                            </Text>
                          </View>

                          <View>
                            <Text
                              style={
                                styles.historyMeta
                              }
                            >
                              Balance
                            </Text>

                            <Text
                              style={
                                styles.historyBalanceValue
                              }
                            >
                              {formatCurrency(
                                Number(
                                  bill.balance ||
                                    0
                                )
                              )}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )
                  )
                )}

                <Text
                  style={
                    styles.historySectionTitle
                  }
                >
                  💳 Payment History
                </Text>

                {customerPayments.length ===
                0 ? (
                  <EmptyHistory
                    text="No payments found for this customer."
                  />
                ) : (
                  customerPayments.map(
                    (payment) => (
                      <View
                        key={payment.id}
                        style={
                          styles.paymentCard
                        }
                      >
                        <View
                          style={
                            styles.paymentIcon
                          }
                        >
                          <Text
                            style={
                              styles.paymentIconText
                            }
                          >
                            ✓
                          </Text>
                        </View>

                        <View
                          style={
                            styles.paymentInfo
                          }
                        >
                          <Text
                            style={
                              styles.paymentTitle
                            }
                          >
                            {payment.id}
                          </Text>

                          <Text
                            style={
                              styles.paymentSubtitle
                            }
                          >
                            {payment.method} •{" "}
                            {
                              payment.paymentDate
                            }
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.paymentAmount
                          }
                        >
                          +
                          {formatCurrency(
                            Number(
                              payment.amount ||
                                0
                            )
                          )}
                        </Text>
                      </View>
                    )
                  )
                )}

                <Text
                  style={
                    styles.historySectionTitle
                  }
                >
                  📏 Measurement History
                </Text>

                {customerMeasurements.length ===
                0 ? (
                  <EmptyHistory
                    text="No measurements found for this customer."
                  />
                ) : (
                  customerMeasurements
                    .slice()
                    .reverse()
                    .map(
                      (
                        measurement,
                        index
                      ) => (
                        <View
                          key={
                            measurement.id ||
                            `${measurement.type}-${index}`
                          }
                          style={
                            styles.measurementHistoryCard
                          }
                        >
                          <View>
                            <Text
                              style={
                                styles.measurementHistoryTitle
                              }
                            >
                              {
                                measurement.type
                              }
                            </Text>

                            <Text
                              style={
                                styles.measurementHistoryDate
                              }
                            >
                              {
                                measurement.date
                              }
                            </Text>
                          </View>

                          <View
                            style={
                              styles.measurementHistoryValues
                            }
                          >
                            <Text
                              style={
                                styles.measurementHistoryValue
                              }
                            >
                              Bust{" "}
                              {measurement.bust ||
                                "-"}
                            </Text>

                            <Text
                              style={
                                styles.measurementHistoryValue
                              }
                            >
                              Waist{" "}
                              {measurement.waist ||
                                "-"}
                            </Text>

                            <Text
                              style={
                                styles.measurementHistoryValue
                              }
                            >
                              Hip{" "}
                              {measurement.hip ||
                                "-"}
                            </Text>

                            <Text
                              style={
                                styles.measurementHistoryValue
                              }
                            >
                              Shoulder{" "}
                              {measurement.shoulder ||
                                "-"}
                            </Text>
                          </View>
                        </View>
                      )
                    )
                )}

                <TouchableOpacity
                  style={
                    styles.historyMeasurementsButton
                  }
                  onPress={
                    handleOpenMeasurements
                  }
                >
                  <Text
                    style={
                      styles.historyMeasurementsButtonText
                    }
                  >
                    📏 View Full Measurements
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.historyCloseButton
                  }
                  onPress={
                    closeHistory
                  }
                >
                  <Text
                    style={
                      styles.historyCloseButtonText
                    }
                  >
                    Close History
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* =================================================
          ORDER DETAILS MODAL
      ================================================= */}

      <Modal
        visible={showOrderDetailsModal}
        animationType="slide"
        transparent
        onRequestClose={closeOrderDetails}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.orderDetailsModal}>
            {selectedOrder && (
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
              >
                <View
                  style={
                    styles.orderDetailsHeader
                  }
                >
                  <View
                    style={
                      styles.orderDetailsHeaderInfo
                    }
                  >
                    <Text
                      style={
                        styles.orderDetailsTitle
                      }
                    >
                      Order Details
                    </Text>

                    <Text
                      style={
                        styles.orderNumberText
                      }
                    >
                      {selectedOrder.orderNumber ||
                        selectedOrder.id}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.closeIconButton
                    }
                    onPress={
                      closeOrderDetails
                    }
                  >
                    <Text
                      style={
                        styles.closeIconText
                      }
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text
                  style={
                    styles.detailSectionTitle
                  }
                >
                  Order Information
                </Text>

                <View
                  style={
                    styles.detailCard
                  }
                >
                  <InfoRow
                    label="Customer"
                    value={
                      selectedOrder.customerName
                    }
                  />

                  <InfoRow
                    label="Item"
                    value={
                      selectedOrder.item
                    }
                  />

                  <InfoRow
                    label="Quantity"
                    value={String(
                      selectedOrder.quantity ||
                        1
                    )}
                  />

                  <InfoRow
                    label="Price"
                    value={formatCurrency(
                      Number(
                        selectedOrder.price ||
                          0
                      )
                    )}
                  />

                  <InfoRow
                    label="Order Date"
                    value={
                      selectedOrder.orderDate ||
                      "Not available"
                    }
                  />

                  <InfoRow
                    label="Delivery Date"
                    value={
                      selectedOrder.deliveryDate ||
                      "Not specified"
                    }
                  />

                  <InfoRow
                    label="Notes"
                    value={
                      selectedOrder.notes ||
                      "No notes"
                    }
                    last
                  />
                </View>

                <Text
                  style={
                    styles.detailSectionTitle
                  }
                >
                  Order Status
                </Text>

                <View
                  style={
                    styles.statusTimelineCard
                  }
                >
                  {statusSteps.map(
                    (status, index) => {
                      const currentIndex =
                        getStatusIndex(
                          selectedOrder.status
                        );

                      const completed =
                        index <= currentIndex;

                      const isCurrent =
                        status ===
                        selectedOrder.status;

                      return (
                        <View
                          key={status}
                          style={
                            styles.timelineRow
                          }
                        >
                          <View
                            style={
                              styles.timelineIndicatorColumn
                            }
                          >
                            <View
                              style={[
                                styles.timelineCircle,
                                completed &&
                                  styles.timelineCircleCompleted,
                                isCurrent &&
                                  styles.timelineCircleCurrent,
                              ]}
                            >
                              <Text
                                style={
                                  styles.timelineCircleText
                                }
                              >
                                {completed
                                  ? "✓"
                                  : ""}
                              </Text>
                            </View>

                            {index <
                              statusSteps.length -
                                1 && (
                              <View
                                style={[
                                  styles.timelineLine,
                                  index <
                                    currentIndex &&
                                    styles.timelineLineCompleted,
                                ]}
                              />
                            )}
                          </View>

                          <View
                            style={
                              styles.timelineContent
                            }
                          >
                            <Text
                              style={[
                                styles.timelineStatus,
                                completed &&
                                  styles.timelineStatusCompleted,
                              ]}
                            >
                              {status}
                            </Text>

                            <Text
                              style={
                                styles.timelineDescription
                              }
                            >
                              {getStatusDescription(
                                status
                              )}
                            </Text>
                          </View>
                        </View>
                      );
                    }
                  )}
                </View>

                <Text
                  style={
                    styles.detailSectionTitle
                  }
                >
                  Measurement Used
                </Text>

                {selectedOrderMeasurement ? (
                  <View
                    style={
                      styles.detailCard
                    }
                  >
                    <View
                      style={
                        styles.measurementUsedHeader
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.measurementUsedType
                          }
                        >
                          {
                            selectedOrderMeasurement.type
                          }
                        </Text>

                        <Text
                          style={
                            styles.measurementUsedDate
                          }
                        >
                          {
                            selectedOrderMeasurement.date
                          }
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.measurementUsedIcon
                        }
                      >
                        📏
                      </Text>
                    </View>

                    <View
                      style={
                        styles.detailMeasurementGrid
                      }
                    >
                      <DetailMeasurement
                        label="Bust"
                        value={
                          selectedOrderMeasurement.bust
                        }
                      />

                      <DetailMeasurement
                        label="Waist"
                        value={
                          selectedOrderMeasurement.waist
                        }
                      />

                      <DetailMeasurement
                        label="Hip"
                        value={
                          selectedOrderMeasurement.hip
                        }
                      />

                      <DetailMeasurement
                        label="Shoulder"
                        value={
                          selectedOrderMeasurement.shoulder
                        }
                      />

                      <DetailMeasurement
                        label="Sleeve"
                        value={
                          selectedOrderMeasurement.sleeveLength
                        }
                      />

                      <DetailMeasurement
                        label="Blouse Length"
                        value={
                          selectedOrderMeasurement.blouseLength
                        }
                      />

                      <DetailMeasurement
                        label="Front Neck"
                        value={
                          selectedOrderMeasurement.frontNeck
                        }
                      />

                      <DetailMeasurement
                        label="Back Neck"
                        value={
                          selectedOrderMeasurement.backNeck
                        }
                      />

                      <DetailMeasurement
                        label="Armhole"
                        value={
                          selectedOrderMeasurement.armhole
                        }
                      />

                      <DetailMeasurement
                        label="Pant Length"
                        value={
                          selectedOrderMeasurement.pantLength
                        }
                      />
                    </View>

                    {selectedOrderMeasurement.notes ? (
                      <View
                        style={
                          styles.measurementNotes
                        }
                      >
                        <Text
                          style={
                            styles.measurementNotesLabel
                          }
                        >
                          Notes
                        </Text>

                        <Text
                          style={
                            styles.measurementNotesText
                          }
                        >
                          {
                            selectedOrderMeasurement.notes
                          }
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View
                    style={
                      styles.emptyDetailCard
                    }
                  >
                    <Text
                      style={
                        styles.emptyDetailText
                      }
                    >
                      No measurement snapshot is
                      available for this order.
                    </Text>
                  </View>
                )}

                <Text
                  style={
                    styles.detailSectionTitle
                  }
                >
                  Billing
                </Text>

                {selectedOrderBill ? (
                  <View
                    style={
                      styles.billDetailCard
                    }
                  >
                    <View
                      style={
                        styles.billHeaderRow
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.billDetailId
                          }
                        >
                          {
                            selectedOrderBill.id
                          }
                        </Text>

                        <Text
                          style={
                            styles.billDetailDate
                          }
                        >
                          {
                            selectedOrderBill.billDate
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          styles.billDetailStatus
                        }
                      >
                        <Text
                          style={
                            styles.billDetailStatusText
                          }
                        >
                          {
                            selectedOrderBill.status
                          }
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.billAmountGrid
                      }
                    >
                      <AmountBox
                        label="Subtotal"
                        value={formatCurrency(
                          selectedOrderBill.subtotal
                        )}
                      />

                      <AmountBox
                        label="Discount"
                        value={formatCurrency(
                          selectedOrderBill.discount
                        )}
                      />

                      <AmountBox
                        label="Tax"
                        value={formatCurrency(
                          selectedOrderBill.tax
                        )}
                      />

                      <AmountBox
                        label="Total"
                        value={formatCurrency(
                          selectedOrderBill.total
                        )}
                      />
                    </View>

                    <View
                      style={
                        styles.paymentSummary
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.paymentSummaryLabel
                          }
                        >
                          Paid
                        </Text>

                        <Text
                          style={
                            styles.paymentSummaryPaid
                          }
                        >
                          {formatCurrency(
                            selectedOrderBill.paidAmount
                          )}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.paymentSummaryDivider
                        }
                      />

                      <View>
                        <Text
                          style={
                            styles.paymentSummaryLabel
                          }
                        >
                          Balance
                        </Text>

                        <Text
                          style={
                            styles.paymentSummaryBalance
                          }
                        >
                          {formatCurrency(
                            selectedOrderBill.balance
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View
                    style={
                      styles.emptyDetailCard
                    }
                  >
                    <Text
                      style={
                        styles.emptyDetailText
                      }
                    >
                      No bill has been created for
                      this order yet.
                    </Text>
                  </View>
                )}

                <Text
                  style={
                    styles.detailSectionTitle
                  }
                >
                  Payments
                </Text>

                {selectedOrderPayments.length >
                0 ? (
                  selectedOrderPayments.map(
                    (payment) => (
                      <View
                        key={payment.id}
                        style={
                          styles.orderPaymentCard
                        }
                      >
                        <View
                          style={
                            styles.orderPaymentIcon
                          }
                        >
                          <Text
                            style={
                              styles.orderPaymentIconText
                            }
                          >
                            ✓
                          </Text>
                        </View>

                        <View
                          style={
                            styles.orderPaymentInfo
                          }
                        >
                          <Text
                            style={
                              styles.orderPaymentMethod
                            }
                          >
                            {
                              payment.method
                            }
                          </Text>

                          <Text
                            style={
                              styles.orderPaymentDate
                            }
                          >
                            {
                              payment.paymentDate
                            }
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.orderPaymentAmount
                          }
                        >
                          {formatCurrency(
                            payment.amount
                          )}
                        </Text>
                      </View>
                    )
                  )
                ) : (
                  <View
                    style={
                      styles.emptyDetailCard
                    }
                  >
                    <Text
                      style={
                        styles.emptyDetailText
                      }
                    >
                      No payments recorded for this
                      order.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={
                    styles.orderDetailsCloseButton
                  }
                  onPress={
                    closeOrderDetails
                  }
                >
                  <Text
                    style={
                      styles.orderDetailsCloseButtonText
                    }
                  >
                    Back to Customer History
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* =================================================
          EDIT CUSTOMER MODAL
      ================================================= */}

      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowEditModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
            >
              <View
                style={styles.modalHeader}
              >
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Edit Customer
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Update customer information
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.closeIconButton
                  }
                  onPress={() =>
                    setShowEditModal(false)
                  }
                >
                  <Text
                    style={
                      styles.closeIconText
                    }
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                Customer Name *
              </Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter customer name"
                placeholderTextColor="#999"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>
                Phone Number *
              </Text>

              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>
                Email
              </Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>
                Address
              </Text>

              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Enter address"
                placeholderTextColor="#999"
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
                multiline
              />

              <Text style={styles.inputLabel}>
                Notes
              </Text>

              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add customer notes"
                placeholderTextColor="#999"
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
                multiline
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={
                  handleUpdateCustomer
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Save Changes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() =>
                  setShowEditModal(false)
                }
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =======================================================
   STATUS DESCRIPTION
======================================================= */

function getStatusDescription(
  status: OrderStatus
): string {
  switch (status) {
    case "Pending":
      return "Order has been placed and is waiting to be started.";

    case "In Progress":
      return "Tailoring work is currently in progress.";

    case "Ready":
      return "The order is completed and ready for pickup.";

    case "Delivered":
      return "The order has been delivered to the customer.";

    default:
      return "";
  }
}

/* =======================================================
   INFO ROW
======================================================= */

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        last && styles.infoRowLast,
      ]}
    >
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

/* =======================================================
   SUMMARY CARD
======================================================= */

function SummaryCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryIcon}>
        {icon}
      </Text>

      <Text style={styles.summaryValue}>
        {value}
      </Text>

      <Text style={styles.summaryLabel}>
        {label}
      </Text>
    </View>
  );
}

/* =======================================================
   MEASUREMENT VALUE
======================================================= */

function MeasurementValue({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.measurementValue}>
      <Text
        style={
          styles.measurementValueLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.measurementValueText
        }
      >
        {value || "-"}
      </Text>
    </View>
  );
}

/* =======================================================
   DETAIL MEASUREMENT
======================================================= */

function DetailMeasurement({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <View
      style={
        styles.detailMeasurement
      }
    >
      <Text
        style={
          styles.detailMeasurementLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.detailMeasurementValue
        }
      >
        {value || "-"}
      </Text>
    </View>
  );
}

/* =======================================================
   AMOUNT BOX
======================================================= */

function AmountBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.amountBox}>
      <Text
        style={
          styles.amountBoxLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.amountBoxValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

/* =======================================================
   HISTORY SUMMARY
======================================================= */

function HistorySummary({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <View style={styles.historySummaryCard}>
      <Text
        style={
          styles.historySummaryValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.historySummaryLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

/* =======================================================
   EMPTY HISTORY
======================================================= */

function EmptyHistory({
  text,
}: {
  text: string;
}) {
  return (
    <View style={styles.emptyHistory}>
      <Text
        style={
          styles.emptyHistoryText
        }
      >
        {text}
      </Text>
    </View>
  );
}

/* =======================================================
   STYLES
======================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F2",
    padding: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#8B1238",
  },

  subtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },

  addButton: {
    backgroundColor: "#8B1238",
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 12,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  searchContainer: {
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },

  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#242124",
  },

  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  countText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#242124",
  },

  searchResultText: {
    fontSize: 12,
    color: "#8B1238",
    fontWeight: "600",
  },

  listContent: {
    paddingBottom: 100,
  },

  customerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FCE8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#8B1238",
  },

  customerInfo: {
    flex: 1,
  },

  customerName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#242124",
  },

  customerPhone: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },

  customerId: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },

  customerRight: {
    alignItems: "center",
    minWidth: 50,
  },

  orderCount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#8B1238",
  },

  orderLabel: {
    fontSize: 10,
    color: "#888",
  },

  arrow: {
    fontSize: 25,
    color: "#AAA",
    marginTop: 3,
  },

  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    marginTop: 30,
  },

  emptyIcon: {
    fontSize: 45,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#242124",
  },

  emptyText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  emptyButton: {
    marginTop: 18,
    backgroundColor: "#8B1238",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },

  emptyButtonText: {
    color: "#FFF",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  formModal: {
    backgroundColor: "#FFF9F2",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    padding: 20,
  },

  profileModal: {
    backgroundColor: "#FFF9F2",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "94%",
    padding: 20,
  },

  historyModal: {
    backgroundColor: "#FFF9F2",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "94%",
    padding: 20,
  },

  orderDetailsModal: {
    backgroundColor: "#FFF9F2",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "96%",
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 25,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#8B1238",
  },

  modalSubtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },

  closeIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FCE8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  closeIconText: {
    fontSize: 25,
    color: "#555",
    lineHeight: 27,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#242124",
    marginBottom: 7,
    marginTop: 5,
  },

  input: {
    height: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#242124",
    marginBottom: 15,
  },

  multilineInput: {
    minHeight: 80,
    height: 80,
    paddingTop: 13,
    textAlignVertical: "top",
  },

  primaryButton: {
    backgroundColor: "#8B1238",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  secondaryButton: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: "#EEEEEE",
  },

  secondaryButtonText: {
    color: "#242124",
    fontSize: 14,
    fontWeight: "700",
  },

  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  largeAvatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#FCE8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  largeAvatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#8B1238",
  },

  profileHeaderInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#8B1238",
  },

  profilePhone: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },

  profileCustomerId: {
    fontSize: 11,
    color: "#999",
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#8B1238",
    marginBottom: 11,
    marginTop: 6,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 20,
  },

  infoRow: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  infoRowLast: {
    borderBottomWidth: 0,
  },

  infoLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 14,
    color: "#242124",
    fontWeight: "600",
    lineHeight: 20,
  },

  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  summaryCard: {
    width: "31.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: "center",
  },

  summaryIcon: {
    fontSize: 22,
    marginBottom: 5,
  },

  summaryValue: {
    fontSize: 19,
    fontWeight: "800",
    color: "#242124",
  },

  summaryLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },

  balanceCard: {
    backgroundColor: "#FCE8F0",
    borderRadius: 17,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  balanceLabel: {
    fontSize: 12,
    color: "#8B1238",
    fontWeight: "600",
  },

  balanceAmount: {
    fontSize: 25,
    color: "#8B1238",
    fontWeight: "800",
    marginTop: 3,
  },

  balanceIcon: {
    fontSize: 32,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  linkText: {
    color: "#8B1238",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },

  measurementCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 16,
    marginBottom: 15,
  },

  measurementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  measurementType: {
    fontSize: 16,
    fontWeight: "800",
    color: "#8B1238",
  },

  measurementDate: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
  },

  measurementIcon: {
    fontSize: 25,
  },

  measurementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  measurementValue: {
    width: "48%",
    backgroundColor: "#FFF9F2",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },

  measurementValueLabel: {
    fontSize: 10,
    color: "#888",
  },

  measurementValueText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#242124",
    marginTop: 2,
  },

  measurementButton: {
    marginTop: 7,
    backgroundColor: "#FCE8F0",
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: "center",
  },

  measurementButtonText: {
    color: "#8B1238",
    fontSize: 13,
    fontWeight: "700",
  },

  emptySmallCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 20,
    alignItems: "center",
    marginBottom: 15,
  },

  emptySmallIcon: {
    fontSize: 28,
    marginBottom: 7,
  },

  emptySmallTitle: {
    fontSize: 14,
    color: "#555",
    fontWeight: "600",
    marginBottom: 5,
  },

  historyButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#F1D9DF",
  },

  historyButtonIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#FCE8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  historyIconText: {
    fontSize: 22,
  },

  historyButtonInfo: {
    flex: 1,
    marginLeft: 12,
  },

  historyButtonTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#8B1238",
  },

  historyButtonSubtitle: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
  },

  historyArrow: {
    fontSize: 26,
    color: "#AAA",
  },

  actionContainer: {
    marginBottom: 25,
  },

  editButton: {
    backgroundColor: "#8B1238",
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  editButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  closeButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    color: "#242124",
    fontSize: 14,
    fontWeight: "700",
  },

  /* =====================================================
     HISTORY
  ===================================================== */

  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  historySummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  historySummaryCard: {
    width: "23.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
  },

  historySummaryValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#8B1238",
  },

  historySummaryLabel: {
    fontSize: 9,
    color: "#888",
    marginTop: 3,
  },

  historySectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#8B1238",
    marginBottom: 10,
    marginTop: 6,
  },

  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
  },

  historyCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  historyCardInfo: {
    flex: 1,
  },

  historyCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#242124",
  },

  historyCardSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 3,
  },

  historyStatus: {
    backgroundColor: "#FCE8F0",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },

  historyStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8B1238",
  },

  historyCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },

  historyMeta: {
    fontSize: 11,
    color: "#888",
  },

  historyAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#242124",
  },

  historyCardArrow: {
    fontSize: 22,
    color: "#AAA",
    marginLeft: 5,
  },

  tapForDetails: {
    fontSize: 10,
    color: "#8B1238",
    fontWeight: "600",
    marginTop: 8,
  },

  billStatusBadge: {
    backgroundColor: "#E8F8ED",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },

  billStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#218838",
  },

  billDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },

  historyDetailValue: {
    fontSize: 12,
    color: "#242124",
    fontWeight: "700",
    marginTop: 3,
  },

  historyBalanceValue: {
    fontSize: 12,
    color: "#8B1238",
    fontWeight: "800",
    marginTop: 3,
  },

  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E7F8ED",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentIconText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#218838",
  },

  paymentInfo: {
    flex: 1,
    marginLeft: 11,
  },

  paymentTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#242124",
  },

  paymentSubtitle: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
  },

  paymentAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#218838",
  },

  measurementHistoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
  },

  measurementHistoryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#8B1238",
  },

  measurementHistoryDate: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
  },

  measurementHistoryValues: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },

  measurementHistoryValue: {
    width: "50%",
    fontSize: 11,
    color: "#555",
    marginBottom: 6,
  },

  emptyHistory: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 17,
    marginBottom: 16,
  },

  emptyHistoryText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },

  historyMeasurementsButton: {
    backgroundColor: "#8B1238",
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 10,
  },

  historyMeasurementsButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  historyCloseButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },

  historyCloseButtonText: {
    color: "#242124",
    fontSize: 14,
    fontWeight: "700",
  },

  /* =====================================================
     ORDER DETAILS
  ===================================================== */

  orderDetailsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  orderDetailsHeaderInfo: {
    flex: 1,
  },

  orderDetailsTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#8B1238",
  },

  orderNumberText: {
    fontSize: 13,
    color: "#8B1238",
    fontWeight: "700",
    marginTop: 5,
  },

  detailSectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#8B1238",
    marginTop: 5,
    marginBottom: 11,
  },

  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 18,
  },

  /* =====================================================
     TIMELINE
  ===================================================== */

  statusTimelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 17,
    marginBottom: 18,
  },

  timelineRow: {
    flexDirection: "row",
    minHeight: 68,
  },

  timelineIndicatorColumn: {
    width: 34,
    alignItems: "center",
  },

  timelineCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#D8D8D8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  timelineCircleCompleted: {
    backgroundColor: "#8B1238",
    borderColor: "#8B1238",
  },

  timelineCircleCurrent: {
    borderWidth: 3,
  },

  timelineCircleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E3E3E3",
    marginVertical: 3,
  },

  timelineLineCompleted: {
    backgroundColor: "#8B1238",
  },

  timelineContent: {
    flex: 1,
    paddingLeft: 11,
    paddingBottom: 13,
  },

  timelineStatus: {
    fontSize: 14,
    fontWeight: "700",
    color: "#888",
  },

  timelineStatusCompleted: {
    color: "#242124",
  },

  timelineDescription: {
    fontSize: 11,
    color: "#999",
    marginTop: 3,
    lineHeight: 16,
  },

  /* =====================================================
     MEASUREMENT DETAILS
  ===================================================== */

  measurementUsedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 15,
  },

  measurementUsedType: {
    fontSize: 16,
    fontWeight: "800",
    color: "#8B1238",
  },

  measurementUsedDate: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
  },

  measurementUsedIcon: {
    fontSize: 26,
  },

  detailMeasurementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 5,
  },

  detailMeasurement: {
    width: "48%",
    backgroundColor: "#FFF9F2",
    borderRadius: 10,
    padding: 11,
    marginBottom: 8,
  },

  detailMeasurementLabel: {
    fontSize: 10,
    color: "#888",
  },

  detailMeasurementValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#242124",
    marginTop: 3,
  },

  measurementNotes: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingVertical: 13,
  },

  measurementNotesLabel: {
    fontSize: 10,
    color: "#999",
    fontWeight: "700",
  },

  measurementNotesText: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
    lineHeight: 18,
  },

  emptyDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },

  emptyDetailText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
  },

  /* =====================================================
     BILL DETAILS
  ===================================================== */

  billDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 16,
    marginBottom: 18,
  },

  billHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  billDetailId: {
    fontSize: 14,
    fontWeight: "800",
    color: "#242124",
  },

  billDetailDate: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
  },

  billDetailStatus: {
    backgroundColor: "#E8F8ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  billDetailStatusText: {
    color: "#218838",
    fontSize: 10,
    fontWeight: "700",
  },

  billAmountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 15,
  },

  amountBox: {
    width: "48%",
    backgroundColor: "#FFF9F2",
    borderRadius: 11,
    padding: 11,
    marginBottom: 8,
  },

  amountBoxLabel: {
    fontSize: 10,
    color: "#888",
  },

  amountBoxValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#242124",
    marginTop: 3,
  },

  paymentSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FCE8F0",
    borderRadius: 13,
    paddingVertical: 14,
    marginTop: 7,
  },

  paymentSummaryLabel: {
    fontSize: 10,
    color: "#777",
    textAlign: "center",
  },

  paymentSummaryPaid: {
    fontSize: 17,
    fontWeight: "800",
    color: "#218838",
    marginTop: 3,
  },

  paymentSummaryBalance: {
    fontSize: 17,
    fontWeight: "800",
    color: "#8B1238",
    marginTop: 3,
  },

  paymentSummaryDivider: {
    width: 1,
    height: 35,
    backgroundColor: "#E8B8C8",
  },

  /* =====================================================
     ORDER PAYMENTS
  ===================================================== */

  orderPaymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  orderPaymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E7F8ED",
    alignItems: "center",
    justifyContent: "center",
  },

  orderPaymentIconText: {
    fontSize: 18,
    color: "#218838",
    fontWeight: "800",
  },

  orderPaymentInfo: {
    flex: 1,
    marginLeft: 11,
  },

  orderPaymentMethod: {
    fontSize: 13,
    fontWeight: "800",
    color: "#242124",
  },

  orderPaymentDate: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
  },

  orderPaymentAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#218838",
  },

  orderDetailsCloseButton: {
    backgroundColor: "#8B1238",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 30,
  },

  orderDetailsCloseButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});