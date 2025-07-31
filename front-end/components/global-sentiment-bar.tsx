'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

export function GlobalSentimentBar() {
  return (
    <div className="bg-gray-50 border-b border-gray-200 py-2">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center space-x-8 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Global sentiment:</span>
            <span className="font-semibold">59/100</span>
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-green-600 font-medium">+7.27%</span>
          </div>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Projects tracked:</span>
            <span className="font-semibold">14.1k</span>
          </div>
        </div>
      </div>
    </div>
  );
}