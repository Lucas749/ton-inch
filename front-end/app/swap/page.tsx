import { Navbar } from "@/components/navbar";
import { SwapInterface } from "@/components/swap-interface";

export default function SwapPage() {
  // Configuration from environment variables
  const config = {
    walletAddress:
      process.env.NEXT_PUBLIC_WALLET_ADDRESS ||
      "0x742d35Cc6639C443695aE2f8a7D5d3bC6f4e2e8a",
    apiKey: process.env.NEXT_PUBLIC_ONEINCH_API_KEY || "",
    rpcUrl:
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
      "https://sepolia.base.org",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Token Swap
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Swap tokens on Base Sepolia using the 1inch aggregator for the
              best rates and lowest slippage.
            </p>
          </div>

          {/* Swap Interface */}
          <div className="flex justify-center mb-8">
            <SwapInterface
              walletAddress={config.walletAddress}
              apiKey={config.apiKey}
              rpcUrl={config.rpcUrl}
            />
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Best Rates
              </h3>
              <p className="text-gray-600 text-sm">
                Get the best exchange rates by aggregating liquidity from
                multiple DEXs.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Secure
              </h3>
              <p className="text-gray-600 text-sm">
                All transactions are secured by smart contracts and audited
                protocols.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast</h3>
              <p className="text-gray-600 text-sm">
                Lightning-fast swaps with minimal slippage and gas optimization.
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              How to Use
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Setup
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>Connect your wallet to Base Sepolia testnet</li>
                  <li>Get some test tokens from Base Sepolia faucets</li>
                  <li>Configure your 1inch API key in environment variables</li>
                </ol>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Swapping
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>Select the tokens you want to swap</li>
                  <li>Enter the amount you want to swap</li>
                  <li>Review the quote and click "Swap Tokens"</li>
                  <li>Confirm the transaction in your wallet</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Environment Variables Info */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Configuration Required
            </h3>
            <p className="text-yellow-700 text-sm mb-2">
              To use the swap functionality, you need to set up the following
              environment variables:
            </p>
            <div className="bg-yellow-100 rounded p-3 font-mono text-sm text-yellow-800">
              <div>
                NEXT_PUBLIC_ONEINCH_API_KEY=your_1inch_api_key_here
              </div>
              <div>
                NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
              </div>
              <div>NEXT_PUBLIC_WALLET_ADDRESS=your_wallet_address_here</div>
            </div>
            <p className="text-yellow-700 text-sm mt-2">
              Get your 1inch API key from the{" "}
              <a
                href="https://portal.1inch.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-900"
              >
                1inch Developer Portal
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
