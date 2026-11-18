import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import type { Customer } from "./CustomersScreen";
import type { Bill } from "../lib/billService";

function formatCurrency(value: number) {
  return "Rs. " + Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildReceiptHtml(
  bill: Bill,
  customer: Customer | undefined
) {
  const itemTotal =
    Number(bill.quantity || 1) * Number(bill.price || 0);

  return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    margin: 0;
    padding: 28px;
    color: #222;
    background: #fff;
  }

  .receipt {
    max-width: 720px;
    margin: 0 auto;
  }

  .brand {
    text-align: center;
  }

  .brand h1 {
    margin: 0;
    font-size: 30px;
    letter-spacing: 1px;
    color: #6d3f73;
  }

  .brand p {
    margin: 5px 0 0;
    color: #777;
    font-size: 12px;
  }

  .divider {
    border-top: 1px solid #ddd;
    margin: 22px 0;
  }

  .grid {
    display: flex;
    justify-content: space-between;
    gap: 24px;
  }

  .label {
    color: #777;
    font-size: 11px;
    margin-bottom: 4px;
  }

  .value {
    font-size: 13px;
    font-weight: 700;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 18px;
  }

  th,
  td {
    padding: 11px 6px;
    border-bottom: 1px solid #eee;
    text-align: left;
    font-size: 12px;
  }

  th:last-child,
  td:last-child {
    text-align: right;
  }

  .summary {
    margin-top: 18px;
    margin-left: auto;
    max-width: 330px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
  }

  .total {
    margin-top: 8px;
    padding-top: 12px;
    border-top: 2px solid #222;
    font-size: 17px;
    font-weight: 800;
  }

  .paid {
    color: #16834b;
    font-weight: 800;
  }

  .balance {
    color: #c05a00;
    font-weight: 800;
  }

  .status {
    margin-top: 22px;
    padding: 12px;
    text-align: center;
    border-radius: 8px;
    background: #e8f7ee;
    color: #16834b;
    font-weight: 800;
  }

  .footer {
    text-align: center;
    color: #888;
    font-size: 11px;
    margin-top: 28px;
  }
</style>
</head>

<body>
<div class="receipt">

  <div class="brand">
    <h1>FemmeBill</h1>
    <p>Tailoring &amp; Boutique Management</p>
    <p>BILL</p>
  </div>

  <div class="divider"></div>

  <div class="grid">

    <div>
      <div class="label">Bill Number</div>
      <div class="value">${escapeHtml(bill.id)}</div>
    </div>

    <div>
      <div class="label">Order Number</div>
      <div class="value">${escapeHtml(bill.orderId)}</div>
    </div>

    <div>
      <div class="label">Bill Date</div>
      <div class="value">${escapeHtml(bill.billDate)}</div>
    </div>

  </div>

  <div class="divider"></div>

  <div>
    <div class="label">Customer</div>
    <div class="value">${escapeHtml(bill.customerName)}</div>

    ${
      customer?.phone
        ? `<div style="margin-top:5px;color:#666;font-size:12px;">
             ${escapeHtml(customer.phone)}
           </div>`
        : ""
    }
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>

    <tbody>
      <tr>
        <td>${escapeHtml(
          bill.item || "Tailoring Service"
        )}</td>

        <td>${bill.quantity || 1}</td>

        <td>${formatCurrency(bill.price)}</td>

        <td>${formatCurrency(itemTotal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">

    <div class="row">
      <span>Subtotal</span>
      <span>${formatCurrency(bill.subtotal)}</span>
    </div>

    <div class="row">
      <span>Discount</span>
      <span>${formatCurrency(bill.discount)}</span>
    </div>

    <div class="row total">
      <span>Grand Total</span>
      <span>${formatCurrency(bill.total)}</span>
    </div>

    <div class="row">
      <span>Amount Paid</span>
      <span class="paid">
        ${formatCurrency(bill.paidAmount)}
      </span>
    </div>

    <div class="row">
      <span>Balance</span>
      <span class="balance">
        ${formatCurrency(bill.balance)}
      </span>
    </div>

  </div>

  <div class="divider"></div>

  <div class="grid">

    <div>
      <div class="label">Payment Method</div>
      <div class="value">
        ${escapeHtml(bill.paymentMethod)}
      </div>
    </div>

    <div>
      <div class="label">Payment Status</div>
      <div class="value">
        ${escapeHtml(bill.status)}
      </div>
    </div>

  </div>

  <div class="status">
    ${escapeHtml(bill.status.toUpperCase())}
  </div>

  <div class="footer">
  <p>This bill is valid up to 30 days only.</p>
  <p>Thank you for choosing Femme Fatale Boutique ♡</p>
  <p>Shop No. 27, VMRDA Complex, Udyog Bhavan Complex, Siripuram Junction, Visakhapatnam – 530003, Andhra Pradesh.</p>
</div>

</div>
</body>
</html>
`;
}

export default function ReceiptScreen({
  bills,
  customers,
  onBack,
}: {
  bills: Bill[];
  customers: Customer[];
  onBack: () => void;
}) {
  const [selectedBill, setSelectedBill] =
    useState<Bill | null>(null);

  const [busyAction, setBusyAction] =
    useState<string | null>(null);

  const [savedReceiptUris, setSavedReceiptUris] =
    useState<Record<string, string>>({});

  const paidBills = useMemo(
    () =>
      bills.filter(
        (bill) =>
          bill.status === "Paid" ||
          Number(bill.paidAmount || 0) > 0
      ),
    [bills]
  );

  const savedBills = useMemo(
    () =>
      paidBills.filter(
        (bill) => Boolean(savedReceiptUris[bill.id])
      ),
    [paidBills, savedReceiptUris]
  );

  useEffect(() => {
    void loadSavedReceipts();
  }, [bills]);

  function getReceiptsDirectory() {
    return `${FileSystem.documentDirectory}receipts/`;
  }

  function getReceiptFileName(billId: string) {
    return `receipt_${encodeURIComponent(billId)}.pdf`;
  }

  function getReceiptFileUri(billId: string) {
    return `${getReceiptsDirectory()}${getReceiptFileName(
      billId
    )}`;
  }

  async function loadSavedReceipts() {
    try {
      const directory = getReceiptsDirectory();

      const directoryInfo =
        await FileSystem.getInfoAsync(directory);

      if (!directoryInfo.exists) {
        setSavedReceiptUris({});
        return;
      }

      const files =
        await FileSystem.readDirectoryAsync(directory);

      const saved: Record<string, string> = {};

      for (const fileName of files) {
        if (
          !fileName.endsWith(".pdf") ||
          !fileName.startsWith("receipt_")
        ) {
          continue;
        }

        const encodedId = fileName
          .replace(/^receipt_/, "")
          .replace(/\.pdf$/, "");

        try {
          const billId = decodeURIComponent(encodedId);
          const uri = `${directory}${fileName}`;

          const fileInfo =
            await FileSystem.getInfoAsync(uri);

          if (fileInfo.exists) {
            saved[billId] = uri;
          }
        } catch {
          // Ignore invalid receipt files.
        }
      }

      setSavedReceiptUris(saved);
    } catch (error) {
      console.log(
        "FemmeBill: unable to load saved receipts",
        error
      );
    }
  }

  function getCustomer(bill: Bill) {
    return customers.find(
      (customer) => customer.id === bill.customerId
    );
  }

  async function handlePrint() {
    if (!selectedBill) return;

    try {
      setBusyAction("print");

      await Print.printAsync({
        html: buildReceiptHtml(
          selectedBill,
          getCustomer(selectedBill)
        ),
      });
    } catch (error) {
      Alert.alert(
        "Unable to print receipt",
        error instanceof Error
          ? error.message
          : "Printing failed."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleShare() {
    if (!selectedBill) return;

    try {
      setBusyAction("share");

      const result =
        await Print.printToFileAsync({
          html: buildReceiptHtml(
            selectedBill,
            getCustomer(selectedBill)
          ),
        });

      const canShare =
        await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert(
          "Sharing unavailable",
          "This device cannot open the share sheet."
        );
        return;
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: "application/pdf",
        dialogTitle: `Share ${selectedBill.id}`,
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      Alert.alert(
        "Unable to share receipt",
        error instanceof Error
          ? error.message
          : "Sharing failed."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleWhatsApp() {
    if (!selectedBill) return;

    try {
      setBusyAction("whatsapp");

      const result =
        await Print.printToFileAsync({
          html: buildReceiptHtml(
            selectedBill,
            getCustomer(selectedBill)
          ),
        });

      const canShare =
        await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert(
          "Sharing unavailable",
          "The native share sheet is not available on this device."
        );
        return;
      }

      /*
       * Expo Sharing cannot force a PDF directly into
       * WhatsApp. It opens the native share sheet with
       * the PDF attached, where WhatsApp can be selected.
       */
      await Sharing.shareAsync(result.uri, {
        mimeType: "application/pdf",
        dialogTitle: `Send ${selectedBill.id} on WhatsApp`,
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      Alert.alert(
        "Unable to share on WhatsApp",
        error instanceof Error
          ? error.message
          : "WhatsApp sharing failed."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleExport() {
    if (!selectedBill) return;

    try {
      setBusyAction("export");

      const result =
        await Print.printToFileAsync({
          html: buildReceiptHtml(
            selectedBill,
            getCustomer(selectedBill)
          ),
        });

      const receiptsDirectory =
        getReceiptsDirectory();

      const savedFile =
        getReceiptFileUri(selectedBill.id);

      const directoryInfo =
        await FileSystem.getInfoAsync(
          receiptsDirectory
        );

      if (!directoryInfo.exists) {
        await FileSystem.makeDirectoryAsync(
          receiptsDirectory,
          {
            intermediates: true,
          }
        );
      }

      const existingFile =
        await FileSystem.getInfoAsync(savedFile);

      if (existingFile.exists) {
        await FileSystem.deleteAsync(
          savedFile,
          {
            idempotent: true,
          }
        );
      }

      await FileSystem.copyAsync({
        from: result.uri,
        to: savedFile,
      });

      const savedFileInfo =
        await FileSystem.getInfoAsync(savedFile);

      if (!savedFileInfo.exists) {
        throw new Error(
          "The PDF was generated but could not be saved."
        );
      }

      setSavedReceiptUris((current) => ({
        ...current,
        [selectedBill.id]: savedFile,
      }));

      Alert.alert(
        "Receipt Saved",
        `${selectedBill.id} has been saved inside FemmeBill.`,
        [
          {
            text: "Done",
            style: "default",
          },
          {
            text: "Share Now",
            onPress: async () => {
              const canShare =
                await Sharing.isAvailableAsync();

              if (!canShare) {
                Alert.alert(
                  "Sharing unavailable",
                  "This device cannot open the share sheet."
                );
                return;
              }

              await Sharing.shareAsync(
                savedFile,
                {
                  mimeType: "application/pdf",
                  dialogTitle: `Share ${selectedBill.id}`,
                  UTI: "com.adobe.pdf",
                }
              );
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Unable to save receipt",
        error instanceof Error
          ? error.message
          : "Saving the PDF failed."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleShareSaved(bill: Bill) {
    const uri = savedReceiptUris[bill.id];

    if (!uri) {
      Alert.alert(
        "Receipt not found",
        "Please save this receipt again."
      );
      return;
    }

    try {
      setBusyAction(`saved-share-${bill.id}`);

      const canShare =
        await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert(
          "Sharing unavailable",
          "This device cannot open the share sheet."
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Share ${bill.id}`,
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      Alert.alert(
        "Unable to share saved receipt",
        error instanceof Error
          ? error.message
          : "Sharing failed."
      );
    } finally {
      setBusyAction(null);
    }
  }

  function handleDeleteSaved(bill: Bill) {
    Alert.alert(
      "Delete Saved Receipt",
      `Remove the saved PDF for ${bill.id} from FemmeBill?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const file =
              getReceiptFileUri(bill.id);

            void FileSystem.deleteAsync(
              file,
              {
                idempotent: true,
              }
            );

            setSavedReceiptUris((current) => {
              const next = { ...current };
              delete next[bill.id];
              return next;
            });
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            â† Home
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>
            ðŸ§¾ Receipts
          </Text>

          <Text style={styles.subtitle}>
            Share, print and export paid bills
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {savedBills.length > 0 ? (
          <View style={styles.savedSection}>
            <View style={styles.savedSectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.savedSectionTitle}>
                  ðŸ’¾ Saved Receipts
                </Text>

                <Text style={styles.savedSectionSubtitle}>
                  PDFs stored inside FemmeBill
                </Text>
              </View>

              <View style={styles.savedCountBadge}>
                <Text style={styles.savedCountText}>
                  {savedBills.length}
                </Text>
              </View>
            </View>

            {savedBills.map((bill) => (
              <View
                key={`saved-${bill.id}`}
                style={styles.savedCard}
              >
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() =>
                    setSelectedBill(bill)
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={styles.savedBillNumber}
                  >
                    {bill.id}
                  </Text>

                  <Text style={styles.savedCustomer}>
                    {bill.customerName}
                  </Text>

                  <Text style={styles.savedMeta}>
                    {bill.billDate} â€¢{" "}
                    {formatCurrency(bill.total)}
                  </Text>
                </TouchableOpacity>

                <View style={styles.savedActions}>
                  <TouchableOpacity
                    style={styles.smallActionButton}
                    onPress={() =>
                      void handleShareSaved(bill)
                    }
                    disabled={
                      busyAction ===
                      `saved-share-${bill.id}`
                    }
                  >
                    <Text
                      style={styles.smallActionText}
                    >
                      {busyAction ===
                      `saved-share-${bill.id}`
                        ? "..."
                        : "ðŸ“¤"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.smallActionButton}
                    onPress={() =>
                      handleDeleteSaved(bill)
                    }
                  >
                    <Text
                      style={styles.smallActionText}
                    >
                      ðŸ—‘ï¸
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {paidBills.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              ðŸ§¾
            </Text>

            <Text style={styles.emptyTitle}>
              No paid receipts yet
            </Text>

            <Text style={styles.emptyText}>
              Once a bill is fully paid, its receipt
              will appear here.
            </Text>
          </View>
        ) : (
          paidBills.map((bill) => (
            <TouchableOpacity
              key={bill.id}
              style={styles.billCard}
              onPress={() =>
                setSelectedBill(bill)
              }
              activeOpacity={0.85}
            >
              <View style={styles.billTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billNumber}>
                    {bill.id}
                  </Text>

                  <Text style={styles.customerName}>
                    {bill.customerName}
                  </Text>
                </View>

                <View style={styles.billBadges}>
                  <View style={styles.paidBadge}>
                    <Text
                      style={styles.paidBadgeText}
                    >
                      PAID
                    </Text>
                  </View>

                  {savedReceiptUris[bill.id] ? (
                    <View
                      style={styles.savedBadge}
                    >
                      <Text
                        style={styles.savedBadgeText}
                      >
                        SAVED
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.billBottomRow}>
                <Text style={styles.billDate}>
                  {bill.billDate}
                </Text>

                <Text style={styles.billTotal}>
                  {formatCurrency(bill.total)}
                </Text>
              </View>

              <Text style={styles.tapText}>
                Tap to view receipt â†’
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!selectedBill}
        animationType="slide"
        onRequestClose={() =>
          setSelectedBill(null)
        }
      >
        {selectedBill ? (
          <SafeAreaView
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() =>
                  setSelectedBill(null)
                }
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>
                  âœ•
                </Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                Bill
              </Text>

              <View style={{ width: 42 }} />
            </View>

            {/* ================================================= */}
            {/* RECEIPT ACTIONS - ALWAYS VISIBLE AT TOP */}
            {/* ================================================= */}

            <View style={styles.actionsPanel}>
              <Text style={styles.actionsTitle}>
                Receipt Actions
              </Text>

              <View style={styles.actionsRow}>
                <ActionButton
                  icon="ðŸ“¤"
                  label="Share Receipt"
                  onPress={() =>
                    void handleShare()
                  }
                  loading={
                    busyAction === "share"
                  }
                />

                <ActionButton
                  icon="ðŸŸ¢"
                  label="WhatsApp"
                  onPress={() =>
                    void handleWhatsApp()
                  }
                  loading={
                    busyAction === "whatsapp"
                  }
                />
              </View>

              <View style={styles.actionsRow}>
                <ActionButton
                  icon="ðŸ–¨ï¸"
                  label="Print Receipt"
                  onPress={() =>
                    void handlePrint()
                  }
                  loading={
                    busyAction === "print"
                  }
                />

                <ActionButton
                  icon="ðŸ’¾"
                  label="Save / Export PDF"
                  onPress={() =>
                    void handleExport()
                  }
                  loading={
                    busyAction === "export"
                  }
                />
              </View>
            </View>

            {/* ================================================= */}
            {/* RECEIPT CONTENT */}
            {/* ================================================= */}

            <ScrollView
              contentContainerStyle={
                styles.receiptContent
              }
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.receiptCard}>
                <Text style={styles.brand}>
                  FemmeBill
                </Text>

                <Text style={styles.brandSub}>
                  Tailoring & Boutique Management
                </Text>

                <Text style={styles.receiptLabel}>
                  BILL
                </Text>

                <View style={styles.divider} />

                <View style={styles.infoGrid}>
                  <Info
                    label="Bill No"
                    value={selectedBill.id}
                  />

                  <Info
                    label="Order No"
                    value={
                      selectedBill.orderId
                    }
                  />

                  <Info
                    label="Date"
                    value={
                      selectedBill.billDate
                    }
                  />
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>
                  CUSTOMER
                </Text>

                <Text style={styles.customerBig}>
                  {selectedBill.customerName}
                </Text>

                {getCustomer(selectedBill)
                  ?.phone ? (
                  <Text
                    style={
                      styles.customerPhone
                    }
                  >
                    {
                      getCustomer(
                        selectedBill
                      )?.phone
                    }
                  </Text>
                ) : null}

                <View style={styles.itemHeader}>
                  <Text
                    style={styles.itemHeaderText}
                  >
                    ITEM
                  </Text>

                  <Text
                    style={styles.itemHeaderText}
                  >
                    TOTAL
                  </Text>
                </View>

                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={styles.itemName}
                    >
                      {selectedBill.item ||
                        "Tailoring Service"}
                    </Text>

                    <Text
                      style={styles.itemMeta}
                    >
                      Qty{" "}
                      {selectedBill.quantity ||
                        1}{" "}
                      Ã—{" "}
                      {formatCurrency(
                        selectedBill.price
                      )}
                    </Text>
                  </View>

                  <Text
                    style={styles.itemTotal}
                  >
                    {formatCurrency(
                      Number(
                        selectedBill.quantity ||
                          1
                      ) *
                        Number(
                          selectedBill.price ||
                            0
                        )
                    )}
                  </Text>
                </View>

                <View style={styles.summary}>
                  <SummaryRow
                    label="Subtotal"
                    value={
                      selectedBill.subtotal
                    }
                  />

                  <SummaryRow
                    label="Discount"
                    value={
                      selectedBill.discount
                    }
                  />

                  <View
                    style={
                      styles.grandTotalRow
                    }
                  >
                    <Text
                      style={
                        styles.grandTotalLabel
                      }
                    >
                      TOTAL
                    </Text>

                    <Text
                      style={
                        styles.grandTotalValue
                      }
                    >
                      {formatCurrency(
                        selectedBill.total
                      )}
                    </Text>
                  </View>

                  <SummaryRow
                    label="Paid"
                    value={
                      selectedBill.paidAmount
                    }
                    green
                  />

                  <SummaryRow
                    label="Balance"
                    value={
                      selectedBill.balance
                    }
                  />
                </View>

                <View
                  style={styles.paymentInfo}
                >
                  <Info
                    label="Payment Method"
                    value={
                      selectedBill.paymentMethod
                    }
                  />

                  <Info
                    label="Status"
                    value={
                      selectedBill.status
                    }
                  />
                </View>

                <View
                  style={styles.paidBanner}
                >
                  <Text
                    style={
                      styles.paidBannerText
                    }
                  >
                    âœ“ PAYMENT{" "}
                    {selectedBill.status.toUpperCase()}
                  </Text>
                </View>

                <Text
                  style={styles.footerText}
                >
                  Thank you for choosing
                  FemmeBill.
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  green,
}: {
  label: string;
  value: number;
  green?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.summaryValue,
          green && styles.greenValue,
        ]}
      >
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  loading,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      <Text style={styles.actionIcon}>
        {icon}
      </Text>

      <Text style={styles.actionLabel}>
        {loading ? "Working..." : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f4f8",
  },

  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    paddingRight: 12,
    paddingVertical: 8,
  },

  backText: {
    color: "#6d3f73",
    fontWeight: "800",
    fontSize: 13,
  },

  headerTextWrap: {
    flex: 1,
  },

  title: {
    fontSize: 21,
    fontWeight: "900",
    color: "#251d28",
  },

  subtitle: {
    marginTop: 3,
    color: "#777",
    fontSize: 11,
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginTop: 20,
  },

  emptyIcon: {
    fontSize: 42,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "900",
    color: "#222",
  },

  emptyText: {
    marginTop: 7,
    textAlign: "center",
    color: "#777",
    lineHeight: 20,
  },

  savedSection: {
    backgroundColor: "#f0f8f3",
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d7ecdf",
  },

  savedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  savedSectionTitle: {
    color: "#245a3a",
    fontSize: 16,
    fontWeight: "900",
  },

  savedSectionSubtitle: {
    color: "#6b8173",
    fontSize: 11,
    marginTop: 3,
  },

  savedCountBadge: {
    backgroundColor: "#16834b",
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  savedCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },

  savedCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 13,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0eee5",
  },

  savedBillNumber: {
    color: "#245a3a",
    fontSize: 13,
    fontWeight: "900",
  },

  savedCustomer: {
    color: "#444",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  savedMeta: {
    color: "#888",
    fontSize: 10,
    marginTop: 4,
  },

  savedActions: {
    flexDirection: "row",
    gap: 7,
    marginLeft: 10,
  },

  smallActionButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#f4f8f5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dfe9e2",
  },

  smallActionText: {
    fontSize: 16,
  },

  billCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ece7ed",
  },

  billTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  billNumber: {
    fontSize: 15,
    fontWeight: "900",
    color: "#222",
  },

  customerName: {
    marginTop: 4,
    color: "#666",
    fontSize: 12,
  },

  billBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  paidBadge: {
    backgroundColor: "#e8f7ee",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  paidBadgeText: {
    color: "#16834b",
    fontSize: 10,
    fontWeight: "900",
  },

  savedBadge: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
  },

  savedBadgeText: {
    color: "#4f46a5",
    fontSize: 9,
    fontWeight: "900",
  },

  billBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },

  billDate: {
    color: "#777",
    fontSize: 12,
  },

  billTotal: {
    color: "#6d3f73",
    fontSize: 16,
    fontWeight: "900",
  },

  tapText: {
    marginTop: 12,
    color: "#6d3f73",
    fontSize: 11,
    fontWeight: "800",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "#f7f4f8",
  },

  modalHeader: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  closeButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    fontSize: 19,
    color: "#555",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#222",
  },

  /* =============================== */
  /* RECEIPT ACTION PANEL             */
  /* =============================== */

  actionsPanel: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#e7e2e8",
  },

  actionsTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#555",
    marginBottom: 9,
    textAlign: "center",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 9,
  },

  actionButton: {
    flex: 1,
    minHeight: 62,
    backgroundColor: "#faf7fb",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ded3e1",
  },

  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },

  actionLabel: {
    color: "#4f2d54",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },

  receiptContent: {
    padding: 16,
    paddingBottom: 35,
  },

  receiptCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#eee",
  },

  brand: {
    textAlign: "center",
    color: "#6d3f73",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1,
  },

  brandSub: {
    textAlign: "center",
    color: "#777",
    fontSize: 11,
    marginTop: 4,
  },

  receiptLabel: {
    textAlign: "center",
    color: "#333",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 9,
    letterSpacing: 1,
  },

  divider: {
    height: 1,
    backgroundColor: "#e9e9e9",
    marginVertical: 18,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  infoBox: {
    flex: 1,
    minWidth: 90,
  },

  infoLabel: {
    color: "#888",
    fontSize: 10,
    marginBottom: 4,
  },

  infoValue: {
    color: "#222",
    fontSize: 12,
    fontWeight: "800",
  },

  sectionLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "800",
  },

  customerBig: {
    color: "#222",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },

  customerPhone: {
    color: "#777",
    fontSize: 12,
    marginTop: 3,
  },

  itemHeader: {
    marginTop: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  itemHeaderText: {
    color: "#888",
    fontSize: 10,
    fontWeight: "900",
  },

  itemRow: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  itemName: {
    color: "#222",
    fontSize: 13,
    fontWeight: "800",
  },

  itemMeta: {
    color: "#888",
    fontSize: 11,
    marginTop: 4,
  },

  itemTotal: {
    color: "#222",
    fontSize: 13,
    fontWeight: "900",
  },

  summary: {
    marginTop: 14,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },

  summaryLabel: {
    color: "#777",
    fontSize: 12,
  },

  summaryValue: {
    color: "#333",
    fontSize: 12,
    fontWeight: "700",
  },

  greenValue: {
    color: "#16834b",
  },

  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: "#222",
    marginTop: 8,
    paddingTop: 12,
  },

  grandTotalLabel: {
    color: "#222",
    fontSize: 16,
    fontWeight: "900",
  },

  grandTotalValue: {
    color: "#6d3f73",
    fontSize: 18,
    fontWeight: "900",
  },

  paymentInfo: {
    marginTop: 20,
    flexDirection: "row",
    gap: 22,
  },

  paidBanner: {
    marginTop: 18,
    backgroundColor: "#e8f7ee",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  paidBannerText: {
    color: "#16834b",
    fontSize: 12,
    fontWeight: "900",
  },

  footerText: {
    textAlign: "center",
    color: "#999",
    fontSize: 10,
    marginTop: 18,
  },
});

