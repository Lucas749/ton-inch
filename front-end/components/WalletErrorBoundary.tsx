'use client';

import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface WalletErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface WalletErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class WalletErrorBoundary extends React.Component<
  WalletErrorBoundaryProps,
  WalletErrorBoundaryState
> {
  constructor(props: WalletErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<WalletErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if this is a WalletConnect or wallet-related error
    const isWalletError = 
      error.message?.includes('Connection interrupted') ||
      error.message?.includes('WalletConnect') ||
      error.message?.includes('ethereum') ||
      error.message?.includes('wallet') ||
      error.stack?.includes('@walletconnect') ||
      error.stack?.includes('ethereum');

    if (isWalletError) {
      console.warn('🚨 Wallet connection error caught by error boundary:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });

      this.setState({
        error,
        errorInfo,
      });
    } else {
      // Re-throw non-wallet errors
      throw error;
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      // Default fallback UI
      return (
        <div className="p-4">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Wallet Connection Interrupted</p>
                <p className="text-sm">
                  {this.state.error?.message?.includes('Connection interrupted') 
                    ? 'Your wallet connection was interrupted. This is common with WalletConnect and mobile wallets.'
                    : 'There was an issue with your wallet connection. This usually happens when:'}
                </p>
                {!this.state.error?.message?.includes('Connection interrupted') && (
                  <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                    <li>Your wallet is disconnected or closed</li>
                    <li>Network connectivity is unstable</li>
                    <li>Your wallet session has expired</li>
                  </ul>
                )}
                <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                  <strong>Quick fix:</strong> Try refreshing the page or reconnecting your wallet. 
                  If using a mobile wallet, ensure it's running in the background.
                </div>
                <div className="pt-2">
                  <Button
                    onClick={this.resetError}
                    variant="outline"
                    size="sm"
                    className="mr-2"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    size="sm"
                  >
                    Refresh Page
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <summary className="cursor-pointer font-medium">
                Debug Info (Development Only)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap">
                <strong>Error:</strong> {this.state.error.message}
                {'\n\n'}
                <strong>Stack:</strong> {this.state.error.stack}
                {this.state.errorInfo && (
                  <>
                    {'\n\n'}
                    <strong>Component Stack:</strong> {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components with enhanced error recovery
export function useWalletErrorHandler() {
  const [retryCount, setRetryCount] = React.useState(0);
  const [lastErrorTime, setLastErrorTime] = React.useState(0);
  
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const now = Date.now();
      
      // Check if this is a wallet-related error
      if (
        error?.message?.includes('Connection interrupted') ||
        error?.message?.includes('WalletConnect') ||
        error?.message?.includes('ethereum') ||
        error?.stack?.includes('@walletconnect')
      ) {
        console.warn('🚨 Unhandled wallet error caught:', error);
        event.preventDefault(); // Prevent the error from being logged as unhandled
        
        // Implement exponential backoff for reconnection attempts
        const timeSinceLastError = now - lastErrorTime;
        if (timeSinceLastError > 10000) { // Reset retry count if 10+ seconds since last error
          setRetryCount(0);
        }
        
        setLastErrorTime(now);
        
        // Only attempt automatic recovery for connection interruptions
        if (error?.message?.includes('Connection interrupted') && retryCount < 3) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 second delay
          console.log(`🔄 Attempting wallet reconnection in ${backoffDelay}ms (attempt ${retryCount + 1}/3)`);
          
          setTimeout(() => {
            // Try to trigger a reconnection by checking if wallet is still available
            if (typeof window !== 'undefined' && (window as any).ethereum) {
              (window as any).ethereum.request({ method: 'eth_accounts' })
                .then((accounts: string[]) => {
                  if (accounts.length > 0) {
                    console.log('✅ Wallet connection restored');
                    setRetryCount(0);
                  }
                })
                .catch(() => {
                  setRetryCount(prev => prev + 1);
                });
            }
          }, backoffDelay);
        }
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [retryCount, lastErrorTime]);
}