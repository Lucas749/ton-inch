/**
 * 📋 React Hook for Order Management
 * 
 * This hook provides easy access to order functionality in React components
 */

import { useState, useEffect, useCallback } from "react";
import {
  blockchainService,
  Order,
  OrderParams,
  OrderCondition,
  OPERATORS,
} from "@/lib/blockchain-service";

export interface UseOrdersReturn {
  // State
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createOrder: (params: OrderParams) => Promise<Order | null>;
  cancelOrder: (orderHash: string) => Promise<boolean>;
  validateCondition: (condition: OrderCondition) => Promise<boolean>;
  getOrderStatus: (orderHash: string) => Promise<number>;
  refreshOrders: () => Promise<void>;
  
  // Utils
  clearError: () => void;
  getOperatorName: (operator: number) => string;
  getStatusName: (status: number) => string;
}

export function useOrders(): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create new order
  const createOrder = useCallback(async (params: OrderParams): Promise<Order | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const order = await blockchainService.createOrder(params);
      
      if (order) {
        // Add to local state
        setOrders(prev => [order, ...prev]);
      }
      
      return order;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create order";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cancel order
  const cancelOrder = useCallback(async (orderHash: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await blockchainService.cancelOrder(orderHash);
      
      if (success) {
        // Update local state
        setOrders(prev => 
          prev.map(order => 
            order.hash === orderHash 
              ? { ...order, status: 'cancelled' as const }
              : order
          )
        );
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to cancel order";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Validate order condition
  const validateCondition = useCallback(async (condition: OrderCondition): Promise<boolean> => {
    try {
      return await blockchainService.validateOrderCondition(condition);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to validate condition";
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Get order status
  const getOrderStatus = useCallback(async (orderHash: string): Promise<number> => {
    try {
      const status = await blockchainService.getOrderStatus(orderHash);
      
      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.hash === orderHash 
            ? { ...order, status: getStatusName(status) as Order['status'] }
            : order
        )
      );
      
      return status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get order status";
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Refresh orders (placeholder - in real app would fetch from blockchain events)
  const refreshOrders = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real implementation, we would:
      // 1. Query blockchain events for IndexOrderCreated
      // 2. Get current status of each order
      // 3. Update local state
      
      // For now, just update status of existing orders
      for (const order of orders) {
        try {
          const status = await blockchainService.getOrderStatus(order.hash);
          const statusName = getStatusName(status);
          
          setOrders(prev => 
            prev.map(o => 
              o.hash === order.hash 
                ? { ...o, status: statusName as Order['status'] }
                : o
            )
          );
        } catch (err) {
          console.error(`Failed to update status for order ${order.hash}:`, err);
        }
      }
    } catch (err) {
      console.error("Failed to refresh orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [orders]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get operator name for display
  const getOperatorName = useCallback((operator: number): string => {
    const names = ['>', '<', '>=', '<=', '=='];
    return names[operator] || '?';
  }, []);

  // Get status name for display
  const getStatusName = useCallback((status: number): string => {
    const names = ['active', 'filled', 'cancelled', 'expired'];
    return names[status] || 'unknown';
  }, []);

  // Load orders on mount (from localStorage for persistence)
  useEffect(() => {
    const savedOrders = localStorage.getItem('c1nch-orders');
    if (savedOrders) {
      try {
        const parsedOrders = JSON.parse(savedOrders);
        setOrders(parsedOrders);
      } catch (err) {
        console.error('Failed to load saved orders:', err);
      }
    }
  }, []);

  // Save orders to localStorage when they change
  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem('c1nch-orders', JSON.stringify(orders));
    }
  }, [orders]);

  return {
    // State
    orders,
    isLoading,
    error,
    
    // Actions
    createOrder,
    cancelOrder,
    validateCondition,
    getOrderStatus,
    refreshOrders,
    
    // Utils
    clearError,
    getOperatorName,
    getStatusName,
  };
}

// Export operators for easy use
export { OPERATORS };