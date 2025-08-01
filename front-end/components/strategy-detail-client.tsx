"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  TrendingUp,
  Zap,
  Target,
  Clock,
  DollarSign,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { SwapInterface } from "@/components/swap-interface";
import { WalletConnect } from "@/components/WalletConnect";
import { useBlockchain } from "@/hooks/useBlockchain";
import { useOrders } from "@/hooks/useOrders";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface StrategyDetailClientProps {
  strategyId: string;
}

// Mock data for the chart
const priceData = [
  { time: "00:00", price: 2850, sentiment: 45 },
  { time: "04:00", price: 2867, sentiment: 52 },
  { time: "08:00", price: 2834, sentiment: 41 },
  { time: "12:00", price: 2891, sentiment: 67 },
  { time: "16:00", price: 2876, sentiment: 59 },
  { time: "20:00", price: 2903, sentiment: 72 },
  { time: "24:00", price: 2919, sentiment: 78 },
];

export function StrategyDetailClient({
  strategyId,
}: StrategyDetailClientProps) {
  const router = useRouter();
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const {
    isConnected,
    walletAddress,
    indices,
    ethBalance,
    connectWallet,
    refreshIndices,
  } = useBlockchain();
  const {
    orders,
    isLoading: ordersLoading,
    error: ordersError,
    refreshOrders,
    cancelOrder,
  } = useOrders();

  // Load blockchain data on mount
  useEffect(() => {
    if (isConnected) {
      refreshIndices();
      refreshOrders();
    }
  }, [isConnected, refreshIndices, refreshOrders]);

  // Get strategy data (enhanced with real blockchain data)
  const strategy = {
    id: strategyId,
    name: "ETH Whale Watch",
    tokenPair: "ETH/USDC",
    trigger: "Alpha Vantage Data",
    status: isConnected ? "active" : "disconnected",
    totalValue: ethBalance ? `${parseFloat(ethBalance).toFixed(4)} ETH` : "$0",
    currentPrice: "$2,919",
    targetPrice: "$3,100",
    orders: indices.length,
    filled: Math.floor(indices.length / 2),
    pnl: "+$2,340",
    icon: "🐋",
    description:
      "Automatically execute swaps when AAPL stock price crosses above $150 using real blockchain indices.",
    createdAt: "2024-01-15",
    lastTriggered:
      indices.length > 0 ? "Active indices detected" : "No indices found",
    swapConfig: {
      mode: "intent" as const,
      preset: "fast" as const,
      walletAddress: walletAddress || "",
      apiKey: process.env.NEXT_PUBLIC_ONEINCH_API_KEY || "",
      rpcUrl: "https://sepolia.base.org",
    },
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{strategy.icon}</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {strategy.name}
            </h1>
            <p className="text-gray-600">{strategy.tokenPair}</p>
          </div>
        </div>
        <Badge className="bg-green-100 text-green-800 ml-auto">
          {strategy.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Price & Sentiment (24h)</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {strategy.currentPrice}
                  </span>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sentiment"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={{ fill: "#34d399", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Strategy Description */}
          <Card>
            <CardHeader>
              <CardTitle>Strategy Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{strategy.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 block">Created</span>
                  <span className="font-semibold">{strategy.createdAt}</span>
                </div>
                <div>
                  <span className="text-gray-600 block">Last Triggered</span>
                  <span className="font-semibold">
                    {strategy.lastTriggered}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Wallet Connection */}
          {!isConnected && <WalletConnect compact={false} />}

          {/* Strategy Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Strategy Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Total Value</span>
                </div>
                <span className="font-semibold">{strategy.totalValue}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">P&L</span>
                </div>
                <span className="font-semibold text-green-600">
                  {strategy.pnl}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Target Price</span>
                </div>
                <span className="font-semibold">{strategy.targetPrice}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Orders</span>
                </div>
                <span className="font-semibold">
                  {strategy.filled}/{strategy.orders}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Trigger Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trigger Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{strategy.trigger}</span>
              </div>
              <p className="text-sm text-gray-600">
                Monitors whale wallets and exchange outflows for transfers
                exceeding 10,000 ETH.
              </p>
              <div className="pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" className="w-full">
                  Edit Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Order History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Order History</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshOrders}
                  disabled={ordersLoading}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${
                      ordersLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ordersError && (
                <div className="text-red-600 text-sm mb-4">
                  Error loading orders: {ordersError}
                </div>
              )}

              {ordersLoading ? (
                <div className="text-center py-4 text-gray-500">
                  Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No orders found for this strategy.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div
                      key={order.hash}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              order.status === "active"
                                ? "default"
                                : order.status === "filled"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {order.status}
                          </Badge>
                          <span className="text-sm font-medium">
                            {order.description || "Order"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Hash: {order.hash.slice(0, 10)}...
                          {order.hash.slice(-8)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Condition: Index {order.indexId}{" "}
                          {order.operator === 0
                            ? ">"
                            : order.operator === 1
                            ? "<"
                            : order.operator === 2
                            ? ">="
                            : order.operator === 3
                            ? "<="
                            : "=="}{" "}
                          {order.threshold}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {order.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelOrder(order.hash)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {orders.length > 5 && (
                    <div className="text-center py-2">
                      <span className="text-sm text-gray-500">
                        Showing 5 of {orders.length} orders
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isConnected ? (
                <Dialog
                  open={isSwapDialogOpen}
                  onOpenChange={setIsSwapDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full gradient-primary text-white">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Manual Trigger
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        Manual Trigger Swap - {strategy.name}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                      <SwapInterface
                        walletAddress={strategy.swapConfig.walletAddress}
                        apiKey={strategy.swapConfig.apiKey}
                        rpcUrl={strategy.swapConfig.rpcUrl}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button
                  onClick={connectWallet}
                  className="w-full"
                  variant="outline"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet to Trade
                </Button>
              )}
              <Button variant="outline" className="w-full">
                Pause Strategy
              </Button>
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={async () => {
                  const activeOrders = orders.filter(
                    (order) => order.status === "active"
                  );
                  if (activeOrders.length === 0) {
                    alert("No active orders to cancel");
                    return;
                  }

                  if (confirm(`Cancel ${activeOrders.length} active orders?`)) {
                    for (const order of activeOrders) {
                      try {
                        await cancelOrder(order.hash);
                      } catch (error) {
                        console.error(
                          `Failed to cancel order ${order.hash}:`,
                          error
                        );
                      }
                    }
                    alert("Cancel requests sent for all active orders");
                  }
                }}
                disabled={ordersLoading}
              >
                Cancel All Orders (
                {orders.filter((order) => order.status === "active").length})
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
