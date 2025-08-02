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
                <p className="font-medium">Wallet Connection Error</p>
                <p className="text-sm">
                  There was an issue with your wallet connection. This usually happens when:
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                  <li>Your wallet is disconnected or closed</li>
                  <li>Network connectivity is unstable</li>
                  <li>Your wallet session has expired</li>
                </ul>
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

// Hook version for functional components
export function useWalletErrorHandler() {
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // Check if this is a wallet-related error
      if (
        error?.message?.includes('Connection interrupted') ||
        error?.message?.includes('WalletConnect') ||
        error?.message?.includes('ethereum') ||
        error?.stack?.includes('@walletconnect')
      ) {
        console.warn('🚨 Unhandled wallet error caught:', error);
        event.preventDefault(); // Prevent the error from being logged as unhandled
        
        // You could also show a toast notification here instead
        // toast.error('Wallet connection interrupted. Please reconnect your wallet.');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}