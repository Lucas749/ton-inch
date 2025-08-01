"use client";

import { Target, Zap, DollarSign, CheckCircle } from "lucide-react";

const steps = [
  { id: "basics", title: "Strategy Basics", icon: Target },
  { id: "trigger", title: "Event Trigger", icon: Zap },
  { id: "order", title: "Order Parameters", icon: DollarSign },
  { id: "review", title: "Review & Sign", icon: CheckCircle },
];

interface StepNavigationProps {
  currentStep: number;
}

export function StepNavigation({ currentStep }: StepNavigationProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center">
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
                  className={`text-sm font-medium ${
                    isActive
                      ? "text-blue-900"
                      : isCompleted
                      ? "text-green-900"
                      : "text-gray-500"
                  }`}
                >
                  {step.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { steps };