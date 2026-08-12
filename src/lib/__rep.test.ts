import { expect, test } from "vitest";
import { EMPTY_FILTERS, buildCsv, buildPrintHtml, describeRange, filterOrders, summarise, type ReportOrder } from "@/lib/order-report";
const mk = (o: Partial<ReportOrder>): ReportOrder => ({
  id:"1", order_number:"EN-1001", customer_name:"Kofi", customer_phone:"0551234567",
  delivery_location:"PSI Hall", delivery_window:"7:00 - 8:00", payment_method:"Mobile Money",
  payment_status:"Pending", additional_instructions:"Room 23", total:18, status:"New",
  created_at:new Date().toISOString(), order_items:[{product_name:"Koose",quantity:2,unit_price:5,subtotal:10}], ...o });
test("filters + summary + csv + print", () => {
  const a = mk({}); const b = mk({id:"2",order_number:"EN-1002",payment_status:"Paid",total:10,customer_name:"Ama"});
  const all=[a,b];
  expect(filterOrders(all, EMPTY_FILTERS)).toHaveLength(2);
  expect(filterOrders(all, {...EMPTY_FILTERS, paymentStatus:"Paid"})).toHaveLength(1);
  expect(filterOrders(all, {...EMPTY_FILTERS, customerName:"ama"})).toHaveLength(1);
  expect(filterOrders(all, {...EMPTY_FILTERS, orderNumber:"1002"})).toHaveLength(1);
  expect(filterOrders(all, {...EMPTY_FILTERS, preset:"today"})).toHaveLength(2);
  expect(filterOrders(all, {...EMPTY_FILTERS, preset:"yesterday"})).toHaveLength(0);
  const s = summarise(all);
  expect(s.count).toBe(2); expect(s.totalSales).toBe(28); expect(s.paidCount).toBe(1); expect(s.pendingTotal).toBe(18);
  const csv = buildCsv(all);
  expect(csv.split("\n")).toHaveLength(3);
  expect(csv).toContain("EN-1002");
  const html = buildPrintHtml(all, "Einyornose", describeRange(EMPTY_FILTERS));
  expect(html).toContain("PSI Hall"); expect(html).toContain("Einyornose");
});
