/**
 * 🔧 Blockchain Constants
 * Contract addresses, ABIs, and operator definitions
 */

// Order operators (matching comprehensive demo)
export const OPERATORS = {
  GT: 0, // Greater Than
  LT: 1, // Less Than
  GTE: 2, // Greater Than or Equal
  LTE: 3, // Less Than or Equal
  EQ: 4, // Equal
};

// Contract addresses from comprehensive demo
export const CONTRACTS = {
  IndexPreInteraction: "0x8AF8db923E96A6709Ae339d1bFb9E986410D8461",
  IndexLimitOrderFactory: "0x0312Af95deFE475B89852ec05Eab5A785f647e73",
  MockIndexOracle: "0x3de6DF18226B2c57328709D9bc68CaA7AD76EdEB",
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  TestUSDC: "0x2026c63430A1B526638bEF55Fea7174220cD3965",
  WETH: "0x4200000000000000000000000000000000000006",
};

// Simplified ABIs for frontend use
export const ABIS = {
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
  MockIndexOracle: [
    {
      type: "function",
      name: "getNextCustomIndexId",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "createCustomIndex",
      inputs: [{ name: "initialValue", type: "uint256" }],
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
      name: "getAllCustomIndices",
      inputs: [],
      outputs: [{ name: "", type: "uint256[]" }],
      stateMutability: "view",
    },
  ],
  IndexPreInteraction: [
    {
      type: "function",
      name: "registerIndex",
      inputs: [
        { name: "name", type: "string" },
        { name: "description", type: "string" },
        { name: "oracle", type: "address" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "getIndexInfo",
      inputs: [{ name: "indexId", type: "uint256" }],
      outputs: [
        { name: "name", type: "string" },
        { name: "description", type: "string" },
        { name: "oracle", type: "address" },
        { name: "creator", type: "address" },
        { name: "isActive", type: "bool" },
        { name: "createdAt", type: "uint256" },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "validateOrder",
      inputs: [
        { name: "indexId", type: "uint256" },
        { name: "operator", type: "uint8" },
        { name: "threshold", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "view",
    },
  ],
  ERC20: [
    {
      type: "function",
      name: "balanceOf",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "transfer",
      inputs: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "approve",
      inputs: [
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "symbol",
      inputs: [],
      outputs: [{ name: "", type: "string" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "decimals",
      inputs: [],
      outputs: [{ name: "", type: "uint8" }],
      stateMutability: "view",
    },
  ],
  IndexLimitOrderFactory: [
    {
      inputs: [
        { name: "salt", type: "uint256" },
        { name: "maker", type: "address" },
        { name: "receiver", type: "address" },
        { name: "makerAsset", type: "address" },
        { name: "takerAsset", type: "address" },
        { name: "makingAmount", type: "uint256" },
        { name: "takingAmount", type: "uint256" },
        { name: "indexId", type: "uint256" },
        { name: "operator", type: "uint8" },
        { name: "thresholdValue", type: "uint256" },
        { name: "expiry", type: "uint40" }
      ],
      name: "createIndexOrder",
      outputs: [
        {
          components: [
            { name: "salt", type: "uint256" },
            { name: "maker", type: "address" },
            { name: "receiver", type: "address" },
            { name: "makerAsset", type: "address" },
            { name: "takerAsset", type: "address" },
            { name: "makingAmount", type: "uint256" },
            { name: "takingAmount", type: "uint256" },
            { name: "makerTraits", type: "bytes32" }
          ],
          name: "",
          type: "tuple"
        },
        { name: "", type: "bytes" }
      ],
      type: "function"
    },
    {
      inputs: [
        {
          components: [
            { name: "salt", type: "uint256" },
            { name: "maker", type: "address" },
            { name: "receiver", type: "address" },
            { name: "makerAsset", type: "address" },
            { name: "takerAsset", type: "address" },
            { name: "makingAmount", type: "uint256" },
            { name: "takingAmount", type: "uint256" },
            { name: "makerTraits", type: "bytes32" }
          ],
          name: "order",
          type: "tuple"
        }
      ],
      name: "getOrderHash",
      outputs: [{ name: "", type: "bytes32" }],
      type: "function"
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          name: "orderHash",
          type: "bytes32"
        },
        {
          indexed: true,
          name: "maker",
          type: "address"
        },
        {
          indexed: true,
          name: "indexId",
          type: "uint256"
        },
        {
          indexed: false,
          name: "operator",
          type: "uint8"
        },
        {
          indexed: false,
          name: "thresholdValue",
          type: "uint256"
        }
      ],
      name: "IndexOrderCreated",
      type: "event"
    }
  ]
};