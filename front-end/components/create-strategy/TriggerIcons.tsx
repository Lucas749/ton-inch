"use client";

import { 
  BarChart3, 
  Twitter, 
  Send, 
  TrendingUp, 
  Webhook, 
  Zap 
} from "lucide-react";

export function renderTriggerIcon(type: string) {
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
}