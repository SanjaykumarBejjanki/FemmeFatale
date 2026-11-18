import { supabase } from "./supabase";
import { getMyCustomerShopId } from "./customerService";

export const EXPENSE_CATEGORIES = [
  "Fabric & Materials",
] as const;

export type ExpenseCategory =
  (typeof EXPENSE_CATEGORIES)[number];

export type Expense = {
  id: string;
  shop_id: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type CreateExpenseInput = {
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  notes: string;
};

export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Expense[];
}

export async function createExpense(
  input: CreateExpenseInput
): Promise<Expense> {
  const shopId = await getMyCustomerShopId();

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Enter a valid expense amount.");
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      shop_id: shopId,
      category: input.category,
      amount: Number(input.amount.toFixed(2)),
      expense_date: input.expense_date,
      notes: input.notes.trim(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Expense;
}

export async function deleteExpense(
  expenseId: string
): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    throw new Error(error.message);
  }
}
