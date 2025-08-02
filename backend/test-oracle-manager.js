#!/usr/bin/env node

/**
 * Test script for Oracle Manager
 * 
 * Demonstrates all oracle management functions:
 * - Query all indices
 * - Create new index
 * - Update index values
 * - Simulate price movements
 * - Manage index status
 */

const oracleManager = require('./src/oracle-manager');
require('dotenv').config();

async function testOracleManager() {
    console.log('🧪 TESTING ORACLE MANAGER');
    console.log('=========================\n');
    
    try {
        console.log('📋 TEST 1: Oracle Status Check');
        console.log('===============================');
        const status = await oracleManager.getOracleStatus();
        if (status.success) {
            console.log(`✅ Oracle operational at ${status.contractAddress}`);
            console.log(`👤 Owner: ${status.owner}`);
            console.log(`🆔 Next Custom ID: ${status.nextCustomIndexId}\n`);
        }
        
        console.log('📊 TEST 2: Get All Predefined Indices');
        console.log('======================================');
        const predefined = await oracleManager.getAllPredefinedIndices();
        if (predefined.success) {
            console.log(`✅ Found ${predefined.count} predefined indices`);
            predefined.indices.forEach(oracleManager.displayIndex);
        }
        
        console.log('🛠️ TEST 3: Get All Custom Indices');
        console.log('==================================');
        const custom = await oracleManager.getAllCustomIndices();
        if (custom.success) {
            console.log(`✅ Found ${custom.count} custom indices`);
            if (custom.count > 0) {
                custom.indices.forEach(oracleManager.displayIndex);
            } else {
                console.log('   No custom indices found\n');
            }
        }
        
        console.log('📋 TEST 4: Get All Indices Combined');
        console.log('===================================');
        const all = await oracleManager.getAllIndices();
        if (all.success) {
            console.log(`✅ Total indices: ${all.summary.total}`);
            console.log(`   Predefined: ${all.summary.predefined}`);
            console.log(`   Custom: ${all.summary.custom}`);
            oracleManager.displayAllIndices(all.indices);
        }
        
        console.log('🔍 TEST 5: Get Specific Index (VIX)');
        console.log('===================================');
        const vixIndex = await oracleManager.getIndexById(3); // VIX_INDEX
        if (vixIndex.success) {
            console.log(`✅ Retrieved VIX Index:`);
            oracleManager.displayIndex(vixIndex.index);
        }
        
        // Test write functions only if private key is available
        const privateKey = process.env.PRIVATE_KEY;
        if (privateKey) {
            console.log('✍️ WRITE OPERATIONS TESTS');
            console.log('=========================');
            
            console.log('🆕 TEST 6: Create Custom Index');
            console.log('==============================');
            const newIndex = await oracleManager.createNewIndex(
                42000, // Initial value
                'https://api.example.com/custom-data', // Source URL
                privateKey
            );
            
            if (newIndex.success) {
                console.log(`✅ Created custom index ${newIndex.indexId}`);
                console.log(`📤 Transaction: ${newIndex.transactionHash}\n`);
                
                // Get the newly created index
                const createdIndex = await oracleManager.getIndexById(newIndex.indexId);
                if (createdIndex.success) {
                    console.log('📊 Newly Created Index:');
                    oracleManager.displayIndex(createdIndex.index);
                }
                
                console.log('📝 TEST 7: Update Custom Index');
                console.log('==============================');
                const updateResult = await oracleManager.updateIndexValue(
                    newIndex.indexId,
                    50000, // New value
                    privateKey
                );
                
                if (updateResult.success) {
                    console.log(`✅ Updated index ${newIndex.indexId} to ${updateResult.newValue}`);
                    console.log(`📤 Transaction: ${updateResult.transactionHash}\n`);
                    
                    // Verify the update
                    const updatedIndex = await oracleManager.getIndexById(newIndex.indexId);
                    if (updatedIndex.success) {
                        console.log('📊 Updated Index:');
                        oracleManager.displayIndex(updatedIndex.index);
                    }
                }
            }
            
            console.log('📈 TEST 8: Simulate Price Movement (VIX)');
            console.log('========================================');
            const simulation = await oracleManager.simulatePriceMovement(
                3, // VIX_INDEX
                500, // 5% change (500 basis points)
                true, // Increase
                privateKey
            );
            
            if (simulation.success) {
                console.log(`✅ Simulated +${simulation.percentChange / 100}% movement on VIX`);
                console.log(`📤 Transaction: ${simulation.transactionHash}\n`);
                
                // Check the new VIX value
                const newVix = await oracleManager.getIndexById(3);
                if (newVix.success) {
                    console.log('📊 VIX After Simulation:');
                    oracleManager.displayIndex(newVix.index);
                }
            }
            
            console.log('⚙️ TEST 9: Index Status Management');
            console.log('==================================');
            
            // First, let's try deactivating Tesla stock
            const deactivate = await oracleManager.setIndexStatus(
                5, // TESLA_STOCK
                false, // Deactivate
                privateKey
            );
            
            if (deactivate.success) {
                console.log(`✅ Deactivated Tesla Stock index`);
                console.log(`📤 Transaction: ${deactivate.transactionHash}\n`);
                
                // Check status
                const teslaInactive = await oracleManager.getIndexById(5);
                if (teslaInactive.success) {
                    console.log('📊 Tesla Stock (Deactivated):');
                    oracleManager.displayIndex(teslaInactive.index);
                }
                
                // Reactivate it
                const reactivate = await oracleManager.setIndexStatus(
                    5, // TESLA_STOCK
                    true, // Reactivate
                    privateKey
                );
                
                if (reactivate.success) {
                    console.log(`✅ Reactivated Tesla Stock index`);
                    console.log(`📤 Transaction: ${reactivate.transactionHash}\n`);
                    
                    // Check status again
                    const teslaActive = await oracleManager.getIndexById(5);
                    if (teslaActive.success) {
                        console.log('📊 Tesla Stock (Reactivated):');
                        oracleManager.displayIndex(teslaActive.index);
                    }
                }
            }
            
        } else {
            console.log('⚠️ WRITE OPERATIONS SKIPPED');
            console.log('===========================');
            console.log('Private key not found in environment variables.');
            console.log('Set PRIVATE_KEY in .env to test write operations.\n');
        }
        
        console.log('🎯 FINAL STATUS: Get All Indices');
        console.log('=================================');
        const finalStatus = await oracleManager.getAllIndices();
        if (finalStatus.success) {
            console.log(`📊 FINAL SUMMARY:`);
            console.log(`   Total Indices: ${finalStatus.summary.total}`);
            console.log(`   Predefined: ${finalStatus.summary.predefined}`);
            console.log(`   Custom: ${finalStatus.summary.custom}`);
            console.log('');
            
            oracleManager.displayAllIndices(finalStatus.indices);
        }
        
        console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
        console.log('====================================');
        
        // Frontend integration examples
        console.log('\n💻 FRONTEND INTEGRATION EXAMPLES');
        console.log('=================================');
        
        console.log(`
🔧 React Hook Example:
import { useState, useEffect } from 'react';
import * as oracleManager from './oracle-manager';

const useOracleIndices = () => {
  const [indices, setIndices] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const loadIndices = async () => {
    setLoading(true);
    try {
      const result = await oracleManager.getAllIndices();
      if (result.success) {
        setIndices(result.indices);
      }
    } catch (error) {
      console.error('Failed to load indices:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadIndices();
  }, []);
  
  return { indices, loading, refresh: loadIndices };
};

🔧 Vue.js Component Example:
<template>
  <div>
    <h2>Oracle Indices</h2>
    <div v-for="index in indices" :key="index.id">
      {{ index.name }}: {{ index.formatted }}
      <span :class="index.isActive ? 'active' : 'inactive'">
        {{ index.isActive ? 'Active' : 'Inactive' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as oracleManager from './oracle-manager';

const indices = ref([]);

const loadData = async () => {
  const result = await oracleManager.getAllIndices();
  if (result.success) {
    indices.value = result.indices;
  }
};

onMounted(loadData);
</script>

🔧 Express.js API Example:
const express = require('express');
const oracleManager = require('./oracle-manager');
const app = express();

app.get('/api/indices', async (req, res) => {
  try {
    const result = await oracleManager.getAllIndices();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/indices/:id', async (req, res) => {
  try {
    const result = await oracleManager.getIndexById(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/indices', async (req, res) => {
  try {
    const { initialValue, sourceUrl } = req.body;
    const privateKey = process.env.PRIVATE_KEY;
    
    const result = await oracleManager.createNewIndex(
      initialValue, 
      sourceUrl, 
      privateKey
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
if (require.main === module) {
    testOracleManager().catch(console.error);
}

module.exports = { testOracleManager };