#!/usr/bin/env node
/**
 * wallet-scout — Scan your wallet across EVM chains in one command
 *
 * Shows balance, tx count, and contract deployments across multiple testnets.
 * Zero dependencies — uses native fetch (Node 18+).
 *
 * Usage:
 *   npx wallet-scout 0xYourAddress
 *   npx wallet-scout 0xYourAddress --json
 */

const CHAINS = [
  { name: 'Ethereum Sepolia',  rpc: 'https://ethereum-sepolia-rpc.publicnode.com', explorer: 'https://sepolia.etherscan.io', token: 'ETH' },
  { name: 'Base Sepolia',      rpc: 'https://sepolia.base.org', explorer: 'https://sepolia.basescan.org', token: 'ETH' },
  { name: 'OP Sepolia',        rpc: 'https://sepolia.optimism.io', explorer: 'https://sepolia-optimism.etherscan.io', token: 'ETH' },
  { name: 'Arb Sepolia',       rpc: 'https://sepolia-rollup.arbitrum.io/rpc', explorer: 'https://sepolia.arbiscan.io', token: 'ETH' },
  { name: 'Scroll Sepolia',    rpc: 'https://sepolia-rpc.scroll.io', explorer: 'https://sepolia.scrollscan.com', token: 'ETH' },
  { name: 'Linea Sepolia',     rpc: 'https://rpc.sepolia.linea.build', explorer: 'https://sepolia.lineascan.build', token: 'ETH' },
  { name: 'Polygon Amoy',      rpc: 'https://rpc-amoy.polygon.technology', explorer: 'https://amoy.polygonscan.com', token: 'POL' },
  { name: 'Monad Testnet',     rpc: 'https://testnet-rpc.monad.xyz', explorer: 'https://testnet.monadexplorer.com', token: 'MON' },
  { name: 'MegaETH Testnet',   rpc: 'https://carrot.megaeth.com/rpc', explorer: 'https://megaeth-testnet-v2.blockscout.com', token: 'ETH' },
  { name: 'Tempo Testnet',     rpc: 'https://rpc.moderato.tempo.xyz', explorer: 'https://explore.tempo.xyz', token: 'USD' },
  { name: 'Unichain Sepolia', rpc: 'https://sepolia.unichain.org', explorer: 'https://sepolia.uniscan.xyz', token: 'ETH' },
  { name: 'Soneium Minato',   rpc: 'https://rpc.minato.soneium.org', explorer: 'https://soneium-minato.blockscout.com', token: 'ETH' },
  { name: 'Ink Sepolia',      rpc: 'https://rpc-gel-sepolia.inkonchain.com', explorer: 'https://explorer-sepolia.inkonchain.com', token: 'ETH' },
  { name: 'ZetaChain Athens', rpc: 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public', explorer: 'https://athens.explorer.zetachain.com', token: 'ZETA' },
  { name: 'XRPL EVM',        rpc: 'https://rpc.xrplevm.org', explorer: 'https://evm-sidechain.xrpl.org', token: 'XRP' },
  // Mainnets
  { name: 'Ethereum',          rpc: 'https://ethereum-rpc.publicnode.com', explorer: 'https://etherscan.io', token: 'ETH' },
  { name: 'Base',              rpc: 'https://mainnet.base.org', explorer: 'https://basescan.org', token: 'ETH' },
  { name: 'Optimism',          rpc: 'https://mainnet.optimism.io', explorer: 'https://optimistic.etherscan.io', token: 'ETH' },
  { name: 'Arbitrum',          rpc: 'https://arb1.arbitrum.io/rpc', explorer: 'https://arbiscan.io', token: 'ETH' },
];

async function rpc(url, method, params = []) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
    });
    const data = await res.json();
    clearTimeout(timeout);
    if (data.error) throw new Error(data.error.message);
    return data.result;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function formatBalance(hexWei, decimals = 18) {
  if (!hexWei || hexWei === '0x0') return '0';
  const wei = BigInt(hexWei);
  const divisor = BigInt(10 ** decimals);
  const whole = wei / divisor;
  const frac = wei % divisor;
  // Compact large numbers
  if (whole > 1_000_000_000n) {
    const digits = whole.toString().length;
    if (digits > 15) return `~1e${digits}`;
    const num = Number(whole);
    if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  }
  if (whole > 1_000_000n) return `${(Number(whole) / 1e6).toFixed(1)}M`;
  if (whole > 10_000n) return `${(Number(whole) / 1e3).toFixed(1)}K`;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '');
  if (!fracStr) return whole.toString();
  return `${whole}.${fracStr}`;
}

async function scanChain(chain, address) {
  const start = Date.now();
  try {
    const [balanceHex, txCountHex, code] = await Promise.all([
      rpc(chain.rpc, 'eth_getBalance', [address, 'latest']),
      rpc(chain.rpc, 'eth_getTransactionCount', [address, 'latest']),
      rpc(chain.rpc, 'eth_getCode', [address, 'latest']),
    ]);

    const balance = formatBalance(balanceHex);
    const txCount = parseInt(txCountHex, 16);
    const isContract = code && code !== '0x';
    const ms = Date.now() - start;

    return {
      chain: chain.name,
      token: chain.token,
      balance,
      txCount,
      isContract,
      explorer: `${chain.explorer}/address/${address}`,
      latency: ms,
      status: 'ok',
    };
  } catch (err) {
    return {
      chain: chain.name,
      token: chain.token,
      balance: '-',
      txCount: '-',
      isContract: false,
      explorer: `${chain.explorer}/address/${address}`,
      latency: Date.now() - start,
      status: 'error',
      error: err.message?.slice(0, 60) || 'timeout',
    };
  }
}

function usage() {
  console.log(`
\x1b[1mwallet-scout\x1b[0m — Scan your wallet across EVM chains

Usage:
  wallet-scout <address> [options]

Options:
  --json           JSON output
  --testnets       Testnets only (default: all)
  --mainnets       Mainnets only
  --rpc <urls>     Comma-separated extra RPC URLs to check

Examples:
  wallet-scout 0x410a41682158DF340AF54cB3F706D144ee3a7CA8
  wallet-scout 0x410a... --testnets --json
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    usage();
    process.exit(0);
  }

  const address = args.find(a => a.startsWith('0x') && a.length === 42);
  if (!address) {
    console.error('Error: Valid address required (0x... 42 chars)');
    process.exit(1);
  }

  const jsonMode = args.includes('--json');
  const testnetsOnly = args.includes('--testnets');
  const mainnetsOnly = args.includes('--mainnets');

  let chains = CHAINS;
  if (testnetsOnly) chains = chains.filter(c => c.name.includes('Sepolia') || c.name.includes('Testnet') || c.name.includes('Amoy') || c.name.includes('Minato'));
  if (mainnetsOnly) chains = chains.filter(c => !c.name.includes('Sepolia') && !c.name.includes('Testnet') && !c.name.includes('Amoy'));

  // Add custom RPCs
  const rpcIdx = args.indexOf('--rpc');
  if (rpcIdx >= 0 && rpcIdx + 1 < args.length) {
    const urls = args[rpcIdx + 1].split(',');
    urls.forEach((url, i) => {
      chains.push({ name: `Custom ${i + 1}`, rpc: url.trim(), explorer: '', token: '???' });
    });
  }

  if (!jsonMode) {
    console.log(`\n\x1b[1mwallet-scout\x1b[0m — Scanning ${chains.length} chains\n`);
    console.log(`  Address: ${address}\n`);
    process.stdout.write('  Scanning...');
  }

  // Scan all chains in parallel
  const results = await Promise.all(chains.map(c => scanChain(c, address)));

  if (!jsonMode) {
    console.log(' done!\n');

    // Table header
    const nameW = 20, balW = 16, txW = 8, statW = 6;
    console.log(`  ${'Chain'.padEnd(nameW)} ${'Balance'.padEnd(balW)} ${'Txs'.padEnd(txW)} ${'ms'.padEnd(statW)}`);
    console.log(`  ${'─'.repeat(nameW)} ${'─'.repeat(balW)} ${'─'.repeat(txW)} ${'─'.repeat(statW)}`);

    let totalTx = 0;
    let activeChains = 0;

    for (const r of results) {
      if (r.status === 'error') {
        console.log(`  ${r.chain.padEnd(nameW)} \x1b[31m${'error'.padEnd(balW)}\x1b[0m ${'-'.padEnd(txW)} ${String(r.latency).padEnd(statW)}`);
        continue;
      }

      const hasActivity = r.txCount > 0 || r.balance !== '0';
      const color = hasActivity ? '\x1b[32m' : '\x1b[90m';
      const reset = '\x1b[0m';

      const balStr = `${r.balance} ${r.token}`;
      const txStr = String(r.txCount);

      console.log(`  ${color}${r.chain.padEnd(nameW)} ${balStr.padEnd(balW)} ${txStr.padEnd(txW)} ${String(r.latency).padEnd(statW)}${reset}`);

      if (r.txCount > 0) {
        totalTx += r.txCount;
        activeChains++;
      }
    }

    console.log(`\n  \x1b[1mTotal:\x1b[0m ${totalTx} transactions across ${activeChains} active chains`);

    // Show explorer links for active chains
    const active = results.filter(r => r.status === 'ok' && r.txCount > 0);
    if (active.length > 0) {
      console.log(`\n  \x1b[90mExplorers:\x1b[0m`);
      active.forEach(r => console.log(`    ${r.chain}: ${r.explorer}`));
    }
    console.log('');
  } else {
    const totalTx = results.filter(r => r.status === 'ok').reduce((sum, r) => sum + (r.txCount || 0), 0);
    const activeChains = results.filter(r => r.status === 'ok' && r.txCount > 0).length;
    console.log(JSON.stringify({
      address,
      scannedAt: new Date().toISOString(),
      chains: results,
      summary: { totalTransactions: totalTx, activeChains, chainsScanned: results.length },
    }, null, 2));
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
