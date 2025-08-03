/**
 * 🔧 Blockchain Constants
 * Contract addresses, ABIs, and operator definitions
 */

// Oracle types (matching backend system)
export const ORACLE_TYPES = {
  MOCK: 0,
  CHAINLINK: 1
};

export const ORACLE_TYPE_NAMES = {
  0: 'Mock Oracle',
  1: 'Chainlink Functions'
} as const;

// Order operators (matching new backend system)
export const OPERATORS = {
  GT: 1, // Greater Than
  LT: 2, // Less Than  
  GTE: 3, // Greater Than or Equal
  LTE: 4, // Less Than or Equal
  EQ: 5, // Equal
  NEQ: 6, // Not Equal
};

// Index mappings (matching actual oracle indices)
export const INDICES = {
  INFLATION_RATE: {
    id: 0,
    name: 'Inflation Rate',
    symbol: 'INF',
    description: 'US Inflation Rate',
    unit: 'Percentage (basis points)',
    alphaVantageSymbol: 'INFLATION', 
    category: 'Economic',
  },
  ELON_FOLLOWERS: {
    id: 1,
    name: 'Elon Followers',
    symbol: 'ELON',
    description: 'Elon Musk Twitter/X followers',
    unit: 'Millions (basis points)',
    alphaVantageSymbol: 'ELON',
    category: 'Social',
  },
  BTC_PRICE: {
    id: 2,
    name: 'BTC Price',
    symbol: 'BTC',
    description: 'Bitcoin price in USD',
    unit: 'USD (basis points)',
    alphaVantageSymbol: 'BTC',
    category: 'Crypto',
  },
  VIX_INDEX: {
    id: 3,
    name: 'VIX Index',
    symbol: 'VIX',
    description: 'CBOE Volatility Index',
    unit: 'Index points (basis points)',
    alphaVantageSymbol: 'VIX',
    category: 'Indices',
  },
  UNEMPLOYMENT: {
    id: 4,
    name: 'Unemployment',
    symbol: 'UNEMP',
    description: 'US Unemployment Rate',
    unit: 'Percentage (basis points)',
    alphaVantageSymbol: 'UNEMPLOYMENT',
    category: 'Economic',
  },
  TESLA_STOCK: {
    id: 5,
    name: 'Tesla Stock',
    symbol: 'TSLA',
    description: 'Tesla Inc. stock price',
    unit: 'USD (basis points)',
    alphaVantageSymbol: 'TSLA',
    category: 'Stocks',
  },
};

// Contract addresses - Base Mainnet (New Architecture)
export const CONTRACTS = {
  // ONLY contract we need - Hybrid Oracle for index data
  IndexOracle: "0x3073D2b5e72c48f16Ee99700BC07737b8ecd8709", // Hybrid Oracle (Base Mainnet)
  
  // Base Mainnet token addresses
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet USDC
  WETH: "0x4200000000000000000000000000000000000006", // Base Mainnet WETH
  DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // Base Mainnet DAI
  
  // 1inch Protocol v4 on Base Mainnet (used directly via SDK)
  OneInchProtocol: "0x111111125421cA6dc452d289314280a0f8842A65", // 1inch v4 router
};

// Simplified ABIs for frontend use
export const ABIS = {
  // Standard ERC20 ABI for real tokens (USDC, WETH, etc.)
  ERC20: [
    {
      "inputs": [{"name": "account", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"name": "spender", "type": "address"},
        {"name": "value", "type": "uint256"}
      ],
      "name": "approve",
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"name": "owner", "type": "address"},
        {"name": "spender", "type": "address"}
      ],
      "name": "allowance",
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [{"name": "", "type": "uint8"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [{"name": "", "type": "string"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [{"name": "", "type": "string"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"name": "to", "type": "address"},
        {"name": "value", "type": "uint256"}
      ],
      "name": "transfer",
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"name": "from", "type": "address"},
        {"name": "to", "type": "address"},
        {"name": "value", "type": "uint256"}
      ],
      "name": "transferFrom",
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  TestToken: [
    {
      "inputs": [
        {"name": "to", "type": "address"},
        {"name": "value", "type": "uint256"}
      ],
      "name": "mint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"name": "spender", "type": "address"},
        {"name": "value", "type": "uint256"}
      ],
      "name": "approve",
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"name": "account", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [{"name": "", "type": "uint8"}],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  // New Hybrid Oracle ABI (supports both mock and Chainlink data)
  IndexOracle: [
    {
      type: "function",
      name: "getIndexValue",
      inputs: [{ name: "indexType", type: "uint8" }],
      outputs: [
        { name: "value", type: "uint256" },
        { name: "timestamp", type: "uint256" },
      ],
      stateMutability: "view",
    },
    {
      type: "function", 
      name: "getIndexValue",
      inputs: [{ name: "indexId", type: "uint256" }],
      outputs: [
        { name: "value", type: "uint256" },
        { name: "timestamp", type: "uint256" },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "isValidIndex",
      inputs: [{ name: "indexType", type: "uint8" }],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "getNextCustomIndexId", 
      inputs: [],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "getAllCustomIndices",
      inputs: [],
      outputs: [
        { name: "indexIds", type: "uint256[]" },
        { name: "values", type: "uint256[]" },
        { name: "timestamps", type: "uint256[]" },
        { name: "activeStates", type: "bool[]" },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "createCustomIndex",
      inputs: [
        { name: "initialValue", type: "uint256" },
        { name: "sourceUrl", type: "string" },
        { name: "oracleType", type: "uint8" },
        { name: "chainlinkOracleAddress", type: "address" },
      ],
      outputs: [{ name: "indexId", type: "uint256" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "updateIndex",
      inputs: [
        { name: "indexType", type: "uint8" },
        { name: "newValue", type: "uint256" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "updateCustomIndex",
      inputs: [
        { name: "indexId", type: "uint256" },
        { name: "newValue", type: "uint256" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "setIndexActive",
      inputs: [
        { name: "indexType", type: "uint8" },
        { name: "isActive", type: "bool" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function", 
      name: "getHybridOracleStatus",
      inputs: [],
      outputs: [
        { name: "chainlinkAddress", type: "address" },
        { name: "isChainlinkConfigured", type: "bool" },
        { name: "mockIndicesCount", type: "uint256" },
        { name: "chainlinkIndicesCount", type: "uint256" },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "owner",
      inputs: [],
      outputs: [{ name: "", type: "address" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "customIndexData",
      inputs: [{ name: "indexId", type: "uint256" }],
      outputs: [
        { name: "value", type: "uint256" },
        { name: "timestamp", type: "uint256" },
        { name: "sourceUrl", type: "string" },
        { name: "isActive", type: "bool" },
        { name: "oracleType", type: "uint8" }
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "indexData",
      inputs: [{ name: "indexType", type: "uint8" }],
      outputs: [
        { name: "value", type: "uint256" },
        { name: "timestamp", type: "uint256" },
        { name: "sourceUrl", type: "string" },
        { name: "isActive", type: "bool" },
        { name: "oracleType", type: "uint8" }
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "createCustomIndex",
      inputs: [
        { name: "initialValue", type: "uint256" },
        { name: "sourceUrl", type: "string" },
        { name: "oracleType", type: "uint8" },
        { name: "chainlinkOracleAddress", type: "address" }
      ],
      outputs: [{ name: "indexId", type: "uint256" }],
      stateMutability: "nonpayable",
    },
    // Oracle Management Functions
    {
      type: "function",
      name: "setIndexOracleType",
      inputs: [
        { name: "indexId", type: "uint256" },
        { name: "oracleType", type: "uint8" }
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "setCustomIndexOracleType",
      inputs: [
        { name: "indexId", type: "uint256" },
        { name: "oracleType", type: "uint8" }
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "getIndexOracleType",
      inputs: [{ name: "indexId", type: "uint256" }],
      outputs: [{ name: "oracleType", type: "uint8" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "setCustomIndexActive",
      inputs: [
        { name: "indexId", type: "uint256" },
        { name: "isActive", type: "bool" }
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
  ],
  // Removed IndexPreInteraction - not needed in new architecture
  // Removed IndexLimitOrderFactory - using 1inch SDK directly
  // 1inch Protocol v4 Functions for order management
  OneInchProtocol: [
    {
      inputs: [
        { name: "orderHash", type: "bytes32" }
      ],
      name: "cancelOrder",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        { name: "orderHash", type: "bytes32" }
      ],
      name: "remaining",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    }
  ]
};

