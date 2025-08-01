"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { useOrders, OPERATORS } from "@/hooks/useOrders";
import { blockchainService } from "@/lib/blockchain-service";

// Contract addresses - avoiding import issues
const CONTRACTS = {
  TestUSDC: "0x2026c63430A1B526638bEF55Fea7174220cD3965",
  WETH: "0x4200000000000000000000000000000000000006",
  IndexLimitOrderFactory: "0x0312Af95deFE475B89852ec05Eab5A785f647e73",
};

import { StepNavigation, steps } from "@/components/create-strategy/StepNavigation";
import { StrategyBasicsStep } from "@/components/create-strategy/StrategyBasicsStep";
import { EventTriggerStep } from "@/components/create-strategy/EventTriggerStep";
import { OrderParametersStep } from "@/components/create-strategy/OrderParametersStep";
import { ReviewStep } from "@/components/create-strategy/ReviewStep";

export default function CreateStrategy() {
  const [currentStep, setCurrentStep] = useState(0);
  const { isConnected, indices } = useBlockchain();
  const { createOrder, isLoading: isCreatingOrder } = useOrders();
  const [isMintingTokens, setIsMintingTokens] = useState(false);
  const [isCreatingIndex, setIsCreatingIndex] = useState(false);
  
  const [strategyData, setStrategyData] = useState({
    name: "",
    description: "",
    tokenIn: "",
    tokenOut: "",
    triggerType: "",
    triggerParams: {
      dataType: "",
      symbol: "",
      indicator: "",
      threshold: "",
      condition: "",
      keywords: "",
      amount: "",
      webhookUrl: "",
      direction: "",
    },
    orderAmount: "",
    targetPrice: "",
    slippage: "1",
    expiry: "24",
    swapConfig: {
      mode: "classic",
      preset: "fast",
      walletAddress: "",
      apiKey: "",
      rpcUrl: "https://sepolia.base.org",
    },
    orderCondition: {
      indexId: "",
      operator: OPERATORS.GT,
      threshold: "",
      description: "",
    },
  });

  const updateStrategyData = (field: string, value: any) => {
    setStrategyData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateOrderCondition = (param: string, value: any) => {
    setStrategyData((prev) => ({
      ...prev,
      orderCondition: { ...prev.orderCondition, [param]: value },
    }));
  };

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

  const getOperatorName = (operator: number): string => {
    const names = ['>', '<', '>=', '<=', '=='];
    return names[operator] || '?';
  };

  const fillDemoData = () => {
    // Fill demo data with TestUSDC and small amounts for testing
    setStrategyData({
      name: "Apple Stock Bull Run Alert",
      description: "Execute trade when Apple stock price exceeds $170.00",
      tokenIn: CONTRACTS.TestUSDC, // Use TestUSDC for testing
      tokenOut: CONTRACTS.WETH,     // Keep WETH as target
      triggerType: "alphavantage",
      triggerParams: {
        dataType: "stock",
        symbol: "AAPL",
        indicator: "price",
        threshold: "170.00",
        condition: "greater_than",
        keywords: "",
        amount: "",
        webhookUrl: "",
        direction: "up",
      },
      orderAmount: "10",    // Small amount: 10 TestUSDC
      targetPrice: "0.003", // Small amount: 0.003 ETH
      slippage: "1",
      expiry: "2", // 2 hours
      swapConfig: {
        mode: "classic",
        preset: "fast",
        walletAddress: "",
        apiKey: "",
        rpcUrl: "https://sepolia.base.org",
      },
      orderCondition: {
        indexId: "0", // APPLE_STOCK index (assuming first index)
        operator: OPERATORS.GT, // Greater than
        threshold: "17000", // $170.00 * 100
        description: "Apple stock > $170.00",
      },
    });

    // Auto-advance to the review step to test the full flow
    setCurrentStep(3);
    
    alert("🚀 Demo data loaded! Steps to test:\n1. Create Test Index (📊)\n2. Get Test Tokens (🪙)\n3. Create Strategy");
  };

  const handleCreateTestIndex = async () => {
    try {
      setIsCreatingIndex(true);
      // Create a test Apple Stock index with initial value of $175.00 (17500 in cents)
      const indexId = await blockchainService.createIndex(
        "APPLE_STOCK", 
        "Apple Inc. stock price in USD cents", 
        17500
      );
      alert(`✅ Successfully created Apple Stock index with ID: ${indexId}!`);
    } catch (error) {
      console.error("Failed to create test index:", error);
      alert(`❌ Failed to create test index: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCreatingIndex(false);
    }
  };

  const handleMintTestTokens = async () => {
    try {
      setIsMintingTokens(true);
      await blockchainService.mintTestTokens(100); // Mint 100 TestUSDC
      alert("✅ Successfully minted 100 Test USDC tokens!");
    } catch (error) {
      console.error("Failed to mint test tokens:", error);
      alert(`❌ Failed to mint test tokens: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsMintingTokens(false);
    }
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

      // Check if user has test tokens first
      try {
        const testUSDCBalance = await blockchainService.getTestUSDCBalance();
        console.log("🪙 TestUSDC Balance:", testUSDCBalance);
        
        if (parseFloat(testUSDCBalance) < parseFloat(strategyData.orderAmount)) {
          alert(`❌ Insufficient TestUSDC balance! You have ${testUSDCBalance} but need ${strategyData.orderAmount}. Click "Get Test Tokens" first.`);
          return;
        }
      } catch (error) {
        console.warn("Could not check TestUSDC balance:", error);
      }

      // Check if the index exists first
      try {
        const indexValue = await blockchainService.getIndexValue(parseInt(strategyData.orderCondition.indexId));
        console.log(`📊 Index ${strategyData.orderCondition.indexId} value:`, indexValue);
      } catch (error) {
        console.error("❌ Index does not exist:", error);
        alert(`❌ Index ${strategyData.orderCondition.indexId} does not exist! Try creating an index first or use a different index ID.`);
        return;
      }

      const orderParams = {
        indexId: parseInt(strategyData.orderCondition.indexId),
        operator: strategyData.orderCondition.operator,
        threshold: parseInt(strategyData.orderCondition.threshold),
        description: strategyData.orderCondition.description || `${strategyData.name} - ${getOperatorName(strategyData.orderCondition.operator)} ${strategyData.orderCondition.threshold}`,
        fromToken: strategyData.tokenIn || CONTRACTS.TestUSDC, // Default to TestUSDC
        toToken: strategyData.tokenOut || CONTRACTS.WETH,      // Default to WETH
        fromAmount: strategyData.orderAmount,
        toAmount: strategyData.targetPrice || "0.003",
        expiry: Math.floor(Date.now() / 1000) + (parseInt(strategyData.expiry) * 3600),
      };

      console.log("🚀 Creating order with params:", orderParams);
      
      const order = await createOrder(orderParams);
      
      if (order) {
        alert(`Strategy created successfully! Order Hash: ${order.hash}`);
        console.log("Order created:", order);
      }
    } catch (error) {
      console.error("❌ Error creating strategy:", error);
      
      // Provide more helpful error messages
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        if (error.message.includes("revert")) {
          errorMessage = "Transaction reverted by contract. This could be due to:\n" +
            "• Index ID doesn't exist\n" +
            "• Insufficient token balance\n" +
            "• Token approval failed\n" +
            "• Invalid parameters\n\n" +
            "Try:\n1. Mint test tokens first\n2. Use a valid index ID\n3. Check console for details";
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(`❌ Failed to create strategy:\n\n${errorMessage}`);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StrategyBasicsStep 
            strategyData={strategyData}
            updateStrategyData={updateStrategyData}
          />
        );
      case 1:
        return (
          <EventTriggerStep 
            strategyData={strategyData}
            updateStrategyData={updateStrategyData}
          />
        );
      case 2:
        return (
          <OrderParametersStep 
            strategyData={strategyData}
            updateStrategyData={updateStrategyData}
            updateOrderCondition={updateOrderCondition}
            indices={indices}
          />
        );
      case 3:
        return (
          <ReviewStep 
            strategyData={strategyData}
            isConnected={isConnected}
            isCreatingOrder={isCreatingOrder}
            onCreateStrategy={handleCreateStrategy}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
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
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleCreateTestIndex}
              disabled={!isConnected || isCreatingIndex}
              className="bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300"
            >
              {isCreatingIndex ? "Creating..." : "📊 Create Test Index"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleMintTestTokens}
              disabled={!isConnected || isMintingTokens}
              className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
            >
              {isMintingTokens ? "Minting..." : "🪙 Get Test Tokens"}
            </Button>
            <Button
              variant="secondary"  
              onClick={fillDemoData}
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
            >
              🚀 Fill Demo Data
            </Button>
          </div>
        </div>

        <StepNavigation currentStep={currentStep} />

        <div className="mb-8">
          {renderCurrentStep()}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : null}
        </div>
      </main>
    </div>
  );
}
