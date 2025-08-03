/**
 * 🔧 Blockchain Utilities
 * Helper functions, retry logic, and common utilities
 */

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  maxRetries: number = 3, 
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if it's not a circuit breaker or rate limit error
      if (!isRetryableError(error)) {
        throw error;
      }
      
      console.warn(`⚠️ Attempt ${attempt + 1} failed:`, error.message);
    }
  }
  
  throw lastError;
}

/**
 * Check if an error is retryable (circuit breaker, rate limit, etc.)
 */
export function isRetryableError(error: any): boolean {
  const message = error.message?.toLowerCase() || '';
  return message.includes('circuit breaker') || 
         message.includes('rate limit') || 
         message.includes('too many requests') ||
         message.includes('timeout') ||
         message.includes('network error');
}

/**
 * Delay helper function
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get operator name for display
 */
export function getOperatorName(operator: number): string {
  const names = [">", "<", ">=", "<=", "=="];
  return names[operator] || "?";
}

/**
 * Parse token amount with proper decimals
 */
export function parseTokenAmount(amount: string, decimals: number): string {
  // Handle decimal amounts by using parseFloat and then converting to wei
  const floatAmount = parseFloat(amount);
  if (isNaN(floatAmount)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  
  // Multiply by 10^decimals to convert to smallest unit (wei)
  const multiplier = Math.pow(10, decimals);
  const amountInWei = Math.floor(floatAmount * multiplier);
  
  return amountInWei.toString();
}

/**
 * Format token amount from wei
 */
export function formatTokenAmount(amount: string, decimals: number): string {
  const amountNumber = parseFloat(amount);
  if (isNaN(amountNumber)) {
    return "0";
  }
  
  // Convert from smallest unit back to human readable
  const divisor = Math.pow(10, decimals);
  const humanReadable = amountNumber / divisor;
  
  return humanReadable.toString();
}

/**
 * Get the best available RPC URL
 */
export function getRpcUrl(): string {
  // Check for Alchemy API key first (premium tier)
  if (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
    return `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
  }
  
  // Fallback to public Base mainnet RPC
  console.warn("⚠️ No Alchemy API key found, using public RPC (may have rate limits)");
  return "https://mainnet.base.org";
}

/**
 * Get a user-friendly description of the RPC being used
 */
export function getRpcDescription(url: string): string {
  if (url.includes('alchemy')) return 'Alchemy (Premium - Recommended)';
  if (url.includes('mainnet.base.org')) return 'Base Mainnet (Public - Limited)';
  return 'Custom RPC';
}

/**
 * Format index value for display based on index type
 */
export function formatIndexValueForDisplay(indexId: number, value: number): string {
  switch (indexId) {
    case 0: // Inflation Rate (basis points)
    case 4: // Unemployment Rate (basis points)
      return `${(value / 100).toFixed(2)}%`;
    case 1: // Elon Followers
      return `${(value / 1000000).toFixed(1)}M followers`;
    case 2: // BTC Price (scaled by 100)
    case 5: // Tesla Stock (scaled by 100)
      return `$${(value / 100).toFixed(2)}`;
    case 3: // VIX Index (basis points)
      return `${(value / 100).toFixed(2)}`;
    default:
      // For custom indices, try to determine if it's a percentage based on value range
      if (value <= 1000 && value > 0) {
        // Likely a percentage value (basis points)
        return `${(value / 100).toFixed(2)}%`;
      }
      return value.toLocaleString();
  }
}

/**
 * Get index type information for formatting
 */
export function getIndexTypeInfo(indexId: number): { 
  isPercentage: boolean; 
  isCurrency: boolean; 
  isFollowers: boolean;
  scalingFactor: number;
  unit: string;
} {
  switch (indexId) {
    case 0: // Inflation Rate
    case 4: // Unemployment Rate
      return { isPercentage: true, isCurrency: false, isFollowers: false, scalingFactor: 100, unit: '%' };
    case 1: // Elon Followers
      return { isPercentage: false, isCurrency: false, isFollowers: true, scalingFactor: 1000000, unit: 'M followers' };
    case 2: // BTC Price
    case 5: // Tesla Stock
      return { isPercentage: false, isCurrency: true, isFollowers: false, scalingFactor: 100, unit: '$' };
    case 3: // VIX Index
      return { isPercentage: false, isCurrency: false, isFollowers: false, scalingFactor: 100, unit: '' };
    default:
      // For custom indices, make an educated guess based on value
      return { isPercentage: false, isCurrency: false, isFollowers: false, scalingFactor: 1, unit: '' };
  }
}

/**
 * Get optimal Y-axis configuration for different index types
 */
export function getYAxisConfig(indexId: number): {
  width: number;
  tickCount: number;
  fontSize: number;
} {
  switch (indexId) {
    case 1: // Elon Followers - needs more width for "150.0M followers"
      return { width: 100, tickCount: 5, fontSize: 10 };
    case 0: // Inflation Rate - percentage values
    case 4: // Unemployment Rate - percentage values
      return { width: 50, tickCount: 6, fontSize: 11 };
    case 2: // BTC Price - large dollar amounts
    case 5: // Tesla Stock - dollar amounts
      return { width: 70, tickCount: 6, fontSize: 11 };
    case 3: // VIX Index - simple numbers
      return { width: 45, tickCount: 6, fontSize: 11 };
    default:
      return { width: 60, tickCount: 6, fontSize: 11 };
  }
}