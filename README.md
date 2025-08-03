# 🌍 c1nch

> **Trade on real-world events, not just prices.** Execute sophisticated limit orders triggered by inflation rates, social media metrics, economic indicators, and any custom data source through our advanced oracle-powered trading protocol.

[![Base](https://img.shields.io/badge/Base-Mainnet-blue)](https://base.org)
[![1inch](https://img.shields.io/badge/1inch-Limit%20Orders-orange)](https://1inch.io)
[![Chainlink](https://img.shields.io/badge/Chainlink-Functions-red)](https://functions.chain.link)

🌐 **Website**: [https://c1nch.xyz/](https://c1nch.xyz/)

## 🎯 What We Built

An advanced limit order protocol that enables users to create conditional trades based on **real-world events and indices** rather than just token prices. Trade when:

- 📈 **Inflation passes 5%** → Buy BTC as a hedge
- 🐦 **Elon Musk reaches 200M followers** → Buy meme tokens  
- 📊 **VIX volatility spikes above 30** → Execute defensive strategies
- 🏢 **MicroStrategy EPS exceeds $40** → Buy more Bitcoin
- 🎯 **Any custom metric** → Execute your strategy

## 🌟 Frontend Application

### 🚀 Complete Trading Interface

Our Next.js frontend provides a **professional-grade trading platform** with advanced features:

#### **💼 AlphaVantage Data Explorer**
- **60+ Technical Indicators**: SMA, EMA, RSI, MACD, Bollinger Bands, VWAP, ATR
- **Real-Time Market Data**: Stocks, forex, crypto, commodities, economic indicators
- **Advanced Charting**: Interactive charts with technical analysis tools
- **Comprehensive Data Sources**: 
  - Core Stock APIs (time series, quotes, search)
  - Alpha Intelligence™ (top gainers/losers, insider transactions)
  - Economic Indicators (GDP, inflation, unemployment, treasury yields)
  - Commodities (WTI oil, Brent, natural gas, metals, agriculture)
  - Forex (currency exchange rates and time series)
  - Cryptocurrency data with intraday and historical series
  - News & Sentiment analysis with AI-powered sentiment scoring

#### **⚡ Advanced Swap Interface**
- **Dual Trading Modes**:
  - **Classic Swaps**: Instant execution with gas fees
  - **Gasless Fusion**: Intent-based swaps with no gas fees
- **Smart Balance Management**: Real-time balance checking and MAX buttons
- **Slippage Protection**: Customizable slippage tolerance
- **Transaction Tracking**: Complete swap history with BaseScan integration
- **Token Selection**: Comprehensive token selector with popular tokens

#### **📊 Order Management System**
- **Complete Order History**: Track all swaps, fusion orders, and limit orders
- **Real-Time Status Updates**: Monitor order execution and fills
- **Advanced Filtering**: Filter by order type, status, and wallet
- **Order Statistics**: Comprehensive success/failure analytics
- **Transaction Links**: Direct links to blockchain explorers

### 🔧 API Infrastructure

#### **📡 AlphaVantage API Proxy** (`/api/alphavantage`)
```typescript
// Comprehensive financial data API with caching
const response = await fetch('/api/alphavantage', {
  method: 'GET',
  params: {
    function: 'TIME_SERIES_DAILY',
    symbol: 'AAPL',
    interval: 'daily',
    outputsize: 'compact'
  }
});
```

**Features:**
- **Advanced Caching**: Intelligent CSV-based caching system
- **Data Validation**: Robust response validation for all endpoints
- **Error Handling**: Comprehensive error recovery and retry logic
- **Rate Limiting**: Built-in rate limiting and quota management
- **Cache Statistics**: Real-time cache performance metrics

#### **🔄 1inch Integration APIs**
- **`/api/oneinch/quote`**: Get swap quotes and estimates
- **`/api/oneinch/swap`**: Execute instant swaps
- **`/api/oneinch/fusion`**: Create gasless intent swaps
- **`/api/oneinch/approve`**: Token approval management
- **`/api/oneinch/tokens`**: Token information and metadata

#### **🏛️ Oracle Data API** (`/api/oracle`)
```typescript
// Real-time oracle data access
const oracleData = await fetch('/api/oracle', {
  method: 'GET',
  params: { indexId: 0 } // Inflation rate
});
```

#### **📋 Order Tracking API** (`/api/orders`)
- Order creation and submission
- Status monitoring and updates
- Historical order retrieval
- Order cancellation management

### 🎨 Advanced UI Components

#### **🔍 Index Explorer**
- **Live Index Monitoring**: Real-time value updates
- **Custom Index Creation**: Build your own data indices
- **Category-Based Browsing**: Organized by data types
- **Search & Filter**: Find specific indices quickly

#### **💰 Wallet Integration**
- **Multi-Wallet Support**: MetaMask, WalletConnect, and more
- **Real-Time Balances**: Live ETH and token balance tracking
- **Transaction Management**: Comprehensive transaction history
- **Error Handling**: User-friendly error messages and recovery

#### **📈 Data Visualization**
- **Interactive Charts**: Recharts-based charting system
- **Technical Analysis**: Built-in technical indicators
- **Real-Time Updates**: Live data streaming
- **Export Capabilities**: Download charts and data

### 🗄️ Intelligent Caching System

Our advanced caching system provides **enterprise-grade performance**:

```typescript
class ServerCSVCacheService {
  // Intelligent cache management
  shouldUseCache(symbol: string, functionName: string, interval?: string): boolean
  getCachedData(symbol: string, functionName: string, interval?: string): any
  cacheData(symbol: string, functionName: string, interval: string, data: any): void
  cleanupOldCache(): void
  getCacheStats(): CacheStats
}
```

**Features:**
- **CSV-Based Storage**: Efficient file-based caching
- **Intelligent Expiration**: Smart cache invalidation
- **Performance Metrics**: Real-time cache hit/miss statistics
- **Memory Management**: Automatic cleanup and optimization
- **Serverless Compatible**: Works in Vercel and other serverless environments

## ✨ Key Features

- **🔮 Real-World Triggers**: Orders execute based on external data, not just token prices
- **🛡️ Trustless Oracles**: Powered by Chainlink Functions for reliable data feeds
- **⚡ Multiple Operators**: Support for `>`, `<`, `=`, `>=`, `<=`, `!=` comparisons
- **🎨 Flexible Indices**: Track inflation, stock prices, social metrics, economic indicators
- **💪 1inch Integration**: Built on battle-tested 1inch Limit Order Protocol
- **🔗 On-Chain Predicates**: All logic verifiable and transparent on Base
- **🌐 Professional Frontend**: Complete trading interface with advanced features
- **📊 Comprehensive Analytics**: Real-time data visualization and monitoring
- **💾 Advanced Caching**: Enterprise-grade data caching and management
- **🔄 Multi-Modal Trading**: Classic swaps and gasless fusion orders

## 🏗️ Architecture Flow

### How It Works

1. **User Creates Order**: Define what to trade and under what conditions
2. **Set Index Condition**: Choose from available indices (inflation, followers, etc.)
3. **Define Threshold**: Set trigger value with comparison operator
4. **Create Predicate**: Generate on-chain condition logic
5. **Submit to 1inch**: Order waits in the protocol until conditions are met
6. **Oracle Updates**: Chainlink Functions continuously update real-world data
7. **Condition Check**: Arbitrageurs check if predicates are satisfied
8. **Automatic Execution**: Trade executes when conditions are met

## 🛠️ Tech Stack

### Core Infrastructure
- **Base Mainnet**: L2 blockchain for fast, cheap transactions
- **1inch Limit Order Protocol**: Decentralized order matching
- **Chainlink Functions**: Decentralized oracle network
- **Ethers.js**: Ethereum interaction library

### Frontend Stack
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Modern component library
- **Recharts**: Advanced data visualization
- **Lucide Icons**: Beautiful icon system

### Backend Services
- **Node.js**: Server runtime
- **1inch SDK**: Order creation and management
- **Custom Oracle Manager**: Index data aggregation
- **AlphaVantage API**: Comprehensive financial data
- **CSV Caching System**: High-performance data caching

### Smart Contracts
- **Index Oracle Contract**: `0x3073D2b5e72c48f16Ee99700BC07737b8ecd8709`
- **EPS Consumer Contract**: `0xc4e07abf90c493968cd9216320c2349f9490552b`
- **1inch Limit Order Protocol**: `0x111111125421cA6dc452d289314280a0f8842A65`

## 📊 Available Indices

| Index | ID | Description | Current Value | Example Trigger |
|-------|----|-----------| -------------|----------------|
| **Inflation Rate** | 0 | US Inflation Rate | 3.20% | Execute when inflation > 4% |
| **Elon Followers** | 1 | Elon Musk X/Twitter followers | 150.0M | Execute when followers > 160M |
| **BTC Price** | 2 | Bitcoin price in USD | $43,000 | Execute when BTC < $40,000 |
| **VIX Index** | 3 | CBOE Volatility Index | 22.57 | Execute when VIX > 25 |
| **Unemployment** | 4 | US Unemployment Rate | 3.70% | Execute when unemployment > 4% |
| **Tesla Stock** | 5 | Tesla Inc. stock price | $248.00 | Execute when Tesla > $250 |

## 🔧 Core Implementation

### Main Order Creation Function

The heart of our system is the `createIndexBasedOrder` function in [`backend/src/index-order-creator.js`](./backend/src/index-order-creator.js):

```javascript
/**
 * Create a 1inch limit order with index-based predicate
 * 
 * @param {OrderParams} params - Order parameters
 * @returns {Promise<Object>} Order creation result
 */
async function createIndexBasedOrder(params) {
    // 1. Validate parameters
    const validation = validateOrderParams(params);
    
    // 2. Setup wallet and 1inch SDK
    const wallet = new Wallet(params.privateKey);
    const sdk = new Sdk({
        authKey: params.oneInchApiKey,
        networkId: CONFIG.CHAIN_ID,
        httpConnector: new FetchProviderConnector()
    });
    
    // 3. Parse tokens and amounts
    const fromToken = getTokenInfo(params.fromToken);
    const toToken = getTokenInfo(params.toToken);
    const makingAmount = ethers.utils.parseUnits(params.amount, fromToken.decimals);
    const takingAmount = ethers.utils.parseUnits(params.expectedAmount, toToken.decimals);
    
    // 4. Create index predicate
    const predicate = createIndexPredicate(params.condition);
    
    // 5. Build extension with predicate
    const extension = new ExtensionBuilder()
        .withPredicate(predicate)
        .build();
    
    // 6. Create and sign order
    const order = await sdk.createOrder({
        makerAsset: new Address(fromToken.address),
        takerAsset: new Address(toToken.address),
        makingAmount: makingAmount,
        takingAmount: takingAmount,
        maker: new Address(wallet.address),
        extension: extension.encode()
    }, makerTraits);
    
    // 7. Submit to 1inch protocol
    const submitResult = await sdk.submitOrder(order, signature);
    
    return result;
}
```

### Predicate Creation Logic

The **predicate system** is where the magic happens. Our `createIndexPredicate` function encodes oracle calls into 1inch-compatible predicates:

```javascript
/**
 * Create index predicate for 1inch
 * Encodes: operator(threshold, arbitraryStaticCall(oracle, getIndexValue(indexId)))
 */
function createIndexPredicate(condition) {
    // 1. Encode oracle call: getIndexValue(uint256 indexId)
    const getIndexValueSelector = ethers.utils.id('getIndexValue(uint256)').slice(0, 10);
    const oracleCallData = ethers.utils.defaultAbiCoder.encode(
        ['bytes4', 'uint256'],
        [getIndexValueSelector, condition.indexId]
    );
    
    // 2. Create arbitraryStaticCall data
    const arbitraryStaticCallData = ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes'],
        [CONFIG.INDEX_ORACLE_ADDRESS, oracleCallData]
    );
    
    // 3. Build predicate based on operator
    let predicateData;
    switch (condition.operator) {
        case 'gt':
        case 'gte':
            predicateData = ethers.utils.defaultAbiCoder.encode(
                ['uint256', 'bytes'],
                [condition.threshold, arbitraryStaticCallData]
            );
            break;
        // ... other operators
    }
    
    // 4. Complete predicate with protocol address
    const completePredicate = ethers.utils.solidityPack(
        ['address', 'bytes'],
        [CONFIG.LIMIT_ORDER_PROTOCOL, predicateData]
    );
    
    return completePredicate;
}
```

### Supported Operators

Our system supports comprehensive comparison operations:

```javascript
const OPERATORS = {
    GREATER_THAN: { value: 'gt', symbol: '>', description: 'Execute when index > threshold' },
    LESS_THAN: { value: 'lt', symbol: '<', description: 'Execute when index < threshold' },
    EQUAL: { value: 'eq', symbol: '=', description: 'Execute when index = threshold' },
    GREATER_EQUAL: { value: 'gte', symbol: '>=', description: 'Execute when index >= threshold' },
    LESS_EQUAL: { value: 'lte', symbol: '<=', description: 'Execute when index <= threshold' },
    NOT_EQUAL: { value: 'neq', symbol: '!=', description: 'Execute when index != threshold' }
};
```

## 🚀 Usage Examples

### Creating a Conditional Order

```javascript
const orderParams = {
    fromToken: 'USDC',                    // Sell USDC
    toToken: 'WETH',                      // Buy WETH
    amount: '1000',                       // Sell 1000 USDC
    expectedAmount: '0.3',                // Expect 0.3 WETH
    condition: {
        indexId: 0,                       // Inflation Rate index
        operator: 'gt',                   // Greater than
        threshold: 500,                   // 5.00% (in basis points)
        description: 'Inflation Rate > 5%'
    },
    expirationHours: 168,                 // Expires in 1 week
    privateKey: process.env.PRIVATE_KEY,
    oneInchApiKey: process.env.ONEINCH_API_KEY
};

const result = await createIndexBasedOrder(orderParams);
console.log('Order created:', result.orderHash);
```

### Real-World Trading Scenarios

#### 1. Inflation Hedge Strategy
```javascript
// Buy BTC when inflation exceeds 4%
{
    fromToken: 'USDC',
    toToken: 'WBTC', 
    amount: '10000',
    condition: {
        indexId: 0,  // Inflation Rate
        operator: 'gt',
        threshold: 400,  // 4.00%
        description: 'Inflation > 4% - Buy BTC hedge'
    }
}
```

#### 2. Volatility Breakout
```javascript
// Buy volatility when VIX spikes
{
    fromToken: 'USDC',
    toToken: 'WETH',
    amount: '5000', 
    condition: {
        indexId: 3,  // VIX Index
        operator: 'gt',
        threshold: 3000,  // VIX > 30
        description: 'VIX spike > 30 - Volatility play'
    }
}
```

#### 3. Social Media Momentum
```javascript
// Ride Elon's influence
{
    fromToken: 'USDC',
    toToken: 'DOGE',
    amount: '1000',
    condition: {
        indexId: 1,  // Elon Followers
        operator: 'gt', 
        threshold: 16000,  // 160M followers
        description: 'Elon > 160M followers - Meme momentum'
    }
}
```

## 🔗 Deployed Contracts

### Base Mainnet Deployments

| Contract | Address | Purpose |
|----------|---------|---------|
| **Index Oracle** | [`0x3073D2b5e72c48f16Ee99700BC07737b8ecd8709`](https://basescan.org/address/0x3073D2b5e72c48f16Ee99700BC07737b8ecd8709#code) | Main oracle aggregating all indices |
| **EPS Consumer** | [`0xc4e07abf90c493968cd9216320c2349f9490552b`](https://basescan.org/address/0xc4e07abf90c493968cd9216320c2349f9490552b#code) | MicroStrategy EPS tracking |
| **1inch Protocol** | `0x111111125421cA6dc452d289314280a0f8842A65` | Limit order execution |

### Chainlink Infrastructure

- **Functions Subscription**: [Base Subscription #65](https://functions.chain.link/base/65)
- **Network**: Chainlink Functions on Base
- **Update Frequency**: Real-time data feeds

### Deployment Account

- **Deployer Address**: `0xbD117D425FBaE03daf1F4e015e0b8Da54F93640d`
- **Network**: Base Mainnet
- **Purpose**: Test and deployment account for all contracts

## 🎯 Token Support

Currently supported tokens on Base:

| Token | Symbol | Address | Decimals |
|-------|--------|---------|----------|
| USD Coin | USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 |
| Wrapped Ether | WETH | `0x4200000000000000000000000000000000000006` | 18 |
| 1inch Token | 1INCH | `0xc5fecc3a29fb57b5024eec8a2239d4621e111cce` | 18 |
| Dai Stablecoin | DAI | `0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb` | 18 |

## 🔧 Setup & Installation

### Prerequisites
```bash
# Install dependencies
npm install

# Environment variables
cp .env.example .env
# Add your PRIVATE_KEY and ONEINCH_API_KEY
```

### Running Examples
```bash
# Run the example order creation
cd backend
node src/index-order-creator.js

# Test order creation
npm run test:orders
```

## 📚 API Reference

### Function Signatures

```typescript
// Main order creation function
createIndexBasedOrder(params: OrderParams): Promise<OrderResult>

// Parameter validation
validateOrderParams(params: OrderParams): ValidationResult

// Token information lookup  
getTokenInfo(tokenInput: string): TokenInfo

// Predicate generation
createIndexPredicate(condition: IndexCondition): string
```

### Type Definitions

```typescript
interface OrderParams {
    fromToken: string;           // Token symbol or address to sell
    toToken: string;             // Token symbol or address to buy
    amount: string;              // Amount to sell (in token units)
    expectedAmount: string;      // Expected amount to receive
    condition: IndexCondition;   // Index-based condition
    expirationHours?: number;    // Order expiration (default: 24)
    privateKey: string;          // Wallet private key
    oneInchApiKey: string;       // 1inch API key
}

interface IndexCondition {
    indexId: number;             // Index ID (0-5)
    operator: string;            // Comparison operator
    threshold: number;           // Threshold value in basis points
    description: string;         // Human-readable description
}
```

## 🌟 Why This Matters

Traditional DeFi limit orders are restricted to price-based conditions. Our protocol **breaks this barrier** by enabling:

- **📈 Macro Trading**: Trade on economic indicators and policy changes
- **🎯 Event-Driven Strategies**: Execute based on real-world events
- **🤖 Automated Responses**: Set-and-forget conditional logic
- **🔗 Verifiable Execution**: All conditions transparent on-chain
- **⚡ No Manual Monitoring**: Orders execute automatically when conditions are met

## 🚀 Future Roadmap

- [ ] **More Indices**: Add commodity prices, weather data, political events
- [ ] **Advanced Logic**: Support for AND/OR conditions across multiple indices  
- [ ] **Mobile App**: User-friendly interface for creating conditional orders
- [ ] **Portfolio Strategies**: Template strategies for common scenarios
- [ ] **Cross-Chain**: Expand to other EVM networks

## 🤝 Contributing

We welcome contributions! Areas where you can help:

- **New Data Sources**: Integrate additional real-world indices
- **Frontend Development**: Build user interfaces
- **Strategy Templates**: Create common trading strategies
- **Documentation**: Improve guides and examples

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Built with ❤️ by the c1nch**

*Transforming how DeFi thinks about conditional orders - from simple price limits to complex real-world event triggers.*