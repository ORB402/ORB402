<p align="center">
  <img src="https://www.orb402.com/favicon-ORB.jpg" alt="ORB402" width="80" height="80" style="border-radius: 50%;" />
</p>

<h1 align="center">ORB402</h1>

<p align="center">
  <strong>Privacy-First Financial Infrastructure on Base</strong>
</p>

<p align="center">
  <a href="https://www.orb402.com">Website</a> &nbsp;&middot;&nbsp;
  <a href="https://x.com/orb402">Twitter</a> &nbsp;&middot;&nbsp;
  <a href="#getting-started">Getting Started</a> &nbsp;&middot;&nbsp;
  <a href="#architecture">Architecture</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/chain-Base-0052FF?style=flat-square&logo=ethereum" alt="Base Chain" />
  <img src="https://img.shields.io/badge/privacy-Zero--Knowledge-8B5CF6?style=flat-square" alt="Zero-Knowledge" />
  <img src="https://img.shields.io/badge/protocol-x402-06B6D4?style=flat-square" alt="x402 Protocol" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License" />
</p>

---

## What is ORB402?

ORB402 is a privacy-preserving payment platform built on the [Base](https://base.org) blockchain. It enables users to send, receive, and manage digital assets with configurable privacy levels — from fully transparent to fully encrypted transactions using zero-knowledge proofs.

At its core, ORB402 solves a fundamental problem in blockchain finance: **every transaction you make is permanently visible to anyone in the world.** ORB402 gives users control over who sees what, while maintaining full compliance and auditability when needed.

---

## Key Features

### Privacy Controls
Users choose their own privacy level for every interaction:

| Level | What's Visible | What's Hidden |
|-------|---------------|---------------|
| **Public** | Full transaction details | Nothing |
| **Partial** | Sender & receiver | Transaction amounts |
| **Full** | Nothing | All transaction details |

### Encrypted Balances
Account balances are encrypted using zero-knowledge proofs. Only the wallet owner can view their true holdings. External observers see encrypted data that reveals nothing about the underlying amounts.

### Confidential Payments
Send and receive payments with complete transaction privacy. Amounts, sender, and receiver information can all be hidden depending on the selected privacy level. Transactions settle in under 2 seconds on Base.

### x402 Protocol Support
ORB402 supports the [x402 protocol](https://www.x402.org/) — an HTTP-native payment standard that enables AI agents and APIs to transact programmatically without exposing user data. This is particularly useful for machine-to-machine payments and API monetization.

### Additional Capabilities
- **Transaction History** — Full audit trail with privacy-level-aware display
- **Encrypted Messaging** — Send private messages between users
- **Username System** — Human-readable usernames instead of raw wallet addresses
- **Multi-Wallet Support** — Connect via MetaMask or Phantom
- **Real-Time Notifications** — Stay informed about incoming payments and status changes

---

## Architecture

ORB402 is composed of three main layers: a React frontend, a serverless API backend, and on-chain smart contracts.

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  Dashboard  ·  Payments  ·  History  ·  Settings         │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│               API Layer (Serverless Functions)           │
│  Auth  ·  Payments  ·  ZK Operations  ·  Messages        │
└──────────────────────┬──────────────────────────────────┘
                       │ RPC / Contract Calls
┌──────────────────────▼──────────────────────────────────┐
│              Smart Contracts (Base Blockchain)            │
│         Privacy Pool  ·  Deposit Router  ·  x402         │
└─────────────────────────────────────────────────────────┘
                       │
               ┌───────▼───────┐
               │   Supabase    │
               │  (Database)   │
               └───────────────┘
```

### Frontend

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tooling |
| Tailwind CSS | Styling |
| Shadcn/ui | Component library |
| Framer Motion | Animations |
| Ethers.js | Blockchain interaction |
| React Router | Client-side routing |
| TanStack Query | Data fetching & caching |

The frontend is a single-page application with a dashboard layout featuring:
- **Left Sidebar** — Navigation, account overview, and activity breakdown
- **Main Content** — Context-sensitive view based on the active tab (Overview, Payments, Withdraw, History, Settings)
- **Right Sidebar** — Insights, quick actions, and monthly summaries
- **Top Bar** — Home link, balance visibility toggle, notifications, and wallet connection

### API Layer

The backend consists of Vercel serverless functions organized by domain:

| Endpoint Group | Description |
|---------------|-------------|
| `/api/auth/*` | Wallet-based authentication (nonce generation, signature verification) |
| `/api/zk/*` | Zero-knowledge operations (deposits, withdrawals, transfers, proofs) |
| `/api/payments/*` | Payment request creation, listing, settlement, and cancellation |
| `/api/messages/*` | Encrypted messaging between users |
| `/api/user/*` | User profiles and username management |
| `/api/history/*` | Transaction history queries |
| `/api/x402/*` | x402 protocol payment handling |

### Smart Contracts

Written in Solidity and deployed on Base (EVM), the contracts handle on-chain privacy operations:

| Contract | Purpose |
|----------|---------|
| **Privacy Pool** | Core contract for deposits, withdrawals, and ZK-verified transfers |
| **Deposit Router** | Routes user deposits with gas forwarding in a single transaction |

Contracts are built with [OpenZeppelin](https://www.openzeppelin.com/) security standards including `ReentrancyGuard`, `Ownable`, and `SafeERC20`.

---

## How It Works

### Authentication

ORB402 uses wallet-based authentication — no passwords, no emails. Here's the flow:

1. User connects their wallet (MetaMask or Phantom)
2. The server generates a unique, time-limited nonce
3. The user signs the nonce with their wallet's private key
4. The server verifies the signature and issues a session token
5. All subsequent API requests use this token for authorization

This approach ensures that only the person who controls the wallet can access the associated account.

### Deposit Flow

When a user deposits funds into ORB402:

1. User initiates a deposit from the dashboard and selects an amount
2. The system generates a dedicated holding wallet for the deposit
3. User approves the token transfer from their wallet
4. The deposit is processed through the privacy infrastructure
5. Funds are credited to the user's encrypted balance in the Privacy Pool contract

The entire process is designed to be a single user action — one wallet confirmation to deposit.

### Sending Payments

To send a private payment:

1. User enters the recipient's username or wallet address
2. Selects the amount and desired privacy level
3. Reviews the transaction summary
4. Signs the transaction with their wallet
5. A zero-knowledge proof is generated (for partial/full privacy)
6. The transfer is executed on-chain through the Privacy Pool
7. Both parties receive confirmation

### Withdrawals

Withdrawing funds back to a personal wallet:

1. User navigates to the Withdraw section
2. Enters the withdrawal amount and destination address
3. Confirms the transaction
4. The Privacy Pool contract releases funds to the specified address
5. A small protocol fee is deducted to sustain the network

---

## Project Structure

```
orb402/
│
├── src/                              # Frontend application
│   ├── components/                   # React components
│   │   ├── dashboard/                # Dashboard views and modals
│   │   │   ├── sections/             # Tab-specific sections
│   │   │   └── ...                   # Modals, cards, layouts
│   │   ├── ui/                       # Reusable UI primitives
│   │   └── ...                       # Landing page components
│   ├── contexts/                     # React context providers
│   │   ├── WalletContext.tsx          # Wallet state management
│   │   └── ThemeContext.tsx           # Theme management
│   ├── hooks/                        # Custom React hooks
│   ├── services/                     # API client and auth services
│   ├── pages/                        # Route-level page components
│   ├── utils/                        # Utility functions
│   └── assets/                       # Static assets
│
├── api/                              # Serverless API functions
│   ├── auth/                         # Authentication endpoints
│   ├── zk/                           # Zero-knowledge operations
│   ├── payments/                     # Payment management
│   ├── messages/                     # Encrypted messaging
│   ├── user/                         # User profiles
│   ├── history/                      # Transaction history
│   ├── x402/                         # x402 protocol
│   └── lib/                          # Shared backend utilities
│
├── packages/
│   └── contracts/                    # Solidity smart contracts
│       ├── contracts/                # Contract source files
│       ├── scripts/                  # Deployment scripts
│       └── hardhat.config.ts         # Hardhat configuration
│
├── public/                           # Static public assets
├── package.json                      # Dependencies and scripts
├── vite.config.ts                    # Vite build configuration
├── tailwind.config.ts                # Tailwind CSS configuration
└── tsconfig.json                     # TypeScript configuration
```

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** or **bun** package manager
- A wallet browser extension ([MetaMask](https://metamask.io/) or [Phantom](https://phantom.app/))
- Base ETH for gas fees (available from [Base Bridge](https://bridge.base.org/))

### Installation

```bash
# Clone the repository
git clone https://github.com/ORB402/ORB402.git
cd ORB402

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`.

### Environment Setup

Create a `.env` file in the project root with the required configuration. Refer to `.env.example` for the required variables. At minimum, you will need:

- Database connection (Supabase)
- RPC endpoint for Base
- Contract addresses

### Smart Contract Deployment

```bash
# Navigate to the contracts package
cd packages/contracts

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to Base Sepolia (testnet)
npm run deploy:sepolia

# Deploy to Base Mainnet
npm run deploy:base
```

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Shadcn/ui, Framer Motion |
| **Backend** | Node.js, Vercel Serverless Functions, TypeScript |
| **Blockchain** | Solidity, Hardhat, Ethers.js, OpenZeppelin |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Wallet signature verification (EIP-191) |
| **Privacy** | Zero-Knowledge Proofs, On-chain Privacy Pool |
| **Protocols** | x402 (HTTP-native payments) |

---

## Supported Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| Base Mainnet | 8453 | **Active** |
| Base Sepolia | 84532 | Testing |

---

## Security

ORB402 takes security seriously:

- **No password storage** — Authentication is entirely wallet-based
- **Non-custodial design** — Users maintain control of their private keys at all times
- **Audited contract patterns** — Smart contracts use battle-tested OpenZeppelin libraries
- **Reentrancy protection** — All state-changing contract functions are protected
- **Session management** — Time-limited tokens with automatic expiration
- **Input validation** — Server-side validation on all API endpoints

If you discover a security vulnerability, please report it responsibly by emailing **Orbx402@proton.me**. Do not open a public issue.

---

## Contributing

We welcome contributions from the community. To get started:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to your branch (`git push origin feature/your-feature`)
5. Open a Pull Request

Please ensure your code follows the existing project conventions and includes appropriate documentation.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Links

- **Website:** [orb402.com](https://www.orb402.com)
- **Twitter:** [@orb402](https://x.com/orb402)
- **Contact:** Orbx402@proton.me

---

<p align="center">
  <sub>Built with privacy in mind. Powered by Base.</sub>
</p>
