"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, Clock, Target, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

const strategies = [
  {
    id: 1,
    name: "ETH Whale Watch",
    tokenPair: "ETH/USDC",
    trigger: "Large Transfer",
    status: "active",
    totalValue: "$50K",
    orders: 3,
    filled: 1,
    pnl: "+$2,340",
    icon: "🐋",
  },
  {
    id: 2,
    name: "BTC News Surge",
    tokenPair: "WBTC/DAI",
    trigger: "Twitter Keywords",
    status: "pending",
    totalValue: "$25K",
    orders: 2,
    filled: 0,
    pnl: "+$0",
    icon: "📰",
  },
  {
    id: 3,
    name: "LINK Oracle Update",
    tokenPair: "LINK/USDT",
    trigger: "Price Threshold",
    status: "filled",
    totalValue: "$15K",
    orders: 1,
    filled: 1,
    pnl: "+$1,250",
    icon: "🔗",
  },
];

export function StrategiesGrid() {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "filled":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleCreateStrategy = () => {
    router.push("/create-strategy");
  };

  const handleViewStrategy = (id: number) => {
    router.push(`/strategy/${id}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {strategies.map((strategy) => (
        <Card
          key={strategy.id}
          className="bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 hover:border-blue-300"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{strategy.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {strategy.name}
                  </h3>
                  <p className="text-sm text-gray-600">{strategy.tokenPair}</p>
                </div>
              </div>
              <Badge className={getStatusColor(strategy.status)}>
                {strategy.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Trigger</span>
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3 text-blue-500" />
                <span className="font-medium">{strategy.trigger}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 block">Total Value</span>
                <span className="font-semibold">{strategy.totalValue}</span>
              </div>
              <div>
                <span className="text-gray-600 block">P&L</span>
                <span
                  className={`font-semibold ${
                    strategy.pnl.startsWith("+")
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {strategy.pnl}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Target className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">
                    {strategy.orders} orders
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">
                    {strategy.filled} filled
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleViewStrategy(strategy.id)}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Create New Strategy Card */}
      <Card
        className="bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-all duration-200 cursor-pointer"
        onClick={handleCreateStrategy}
      >
        <CardContent className="flex flex-col items-center justify-center h-full py-12">
          <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">
            Create New Strategy
          </h3>
          <p className="text-sm text-gray-600 text-center mb-4">
            Set up limit orders triggered by real-world events
          </p>
          <Button
            className="gradient-primary text-white hover:opacity-90"
            onClick={handleCreateStrategy}
          >
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
