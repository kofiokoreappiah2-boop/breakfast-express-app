import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  expenseSchema,
  financeRangeSchema,
  reconcileOrderSchema,
  voidExpenseSchema,
} from "@/lib/finance.schemas";
import { money } from "@/lib/format";

export const getFinanceSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => financeRangeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertOwner } = await import("@/lib/control-center.server");
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const start = `${data.startDate}T00:00:00.000Z`;
    const endExclusive = new Date(`${data.endDate}T00:00:00.000Z`);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    const [ordersRes, expensesRes] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select(
          "id, order_number, created_at, delivery_date, total, payment_method, payment_status, status, payment_received_at, reconciled_at",
        )
        .gte("created_at", start)
        .lt("created_at", endExclusive.toISOString())
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("expenses")
        .select(
          "id, expense_date, category, description, supplier, amount, payment_method, notes, status, created_at",
        )
        .gte("expense_date", data.startDate)
        .lte("expense_date", data.endDate)
        .order("expense_date", { ascending: false }),
    ]);

    if (ordersRes.error) throw new Error("Could not load income records.");
    if (expensesRes.error) throw new Error("Could not load expense records.");

    const orders = (ordersRes.data ?? []).map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      createdAt: order.created_at,
      deliveryDate: order.delivery_date,
      total: Number(order.total),
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      status: order.status,
      paymentReceivedAt: order.payment_received_at,
      reconciledAt: order.reconciled_at,
    }));
    const expenses = (expensesRes.data ?? []).map((expense) => ({
      id: expense.id,
      expenseDate: expense.expense_date,
      category: expense.category,
      description: expense.description,
      supplier: expense.supplier,
      amount: Number(expense.amount),
      paymentMethod: expense.payment_method,
      notes: expense.notes,
      status: expense.status,
      createdAt: expense.created_at,
    }));

    const activeOrders = orders.filter((order) => order.status !== "Cancelled");
    const received = activeOrders.filter((order) => order.paymentStatus === "Paid");
    const postedExpenses = expenses.filter((expense) => expense.status === "Posted");
    const bookedSales = money(activeOrders.reduce((sum, order) => sum + order.total, 0));
    const receivedIncome = money(received.reduce((sum, order) => sum + order.total, 0));
    const expenseTotal = money(postedExpenses.reduce((sum, expense) => sum + expense.amount, 0));

    return {
      summary: {
        bookedSales,
        receivedIncome,
        outstanding: money(bookedSales - receivedIncome),
        expenses: expenseTotal,
        netCash: money(receivedIncome - expenseTotal),
        mobileMoney: money(
          received
            .filter((order) => order.paymentMethod === "Mobile Money")
            .reduce((sum, order) => sum + order.total, 0),
        ),
        cash: money(
          received
            .filter((order) => order.paymentMethod === "Payment on Delivery")
            .reduce((sum, order) => sum + order.total, 0),
        ),
      },
      orders,
      expenses,
    };
  });

export const addExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => expenseSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertOwner } = await import("@/lib/control-center.server");
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      expense_date: data.expenseDate,
      category: data.category,
      description: data.description,
      supplier: data.supplier,
      amount: data.amount,
      payment_method: data.paymentMethod,
      notes: data.notes,
      created_by: context.userId,
    };
    const { data: expense, error } = await supabaseAdmin
      .from("expenses")
      .insert(row)
      .select("*")
      .single();
    if (error || !expense) throw new Error("Could not save the expense.");
    await supabaseAdmin.from("expense_audit_log").insert({
      expense_id: expense.id,
      staff_user_id: context.userId,
      action_type: "Created",
      new_value: expense,
    });
    return { ok: true };
  });

export const voidExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => voidExpenseSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertOwner } = await import("@/lib/control-center.server");
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: previous } = await supabaseAdmin
      .from("expenses")
      .select("*")
      .eq("id", data.id)
      .single();
    if (!previous) throw new Error("Expense not found.");
    const { data: updated, error } = await supabaseAdmin
      .from("expenses")
      .update({ status: "Voided", updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error || !updated) throw new Error("Could not void the expense.");
    await supabaseAdmin.from("expense_audit_log").insert({
      expense_id: data.id,
      staff_user_id: context.userId,
      action_type: "Voided",
      previous_value: previous,
      new_value: updated,
    });
    return { ok: true };
  });

export const reconcileOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => reconcileOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertOwner } = await import("@/lib/control-center.server");
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: previous } = await supabaseAdmin
      .from("orders")
      .select("status, payment_status, payment_received_at, reconciled_at")
      .eq("id", data.id)
      .single();
    if (!previous) throw new Error("Order not found.");
    if (previous.status === "Cancelled") {
      throw new Error("A cancelled order cannot be marked as paid.");
    }
    const timestamp = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "Paid",
        payment_received_at: previous.payment_received_at ?? timestamp,
        reconciled_at: timestamp,
        reconciled_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error("Could not reconcile the payment.");
    await supabaseAdmin.from("order_audit_log").insert({
      order_id: data.id,
      staff_user_id: context.userId,
      action_type: "Payment reconciled",
      previous_value: JSON.stringify(previous),
      new_value: JSON.stringify({ payment_status: "Paid", reconciled_at: timestamp }),
    });
    return { ok: true };
  });
