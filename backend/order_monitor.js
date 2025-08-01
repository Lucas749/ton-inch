#!/usr/bin/env node

/**
 * 🔍 Order Monitor - Real-time Order Status Checker
 * 
 * This script allows you to monitor specific orders or all orders by providing their hashes.
 * It shows current conditions, execution status, and provides real-time updates.
 */

const { Web3 } = require('web3');
require('dotenv').config();

// Import the base workflow for contract setup
const IndexWorkflow = require('./web3_workflow');

class OrderMonitor extends IndexWorkflow {
    constructor() {
        super();
        this.monitoredOrders = [];
    }
    
    async addOrderToMonitor(orderHash, description = 'Custom Order') {
        console.log(`📝 Adding order to monitor: ${orderHash}`);
        
        try {
            // Verify the order exists and get its details
            const condition = await this.preInteraction.methods
                .getOrderCondition(orderHash)
                .call();
            
            this.monitoredOrders.push({
                hash: orderHash,
                description: description,
                addedAt: new Date().toISOString()
            });
            
            console.log('✅ Order added to monitor successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error adding order to monitor:', error.message);
            return false;
        }
    }
    
    async checkSpecificOrder(orderHash) {
        console.log(`\n🔍 Checking Order: ${orderHash}`);
        console.log('=' + '='.repeat(60));
        
        try {
            // Get condition details
            const condition = await this.preInteraction.methods
                .getOrderCondition(orderHash)
                .call();
                
            const currentValue = await this.preInteraction.methods
                .getIndexValue(condition.indexId)
                .call();
            
            // Operator mapping
            const operators = ['GREATER_THAN (>)', 'LESS_THAN (<)', 'GREATER_THAN_EQUAL (>=)', 'LESS_THAN_EQUAL (<=)', 'EQUAL (=)'];
            const operatorText = operators[Number(condition.operator)] || 'UNKNOWN';
            
            // Format values
            const threshold = Number(condition.thresholdValue);
            const current = Number(currentValue.value);
            
            let thresholdDisplay, currentDisplay;
            if (threshold > 1000) {
                thresholdDisplay = `$${(threshold / 100).toFixed(2)}`;
                currentDisplay = `$${(current / 100).toFixed(2)}`;
            } else {
                thresholdDisplay = threshold.toString();
                currentDisplay = current.toString();
            }
            
            console.log('📊 Order Details:');
            console.log(`  Order Hash: ${orderHash}`);
            console.log(`  Index ID: ${condition.indexId}`);
            console.log(`  Condition: ${operatorText}`);
            console.log(`  Threshold: ${thresholdDisplay}`);
            console.log(`  Current Value: ${currentDisplay}`);
            console.log(`  Last Updated: ${new Date(Number(currentValue.timestamp) * 1000).toISOString()}`);
            
            // Check execution status
            const canExecute = await this.preInteraction.methods
                .validateOrderCondition(orderHash)
                .call();
            
            console.log('\n🎯 Execution Status:');
            if (canExecute) {
                console.log('  Status: 🟢 EXECUTABLE');
                console.log('  Condition: ✅ MET');
                console.log('  🚀 This order can be executed now!');
            } else {
                console.log('  Status: 🟡 PENDING');
                console.log('  Condition: ❌ NOT MET');
                console.log('  ⏸️  Waiting for condition to be satisfied.');
            }
            
            // Show what needs to happen
            console.log('\n📈 Condition Analysis:');
            const diff = current - threshold;
            const percentDiff = threshold > 0 ? ((diff / threshold) * 100).toFixed(2) : 'N/A';
            
            switch (Number(condition.operator)) {
                case 0: // GT
                    if (canExecute) {
                        console.log(`  ✅ ${currentDisplay} > ${thresholdDisplay} (difference: +${Math.abs(diff)})`);
                    } else {
                        console.log(`  ❌ ${currentDisplay} ≤ ${thresholdDisplay} (needs: +${Math.abs(diff)} more)`);
                    }
                    break;
                case 1: // LT
                    if (canExecute) {
                        console.log(`  ✅ ${currentDisplay} < ${thresholdDisplay} (difference: -${Math.abs(diff)})`);
                    } else {
                        console.log(`  ❌ ${currentDisplay} ≥ ${thresholdDisplay} (needs: -${Math.abs(diff)} less)`);
                    }
                    break;
                case 2: // GTE
                    if (canExecute) {
                        console.log(`  ✅ ${currentDisplay} >= ${thresholdDisplay}`);
                    } else {
                        console.log(`  ❌ ${currentDisplay} < ${thresholdDisplay} (needs: +${Math.abs(diff)} more)`);
                    }
                    break;
                case 3: // LTE
                    if (canExecute) {
                        console.log(`  ✅ ${currentDisplay} <= ${thresholdDisplay}`);
                    } else {
                        console.log(`  ❌ ${currentDisplay} > ${thresholdDisplay} (needs: -${Math.abs(diff)} less)`);
                    }
                    break;
                case 4: // EQ
                    if (canExecute) {
                        console.log(`  ✅ ${currentDisplay} = ${thresholdDisplay}`);
                    } else {
                        console.log(`  ❌ ${currentDisplay} ≠ ${thresholdDisplay} (difference: ${diff})`);
                    }
                    break;
            }
            
            return canExecute;
            
        } catch (error) {
            console.error('❌ Error checking order:', error.message);
            return false;
        }
    }
    
    async monitorAllTrackedOrders() {
        console.log('\n📋 === MONITORING ALL TRACKED ORDERS ===');
        
        if (this.monitoredOrders.length === 0) {
            console.log('  No orders are being monitored');
            console.log('  Use addOrderToMonitor(orderHash) to track orders');
            return;
        }
        
        console.log(`  Monitoring ${this.monitoredOrders.length} order(s):\n`);
        
        let executableCount = 0;
        for (let i = 0; i < this.monitoredOrders.length; i++) {
            const order = this.monitoredOrders[i];
            console.log(`📦 Order ${i + 1}: ${order.description}`);
            console.log(`   Added: ${order.addedAt}`);
            
            const isExecutable = await this.checkSpecificOrder(order.hash);
            if (isExecutable) executableCount++;
            
            console.log(''); // Spacing
        }
        
        // Summary
        console.log('📊 Monitoring Summary:');
        console.log(`  Total Orders: ${this.monitoredOrders.length}`);
        console.log(`  Executable Now: ${executableCount} 🟢`);
        console.log(`  Still Pending: ${this.monitoredOrders.length - executableCount} 🟡`);
    }
    
    async startContinuousMonitoring(intervalSeconds = 30) {
        console.log(`🔄 Starting continuous monitoring (checking every ${intervalSeconds} seconds)`);
        console.log('Press Ctrl+C to stop\n');
        
        const monitor = async () => {
            console.log(`🕐 ${new Date().toISOString()} - Checking orders...`);
            await this.monitorAllTrackedOrders();
            console.log('─'.repeat(80));
        };
        
        // Initial check
        await monitor();
        
        // Set up interval
        setInterval(monitor, intervalSeconds * 1000);
    }
}

// Example usage and CLI interface
async function main() {
    const args = process.argv.slice(2);
    const monitor = new OrderMonitor();
    
    if (args.length === 0) {
        console.log('🔍 Order Monitor - Usage Examples:');
        console.log('');
        console.log('Check specific order:');
        console.log('  node order_monitor.js check 0x1234...');
        console.log('');
        console.log('Monitor multiple orders:');
        console.log('  node order_monitor.js monitor 0x1234... 0x5678...');
        console.log('');
        console.log('Continuous monitoring (30s intervals):');
        console.log('  node order_monitor.js watch 0x1234...');
        console.log('');
        return;
    }
    
    const command = args[0];
    
    switch (command) {
        case 'check':
            if (args[1]) {
                await monitor.checkSpecificOrder(args[1]);
            } else {
                console.log('❌ Please provide an order hash to check');
            }
            break;
            
        case 'monitor':
            for (let i = 1; i < args.length; i++) {
                await monitor.addOrderToMonitor(args[i], `Order ${i}`);
            }
            await monitor.monitorAllTrackedOrders();
            break;
            
        case 'watch':
            for (let i = 1; i < args.length; i++) {
                await monitor.addOrderToMonitor(args[i], `Order ${i}`);
            }
            await monitor.startContinuousMonitoring(30);
            break;
            
        default:
            console.log('❌ Unknown command:', command);
            console.log('Available commands: check, monitor, watch');
    }
}

// Run CLI if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = OrderMonitor;