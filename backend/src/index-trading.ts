#!/usr/bin/env node

import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
import * as readline from 'readline';
import { IndexTradingStrategy } from './index-strategy';
import { 
  IndexStrategyConfig, 
  TokenInfo, 
  IndexCondition,
  ComparisonOperator,
  LIMIT_ORDER_PROTOCOL_ADDRESSES 
} from './types';
import { BASE_CONFIG, BASE_TOKENS, TEST_CONFIG, CONTRACTS, validateConfig } from './config';

// Load environment variables
dotenv.config();

// Pre-configured Index Trading Strategies
interface PreConfiguredIndexStrategy {
  name: string;
  description: string;
  config: Omit<IndexStrategyConfig, 'fromToken' | 'toToken'> & {
    fromTokenSymbol: keyof typeof BASE_TOKENS;
    toTokenSymbol: keyof typeof BASE_TOKENS;
  };
}

const EXAMPLE_INDEX_STRATEGIES: Record<string, PreConfiguredIndexStrategy> = {
  '1': {
    name: 'Apple Stock Breakout (TINY TEST)',
    description: 'Buy WETH when Apple stock exceeds $170 - TINY 0.1 USDC test',
    config: {
      fromTokenSymbol: 'USDC',
      toTokenSymbol: 'WETH',
      totalAmount: TEST_CONFIG.DEFAULT_TEST_AMOUNT, // 0.1 USDC
      numberOfOrders: 1,
      indexConditions: [{
        indexId: 1,
        operator: ComparisonOperator.GREATER_THAN,
        threshold: 17000, // $170.00 in cents
        description: 'APPLE > $170'
      }],
      slippageTolerance: 1,
      expirationHours: 24
    }
  },
  '2': {
    name: 'Tesla Dip Buy (TINY TEST)',
    description: 'Buy WETH when Tesla drops below $250 - TINY 0.1 USDC test',
    config: {
      fromTokenSymbol: 'USDC',
      toTokenSymbol: 'WETH',
      totalAmount: TEST_CONFIG.DEFAULT_TEST_AMOUNT, // 0.1 USDC
      numberOfOrders: 1,
      indexConditions: [{
        indexId: 2,
        operator: ComparisonOperator.LESS_THAN,
        threshold: 25000, // $250.00 in cents
        description: 'TESLA < $250'
      }],
      slippageTolerance: 1.5,
      expirationHours: 48
    }
  },
  '3': {
    name: 'VIX Fear Index (TINY TEST)',
    description: 'Buy WETH when VIX spikes above 20 - TINY 0.1 USDC test',
    config: {
      fromTokenSymbol: 'USDC',
      toTokenSymbol: 'WETH',
      totalAmount: TEST_CONFIG.DEFAULT_TEST_AMOUNT, // 0.1 USDC
      numberOfOrders: 1,
      indexConditions: [{
        indexId: 3,
        operator: ComparisonOperator.GREATER_THAN,
        threshold: 2000, // VIX 20.00
        description: 'VIX > 20'
      }],
      slippageTolerance: 2,
      expirationHours: 12
    }
  },
  '4': {
    name: 'Demo Strategy (NO REAL CONTRACTS)',
    description: 'This demonstrates the concept - contracts need deployment to Base first',
    config: {
      fromTokenSymbol: 'USDC',
      toTokenSymbol: 'WETH',
      totalAmount: TEST_CONFIG.DEFAULT_TEST_AMOUNT, // 0.1 USDC
      numberOfOrders: 1,
      indexConditions: [
        {
          indexId: 1,
          operator: ComparisonOperator.GREATER_THAN,
          threshold: 16000, // $160.00
          description: 'DEMO: APPLE > $160'
        }
      ],
      slippageTolerance: 1,
      expirationHours: 72
    }
  }
};

// Quick Start Application Class for Index Trading
class IndexTradingApp {
  private provider: ethers.providers.JsonRpcProvider;
  private signer: ethers.Wallet;

  constructor() {
    if (!BASE_CONFIG.privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }
    if (!BASE_CONFIG.oneInchApiKey) {
      throw new Error('ONEINCH_API_KEY environment variable is required. Get one at https://portal.1inch.dev/');
    }
    
    this.provider = new ethers.providers.JsonRpcProvider(BASE_CONFIG.rpcUrl);
    this.signer = new ethers.Wallet(BASE_CONFIG.privateKey, this.provider);
  }

  async run(): Promise<void> {
    try {
      // Validate configuration first
      const configValidation = validateConfig();
      if (!configValidation.isValid) {
        console.error('❌ Configuration validation failed:');
        configValidation.errors.forEach(error => console.error(`   - ${error}`));
        
        if (configValidation.errors.some(e => e.includes('Contracts not yet deployed'))) {
          console.log('\n⚠️  IMPORTANT: Index trading contracts are not yet deployed to Base mainnet!');
          console.log('📋 Required deployments:');
          console.log('   - Direct 1inch SDK (simplified approach)');
          console.log('   - IndexPreInteraction'); 
          console.log('   - MockIndexOracle (or real oracle feeds)');
          console.log('\n💡 This demo shows the integration pattern but requires contract deployment first.');
        }
        
        process.exit(1);
      }

      await this.displayWelcome();
      await this.checkWalletStatus();
      await this.check1inchConfiguration();
      await this.showTokenInfo();
      
      const choice = await this.getUserChoice();
      
      if (choice.toLowerCase() === 'setup') {
        await this.showIndexSetupGuide();
        return;
      }
      
      if (choice === '0') {
        console.log('👋 Starting interactive mode...\n');
        await this.runInteractiveMode();
      } else if (EXAMPLE_INDEX_STRATEGIES[choice]) {
        console.log(`🎯 Selected: ${EXAMPLE_INDEX_STRATEGIES[choice].name}\n`);
        await this.runPreConfiguredStrategy(EXAMPLE_INDEX_STRATEGIES[choice]);
      } else {
        console.log('❌ Invalid choice. Exiting...');
        process.exit(1);
      }

    } catch (error: any) {
      console.error('❌ Error in index trading app:', error.message);
      
      if (error.message.includes('ONEINCH_API_KEY')) {
        console.log('\n💡 To get a 1inch API key:');
        console.log('1. Visit https://portal.1inch.dev/');
        console.log('2. Sign up or log in');
        console.log('3. Create a new API key');
        console.log('4. Add it to your .env file as ONEINCH_API_KEY=your_key_here');
      }
      
      process.exit(1);
    }
  }

  private async displayWelcome(): Promise<void> {
    console.log('🚀 Index-Based Trading with 1inch Integration (Base Mainnet)');
    console.log('=============================================================\n');
    
    console.log('📍 Network: Base Mainnet (Chain ID: 8453)');
    console.log(`👤 Wallet: ${await this.signer.getAddress()}`);
    console.log(`🔗 RPC: ${BASE_CONFIG.rpcUrl}`);
    console.log(`🏛️  1inch Protocol: ${LIMIT_ORDER_PROTOCOL_ADDRESSES[BASE_CONFIG.chainId]}`);
    console.log(`🔑 API Key: ${BASE_CONFIG.oneInchApiKey.slice(0, 8)}...${BASE_CONFIG.oneInchApiKey.slice(-4)}`);
    console.log('⚠️  TINY TEST VALUES ONLY - Base mainnet live environment\n');
  }

  private async checkWalletStatus(): Promise<void> {
    try {
      // Check ETH balance
      const balance = await this.provider.getBalance(await this.signer.getAddress());
      const balanceFormatted = ethers.utils.formatEther(balance);
      
      console.log(`💰 ETH Balance: ${balanceFormatted} ETH`);

      if (parseFloat(balanceFormatted) < 0.001) {
        console.log('⚠️  Low ETH balance - you may need more ETH for gas fees');
      }

    } catch (error: any) {
      console.warn('⚠️  Could not check wallet balance:', error.message);
    }
  }

  private async check1inchConfiguration(): Promise<void> {
    try {
      // Test 1inch API connectivity
      const testUrl = `https://api.1inch.dev/swap/v6.0/${BASE_CONFIG.chainId}/healthcheck`;
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${BASE_CONFIG.oneInchApiKey}`,
          'accept': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ 1inch API connection verified');
      } else {
        console.log('⚠️  1inch API connection issue - check your API key');
      }

    } catch (error: any) {
      console.warn('⚠️  Could not verify 1inch API:', error.message);
    }
  }

  private async showTokenInfo(): Promise<void> {
    console.log('🪙 Available Tokens on Base Mainnet:');
    console.log('====================================');
    
    Object.entries(BASE_TOKENS).forEach(([symbol, token]) => {
      console.log(`${symbol.padEnd(6)}: ${token.address} (${token.name})`);
    });
    
    console.log('\n💡 All strategies use real 1inch Limit Order Protocol v4');
    console.log('📊 Orders are submitted to 1inch orderbook for execution');
    console.log('🔮 Orders execute automatically when index conditions are met');
    console.log('⚠️  MAINNET WARNING: Using TINY test values only!');
            console.log(`💰 Max amounts: ${TEST_CONFIG.MAX_USDC_AMOUNT} USDC, all trades USDC → WETH`);
    console.log('');
  }

  private async getUserChoice(): Promise<string> {
    console.log('📋 Available Index Trading Strategies (Real 1inch Integration):');
    console.log('===============================================================');
    
    Object.entries(EXAMPLE_INDEX_STRATEGIES).forEach(([id, strategy]) => {
      console.log(`${id}. ${strategy.name}`);
      console.log(`   💰 ${strategy.config.totalAmount} ${strategy.config.fromTokenSymbol} → ${strategy.config.toTokenSymbol}`);
      console.log(`   📊 ${strategy.config.numberOfOrders} orders, ${this.getStrategyDescription(strategy.config)}`);
      console.log(`   📝 ${strategy.description}\n`);
    });

    console.log('0. Interactive mode (configure manually)');
    console.log('setup. Show index setup and oracle guide\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      rl.question('Select a strategy (0-4, setup): ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  private getStrategyDescription(config: PreConfiguredIndexStrategy['config']): string {
    return config.indexConditions.map(c => c.description).join(' AND ');
  }

  private async showIndexSetupGuide(): Promise<void> {
    console.log('🔮 Index Setup and Oracle Configuration Guide');
    console.log('=============================================\n');
    
    console.log('⚠️  IMPORTANT: Contracts need to be deployed to Base mainnet first!\n');
    
    console.log('📍 Planned Index Types:');
    console.log('1. APPLE_STOCK - Apple Inc. stock price');
    console.log('2. TESLA_STOCK - Tesla Inc. stock price');  
    console.log('3. VIX_INDEX - Market volatility index');
    console.log('4. BTC_PRICE - Bitcoin price');
    console.log('5. Custom indices via registerIndex()\n');
    
    console.log('🎯 How Index Trading Will Work:');
    console.log('1. Deploy contracts to Base mainnet');
    console.log('2. Create orders with index-based conditions');
    console.log('3. Orders are submitted to 1inch orderbook');
    console.log('4. PreInteraction contract validates conditions');
    console.log('5. Orders execute automatically when conditions are met');
    console.log('6. You maintain full control - no funds are locked\n');
    
    console.log('⚙️ Required Contract Deployments:');
            console.log('- Direct 1inch SDK: Direct integration approach');
    console.log('- IndexPreInteraction: Validates index conditions');
    console.log('- Oracle contracts: Provide real-world data feeds');
    console.log('- 1inch SDK: Posts orders to off-chain orderbook\n');
    
    console.log('🏗️  Current Status:');
    console.log(`- Base Mainnet Chain ID: ${BASE_CONFIG.chainId}`);
    console.log(`- 1inch Protocol: ${CONTRACTS.REAL_1INCH_PROTOCOL}`);
    console.log('- Index Contracts: ❌ NOT YET DEPLOYED');
    console.log('- Real Token Addresses: ✅ Available');
    console.log('- API Integration: ✅ Ready\n');
    
    console.log('💡 Next Steps:');
    console.log('1. Deploy contracts to Base mainnet');
    console.log('2. Update CONTRACTS addresses in config.ts');
    console.log('3. Test with tiny amounts');
    console.log('4. Integrate real oracle feeds\n');
  }

  private async runPreConfiguredStrategy(strategyDef: PreConfiguredIndexStrategy): Promise<void> {
    try {
      // Convert pre-configured strategy to full strategy config
      const strategyConfig: IndexStrategyConfig = {
        ...strategyDef.config,
        fromToken: BASE_TOKENS[strategyDef.config.fromTokenSymbol],
        toToken: BASE_TOKENS[strategyDef.config.toTokenSymbol]
      };

      // Display strategy summary
      console.log('📊 Index Trading Strategy Summary:');
      console.log('==================================');
      console.log(`Name: ${strategyDef.name}`);
      console.log(`From: ${strategyConfig.totalAmount} ${strategyConfig.fromToken.symbol}`);
      console.log(`To: ${strategyConfig.toToken.symbol}`);
      console.log(`Orders: ${strategyConfig.numberOfOrders}`);
      console.log(`Conditions: ${this.getStrategyDescription(strategyDef.config)}`);
      console.log(`Slippage: ${strategyConfig.slippageTolerance}%`);
      console.log(`Expiration: ${strategyConfig.expirationHours || 24} hours`);
      console.log(`Integration: 1inch Limit Order Protocol v4 + Index Oracles\n`);

      // Ask for confirmation
      const confirmation = await this.askConfirmation('Proceed with creating REAL index-based orders on 1inch?');
      
      if (!confirmation) {
        console.log('👋 Operation cancelled.');
        return;
      }

      // Initialize and run index trading strategy
      const indexStrategy = new IndexTradingStrategy(this.provider, this.signer);
      
      // Set the configuration directly
      indexStrategy.setConfiguration(strategyConfig);
      
      // Validate configuration
      console.log('🔍 Validating configuration and checking balances...');
      const validation = await indexStrategy.validateConfigurationWithResult();
      if (!validation.isValid) {
        console.error('❌ Configuration validation failed:');
        validation.errors.forEach((error: string) => console.error(`   - ${error}`));
        return;
      }

      if (validation.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        validation.warnings.forEach((warning: string) => console.log(`   - ${warning}`));
        
        const proceedWithWarnings = await this.askConfirmation('Continue despite warnings?');
        if (!proceedWithWarnings) {
          console.log('👋 Operation cancelled due to warnings.');
          return;
        }
      }

      console.log('✅ Configuration validated!\n');

      // Execute the strategy with real 1inch integration
      await this.executeIndexStrategyWithRealIntegration(indexStrategy);

    } catch (error: any) {
      console.error('❌ Failed to run index trading strategy:', error.message);
      
      if (error.message.includes('Insufficient balance') || error.message.includes('balance')) {
        console.log('\n💡 Balance Issues:');
        console.log('1. Make sure you have enough tokens in your wallet');
        console.log('2. Check that you have sufficient ETH for gas fees');
        console.log('3. Get testnet tokens from Base Sepolia faucets');
      } else if (error.message.includes('allowance') || error.message.includes('approval')) {
        console.log('\n💡 Token Approval Issues:');
        console.log('1. The script should automatically handle approvals');
        console.log('2. If this fails, manually approve at https://app.1inch.io/');
        console.log('3. You need to approve 1inch Limit Order Protocol to spend your tokens');
      }
    }
  }

  private async runInteractiveMode(): Promise<void> {
    console.log('🔧 Interactive Index Trading Mode');
    console.log('=================================\n');
    
    const indexStrategy = new IndexTradingStrategy(this.provider, this.signer);
    await indexStrategy.initialize();
    await this.executeIndexStrategyWithRealIntegration(indexStrategy);
  }

  private async executeIndexStrategyWithRealIntegration(indexStrategy: IndexTradingStrategy): Promise<void> {
    try {
      // Create index-based orders using real 1inch SDK
      console.log('🚀 Creating index-based orders with 1inch SDK...');
      console.log('📡 This will submit REAL orders to 1inch orderbook...\n');
      
      const orders = await indexStrategy.createIndexOrders();
      
      if (orders.length === 0) {
        console.log('❌ No orders were created. Please check your configuration.');
        return;
      }

      console.log(`✅ Successfully created ${orders.length} real index-based limit orders!`);
      console.log('📊 Orders are now live on 1inch orderbook');
      console.log('🔮 Orders will execute when index conditions are met\n');

      // Display status with real API data
      await indexStrategy.displayStatus();

      // Sync with 1inch API to get latest order states
      console.log('🔄 Syncing with 1inch API...');
      await indexStrategy.syncOrdersWithAPI();

      // Ask if user wants to start monitoring
      const startMonitoring = await this.askConfirmation('Start real-time monitoring with index validation?');
      
      if (startMonitoring) {
        console.log('🎯 Starting real-time monitoring...');
        console.log('📡 Monitoring orders via 1inch API + Index Oracles');
        console.log('💡 Press Ctrl+C to stop\n');
        
        // Start enhanced monitoring with index validation
        await indexStrategy.monitorAndExecute();
      } else {
        console.log('👋 Orders created but monitoring not started.');
        console.log('💡 Your orders are live on 1inch and will execute when index conditions are met.');
        
        this.showManualMonitoringInstructions();
        
        // Show order details
        console.log('\n📋 Created Index-Based Orders:');
        orders.forEach((order: any, index: number) => {
          console.log(`   ${index + 1}. ${order.orderHash.slice(0, 10)}... (Condition: ${order.indexCondition.description})`);
          console.log(`      Status: ${order.status} | Expires: ${order.expiresAt.toLocaleDateString()}`);
        });
      }

    } catch (error: any) {
      console.error('❌ Failed to execute index strategy:', error.message);
      throw error;
    }
  }

  private showManualMonitoringInstructions(): void {
    console.log('\n📖 Manual Monitoring Instructions:');
    console.log('=================================');
    console.log('1. Visit https://app.1inch.io/ and connect your wallet');
    console.log('2. Go to "Limit Orders" section to see your active orders');
    console.log('3. Orders will automatically execute when index conditions are met');
    console.log('4. Monitor index values using our oracle contracts');
    console.log('5. You can cancel orders anytime (gas fee applies)');
    console.log('6. No funds are locked - you maintain full control\n');
  }

  private async askConfirmation(question: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      rl.question(`${question} (y/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }
}

// Main execution
async function main(): Promise<void> {
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('🌈 Index-Based Trading with 1inch Integration');
    console.log('==============================================\n');
    console.log('Usage: npm run index-trading');
    console.log('Environment variables required:');
    console.log('  PRIVATE_KEY=your_wallet_private_key');
    console.log('  ONEINCH_API_KEY=your_1inch_api_key');
    console.log('  CHAIN_ID=84532 (Base Sepolia)');
    console.log('  RPC_URL=https://sepolia.base.org');
    return;
  }

  // Validate required environment variables
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY environment variable is required');
    console.log('💡 Add your wallet private key to .env file');
    console.log('💡 For demo purposes, you can also set it via environment variable');
    console.log('💡 Usage: PRIVATE_KEY=your_key ONEINCH_API_KEY=your_api_key npm run index-trading');
    process.exit(1);
  }

  // Run the main application
  const app = new IndexTradingApp();
  await app.run();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Index Trading shutting down gracefully...');
  console.log('💡 Your limit orders remain active on 1inch');
  console.log('🔮 Orders will continue to execute when index conditions are met');
  console.log('👋 Visit https://app.1inch.io/ to manage them manually');
  process.exit(0);
});

// Export for testing
export { IndexTradingApp, BASE_CONFIG, BASE_TOKENS, EXAMPLE_INDEX_STRATEGIES };

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}