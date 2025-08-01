"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle, Clock, XCircle } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useBlockchain } from "@/hooks/useBlockchain";

interface OrderMonitorProps {
  compact?: boolean;
  maxOrders?: number;
}

export function OrderMonitor({ compact = false, maxOrders = 10 }: OrderMonitorProps) {
  const { orders, isLoading, error, refreshOrders, validateOrderCondition } = useOrders();
  const { indices, refreshIndices } = useBlockchain();
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshOrders();
      refreshIndices();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshOrders, refreshIndices]);

  // Validate conditions for active orders
  const validateActiveOrders = async () => {
    const activeOrders = orders.filter(order => order.status === 'active');
    
    for (const order of activeOrders) {
      try {
        const shouldExecute = await validateOrderCondition(
          order.indexId,
          order.operator,
          order.threshold
        );
        
        if (shouldExecute) {
          console.log(`Order ${order.hash} condition met! Should execute.`);
          // In a real implementation, this would trigger the swap execution
        }
      } catch (error) {
        console.error(`Error validating order ${order.hash}:`, error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'filled':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'filled':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const displayOrders = orders.slice(0, maxOrders);
  const activeOrders = orders.filter(order => order.status === 'active');

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Active Orders ({activeOrders.length})</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshOrders}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {activeOrders.length === 0 ? (
          <p className="text-xs text-gray-500">No active orders</p>
        ) : (
          <div className="space-y-1">
            {activeOrders.slice(0, 3).map((order) => (
              <div key={order.hash} className="flex items-center justify-between text-xs">
                <span className="truncate">{order.description || `Order ${order.hash.slice(0, 8)}`}</span>
                <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                  {order.status}
                </Badge>
              </div>
            ))}
            {activeOrders.length > 3 && (
              <p className="text-xs text-gray-500">+{activeOrders.length - 3} more</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Order Monitor</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
            >
              {autoRefresh ? 'Auto ON' : 'Auto OFF'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={validateActiveOrders}
              disabled={isLoading || activeOrders.length === 0}
            >
              Check Conditions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshOrders}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-red-600 text-sm mb-4">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{activeOrders.length}</div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'filled').length}
            </div>
            <div className="text-sm text-gray-500">Filled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {orders.filter(o => o.status === 'cancelled').length}
            </div>
            <div className="text-sm text-gray-500">Cancelled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{orders.length}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-4 text-gray-500">
            Loading orders...
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No orders found.
          </div>
        ) : (
          <div className="space-y-3">
            {displayOrders.map((order) => {
              const index = indices.find(i => i.id === order.indexId);
              const currentValue = index?.value || 'N/A';
              const conditionMet = index && validateOrderCondition(order.indexId, order.operator, order.threshold);
              
              return (
                <div
                  key={order.hash}
                  className={`p-4 rounded-lg border ${
                    conditionMet ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(order.status)}
                        <span className="font-medium">{order.description || 'Order'}</span>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                        {conditionMet && order.status === 'active' && (
                          <Badge className="bg-green-100 text-green-800">
                            Ready to Execute
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Hash: {order.hash.slice(0, 16)}...{order.hash.slice(-12)}</div>
                        <div>
                          Condition: Index {order.indexId} {' '}
                          {order.operator === 0 ? '>' : 
                           order.operator === 1 ? '<' : 
                           order.operator === 2 ? '>=' : 
                           order.operator === 3 ? '<=' : '=='} {order.threshold}
                        </div>
                        <div>
                          Current Value: <span className="font-medium">{currentValue}</span>
                          {index && (
                            <span className={`ml-2 ${conditionMet ? 'text-green-600' : 'text-gray-500'}`}>
                              ({conditionMet ? 'Condition Met' : 'Waiting'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {orders.length > maxOrders && (
              <div className="text-center py-2">
                <span className="text-sm text-gray-500">
                  Showing {maxOrders} of {orders.length} orders
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}