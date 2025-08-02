#!/usr/bin/env node

/**
 * 📊 Get All Indices - Complete Index Data Fetcher
 * 
 * This script fetches all indices (predefined and custom) with their:
 * - Names and descriptions
 * - Current values and timestamps
 * - Creator information
 * - Active status
 * - Oracle addresses
 */

const { Web3 } = require('web3');
require('dotenv').config();

// Import the base workflow for contract setup
const IndexWorkflow = require('./web3_workflow');

// Configuration
const CONFIG = {
    RPC_URL: 'https://sepolia.base.org',
    PRIVATE_KEY: process.env.PRIVATE_KEY || 'your_private_key_here',
    
    // Contract addresses
    CONTRACTS: {
        IndexPreInteraction: '0x8AF8db923E96A6709Ae339d1bFb9E986410D8461',
        IndexLimitOrderFactory: '0x0312Af95deFE475B89852ec05Eab5A785f647e73',
        MockIndexOracle: '0x3de6DF18226B2c57328709D9bc68CaA7AD76EdEB',
        USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        WETH: '0x4200000000000000000000000000000000000006'
    }
};

class IndexDataFetcher extends IndexWorkflow {
    constructor() {
        super();
        this.predefinedIndices = [
            { id: 0, type: 'INFLATION_RATE' },
            { id: 1, type: 'ELON_FOLLOWERS' },
            { id: 2, type: 'BTC_PRICE' },
            { id: 3, type: 'VIX_INDEX' },
            { id: 4, type: 'UNEMPLOYMENT_RATE' },
            { id: 5, type: 'TESLA_STOCK' }
        ];
    }

    /**
     * Get complete information for a single index
     */
    async getIndexDetails(indexId) {
        try {
            // Get metadata from PreInteraction contract
            const info = await this.preInteraction.methods.getIndexInfo(indexId).call();
            
            // Get current value from oracle
            const valueData = await this.preInteraction.methods.getIndexValue(indexId).call();
            
            return {
                id: indexId,
                name: info.name,
                description: info.description,
                oracle: info.oracle,
                creator: info.creator,
                isActive: info.isActive,
                createdAt: Number(info.createdAt),
                createdDate: new Date(Number(info.createdAt) * 1000).toISOString(),
                currentValue: Number(valueData.value),
                lastUpdated: Number(valueData.timestamp),
                lastUpdatedDate: new Date(Number(valueData.timestamp) * 1000).toISOString()
            };
        } catch (error) {
            console.error(`❌ Error fetching details for index ${indexId}:`, error.message);
            return null;
        }
    }

    /**
     * Get all predefined indices (0-5)
     */
    async getAllPredefinedIndices() {
        console.log('📊 Fetching predefined indices...');
        const indices = [];
        
        for (const predefined of this.predefinedIndices) {
            const details = await this.getIndexDetails(predefined.id);
            if (details) {
                details.type = 'PREDEFINED';
                details.indexType = predefined.type;
                indices.push(details);
            }
        }
        
        return indices;
    }

    /**
     * Get all custom indices from oracle
     */
    async getAllCustomIndices() {
        console.log('🔧 Fetching custom indices...');
        const indices = [];
        
        try {
            // Get all custom indices in batch from oracle
            const result = await this.oracle.methods.getAllCustomIndices().call();
            const { 0: indexIds, 1: values, 2: timestamps, 3: activeStates } = result;
            
            console.log(`Found ${indexIds.length} custom indices`);
            
            // Get detailed info for each custom index
            for (let i = 0; i < indexIds.length; i++) {
                const indexId = Number(indexIds[i]);
                const details = await this.getIndexDetails(indexId);
                
                if (details) {
                    details.type = 'CUSTOM';
                    // Add oracle data (sometimes more current than preInteraction)
                    details.oracleValue = Number(values[i]);
                    details.oracleTimestamp = Number(timestamps[i]);
                    details.oracleActive = activeStates[i];
                    indices.push(details);
                }
            }
        } catch (error) {
            console.error('❌ Error fetching custom indices:', error.message);
        }
        
        return indices;
    }

    /**
     * Get indices created by a specific user
     */
    async getUserCreatedIndices(userAddress) {
        console.log(`👤 Fetching indices created by ${userAddress}...`);
        const indices = [];
        
        try {
            const userIndexIds = await this.preInteraction.methods
                .getUserIndices(userAddress)
                .call();
            
            console.log(`User has created ${userIndexIds.length} indices`);
            
            for (const indexId of userIndexIds) {
                const details = await this.getIndexDetails(Number(indexId));
                if (details) {
                    details.type = 'USER_CREATED';
                    indices.push(details);
                }
            }
        } catch (error) {
            console.error(`❌ Error fetching user indices:`, error.message);
        }
        
        return indices;
    }

    /**
     * Format and display index data
     */
    displayIndexData(indices) {
        console.log('\n' + '='.repeat(80));
        console.log('📋 ALL INDICES SUMMARY');
        console.log('='.repeat(80));
        
        const predefined = indices.filter(i => i.type === 'PREDEFINED');
        const custom = indices.filter(i => i.type === 'CUSTOM');
        const userCreated = indices.filter(i => i.type === 'USER_CREATED');
        
        console.log(`\n📊 PREDEFINED INDICES (${predefined.length}):`);
        predefined.forEach(index => {
            const status = index.isActive ? '✅ Active' : '❌ Inactive';
            console.log(`\n  [${index.id}] ${index.indexType} - ${index.name}`);
            console.log(`      Value: ${index.currentValue.toLocaleString()}`);
            console.log(`      Description: ${index.description}`);
            console.log(`      Status: ${status}`);
            console.log(`      Last Updated: ${index.lastUpdatedDate}`);
        });

        console.log(`\n🔧 CUSTOM INDICES (${custom.length}):`);
        custom.forEach(index => {
            const status = index.isActive ? '✅ Active' : '❌ Inactive';
            const creator = index.creator === this.account.address ? 'YOU' : index.creator.slice(0, 8) + '...';
            console.log(`\n  [${index.id}] ${index.name}`);
            console.log(`      Value: ${index.currentValue.toLocaleString()}`);
            console.log(`      Description: ${index.description}`);
            console.log(`      Creator: ${creator}`);
            console.log(`      Status: ${status}`);
            console.log(`      Created: ${index.createdDate}`);
            console.log(`      Last Updated: ${index.lastUpdatedDate}`);
        });

        if (userCreated.length > 0) {
            console.log(`\n👤 YOUR CREATED INDICES (${userCreated.length}):`);
            userCreated.forEach(index => {
                const status = index.isActive ? '✅ Active' : '❌ Inactive';
                console.log(`\n  [${index.id}] ${index.name}`);
                console.log(`      Value: ${index.currentValue.toLocaleString()}`);
                console.log(`      Description: ${index.description}`);
                console.log(`      Status: ${status}`);
                console.log(`      Created: ${index.createdDate}`);
            });
        }
    }

    /**
     * Export data to JSON format
     */
    exportToJSON(indices, filename = 'all_indices.json') {
        const fs = require('fs');
        const exportData = {
            timestamp: new Date().toISOString(),
            totalIndices: indices.length,
            predefinedCount: indices.filter(i => i.type === 'PREDEFINED').length,
            customCount: indices.filter(i => i.type === 'CUSTOM').length,
            userCreatedCount: indices.filter(i => i.type === 'USER_CREATED').length,
            indices: indices
        };
        
        fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
        console.log(`\n💾 Data exported to ${filename}`);
    }

    /**
     * Main function to fetch all indices
     */
    async fetchAllIndices(options = {}) {
        console.log('🚀 Fetching All Index Data\n');
        console.log('🌐 Network: Base Sepolia');
        console.log('👛 Address:', this.account.address);
        console.log('\n' + '='.repeat(60));
        
        try {
            const allIndices = [];
            
            // Get predefined indices
            const predefined = await this.getAllPredefinedIndices();
            allIndices.push(...predefined);
            
            // Get custom indices
            const custom = await this.getAllCustomIndices();
            allIndices.push(...custom);
            
            // Get user-created indices (may overlap with custom)
            if (options.includeUserIndices) {
                const userIndices = await this.getUserCreatedIndices(this.account.address);
                // Mark duplicates to avoid confusion
                userIndices.forEach(userIndex => {
                    const existing = allIndices.find(i => i.id === userIndex.id);
                    if (existing) {
                        existing.type = 'USER_CREATED';
                    } else {
                        allIndices.push(userIndex);
                    }
                });
            }
            
            // Sort by ID
            allIndices.sort((a, b) => a.id - b.id);
            
            // Display results
            this.displayIndexData(allIndices);
            
            // Export if requested
            if (options.exportJSON) {
                this.exportToJSON(allIndices, options.filename);
            }
            
            console.log('\n' + '='.repeat(80));
            console.log('✅ INDEX FETCH COMPLETE!');
            console.log(`📊 Total Indices: ${allIndices.length}`);
            console.log(`🕐 Fetch Time: ${new Date().toISOString()}`);
            
            return allIndices;
            
        } catch (error) {
            console.error('💥 Error fetching indices:', error.message);
            if (error.stack) {
                console.error('📜 Stack trace:', error.stack);
            }
            throw error;
        }
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        includeUserIndices: args.includes('--user'),
        exportJSON: args.includes('--export'),
        filename: args.includes('--filename') ? args[args.indexOf('--filename') + 1] : 'all_indices.json'
    };
    
    console.log('📊 Index Data Fetcher');
    console.log('Options:', options);
    console.log('Usage: node get_all_indices.js [--user] [--export] [--filename output.json]\n');
    
    const fetcher = new IndexDataFetcher();
    fetcher.fetchAllIndices(options);
}

module.exports = IndexDataFetcher;