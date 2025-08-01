"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  TrendingUp, 
  BarChart3, 
  Clock,
  DollarSign,
  Activity,
  Eye,
  AlertCircle
} from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { useOrders, OPERATORS } from "@/hooks/useOrders";
import { blockchainService, CustomIndex, Order, CONTRACTS } from "@/lib/blockchain-service";

interface IndexWithOrders extends CustomIndex {
  orders: Order[];
  orderCount: number;
}

export default function CreateIndex() {
  const [selectedTab, setSelectedTab] = useState("browse");
  const [indices, setIndices] = useState<IndexWithOrders[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<IndexWithOrders | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  

  
  // New Index Form
  const [newIndexForm, setNewIndexForm] = useState({
    name: "",
    description: "",
    initialValue: ""
  });

  // New Order Form
  const [newOrderForm, setNewOrderForm] = useState({
    description: "",
    fromToken: CONTRACTS.USDC,
    toToken: CONTRACTS.WETH,
    fromAmount: "",
    toAmount: "",
      operator: OPERATORS.GT,
      threshold: "",
    expiry: "24" // hours
  });

  const { isConnected } = useBlockchain();
  const { createOrder, isLoading: isCreatingOrder } = useOrders();

  // Load indices and their orders
  useEffect(() => {
    loadIndicesWithOrders();
  }, []);
  
  // Handle selected index from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedIndexId = urlParams.get('selectedIndex');
    if (selectedIndexId && indices.length > 0) {
      const index = indices.find(i => i.id.toString() === selectedIndexId);
      if (index) {
        setSelectedIndex(index);
        setSelectedTab("manage");
      }
    }
  }, [indices]);

  const loadIndicesWithOrders = async () => {
    try {
      setIsLoading(true);
      const allIndices = await blockchainService.getAllIndices();
      
      // Convert to IndexWithOrders without loading orders automatically
      const indicesWithOrders: IndexWithOrders[] = allIndices.map(index => ({
        ...index,
        orders: [],
        orderCount: 0 // Will be loaded on-demand if needed
      }));

      setIndices(indicesWithOrders);
    } catch (error) {
      console.error("Error loading indices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateIndex = async () => {
    try {
      setIsCreateLoading(true);
      
      const indexId = await blockchainService.createIndex(
        newIndexForm.name,
        newIndexForm.description,
        parseInt(newIndexForm.initialValue)
      );

      console.log("✅ Index created with ID:", indexId);
      
      // Reset form
      setNewIndexForm({ name: "", description: "", initialValue: "" });
      
      // Reload indices
      await loadIndicesWithOrders();
      
      // Switch to browse tab
      setSelectedTab("browse");
      
    } catch (error) {
      console.error("❌ Error creating index:", error);
      alert("Failed to create index: " + (error as Error).message);
    } finally {
      setIsCreateLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedIndex) return;

    try {
      await createOrder({
        indexId: selectedIndex.id,
        operator: newOrderForm.operator,
        threshold: parseInt(newOrderForm.threshold),
        description: newOrderForm.description,
        fromToken: newOrderForm.fromToken,
        toToken: newOrderForm.toToken,
        fromAmount: newOrderForm.fromAmount,
        toAmount: newOrderForm.toAmount,
        expiry: parseInt(newOrderForm.expiry) * 3600 // Convert hours to seconds
      });

      // Reset form
      setNewOrderForm({
        description: "",
        fromToken: "",
        toToken: "",
        fromAmount: "",
        toAmount: "",
        operator: OPERATORS.GT,
        threshold: "",
        expiry: "24"
      });

      // Reload indices to refresh order counts
      await loadIndicesWithOrders();
      
    } catch (error) {
      console.error("❌ Error creating order:", error);
      alert("Failed to create order: " + (error as Error).message);
    }
  };

  const fillDemoIndexData = () => {
    setNewIndexForm({
      name: "APPLE_STOCK",
      description: "Apple Inc. stock price in USD cents",
      initialValue: "17500" // $175.00
    });
    alert("🚀 Demo index data loaded! Creates Apple Stock index at $175.00");
  };

  const fillDemoOrderData = () => {
    setNewOrderForm({
      description: "Buy ETH when Apple > $180",
      fromToken: CONTRACTS.USDC,
      toToken: CONTRACTS.WETH,
      fromAmount: "0.1", // 0.1 USDC - very small for testing
      toAmount: "0.00003", // Proportionally small ETH amount
      operator: OPERATORS.GT,
      threshold: "18000", // $180.00 * 100
      expiry: "2" // 2 hours
    });
    alert("🚀 Demo order data loaded! Buy ETH when Apple > $180 using 0.1 USDC");
  };

  const getOperatorName = (operator: number) => {
    switch (operator) {
      case OPERATORS.GT: return ">";
      case OPERATORS.LT: return "<";
      case OPERATORS.GTE: return "≥";
      case OPERATORS.LTE: return "≤";
      case OPERATORS.EQ: return "=";
      default: return "?";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Index Management</h1>
          <p className="text-gray-600">Create custom indices and manage their associated trading orders</p>
        </div>



        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse">Browse Indices</TabsTrigger>
            <TabsTrigger value="create">Create Index</TabsTrigger>
            <TabsTrigger value="manage">Manage Orders</TabsTrigger>
          </TabsList>

          {/* Browse Indices Tab */}
          <TabsContent value="browse" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Available Indices</h2>
              <Button 
                onClick={loadIndicesWithOrders}
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Refresh"}
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {indices.map((index) => (
                  <Card 
                    key={index.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedIndex(index);
                      setSelectedTab("manage");
                    }}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{index.name || `Index ${index.id}`}</CardTitle>
                          <CardDescription className="mt-1">
                            {index.description || "Custom index"}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">#{index.id}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Current Value</span>
                          <span className="font-semibold text-lg">{index.value.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Updated</span>
                          </div>
                          <span>{new Date(index.timestamp * 1000).toLocaleTimeString()}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1">
                            <BarChart3 className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Orders</span>
                          </div>
                          <Badge variant="outline">{index.orderCount}</Badge>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1">
                            <Activity className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Status</span>
                          </div>
                          <Badge variant={index.active ? "default" : "destructive"}>
                            {index.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>

            <Button
                        className="w-full mt-4" 
              variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(index);
                          setSelectedTab("manage");
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View & Manage
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoading && indices.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Indices Found</h3>
                  <p className="text-gray-600 mb-4">Get started by creating your first custom index</p>
                  <Button onClick={() => setSelectedTab("create")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Index
            </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Create Index Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="w-5 h-5" />
                  <span>Create New Index</span>
                </CardTitle>
                <CardDescription>
                  Create a custom index to track specific metrics or data sources
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isConnected && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="text-yellow-800 font-medium">Wallet Not Connected</span>
                    </div>
                    <p className="text-yellow-700 text-sm mt-1">
                      Please connect your wallet to create a custom index
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Index Name
                    </label>
                    <Input
                      placeholder="e.g., APPLE_STOCK, BTC_PRICE, CUSTOM_METRIC"
                      value={newIndexForm.name}
                      onChange={(e) => setNewIndexForm({...newIndexForm, name: e.target.value})}
                      disabled={!isConnected}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <Input
                      placeholder="e.g., Apple Inc. stock price in USD cents"
                      value={newIndexForm.description}
                      onChange={(e) => setNewIndexForm({...newIndexForm, description: e.target.value})}
                      disabled={!isConnected}
                    />
                  </div>

            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Initial Value
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 17500 (for $175.00)"
                      value={newIndexForm.initialValue}
                      onChange={(e) => setNewIndexForm({...newIndexForm, initialValue: e.target.value})}
                      disabled={!isConnected}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Set the starting value for your index (use appropriate scaling, e.g., cents for prices)
              </p>
            </div>
          </div>
          
                <div className="space-y-3">
                  <div className="flex space-x-3">
            <Button
                      onClick={handleCreateIndex}
                      disabled={!isConnected || isCreateLoading || !newIndexForm.name || !newIndexForm.description || !newIndexForm.initialValue}
                      className="flex-1"
                    >
                      {isCreateLoading ? (
                        <>Creating Index...</>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Index
                        </>
                      )}
            </Button>
            <Button
                      onClick={fillDemoIndexData}
                      variant="outline"
                      disabled={!isConnected}
                    >
                      Fill Demo
            </Button>
          </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Orders Tab */}
          <TabsContent value="manage" className="space-y-6">
            {selectedIndex ? (
              <>
                {/* Index Info Header */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{selectedIndex.name || `Index ${selectedIndex.id}`}</CardTitle>
                        <CardDescription className="mt-1">
                          {selectedIndex.description || "Custom index"}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-lg px-3 py-1">#{selectedIndex.id}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{selectedIndex.value.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Current Value</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{selectedIndex.orderCount}</div>
                        <div className="text-sm text-gray-600">Active Orders</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {new Date(selectedIndex.timestamp * 1000).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600">Last Updated</div>
                      </div>
                      <div className="text-center">
                        <Badge variant={selectedIndex.active ? "default" : "destructive"} className="text-lg px-3 py-1">
                          {selectedIndex.active ? "Active" : "Inactive"}
                        </Badge>
                        <div className="text-sm text-gray-600 mt-1">Status</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Orders List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Orders for this Index</CardTitle>
                    <CardDescription>
                      All trading orders associated with {selectedIndex.name || `Index ${selectedIndex.id}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedIndex.orders.length === 0 ? (
                      <div className="text-center py-8">
                        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Yet</h3>
                        <p className="text-gray-600">Create the first trading order for this index</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedIndex.orders.map((order, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold">{order.description}</h4>
                                <p className="text-sm text-gray-600">
                                  When index {getOperatorName(order.operator)} {order.threshold}
                                </p>
                              </div>
                              <Badge variant="outline">{order.status}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Trade: </span>
                                <span>{order.fromAmount} → {order.toAmount}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Expires: </span>
                                <span>{new Date(order.expiry * 1000).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Create New Order */}
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Order</CardTitle>
                    <CardDescription>
                      Add a new trading order for {selectedIndex.name || `Index ${selectedIndex.id}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isConnected && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          <span className="text-yellow-800 font-medium">Wallet Not Connected</span>
                        </div>
                        <p className="text-yellow-700 text-sm mt-1">
                          Please connect your wallet to create orders
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Order Description
                        </label>
                        <Input
                          placeholder="e.g., Buy ETH when Apple > $180"
                          value={newOrderForm.description}
                          onChange={(e) => setNewOrderForm({...newOrderForm, description: e.target.value})}
                          disabled={!isConnected}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Condition Operator
                        </label>
                        <select 
                          className="w-full p-2 border border-gray-300 rounded-md"
                          value={newOrderForm.operator}
                          onChange={(e) => setNewOrderForm({...newOrderForm, operator: parseInt(e.target.value)})}
                          disabled={!isConnected}
                        >
                          <option value={OPERATORS.GT}>Greater than (&gt;)</option>
                          <option value={OPERATORS.LT}>Less than (&lt;)</option>
                          <option value={OPERATORS.GTE}>Greater than or equal (≥)</option>
                          <option value={OPERATORS.LTE}>Less than or equal (≤)</option>
                          <option value={OPERATORS.EQ}>Equal to (=)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Condition Threshold
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g., 18000 (for $180.00)"
                          value={newOrderForm.threshold}
                          onChange={(e) => setNewOrderForm({...newOrderForm, threshold: e.target.value})}
                          disabled={!isConnected}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          From Token
                        </label>
                        <select 
                          className="w-full p-2 border border-gray-300 rounded-md"
                          value={newOrderForm.fromToken}
                          onChange={(e) => setNewOrderForm({...newOrderForm, fromToken: e.target.value})}
                          disabled={!isConnected}
                        >
                          <option value={CONTRACTS.USDC}>USDC ({CONTRACTS.USDC.slice(0,6)}...)</option>
                          <option value={CONTRACTS.TestUSDC}>TestUSDC ({CONTRACTS.TestUSDC.slice(0,6)}...)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          To Token
                        </label>
                        <select 
                          className="w-full p-2 border border-gray-300 rounded-md"
                          value={newOrderForm.toToken}
                          onChange={(e) => setNewOrderForm({...newOrderForm, toToken: e.target.value})}
                          disabled={!isConnected}
                        >
                          <option value={CONTRACTS.WETH}>WETH ({CONTRACTS.WETH.slice(0,6)}...)</option>
                        </select>
        </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          From Amount
                        </label>
                        <Input
                          placeholder="e.g., 0.1"
                          value={newOrderForm.fromAmount}
                          onChange={(e) => setNewOrderForm({...newOrderForm, fromAmount: e.target.value})}
                          disabled={!isConnected}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          To Amount
                        </label>
                        <Input
                          placeholder="e.g., 0.00003"
                          value={newOrderForm.toAmount}
                          onChange={(e) => setNewOrderForm({...newOrderForm, toAmount: e.target.value})}
                          disabled={!isConnected}
                        />
                      </div>
        </div>

                    <div className="flex space-x-3">
                      <Button 
                        onClick={handleCreateOrder}
                        disabled={!isConnected || isCreatingOrder || !newOrderForm.description || !newOrderForm.threshold}
                        className="flex-1"
                      >
                        {isCreatingOrder ? (
                          <>Creating Order...</>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Order
                          </>
                        )}
                      </Button>
          <Button
                        onClick={fillDemoOrderData}
            variant="outline"
                        disabled={!isConnected}
          >
                        Fill Demo
          </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select an Index</h3>
                  <p className="text-gray-600 mb-4">Choose an index from the Browse tab to view and manage its orders</p>
                  <Button onClick={() => setSelectedTab("browse")}>
                    <Eye className="w-4 h-4 mr-2" />
                    Browse Indices
            </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}