import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import {
  createExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
  Expense,
  ExpenseCategory,
  fetchExpenses,
} from "../lib/expenseService";

const wine = "#8B1238";
const pink = "#FCE8F0";
const cream = "#FFF9F2";
const gray = "#777777";

function todayString() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function formatMoney(value: number) {
  return "Rs. " + Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ExpensesScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [category, setCategory] =
    useState<ExpenseCategory>("Fabric & Materials");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayString());
  const [notes, setNotes] = useState("");
  const [showCategories, setShowCategories] = useState(false);

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchExpenses();
      setExpenses(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load expenses.";

      Alert.alert("Expenses", message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const monthTotal = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    return expenses
      .filter((item) => item.expense_date?.startsWith(currentMonth))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  const todayTotal = useMemo(() => {
    const today = todayString();

    return expenses
      .filter((item) => item.expense_date === today)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  const handleAddExpense = async () => {
    const parsedAmount = Number(amount);

    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter an amount greater than zero.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
      Alert.alert("Invalid date", "Enter the date in YYYY-MM-DD format.");
      return;
    }

    try {
      setSaving(true);

      const newExpense = await createExpense({
        category,
        amount: parsedAmount,
        expense_date: expenseDate,
        notes,
      });

      setExpenses((previous) =>
        [newExpense, ...previous].sort((a, b) => {
          const dateOrder = b.expense_date.localeCompare(a.expense_date);
          if (dateOrder !== 0) return dateOrder;

          return b.created_at.localeCompare(a.created_at);
        })
      );

      setAmount("");
      setNotes("");
      setExpenseDate(todayString());
      setCategory("Fabric & Materials");

      Alert.alert("Saved", "Your expense has been recorded.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save expense.";

      Alert.alert("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (expense: Expense) => {
    Alert.alert(
      "Delete expense?",
      `Delete ${formatMoney(Number(expense.amount))} for ${expense.category}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpense(expense.id);
              setExpenses((previous) =>
                previous.filter((item) => item.id !== expense.id)
              );
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Could not delete expense.";

              Alert.alert("Delete failed", message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>{"<"}</Text>
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.title}>Expense Tracker</Text>
          <Text style={styles.subtitle}>Manage your boutique spending</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadExpenses}
          disabled={loading}
        >
          <Text style={styles.refreshText}>R</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryAmount}>{formatMoney(monthTotal)}</Text>
            <Text style={styles.summaryHint}>Total expenses</Text>
          </View>

          <View style={[styles.summaryCard, styles.todayCard]}>
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={styles.summaryAmount}>{formatMoney(todayTotal)}</Text>
            <Text style={styles.summaryHint}>Today's spending</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Add New Expense</Text>
          <Text style={styles.sectionSubtitle}>
            Record money spent by your boutique
          </Text>

          <Text style={styles.fieldLabel}>Expense Category</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowCategories((previous) => !previous)}
          >
            <Text style={styles.selectText}>{category}</Text>
            <Text style={styles.chevron}>
              {showCategories ? "^" : "v"}
            </Text>
          </TouchableOpacity>

          {showCategories && (
            <View style={styles.categoryList}>
              {EXPENSE_CATEGORIES.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.categoryOption,
                    category === item && styles.categorySelected,
                  ]}
                  onPress={() => {
                    setCategory(item);
                    setShowCategories(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      category === item && styles.categorySelectedText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.fieldLabel}>Amount (Rs.)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            placeholderTextColor="#A29A9D"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Expense Date (YYYY-MM-DD)</Text>
          <TextInput
            value={expenseDate}
            onChangeText={setExpenseDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#A29A9D"
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Notes (Optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Silk fabric purchase"
            placeholderTextColor="#A29A9D"
            style={[styles.input, styles.notesInput]}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleAddExpense}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>ï¼‹  Save Expense</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.historyHeader}>
          <View>
            <Text style={styles.sectionTitle}>Expense History</Text>
            <Text style={styles.sectionSubtitle}>
              {expenses.length} recorded expense
              {expenses.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={wine} />
            <Text style={styles.loadingText}>Loading expenses...</Text>
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>Rs.</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptyText}>
              Add your first boutique expense using the form above.
            </Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseCard}>
              <View style={styles.expenseIcon}>
                <Text style={styles.expenseIconText}>Rs.</Text>
              </View>

              <View style={styles.expenseDetails}>
                <Text style={styles.expenseCategory}>{expense.category}</Text>
                <Text style={styles.expenseDate}>
                  {formatDate(expense.expense_date)}
                </Text>
                {!!expense.notes.trim() && (
                  <Text style={styles.expenseNotes} numberOfLines={2}>
                    {expense.notes}
                  </Text>
                )}
              </View>

              <View style={styles.expenseRight}>
                <Text style={styles.expenseAmount}>
                  {formatMoney(Number(expense.amount))}
                </Text>
                <TouchableOpacity
                  onPress={() => confirmDelete(expense)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cream,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0E7EA",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: pink,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 30,
    color: wine,
    lineHeight: 34,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: wine,
  },
  subtitle: {
    fontSize: 12,
    color: gray,
    marginTop: 3,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#F7F1F3",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshText: {
    fontSize: 25,
    color: wine,
  },
  content: {
    padding: 16,
    paddingBottom: 35,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: wine,
    borderRadius: 18,
    padding: 16,
    minHeight: 118,
    justifyContent: "center",
  },
  todayCard: {
    backgroundColor: "#C2185B",
  },
  summaryLabel: {
    color: "#FCE8F0",
    fontSize: 12,
    fontWeight: "600",
  },
  summaryAmount: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 9,
  },
  summaryHint: {
    color: "#FCE8F0",
    fontSize: 11,
    marginTop: 5,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F1E5E9",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#242124",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: gray,
    marginTop: 5,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3C3035",
    marginTop: 13,
    marginBottom: 7,
  },
  selectButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#E8DDE1",
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFCFD",
  },
  selectText: {
    fontSize: 14,
    color: "#30252A",
    fontWeight: "600",
  },
  chevron: {
    color: wine,
    fontSize: 12,
  },
  categoryList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E8DDE1",
    borderRadius: 12,
    overflow: "hidden",
  },
  categoryOption: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F2EAED",
  },
  categorySelected: {
    backgroundColor: pink,
  },
  categoryOptionText: {
    color: "#42373B",
    fontSize: 13,
  },
  categorySelectedText: {
    color: wine,
    fontWeight: "800",
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#E8DDE1",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: "#30252A",
    fontSize: 14,
    backgroundColor: "#FFFCFD",
  },
  notesInput: {
    minHeight: 85,
  },
  saveButton: {
    marginTop: 20,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: wine,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  historyHeader: {
    marginBottom: 6,
  },
  expenseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#F1E5E9",
  },
  expenseIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: pink,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseIconText: {
    fontSize: 19,
    fontWeight: "800",
    color: wine,
  },
  expenseDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: "800",
    color: "#30252A",
  },
  expenseDate: {
    fontSize: 11,
    color: gray,
    marginTop: 4,
  },
  expenseNotes: {
    fontSize: 12,
    color: "#6D6267",
    marginTop: 5,
  },
  expenseRight: {
    alignItems: "flex-end",
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: wine,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    marginTop: 7,
  },
  deleteText: {
    color: "#C62828",
    fontSize: 11,
    fontWeight: "700",
  },
  loadingBox: {
    padding: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: gray,
  },
  emptyCard: {
    padding: 25,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 30,
    color: wine,
    fontWeight: "800",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#30252A",
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    color: gray,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
  },
});



