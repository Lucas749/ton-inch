"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface StrategyData {
  name: string;
  description: string;
  [key: string]: any;
}

interface StrategyBasicsStepProps {
  strategyData: StrategyData;
  updateStrategyData: (field: string, value: any) => void;
}

export function StrategyBasicsStep({ strategyData, updateStrategyData }: StrategyBasicsStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategy Basics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="strategy-name">Strategy Name</Label>
          <Input
            id="strategy-name"
            placeholder="e.g., BTC Bull Run Alert"
            value={strategyData.name}
            onChange={(e) => updateStrategyData("name", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="strategy-description">Description</Label>
          <Textarea
            id="strategy-description"
            placeholder="Describe your strategy..."
            value={strategyData.description}
            onChange={(e) => updateStrategyData("description", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}