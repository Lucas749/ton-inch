'use client';

import { useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Twitter, 
  Send, 
  TrendingUp, 
  Webhook,
  Zap,
  Target,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { TOKENS, TRIGGER_TYPES } from '@/lib/constants';

const steps = [
  { id: 'basics', title: 'Strategy Basics', icon: Target },
  { id: 'trigger', title: 'Event Trigger', icon: Zap },
  { id: 'order', title: 'Order Parameters', icon: DollarSign },
  { id: 'review', title: 'Review & Sign', icon: CheckCircle }
];

export default function CreateStrategy() {
  const [currentStep, setCurrentStep] = useState(0);
  const [strategyData, setStrategyData] = useState({
    name: '',
    description: '',
    tokenIn: '',
    tokenOut: '',
    triggerType: '',
    triggerParams: {},
    orderAmount: '',
    targetPrice: '',
    slippage: '1',
    expiry: '24'
  });

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateStrategyData = (field: string, value: any) => {
    setStrategyData(prev => ({ ...prev, [field]: value }));
  };

  const renderTriggerIcon = (type: string) => {
    switch (type) {
      case 'twitter': return <Twitter className="w-4 h-4" />;
      case 'transfer': return <Send className="w-4 h-4" />;
      case 'price': return <TrendingUp className="w-4 h-4" />;
      case 'webhook': return <Webhook className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Strategy</h1>
            <p className="text-gray-600">Set up limit orders triggered by real-world events</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  
                  return (
                    <div 
                      key={step.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                        isActive 
                          ? 'bg-blue-50 border border-blue-200' 
                          : isCompleted 
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isActive 
                          ? 'bg-blue-500 text-white' 
                          : isCompleted 
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`font-medium ${
                          isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-600'
                        }`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-500">Step {index + 1}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="bg-white">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <StepIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
                    <p className="text-gray-600">Step {currentStep + 1} of {steps.length}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Step 1: Strategy Basics */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="strategy-name">Strategy Name</Label>
                        <Input
                          id="strategy-name"
                          placeholder="e.g., ETH Whale Watch"
                          value={strategyData.name}
                          onChange={(e) => updateStrategyData('name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Strategy Icon</Label>
                        <div className="flex space-x-2">
                          {['🐋', '📰', '🔗', '🚀', '⚡', '🎯'].map((emoji) => (
                            <Button
                              key={emoji}
                              variant="outline"
                              size="sm"
                              className="text-lg"
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your strategy and when it should trigger..."
                        value={strategyData.description}
                        onChange={(e) => updateStrategyData('description', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Token to Sell</Label>
                        <Select value={strategyData.tokenIn} onValueChange={(value) => updateStrategyData('tokenIn', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select token to sell" />
                          </SelectTrigger>
                          <SelectContent>
                            {TOKENS.map((token) => (
                              <SelectItem key={token.address} value={token.address}>
                                <div className="flex items-center space-x-2">
                                  <span>{token.symbol}</span>
                                  <span className="text-gray-500 text-sm">{token.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Token to Buy</Label>
                        <Select value={strategyData.tokenOut} onValueChange={(value) => updateStrategyData('tokenOut', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select token to buy" />
                          </SelectTrigger>
                          <SelectContent>
                            {TOKENS.map((token) => (
                              <SelectItem key={token.address} value={token.address}>
                                <div className="flex items-center space-x-2">
                                  <span>{token.symbol}</span>
                                  <span className="text-gray-500 text-sm">{token.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Event Trigger */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-base font-medium mb-4 block">Choose Trigger Type</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(TRIGGER_TYPES).map(([key, trigger]) => (
                          <Card 
                            key={key}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              strategyData.triggerType === key 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => updateStrategyData('triggerType', key)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  {renderTriggerIcon(key)}
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900">{trigger.name}</h3>
                                  <p className="text-sm text-gray-600 mt-1">{trigger.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Trigger-specific parameters */}
                    {strategyData.triggerType && (
                      <Card className="bg-gray-50">
                        <CardContent className="p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Configure Trigger</h4>
                          
                          {strategyData.triggerType === 'twitter' && (
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="keywords">Keywords to Monitor</Label>
                                <Input
                                  id="keywords"
                                  placeholder="e.g., whale, ethereum, $ETH"
                                  className="mt-1"
                                />
                              </div>
                              <p className="text-sm text-gray-600">
                                Separate multiple keywords with commas. Strategy triggers when any keyword is mentioned.
                              </p>
                            </div>
                          )}

                          {strategyData.triggerType === 'transfer' && (
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="amount">Minimum Transfer Amount</Label>
                                <Input
                                  id="amount"
                                  placeholder="e.g., 10000"
                                  className="mt-1"
                                />
                              </div>
                              <p className="text-sm text-gray-600">
                                Strategy triggers when a transfer of this amount or more is detected.
                              </p>
                            </div>
                          )}

                          {strategyData.triggerType === 'price' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="threshold">Price Threshold</Label>
                                  <Input
                                    id="threshold"
                                    placeholder="e.g., 3000"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="direction">Direction</Label>
                                  <Select>
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select direction" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="above">Above threshold</SelectItem>
                                      <SelectItem value="below">Below threshold</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          )}

                          {strategyData.triggerType === 'webhook' && (
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="webhook-url">Webhook URL</Label>
                                <Input
                                  id="webhook-url"
                                  placeholder="https://your-service.com/webhook"
                                  className="mt-1"
                                />
                              </div>
                              <p className="text-sm text-gray-600">
                                Your service should POST to this URL when the event occurs.
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Step 3: Order Parameters */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="order-amount">Order Amount</Label>
                        <Input
                          id="order-amount"
                          placeholder="e.g., 1.5"
                          value={strategyData.orderAmount}
                          onChange={(e) => updateStrategyData('orderAmount', e.target.value)}
                        />
                        <p className="text-sm text-gray-500">Amount of tokens to sell</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="target-price">Target Price</Label>
                        <Input
                          id="target-price"
                          placeholder="e.g., 3100"
                          value={strategyData.targetPrice}
                          onChange={(e) => updateStrategyData('targetPrice', e.target.value)}
                        />
                        <p className="text-sm text-gray-500">Price per token you want to receive</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="slippage">Slippage Tolerance (%)</Label>
                        <Select value={strategyData.slippage} onValueChange={(value) => updateStrategyData('slippage', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.5">0.5%</SelectItem>
                            <SelectItem value="1">1%</SelectItem>
                            <SelectItem value="2">2%</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Order Expiry</Label>
                        <Select value={strategyData.expiry} onValueChange={(value) => updateStrategyData('expiry', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 hour</SelectItem>
                            <SelectItem value="24">24 hours</SelectItem>
                            <SelectItem value="168">1 week</SelectItem>
                            <SelectItem value="720">1 month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900">Order Preview</h4>
                            <p className="text-sm text-blue-700 mt-1">
                              When triggered, sell {strategyData.orderAmount || '0'} tokens at {strategyData.targetPrice || '0'} each
                              with {strategyData.slippage}% slippage tolerance, expiring in {strategyData.expiry} hours.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Step 4: Review & Sign */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Strategy Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium">{strategyData.name || 'Unnamed Strategy'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Token Pair:</span>
                            <span className="font-medium">
                              {TOKENS.find(t => t.address === strategyData.tokenIn)?.symbol || 'N/A'} → {' '}
                              {TOKENS.find(t => t.address === strategyData.tokenOut)?.symbol || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Trigger:</span>
                            <Badge className="bg-blue-100 text-blue-800">
                              {TRIGGER_TYPES[strategyData.triggerType as keyof typeof TRIGGER_TYPES]?.name || 'None'}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Amount:</span>
                            <span className="font-medium">{strategyData.orderAmount || '0'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Target Price:</span>
                            <span className="font-medium">{strategyData.targetPrice || '0'}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Order Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Slippage:</span>
                            <span className="font-medium">{strategyData.slippage}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Expiry:</span>
                            <span className="font-medium">{strategyData.expiry} hours</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Network:</span>
                            <span className="font-medium">Sepolia Testnet</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Protocol:</span>
                            <span className="font-medium">1inch Limit Orders v3</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-yellow-50 border-yellow-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-yellow-900">Ready to Sign</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              You'll need to sign an EIP-712 message to create this limit order. 
                              No gas fees are required for signing.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-center">
                      <Button className="gradient-primary text-white px-8 py-3 text-lg">
                        Sign & Create Strategy
                      </Button>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                  >
                    Previous
                  </Button>
                  
                  {currentStep < steps.length - 1 ? (
                    <Button
                      onClick={handleNext}
                      className="gradient-primary text-white"
                    >
                      Next Step
                    </Button>
                  ) : (
                    <Button
                      className="gradient-primary text-white"
                      onClick={() => {
                        // Handle strategy creation
                        console.log('Creating strategy:', strategyData);
                      }}
                    >
                      Create Strategy
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}