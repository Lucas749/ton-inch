# 🦄 Unicorn Project - Event-Triggered DeFi Strategies

Revolutionary DeFi platform that executes token swaps based on **real-world events** using **1inch Protocol** and **Alpha Vantage data**.

## 🏗️ **Architecture**

### **🎨 Frontend Application** (`/front-end/`)

**Main application with wallet integration**

- ✅ **Next.js 13** with App Router
- ✅ **MetaMask Integration** - Secure wallet-based authentication
- ✅ **Direct Blockchain Interaction** - No API server needed
- ✅ **1inch Swap Integration** - Classic & Intent-based swaps
- ✅ **Alpha Vantage Integration** - Real-world data triggers
- ✅ **Real-time UI** - React hooks for blockchain state

**Key Features:**

- 🔗 Connect MetaMask wallet
- 📊 Create strategies with Alpha Vantage triggers
- 💱 Configure 1inch swaps (Classic/Intent modes)
- 📈 View strategy performance
- 🔄 Manual swap triggering
- 🗃️ Blockchain index management

### **🧪 Backend Demos** (`/backend/`)

**Smart contracts and testing scripts**

- ✅ **Foundry Smart Contracts** - Solidity contracts
- ✅ **Demo Scripts** - Web3.js testing workflows
- ✅ **Private Key Based** - For automated testing only
- ✅ **Base Sepolia Testnet** - Deployed contracts

**Key Components:**

- 📜 Smart contracts for index-based orders
- 🧪 Comprehensive demo scripts
- 🔧 Foundry testing suite
- 📖 Detailed documentation

## 🚀 **Quick Start**

### **Frontend (Main Application)**

```bash
cd front-end
npm install
npm run dev
```

**Environment Setup:**

```bash
# Create front-end/.env.local
NEXT_PUBLIC_ONEINCH_API_KEY=your_1inch_api_key
NEXT_PUBLIC_ALPHAVANTAGE_API_KEY=your_alphavantage_api_key
```

### **Backend (Demo Scripts)**

```bash
cd backend
npm install
npm run demo
```

**Environment Setup (Demos Only):**

```bash
# Create backend/.env (for demo scripts only)
PRIVATE_KEY=your_private_key_for_testing_only
```

## 🔒 **Security Model**

### **Production (Frontend)**

- 🔐 **MetaMask Wallet** - User controls private keys
- ✅ **No Server Private Keys** - Maximum security
- 🔗 **Direct Blockchain Calls** - No API intermediary
- 🛡️ **Environment Variables** - Only API keys, no secrets

### **Development (Backend)**

- 🧪 **Demo Scripts Only** - Private keys for testing
- ⚠️ **Not Production** - Backend demos are for development
- 📝 **Educational** - Shows smart contract interaction

## 🎯 **How It Works**

1. **📊 Data Trigger** - Alpha Vantage monitors real-world events
2. **🔗 Strategy Creation** - User defines conditions and swap parameters
3. **⚡ Event Detection** - System detects trigger conditions
4. **💱 Swap Execution** - 1inch Protocol executes the swap
5. **📈 Result Tracking** - User sees strategy performance

## 🛠️ **Technology Stack**

### **Frontend**

- **Next.js 13** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Modern UI components
- **viem & wagmi** - Ethereum interaction
- **Recharts** - Data visualization

### **Backend**

- **Foundry** - Smart contract development
- **Solidity** - Smart contract language
- **Web3.js** - Blockchain interaction
- **Node.js** - Demo script runtime

### **Blockchain**

- **Base Sepolia** - Ethereum L2 testnet
- **1inch Protocol** - DEX aggregation
- **Smart Contracts** - Custom index logic

### **External APIs**

- **1inch Swap API** - Token swapping
- **Alpha Vantage API** - Financial data

## 📁 **Project Structure**

```
unicorn-project/
├── front-end/                 # 🎨 Main Next.js Application
│   ├── app/                   # Next.js 13 App Router
│   ├── components/            # React components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   └── .env.local             # Frontend environment variables
├── backend/                   # 🧪 Smart Contracts & Demos
│   ├── contracts/             # Solidity smart contracts
│   ├── test/                  # Contract tests
│   ├── script/                # Deployment scripts
│   ├── *.js                   # Demo scripts
│   └── .env                   # Backend demo environment
└── resources/                 # 📚 Documentation & Assets
```

## 🌟 **Key Innovations**

- **🔗 Wallet-First Architecture** - No server-side private keys
- **📊 Real-World Triggers** - Alpha Vantage data integration
- **💱 Gasless Swaps** - 1inch Intent-based swaps
- **🎯 Event-Driven** - Automated strategy execution
- **🛡️ Security-First** - MetaMask integration
- **⚡ Direct Integration** - No API server overhead

---

**🎉 Ready to build the future of DeFi? Start with the frontend application!**

```bash
cd front-end && npm run dev
```
