export type OrderStatus =
  | "Pending"
  | "In Progress"
  | "Ready"
  | "Delivered";

export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  item: string;
  measurementUsed: string;
  quantity: number;
  price: number;
  orderDate: string;
  deliveryDate: string;
  status: OrderStatus;
  notes: string;
};

export const initialOrders: Order[] = [
  {
    id: "ORD-001",
    customerId: "1",
    customerName: "Lakshmi",
    item: "Blouse",
    measurementUsed: "19 Sep 2026",
    quantity: 1,
    price: 1200,
    orderDate: "19 Sep 2026",
    deliveryDate: "25 Sep 2026",
    status: "Ready",
    notes: "Regular fit",
  },
  {
    id: "ORD-002",
    customerId: "2",
    customerName: "Priya",
    item: "Chudidar",
    measurementUsed: "18 Sep 2026",
    quantity: 1,
    price: 1800,
    orderDate: "18 Sep 2026",
    deliveryDate: "27 Sep 2026",
    status: "In Progress",
    notes: "",
  },
  {
    id: "ORD-003",
    customerId: "3",
    customerName: "Anjali",
    item: "Lehenga",
    measurementUsed: "15 Sep 2026",
    quantity: 1,
    price: 3500,
    orderDate: "15 Sep 2026",
    deliveryDate: "30 Sep 2026",
    status: "Pending",
    notes: "",
  },
];