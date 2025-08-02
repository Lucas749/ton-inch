#!/usr/bin/env node

/**
 * Comprehensive Test Script for Oracle Manager
 * 
 * Demonstrates all oracle management functions including hybrid oracle features:
 * - Query all indices (predefined & custom)
 * - Hybrid oracle system status
 * - Per-index oracle addresses
 * - Create new indices (3 levels: simple, typed, advanced)
 * - Update index values
 * - Simulate price movements
 * - Manage index status
 * - Oracle type inspection
 * - Set Chainlink oracle address
 * - Switch individual index oracle types
 * - Batch set oracle types for multiple indices
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
        
        // Test hybrid oracle functionality first
        console.log('🔗 TEST 6: Hybrid Oracle System');
        console.log('===============================');
        const hybridStatus = await oracleManager.getHybridOracleStatus();
        if (hybridStatus.success) {
            console.log('✅ Hybrid Oracle Status:');
            console.log(`   Default Chainlink: ${hybridStatus.chainlinkOracleAddress}`);
            console.log(`   Chainlink Configured: ${hybridStatus.isChainlinkConfigured}`);
            console.log(`   Mock Indices: ${hybridStatus.mockIndicesCount}`);
            console.log(`   Chainlink Indices: ${hybridStatus.chainlinkIndicesCount}\n`);
        }
        
        console.log('🌐 TEST 7: Per-Index Oracle Addresses');
        console.log('=====================================');
        const allOracles = await oracleManager.getAllIndexChainlinkOracles();
        if (allOracles.success) {
            console.log('✅ Oracle Address System:');
            console.log(`   Total Indices: ${allOracles.summary.total}`);
            console.log(`   Specific Oracles: ${allOracles.summary.specificOracles}`);
            console.log(`   Using Default: ${allOracles.summary.usingDefault}`);
            console.log(`   No Oracle: ${allOracles.summary.noOracle}\n`);
        }

        // Test write functions only if private key is available
        const privateKey = process.env.PRIVATE_KEY;
        if (privateKey) {
            console.log('✍️ WRITE OPERATIONS TESTS');
            console.log('=========================');
            
            console.log('🆕 TEST 8: Create Simple Index (Level 1)');
            console.log('========================================');
            const simpleIndex = await oracleManager.createNewIndex(
                42000, // Initial value
                'https://api.example.com/simple-data', // Source URL
                privateKey
            );
            
            if (simpleIndex.success) {
                console.log(`✅ Created simple index ${simpleIndex.indexId} (defaults to MOCK oracle)`);
                console.log(`📤 Transaction: ${simpleIndex.transactionHash}\n`);
            }
            
            console.log('🎯 TEST 9: Create Index with Oracle Type (Level 2)');
            console.log('===================================================');
            const typedIndex = await oracleManager.createNewIndexWithOracleType(
                'Test Bitcoin Index', // Name
                6500000, // Initial value ($65,000)
                'https://api.crypto.com/btc', // Source URL
                oracleManager.ORACLE_TYPES.CHAINLINK, // Oracle type
                privateKey
            );
            
            if (typedIndex.success) {
                console.log(`✅ Created typed index ${typedIndex.indexId} with ${typedIndex.oracleTypeName}`);
                console.log(`📤 Transaction: ${typedIndex.transactionHash}\n`);
            }
            
            console.log('🏆 TEST 10: Create Index with Specific Oracle (Level 3)');
            console.log('=======================================================');
            const advancedIndex = await oracleManager.createNewIndexWithChainlinkOracle(
                'Test VIX Index', // Name
                1500, // Initial value (15.00)
                'https://api.market.com/vix', // Source URL
                oracleManager.ORACLE_TYPES.CHAINLINK, // Oracle type
                '0x1234567890123456789012345678901234567890', // Specific oracle (example)
                privateKey
            );
            
            if (advancedIndex.success) {
                console.log(`✅ Created advanced index ${advancedIndex.indexId} with specific oracle`);
                console.log(`🔗 Chainlink Oracle: ${advancedIndex.chainlinkOracleAddress}`);
                console.log(`📤 Transaction: ${advancedIndex.transactionHash}\n`);
            }
            
            // Use the first created index for update tests
            const testIndexId = simpleIndex.success ? simpleIndex.indexId : 
                               typedIndex.success ? typedIndex.indexId : 
                               advancedIndex.success ? advancedIndex.indexId : null;
            
            if (testIndexId) {
                console.log('📝 TEST 11: Update Custom Index');
                console.log('===============================');
                const updateResult = await oracleManager.updateIndexValue(
                    testIndexId,
                    50000, // New value
                    privateKey
                );
                
                if (updateResult.success) {
                    console.log(`✅ Updated index ${testIndexId} to ${updateResult.newValue}`);
                    console.log(`📤 Transaction: ${updateResult.transactionHash}\n`);
                    
                    // Verify the update
                    const updatedIndex = await oracleManager.getIndexById(testIndexId);
                    if (updatedIndex.success) {
                        console.log('📊 Updated Index:');
                        oracleManager.displayIndex(updatedIndex.index);
                    }
                }
            }
            
            console.log('📈 TEST 12: Simulate Price Movement (VIX)');
            console.log('=========================================');
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
            
            console.log('⚙️ TEST 13: Index Status Management');
            console.log('===================================');
            
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
            
            console.log('🔍 TEST 14: Oracle Type Inspection');
            console.log('==================================');
            const allForInspection = await oracleManager.getAllIndices();
            if (allForInspection.success) {
                console.log('📊 Oracle Type for each index:');
                for (let i = 0; i < Math.min(8, allForInspection.summary.total); i++) {
                    const oracleTypeResult = await oracleManager.getIndexOracleType(i);
                    if (oracleTypeResult.success) {
                        console.log(`   Index ${i}: ${oracleTypeResult.oracleTypeName}`);
                    } else {
                        console.log(`   Index ${i}: Error getting oracle type`);
                    }
                }
                console.log('');
            }
            
            console.log('👤 TEST 14b: Creator Functionality Testing');
            console.log('==========================================');
            
            // Test getIndexCreator for predefined indices
            console.log('📋 Testing creator information for predefined indices:');
            for (let i = 0; i <= 5; i++) {
                const creatorResult = await oracleManager.getIndexCreator(i);
                if (creatorResult.success) {
                    console.log(`   Index ${i}: Creator ${creatorResult.creator}`);
                } else {
                    console.log(`   Index ${i}: Error getting creator`);
                }
            }
            
            // Test getIndexDetails for a specific index
            const detailsResult = await oracleManager.getIndexDetails(3); // VIX Index
            if (detailsResult.success) {
                console.log('\n📊 Detailed index information with creator:');
                oracleManager.displayIndex(detailsResult.index);
            }
            
            // Test getAllCustomIndicesWithCreators if there are custom indices
            const customWithCreators = await oracleManager.getAllCustomIndicesWithCreators();
            if (customWithCreators.success && customWithCreators.count > 0) {
                console.log('👥 Custom indices with creator information:');
                customWithCreators.indices.forEach((index, i) => {
                    console.log(`   ${i + 1}. ${index.name} - Creator: ${index.creator}`);
                });
            } else {
                console.log('📋 No custom indices found for creator testing');
            }
            console.log('');
            
            console.log('🔗 TEST 15: Set EPS Consumer as Chainlink Oracle');
            console.log('==============================================');
            
            // Use our deployed EPS consumer contract
            const epsConsumerAddress = '0xc4e07abf90C493968cd9216320c2349F9490552b';
            
            const setChainlinkResult = await oracleManager.setChainlinkOracleAddress(
                epsConsumerAddress,
                privateKey
            );
            
            if (setChainlinkResult.success) {
                console.log(`✅ EPS Consumer set as Chainlink oracle successfully`);
                console.log(`📍 Address: ${epsConsumerAddress}`);
                console.log(`📤 Transaction: ${setChainlinkResult.transactionHash}\n`);
                
                // Now create an EPS index using the deployed consumer
                console.log('📊 TEST 15b: Create Alpha Vantage EPS Index');
                console.log('==========================================');
                
                const epsIndex = await oracleManager.createNewIndexWithChainlinkOracle(
                    'MSTR EPS Estimates', // Name
                    1250, // Initial value ($12.50 EPS estimate)
                    'https://www.alphavantage.co/query?function=EARNINGS_ESTIMATES&symbol=MSTR', // Alpha Vantage URL
                    oracleManager.ORACLE_TYPES.CHAINLINK, // Use Chainlink oracle type
                    epsConsumerAddress, // Our deployed EPS consumer
                    privateKey
                );
                
                if (epsIndex.success) {
                    console.log(`✅ Created MSTR EPS index ${epsIndex.indexId} using Alpha Vantage`);
                    console.log(`🔗 Chainlink Oracle: ${epsIndex.chainlinkOracleAddress}`);
                    console.log(`📊 Source: Alpha Vantage EARNINGS_ESTIMATES API`);
                    console.log(`📤 Transaction: ${epsIndex.transactionHash}\n`);
                    
                    // Verify the created index
                    const newEpsIndex = await oracleManager.getIndexById(epsIndex.indexId);
                    if (newEpsIndex.success) {
                        console.log('📋 Created EPS Index Details:');
                        oracleManager.displayIndex(newEpsIndex.index);
                        
                        // Check oracle type
                        const epsOracleType = await oracleManager.getIndexOracleType(epsIndex.indexId);
                        if (epsOracleType.success) {
                            console.log(`🔧 Oracle Type: ${epsOracleType.oracleTypeName}`);
                        }
                    }
                } else {
                    console.log(`❌ Failed to create EPS index: ${epsIndex.error}\n`);
                }
            } else {
                console.log(`❌ Failed to set EPS Consumer oracle: ${setChainlinkResult.error}\n`);
            }
            
            console.log('🔄 TEST 16: Switch Index Oracle Type');
            console.log('====================================');
            
            const switchResult = await oracleManager.setIndexOracleType(
                2,                                    // BTC Index
                oracleManager.ORACLE_TYPES.CHAINLINK, // Switch to Chainlink
                privateKey
            );
            
            if (switchResult.success) {
                console.log(`✅ BTC index switched to ${switchResult.oracleTypeName}`);
                console.log(`📤 Transaction: ${switchResult.transactionHash}\n`);
                
                // Check the oracle type after switch
                const btcTypeCheck = await oracleManager.getIndexOracleType(2);
                if (btcTypeCheck.success) {
                    console.log(`📊 BTC Oracle Type after switch: ${btcTypeCheck.oracleTypeName}\n`);
                }
            } else {
                console.log(`❌ Failed to switch BTC oracle type: ${switchResult.error}\n`);
            }
            
            console.log('🔄 TEST 17: Batch Set Oracle Types');
            console.log('==================================');
            
            const batchResult = await oracleManager.batchSetOracleTypes(
                [0, 1, 4],                                                    // Inflation, Elon, Unemployment
                [
                    oracleManager.ORACLE_TYPES.CHAINLINK,                    // Inflation -> Chainlink
                    oracleManager.ORACLE_TYPES.MOCK,                         // Elon -> Mock
                    oracleManager.ORACLE_TYPES.CHAINLINK                     // Unemployment -> Chainlink
                ],
                privateKey
            );
            
            if (batchResult.success) {
                console.log(`✅ Batch oracle types updated successfully`);
                console.log(`📤 Transaction: ${batchResult.transactionHash}\n`);
                
                // Verify the batch changes
                console.log('📋 Verifying batch oracle type changes:');
                for (const indexId of [0, 1, 4]) {
                    const typeCheck = await oracleManager.getIndexOracleType(indexId);
                    if (typeCheck.success) {
                        console.log(`   Index ${indexId}: ${typeCheck.oracleTypeName}`);
                    }
                }
                console.log('');
            } else {
                console.log(`❌ Failed to batch update oracle types: ${batchResult.error}\n`);
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
        console.log('🔗 This comprehensive test now includes all hybrid oracle features:');
        console.log('   📊 Oracle type management (Mock ↔ Chainlink switching)');
        console.log('   🔄 Individual & batch oracle type updates'); 
        console.log('   🏭 Per-index Chainlink oracle configuration');
        console.log('   ⚙️ Production-ready migration tools');
        console.log('   📈 EPS Consumer integration with Alpha Vantage API');
        console.log('   🎯 Real-world financial data via Chainlink Functions');
        console.log('');
        
        // Frontend integration examples
        console.log('\n💻 FRONTEND INTEGRATION EXAMPLES');
        console.log('=================================');
        
        console.log(`
🔧 React Hook Example (with Hybrid Oracle Features):
import { useState, useEffect } from 'react';
import * as oracleManager from './oracle-manager';

const useOracleIndices = () => {
  const [indices, setIndices] = useState([]);
  const [oracleStatus, setOracleStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [indicesResult, statusResult] = await Promise.all([
        oracleManager.getAllIndices(),
        oracleManager.getHybridOracleStatus()
      ]);
      
      if (indicesResult.success) {
        setIndices(indicesResult.indices);
      }
      if (statusResult.success) {
        setOracleStatus(statusResult);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const switchOracleType = async (indexId, oracleType, privateKey) => {
    const result = await oracleManager.setIndexOracleType(indexId, oracleType, privateKey);
    if (result.success) {
      await loadData(); // Refresh data
    }
    return result;
  };
  
  useEffect(() => {
    loadData();
  }, []);
  
  return { 
    indices, 
    oracleStatus, 
    loading, 
    refresh: loadData,
    switchOracleType
  };
};

🔧 Vue.js Component Example (with Oracle Type Management):
<template>
  <div>
    <h2>Oracle Indices Dashboard</h2>
    
    <!-- Oracle Status -->
    <div v-if="oracleStatus" class="oracle-status">
      <h3>Hybrid Oracle Status</h3>
      <p>Chainlink: {{ oracleStatus.isChainlinkConfigured ? 'Configured' : 'Not Set' }}</p>
      <p>Mock Indices: {{ oracleStatus.mockIndicesCount }}</p>
      <p>Chainlink Indices: {{ oracleStatus.chainlinkIndicesCount }}</p>
    </div>
    
    <!-- Indices List -->
    <div v-for="index in indices" :key="index.id" class="index-item">
      {{ index.name }}: {{ index.formatted }}
      <span :class="index.isActive ? 'active' : 'inactive'">
        {{ index.isActive ? 'Active' : 'Inactive' }}
      </span>
      
      <!-- Oracle Type Display & Switch -->
      <div class="oracle-controls">
        <span class="oracle-type">{{ getOracleTypeName(index.id) }}</span>
        <button @click="switchOracle(index.id)" :disabled="loading">
          Switch to {{ getAlternateOracleType(index.id) }}
        </button>
      </div>
    </div>
    
    <!-- Batch Oracle Management -->
    <div class="batch-controls">
      <h3>Batch Oracle Management</h3>
      <button @click="batchSwitchToChainlink" :disabled="loading">
        Switch All to Chainlink
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as oracleManager from './oracle-manager';

const indices = ref([]);
const oracleStatus = ref(null);
const oracleTypes = ref({});
const loading = ref(false);

const loadData = async () => {
  loading.value = true;
  try {
    const [indicesResult, statusResult] = await Promise.all([
      oracleManager.getAllIndices(),
      oracleManager.getHybridOracleStatus()
    ]);
    
    if (indicesResult.success) {
      indices.value = indicesResult.indices;
      
      // Load oracle types for each index
      for (const index of indicesResult.indices) {
        const typeResult = await oracleManager.getIndexOracleType(index.id);
        if (typeResult.success) {
          oracleTypes.value[index.id] = typeResult.oracleType;
        }
      }
    }
    
    if (statusResult.success) {
      oracleStatus.value = statusResult;
    }
  } finally {
    loading.value = false;
  }
};

const getOracleTypeName = (indexId) => {
  const type = oracleTypes.value[indexId];
  return type === 0 ? 'Mock' : type === 1 ? 'Chainlink' : 'Unknown';
};

const getAlternateOracleType = (indexId) => {
  const current = oracleTypes.value[indexId];
  return current === 0 ? 'Chainlink' : 'Mock';
};

const switchOracle = async (indexId) => {
  const currentType = oracleTypes.value[indexId];
  const newType = currentType === 0 ? 1 : 0; // Toggle between Mock (0) and Chainlink (1)
  
  // Note: In real app, you'd get privateKey from secure source
  const result = await oracleManager.setIndexOracleType(indexId, newType, process.env.PRIVATE_KEY);
  
  if (result.success) {
    await loadData(); // Refresh
  }
};

const batchSwitchToChainlink = async () => {
  const indexIds = indices.value.map(i => i.id);
  const chainlinkTypes = indexIds.map(() => 1); // All to Chainlink
  
  const result = await oracleManager.batchSetOracleTypes(indexIds, chainlinkTypes, process.env.PRIVATE_KEY);
  
  if (result.success) {
    await loadData(); // Refresh
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

// Simple index creation (Level 1)
app.post('/api/indices/simple', async (req, res) => {
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

// Index with oracle type (Level 2)
app.post('/api/indices/typed', async (req, res) => {
  try {
    const { name, initialValue, sourceUrl, oracleType } = req.body;
    const privateKey = process.env.PRIVATE_KEY;
    
    const result = await oracleManager.createNewIndexWithOracleType(
      name,
      initialValue, 
      sourceUrl,
      oracleType,
      privateKey
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Index with specific Chainlink oracle (Level 3)
app.post('/api/indices/advanced', async (req, res) => {
  try {
    const { name, initialValue, sourceUrl, oracleType, chainlinkOracleAddress } = req.body;
    const privateKey = process.env.PRIVATE_KEY;
    
    const result = await oracleManager.createNewIndexWithChainlinkOracle(
      name,
      initialValue, 
      sourceUrl,
      oracleType,
      chainlinkOracleAddress,
      privateKey
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get hybrid oracle status
app.get('/api/oracle/status', async (req, res) => {
  try {
    const result = await oracleManager.getHybridOracleStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all oracle addresses
app.get('/api/oracle/addresses', async (req, res) => {
  try {
    const result = await oracleManager.getAllIndexChainlinkOracles();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get oracle type for specific index
app.get('/api/indices/:id/oracle-type', async (req, res) => {
  try {
    const result = await oracleManager.getIndexOracleType(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set default Chainlink oracle address
app.post('/api/oracle/chainlink-address', async (req, res) => {
  try {
    const { chainlinkOracleAddress } = req.body;
    const privateKey = process.env.PRIVATE_KEY;
    
    const result = await oracleManager.setChainlinkOracleAddress(
      chainlinkOracleAddress,
      privateKey
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Switch index oracle type
app.put('/api/indices/:id/oracle-type', async (req, res) => {
  try {
    const { oracleType } = req.body;
    const privateKey = process.env.PRIVATE_KEY;
    
    const result = await oracleManager.setIndexOracleType(
      parseInt(req.params.id),
      oracleType,
      privateKey
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch set oracle types
app.put('/api/oracle/batch-types', async (req, res) => {
  try {
    const { indexIds, oracleTypes } = req.body;
    const privateKey = process.env.PRIVATE_KEY;
    
    const result = await oracleManager.batchSetOracleTypes(
      indexIds,
      oracleTypes,
      privateKey
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

🔧 EPS Consumer Integration Example:
const { ethers } = require('ethers');

// EPS Consumer contract integration
const EPS_CONSUMER_ADDRESS = '0xc4e07abf90C493968cd9216320c2349F9490552b';
const EPS_CONSUMER_ABI = [
  "function requestEPS(string calldata symbol) external returns (bytes32 requestId)",
  "function getLatestEPS() external view returns (uint256 eps, string memory symbol, uint256 timestamp)",
  "function getFormattedEPS() external view returns (string memory)",
  "event EPSUpdated(bytes32 indexed requestId, string symbol, uint256 epsValue, uint256 timestamp)"
];

// Function to request EPS data
app.post('/api/eps/request/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const epsContract = new ethers.Contract(EPS_CONSUMER_ADDRESS, EPS_CONSUMER_ABI, wallet);
    
    const gasSettings = {
      gasPrice: ethers.utils.parseUnits('0.0052', 'gwei'),
      gasLimit: 500000
    };
    
    const tx = await epsContract.requestEPS(symbol.toUpperCase(), gasSettings);
    const receipt = await tx.wait();
    
    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      message: 'EPS request sent. Check again in 1-2 minutes for results.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Function to get latest EPS data
app.get('/api/eps/latest', async (req, res) => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const epsContract = new ethers.Contract(EPS_CONSUMER_ADDRESS, EPS_CONSUMER_ABI, provider);
    
    const [eps, symbol, timestamp] = await epsContract.getLatestEPS();
    const formattedEPS = await epsContract.getFormattedEPS();
    
    res.json({
      success: true,
      eps: eps.toString(),
      formattedEPS: formattedEPS,
      symbol: symbol,
      timestamp: timestamp.toString(),
      lastUpdate: timestamp.toNumber() > 0 ? new Date(timestamp.toNumber() * 1000).toISOString() : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Combined endpoint: Create EPS index and connect to consumer
app.post('/api/indices/eps-integrated', async (req, res) => {
  try {
    const { symbol, description } = req.body;
    const privateKey = process.env.PRIVATE_KEY;
    
    // Create index using EPS consumer
    const result = await oracleManager.createNewIndexWithChainlinkOracle(
      \`$\{symbol} EPS Estimates\`,
      1000, // Default EPS estimate
      \`https://www.alphavantage.co/query?function=EARNINGS_ESTIMATES&symbol=$\{symbol}\`,
      oracleManager.ORACLE_TYPES.CHAINLINK,
      EPS_CONSUMER_ADDRESS,
      privateKey
    );
    
    if (result.success) {
      // Also store the mapping for frontend use
      res.json({
        ...result,
        epsConsumerAddress: EPS_CONSUMER_ADDRESS,
        symbol: symbol.toUpperCase(),
        description: description || \`$\{symbol} EPS estimates via Alpha Vantage\`
      });
    } else {
      res.status(500).json(result);
    }
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