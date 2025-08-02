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
    return `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
  }
  
  // Fallback to public Base Sepolia RPC
  console.warn("⚠️ No Alchemy API key found, using public RPC (may have rate limits)");
  return "https://sepolia.base.org";
}

/**
 * Get a user-friendly description of the RPC being used
 */
export function getRpcDescription(url: string): string {
  if (url.includes('alchemy')) return 'Alchemy (Premium - Recommended)';
  if (url.includes('sepolia.base.org')) return 'Base Sepolia (Public - Limited)';
  return 'Custom RPC';
}