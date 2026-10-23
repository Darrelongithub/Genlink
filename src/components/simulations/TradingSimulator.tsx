import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TradingSimulatorProps {
  title: string;
  description: string;
  startingBalance: number;
  targetProfit: number;
  xpReward: number;
  onComplete: (score: number) => void;
}

interface Trade {
  type: "buy" | "sell";
  pair: string;
  amount: number;
  price: number;
  timestamp: number;
}

const currencyPairs = [
  { pair: "EUR/USD", spread: 0.0001 },
  { pair: "GBP/USD", spread: 0.0002 },
  { pair: "USD/JPY", spread: 0.01 },
  { pair: "USD/KES", spread: 0.05 },
];

const TradingSimulator = ({
  title,
  description,
  startingBalance,
  targetProfit,
  xpReward,
  onComplete,
}: TradingSimulatorProps) => {
  const [balance, setBalance] = useState(startingBalance);
  const [selectedPair, setSelectedPair] = useState(currencyPairs[0]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});
  const [position, setPosition] = useState<{ type: "buy" | "sell"; amount: number; entryPrice: number } | null>(null);
  const [tradeAmount, setTradeAmount] = useState("100");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [pnl, setPnl] = useState(0);

  // Initialize prices
  useEffect(() => {
    const initial: Record<string, number> = {
      "EUR/USD": 1.0850,
      "GBP/USD": 1.2650,
      "USD/JPY": 149.50,
      "USD/KES": 153.25,
    };
    setPrices(initial);
    
    const history: Record<string, number[]> = {};
    Object.keys(initial).forEach(pair => {
      history[pair] = [initial[pair]];
    });
    setPriceHistory(history);
  }, []);

  // Simulate price movements
  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      setPrices(prev => {
        const newPrices = { ...prev };
        Object.keys(newPrices).forEach(pair => {
          const change = (Math.random() - 0.5) * 0.002 * newPrices[pair];
          newPrices[pair] = Math.round((newPrices[pair] + change) * 10000) / 10000;
        });
        return newPrices;
      });

      setPriceHistory(prev => {
        const newHistory = { ...prev };
        Object.keys(prices).forEach(pair => {
          newHistory[pair] = [...(prev[pair] || []), prices[pair]].slice(-20);
        });
        return newHistory;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [prices, isComplete]);

  // Calculate unrealized P&L
  useEffect(() => {
    if (position) {
      const currentPrice = prices[selectedPair.pair] || 0;
      const unrealizedPnL = position.type === "buy"
        ? (currentPrice - position.entryPrice) * position.amount * 100
        : (position.entryPrice - currentPrice) * position.amount * 100;
      setPnl(Math.round(unrealizedPnL * 100) / 100);
    }
  }, [position, prices, selectedPair]);

  const handleOpenPosition = (type: "buy" | "sell") => {
    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance) return;
    if (position) return; // Already have a position

    const currentPrice = prices[selectedPair.pair];
    const adjustedPrice = type === "buy" 
      ? currentPrice + selectedPair.spread 
      : currentPrice - selectedPair.spread;

    setPosition({
      type,
      amount,
      entryPrice: adjustedPrice,
    });
    setBalance(prev => prev - amount);
  };

  const handleClosePosition = () => {
    if (!position) return;

    const currentPrice = prices[selectedPair.pair];
    const realizedPnL = position.type === "buy"
      ? (currentPrice - position.entryPrice) * position.amount * 100
      : (position.entryPrice - currentPrice) * position.amount * 100;

    const returnAmount = position.amount + realizedPnL;
    setBalance(prev => prev + returnAmount);

    setTrades(prev => [...prev, {
      type: position.type,
      pair: selectedPair.pair,
      amount: position.amount,
      price: currentPrice,
      timestamp: Date.now(),
    }]);

    setPosition(null);
    setPnl(0);

    // Check if target reached
    const newBalance = balance + returnAmount;
    if (newBalance >= startingBalance + targetProfit && !isComplete) {
      setIsComplete(true);
      onComplete(100);
    }
  };

  const handleReset = () => {
    setBalance(startingBalance);
    setPosition(null);
    setTrades([]);
    setPnl(0);
    setIsComplete(false);
  };

  const currentPrice = prices[selectedPair.pair] || 0;
  const priceChange = priceHistory[selectedPair.pair] && priceHistory[selectedPair.pair].length > 1
    ? currentPrice - priceHistory[selectedPair.pair][priceHistory[selectedPair.pair].length - 2]
    : 0;
  const totalPnL = balance - startingBalance + (position ? pnl : 0);
  const profitProgress = (totalPnL / targetProfit) * 100;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              {title}
            </CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-accent" />
            +{xpReward} XP
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Account summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-xl font-bold text-foreground">${balance.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Unrealized P&L</p>
            <p className={cn(
              "text-xl font-bold",
              pnl >= 0 ? "text-accent" : "text-destructive"
            )}>
              {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Total P&L</p>
            <p className={cn(
              "text-xl font-bold",
              totalPnL >= 0 ? "text-accent" : "text-destructive"
            )}>
              {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Target: +${targetProfit}</p>
            <div className="w-full bg-muted h-2 rounded-full mt-2">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  profitProgress >= 100 ? "bg-accent" : "bg-premium"
                )}
                style={{ width: `${Math.min(Math.max(profitProgress, 0), 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Currency pair selector */}
        <div className="flex gap-2 flex-wrap">
          {currencyPairs.map(pair => (
            <Button
              key={pair.pair}
              variant={selectedPair.pair === pair.pair ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPair(pair)}
              disabled={!!position}
              className={selectedPair.pair === pair.pair ? "bg-accent" : ""}
            >
              {pair.pair}
            </Button>
          ))}
        </div>

        {/* Price display */}
        <div className="p-6 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-foreground">{selectedPair.pair}</h3>
              <p className="text-sm text-muted-foreground">Spread: {selectedPair.spread}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">{currentPrice.toFixed(4)}</p>
              <div className={cn(
                "flex items-center gap-1 justify-end",
                priceChange >= 0 ? "text-accent" : "text-destructive"
              )}>
                {priceChange >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          {/* Simple price chart visualization */}
          <div className="h-20 flex items-end gap-0.5">
            {(priceHistory[selectedPair.pair] || []).map((price, i, arr) => {
              const min = Math.min(...arr);
              const max = Math.max(...arr);
              const range = max - min || 1;
              const height = ((price - min) / range) * 100;
              const isUp = i > 0 && price >= arr[i - 1];
              
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-t transition-all",
                    isUp ? "bg-accent/70" : "bg-destructive/70"
                  )}
                  style={{ height: `${Math.max(height, 5)}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Trading controls */}
        {position ? (
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Position</p>
                <p className="font-semibold">
                  {position.type.toUpperCase()} ${position.amount} @ {position.entryPrice.toFixed(4)}
                </p>
              </div>
              <Badge className={pnl >= 0 ? "bg-accent" : "bg-destructive"}>
                {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
              </Badge>
            </div>
            <Button 
              onClick={handleClosePosition}
              className={cn(
                "w-full",
                pnl >= 0 ? "bg-accent hover:bg-accent/90" : "bg-destructive hover:bg-destructive/90"
              )}
            >
              Close Position ({pnl >= 0 ? "+" : ""}{pnl.toFixed(2)})
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">Trade Amount ($)</label>
                <Input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  max={balance}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => handleOpenPosition("buy")}
                disabled={parseFloat(tradeAmount) > balance || isComplete}
                className="bg-accent hover:bg-accent/90"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                BUY
              </Button>
              <Button 
                onClick={() => handleOpenPosition("sell")}
                disabled={parseFloat(tradeAmount) > balance || isComplete}
                variant="destructive"
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                SELL
              </Button>
            </div>
          </div>
        )}

        {/* Success message */}
        {isComplete && (
          <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-accent" />
              <div>
                <p className="font-semibold text-foreground">Target Reached! 🎉</p>
                <p className="text-sm text-muted-foreground">
                  You made ${totalPnL.toFixed(2)} profit in {trades.length} trades
                </p>
              </div>
            </div>
            <Badge className="bg-accent text-accent-foreground">
              +{xpReward} XP Earned!
            </Badge>
          </div>
        )}

        {/* Trade history */}
        {trades.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Trades</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {trades.slice(-5).reverse().map((trade, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                  <span className={trade.type === "buy" ? "text-accent" : "text-destructive"}>
                    {trade.type.toUpperCase()} {trade.pair}
                  </span>
                  <span>${trade.amount} @ {trade.price.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset button */}
        <Button onClick={handleReset} variant="outline" className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Simulation
        </Button>
      </CardContent>
    </Card>
  );
};

export default TradingSimulator;
