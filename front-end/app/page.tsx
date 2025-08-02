"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IndicesExplorer } from '@/components/IndicesExplorer';
import { TrendingUp, BarChart3, ArrowRight, Sparkles, Activity, Users, Zap, Crown, Star } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  // Featured campaigns data (cookie.fun style)
  const featuredCampaigns = [
    {
      id: 1,
      name: "AI Index",
      symbol: "AI",
      avatar: "🤖",
      change: "+12.4%",
      color: "bg-blue-500",
      participants: "2.4K",
      volume: "$890K",
      isPositive: true
    },
    {
      id: 2,
      name: "DeFi Pulse",
      symbol: "DEFI",
      avatar: "🔗",
      change: "+8.7%",
      color: "bg-purple-500",
      participants: "1.8K",
      volume: "$654K",
      isPositive: true
    },
    {
      id: 3,
      name: "Green Energy",
      symbol: "GREEN",
      avatar: "🌱",
      change: "-2.1%",
      color: "bg-green-500",
      participants: "965",
      volume: "$234K",
      isPositive: false
    }
  ];

  // Market events data
  const marketEvents = [
    {
      id: 1,
      title: "Fed Rate Decision",
      time: "2h ago",
      impact: "high",
      category: "Economics",
      icon: "🏛️",
      participants: ["TSLA", "AAPL", "BTC"]
    },
    {
      id: 2,
      title: "Earnings Season Peak",
      time: "5h ago",
      impact: "medium",
      category: "Stocks",
      icon: "📊",
      participants: ["MSFT", "GOOGL", "META"]
    },
    {
      id: 3,
      title: "Crypto Rally Continues",
      time: "1d ago",
      impact: "high",
      category: "Crypto",
      icon: "🚀",
      participants: ["BTC", "ETH", "SOL"]
    },
    {
      id: 4,
      title: "Oil Prices Surge",
      time: "2d ago",
      impact: "medium",
      category: "Commodities",
      icon: "🛢️",
      participants: ["WTI", "BRENT"]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="container mx-auto px-4 py-6">
        {/* Featured Campaigns Section - Cookie.fun style */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
              Featured Indices
            </h2>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredCampaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full ${campaign.color} flex items-center justify-center text-white text-lg font-bold`}>
                        {campaign.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-500">@{campaign.symbol.toLowerCase()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${campaign.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {campaign.change}
                      </div>
                      <div className="text-xs text-gray-500">{campaign.participants} traders</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Volume: {campaign.volume}</span>
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Market Events Section - Horizontal scroll like cookie.fun */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-orange-500" />
              Market Events
            </h2>
            <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
              See all events <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {marketEvents.map((event) => (
              <Card key={event.id} className="min-w-[280px] hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{event.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{event.title}</div>
                        <div className="text-xs text-gray-500">{event.time}</div>
                      </div>
                    </div>
                    <Badge 
                      variant={event.impact === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {event.impact}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{event.category}</span>
                    <div className="flex space-x-1">
                      {event.participants.slice(0, 3).map((participant, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                          {participant}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Indices Table - Cookie.fun style */}
        <IndicesExplorer />

        {/* Bottom Stats Section */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">24.7K</div>
            <div className="text-sm text-gray-500">Active Traders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">$12.4M</div>
            <div className="text-sm text-gray-500">Volume 24h</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">156</div>
            <div className="text-sm text-gray-500">Live Indices</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">99.9%</div>
            <div className="text-sm text-gray-500">Uptime</div>
          </div>
        </div>
      </main>
    </div>
  );
}