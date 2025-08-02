export const TRIGGER_TYPES = {
  alphavantage: {
    name: "Alpha Vantage",
    description: "Stock market data and financial indicators",
    tags: ["stocks", "finance", "market data"]
  },
  twitter: {
    name: "Twitter",
    description: "Social media sentiment and trends",
    tags: ["social", "sentiment", "trends"]
  },
  transfer: {
    name: "Token Transfer",
    description: "On-chain token transfer events",
    tags: ["blockchain", "transfers", "tokens"]
  },
  price: {
    name: "Price Feed",
    description: "Real-time price data feeds",
    tags: ["price", "oracle", "feeds"]
  },
  webhook: {
    name: "Webhook",
    description: "Custom webhook triggers",
    tags: ["custom", "api", "webhook"]
  }
};

export const TOKENS = {
  USDC: {
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  WETH: {
    address: "0x4200000000000000000000000000000000000006", 
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18
  }
};
