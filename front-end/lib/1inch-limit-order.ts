import { encodeFunctionData, keccak256, encodePacked, getAddress, encodeAbiParameters } from 'viem';

// 1inch Limit Order Protocol v4 ABI (real)
export const LIMIT_ORDER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'salt', type: 'uint256' },
          { name: 'maker', type: 'uint256' },     // Address wrapped as uint256
          { name: 'receiver', type: 'uint256' },  // Address wrapped as uint256
          { name: 'makerAsset', type: 'uint256' },// Address wrapped as uint256
          { name: 'takerAsset', type: 'uint256' },// Address wrapped as uint256
          { name: 'makingAmount', type: 'uint256' },
          { name: 'takingAmount', type: 'uint256' },
          { name: 'makerTraits', type: 'uint256' }
        ],
        name: 'order',
        type: 'tuple'
      },
      { name: 'r', type: 'bytes32' },
      { name: 'vs', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'takerTraits', type: 'uint256' }
    ],
    name: 'fillOrder',
    outputs: [
      { name: 'makingAmount', type: 'uint256' },
      { name: 'takingAmount', type: 'uint256' },
      { name: 'orderHash', type: 'bytes32' }
    ],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { name: 'salt', type: 'uint256' },
          { name: 'maker', type: 'uint256' },
          { name: 'receiver', type: 'uint256' },
          { name: 'makerAsset', type: 'uint256' },
          { name: 'takerAsset', type: 'uint256' },
          { name: 'makingAmount', type: 'uint256' },
          { name: 'takingAmount', type: 'uint256' },
          { name: 'makerTraits', type: 'uint256' }
        ],
        name: 'order',
        type: 'tuple'
      },
      { name: 'r', type: 'bytes32' },
      { name: 'vs', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'takerTraits', type: 'uint256' },
      { name: 'args', type: 'bytes' }
    ],
    name: 'fillOrderArgs',
    outputs: [
      { name: 'makingAmount', type: 'uint256' },
      { name: 'takingAmount', type: 'uint256' },
      { name: 'orderHash', type: 'bytes32' }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
] as const;

// Factory contract ABI for creating index orders
export const INDEX_FACTORY_ABI = [
  {
    inputs: [
      { name: 'salt', type: 'uint256' },
      { name: 'maker', type: 'address' },
      { name: 'receiver', type: 'address' },
      { name: 'makerAsset', type: 'address' },
      { name: 'takerAsset', type: 'address' },
      { name: 'makingAmount', type: 'uint256' },
      { name: 'takingAmount', type: 'uint256' },
      { name: 'indexType', type: 'uint8' },
      { name: 'operator', type: 'uint8' },
      { name: 'thresholdValue', type: 'uint256' },
      { name: 'expiry', type: 'uint40' }
    ],
    name: 'createIndexOrder',
    outputs: [
      {
        components: [
          { name: 'salt', type: 'uint256' },
          { name: 'maker', type: 'uint256' },
          { name: 'receiver', type: 'uint256' },
          { name: 'makerAsset', type: 'uint256' },
          { name: 'takerAsset', type: 'uint256' },
          { name: 'makingAmount', type: 'uint256' },
          { name: 'takingAmount', type: 'uint256' },
          { name: 'makerTraits', type: 'uint256' }
        ],
        name: 'order',
        type: 'tuple'
      },
      { name: 'extension', type: 'bytes' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

export interface LimitOrderData {
  salt: bigint;
  maker: bigint;      // Address as uint256
  receiver: bigint;   // Address as uint256
  makerAsset: bigint; // Address as uint256
  takerAsset: bigint; // Address as uint256
  makingAmount: bigint;
  takingAmount: bigint;
  makerTraits: bigint;
}

export interface IndexCondition {
  indexType: number;      // 0-5 for different indices
  operator: number;       // 0-4 for comparison operators  
  thresholdValue: bigint; // Threshold value scaled appropriately
}

export interface OrderSignature {
  v: number;
  r: string;
  s: string;
}

/**
 * Create a 1inch limit order structure with index condition
 */
export function createIndexLimitOrder({
  maker,
  receiver,
  makerAsset,
  takerAsset,
  makingAmount,
  takingAmount,
  condition,
  expiry = 0,
  salt = BigInt(Math.floor(Math.random() * 1000000))
}: {
  maker: string;
  receiver?: string;
  makerAsset: string;
  takerAsset: string;
  makingAmount: bigint;
  takingAmount: bigint;
  condition: IndexCondition;
  expiry?: number;
  salt?: bigint;
}): { order: LimitOrderData; extension: string } {
  // Convert addresses to uint256 format
  const makerUint = BigInt(getAddress(maker));
  const receiverUint = receiver ? BigInt(getAddress(receiver)) : makerUint;
  const makerAssetUint = BigInt(getAddress(makerAsset));
  const takerAssetUint = BigInt(getAddress(takerAsset));
  
  // Create makerTraits with PreInteraction flags
  let traits = 0n;
  
  // Set PRE_INTERACTION_CALL_FLAG (bit 252)
  traits |= (1n << 252n);
  
  // Set HAS_EXTENSION_FLAG (bit 249)
  traits |= (1n << 249n);
  
  // Set expiry if provided (bits 80-119)
  if (expiry > 0) {
    traits |= (BigInt(expiry) << 80n);
  }
  
  const order: LimitOrderData = {
    salt,
    maker: makerUint,
    receiver: receiverUint,
    makerAsset: makerAssetUint,
    takerAsset: takerAssetUint,
    makingAmount,
    takingAmount,
    makerTraits: traits
  };
  
  // Create extension data for preInteraction
  const extension = createExtensionData(condition);
  
  return { order, extension };
}

/**
 * Create extension data with preInteraction information
 */
function createExtensionData(condition: IndexCondition): string {
  // This would need to be replaced with actual contract addresses after deployment
  const preInteractionContract = "0x0000000000000000000000000000000000000000"; // Placeholder
  
  // Encode preInteraction data: [contract address (20 bytes)][indexType (1)][operator (1)][threshold (32)]
  const preInteractionData = encodePacked(
    ['address', 'uint8', 'uint8', 'uint256'],
    [preInteractionContract as `0x${string}`, condition.indexType, condition.operator, condition.thresholdValue]
  );
  
  // Create extension with proper offsets (field 6 is PreInteractionData)
  const offsets = BigInt(preInteractionData.length) << (8n * (31n - 6n));
  
  return encodePacked(
    ['uint256', 'bytes'],
    [offsets, preInteractionData]
  );
}

/**
 * Generate the hash for EIP-712 signing
 */
export function getOrderHash(order: LimitOrderData, chainId: number): string {
  const domain = {
    name: '1inch Limit Order Protocol',
    version: '3',
    chainId,
    verifyingContract: '0x11431eE5c3b1EC7012c8a67CD7Cf9e7C1C788e4A' // Sepolia address
  };

  const types = {
    Order: [
      { name: 'salt', type: 'uint256' },
      { name: 'maker', type: 'address' },
      { name: 'receiver', type: 'address' },
      { name: 'makerAsset', type: 'address' },
      { name: 'takerAsset', type: 'address' },
      { name: 'makingAmount', type: 'uint256' },
      { name: 'takingAmount', type: 'uint256' },
      { name: 'makerTraits', type: 'uint256' }
    ]
  };

  // This is a simplified version - in production you'd use proper EIP-712 libraries
  return keccak256(
    encodePacked(
      ['bytes32', 'bytes32'],
      [
        keccak256(encodePacked(['string'], [domain.name])),
        keccak256(
          encodePacked(
            ['uint256', 'address', 'address', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [
              order.salt,
              order.maker,
              order.receiver,
              order.makerAsset,
              order.takerAsset,
              order.makingAmount,
              order.takingAmount,
              order.makerTraits
            ]
          )
        )
      ]
    )
  );
}

/**
 * Encode fill order transaction data for v4 protocol
 */
export function encodeFillOrderArgs(
  order: LimitOrderData,
  r: string,
  vs: string,
  amount: bigint,
  takerTraits: bigint,
  extension: string
): string {
  // Encode args for fillOrderArgs function
  const args = encodeAbiParameters(
    [
      { name: 'target', type: 'address' },
      { name: 'extension', type: 'bytes' },
      { name: 'interaction', type: 'bytes' }
    ],
    [
      '0x0000000000000000000000000000000000000000', // target (not used)
      extension as `0x${string}`,
      '0x' // interaction (not used)
    ]
  );

  return encodeFunctionData({
    abi: LIMIT_ORDER_ABI,
    functionName: 'fillOrderArgs',
    args: [
      order,
      r as `0x${string}`,
      vs as `0x${string}`,
      amount,
      takerTraits,
      args
    ]
  });
}

/**
 * Utility functions for index types and operators
 */
export const IndexTypes = {
  INFLATION_RATE: 0,
  ELON_FOLLOWERS: 1,
  BTC_PRICE: 2,
  VIX_INDEX: 3,
  UNEMPLOYMENT_RATE: 4,
  TESLA_STOCK: 5
} as const;

export const ComparisonOperators = {
  GREATER_THAN: 0,
  LESS_THAN: 1,
  GREATER_EQUAL: 2,
  LESS_EQUAL: 3,
  EQUAL: 4
} as const;

/**
 * Helper to create a condition for common use cases
 */
export function createCondition(
  indexType: keyof typeof IndexTypes,
  operator: keyof typeof ComparisonOperators,
  thresholdValue: number
): IndexCondition {
  return {
    indexType: IndexTypes[indexType],
    operator: ComparisonOperators[operator],
    thresholdValue: BigInt(Math.floor(thresholdValue * 100)) // Scale by 100 for precision
  };
}