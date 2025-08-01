"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { useOrders, OPERATORS } from "@/hooks/useOrders";

import { StepNavigation, steps } from "@/components/create-strategy/StepNavigation";
import { StrategyBasicsStep } from "@/components/create-strategy/StrategyBasicsStep";
import { EventTriggerStep } from "@/components/create-strategy/EventTriggerStep";
import { OrderParametersStep } from "@/components/create-strategy/OrderParametersStep";
import { ReviewStep } from "@/components/create-strategy/ReviewStep";

export default function CreateStrategy() {
  const [currentStep, setCurrentStep] = useState(0);
  const { isConnected, indices } = useBlockchain();
  const { createOrder, isLoading: isCreatingOrder } = useOrders();
  
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

      const orderParams = {
        indexId: parseInt(strategyData.orderCondition.indexId),
        operator: strategyData.orderCondition.operator,
        threshold: parseInt(strategyData.orderCondition.threshold),
        description: strategyData.orderCondition.description || `${strategyData.name} - ${getOperatorName(strategyData.orderCondition.operator)} ${strategyData.orderCondition.threshold}`,
        fromToken: strategyData.tokenIn || "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        toToken: strategyData.tokenOut || "0x4200000000000000000000000000000000000006",
        fromAmount: strategyData.orderAmount,
        toAmount: strategyData.targetPrice || "0.1",
        expiry: Math.floor(Date.now() / 1000) + (parseInt(strategyData.expiry) * 3600),
      };

      console.log("Creating order with params:", orderParams);
      
      const order = await createOrder(orderParams);
      
      if (order) {
        alert(`Strategy created successfully! Order Hash: ${order.hash}`);
        console.log("Order created:", order);
      }
    } catch (error) {
      console.error("Error creating strategy:", error);
      alert(`Failed to create strategy: ${error instanceof Error ? error.message : "Unknown error"}`);
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
