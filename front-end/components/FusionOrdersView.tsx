"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  RefreshCw, 
  Clock, 
  TrendingUp, 
  ExternalLink, 
  Trash2,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer,
  Zap,
  Repeat,
  Target
} from "lucide-react";
import { OrderCacheService, SavedOrder, OrderType } from "@/lib/order-cache-service";

interface AllOrdersViewProps {
  walletAddress?: string;
  filterType?: OrderType; // Optional filter by order type
}

export function FusionOrdersView({ walletAddress, filterType }: AllOrdersViewProps) {
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<SavedOrder | null>(null);
  const [typeFilter, setTypeFilter] = useState<OrderType | 'all'>(filterType || 'all');

  // Load orders from cache
  const loadOrders = () => {
    setIsLoading(true);
    try {
      let cachedOrders = walletAddress 
        ? OrderCacheService.getOrdersForWallet(walletAddress)
        : OrderCacheService.getAllOrders();
      
      // Apply type filter
      if (typeFilter !== 'all') {
        cachedOrders = cachedOrders.filter(order => order.type === typeFilter);
      }
      
      setOrders(cachedOrders);
      console.log(`📊 Loaded ${cachedOrders.length} orders from cache (filter: ${typeFilter})`);
    } catch (error) {
      console.error('❌ Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load orders on component mount and when filters change
  useEffect(() => {
    loadOrders();
  }, [walletAddress, typeFilter]);

  // Delete order from cache
  const handleDeleteOrder = (orderHash: string) => {
    if (confirm('Are you sure you want to delete this order from your local history?')) {
      OrderCacheService.deleteOrder(orderHash);
      loadOrders(); // Refresh the list
    }
  };

  // Clear all orders
  const handleClearAllOrders = () => {
    if (confirm('Are you sure you want to clear all order history? This cannot be undone.')) {
      OrderCacheService.clearAllOrders();
      loadOrders(); // Refresh the list
    }
  };

  // Get status icon and color
  const getStatusBadge = (status: SavedOrder['status']) => {
    const config = {
      submitted: { icon: Clock, variant: "secondary" as const, color: "text-yellow-600" },
      pending: { icon: Timer, variant: "secondary" as const, color: "text-blue-600" },
      filled: { icon: CheckCircle, variant: "default" as const, color: "text-green-600" },
      completed: { icon: CheckCircle, variant: "default" as const, color: "text-green-600" },
      cancelled: { icon: XCircle, variant: "destructive" as const, color: "text-red-600" },
      expired: { icon: AlertCircle, variant: "destructive" as const, color: "text-orange-600" }
    };

    const { icon: Icon, variant, color } = config[status];
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Get order type badge
  const getTypeBadge = (type: OrderType) => {
    const config = {
      fusion: { icon: Zap, label: "Fusion", color: "bg-purple-100 text-purple-800" },
      swap: { icon: Repeat, label: "Swap", color: "bg-blue-100 text-blue-800" },
      limit: { icon: Target, label: "Limit", color: "bg-green-100 text-green-800" }
    };

    const { icon: Icon, label, color } = config[type];
    
    return (
      <Badge className={`flex items-center gap-1 ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Get order statistics
  const stats = OrderCacheService.getOrderStats(walletAddress);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats and filter */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">
            {typeFilter === 'all' ? 'All Orders' : 
             typeFilter === 'fusion' ? 'Fusion Orders' :
             typeFilter === 'swap' ? 'Swap History' : 'Limit Orders'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {stats.total} total orders • {stats.filled + (stats as any).completed} completed • {stats.submitted + stats.pending} active
          </p>
        </div>
        <div className="flex gap-2">
          {/* Type Filter */}
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value as OrderType | 'all')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Types</option>
            <option value="fusion">Fusion</option>
            <option value="swap">Swaps</option>
            <option value="limit">Limit</option>
          </select>
          
          <Button 
            onClick={loadOrders}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {orders.length > 0 && (
            <Button 
              onClick={handleClearAllOrders}
              variant="outline"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.filled + (stats as any).completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.submitted}</div>
              <div className="text-sm text-gray-600">Submitted</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
              <div className="text-sm text-gray-600">Expired</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders list */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {typeFilter === 'all' ? 'No Orders Yet' :
               typeFilter === 'fusion' ? 'No Fusion Orders Yet' :
               typeFilter === 'swap' ? 'No Swaps Yet' : 'No Limit Orders Yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {typeFilter === 'all' ? 'Your trading history will appear here once you make swaps or orders' :
               typeFilter === 'fusion' ? 'Your intent swap orders will appear here once you create them' :
               typeFilter === 'swap' ? 'Your completed swaps will appear here once you make them' : 
               'Your limit orders will appear here once you create them'}
            </p>
            <Button onClick={() => window.location.href = '/swap'}>
              <TrendingUp className="w-4 h-4 mr-2" />
              {typeFilter === 'fusion' ? 'Create Intent Swap' : 'Start Trading'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.orderHash} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">
                        {order.fromToken.symbol} → {order.toToken.symbol}
                      </h4>
                      {getTypeBadge(order.type)}
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <span className="font-medium">{order.fromAmountFormatted}</span>
                      <ArrowRight className="w-4 h-4" />
                      <span className="font-medium">{order.toAmountFormatted}</span>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {formatTimeAgo(order.timestamp)} • {formatDate(order.timestamp)}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(selectedOrder?.orderHash === order.orderHash ? null : order)}
                    >
                      {selectedOrder?.orderHash === order.orderHash ? 'Hide' : 'Details'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteOrder(order.orderHash)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded details */}
                {selectedOrder?.orderHash === order.orderHash && (
                  <div className="border-t pt-4 mt-4 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">
                          {order.type === 'swap' ? 'Transaction Hash:' : 'Order Hash:'}
                        </span>
                        <div className="font-mono text-xs break-all">{order.orderHash}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Chain ID:</span>
                        <div className="font-medium">{order.chainId}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <div className="font-medium capitalize">{order.type}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Estimated Price:</span>
                        <div className="font-medium">{order.estimatedPrice}</div>
                      </div>
                      
                      {/* Fusion-specific details */}
                      {order.type === 'fusion' && order.preset && (
                        <div>
                          <span className="text-gray-600">Preset:</span>
                          <div className="font-medium capitalize">{order.preset}</div>
                        </div>
                      )}
                      {order.type === 'fusion' && order.validUntil && (
                        <div>
                          <span className="text-gray-600">Valid Until:</span>
                          <div className="font-medium">{new Date(order.validUntil * 1000).toLocaleString()}</div>
                        </div>
                      )}
                      {order.type === 'fusion' && order.estimatedFillTime && (
                        <div>
                          <span className="text-gray-600">Est. Fill Time:</span>
                          <div className="font-medium">{order.estimatedFillTime}</div>
                        </div>
                      )}
                      
                      {/* Swap-specific details */}
                      {order.type === 'swap' && order.slippage && (
                        <div>
                          <span className="text-gray-600">Slippage:</span>
                          <div className="font-medium">{order.slippage}%</div>
                        </div>
                      )}
                      {order.type === 'swap' && order.approvalTxHash && (
                        <div>
                          <span className="text-gray-600">Approval Tx:</span>
                          <div className="font-mono text-xs break-all">{order.approvalTxHash}</div>
                        </div>
                      )}
                      
                      {/* Limit order specific details */}
                      {order.type === 'limit' && order.validUntil && (
                        <div>
                          <span className="text-gray-600">Valid Until:</span>
                          <div className="font-medium">{new Date(order.validUntil * 1000).toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Transaction links */}
                    {order.fillTxHash && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <span className="font-medium">Filled!</span> Transaction: 
                          <a 
                            href={`https://basescan.org/tx/${order.fillTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-blue-600 hover:underline inline-flex items-center"
                          >
                            {order.fillTxHash.slice(0, 10)}...
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {order.type === 'swap' && order.swapTxHash && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <span className="font-medium">Swap Completed!</span> View on BaseScan: 
                          <a 
                            href={`https://basescan.org/tx/${order.swapTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-blue-600 hover:underline inline-flex items-center"
                          >
                            {order.swapTxHash.slice(0, 10)}...
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}