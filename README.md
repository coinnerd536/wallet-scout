# wallet-scout

Scan your wallet across EVM chains in one command. Shows balance, tx count, and activity across 14 chains — testnets and mainnets.

## Usage

```bash
# Scan all chains
npx wallet-scout 0xYourAddress

# Testnets only
npx wallet-scout 0xYourAddress --testnets

# JSON output
npx wallet-scout 0xYourAddress --json

# Add custom RPCs
npx wallet-scout 0xYourAddress --rpc https://custom-rpc.com
```

## What it shows

```
wallet-scout — Scanning 14 chains

  Address: 0x410a41682158DF340AF54cB3F706D144ee3a7CA8

  Chain                Balance          Txs      ms
  ──────────────────── ──────────────── ──────── ──────
  Ethereum Sepolia     0.941 ETH        353      245
  Base Sepolia         0.009 ETH        246      189
  OP Sepolia           0.009 ETH        333      201
  Arb Sepolia          0.009 ETH        324      178
  Scroll Sepolia       0.009 ETH        313      234
  Linea Sepolia        0.008 ETH        304      267
  Tempo Testnet        4.2e57 USD       125      156
  Ethereum             0 ETH            0        312
  ...

  Total: 2002 transactions across 7 active chains
```

## Supported Chains (14)

**Testnets:** Ethereum Sepolia, Base Sepolia, OP Sepolia, Arb Sepolia, Scroll Sepolia, Linea Sepolia, Polygon Amoy, Monad, MegaETH, Tempo

**Mainnets:** Ethereum, Base, Optimism, Arbitrum

Or add any chain via `--rpc`.

## Requirements

- Node.js 18+ (uses native fetch, zero dependencies)

## License

MIT
