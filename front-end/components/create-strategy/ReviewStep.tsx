"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletConnect } from "@/components/WalletConnect";

interface StrategyData {
  name: string;
  description: string;
  triggerType: string;
  tokenIn: string;
  tokenOut: string;
  orderAmount: string;
  targetPrice: string;
  orderCondition: {
    indexId: string;
    operator: number;
    threshold: string;
    description: string;
  };
  [key: string]: any;
}

interface ReviewStepProps {
  strategyData: StrategyData;
  isConnected: boolean;
  isCreatingOrder: boolean;
  onCreateStrategy: () => void;
}

const getOperatorName = (operator: number): string => {
  const names = ['>', '<', '>=', '<=', '=='];
  return names[operator] || '?';
};

export function ReviewStep({ 
  strategyData, 
  isConnected, 
  isCreatingOrder, 
  onCreateStrategy 
}: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Strategy Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Name</h3>
            <p className="text-gray-600">{strategyData.name || "Unnamed Strategy"}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">Description</h3>
            <p className="text-gray-600">{strategyData.description || "No description"}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">Trigger Type</h3>
            <Badge variant="secondary">{strategyData.triggerType || "None selected"}</Badge>
          </div>
          
          <div>
            <h3 className="font-semibold">Order Details</h3>
            <p className="text-gray-600">
              Swap {strategyData.orderAmount || "0"} {strategyData.tokenIn || "TOKEN"} 
              → {strategyData.tokenOut || "TOKEN"} at {strategyData.targetPrice || "0"} price
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold">Condition</h3>
            <p className="text-gray-600">
              When index {strategyData.orderCondition.indexId || "?"} is{" "}
              {getOperatorName(strategyData.orderCondition.operator)} {strategyData.orderCondition.threshold || "?"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Connect your wallet to create the strategy</p>
              <WalletConnect />
            </div>
          ) : (
            <Button 
              onClick={onCreateStrategy} 
              disabled={isCreatingOrder}
              className="w-full"
            >
              {isCreatingOrder ? "Creating Strategy..." : "Create Strategy"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}