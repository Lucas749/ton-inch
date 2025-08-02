#!/usr/bin/env node

/**
 * Simple script to add EPS index to oracle system
 */

const oracleManager = require('./src/oracle-manager');
require('dotenv').config();

async function addEPSIndex() {
    console.log('📈 ADDING EPS INDEX TO ORACLE SYSTEM');
    console.log('====================================');
    console.log('');
    
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.error('❌ PRIVATE_KEY not found in environment variables');
        return;
    }
    
    try {
        // EPS Consumer contract address
        const epsConsumerAddress = '0xc4e07abf90C493968cd9216320c2349F9490552b';
        
        console.log('🔗 Step 1: Set EPS Consumer as Chainlink Oracle');
        console.log('===============================================');
        console.log(`📍 EPS Consumer: ${epsConsumerAddress}`);
        
        const setOracleResult = await oracleManager.setChainlinkOracleAddress(
            epsConsumerAddress,
            privateKey
        );
        
        if (!setOracleResult.success) {
            console.error(`❌ Failed to set oracle: ${setOracleResult.error}`);
            return;
        }
        
        console.log(`✅ EPS Consumer set as Chainlink oracle`);
        console.log(`📤 Transaction: ${setOracleResult.transactionHash}`);
        console.log('');
        
        console.log('📊 Step 2: Create MSTR EPS Index');
        console.log('=================================');
        
        const epsIndex = await oracleManager.createNewIndexWithChainlinkOracle(
            'MSTR EPS Estimates', // Name
            1250, // Initial value ($12.50 EPS estimate)
            'https://www.alphavantage.co/query?function=EARNINGS_ESTIMATES&symbol=MSTR', // Alpha Vantage URL
            oracleManager.ORACLE_TYPES.CHAINLINK, // Use Chainlink oracle type
            epsConsumerAddress, // Our deployed EPS consumer
            privateKey
        );
        
        if (!epsIndex.success) {
            console.error(`❌ Failed to create EPS index: ${epsIndex.error}`);
            return;
        }
        
        console.log(`✅ Created MSTR EPS index with ID: ${epsIndex.indexId}`);
        console.log(`📊 Source: Alpha Vantage EARNINGS_ESTIMATES API`);
        console.log(`🔗 Chainlink Oracle: ${epsIndex.chainlinkOracleAddress}`);
        console.log(`📤 Transaction: ${epsIndex.transactionHash}`);
        console.log('');
        
        // Verify the created index
        console.log('📋 Step 3: Verify Created Index');
        console.log('===============================');
        
        const newIndex = await oracleManager.getIndexById(epsIndex.indexId);
        if (newIndex.success) {
            console.log('✅ Index verification successful:');
            oracleManager.displayIndex(newIndex.index);
            
            // Check oracle type
            const oracleType = await oracleManager.getIndexOracleType(epsIndex.indexId);
            if (oracleType.success) {
                console.log(`🔧 Oracle Type: ${oracleType.oracleTypeName}`);
            }
        }
        
        console.log('');
        console.log('🎉 EPS INDEX SUCCESSFULLY ADDED!');
        console.log('=================================');
        console.log(`📍 Index ID: ${epsIndex.indexId}`);
        console.log(`📊 Symbol: MSTR`);
        console.log(`🔗 EPS Consumer: ${epsConsumerAddress}`);
        console.log(`💰 Initial Value: $12.50`);
        console.log(`📈 Data Source: Alpha Vantage EPS Estimates`);
        
    } catch (error) {
        console.error('❌ Error adding EPS index:', error.message);
    }
}

// Run the script
if (require.main === module) {
    addEPSIndex().catch(console.error);
}

module.exports = { addEPSIndex };