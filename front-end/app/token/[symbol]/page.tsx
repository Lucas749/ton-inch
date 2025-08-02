"use client";

import { useParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Heart,
  Repeat2,
  Eye,
  ExternalLink,
  Settings,
  Bell,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// Note: generateStaticParams removed to allow client-side rendering with charts

// Mock data for charts
const mindshareData = [
  { day: "25", mindshare: 0.12, sentiment: 45 },
  { day: "26", mindshare: 0.14, sentiment: 52 },
  { day: "27", mindshare: 0.13, sentiment: 41 },
  { day: "28", mindshare: 0.15, sentiment: 67 },
  { day: "29", mindshare: 0.16, sentiment: 59 },
  { day: "30", mindshare: 0.14, sentiment: 72 },
  { day: "31", mindshare: 0.17, sentiment: 78 },
];

const sentimentData = [
  { day: "25", positive: 120, negative: 45 },
  { day: "26", positive: 135, negative: 38 },
  { day: "27", positive: 98, negative: 67 },
  { day: "28", positive: 156, negative: 23 },
  { day: "29", positive: 142, negative: 34 },
  { day: "30", positive: 178, negative: 19 },
  { day: "31", positive: 189, negative: 15 },
];

const topVoices = [
  {
    id: 1,
    name: "Soju 燒酒",
    handle: "Meteora",
    avatar: "🍶",
    change: "+0.25%",
    color: "bg-green-500",
  },
  {
    id: 2,
    name: "CJ",
    handle: "2.51",
    avatar: "🎭",
    change: "+2.43%",
    color: "bg-blue-500",
  },
  {
    id: 3,
    name: "IcoBeast.eth",
    handle: "2.18",
    avatar: "🦁",
    change: "+1.17%",
    color: "bg-purple-500",
  },
  {
    id: 4,
    name: "EVERYONE BP UP",
    handle: "1.83",
    avatar: "🚀",
    change: "+1.88%",
    color: "bg-orange-500",
  },
  {
    id: 5,
    name: "Mercy",
    handle: "1.52",
    avatar: "😇",
    change: "+1.5%",
    color: "bg-pink-500",
  },
  {
    id: 6,
    name: "Dhirk",
    handle: "1.47",
    avatar: "🎯",
    change: "+1.47%",
    color: "bg-indigo-500",
  },
  {
    id: 7,
    name: "madlad792",
    handle: "vesper",
    avatar: "🌿",
    change: "+1.41%",
    color: "bg-green-600",
  },
];

const smartFeedPosts = [
  {
    id: 1,
    user: "Superdan $M",
    handle: "@Super__dandan",
    avatar: "🦸",
    content:
      '又回来了，终于拉盘了，我还以为要跌没了，一直加仓，坚定自己的信仰，@shoutdotfun 的 $ENERGY，尽管代币价格短期震荡，我持仓并加仓一这不是信仰研究，而是对"注意力即流动性"链上实验的验证。',
    timestamp: "Jul 27",
    likes: 198,
    retweets: 2,
    replies: 27,
    views: 3900,
    sentiment: -33.33,
    mindshare: 0.11,
  },
  {
    id: 2,
    user: "EVERYONE BP UP",
    handle: "@everyonebpup",
    avatar: "🚀",
    content:
      "REKT On-Chain Autopsy: The $474M Data Deep Dive\n\nAfter pulling wallet data, transaction patterns, and holder movements, the on-chain reality is more nuanced than the headlines suggest - and it reveals...",
    timestamp: "Jul 28",
    likes: 188,
    retweets: 65,
    replies: 23,
    views: 11690,
  },
  {
    id: 3,
    user: "IcoBeast.eth",
    handle: "@beast_ico",
    avatar: "🦁",
    content: "Last post before gn...",
    timestamp: "Jul 30",
    likes: 45,
    retweets: 12,
    replies: 8,
    views: 1200,
  },
];

export default function TokenDetail() {
  const params = useParams();
  const symbol = params.symbol as string;

  // Mock token data
  const tokenData = {
    symbol: symbol?.toUpperCase() || "METEORA",
    name: "Meteora",
    description:
      "Building world-class dynamic liquidity pools for liquidity providers, launchpads and token launches. Discord: https://t.co/uHcLuZ0Hrj",
    handle: "@MeteoraAG",
    avatar: "🌟",
    mindshare: "0.14%",
    mindshareChange: 0,
    sentiment: 422.84,
    sentimentChange: "+422.67",
    communityScore: 90.4,
    communityChange: 9.6,
    totalCalls: 333.8,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="col-span-3 space-y-6">
            {/* Token Info */}
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      {tokenData.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {tokenData.symbol}
                    </h1>
                    <p className="text-sm text-gray-600">
                      Pre-TGE • ✕ {tokenData.handle}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-4">
                  {tokenData.description}
                </p>

                {/* Pre-TGE Dashboard Banner */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Pre-TGE Dashboard
                    </span>
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <p className="text-xs mt-1 opacity-90">
                    Meteora didn't launch a token. Only social metrics are
                    available.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Community Sentiment */}
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Community sentiment</CardTitle>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{tokenData.totalCalls} calls</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-2xl font-bold text-green-600">
                    {tokenData.communityScore}%
                  </span>
                  <span className="text-sm text-red-600">
                    -{tokenData.communityChange}%
                  </span>
                </div>

                {/* Sentiment Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${tokenData.communityScore}%` }}
                  ></div>
                </div>

                {/* Avatar Grid */}
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center"
                    >
                      <span className="text-white text-xs">👤</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Latest Buzz */}
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <span>Latest buzz</span>
                  <TrendingUp className="w-4 h-4 text-red-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Lawsuit Filed Against Meteora Alleges RICO and Fraud Claims
                  </h4>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Jul 31, 12:33PM</span>
                    <div className="flex items-center space-x-1">
                      <span>🍪</span>
                      <span>Cookie Deep Research</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Decentralize InfoFi Rewards */}
            <Card className="bg-gradient-to-br from-orange-100 to-pink-100">
              <CardContent className="p-4">
                <h3 className="font-bold text-gray-900 mb-2">
                  Decentralize InfoFi Rewards
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Incentivize the Meteora community's engagement.
                </p>
                <Button className="w-full bg-gradient-to-r from-orange-400 to-pink-400 text-white">
                  🔒
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-6 space-y-6">
            {/* Chart Tabs */}
            <Tabs defaultValue="charts" className="bg-white rounded-lg">
              <div className="flex items-center justify-between p-4 border-b">
                <TabsList className="bg-gray-100">
                  <TabsTrigger value="charts">Charts</TabsTrigger>
                  <TabsTrigger value="voices">Voices</TabsTrigger>
                  <TabsTrigger value="similar">Similar tokens</TabsTrigger>
                </TabsList>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    24h
                  </Button>
                  <Button variant="outline" size="sm">
                    7D
                  </Button>
                  <Button variant="outline" size="sm">
                    1M
                  </Button>
                  <Button variant="outline" size="sm">
                    3M
                  </Button>
                  <Button variant="outline" size="sm">
                    YTD
                  </Button>
                </div>
              </div>

              <TabsContent value="charts" className="p-6">
                {/* Mindshare and Sentiment Metrics */}
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <h3 className="text-sm text-gray-600 mb-1">Mindshare</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {tokenData.mindshare}
                      </span>
                      <span className="text-sm text-gray-500">
                        ▲ {tokenData.mindshareChange}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm text-gray-600 mb-1">Sentiment</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-3xl font-bold text-gray-900">
                        -
                      </span>
                      <span className="text-sm text-red-600">
                        ▼ {tokenData.sentimentChange}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-80 mb-6">
                  {/* @ts-ignore */}
                  <ResponsiveContainer width="100%" height="100%">
                    {/* @ts-ignore */}
                    <LineChart data={mindshareData}>
                      {/* @ts-ignore */}
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      {/* @ts-ignore */}
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#666" }}
                      />
                      <YAxis hide />
                      <Tooltip />
                      <Bar dataKey="sentiment" fill="#3b82f6" opacity={0.3} />
                      <Line
                        type="monotone"
                        dataKey="mindshare"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-center text-sm text-gray-500 mb-6">
                  Hold down your finger on the chart to see the price,
                  mindshare, and sentiment changes.
                </p>

                {/* Top Voices Grid */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      Top voices
                    </h3>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        📊
                      </Button>
                      <Button variant="outline" size="sm">
                        🔧
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {topVoices.map((voice) => (
                      <Card
                        key={voice.id}
                        className={`${voice.color} text-white relative overflow-hidden`}
                      >
                        <CardContent className="p-3">
                          <div className="text-center">
                            <div className="text-2xl mb-1">{voice.avatar}</div>
                            <p className="text-xs font-medium truncate">
                              {voice.name}
                            </p>
                            <p className="text-xs opacity-80 truncate">
                              {voice.handle}
                            </p>
                            <p className="text-xs font-bold mt-1">
                              {voice.change}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="voices" className="p-6">
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Community voices and discussions about {tokenData.symbol}
                  </p>
                  {/* Add voices content here */}
                </div>
              </TabsContent>

              <TabsContent value="similar" className="p-6">
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Tokens similar to {tokenData.symbol}
                  </p>
                  {/* Add similar tokens content here */}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Smart Feed */}
          <div className="col-span-3 space-y-6">
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <span>🧠 Smart Feed</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Smart Engagement
                    </span>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Language Tabs */}
                <div className="flex space-x-2 mt-3">
                  <Button variant="outline" size="sm" className="text-xs">
                    All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500"
                  >
                    English
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500"
                  >
                    Chinese
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500"
                  >
                    Korean
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500"
                  >
                    Japanese
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {smartFeedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="border-b border-gray-100 pb-4 last:border-b-0"
                  >
                    <div className="flex items-start space-x-3 mb-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-sm">
                          {post.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {post.user}
                          </p>
                          <p className="text-xs text-gray-500">{post.handle}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {post.timestamp}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-900 mb-3 leading-relaxed">
                      {post.content}
                    </p>

                    {/* Sentiment and Mindshare badges */}
                    {post.sentiment && (
                      <div className="flex space-x-2 mb-3">
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          Sentiment {post.sentiment}
                        </Badge>
                        {post.mindshare && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            Mindshare {post.mindshare}%
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{post.replies}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Repeat2 className="w-3 h-3" />
                        <span>{post.retweets}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="w-3 h-3" />
                        <span>{post.likes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{post.views.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full text-sm">
                  View more ↓
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
