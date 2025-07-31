import { encodeFunctionData, keccak256, encodePacked, getAddress } from 'viem';

// 1inch Limit Order Protocol v3 ABI (minimal)
export const LIMIT_ORDER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'salt', type: 'uint256' },
          { name: 'maker', type: 'address' },
          { name: 'receiver', type: 'address' },
          { name: 'makerAsset', type: 'address' },
          { name: 'takerAsset', type: 'address' },
          { name: 'makingAmount', type: 'uint256' },
          { name: 'takingAmount', type: 'uint256' },
          { name: 'makerTraits', type: 'uint256' }
        ],
        name: 'order',
        type: 'tuple'
      },
      { name: 'signature', type: 'bytes' },
      { name: 'interaction', type: 'bytes' },
      { name: 'makingAmount', type: 'uint256' },
      { name: 'takingAmount', type: 'uint256' },
      { name: 'thresholdAmount', type: 'uint256' }
    ],
    name: 'fillOrder',
    outputs: [
      { name: 'actualMakingAmount', type: 'uint256' },
      { name: 'actualTakingAmount', type: 'uint256' },
      { name: 'orderHash', type: 'bytes32' }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
] as const;

export interface LimitOrderData {
  salt: bigint;
  maker: string;
  receiver: string; 
  makerAsset: string;
  takerAsset: string;
  makingAmount: bigint;
  takingAmount: bigint;
  makerTraits: bigint;
}

export interface OrderSignature {
  v: number;
  r: string;
  s: string;
}

/**
 * Create a 1inch limit order structure
 */
export function createLimitOrder({
  maker,
  makerAsset,
  takerAsset, 
  makingAmount,
  takingAmount,
  expiry = BigInt(Math.floor(Date.now() / 1000) + 3600 * 24), // 1 day default
  salt = BigInt(Math.floor(Math.random() * 1000000))
}: {
  maker: string;
  makerAsset: string;
  takerAsset: string;
  makingAmount: bigint;
  takingAmount: bigint;
  expiry?: bigint;
  salt?: bigint;
}): LimitOrderData {
  // makerTraits encodes various order parameters including expiry
  const makerTraits = expiry << 160n; // Simple expiry encoding
  
  return {
    salt,
    maker: getAddress(maker),
    receiver: getAddress(maker), // Use maker as receiver for simplicity
    makerAsset: getAddress(makerAsset),
    takerAsset: getAddress(takerAsset),
    makingAmount,
    takingAmount,
    makerTraits
  };
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
 * Encode fill order transaction data
 */
export function encodeFillOrder(
  order: LimitOrderData,
  signature: string,
  makingAmount: bigint,
  takingAmount: bigint
): string {
  return encodeFunctionData({
    abi: LIMIT_ORDER_ABI,
    functionName: 'fillOrder',
    args: [
      order,
      signature,
      '0x', // interaction
      makingAmount,
      takingAmount,
      0n // thresholdAmount
    ]
  });
}