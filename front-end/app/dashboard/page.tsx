"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { WalletConnect } from "@/components/WalletConnect";
import { 
  Plus, 
  TrendingUp, 
  BarChart3, 
  Clock,
  Activity,
  Eye,
  AlertCircle,
  ArrowRight
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");
  
  const { isConnected } = useBlockchain();
  const { orders } = useOrders();
  const router = useRouter();

  // Load indices and their orders
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      if (!isConnected) {
        setIndices([]);
        setAllOrders([]);
        return;
      }

      const allIndices = await blockchainService.getAllIndices();
      
      // For each index, load its orders
      const indicesWithOrders: IndexWithOrders[] = await Promise.all(
        allIndices.map(async (index) => {
          const orders = await blockchainService.getOrdersByIndex(index.id);
          return {
            ...index,
            orders,
            orderCount: orders.length
          };
        })
      );

      setIndices(indicesWithOrders);
      
      // Collect all orders
      const allOrdersFlat = indicesWithOrders.flatMap(index => index.orders);
      setAllOrders(allOrdersFlat);
      
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isConnected]);

  const handleCreateIndex = () => {
    router.push("/create-index");
  };

  const handleViewIndex = (index: IndexWithOrders) => {
    router.push(`/create-index?selectedIndex=${index.id}`);
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

  const stats = {
    totalIndices: indices.length,
    activeIndices: indices.filter(i => i.active).length,
    totalOrders: allOrders.length,
    activeOrders: allOrders.filter(o => o.status === "active").length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio Dashboard</h1>
          <p className="text-gray-600">
            Manage your custom indices and conditional trading orders
          </p>
        </div>

        {/* Wallet Connection */}
        {!isConnected && (
          <Card className="mb-8">
            <CardContent className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-600 mb-6">Connect your wallet to view and manage your indices and orders</p>
              <WalletConnect compact={false} />
            </CardContent>
          </Card>
        )}

        {isConnected && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Indices</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalIndices}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeIndices} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeOrders} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">
                    No data yet
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">
                    Connect trading accounts
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="indices">My Indices</TabsTrigger>
                <TabsTrigger value="orders">My Orders</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Indices */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>Recent Indices</CardTitle>
                          <CardDescription>Your latest custom indices</CardDescription>
                        </div>
                        <Button 
                          onClick={handleCreateIndex}
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Index
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse">
                              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          ))}
                        </div>
                      ) : indices.length === 0 ? (
                        <div className="text-center py-8">
                          <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 text-sm">No indices yet</p>
                          <Button 
                            onClick={handleCreateIndex}
                            size="sm"
                            className="mt-2"
                          >
                            Create your first index
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {indices.slice(0, 3).map((index) => (
                            <div 
                              key={index.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleViewIndex(index)}
                            >
                              <div>
                                <h4 className="font-medium text-sm">{index.name || `Index ${index.id}`}</h4>
                                <p className="text-xs text-gray-600">{index.description}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {index.orderCount} orders
                                </Badge>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                          ))}
                          {indices.length > 3 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSelectedTab("indices")}
                              className="w-full"
                            >
                              View all {indices.length} indices
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Orders */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Orders</CardTitle>
                      <CardDescription>Your latest trading orders</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse">
                              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          ))}
                        </div>
                      ) : allOrders.length === 0 ? (
                        <div className="text-center py-8">
                          <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 text-sm">No orders yet</p>
                          <p className="text-xs text-gray-500">Create an index to start trading</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {allOrders.slice(0, 3).map((order, idx) => (
                            <div key={idx} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-medium text-sm">{order.description}</h4>
                                <Badge 
                                  variant={order.status === "active" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {order.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600">
                                Index {order.indexId} {getOperatorName(order.operator)} {order.threshold}
                              </p>
                            </div>
                          ))}
                          {allOrders.length > 3 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSelectedTab("orders")}
                              className="w-full"
                            >
                              View all {allOrders.length} orders
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Indices Tab */}
              <TabsContent value="indices" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">My Indices</h2>
                  <div className="space-x-2">
                    <Button 
                      onClick={loadData}
                      variant="outline"
                      disabled={isLoading}
                    >
                      {isLoading ? "Loading..." : "Refresh"}
                    </Button>
                    <Button onClick={handleCreateIndex}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Index
                    </Button>
                  </div>
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
                ) : indices.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Indices Yet</h3>
                      <p className="text-gray-600 mb-4">Create your first custom index to start tracking data and placing orders</p>
                      <Button onClick={handleCreateIndex}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Index
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {indices.map((index) => (
                      <Card 
                        key={index.id} 
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => handleViewIndex(index)}
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
                                <TrendingUp className="w-4 h-4 text-gray-400" />
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">My Orders</h2>
                  <Button 
                    onClick={loadData}
                    variant="outline"
                    disabled={isLoading}
                  >
                    {isLoading ? "Loading..." : "Refresh"}
                  </Button>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : allOrders.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Yet</h3>
                      <p className="text-gray-600 mb-4">Create an index and add conditional orders to start trading</p>
                      <Button onClick={handleCreateIndex}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Index
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {allOrders.map((order, idx) => (
                      <Card key={idx}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-semibold text-lg">{order.description}</h4>
                              <p className="text-gray-600">
                                When Index {order.indexId} {getOperatorName(order.operator)} {order.threshold}
                              </p>
                            </div>
                            <Badge 
                              variant={order.status === "active" ? "default" : "secondary"}
                            >
                              {order.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Index: </span>
                              <span className="font-medium">#{order.indexId}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Trade: </span>
                              <span className="font-medium">{order.fromAmount} → {order.toAmount}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Created: </span>
                              <span className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Expires: </span>
                              <span className="font-medium">
                                {order.expiry ? new Date(order.expiry * 1000).toLocaleDateString() : "Never"}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}