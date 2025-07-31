'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Twitter, TrendingUp, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const events = [
  {
    id: 1,
    type: 'twitter',
    icon: Twitter,
    title: 'Large ETH Transfer Detected',
    description: 'Whale moved 15k ETH from Binance to unknown wallet',
    timestamp: '2 min ago',
    impact: 'high',
    tokens: ['ETH', 'USDC'],
    change: '+2.34%'
  },
  {
    id: 2,
    type: 'price',
    icon: TrendingUp,
    title: 'BTC Breaks Resistance',
    description: 'Bitcoin crossed $45,000 triggering multiple limit orders',
    timestamp: '5 min ago',
    impact: 'medium',
    tokens: ['BTC', 'WBTC'],
    change: '+1.87%'
  },
  {
    id: 3,
    type: 'onchain',
    icon: Coins,
    title: 'DEX Volume Surge',
    description: 'Uniswap V3 seeing 300% increase in LINK trades',
    timestamp: '8 min ago',
    impact: 'medium',
    tokens: ['LINK', 'ETH'],
    change: '+4.21%'
  },
  {
    id: 4,
    type: 'alert',
    icon: AlertTriangle,
    title: 'Governance Proposal',
    description: 'AAVE proposal to increase borrowing rates passes',
    timestamp: '12 min ago',
    impact: 'low',
    tokens: ['AAVE'],
    change: '-0.89%'
  }
];

export function EventsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, events.length - 2));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, events.length - 2)) % Math.max(1, events.length - 2));
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevSlide}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextSlide}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden">
        <div 
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 33.333}%)` }}
        >
          {events.map((event) => {
            const IconComponent = event.icon;
            return (
              <div key={event.id} className="w-1/3 flex-shrink-0 px-2">
                <Card className="bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 hover:border-blue-300">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <IconComponent className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getImpactColor(event.impact)}`}>
                          {event.impact}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{event.timestamp}</span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-1">
                        {event.tokens.map((token) => (
                          <span 
                            key={token}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                          >
                            {token}
                          </span>
                        ))}
                      </div>
                      <span className={`text-sm font-medium ${
                        event.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {event.change}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}