export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface OrderRecord {
  orderId: string;
  quoteId: string;
  finalizationId: string;
  status: OrderStatus;
  version: number;
  updatedAt?: Date;
}

export interface CreateOrderInput {
  orderId: string;
  quoteId: string;
  finalizationId: string;
  status: OrderStatus;
}

export interface ApplyRemoteUpdateInput {
  orderId: string;
  status: OrderStatus;
  updatedAt: Date;
}

export interface OrderLifecycleDependencies {
  orders: Map<string, OrderRecord>;
}

const statusRank: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  completed: 2,
  cancelled: 2
};

export function createOrderLifecycleService(dependencies: OrderLifecycleDependencies) {
  return {
    async createOrder(input: CreateOrderInput): Promise<OrderRecord> {
      const order: OrderRecord = {
        orderId: input.orderId,
        quoteId: input.quoteId,
        finalizationId: input.finalizationId,
        status: input.status,
        version: 1
      };

      dependencies.orders.set(order.orderId, order);
      return order;
    },

    async applyRemoteUpdate(input: ApplyRemoteUpdateInput): Promise<OrderRecord> {
      const existing = dependencies.orders.get(input.orderId);
      if (!existing) {
        throw new Error("order not found");
      }

      if (existing.updatedAt && input.updatedAt <= existing.updatedAt) {
        return existing;
      }
      if (statusRank[input.status] < statusRank[existing.status]) {
        return existing;
      }
      if (isTerminal(existing.status) && input.status !== existing.status) {
        return existing;
      }

      const updated: OrderRecord = {
        ...existing,
        status: input.status,
        version: existing.version + 1,
        updatedAt: input.updatedAt
      };

      dependencies.orders.set(updated.orderId, updated);
      return updated;
    }
  };
}

function isTerminal(status: OrderStatus): boolean {
  return status === "completed" || status === "cancelled";
}
