'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const goodSentimentTokens = [
  { symbol: 'ETH', name: 'Ethereum', change: '+5.2%', sentiment: 90.4, color: 'from-blue-400 to-blue-600' },
  { symbol: 'BTC', name: 'Bitcoin', change: '+3.1%', sentiment: 87.2, color: 'from-orange-400 to-orange-600' },
  { symbol: 'LINK', name: 'Chainlink', change: '+8.7%', sentiment: 85.1, color: 'from-blue-500 to-purple-600' },
  { symbol: 'UNI', name: 'Uniswap', change: '+2.4%', sentiment: 82.3, color: 'from-pink-400 to-pink-600' },
  { symbol: 'AAVE', name: 'Aave', change: '+4.6%', sentiment: 79.8, color: 'from-purple-400 to-purple-600' },
];

const badSentimentTokens = [
  { symbol: 'SHIB', name: 'Shiba Inu', change: '-12.3%', sentiment: 23.1, color: 'from-red-400 to-red-600' },
  { symbol: 'DOGE', name: 'Dogecoin', change: '-8.9%', sentiment: 28.7, color: 'from-yellow-400 to-yellow-600' },
  { symbol: 'ADA', name: 'Cardano', change: '-5.2%', sentiment: 31.4, color: 'from-blue-400 to-blue-600' },
  { symbol: 'XRP', name: 'Ripple', change: '-3.8%', sentiment: 34.9, color: 'from-gray-400 to-gray-600' },
];

export function TokenCarousel() {
  return (
    <div className="space-y-8">
      {/* Good Sentiment */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-gray-900">Good sentiment</h3>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex space-x-4 pb-2">
            {goodSentimentTokens.map((token) => (
              <Card key={token.symbol} className="min-w-[200px] bg-white hover:shadow-lg transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${token.color} flex items-center justify-center`}>
                        <span className="text-white text-xs font-bold">{token.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{token.symbol}</p>
                        <p className="text-xs text-gray-500">{token.name}</p>
                      </div>
                    </div>
                    <span className="text-green-600 font-semibold text-sm">{token.change}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sentiment</span>
                      <span className="font-semibold">{token.sentiment}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${token.sentiment}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Bad Sentiment */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <TrendingDown className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-gray-900">Bad sentiment</h3>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex space-x-4 pb-2">
            {badSentimentTokens.map((token) => (
              <Card key={token.symbol} className="min-w-[200px] bg-white hover:shadow-lg transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${token.color} flex items-center justify-center`}>
                        <span className="text-white text-xs font-bold">{token.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{token.symbol}</p>
                        <p className="text-xs text-gray-500">{token.name}</p>
                      </div>
                    </div>
                    <span className="text-red-600 font-semibold text-sm">{token.change}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sentiment</span>
                      <span className="font-semibold">{token.sentiment}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${token.sentiment}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}