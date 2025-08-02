"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRIGGER_TYPES } from "@/lib/constants";
import { renderTriggerIcon } from "./TriggerIcons";

interface StrategyData {
  triggerType: string;
  [key: string]: any;
}

interface EventTriggerStepProps {
  strategyData: StrategyData;
  updateStrategyData: (field: string, value: any) => void;
}

export function EventTriggerStep({ strategyData, updateStrategyData }: EventTriggerStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Your Event Trigger</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(TRIGGER_TYPES).map(([key, trigger]) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all hover:shadow-md ${
                strategyData.triggerType === key
                  ? "ring-2 ring-blue-500 bg-blue-50"
                  : "border-gray-200"
              }`}
              onClick={() => updateStrategyData("triggerType", key)}
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
                    <div className="flex flex-wrap gap-1 mt-2">
                      {trigger.tags?.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}