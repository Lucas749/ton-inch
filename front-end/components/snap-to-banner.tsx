'use client';

import { ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SnapToBanner() {
  return (
    <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="w-5 h-5 animate-pulse" />
            <span className="font-medium">
              Snap to Invest in WETH at 2850 USDC vs 3100 USDC at 1INCH
            </span>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            className="bg-white text-emerald-600 hover:bg-gray-100 font-medium"
          >
            Snap to Invest
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}