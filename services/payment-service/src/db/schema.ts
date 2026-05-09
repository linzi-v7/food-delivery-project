import { pgTable, uuid, varchar, doublePrecision, timestamp } from "drizzle-orm/pg-core";

export const transactions = pgTable("transactions", {
  transactionId: uuid("transaction_id").defaultRandom().primaryKey(),
  orderId: varchar("order_id"),
  customerId: varchar("customer_id"),
  amount: doublePrecision("amount").notNull(),
  status: varchar("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
