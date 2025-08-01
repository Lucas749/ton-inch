"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft, 
  Plus,
  Activity,
  BarChart3,
  MessageCircle,
  Heart,
  Repeat2,
  Eye
} from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { blockchainService } from "@/lib/blockchain-service";

interface IndexDetailClientProps {
  indexData: any;
}

export function IndexDetailClient({ indexData: index }: IndexDetailClientProps) {
  const router = useRouter();
  const [isAddingToPortfolio, setIsAddingToPortfolio] = useState(false);
  const { isConnected } = useBlockchain();

  const handleAddToPortfolio = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setIsAddingToPortfolio(true);
      
      const indexId = await blockchainService.createIndex(
        index.id,
        index.description,
        index.currentValue
      );

      console.log("✅ Index created with ID:", indexId);
      alert(`🎉 Successfully added ${index.name} to your portfolio!`);
      
      // Redirect to dashboard to see the new index
      router.push("/dashboard");
      
    } catch (error) {
      console.error("❌ Error creating index:", error);
      alert("Failed to add index: " + (error as Error).message);
    } finally {
      setIsAddingToPortfolio(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Indices
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Chart and Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-full ${index.color} flex items-center justify-center text-white text-2xl font-bold`}>
                  {index.avatar}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{index.name}</h1>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">${index.symbol}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-500">{index.handle}</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={handleAddToPortfolio}
                  disabled={!isConnected || isAddingToPortfolio}
                  className="px-6"
                >
                  {isAddingToPortfolio ? (
                    "Adding..."
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Portfolio
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Price</div>
                  <div className="text-2xl font-bold text-gray-900">{index.price}</div>
                  <div className={`text-sm ${index.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {index.change}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Mindshare</div>
                  <div className="text-2xl font-bold text-gray-900">{index.mindshare}</div>
                  <div className="text-sm text-gray-500">{index.changeValue}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Sentiment</div>
                  <div className="text-2xl font-bold text-green-600">{index.sentiment}</div>
                  <div className="text-sm text-gray-500">Positive</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">24h Volume</div>
                  <div className="text-2xl font-bold text-gray-900">{index.volume24h}</div>
                  <div className="text-sm text-red-600">-54.45%</div>
                </CardContent>
              </Card>
            </div>

            {/* Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Price Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Interactive chart would be displayed here</p>
                    <p className="text-sm text-gray-400">Historical price data and trends</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Community Sentiment */}
            <Card>
              <CardHeader>
                <CardTitle>Community Sentiment</CardTitle>
                <div className="text-sm text-gray-500">{index.communityData.totalCalls}</div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">{index.communityData.positivePercent}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-medium">{index.communityData.negativePercent}%</span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-l-full" 
                    style={{ width: `${index.communityData.positivePercent}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Social Feed */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5" />
                  <span>Latest Buzz</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {index.socialFeed.map((post: any) => (
                  <div key={post.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{post.user}</span>
                          <span className="text-gray-500 text-sm">{post.handle}</span>
                          <span className="text-gray-400 text-sm">•</span>
                          <span className="text-gray-400 text-sm">{post.time}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{post.content}</p>
                        
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
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
                            <span>{post.views}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Connection Warning */}
            {!isConnected && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-yellow-600" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Connect Wallet</h4>
                      <p className="text-sm text-yellow-700">
                        Connect your wallet to add this index to your portfolio.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}