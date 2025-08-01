"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Twitter,
  Send,
  TrendingUp,
  Webhook,
  Zap,
  Target,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { TOKENS, TRIGGER_TYPES } from "@/lib/constants";
import { useBlockchain } from "@/hooks/useBlockchain";
import { useOrders, OPERATORS } from "@/hooks/useOrders";
import { TokenSelector } from "@/components/TokenSelector";
import { WalletConnect } from "@/components/WalletConnect";

const steps = [
  { id: "basics", title: "Strategy Basics", icon: Target },
  { id: "trigger", title: "Event Trigger", icon: Zap },
  { id: "order", title: "Order Parameters", icon: DollarSign },
  { id: "review", title: "Review & Sign", icon: CheckCircle },
];

export default function CreateStrategy() {
  const [currentStep, setCurrentStep] = useState(0);
  const { isConnected, indices, connectWallet, refreshIndices } = useBlockchain();
  const { createOrder, isLoading: isCreatingOrder, error: orderError } = useOrders();
  const [strategyData, setStrategyData] = useState({
    name: "",
    description: "",
    tokenIn: "",
    tokenOut: "",
    triggerType: "",
    triggerParams: {
      // Alpha Vantage specific
      dataType: "",
      symbol: "",
      indicator: "",
      threshold: "",
      condition: "",
      // Other trigger types
      keywords: "",
      amount: "",
      webhookUrl: "",
      direction: "",
    },
    orderAmount: "",
    targetPrice: "",
    slippage: "1",
    expiry: "24",
    // 1inch swap configuration
    swapConfig: {
      mode: "classic", // "classic" or "intent"
      preset: "fast", // for intent mode: "fast", "fair", "auction"
      walletAddress: "",
      apiKey: "",
      rpcUrl: "https://sepolia.base.org",
    },
    // Order condition parameters
    orderCondition: {
      indexId: "",
      operator: OPERATORS.GT, // Default to greater than
      threshold: "",
      description: "",
    },
  });

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateStrategyData = (field: string, value: any) => {
    setStrategyData((prev) => ({ ...prev, [field]: value }));
  };

  const updateTriggerParam = (param: string, value: any) => {
    setStrategyData((prev) => ({
      ...prev,
      triggerParams: { ...prev.triggerParams, [param]: value },
    }));
  };

  const updateSwapConfig = (param: string, value: any) => {
    setStrategyData((prev) => ({
      ...prev,
      swapConfig: { ...prev.swapConfig, [param]: value },
    }));
  };

  const updateOrderCondition = (param: string, value: any) => {
    setStrategyData((prev) => ({
      ...prev,
      orderCondition: { ...prev.orderCondition, [param]: value },
    }));
  };

  const getOperatorName = (operator: number): string => {
    const names = ['>', '<', '>=', '<=', '=='];
    return names[operator] || '?';
  };

  const handleCreateStrategy = async () => {
    try {
      if (!isConnected) {
        alert("Please connect your wallet first");
        return;
      }

      if (!strategyData.orderCondition.indexId || !strategyData.orderCondition.threshold) {
        alert("Please configure the index condition");
        return;
      }

      if (!strategyData.orderAmount) {
        alert("Please enter an order amount");
        return;
      }

      // Create the order with blockchain integration
      const orderParams = {
        indexId: parseInt(strategyData.orderCondition.indexId),
        operator: strategyData.orderCondition.operator,
        threshold: parseInt(strategyData.orderCondition.threshold),
        description: strategyData.orderCondition.description || `${strategyData.name} - ${getOperatorName(strategyData.orderCondition.operator)} ${strategyData.orderCondition.threshold}`,
        fromToken: strategyData.tokenIn || "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Default to USDC
        toToken: strategyData.tokenOut || "0x4200000000000000000000000000000000000006", // Default to WETH
        fromAmount: strategyData.orderAmount,
        toAmount: strategyData.targetPrice || "0.1", // Default target
        expiry: Math.floor(Date.now() / 1000) + (parseInt(strategyData.expiry) * 3600), // Convert hours to seconds
      };

      console.log("Creating order with params:", orderParams);
      
      const order = await createOrder(orderParams);
      
      if (order) {
        alert(`Strategy created successfully! Order Hash: ${order.hash}`);
        // Could redirect to strategy view page here
        console.log("Order created:", order);
      }
    } catch (error) {
      console.error("Error creating strategy:", error);
      alert(`Failed to create strategy: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const renderTriggerIcon = (type: string): JSX.Element => {
    switch (type) {
      case "alphavantage":
        return <BarChart3 className="w-4 h-4" />;
      case "twitter":
        return <Twitter className="w-4 h-4" />;
      case "transfer":
        return <Send className="w-4 h-4" />;
      case "price":
        return <TrendingUp className="w-4 h-4" />;
      case "webhook":
        return <Webhook className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Create New Strategy
            </h1>
            <p className="text-gray-600">
              Set up limit orders triggered by real-world events
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                        isActive
                          ? "bg-blue-50 border border-blue-200"
                          : isCompleted
                          ? "bg-green-50 border border-green-200"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isActive
                            ? "bg-blue-500 text-white"
                            : isCompleted
                            ? "bg-green-500 text-white"
                            : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p
                          className={`font-medium ${
                            isActive
                              ? "text-blue-900"
                              : isCompleted
                              ? "text-green-900"
                              : "text-gray-600"
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          Step {index + 1}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="bg-white">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <StepIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {currentStepData.title}
                    </CardTitle>
                    <p className="text-gray-600">
                      Step {currentStep + 1} of {steps.length}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Step 1: Strategy Basics */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="strategy-name">Strategy Name</Label>
                        <Input
                          id="strategy-name"
                          placeholder="e.g., ETH Whale Watch"
                          value={strategyData.name}
                          onChange={(e) =>
                            updateStrategyData("name", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Strategy Icon</Label>
                        <div className="flex space-x-2">
                          {["🐋", "📰", "🔗", "🚀", "⚡", "🎯"].map((emoji) => (
                            <Button
                              key={emoji}
                              variant="outline"
                              size="sm"
                              className="text-lg"
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your strategy and when it should trigger..."
                        value={strategyData.description}
                        onChange={(e) =>
                          updateStrategyData("description", e.target.value)
                        }
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Token to Sell</Label>
                        <Select
                          value={strategyData.tokenIn}
                          onValueChange={(value) =>
                            updateStrategyData("tokenIn", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select token to sell" />
                          </SelectTrigger>
                          <SelectContent>
                            {TOKENS.map((token) => (
                              <SelectItem
                                key={token.address}
                                value={token.address}
                              >
                                <div className="flex items-center space-x-2">
                                  <span>{token.symbol}</span>
                                  <span className="text-gray-500 text-sm">
                                    {token.name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Token to Buy</Label>
                        <Select
                          value={strategyData.tokenOut}
                          onValueChange={(value) =>
                            updateStrategyData("tokenOut", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select token to buy" />
                          </SelectTrigger>
                          <SelectContent>
                            {TOKENS.map((token) => (
                              <SelectItem
                                key={token.address}
                                value={token.address}
                              >
                                <div className="flex items-center space-x-2">
                                  <span>{token.symbol}</span>
                                  <span className="text-gray-500 text-sm">
                                    {token.name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Event Trigger */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-base font-medium mb-4 block">
                        Choose Trigger Type
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(TRIGGER_TYPES).map(([key, trigger]) => (
                          <Card
                            key={key}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              strategyData.triggerType === key
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                            onClick={() =>
                              updateStrategyData("triggerType", key)
                            }
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  {renderTriggerIcon(key)}
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900">
                                    {trigger.name}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {trigger.description}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Trigger-specific parameters */}
                    {strategyData.triggerType && (
                      <Card className="bg-gray-50">
                        <CardContent className="p-4">
                          <h4 className="font-medium text-gray-900 mb-3">
                            Configure Trigger
                          </h4>

                          {strategyData.triggerType === "twitter" && (
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="keywords">
                                  Keywords to Monitor
                                </Label>
                                <Input
                                  id="keywords"
                                  placeholder="e.g., whale, ethereum, $ETH"
                                  className="mt-1"
                                />
                              </div>
                              <p className="text-sm text-gray-600">
                                Separate multiple keywords with commas. Strategy
                                triggers when any keyword is mentioned.
                              </p>
                            </div>
                          )}

                          {strategyData.triggerType === "transfer" && (
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="amount">
                                  Minimum Transfer Amount
                                </Label>
                                <Input
                                  id="amount"
                                  placeholder="e.g., 10000"
                                  className="mt-1"
                                />
                              </div>
                              <p className="text-sm text-gray-600">
                                Strategy triggers when a transfer of this amount
                                or more is detected.
                              </p>
                            </div>
                          )}

                          {strategyData.triggerType === "price" && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="threshold">
                                    Price Threshold
                                  </Label>
                                  <Input
                                    id="threshold"
                                    placeholder="e.g., 3000"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="direction">Direction</Label>
                                  <Select>
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select direction" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="above">
                                        Above threshold
                                      </SelectItem>
                                      <SelectItem value="below">
                                        Below threshold
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          )}

                          {strategyData.triggerType === "webhook" && (
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="webhook-url">Webhook URL</Label>
                                <Input
                                  id="webhook-url"
                                  placeholder="https://your-service.com/webhook"
                                  className="mt-1"
                                />
                              </div>
                              <p className="text-sm text-gray-600">
                                Your service should POST to this URL when the
                                event occurs.
                              </p>
                            </div>
                          )}

                          {strategyData.triggerType === "alphavantage" && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="av-data-type">
                                    Data Type
                                  </Label>
                                  <Select
                                    value={strategyData.triggerParams.dataType}
                                    onValueChange={(value) =>
                                      updateTriggerParam("dataType", value)
                                    }
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select data type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="stocks">
                                        Stock Price
                                      </SelectItem>
                                      <SelectItem value="technical">
                                        Technical Indicator
                                      </SelectItem>
                                      <SelectItem value="fundamental">
                                        Company Fundamentals
                                      </SelectItem>
                                      <SelectItem value="forex">
                                        Forex Exchange
                                      </SelectItem>
                                      <SelectItem value="crypto">
                                        Cryptocurrency
                                      </SelectItem>
                                      <SelectItem value="news">
                                        News Sentiment
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="av-symbol">Symbol</Label>
                                  <Input
                                    id="av-symbol"
                                    placeholder="e.g., AAPL, TSLA, BTC"
                                    className="mt-1"
                                    value={strategyData.triggerParams.symbol}
                                    onChange={(e) =>
                                      updateTriggerParam(
                                        "symbol",
                                        e.target.value.toUpperCase()
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="av-indicator">
                                    Indicator/Metric
                                  </Label>
                                  <Select
                                    value={strategyData.triggerParams.indicator}
                                    onValueChange={(value) =>
                                      updateTriggerParam("indicator", value)
                                    }
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select indicator" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="price">
                                        Current Price
                                      </SelectItem>
                                      <SelectItem value="sma">
                                        Simple Moving Average
                                      </SelectItem>
                                      <SelectItem value="ema">
                                        Exponential Moving Average
                                      </SelectItem>
                                      <SelectItem value="rsi">RSI</SelectItem>
                                      <SelectItem value="macd">MACD</SelectItem>
                                      <SelectItem value="volume">
                                        Trading Volume
                                      </SelectItem>
                                      <SelectItem value="sentiment">
                                        News Sentiment Score
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="av-threshold">
                                    Threshold Value
                                  </Label>
                                  <Input
                                    id="av-threshold"
                                    placeholder="e.g., 150, 0.7, 70"
                                    className="mt-1"
                                    value={strategyData.triggerParams.threshold}
                                    onChange={(e) =>
                                      updateTriggerParam(
                                        "threshold",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="av-condition">
                                  Trigger Condition
                                </Label>
                                <Select
                                  value={strategyData.triggerParams.condition}
                                  onValueChange={(value) =>
                                    updateTriggerParam("condition", value)
                                  }
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select condition" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="above">
                                      Above threshold
                                    </SelectItem>
                                    <SelectItem value="below">
                                      Below threshold
                                    </SelectItem>
                                    <SelectItem value="crosses-above">
                                      Crosses above threshold
                                    </SelectItem>
                                    <SelectItem value="crosses-below">
                                      Crosses below threshold
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm text-blue-700">
                                  <strong>Example:</strong> Trigger when AAPL
                                  stock price crosses above $150, or when RSI
                                  for TSLA goes below 30 (oversold condition).
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Step 3: Order Parameters */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="order-amount">Order Amount</Label>
                        <Input
                          id="order-amount"
                          placeholder="e.g., 1.5"
                          value={strategyData.orderAmount}
                          onChange={(e) =>
                            updateStrategyData("orderAmount", e.target.value)
                          }
                        />
                        <p className="text-sm text-gray-500">
                          Amount of tokens to sell
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="target-price">Target Price</Label>
                        <Input
                          id="target-price"
                          placeholder="e.g., 3100"
                          value={strategyData.targetPrice}
                          onChange={(e) =>
                            updateStrategyData("targetPrice", e.target.value)
                          }
                        />
                        <p className="text-sm text-gray-500">
                          Price per token you want to receive
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="slippage">Slippage Tolerance (%)</Label>
                        <Select
                          value={strategyData.slippage}
                          onValueChange={(value) =>
                            updateStrategyData("slippage", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.5">0.5%</SelectItem>
                            <SelectItem value="1">1%</SelectItem>
                            <SelectItem value="2">2%</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expiry">Order Expiry</Label>
                        <Select
                          value={strategyData.expiry}
                          onValueChange={(value) =>
                            updateStrategyData("expiry", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 hour</SelectItem>
                            <SelectItem value="24">24 hours</SelectItem>
                            <SelectItem value="168">1 week</SelectItem>
                            <SelectItem value="720">1 month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 1inch Swap Configuration */}
                    <Card className="bg-gray-50 border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          1inch Swap Configuration
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="swap-mode">Swap Mode</Label>
                            <Select
                              value={strategyData.swapConfig.mode}
                              onValueChange={(value) =>
                                updateSwapConfig("mode", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="classic">
                                  Classic Swap
                                </SelectItem>
                                <SelectItem value="intent">
                                  Intent Swap (Gasless)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {strategyData.swapConfig.mode === "intent" && (
                            <div className="space-y-2">
                              <Label htmlFor="swap-preset">Swap Preset</Label>
                              <Select
                                value={strategyData.swapConfig.preset}
                                onValueChange={(value) =>
                                  updateSwapConfig("preset", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fast">Fast</SelectItem>
                                  <SelectItem value="fair">Fair</SelectItem>
                                  <SelectItem value="auction">
                                    Auction
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="wallet-address">Wallet Address</Label>
                          <Input
                            id="wallet-address"
                            placeholder="0x742d35Cc6639C443695aE2f8a7D5d3bC6f4e2e8a"
                            value={strategyData.swapConfig.walletAddress}
                            onChange={(e) =>
                              updateSwapConfig("walletAddress", e.target.value)
                            }
                          />
                        </div>

                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <p className="text-sm text-yellow-700">
                            <strong>Note:</strong> Your 1inch API key will be
                            loaded from environment variables. Make sure to set{" "}
                            <code>NEXT_PUBLIC_ONEINCH_API_KEY</code> in your
                            .env.local file.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Index Condition Configuration */}
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Index Condition Setup
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          Configure when this order should be executed based on blockchain indices
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {!isConnected ? (
                          <div className="text-center py-4">
                            <WalletConnect compact={false} />
                            <p className="text-sm text-gray-600 mt-2">
                              Connect your wallet to access blockchain indices
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="index-select">Select Index</Label>
                              <Select
                                value={strategyData.orderCondition.indexId}
                                onValueChange={(value) =>
                                  updateOrderCondition("indexId", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose an index" />
                                </SelectTrigger>
                                <SelectContent>
                                  {indices.map((index) => (
                                    <SelectItem key={index.id} value={index.id.toString()}>
                                      {index.name || `Index ${index.id}`} (Current: {index.value})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {indices.length === 0 && (
                                <p className="text-sm text-yellow-600">
                                  No indices found. Create indices in the Dashboard first.
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="operator-select">Condition</Label>
                                <Select
                                  value={strategyData.orderCondition.operator.toString()}
                                  onValueChange={(value) =>
                                    updateOrderCondition("operator", parseInt(value))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={OPERATORS.GT.toString()}>
                                      Greater Than (>)
                                    </SelectItem>
                                    <SelectItem value={OPERATORS.LT.toString()}>
                                      Less Than (<)
                                    </SelectItem>
                                    <SelectItem value={OPERATORS.GTE.toString()}>
                                      Greater Than or Equal (>=)
                                    </SelectItem>
                                    <SelectItem value={OPERATORS.LTE.toString()}>
                                      Less Than or Equal (<=)
                                    </SelectItem>
                                    <SelectItem value={OPERATORS.EQ.toString()}>
                                      Equal To (==)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="threshold">Threshold Value</Label>
                                <Input
                                  id="threshold"
                                  placeholder="e.g., 17500 (for $175.00)"
                                  value={strategyData.orderCondition.threshold}
                                  onChange={(e) =>
                                    updateOrderCondition("threshold", e.target.value)
                                  }
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="condition-description">Condition Description</Label>
                              <Input
                                id="condition-description"
                                placeholder="e.g., AAPL stock price > $175"
                                value={strategyData.orderCondition.description}
                                onChange={(e) =>
                                  updateOrderCondition("description", e.target.value)
                                }
                              />
                            </div>

                            {strategyData.orderCondition.indexId && 
                             strategyData.orderCondition.threshold && (
                              <div className="bg-green-100 p-3 rounded-lg">
                                <p className="text-sm text-green-700">
                                  <strong>Condition Preview:</strong> Execute order when{" "}
                                  {indices.find(i => i.id.toString() === strategyData.orderCondition.indexId)?.name || 'Index'}{" "}
                                  {getOperatorName(strategyData.orderCondition.operator)}{" "}
                                  {strategyData.orderCondition.threshold}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900">
                              Order Preview
                            </h4>
                            <p className="text-sm text-blue-700 mt-1">
                              When triggered, swap{" "}
                              {strategyData.orderAmount || "0"} tokens using{" "}
                              {strategyData.swapConfig.mode === "intent"
                                ? "gasless Intent"
                                : "Classic"}{" "}
                              mode with {strategyData.slippage}% slippage
                              tolerance, expiring in {strategyData.expiry}{" "}
                              hours.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Step 4: Review & Sign */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Strategy Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium">
                              {strategyData.name || "Unnamed Strategy"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Token Pair:</span>
                            <span className="font-medium">
                              {TOKENS.find(
                                (t) => t.address === strategyData.tokenIn
                              )?.symbol || "N/A"}{" "}
                              →{" "}
                              {TOKENS.find(
                                (t) => t.address === strategyData.tokenOut
                              )?.symbol || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Trigger:</span>
                            <Badge className="bg-blue-100 text-blue-800">
                              {TRIGGER_TYPES[
                                strategyData.triggerType as keyof typeof TRIGGER_TYPES
                              ]?.name || "None"}
                            </Badge>
                          </div>
                          {strategyData.triggerType === "alphavantage" && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Data Type:
                                </span>
                                <span className="font-medium">
                                  {strategyData.triggerParams.dataType || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Symbol:</span>
                                <span className="font-medium">
                                  {strategyData.triggerParams.symbol || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Indicator:
                                </span>
                                <span className="font-medium">
                                  {strategyData.triggerParams.indicator ||
                                    "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Condition:
                                </span>
                                <span className="font-medium">
                                  {strategyData.triggerParams.condition ||
                                    "N/A"}{" "}
                                  {strategyData.triggerParams.threshold || ""}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Amount:</span>
                            <span className="font-medium">
                              {strategyData.orderAmount || "0"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Target Price:</span>
                            <span className="font-medium">
                              {strategyData.targetPrice || "0"}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Swap Configuration
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Swap Mode:</span>
                            <Badge
                              variant={
                                strategyData.swapConfig.mode === "intent"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {strategyData.swapConfig.mode === "intent"
                                ? "Intent (Gasless)"
                                : "Classic"}
                            </Badge>
                          </div>
                          {strategyData.swapConfig.mode === "intent" && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Preset:</span>
                              <span className="font-medium">
                                {strategyData.swapConfig.preset}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Wallet:</span>
                            <span className="font-medium font-mono text-xs">
                              {strategyData.swapConfig.walletAddress ||
                                "Not set"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Slippage:</span>
                            <span className="font-medium">
                              {strategyData.slippage}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Expiry:</span>
                            <span className="font-medium">
                              {strategyData.expiry} hours
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Network:</span>
                            <span className="font-medium">Base Sepolia</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Protocol:</span>
                            <span className="font-medium">
                              1inch{" "}
                              {strategyData.swapConfig.mode === "intent"
                                ? "Fusion"
                                : "Classic"}{" "}
                              API
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Order Condition
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Index:</span>
                            <span className="font-medium">
                              {indices.find(i => i.id.toString() === strategyData.orderCondition.indexId)?.name || 
                               strategyData.orderCondition.indexId || "Not selected"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Condition:</span>
                            <Badge variant="outline">
                              {getOperatorName(strategyData.orderCondition.operator)} {strategyData.orderCondition.threshold}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Description:</span>
                            <span className="font-medium text-sm">
                              {strategyData.orderCondition.description || "Auto-generated"}
                            </span>
                          </div>
                          {strategyData.orderCondition.indexId && (
                            <div className="bg-green-50 p-3 rounded-lg">
                              <p className="text-sm text-green-700">
                                <strong>Execution Trigger:</strong> Order will execute when{" "}
                                {indices.find(i => i.id.toString() === strategyData.orderCondition.indexId)?.name || 'the index'}{" "}
                                {getOperatorName(strategyData.orderCondition.operator)}{" "}
                                {strategyData.orderCondition.threshold}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-yellow-50 border-yellow-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-yellow-900">
                              Ready to Sign
                            </h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              You'll need to sign an EIP-712 message to create
                              this limit order. No gas fees are required for
                              signing.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-center">
                      <Button className="gradient-primary text-white px-8 py-3 text-lg">
                        Sign & Create Strategy
                      </Button>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                  >
                    Previous
                  </Button>

                  {currentStep < steps.length - 1 ? (
                    <Button
                      onClick={handleNext}
                      className="gradient-primary text-white"
                    >
                      Next Step
                    </Button>
                  ) : (
                    <Button
                      className="gradient-primary text-white"
                      onClick={handleCreateStrategy}
                      disabled={isCreatingOrder || !isConnected}
                    >
                      {isCreatingOrder ? "Creating Order..." : "Create Strategy"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
