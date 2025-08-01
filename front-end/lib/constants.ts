// Contract addresses for Sepolia testnet
export const CONTRACTS = {
  LIMIT_ORDER_PROTOCOL: '0x11431eE5c3b1EC7012c8a67CD7Cf9e7C1C788e4A', // 1inch Limit Order Protocol v3
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  USDC: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
  DAI: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
} as const;

// Common token list for Sepolia testnet
export const TOKENS = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: CONTRACTS.WETH,
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: CONTRACTS.USDC,
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xa0b86a33e6441b8d8c2e5c4e77ed1c847b8ace14.png'
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: CONTRACTS.DAI,
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png'
  }
] as const;

// Trigger type configurations
export const TRIGGER_TYPES = {
  alphavantage: {
    name: 'Alpha Vantage Data',
    description: 'Trigger based on financial market data and indicators',
    icon: 'BarChart3',
    fields: ['dataType', 'symbol', 'indicator', 'threshold', 'condition']
  },
  twitter: {
    name: 'Twitter Keywords',
    description: 'Monitor Twitter for specific keywords or hashtags',
    icon: 'Twitter',
    fields: ['keywords']
  },
  transfer: {
    name: 'Large Transfer',
    description: 'Detect large on-chain token transfers',
    icon: 'Send',
    fields: ['amount', 'token']
  },
  price: {
    name: 'Price Threshold',
    description: 'Trigger when token price crosses a threshold',
    icon: 'TrendingUp',
    fields: ['threshold', 'direction']
  },
  webhook: {
    name: 'Custom Webhook',
    description: 'Custom event via HTTP webhook',
    icon: 'Webhook',
    fields: ['webhookUrl', 'secret']
  }
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 11155111, // Sepolia
  name: 'Sepolia',
  rpcUrl: 'https://sepolia.infura.io/v3/your-infura-key',
  blockExplorer: 'https://sepolia.etherscan.io',
} as const;