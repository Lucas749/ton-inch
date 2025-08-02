#!/usr/bin/env node

/**
 * Simple Oracle Demo - Clean view of all index data
 */

const oracleManager = require('./src/oracle-manager');

async function showOracleData() {
    console.log('📊 ORACLE INDEX DATA');
    console.log('====================\n');
    
    try {
        // Get all indices
        const result = await oracleManager.getAllIndices();
        
        if (result.success) {
            console.log(`📍 Oracle: ${result.indices[0] ? 'Connected ✅' : 'Error ❌'}`);
            console.log(`📋 Total Indices: ${result.summary.total}`);
            console.log(`🏭 Predefined: ${result.summary.predefined}`);
            console.log(`🛠️ Custom: ${result.summary.custom}\n`);
            
            console.log('📊 CURRENT VALUES');
            console.log('=================');
            
            result.indices.forEach((index, i) => {
                const status = index.isActive ? '🟢' : '🔴';
                const type = index.type === 'predefined' ? '🏭' : '🛠️';
                console.log(`${i + 1}. ${type} ${status} ${index.name}: ${index.formatted}`);
            });
            
            console.log('\n📈 AVAILABLE FOR TRADING CONDITIONS');
            console.log('====================================');
            console.log('✅ All these indices can be used in your limit orders!');
            console.log('   Example: "Execute trade when VIX > 25"');
            console.log('   Example: "Execute trade when BTC < $40,000"');
            console.log('   Example: "Execute trade when Tesla > $250"');
        }
        
    } catch (error) {
        console.error('❌ Failed to get oracle data:', error.message);
    }
}

showOracleData();