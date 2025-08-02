#!/usr/bin/env node

/**
 * Simple deployment script for MockIndexOracle
 * Alternative to Foundry for users who prefer JavaScript
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function deployMockOracle() {
    console.log('🚀 Deploying MockIndexOracle to Base Mainnet...');
    console.log('===============================================\n');

    // Check environment variables
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.error('❌ Error: PRIVATE_KEY environment variable not set');
        console.error('   Set it with: export PRIVATE_KEY=0x...');
        process.exit(1);
    }

    // Base Mainnet configuration
    const provider = new ethers.providers.JsonRpcProvider('https://base.llamarpc.com');
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('📡 Network: Base Mainnet (Chain ID: 8453)');
    console.log('👤 Deployer:', wallet.address);
    console.log('💰 Balance:', ethers.utils.formatEther(await wallet.getBalance()), 'ETH\n');

    try {
        // Read the compiled contract (assumes it's been compiled with foundry)
        const artifactPath = path.join(__dirname, 'out', 'MockIndexOracle.sol', 'MockIndexOracle.json');
        
        if (!fs.existsSync(artifactPath)) {
            console.log('📋 Contract not compiled yet. Running forge build...');
            const { execSync } = require('child_process');
            execSync('forge build', { stdio: 'inherit' });
        }

        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        const bytecode = artifact.bytecode.object;
        const abi = artifact.abi;

        console.log('📝 Deploying MockIndexOracle...');
        
        // Deploy the contract
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);
        const oracle = await factory.deploy();
        
        console.log('⏳ Waiting for deployment...');
        await oracle.deployed();
        
        console.log('✅ MockIndexOracle deployed!');
        console.log('📍 Address:', oracle.address);
        console.log('🔗 Transaction:', oracle.deployTransaction.hash);
        
        // Verify mock values
        console.log('\n🔍 Verifying mock values:');
        const [appleValue] = await oracle.getIndexValue(0); // APPLE
        const [teslaValue] = await oracle.getIndexValue(5); // TESLA  
        const [vixValue] = await oracle.getIndexValue(3); // VIX
        
        console.log('   APPLE Stock (ID 0):', appleValue.toString());
        console.log('   TESLA Stock (ID 5):', teslaValue.toString());
        console.log('   VIX Index (ID 3):', vixValue.toString());
        
        console.log('\n🎉 DEPLOYMENT COMPLETE!');
        console.log('=====================================');
        console.log('📍 Oracle Address:', oracle.address);
        console.log('\n🔧 Next steps:');
        console.log('1. Set environment variable:');
        console.log(`   export INDEX_ORACLE_ADDRESS=${oracle.address}`);
        console.log('2. Test predicates:');
        console.log(`   ONEINCH_API_KEY=xxx INDEX_ORACLE_ADDRESS=${oracle.address} npm run index-trading`);
        console.log('\n🔮 Index predicates will now work!');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    deployMockOracle().catch(console.error);
}

module.exports = { deployMockOracle };