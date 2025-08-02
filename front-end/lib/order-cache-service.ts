// Order Cache Service - Manages Fusion orders in browser localStorage

export interface SavedFusionOrder {
  orderHash: string;
  timestamp: number;
  date: string;
  status: 'submitted' | 'filled' | 'cancelled' | 'expired' | 'pending';
  
  // Order details
  fromToken: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  toToken: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  fromAmount: string;
  toAmount: string;
  fromAmountFormatted: string; // Human readable amount
  toAmountFormatted: string; // Human readable amount
  
  // Execution details
  walletAddress: string;
  chainId: string;
  preset: string;
  estimatedFillTime?: string;
  
  // Transaction details
  signature: string;
  nonce: string;
  validUntil: number;
  
  // Price info
  estimatedPrice?: string; // Price per token
  
  // Optional fill information (updated when order is filled)
  fillTxHash?: string;
  filledAt?: number;
  actualToAmount?: string;
}

export class OrderCacheService {
  private static readonly STORAGE_KEY = 'fusion_orders';
  private static readonly MAX_ORDERS = 100; // Limit stored orders

  /**
   * Save a new Fusion order to localStorage
   */
  static saveOrder(order: SavedFusionOrder): void {
    try {
      const existingOrders = this.getAllOrders();
      
      // Check if order already exists (by orderHash)
      const orderIndex = existingOrders.findIndex(o => o.orderHash === order.orderHash);
      
      if (orderIndex >= 0) {
        // Update existing order
        existingOrders[orderIndex] = order;
        console.log('📝 Updated existing order in cache:', order.orderHash);
      } else {
        // Add new order to the beginning of array (most recent first)
        existingOrders.unshift(order);
        console.log('💾 Saved new order to cache:', order.orderHash);
      }
      
      // Keep only the most recent orders
      if (existingOrders.length > this.MAX_ORDERS) {
        existingOrders.splice(this.MAX_ORDERS);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingOrders));
    } catch (error) {
      console.error('❌ Failed to save order to cache:', error);
    }
  }

  /**
   * Get all saved orders, sorted by most recent first
   */
  static getAllOrders(): SavedFusionOrder[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const orders = JSON.parse(stored) as SavedFusionOrder[];
      
      // Sort by timestamp (most recent first)
      return orders.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('❌ Failed to load orders from cache:', error);
      return [];
    }
  }

  /**
   * Get orders for a specific wallet address
   */
  static getOrdersForWallet(walletAddress: string): SavedFusionOrder[] {
    return this.getAllOrders().filter(
      order => order.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
  }

  /**
   * Get a specific order by hash
   */
  static getOrderByHash(orderHash: string): SavedFusionOrder | null {
    const orders = this.getAllOrders();
    return orders.find(order => order.orderHash === orderHash) || null;
  }

  /**
   * Update order status (e.g., when filled or cancelled)
   */
  static updateOrderStatus(
    orderHash: string, 
    status: SavedFusionOrder['status'],
    additionalData?: {
      fillTxHash?: string;
      filledAt?: number;
      actualToAmount?: string;
    }
  ): boolean {
    try {
      const orders = this.getAllOrders();
      const orderIndex = orders.findIndex(o => o.orderHash === orderHash);
      
      if (orderIndex >= 0) {
        orders[orderIndex].status = status;
        
        if (additionalData) {
          if (additionalData.fillTxHash) orders[orderIndex].fillTxHash = additionalData.fillTxHash;
          if (additionalData.filledAt) orders[orderIndex].filledAt = additionalData.filledAt;
          if (additionalData.actualToAmount) orders[orderIndex].actualToAmount = additionalData.actualToAmount;
        }
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
        console.log('📝 Updated order status:', { orderHash, status });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to update order status:', error);
      return false;
    }
  }

  /**
   * Delete an order from cache
   */
  static deleteOrder(orderHash: string): boolean {
    try {
      const orders = this.getAllOrders();
      const filteredOrders = orders.filter(o => o.orderHash !== orderHash);
      
      if (filteredOrders.length < orders.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredOrders));
        console.log('🗑️ Deleted order from cache:', orderHash);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to delete order:', error);
      return false;
    }
  }

  /**
   * Clear all orders from cache
   */
  static clearAllOrders(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🧹 Cleared all orders from cache');
    } catch (error) {
      console.error('❌ Failed to clear orders cache:', error);
    }
  }

  /**
   * Get order statistics
   */
  static getOrderStats(walletAddress?: string): {
    total: number;
    submitted: number;
    filled: number;
    cancelled: number;
    pending: number;
    expired: number;
  } {
    const orders = walletAddress ? this.getOrdersForWallet(walletAddress) : this.getAllOrders();
    
    return {
      total: orders.length,
      submitted: orders.filter(o => o.status === 'submitted').length,
      filled: orders.filter(o => o.status === 'filled').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      pending: orders.filter(o => o.status === 'pending').length,
      expired: orders.filter(o => o.status === 'expired').length,
    };
  }

  /**
   * Format token amount for display
   */
  static formatTokenAmount(amount: string, decimals: number, symbol: string): string {
    try {
      const value = parseFloat(amount) / Math.pow(10, decimals);
      return `${value.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 6 
      })} ${symbol}`;
    } catch {
      return `${amount} ${symbol}`;
    }
  }

  /**
   * Calculate estimated price (toAmount / fromAmount)
   */
  static calculatePrice(
    fromAmount: string, 
    toAmount: string, 
    fromDecimals: number, 
    toDecimals: number,
    fromSymbol: string,
    toSymbol: string
  ): string {
    try {
      const fromValue = parseFloat(fromAmount) / Math.pow(10, fromDecimals);
      const toValue = parseFloat(toAmount) / Math.pow(10, toDecimals);
      const price = toValue / fromValue;
      
      return `1 ${fromSymbol} = ${price.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 6 
      })} ${toSymbol}`;
    } catch {
      return 'Price unavailable';
    }
  }
}

export default OrderCacheService;