import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, Settings, Wallet, TrendingUp, TrendingDown, Copy, Check, Eye, EyeOff, RefreshCw, AlertTriangle, Zap, Shield, Clock, DollarSign, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export default function PumpFunBot() {
  // Wallet State
  const [wallet, setWallet] = useState(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [copied, setCopied] = useState('');

  // Bot State
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('stopped');
  const [logs, setLogs] = useState([]);

  // Trading Stats
  const [stats, setStats] = useState({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    totalPnl: 0,
    winRate: 0,
  });

  // Trades History
  const [trades, setTrades] = useState([]);

  // Tokens being watched
  const [watchedTokens, setWatchedTokens] = useState([]);

  // Config
  const [config, setConfig] = useState({
    dryRun: true,
    mcapMinUsd: 5000,
    mcapMaxUsd: 10000,
    maxSolPerTrade: 0.1,
    maxOpenPositions: 5,
    stopLossPct: 1.0,
    takeProfitPct: 200,
    maxTokenAgeSec: 600, // 10 minutes
    minBuyerFeesSol: 0.05,
    maxHolderConcentrationPct: 5.0,
    maxBundlePct: 10.0,
    priorityFeeLamports: 10000,
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);

  // Generate wallet on mount
  useEffect(() => {
    generateWallet();
  }, []);

  // Simulated price updates when running
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      // Simulate finding new tokens
      if (Math.random() > 0.7 && watchedTokens.length < 10) {
        const newToken = generateMockToken();
        setWatchedTokens(prev => [newToken, ...prev].slice(0, 10));
        addLog(`🔍 New token detected: ${newToken.symbol} (${newToken.age}s old, $${newToken.mcap.toLocaleString()} mcap)`);
      }

      // Simulate token updates and trades
      setWatchedTokens(prev => {
        return prev.map(token => {
          const priceChange = (Math.random() - 0.48) * 5;
          const newPrice = token.price * (1 + priceChange / 100);
          const newMcap = token.mcap * (1 + priceChange / 100);
          return { ...token, price: newPrice, mcap: newMcap, priceChange: token.priceChange + priceChange, age: token.age + 5 };
        }).filter(t => t.age < config.maxTokenAgeSec);
      });

      // Simulate trade execution
      if (Math.random() > 0.85 && trades.filter(t => !t.exitPrice).length < config.maxOpenPositions) {
        executeMockTrade();
      }

      // Check exits for open trades
      checkExits();
    }, 5000);

    return () => clearInterval(interval);
  }, [isRunning, watchedTokens, trades, config]);

  const generateWallet = () => {
    // Generate mock wallet (in real implementation, use @solana/web3.js Keypair.generate())
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let publicKey = '';
    let privateKey = '';
    
    for (let i = 0; i < 44; i++) {
      publicKey += chars[Math.floor(Math.random() * chars.length)];
    }
    for (let i = 0; i < 88; i++) {
      privateKey += chars[Math.floor(Math.random() * chars.length)];
    }

    setWallet({ publicKey, privateKey });
    setWalletBalance(0);
    addLog('🔑 New wallet generated');
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 100));
  };

  const generateMockToken = () => {
    const symbols = ['PEPE', 'DOGE', 'SHIB', 'FLOKI', 'BONK', 'WIF', 'POPCAT', 'MEW', 'BRETT', 'PONKE'];
    const prefixes = ['BABY', 'MINI', 'SUPER', 'MEGA', 'ULTRA', 'KING', 'QUEEN', ''];
    const symbol = prefixes[Math.floor(Math.random() * prefixes.length)] + symbols[Math.floor(Math.random() * symbols.length)];
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      mint: Array(44).fill(0).map(() => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join(''),
      symbol,
      mcap: 5000 + Math.random() * 5000,
      price: 0.000001 + Math.random() * 0.00001,
      priceChange: 0,
      age: Math.floor(Math.random() * 120), // 0-2 minutes old
      holders: 10 + Math.floor(Math.random() * 50),
      buyerFees: 0.05 + Math.random() * 0.1,
    };
  };

  const executeMockTrade = () => {
    if (config.dryRun && walletBalance < config.maxSolPerTrade) {
      // In dry run, simulate having balance
    } else if (!config.dryRun && walletBalance < config.maxSolPerTrade) {
      addLog('⚠️ Insufficient balance for trade');
      return;
    }

    const token = watchedTokens.find(t => 
      t.mcap >= config.mcapMinUsd && 
      t.mcap <= config.mcapMaxUsd &&
      t.age <= config.maxTokenAgeSec &&
      t.buyerFees >= config.minBuyerFeesSol
    );

    if (!token) return;

    const trade = {
      id: Date.now(),
      symbol: token.symbol,
      mint: token.mint,
      entryPrice: token.price,
      entryMcap: token.mcap,
      currentPrice: token.price,
      amount: config.maxSolPerTrade,
      entryTime: new Date(),
      exitPrice: null,
      exitTime: null,
      pnl: 0,
      pnlPct: 0,
      status: 'open',
    };

    setTrades(prev => [trade, ...prev]);
    if (!config.dryRun) {
      setWalletBalance(prev => prev - config.maxSolPerTrade);
    }
    addLog(`🟢 BUY ${token.symbol} @ $${token.mcap.toFixed(0)} mcap | ${config.maxSolPerTrade} SOL`);
  };

  const checkExits = () => {
    setTrades(prev => prev.map(trade => {
      if (trade.exitPrice) return trade;

      // Find current token price
      const token = watchedTokens.find(t => t.mint === trade.mint);
      if (!token) return trade;

      const currentPrice = token.price;
      const pnlPct = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

      // Check stop loss
      if (pnlPct <= -config.stopLossPct) {
        const pnl = trade.amount * (pnlPct / 100);
        addLog(`🔴 STOP-LOSS ${trade.symbol} | ${pnlPct.toFixed(2)}% | ${pnl.toFixed(4)} SOL`);
        updateStats(pnl, false);
        if (!config.dryRun) {
          setWalletBalance(prev => prev + trade.amount + pnl);
        }
        return { ...trade, exitPrice: currentPrice, exitTime: new Date(), pnl, pnlPct, status: 'closed' };
      }

      // Check take profit
      if (pnlPct >= config.takeProfitPct) {
        const pnl = trade.amount * (pnlPct / 100);
        addLog(`🟢 TAKE-PROFIT ${trade.symbol} | +${pnlPct.toFixed(2)}% | +${pnl.toFixed(4)} SOL`);
        updateStats(pnl, true);
        if (!config.dryRun) {
          setWalletBalance(prev => prev + trade.amount + pnl);
        }
        return { ...trade, exitPrice: currentPrice, exitTime: new Date(), pnl, pnlPct, status: 'closed' };
      }

      return { ...trade, currentPrice, pnlPct };
    }));
  };

  const updateStats = (pnl, isWin) => {
    setStats(prev => {
      const newStats = {
        totalTrades: prev.totalTrades + 1,
        wins: prev.wins + (isWin ? 1 : 0),
        losses: prev.losses + (isWin ? 0 : 1),
        totalPnl: prev.totalPnl + pnl,
        winRate: 0,
      };
      newStats.winRate = newStats.totalTrades > 0 ? (newStats.wins / newStats.totalTrades) * 100 : 0;
      return newStats;
    });
  };

  const startBot = () => {
    if (!config.dryRun && walletBalance < config.maxSolPerTrade) {
      addLog('❌ Cannot start: Insufficient wallet balance');
      return;
    }
    setIsRunning(true);
    setStatus('running');
    addLog('🚀 Bot started' + (config.dryRun ? ' (DRY RUN)' : ' (LIVE)'));
  };

  const stopBot = () => {
    setIsRunning(false);
    setStatus('stopped');
    addLog('⏹️ Bot stopped');
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const formatTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="text-purple-400" size={24} />
            <h1 className="text-xl font-bold">Pump.fun Sniper</h1>
            <span className={`px-2 py-0.5 rounded text-xs ${isRunning ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
              {isRunning ? '● RUNNING' : '○ STOPPED'}
            </span>
            {config.dryRun && (
              <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                DRY RUN
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Settings size={20} />
            </button>
            {isRunning ? (
              <button
                onClick={stopBot}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                <Square size={16} /> Stop
              </button>
            ) : (
              <button
                onClick={startBot}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
              >
                <Play size={16} /> Start
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Settings size={18} /> Configuration
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Position Size (SOL)</label>
                <input
                  type="number"
                  value={config.maxSolPerTrade}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxSolPerTrade: parseFloat(e.target.value) || 0.1 }))}
                  step={0.01}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Stop Loss (%)</label>
                <input
                  type="number"
                  value={config.stopLossPct}
                  onChange={(e) => setConfig(prev => ({ ...prev, stopLossPct: parseFloat(e.target.value) || 1 }))}
                  step={0.5}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Take Profit (%)</label>
                <input
                  type="number"
                  value={config.takeProfitPct}
                  onChange={(e) => setConfig(prev => ({ ...prev, takeProfitPct: parseFloat(e.target.value) || 200 }))}
                  step={10}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Token Age (sec)</label>
                <input
                  type="number"
                  value={config.maxTokenAgeSec}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxTokenAgeSec: parseInt(e.target.value) || 600 }))}
                  step={60}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Min Mcap ($)</label>
                <input
                  type="number"
                  value={config.mcapMinUsd}
                  onChange={(e) => setConfig(prev => ({ ...prev, mcapMinUsd: parseInt(e.target.value) || 5000 }))}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Mcap ($)</label>
                <input
                  type="number"
                  value={config.mcapMaxUsd}
                  onChange={(e) => setConfig(prev => ({ ...prev, mcapMaxUsd: parseInt(e.target.value) || 10000 }))}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Bundle (%)</label>
                <input
                  type="number"
                  value={config.maxBundlePct}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxBundlePct: parseFloat(e.target.value) || 10 }))}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                  disabled={isRunning}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="block text-xs text-gray-400">Dry Run</label>
                <button
                  onClick={() => !isRunning && setConfig(prev => ({ ...prev, dryRun: !prev.dryRun }))}
                  className={`w-12 h-6 rounded-full transition-colors ${config.dryRun ? 'bg-yellow-500' : 'bg-green-500'}`}
                  disabled={isRunning}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${config.dryRun ? 'translate-x-0.5' : 'translate-x-6'}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Total PnL</div>
            <div className={`text-2xl font-bold ${stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(4)} SOL
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-purple-400">
              {stats.winRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Trades</div>
            <div className="text-2xl font-bold">
              <span className="text-green-400">{stats.wins}</span>
              <span className="text-gray-500">/</span>
              <span className="text-red-400">{stats.losses}</span>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Open Positions</div>
            <div className="text-2xl font-bold text-blue-400">
              {trades.filter(t => !t.exitPrice).length}/{config.maxOpenPositions}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Watching</div>
            <div className="text-2xl font-bold text-yellow-400">
              {watchedTokens.length} tokens
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Wallet Panel */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Wallet size={18} className="text-purple-400" />
              Trading Wallet
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Balance</div>
                <div className="text-3xl font-bold text-green-400">
                  {walletBalance.toFixed(4)} SOL
                </div>
                <div className="text-xs text-gray-500">≈ ${(walletBalance * 140).toFixed(2)} USD</div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Public Key</span>
                  <button
                    onClick={() => copyToClipboard(wallet?.publicKey || '', 'public')}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    {copied === 'public' ? <Check size={12} /> : <Copy size={12} />}
                    {copied === 'public' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-gray-900 rounded p-2 text-xs font-mono break-all">
                  {wallet?.publicKey || 'Generating...'}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Private Key</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="text-xs text-gray-400 hover:text-gray-300"
                    >
                      {showPrivateKey ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(wallet?.privateKey || '', 'private')}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      {copied === 'private' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div className="bg-gray-900 rounded p-2 text-xs font-mono break-all">
                  {showPrivateKey ? wallet?.privateKey : '••••••••••••••••••••••••••••••••••••••••••••'}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={generateWallet}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                  disabled={isRunning}
                >
                  <RefreshCw size={14} /> New Wallet
                </button>
                <a
                  href={`https://solscan.io/account/${wallet?.publicKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm transition-colors"
                >
                  <ExternalLink size={14} /> View
                </a>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-200">
                    <strong>Send SOL to this address to fund trading.</strong> Save your private key securely - it's only stored in your browser.
                  </div>
                </div>
              </div>

              {/* Simulate deposit for testing */}
              <button
                onClick={() => setWalletBalance(prev => prev + 1)}
                className="w-full px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded text-sm text-green-400 transition-colors"
              >
                + Simulate 1 SOL Deposit (Testing)
              </button>
            </div>
          </div>

          {/* Trades Panel */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-green-400" />
              Recent Trades
            </h3>
            <div className="space-y-2 max-h-96 overflow-auto">
              {trades.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No trades yet</div>
              ) : (
                trades.slice(0, 20).map(trade => (
                  <div
                    key={trade.id}
                    className={`p-3 rounded-lg ${trade.exitPrice ? 'bg-gray-900' : 'bg-gray-750 border border-blue-500/30'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{trade.symbol}</span>
                      <span className={`text-sm font-medium ${trade.pnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{trade.amount} SOL</span>
                      <span>${trade.entryMcap.toFixed(0)} mcap</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>{formatTime(trade.entryTime)}</span>
                      <span className={`px-1.5 py-0.5 rounded ${trade.exitPrice ? (trade.pnl >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400') : 'bg-blue-500/20 text-blue-400'}`}>
                        {trade.exitPrice ? (trade.pnl >= 0 ? 'WIN' : 'LOSS') : 'OPEN'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Logs Panel */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Clock size={18} className="text-blue-400" />
              Activity Log
            </h3>
            <div className="bg-gray-900 rounded p-3 h-96 overflow-auto font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-gray-500">Waiting for activity...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="text-gray-300 mb-1">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Watched Tokens */}
        {watchedTokens.length > 0 && (
          <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="font-medium mb-4">Watching New Tokens (max {config.maxTokenAgeSec/60} min old)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {watchedTokens.map(token => (
                <div key={token.id} className="bg-gray-900 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{token.symbol}</span>
                    <span className="text-xs text-gray-500">{token.age}s</span>
                  </div>
                  <div className="text-xs text-gray-400">${token.mcap.toFixed(0)} mcap</div>
                  <div className={`text-xs ${token.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {token.priceChange >= 0 ? '+' : ''}{token.priceChange.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}