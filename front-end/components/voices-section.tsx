'use client';

import { MessageCircle, Heart, Repeat2, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const voices = [
  {
    id: 1,
    user: 'CryptoWhale',
    handle: '@whale_alerts',
    avatar: '🐋',
    content: 'ETH whale just moved 15k ETH to DeFi protocols. Bullish signal for upcoming merge events.',
    timestamp: '2h',
    likes: 342,
    retweets: 89,
    replies: 23,
    views: 15600
  },
  {
    id: 2,
    user: 'DeFi Analyst',
    handle: '@defi_research',
    avatar: '📊',
    content: 'Uniswap V4 launch creating massive arbitrage opportunities. Limit orders are printing money.',
    timestamp: '4h',
    likes: 158,
    retweets: 45,
    replies: 12,
    views: 8900
  },
  {
    id: 3,
    user: 'TokenSentinel',
    handle: '@token_watch',
    avatar: '🎯',
    content: 'LINK price action forming perfect ascending triangle. Breaking $15 would trigger my strategy.',
    timestamp: '6h',
    likes: 267,
    retweets: 67,
    replies: 34,
    views: 12400
  }
];

export function VoicesSection() {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Community Voices</h2>
        <div className="flex space-x-2">
          <button className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">All</button>
          <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">Strategies</button>
          <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">Alerts</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {voices.map((voice) => (
          <Card key={voice.id} className="bg-white hover:shadow-lg transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3 mb-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="text-lg">{voice.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1">
                    <p className="font-semibold text-gray-900 truncate">{voice.user}</p>
                    <p className="text-sm text-gray-500">{voice.handle}</p>
                  </div>
                  <p className="text-sm text-gray-500">{voice.timestamp}</p>
                </div>
              </div>
              
              <p className="text-gray-900 mb-4 leading-relaxed">{voice.content}</p>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{voice.replies}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Repeat2 className="w-4 h-4" />
                  <span>{voice.retweets}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className="w-4 h-4" />
                  <span>{voice.likes}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{voice.views.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}