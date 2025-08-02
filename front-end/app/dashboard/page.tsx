"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WalletConnect } from "@/components/WalletConnect";
import { 
  Plus, 
  TrendingUp, 
  BarChart3, 
  Clock,
  Activity,
  AlertCircle,
  X,
  Loader2,
  CheckCircle
} from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { useOrders, OPERATORS } from "@/hooks/useOrders";
import { blockchainService, CustomIndex, Order } from "@/lib/blockchain-service";
import { useRouter } from "next/navigation";

interface IndexWithOrders extends CustomIndex {
  orders: Order[];
  orderCount: number;
}

export default function Dashboard() {
  const [indices, setIndices] = useState<IndexWithOrders[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [closedOrders, setClosedOrders] = useState<Order[]>([]);
  const [swapOrders, setSwapOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingOrderHash, setCancellingOrderHash] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  
  const { isConnected, indices: blockchainIndices, refreshIndices, isOwner, walletAddress } = useBlockchain();
  const { orders, cancelOrder } = useOrders();
  const router = useRouter();

  // Load all cached orders on page load
  useEffect(() => {
    console.log('🔍 Dashboard useEffect - Connection status:', isConnected);
    console.log('🔍 Dashboard useEffect - Blockchain indices:', blockchainIndices);
    
    if (!isConnected) {
      setIndices([]);
      setAllOrders([]);
      setOpenOrders([]);
      setClosedOrders([]);
      setSwapOrders([]);
      setIsLoading(false);
      return;
    }

    // Convert blockchain indices to IndexWithOrders format
    const indicesWithOrders: IndexWithOrders[] = blockchainIndices.map(index => ({
      ...index,
      orders: [],
      orderCount: 0
    }));

    console.log('🔍 Dashboard - Setting indices:', indicesWithOrders);
    setIndices(indicesWithOrders);
    
    // Load all cached orders immediately on page load
    loadAllOrders();
  }, [isConnected, blockchainIndices]);

  // Auto-clear success/error messages
  useEffect(() => {
    if (cancelSuccess) {
      const timer = setTimeout(() => setCancelSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [cancelSuccess]);

  useEffect(() => {
    if (cancelError) {
      const timer = setTimeout(() => setCancelError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [cancelError]);

  const getOperatorName = (operator: string) => {
    const operatorMap: { [key: string]: string } = {
      'gt': '>',
      'gte': '>=',
      'lt': '<',
      'lte': '<=',
      'eq': '=',
      'neq': '!='
    };
    return operatorMap[operator] || operator;
  };

  const handleCreateIndex = () => {
    router.push('/create-index');
  };

  const handleViewIndex = (index: IndexWithOrders) => {
    router.push(`/index/blockchain_${index.id}`);
  };

  const loadAllOrders = async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      console.log('📋 Loading all cached orders for dashboard...');
      console.log('🔍 Wallet address:', walletAddress);
      console.log('🔍 Connected status:', isConnected);
      
      // Get all cached orders directly from cache
      const allCachedOrders = await blockchainService.getAllCachedOrders();
      console.log('🔍 Raw cached orders from service:', allCachedOrders);
      
      setAllOrders(allCachedOrders);
      
      // Categorize orders into three sections
      const open = allCachedOrders.filter(order => order.status === 'active');
      const closed = allCachedOrders.filter(order => order.status === 'cancelled' || order.status === 'filled');
      // For now, swap orders are empty - this could be expanded later for regular swaps
      const swaps: Order[] = [];
      
      setOpenOrders(open);
      setClosedOrders(closed);
      setSwapOrders(swaps);
      
      console.log(`📋 Loaded ${allCachedOrders.length} total orders: ${open.length} open, ${closed.length} closed, ${swaps.length} swaps`);
      
    } catch (error) {
      console.error("Error loading cached orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderHash: string) => {
    if (!isConnected || !walletAddress) {
      setCancelError("Please connect your wallet first");
      return;
    }

    if (!window.ethereum) {
      setCancelError("MetaMask or compatible wallet required");
      return;
    }

    const confirmed = confirm(`Are you sure you want to cancel order ${orderHash.slice(0, 8)}...${orderHash.slice(-6)}?`);
    if (!confirmed) return;

    setCancellingOrderHash(orderHash);
    setCancelError(null);
    setCancelSuccess(null);

    try {
      console.log('🚫 Cancelling order with user wallet:', orderHash);

      // Use the blockchain service cancelOrder method (which uses wallet)
      const success = await cancelOrder(orderHash);

      if (success) {
        setCancelSuccess(`✅ Order cancelled successfully in cache`);
        console.log('✅ Order cancelled successfully:', orderHash);
        
        // Refresh the orders display using cache
        await loadAllOrders();
        
      } else {
        throw new Error('Failed to cancel order');
      }

    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      setCancelError(`Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCancellingOrderHash(null);
    }
  };

  // Always load the dashboard, but show wallet connection prompt for portfolio features

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <>
            {/* Wallet Connection Prompt */}
            <div className="text-center py-6 mb-8">
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">📊 Index Dashboard</h1>
                  <p className="text-gray-600 mb-4">Browse all available blockchain indices below, or connect your wallet to manage orders and view your portfolio.</p>
                  <WalletConnect compact />
                </CardContent>
              </Card>
            </div>

            {/* Show Index Manager without wallet connection */}
            <div className="mb-8">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    All Blockchain Indices
                  </h2>
                  <IndexManager 
                    showCreateButton={false} 
                    onIndexSelect={(index) => router.push(`/index/blockchain_${index.id}`)}
                  />
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back! 👋
                      </h1>
                      <p className="text-gray-600 mt-1">
                        Manage your conditional orders and track your portfolio
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Connected Wallet</p>
                      <p className="font-mono text-sm text-gray-900">
                        {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
        </div>

            {/* Three-Section Portfolio Layout */}
            <div className="space-y-8">
              
              {/* Page Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Portfolio Overview</h2>
                  <p className="text-gray-600 mt-1">Your conditional orders and trading activity</p>
                </div>
                <Button 
                  onClick={loadAllOrders}
                  variant="outline"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Refresh Orders"
                  )}
                </Button>
              </div>

              {/* Cancel Status Messages */}
              {cancelSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <p className="text-green-800 text-sm">{cancelSuccess}</p>
                  </div>
                </div>
              )}

              {cancelError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-red-800 text-sm">{cancelError}</p>
                  </div>
                </div>
              )}

              {/* Section 1: Open Orders (Conditional) */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-600" />
                        Open Conditional Orders
                      </CardTitle>
                      <CardDescription>Active orders waiting for conditions to be met</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      {openOrders.length} Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : openOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Orders</h3>
                      <p className="text-gray-600 mb-4">Create conditional orders on your indices to start trading</p>
                      <Button onClick={() => router.push('/create-index')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Index
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {openOrders.map((order, idx) => (
                        <div key={idx} className="p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{order.description}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                Index {order.indexId} • {getOperatorName(order.operator)} {String(order.threshold)}
                              </p>
                            </div>
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              {order.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-xs text-blue-600 font-medium">FROM</p>
                              <p className="font-semibold text-blue-900">{order.fromAmount} {order.fromToken}</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs text-purple-600 font-medium">TO</p>
                              <p className="font-semibold text-purple-900">{order.toAmount || order.expectedAmount || 'N/A'} {order.toToken}</p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                            <span>Created: {new Date(order.createdAt).toLocaleDateString()}</span>
                            {(order as any).expiresAt && (
                              <span>Expires: {new Date((order as any).expiresAt).toLocaleDateString()}</span>
                            )}
                          </div>
                          
                          <Button 
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelOrder(order.hash)}
                            disabled={cancellingOrderHash === order.hash}
                            className="w-full"
                          >
                            {cancellingOrderHash === order.hash ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Cancelling...
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-2" />
                                Cancel Order
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 2: Closed Conditional Orders */}
              <Card className="border-l-4 border-l-gray-400">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-gray-600" />
                        Closed Conditional Orders
                      </CardTitle>
                      <CardDescription>Completed, cancelled, or expired conditional orders</CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {closedOrders.length} Closed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {closedOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Closed Orders</h3>
                      <p className="text-gray-600">Your completed orders will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {closedOrders.map((order, idx) => (
                        <div key={idx} className="p-4 border rounded-lg bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{order.description}</h4>
                              <p className="text-sm text-gray-600">
                                Index {order.indexId} • {getOperatorName(order.operator)} {String(order.threshold)}
                              </p>
                            </div>
                            <Badge 
                              variant={order.status === "filled" ? "default" : "secondary"}
                              className={order.status === "filled" ? "bg-green-100 text-green-800" : ""}
                            >
                              {order.status}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>{order.fromAmount} {order.fromToken} → {order.toAmount || (order as any).expectedAmount || 'N/A'} {order.toToken}</span>
                            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                          </div>
                          
                          {order.cancelledAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Cancelled: {new Date(order.cancelledAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 3: Swaps/Intent Orders */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Swap & Intent Orders
                      </CardTitle>
                      <CardDescription>Regular swaps and intent-based trading</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      {swapOrders.length} Swaps
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
                    <p className="text-gray-600">Regular swap orders and intent-based trading will appear here</p>
                  </div>
                </CardContent>
              </Card>
              
            </div>
          </>
        )}
      </main>
    </div>
  );
}