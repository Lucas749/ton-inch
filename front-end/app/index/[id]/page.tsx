import { IndexDetailClient } from "./IndexDetailClient";
import { redirect } from 'next/navigation';

// Generate static params for all available indices
export function generateStaticParams() {
  return [
    // Major Stocks
    { id: 'aapl_stock' },
    { id: 'tsla_stock' },
    { id: 'msft_stock' },
    { id: 'googl_stock' },
    { id: 'amzn_stock' },
    { id: 'meta_stock' },
    { id: 'nvda_stock' },
    
    // ETFs and Indices
    { id: 'spy_etf' },
    { id: 'qqq_etf' },
    { id: 'vix_index' },
    
    // Cryptocurrencies
    { id: 'btc_price' },
    { id: 'eth_price' },
    
    // Commodities
    { id: 'wti_oil' },
    { id: 'brent_oil' },
    { id: 'natural_gas' },
    { id: 'copper_price' },
    { id: 'gold_price' },
    { id: 'wheat_price' },
    { id: 'corn_price' },
    
    // Forex
    { id: 'eur_usd' },
    { id: 'gbp_usd' },
    { id: 'usd_jpy' },
    
    // Economics
    { id: 'us_gdp' },
    { id: 'us_inflation' },
    { id: 'us_unemployment' },
    { id: 'fed_funds_rate' },
    { id: 'treasury_yield' },
    
    // Intelligence
    { id: 'top_gainers' },
    
    // Blockchain Indices (for dynamic routing)
    { id: 'blockchain_0' },
    { id: 'blockchain_1' },
    { id: 'blockchain_2' },
    { id: 'blockchain_3' },
    { id: 'blockchain_4' },
    { id: 'blockchain_5' },
    { id: 'blockchain_6' },
    { id: 'blockchain_7' },
    { id: 'blockchain_8' },
    { id: 'blockchain_9' },
    { id: 'blockchain_10' },
    { id: 'blockchain_11' },
    { id: 'blockchain_12' }
  ];
}

// Comprehensive index details for all supported indices
const indexDetails: Record<string, any> = {
  aapl_stock: {
    id: "AAPL_STOCK",
    name: "Apple Inc.",
    symbol: "AAPL",
    handle: "@apple",
    description: "Apple Inc. stock price tracked in real-time",
    avatar: "🍎",
    color: "bg-blue-500",
    currentValue: 17550,
    price: "$175.50",
    change: "+2.34%",
    changeValue: "+4.08",
    isPositive: true,
    mindshare: "0.52%",
    sentiment: "+54.1%",
    volume24h: "924.91M",
    marketCap: "2.8T",
    chartData: [170, 172, 175, 174, 176, 175, 177, 175, 180, 178, 175],
    communityData: {
      positivePercent: 54.1,
      negativePercent: 45.9,
      totalCalls: "985.87 calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "Gordon",
        handle: "@AltcoinGordon",
        time: "Jul 31",
        content: "Apple earnings looking strong this quarter. Revenue beat expectations across all segments.",
        likes: "3.74K",
        replies: "3.19K",
        retweets: "430",
        views: "639.16K"
      },
      {
        id: 2,
        user: "Tech Analyst",
        handle: "@techanalyst",
        time: "Jul 26", 
        content: "$AAPL continues to show resilience in the current market conditions. Strong fundamentals.",
        likes: "388",
        replies: "121",
        retweets: "58",
        views: "23.42K"
      }
    ]
  },
  btc_price: {
    id: "BTC_PRICE",
    name: "Bitcoin",
    symbol: "BTC",
    handle: "@bitcoin",
    description: "Bitcoin price tracked in real-time",
    avatar: "₿",
    color: "bg-orange-500",
    currentValue: 4350000,
    price: "$43,500",
    change: "+5.67%",
    changeValue: "+2,340",
    isPositive: true,
    mindshare: "1.45%",
    sentiment: "+62.3%",
    volume24h: "1.2B",
    marketCap: "847B",
    chartData: [41000, 42000, 43500, 43000, 44000, 43500, 45000, 43500, 46000, 44500, 43500],
    communityData: {
      positivePercent: 62.3,
      negativePercent: 37.7,
      totalCalls: "2.1K calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "Crypto Bull",
        handle: "@cryptobull",
        time: "Aug 01",
        content: "Bitcoin breaking through key resistance levels. This could be the start of the next bull run.",
        likes: "5.2K",
        replies: "1.8K",
        retweets: "890",
        views: "142.5K"
      }
    ]
  },
  eth_price: {
    id: "ETH_PRICE",
    name: "Ethereum",
    symbol: "ETH",
    handle: "@ethereum",
    description: "Ethereum price tracked in real-time",
    avatar: "Ξ",
    color: "bg-purple-500",
    currentValue: 265000,
    price: "$2,650",
    change: "+3.21%",
    changeValue: "+82.50",
    isPositive: true,
    mindshare: "0.89%",
    sentiment: "+58.7%",
    volume24h: "892M",
    marketCap: "318B",
    chartData: [2500, 2600, 2650, 2580, 2700, 2650, 2680, 2650, 2720, 2680, 2650],
    communityData: {
      positivePercent: 58.7,
      negativePercent: 41.3,
      totalCalls: "1.4K calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "ETH Analyst",
        handle: "@ethanalyst",
        time: "Jul 30",
        content: "Ethereum's upcoming upgrades continue to drive institutional interest. Layer 2 adoption accelerating.",
        likes: "2.8K",
        replies: "945",
        retweets: "512",
        views: "89.3K"
      }
    ]
  },
  gold_price: {
    id: "GOLD_PRICE",
    name: "Gold",
    symbol: "XAU",
    handle: "@gold_price",
    description: "Gold price per ounce tracked in real-time",
    avatar: "🥇",
    color: "bg-yellow-500",
    currentValue: 205000,
    price: "$2,050",
    change: "+1.23%",
    changeValue: "+25.00",
    isPositive: true,
    mindshare: "0.33%",
    sentiment: "+45.2%",
    volume24h: "156M",
    marketCap: "12.8T",
    chartData: [2020, 2030, 2050, 2040, 2055, 2050, 2060, 2050, 2065, 2055, 2050],
    communityData: {
      positivePercent: 45.2,
      negativePercent: 54.8,
      totalCalls: "892 calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "Gold Trader",
        handle: "@goldtrader",
        time: "Aug 01",
        content: "Gold maintaining strong support levels amid global uncertainty. Classic safe haven behavior.",
        likes: "1.2K",
        replies: "456",
        retweets: "234",
        views: "34.5K"
      }
    ]
  },
  eur_usd: {
    id: "EUR_USD",
    name: "EUR/USD",
    symbol: "EURUSD",
    handle: "@eurusd",
    description: "EUR/USD exchange rate tracked in real-time",
    avatar: "💱",
    color: "bg-green-500",
    currentValue: 10850,
    price: "1.0850",
    change: "-0.45%",
    changeValue: "-0.0049",
    isPositive: false,
    mindshare: "0.21%",
    sentiment: "+41.8%",
    volume24h: "2.1B",
    marketCap: "N/A",
    chartData: [1.090, 1.088, 1.085, 1.087, 1.083, 1.085, 1.082, 1.085, 1.081, 1.084, 1.085],
    communityData: {
      positivePercent: 41.8,
      negativePercent: 58.2,
      totalCalls: "567 calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "FX Analyst",
        handle: "@fxanalyst",
        time: "Jul 31",
        content: "EUR/USD consolidating ahead of ECB meeting. Dollar strength continuing to pressure the pair.",
        likes: "892",
        replies: "234",
        retweets: "156",
        views: "23.4K"
      }
    ]
  },
  tsla_stock: {
    id: "TSLA_STOCK",
    name: "Tesla Inc.",
    symbol: "TSLA",
    handle: "@tesla",
    description: "Tesla Inc. stock price tracked in real-time",
    avatar: "🚗",
    color: "bg-red-500",
    currentValue: 24550,
    price: "$245.50",
    change: "+7.89%",
    changeValue: "+17.95",
    isPositive: true,
    mindshare: "0.67%",
    sentiment: "+72.4%",
    volume24h: "1.8B",
    marketCap: "778B",
    chartData: [220, 230, 245, 240, 250, 245, 255, 245, 260, 250, 245],
    communityData: {
      positivePercent: 72.4,
      negativePercent: 27.6,
      totalCalls: "1.8K calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "EV Bull",
        handle: "@evbull",
        time: "Jul 29",
        content: "Tesla's Q2 delivery numbers exceeded expectations. Cybertruck production ramping up nicely.",
        likes: "4.1K",
        replies: "1.2K",
        retweets: "678",
        views: "156.7K"
      }
    ]
  },
  spy_etf: {
    id: "SPY_ETF",
    name: "S&P 500 ETF",
    symbol: "SPY",
    handle: "@spy_etf",
    description: "SPDR S&P 500 ETF Trust tracked in real-time",
    avatar: "📈",
    color: "bg-indigo-500",
    currentValue: 45200,
    price: "$452.00",
    change: "+1.56%",
    changeValue: "+6.95",
    isPositive: true,
    mindshare: "0.44%",
    sentiment: "+51.3%",
    volume24h: "3.2B",
    marketCap: "467B",
    chartData: [440, 445, 452, 448, 455, 452, 458, 452, 460, 455, 452],
    communityData: {
      positivePercent: 51.3,
      negativePercent: 48.7,
      totalCalls: "2.3K calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "Index Trader",
        handle: "@indextrader",
        time: "Jul 31",
        content: "SPY continuing its steady climb. Market showing resilience despite macro headwinds.",
        likes: "1.9K",
        replies: "567",
        retweets: "345",
        views: "67.8K"
      }
    ]
  },
  vix_index: {
    id: "VIX_INDEX",
    name: "VIX Volatility",
    symbol: "VIX",
    handle: "@vix_index",
    description: "CBOE Volatility Index tracked in real-time",
    avatar: "⚡",
    color: "bg-gray-500",
    currentValue: 1875,
    price: "18.75",
    change: "-3.21%",
    changeValue: "-0.62",
    isPositive: false,
    mindshare: "0.19%",
    sentiment: "+38.9%",
    volume24h: "245M",
    marketCap: "N/A",
    chartData: [20, 19.5, 18.75, 19.2, 18.1, 18.75, 17.9, 18.75, 17.5, 18.2, 18.75],
    communityData: {
      positivePercent: 38.9,
      negativePercent: 61.1,
      totalCalls: "445 calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "Vol Trader",
        handle: "@voltrader",
        time: "Aug 01",
        content: "VIX showing signs of complacency. Markets might be underpricing tail risks here.",
        likes: "756",
        replies: "289",
        retweets: "134",
        views: "19.8K"
      }
    ]
  }
};

// Generate fallback data for indices not explicitly defined
function generateFallbackIndexData(indexId: string) {
  // Map of common index patterns to generate appropriate fallback data
  const patterns = {
    '_stock': { category: 'Stocks', avatar: '📈', color: 'bg-blue-500' },
    '_etf': { category: 'ETFs', avatar: '📊', color: 'bg-indigo-500' },
    '_price': { category: 'Crypto', avatar: '💰', color: 'bg-orange-500' },
    '_oil': { category: 'Commodities', avatar: '🛢️', color: 'bg-black' },
    '_usd': { category: 'Forex', avatar: '💱', color: 'bg-green-500' },
    'us_': { category: 'Economics', avatar: '📊', color: 'bg-indigo-600' },
    'top_': { category: 'Intelligence', avatar: '🚀', color: 'bg-green-900' }
  };

  let matchedPattern = null;
  for (const [pattern, data] of Object.entries(patterns)) {
    if (indexId.includes(pattern)) {
      matchedPattern = data;
      break;
    }
  }

  const defaultData = { category: 'Index', avatar: '📈', color: 'bg-gray-500' };
  const patternData = matchedPattern || defaultData;

  return {
    id: indexId.toUpperCase(),
    name: indexId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    symbol: indexId.toUpperCase().replace(/_/g, ''),
    handle: `@${indexId}`,
    description: `${patternData.category} index tracked in real-time with caching`,
    avatar: patternData.avatar,
    color: patternData.color,
    currentValue: 10000,
    price: "$100.00",
    change: "+1.25%",
    changeValue: "+1.23",
    isPositive: true,
    mindshare: "0.15%",
    sentiment: "+52.3%",
    volume24h: "1.2M",
    marketCap: "N/A",
    chartData: [95, 97, 100, 98, 102, 100, 105, 100, 108, 103, 100],
    communityData: {
      positivePercent: 52.3,
      negativePercent: 47.7,
      totalCalls: "125 calls"
    },
    socialFeed: [
      {
        id: 1,
        user: "Market Analyst",
        handle: "@analyst",
        time: "Aug 02",
        content: `${patternData.category} showing strong fundamentals with enhanced caching for real-time data.`,
        likes: "234",
        replies: "45",
        retweets: "12",
        views: "5.6K"
      }
    ]
  };
}

// Server component that handles routing and passes data to client
export default function IndexDetailPage({ params }: { params: { id: string } }) {
  let indexData = indexDetails[params.id];
  
  // Handle blockchain indices - generate data for trading interface
  if (!indexData && params.id.startsWith('blockchain_')) {
    // Extract blockchain index ID from the URL parameter
    const blockchainId = params.id.replace('blockchain_', '');
    
    // Generate blockchain index data with proper names and info
    const blockchainIndexInfo: Record<string, any> = {
      '0': { name: "Inflation Rate", symbol: "$INFL", avatar: "📈", color: "bg-red-600", currentValue: "3.20%", exampleCondition: "Execute when inflation > 4%", category: "Economics" },
      '1': { name: "Elon Followers", symbol: "$ELON", avatar: "🐦", color: "bg-blue-500", currentValue: "150.0M", exampleCondition: "Execute when Elon > 160M followers", category: "Intelligence" },
      '2': { name: "BTC Price", symbol: "$BTC", avatar: "₿", color: "bg-orange-500", currentValue: "$43,000", exampleCondition: "Execute when BTC < $40,000", category: "Crypto" },
      '3': { name: "VIX Index", symbol: "$VIX", avatar: "⚡", color: "bg-gray-500", currentValue: "22.57", exampleCondition: "Execute when VIX > 25", category: "Indices" },
      '4': { name: "Unemployment", symbol: "$UNEMP", avatar: "👥", color: "bg-gray-600", currentValue: "3.70%", exampleCondition: "Execute when unemployment > 4%", category: "Economics" },
      '5': { name: "Tesla Stock", symbol: "$TSLA", avatar: "🚗", color: "bg-red-500", currentValue: "$248.00", exampleCondition: "Execute when Tesla > $250", category: "Stocks" }
    };
    
    const indexInfo = blockchainIndexInfo[blockchainId] || {
      name: `Custom Index ${blockchainId}`,
      symbol: `$IDX${blockchainId}`,
      avatar: "🔗",
      color: "bg-purple-600",
      currentValue: "N/A",
      exampleCondition: "User-defined condition",
      category: "Custom"
    };

    // Generate blockchain index data
    indexData = {
      id: `blockchain_${blockchainId}`,
      name: indexInfo.name,
      symbol: indexInfo.symbol,
      handle: `@${indexInfo.name.toLowerCase().replace(/\s+/g, '_')}`,
      description: `${indexInfo.name} with live oracle data • Current: ${indexInfo.currentValue} • ${indexInfo.exampleCondition}`,
      avatar: indexInfo.avatar,
      color: indexInfo.color,
      currentValue: 10000,
      price: indexInfo.currentValue,
      change: "+1.25%",
      changeValue: "+1.23",
      isPositive: true,
      mindshare: "0.15%",
      sentiment: "+52.3%",
      volume24h: "1.2M",
      marketCap: "N/A",
      chartData: [95, 97, 100, 98, 102, 100, 105, 100, 108, 103, 100],
      socialFeed: [
        {
          id: 1,
          user: "Oracle Analyst",
          handle: "@oracleanalyst",
          time: "Aug 02",
          content: `${indexInfo.name} showing strong fundamentals. ${indexInfo.exampleCondition.toLowerCase()} for optimal trading conditions.`,
          likes: "234",
          replies: "45",
          retweets: "12",
          views: "5.6K"
        }
      ],
      isBlockchainIndex: true,
      blockchainIndexId: parseInt(blockchainId),
      category: indexInfo.category,
      exampleCondition: indexInfo.exampleCondition
    };
  }
  
  // Generate fallback data for indices not explicitly defined
  if (!indexData) {
    indexData = generateFallbackIndexData(params.id);
  }

  return <IndexDetailClient indexData={indexData} />;
}