"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPERATORS = {
  GT: 0,
  LT: 1,
  GTE: 2,
  LTE: 3,
  EQ: 4
};

interface OrderParametersStepProps {
  strategyData: any;
  updateStrategyData: any;
  updateOrderCondition: any;
  indices: any[];
}

const OrderParametersStep = (props: OrderParametersStepProps) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Index Condition</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Index to Monitor</Label>
            <Select 
              value={props.strategyData.orderCondition.indexId} 
              onValueChange={(value) => props.updateOrderCondition("indexId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select index" />
              </SelectTrigger>
              <SelectContent>
                {props.indices.map((index) => (
                  <SelectItem key={index.id} value={index.id.toString()}>
                    {index.name} (ID: {index.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Condition</Label>
            <Select 
              value={props.strategyData.orderCondition.operator.toString()} 
              onValueChange={(value) => props.updateOrderCondition("operator", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OPERATORS.GT.toString()}>Greater than (&gt;)</SelectItem>
                <SelectItem value={OPERATORS.LT.toString()}>Less than (&lt;)</SelectItem>
                <SelectItem value={OPERATORS.GTE.toString()}>Greater than or equal (&gt;=)</SelectItem>
                <SelectItem value={OPERATORS.LTE.toString()}>Less than or equal (&lt;=)</SelectItem>
                <SelectItem value={OPERATORS.EQ.toString()}>Equal to (==)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="threshold">Threshold Value</Label>
            <Input
              id="threshold"
              placeholder="e.g. 17000 (for $170.00)"
              value={props.strategyData.orderCondition.threshold}
              onChange={(e) => props.updateOrderCondition("threshold", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Order Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="usdc-amount">USDC Amount to Sell</Label>
            <Input
              id="usdc-amount"
              placeholder="1000"
              value={props.strategyData.orderAmount}
              onChange={(e) => props.updateStrategyData("orderAmount", e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="eth-amount">ETH Amount to Buy</Label>
            <Input
              id="eth-amount"
              placeholder="0.4"
              value={props.strategyData.targetPrice}
              onChange={(e) => props.updateStrategyData("targetPrice", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="expiry">Expiry (Hours)</Label>
            <Select 
              value={props.strategyData.expiry} 
              onValueChange={(value) => props.updateStrategyData("expiry", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 hours</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="72">3 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {props.strategyData.orderAmount && props.strategyData.targetPrice && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-900">Order Preview:</p>
            <p className="text-sm text-green-800">
              Sell {props.strategyData.orderAmount} USDC for {props.strategyData.targetPrice} ETH
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);

export { OrderParametersStep };
