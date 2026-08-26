"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AuthTeaserGate from "@/components/AuthTeaserGate";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/api";

interface Position {
  ticker: string;
  company_name: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  invested_amount: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  day_change_pct: number;
  portfolio_name?: string;
}

interface OrderRecord {
  order_id: string;
  ticker: string;
  company_name: string;
  action: "BUY" | "SELL";
  quantity: number;
  executed_price: number;
  order_value: number;
  brokerage: number;
  stt: number;
  status: string;
  execution_time: string;
  broker_mode: string;
  portfolio_name?: string;
}

// Master Indian NSE Stock List (60+ companies across sectors)
const NSE_MASTER_STOCKS = [
  { ticker: "RELIANCE.NS", name: "Reliance Industries", sector: "Energy & Conglomerate", price: 2980 },
  { ticker: "TCS.NS", name: "Tata Consultancy Services", sector: "IT Services", price: 4150 },
  { ticker: "HDFCBANK.NS", name: "HDFC Bank", sector: "Banking & Financials", price: 1640 },
  { ticker: "ICICIBANK.NS", name: "ICICI Bank", sector: "Banking & Financials", price: 1210 },
  { ticker: "INFY.NS", name: "Infosys Ltd", sector: "IT Services", price: 1820 },
  { ticker: "LT.NS", name: "Larsen & Toubro", sector: "Infrastructure & Cap Goods", price: 3620 },
  { ticker: "TATAMOTORS.NS", name: "Tata Motors", sector: "Automobile & EV", price: 980 },
  { ticker: "SUNPHARMA.NS", name: "Sun Pharma", sector: "Pharmaceuticals", price: 1710 },
  { ticker: "BHARTIARTL.NS", name: "Bharti Airtel", sector: "Telecom & Cloud", price: 1480 },
  { ticker: "BAJFINANCE.NS", name: "Bajaj Finance", sector: "NBFC & Consumer Credit", price: 7120 },
  { ticker: "TITAN.NS", name: "Titan Company", sector: "Consumer & Luxury", price: 3450 },
  { ticker: "ITC.NS", name: "ITC Limited", sector: "FMCG & Hotels", price: 490 },
  { ticker: "SBIN.NS", name: "State Bank of India", sector: "PSU Banking", price: 815 },
  { ticker: "TATASTEEL.NS", name: "Tata Steel", sector: "Metals & Mining", price: 155 },
  { ticker: "ZOMATO.NS", name: "Zomato Ltd", sector: "Food Delivery & Quick Commerce", price: 245 },
  { ticker: "ADANIENT.NS", name: "Adani Enterprises", sector: "Conglomerate & Mining", price: 3050 },
  { ticker: "ADANIPORTS.NS", name: "Adani Ports & SEZ", sector: "Ports & Logistics", price: 1460 },
  { ticker: "TATAPOWER.NS", name: "Tata Power", sector: "Renewable Energy & Power", price: 420 },
  { ticker: "SUZLON.NS", name: "Suzlon Energy", sector: "Wind Energy Equipment", price: 72 },
  { ticker: "IREDA.NS", name: "Indian Renewable Energy Agency", sector: "Green Financing", price: 235 },
  { ticker: "HAL.NS", name: "Hindustan Aeronautics", sector: "Defense & Aerospace", price: 4680 },
  { ticker: "BEL.NS", name: "Bharat Electronics", sector: "Defense & Electronics", price: 295 },
  { ticker: "TRENT.NS", name: "Trent Ltd (Westside & Zudio)", sector: "Retail & Apparel", price: 6850 },
  { ticker: "COALINDIA.NS", name: "Coal India", sector: "Energy & Mining", price: 510 },
  { ticker: "NTPC.NS", name: "NTPC Limited", sector: "Thermal & Clean Power", price: 395 },
  { ticker: "POWERGRID.NS", name: "Power Grid Corp", sector: "Transmission Utility", price: 330 },
  { ticker: "MARUTI.NS", name: "Maruti Suzuki", sector: "Automobiles", price: 12200 },
  { ticker: "ASIANPAINT.NS", name: "Asian Paints", sector: "Paints & Home Decor", price: 3010 },
  { ticker: "ULTRACEMCO.NS", name: "UltraTech Cement", sector: "Cement & Building Mat", price: 11150 },
  { ticker: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", sector: "Banking", price: 1780 },
  { ticker: "AXISBANK.NS", name: "Axis Bank", sector: "Banking", price: 1170 },
  { ticker: "WIPRO.NS", name: "Wipro Ltd", sector: "IT Services", price: 515 },
  { ticker: "HCLTECH.NS", name: "HCL Technologies", sector: "IT Services", price: 1680 },
  { ticker: "CIPLA.NS", name: "Cipla Ltd", sector: "Pharma", price: 1540 },
  { ticker: "DRREDDY.NS", name: "Dr Reddy's Laboratories", sector: "Pharma", price: 6720 },
  { ticker: "DIVISLAB.NS", name: "Divi's Laboratories", sector: "Active Pharma Ingredients", price: 4890 },
  { ticker: "VEDL.NS", name: "Vedanta Ltd", sector: "Natural Resources", price: 460 },
  { ticker: "HINDALCO.NS", name: "Hindalco Industries", sector: "Aluminium & Metals", price: 675 },
  { ticker: "JSWSTEEL.NS", name: "JSW Steel", sector: "Steel & Metallurgy", price: 925 },
  { ticker: "NESTLEIND.NS", name: "Nestle India", sector: "FMCG", price: 2480 },
  { ticker: "BRITANNIA.NS", name: "Britannia Industries", sector: "FMCG", price: 5740 },
  { ticker: "BAJAJFINSV.NS", name: "Bajaj Finserv", sector: "Financial Services", price: 1810 },
  { ticker: "INDUSINDBK.NS", name: "IndusInd Bank", sector: "Banking", price: 1410 },
  { ticker: "EICHERMOT.NS", name: "Eicher Motors (Royal Enfield)", sector: "Automobiles", price: 4890 },
  { ticker: "M&M.NS", name: "Mahindra & Mahindra", sector: "Auto & Tractors", price: 2750 },
  { ticker: "HEROMOTOCO.NS", name: "Hero MotoCorp", sector: "Two-Wheelers", price: 5240 },
  { ticker: "APOLLOHOSP.NS", name: "Apollo Hospitals", sector: "Healthcare & Clinics", price: 6650 },
  { ticker: "GRASIM.NS", name: "Grasim Industries", sector: "Chemicals & Paints", price: 2580 },
  { ticker: "ONGC.NS", name: "Oil & Natural Gas Corp", sector: "Oil Exploration", price: 320 },
  { ticker: "BPCL.NS", name: "Bharat Petroleum Corp", sector: "Refining & Marketing", price: 345 },
  { ticker: "IOC.NS", name: "Indian Oil Corp", sector: "Oil Refining", price: 175 },
  { ticker: "GAIL.NS", name: "GAIL India", sector: "Natural Gas", price: 225 },
  { ticker: "TECHM.NS", name: "Tech Mahindra", sector: "IT Services", price: 1540 },
  { ticker: "LTIM.NS", name: "LTIMindtree", sector: "IT Solutions", price: 5690 },
];

export default function OrdersAndPnLPage() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [realizedPnL, setRealizedPnL] = useState<number>(0);
  const [isSyncingQuotes, setIsSyncingQuotes] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Direct Order Placement Form State
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [orderTicker, setOrderTicker] = useState("RELIANCE.NS");
  const [orderName, setOrderName] = useState("Reliance Industries");
  const [orderPrice, setOrderPrice] = useState<number>(2980);
  const [orderQuantity, setOrderQuantity] = useState<number>(5);
  const [orderAction, setOrderAction] = useState<"BUY" | "SELL">("BUY");
  const [orderPortfolioTag, setOrderPortfolioTag] = useState("Direct Demat Orders");
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Direct 1-Click Sell / Exit Holding Modal State
  const [showQuickSellModal, setShowQuickSellModal] = useState(false);
  const [sellingPosition, setSellingPosition] = useState<Position | null>(null);
  const [quickSellQuantity, setQuickSellQuantity] = useState<number>(1);
  const [quickSellPrice, setQuickSellPrice] = useState<number>(0);
  const [isExecutingQuickSell, setIsExecutingQuickSell] = useState(false);

  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return NSE_MASTER_STOCKS;
    const q = searchQuery.toLowerCase();
    return NSE_MASTER_STOCKS.filter(
      (s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Helper: Reconstruct accurate holdings and realized P&L from order history
  const reconstructFromOrders = (orderList: OrderRecord[]): { reconstructed: Position[], bookedPnL: number } => {
    const map = new Map<string, {
      ticker: string;
      company_name: string;
      quantity: number;
      invested_amount: number;
      portfolio_name: string;
      last_price: number;
    }>();

    let bookedPnL = 0;
    const sorted = [...orderList].reverse(); // Process oldest to newest

    sorted.forEach((ord) => {
      const t = ord.ticker;
      const isBuy = ord.action === "BUY";
      const qty = Number(ord.quantity) || 0;
      const price = Number(ord.executed_price) || 0;
      const val = Number(ord.order_value) || (qty * price);

      if (isBuy) {
        if (map.has(t)) {
          const prev = map.get(t)!;
          const newQty = prev.quantity + qty;
          const newInvested = prev.invested_amount + val;
          map.set(t, {
            ...prev,
            quantity: newQty,
            invested_amount: newInvested,
            last_price: price,
          });
        } else {
          map.set(t, {
            ticker: t,
            company_name: ord.company_name,
            quantity: qty,
            invested_amount: val,
            portfolio_name: ord.portfolio_name || "Direct Demat Orders",
            last_price: price,
          });
        }
      } else {
        // SELL
        if (map.has(t)) {
          const prev = map.get(t)!;
          const avgBuy = prev.quantity > 0 ? prev.invested_amount / prev.quantity : price;
          const sellQty = Math.min(prev.quantity, qty);
          const costOfSold = sellQty * avgBuy;
          const proceeds = sellQty * price;
          bookedPnL += (proceeds - costOfSold);

          const remQty = prev.quantity - sellQty;
          const remInvested = remQty * avgBuy;

          if (remQty <= 0) {
            map.delete(t);
          } else {
            map.set(t, {
              ...prev,
              quantity: remQty,
              invested_amount: remInvested,
              last_price: price,
            });
          }
        }
      }
    });

    const reconstructed: Position[] = Array.from(map.values()).map((item) => {
      const avg = item.quantity > 0 ? Math.round((item.invested_amount / item.quantity) * 100) / 100 : item.last_price;
      const currVal = Math.round(item.quantity * item.last_price * 100) / 100;
      const pnl = Math.round((currVal - item.invested_amount) * 100) / 100;
      const pnlPct = item.invested_amount > 0 ? Math.round((pnl / item.invested_amount) * 10000) / 100 : 0;

      return {
        ticker: item.ticker,
        company_name: item.company_name,
        quantity: item.quantity,
        avg_buy_price: avg,
        current_price: item.last_price,
        invested_amount: Math.round(item.invested_amount * 100) / 100,
        current_value: currVal,
        unrealized_pnl: pnl,
        unrealized_pnl_pct: pnlPct,
        day_change_pct: 0,
        portfolio_name: item.portfolio_name,
      };
    });

    return { reconstructed, bookedPnL };
  };

  // Sync Live Quotes and Recalculate Real-Time P&L
  const syncLiveQuotes = async (currentPositions?: Position[]) => {
    const list = currentPositions || positions;
    if (!list || list.length === 0) return;

    setIsSyncingQuotes(true);
    try {
      const tickers = Array.from(new Set(list.map((p) => p.ticker)));
      const res = await fetch(`${API_BASE_URL}/api/v1/stocks/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
      });

      if (res.ok) {
        const quotes = await res.json();
        if (quotes && typeof quotes === "object") {
          setPositions((prev) => {
            const updated = prev.map((p) => {
              const q = quotes[p.ticker] || quotes[`${p.ticker}.NS`] || quotes[p.ticker.replace(".NS", "")];
              if (!q || !q.current_price) return p;
              const livePrice = Number(q.current_price);
              const currVal = Math.round(p.quantity * livePrice * 100) / 100;
              const pnl = Math.round((currVal - p.invested_amount) * 100) / 100;
              const pnlPct = p.invested_amount > 0 ? Math.round((pnl / p.invested_amount) * 10000) / 100 : 0;
              const dayPct = q.day_change_pct !== undefined ? Number(q.day_change_pct) : p.day_change_pct;

              return {
                ...p,
                current_price: livePrice,
                current_value: currVal,
                unrealized_pnl: pnl,
                unrealized_pnl_pct: pnlPct,
                day_change_pct: dayPct,
              };
            });

            if (user) {
              localStorage.setItem(`user_${user.id}_active_positions`, JSON.stringify(updated));
            }
            return updated;
          });
          const now = new Date();
          setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch (err) {
      console.error("Live quote sync failed:", err);
    } finally {
      setIsSyncingQuotes(false);
    }
  };

  // Load from LocalStorage strictly scoped to current user
  useEffect(() => {
    if (!user) {
      setPositions([]);
      setOrders([]);
      setRealizedPnL(0);
      return;
    }

    try {
      const userPositionsKey = `user_${user.id}_active_positions`;
      const userOrdersKey = `user_${user.id}_order_history`;

      const storedOrders = localStorage.getItem(userOrdersKey);
      let parsedOrders: OrderRecord[] = [];
      if (storedOrders) {
        parsedOrders = JSON.parse(storedOrders);
        setOrders(parsedOrders);
      } else {
        setOrders([]);
      }

      const storedPositions = localStorage.getItem(userPositionsKey);
      let parsedPositions: Position[] = [];
      if (storedPositions) {
        parsedPositions = JSON.parse(storedPositions);
      }

      // If positions are empty or out of sync but orders exist, automatically reconstruct holdings from order ledger
      if (parsedPositions.length === 0 && parsedOrders.length > 0) {
        const { reconstructed, bookedPnL } = reconstructFromOrders(parsedOrders);
        parsedPositions = reconstructed;
        setRealizedPnL(bookedPnL);
        localStorage.setItem(userPositionsKey, JSON.stringify(reconstructed));
      } else if (parsedOrders.length > 0) {
        const { bookedPnL } = reconstructFromOrders(parsedOrders);
        setRealizedPnL(bookedPnL);
      }

      setPositions(parsedPositions);
      if (parsedPositions.length > 0) {
        syncLiveQuotes(parsedPositions);
      }
    } catch (e) {
      console.error(e);
      setPositions([]);
      setOrders([]);
    }
  }, [user]);

  // Automated 20s periodic background polling for live price fluctuations
  useEffect(() => {
    if (!user || positions.length === 0) return;

    const interval = setInterval(() => {
      syncLiveQuotes();
    }, 20000);

    return () => clearInterval(interval);
  }, [positions.length, user]);

  // Update Stock Selection in Order Form with Instant Real-Time Quote
  const handleSelectStock = async (stock: any) => {
    setOrderTicker(stock.ticker);
    setOrderName(stock.name);
    setOrderPrice(stock.price);
    setIsDropdownOpen(false);
    setSearchQuery("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/stocks/quote/${encodeURIComponent(stock.ticker)}`);
      if (res.ok) {
        const q = await res.json();
        if (q && q.current_price) {
          setOrderPrice(Number(q.current_price));
        }
      }
    } catch (e) {
      console.warn("Could not fetch live single quote:", e);
    }
  };

  // Open Direct Quick Sell Modal from table
  const handleOpenQuickSell = async (p: Position) => {
    setSellingPosition(p);
    setQuickSellQuantity(p.quantity);
    setQuickSellPrice(p.current_price);
    setShowQuickSellModal(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/stocks/quote/${encodeURIComponent(p.ticker)}`);
      if (res.ok) {
        const q = await res.json();
        if (q && q.current_price) {
          setQuickSellPrice(Number(q.current_price));
        }
      }
    } catch (e) {
      console.warn("Could not refresh live quote for quick sell:", e);
    }
  };

  // Execute Direct Sell from Modal
  const handleConfirmQuickSell = () => {
    if (!user || !sellingPosition) return;
    const sellQty = Math.min(sellingPosition.quantity, Math.max(1, quickSellQuantity));
    const price = Number(quickSellPrice) || sellingPosition.current_price;
    const orderValue = Math.round(sellQty * price * 100) / 100;
    const brokerage = Math.min(20, Math.round(orderValue * 0.0003 * 100) / 100);
    const stt = Math.round(orderValue * 0.001 * 100) / 100;
    const now = new Date();
    const formattedTime = now.toISOString().replace("T", " ").substring(0, 19);
    const orderId = `ORD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    setIsExecutingQuickSell(true);

    setTimeout(() => {
      // Calculate Realized P&L on this sale
      const costBasisSold = sellQty * sellingPosition.avg_buy_price;
      const profitOnSale = Math.round((orderValue - costBasisSold) * 100) / 100;
      const newBookedPnL = Math.round((realizedPnL + profitOnSale) * 100) / 100;
      setRealizedPnL(newBookedPnL);

      // Create new Order Record
      const newOrder: OrderRecord = {
        order_id: orderId,
        ticker: sellingPosition.ticker,
        company_name: sellingPosition.company_name,
        action: "SELL",
        quantity: sellQty,
        executed_price: price,
        order_value: orderValue,
        brokerage,
        stt,
        status: "FILLED",
        execution_time: formattedTime,
        broker_mode: "DIRECT_IN_APP",
        portfolio_name: sellingPosition.portfolio_name,
      };

      const userOrdersKey = `user_${user.id}_order_history`;
      const userPositionsKey = `user_${user.id}_active_positions`;

      const updatedOrders = [newOrder, ...orders];
      setOrders(updatedOrders);
      localStorage.setItem(userOrdersKey, JSON.stringify(updatedOrders));

      // Update positions
      let updatedPositions = [...positions];
      const targetIdx = updatedPositions.findIndex((p) => p.ticker === sellingPosition.ticker);
      if (targetIdx >= 0) {
        const prev = updatedPositions[targetIdx];
        const remQty = prev.quantity - sellQty;
        if (remQty <= 0) {
          updatedPositions = updatedPositions.filter((p) => p.ticker !== sellingPosition.ticker);
        } else {
          const remInvested = Math.round(remQty * prev.avg_buy_price * 100) / 100;
          const remCurrVal = Math.round(remQty * price * 100) / 100;
          const remPnl = Math.round((remCurrVal - remInvested) * 100) / 100;
          const remPnlPct = remInvested > 0 ? Math.round((remPnl / remInvested) * 10000) / 100 : 0;

          updatedPositions[targetIdx] = {
            ...prev,
            quantity: remQty,
            invested_amount: remInvested,
            current_price: price,
            current_value: remCurrVal,
            unrealized_pnl: remPnl,
            unrealized_pnl_pct: remPnlPct,
          };
        }
      }

      setPositions(updatedPositions);
      localStorage.setItem(userPositionsKey, JSON.stringify(updatedPositions));

      setIsExecutingQuickSell(false);
      setShowQuickSellModal(false);
      setOrderSuccessMsg(`Successfully sold ${sellQty} shares of ${sellingPosition.company_name} (${sellingPosition.ticker}) @ ₹${price}! Booked Realized P&L: ${profitOnSale >= 0 ? `+₹${Math.round(profitOnSale).toLocaleString()}` : `-₹${Math.abs(Math.round(profitOnSale)).toLocaleString()}`}`);
      setTimeout(() => setOrderSuccessMsg(null), 6000);
    }, 300);
  };

  // Place Direct Order Handler from Side Desk
  const handlePlaceDirectOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in to place live demat orders.");
      return;
    }
    if (orderQuantity <= 0 || orderPrice <= 0) return;

    setIsPlacing(true);
    const orderValue = Math.round(orderQuantity * orderPrice * 100) / 100;
    const brokerage = Math.min(20, Math.round(orderValue * 0.0003 * 100) / 100);
    const stt = Math.round(orderValue * 0.001 * 100) / 100;
    const now = new Date();
    const formattedTime = now.toISOString().replace("T", " ").substring(0, 19);
    const orderId = `ORD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const newOrder: OrderRecord = {
      order_id: orderId,
      ticker: orderTicker,
      company_name: orderName,
      action: orderAction,
      quantity: Number(orderQuantity),
      executed_price: Number(orderPrice),
      order_value: orderValue,
      brokerage,
      stt,
      status: "FILLED",
      execution_time: formattedTime,
      broker_mode: "DIRECT_IN_APP",
      portfolio_name: orderPortfolioTag,
    };

    setTimeout(() => {
      const userPositionsKey = `user_${user.id}_active_positions`;
      const userOrdersKey = `user_${user.id}_order_history`;

      // 1. Update Order History
      const updatedOrders = [newOrder, ...orders];
      setOrders(updatedOrders);
      localStorage.setItem(userOrdersKey, JSON.stringify(updatedOrders));

      // 2. Update Positions / Holdings
      let updatedPositions = [...positions];
      const existingIdx = updatedPositions.findIndex((p) => p.ticker === orderTicker);

      if (orderAction === "BUY") {
        if (existingIdx >= 0) {
          const prev = updatedPositions[existingIdx];
          const newQty = prev.quantity + Number(orderQuantity);
          const newInvested = prev.invested_amount + orderValue;
          const newAvgPrice = Math.round((newInvested / newQty) * 100) / 100;
          const newCurrentVal = Math.round(newQty * orderPrice * 100) / 100;
          const newPnl = Math.round((newCurrentVal - newInvested) * 100) / 100;
          const newPnlPct = Math.round((newPnl / newInvested) * 10000) / 100;

          updatedPositions[existingIdx] = {
            ...prev,
            quantity: newQty,
            avg_buy_price: newAvgPrice,
            current_price: Number(orderPrice),
            invested_amount: newInvested,
            current_value: newCurrentVal,
            unrealized_pnl: newPnl,
            unrealized_pnl_pct: newPnlPct,
          };
        } else {
          updatedPositions.push({
            ticker: orderTicker,
            company_name: orderName,
            quantity: Number(orderQuantity),
            avg_buy_price: Number(orderPrice),
            current_price: Number(orderPrice),
            invested_amount: orderValue,
            current_value: orderValue,
            unrealized_pnl: 0,
            unrealized_pnl_pct: 0,
            day_change_pct: 0.5,
            portfolio_name: orderPortfolioTag,
          });
        }
      } else {
        // SELL Action
        if (existingIdx >= 0) {
          const prev = updatedPositions[existingIdx];
          const remainingQty = prev.quantity - Number(orderQuantity);
          const costBasisSold = Math.min(prev.quantity, Number(orderQuantity)) * prev.avg_buy_price;
          const profitOnSale = Math.round((orderValue - costBasisSold) * 100) / 100;
          setRealizedPnL((prevBooked) => Math.round((prevBooked + profitOnSale) * 100) / 100);

          if (remainingQty <= 0) {
            updatedPositions = updatedPositions.filter((p) => p.ticker !== orderTicker);
          } else {
            const newInvested = Math.round(remainingQty * prev.avg_buy_price * 100) / 100;
            const newCurrentVal = Math.round(remainingQty * orderPrice * 100) / 100;
            const newPnl = Math.round((newCurrentVal - newInvested) * 100) / 100;
            const newPnlPct = Math.round((newPnl / newInvested) * 10000) / 100;

            updatedPositions[existingIdx] = {
              ...prev,
              quantity: remainingQty,
              invested_amount: newInvested,
              current_value: newCurrentVal,
              unrealized_pnl: newPnl,
              unrealized_pnl_pct: newPnlPct,
            };
          }
        }
      }

      setPositions(updatedPositions);
      localStorage.setItem(userPositionsKey, JSON.stringify(updatedPositions));

      // 3. Automatically save/update this portfolio in Saved Portfolios
      try {
        const savedPortfoliosKey = `saved_user_portfolios_${user.id}`;
        const existingSaved: any[] = JSON.parse(localStorage.getItem(savedPortfoliosKey) || "[]");
        const basketName = orderPortfolioTag || "Direct Demat Orders";
        const foundIdx = existingSaved.findIndex((p: any) => p.name === basketName);

        const currentAsset = {
          ticker: orderTicker,
          name: orderName,
          weight: 0.25,
          allocation_amount: orderValue,
        };

        if (foundIdx >= 0) {
          const target = existingSaved[foundIdx];
          const existingAssets = target.assets || [];
          const assetIdx = existingAssets.findIndex((a: any) => a.ticker === orderTicker);
          if (assetIdx >= 0) {
            existingAssets[assetIdx].allocation_amount = (existingAssets[assetIdx].allocation_amount || 0) + orderValue;
          } else {
            existingAssets.push(currentAsset);
          }
          target.initial_investment = (target.initial_investment || 0) + orderValue;
          target.assets = existingAssets;
          existingSaved[foundIdx] = target;
        } else {
          existingSaved.unshift({
            id: Date.now(),
            name: basketName,
            initial_investment: orderValue,
            horizon_years: 3,
            expected_return: 16.5,
            volatility: 17.0,
            sharpe_ratio: 0.82,
            notes: "Direct market execution basket",
            created_at: new Date().toISOString(),
            assets: [currentAsset],
          });
        }
        localStorage.setItem(savedPortfoliosKey, JSON.stringify(existingSaved));
      } catch (saveErr) {
        console.error("Auto-saving ordered portfolio failed:", saveErr);
      }

      setIsPlacing(false);
      setOrderSuccessMsg(`Order ${orderId} filled! ${orderAction} ${orderQuantity} ${orderTicker} @ ₹${orderPrice} (Saved to Portfolios)`);

      setTimeout(() => setOrderSuccessMsg(null), 5000);
    }, 400);
  };

  // Overall Financial Breakdown & PnL Metrics
  const totalInvested = positions.reduce((acc, p) => acc + p.invested_amount, 0);
  const totalCurrentValue = positions.reduce((acc, p) => acc + p.current_value, 0);
  const totalUnrealizedPnL = totalCurrentValue - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0;

  // Separate Breakdown of Total Profits vs Total Losses across positions
  const totalGains = positions
    .filter((p) => p.unrealized_pnl > 0)
    .reduce((acc, p) => acc + p.unrealized_pnl, 0);
  const totalLosses = positions
    .filter((p) => p.unrealized_pnl < 0)
    .reduce((acc, p) => acc + Math.abs(p.unrealized_pnl), 0);
  const profitableCount = positions.filter((p) => p.unrealized_pnl > 0).length;
  const losingCount = positions.filter((p) => p.unrealized_pnl < 0).length;

  // Realized P&L from closed trades + Net Consolidated P&L
  const netConsolidatedPnL = totalUnrealizedPnL + realizedPnL;
  const totalDayPnL = positions.reduce((acc, p) => acc + (p.current_value * (p.day_change_pct / 100)), 0);

  // Group positions by Portfolio
  const portfolioGroups = useMemo(() => {
    const groups: Record<string, Position[]> = {};
    positions.forEach((p) => {
      const pName = p.portfolio_name || "Direct Demat Holdings";
      if (!groups[pName]) groups[pName] = [];
      groups[pName].push(p);
    });
    return Object.entries(groups).map(([name, items]) => {
      const invested = items.reduce((s, i) => s + i.invested_amount, 0);
      const currVal = items.reduce((s, i) => s + i.current_value, 0);
      const pnl = currVal - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      const dayPnl = items.reduce((s, i) => s + (i.current_value * (i.day_change_pct / 100)), 0);

      return {
        name,
        items,
        invested,
        current_value: currVal,
        pnl,
        pnl_pct: pnlPct,
        day_pnl: dayPnl,
      };
    });
  }, [positions]);

  return (
    <AuthTeaserGate
      title="Live Demat Orders & Private P&L"
      subtitle="Sign in to view your private portfolio holdings, real-time unrealized gains/losses, and execute live market orders."
      features={[
        "User-isolated private portfolio tracking",
        "Real-time P&L evaluation at live NSE prices",
        "Instant order execution audit log",
        "Portfolio-wise earnings allocation",
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider font-mono">
              Live Demat Desk
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Orders, Positions & Real-Time P&L</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track consolidated capital invested, live profit & loss changes, portfolio-wise earnings, and execute direct trades.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3.5 py-1.5 rounded-xl text-xs font-mono border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-800 font-semibold">{lastSyncTime ? `Live: ${lastSyncTime}` : "Live Market Feed"}</span>
          </div>

          <button
            onClick={() => syncLiveQuotes()}
            disabled={isSyncingQuotes || positions.length === 0}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Fetch real-time NSE market prices and recalculate P&L"
          >
            <span className={isSyncingQuotes ? "animate-spin" : ""}>🔄</span>
            <span>{isSyncingQuotes ? "Syncing..." : "Refresh Live Quotes"}</span>
          </button>

          <Link
            href="/portfolio"
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono px-3.5 py-1.5 rounded-xl border border-slate-200 font-semibold transition-colors"
          >
            Portfolio Studio →
          </Link>
          <Link
            href="/my-portfolios"
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono px-3.5 py-1.5 rounded-xl border border-slate-200 font-semibold transition-colors"
          >
            Saved Portfolios →
          </Link>
          <Link
            href="/execute"
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-mono px-4 py-1.5 rounded-xl font-semibold transition-colors shadow-sm"
          >
            Broker Terminal →
          </Link>
        </div>
      </div>

      {/* 5-CARD INSTITUTIONAL KPI DASHBOARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Capital Invested */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              Capital Invested
            </span>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              {positions.length} Assets
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              ₹{Math.round(totalInvested).toLocaleString()}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Total acquisition cost basis</p>
          </div>
        </div>

        {/* 2. Current Market Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Current Value
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
              Live NSE
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              ₹{Math.round(totalCurrentValue).toLocaleString()}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Real-time market valuation</p>
          </div>
        </div>

        {/* 3. Unrealized P&L */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${totalUnrealizedPnL >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}></span>
              Unrealized P&L
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
              totalUnrealizedPnL >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
            }`}>
              {totalPnLPct >= 0 ? `+${totalPnLPct.toFixed(2)}%` : `${totalPnLPct.toFixed(2)}%`}
            </span>
          </div>
          <div>
            <h2 className={`text-2xl font-black tracking-tight font-mono ${
              totalUnrealizedPnL >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}>
              {totalUnrealizedPnL >= 0 ? `+₹${Math.round(totalUnrealizedPnL).toLocaleString()}` : `-₹${Math.abs(Math.round(totalUnrealizedPnL)).toLocaleString()}`}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold pt-1">
              <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                +{profitableCount} win (₹{Math.round(totalGains).toLocaleString()})
              </span>
              <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                -{losingCount} loss (₹{Math.round(totalLosses).toLocaleString()})
              </span>
            </div>
          </div>
        </div>

        {/* 4. Realized Booked P&L */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Realized Booked P&L
            </span>
            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
              Closed Trades
            </span>
          </div>
          <div>
            <h2 className={`text-2xl font-black tracking-tight font-mono ${
              realizedPnL >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}>
              {realizedPnL >= 0 ? `+₹${Math.round(realizedPnL).toLocaleString()}` : `-₹${Math.abs(Math.round(realizedPnL)).toLocaleString()}`}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Locked-in profit from sold stocks</p>
          </div>
        </div>

        {/* 5. Net Consolidated Profit / Loss */}
        <div className={`p-5 rounded-2xl border shadow-md flex flex-col justify-between space-y-3 relative overflow-hidden transition-all ${
          netConsolidatedPnL >= 0
            ? "bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white border-emerald-500/40"
            : "bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950 text-white border-rose-500/40"
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-slate-300 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${netConsolidatedPnL >= 0 ? "bg-emerald-400" : "bg-rose-400"}`}></span>
              Net Consolidated P&L
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
              netConsolidatedPnL >= 0
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border-rose-500/30"
            }`}>
              {totalInvested > 0 ? `${((netConsolidatedPnL / totalInvested) * 100).toFixed(2)}% ROI` : "0.00%"}
            </span>
          </div>
          <div>
            <h2 className={`text-2xl font-black tracking-tight font-mono ${
              netConsolidatedPnL >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {netConsolidatedPnL >= 0 ? `+₹${Math.round(netConsolidatedPnL).toLocaleString()}` : `-₹${Math.abs(Math.round(netConsolidatedPnL)).toLocaleString()}`}
            </h2>
            <p className="text-[11px] text-slate-300/80 font-medium mt-0.5">
              Consolidated (Realized + Unrealized)
            </p>
          </div>
        </div>
      </div>

      {/* PORTFOLIO-WISE EARNINGS & PERFORMANCE BREAKDOWN */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">
              PORTFOLIO EARNINGS
            </span>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              Portfolio-Wise Earnings & Valuation Breakdown
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">{portfolioGroups.length} Baskets Active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolioGroups.map((pg, idx) => {
            const isPos = pg.pnl >= 0;
            return (
              <div
                key={idx}
                className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-3 hover:bg-slate-50 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{pg.name}</h4>
                      <span className="text-[10px] font-mono text-slate-500">{pg.items.length} Constituents</span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        isPos ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {isPos ? `+${pg.pnl_pct.toFixed(2)}%` : `${pg.pnl_pct.toFixed(2)}%`}
                    </span>
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Invested</span>
                      <span className="font-semibold text-slate-900">₹{Math.round(pg.invested).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Current Value</span>
                      <span className="font-semibold text-slate-900">₹{Math.round(pg.current_value).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Total Profit</span>
                      <span className={`font-bold ${isPos ? "text-emerald-600" : "text-rose-600"}`}>
                        {isPos ? `+₹${Math.round(pg.pnl).toLocaleString()}` : `-₹${Math.abs(Math.round(pg.pnl)).toLocaleString()}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Day's P&L</span>
                      <span className={`font-semibold ${pg.day_pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {pg.day_pnl >= 0 ? `+₹${Math.round(pg.day_pnl).toLocaleString()}` : `-₹${Math.abs(Math.round(pg.day_pnl)).toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stock badges inside portfolio */}
                <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-200/50">
                  {pg.items.map((stock) => (
                    <span
                      key={stock.ticker}
                      className="text-[10px] font-mono bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded"
                    >
                      {stock.ticker.replace(".NS", "")} ({stock.quantity})
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-COLUMN LAYOUT: SEARCHABLE DIRECT ORDER TICKET + ACTIVE POSITIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DIRECT ORDER PLACEMENT DESK */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider font-mono">
                Direct Order Placement Desk
              </h3>
            </div>

            {/* SEARCHABLE NSE STOCK SELECTOR */}
            <div className="space-y-1.5 relative">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono block">
                Search / Select Any NSE Stock
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type any stock (e.g. Zomato, Suzlon, SBI, Adani, TCS)..."
                  value={searchQuery}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  className="border border-slate-200 px-3.5 py-2 rounded-xl w-full text-xs font-mono outline-none focus:border-slate-800"
                />
                
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsDropdownOpen(false);
                    }}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 font-bold text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown List */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 w-full bg-white border border-slate-200 mt-1 max-h-56 overflow-y-auto rounded-xl shadow-xl z-50 divide-y divide-slate-100">
                  {filteredStocks.length > 0 ? (
                    filteredStocks.slice(0, 15).map((stock) => (
                      <div
                        key={stock.ticker}
                        onClick={() => handleSelectStock(stock)}
                        className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{stock.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">{stock.ticker} • {stock.sector}</span>
                        </div>
                        <span className="font-mono font-bold text-blue-600">₹{stock.price}</span>
                      </div>
                    ))
                  ) : (
                    <div
                      onClick={() => {
                        const customTicker = searchQuery.toUpperCase().endsWith(".NS")
                          ? searchQuery.toUpperCase()
                          : `${searchQuery.toUpperCase()}.NS`;
                        handleSelectStock({
                          ticker: customTicker,
                          name: searchQuery.toUpperCase(),
                          price: 500,
                        });
                      }}
                      className="p-3 text-center text-xs text-blue-600 font-mono hover:bg-blue-50 cursor-pointer font-bold"
                    >
                      + Use Custom Ticker: "{searchQuery.toUpperCase()}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handlePlaceDirectOrder} className="space-y-3.5 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Selected Company / Ticker</label>
                <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-bold text-slate-900 flex justify-between items-center">
                  <span>{orderName} ({orderTicker})</span>
                  <span className="text-blue-600 font-semibold">₹{orderPrice}</span>
                </div>
              </div>

              {/* Action Switcher: BUY vs SELL */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderAction("BUY")}
                  className={`py-2 rounded-xl text-xs font-bold font-mono transition-colors ${
                    orderAction === "BUY"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  BUY / ACCUMULATE
                </button>
                <button
                  type="button"
                  onClick={() => setOrderAction("SELL")}
                  className={`py-2 rounded-xl text-xs font-bold font-mono transition-colors ${
                    orderAction === "SELL"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  SELL / TRIM
                </button>
              </div>

              {/* Quantity & Execution Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="border border-slate-200 px-3 py-2 rounded-xl w-full text-xs font-mono font-bold outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    required
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(parseFloat(e.target.value) || 1)}
                    className="border border-slate-200 px-3 py-2 rounded-xl w-full text-xs font-mono font-bold outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* Portfolio Tag */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Assign to Portfolio Basket</label>
                <select
                  value={orderPortfolioTag}
                  onChange={(e) => setOrderPortfolioTag(e.target.value)}
                  className="border border-slate-200 px-3 py-2 rounded-xl w-full text-xs font-mono bg-white outline-none focus:border-slate-800"
                >
                  <option value="Direct Demat Orders">Direct Demat Orders</option>
                  <option value="Optimal Markowitz Basket">Optimal Markowitz Basket</option>
                  <option value="High-Alpha Growth Basket">High-Alpha Growth Basket</option>
                  <option value="Simulation Stress Test Basket">Simulation Stress Test Basket</option>
                </select>
              </div>

              {/* Estimated Breakdown */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-mono space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Gross Order Value:</span>
                  <span className="font-bold text-slate-900">
                    ₹{(orderQuantity * orderPrice).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Est. Brokerage & STT (0.1%):</span>
                  <span>₹{(Math.min(20, orderQuantity * orderPrice * 0.0003) + orderQuantity * orderPrice * 0.001).toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPlacing}
                className={`w-full py-2.5 rounded-xl text-xs font-bold font-mono text-white transition-colors shadow-sm ${
                  orderAction === "BUY"
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isPlacing ? "Processing Order..." : `Confirm & Execute ${orderAction} Order →`}
              </button>
            </form>

            {orderSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-mono leading-tight">
                {orderSuccessMsg}
              </div>
            )}
          </div>
        </div>

        {/* ACTIVE PORTFOLIO POSITIONS TABLE WITH DIRECT 1-CLICK SELL BUTTONS */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                  HOLDINGS
                </span>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Active Demat Positions ({positions.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">Live P&L Tracking Active</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200 font-mono">
                  <tr>
                    <th className="px-4 py-3">Security</th>
                    <th className="px-4 py-3">Portfolio</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Avg Price</th>
                    <th className="px-4 py-3 text-right">LTP (₹)</th>
                    <th className="px-4 py-3 text-right">Current Value</th>
                    <th className="px-4 py-3 text-right">Unrealized P&L</th>
                    <th className="px-4 py-3 text-right">Day %</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-mono text-xs">
                        No active positions yet. Place your first equity order or execute a basket.
                      </td>
                    </tr>
                  ) : (
                    positions.map((p, idx) => {
                      const isPositive = p.unrealized_pnl >= 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 block">{p.company_name}</span>
                            <span className="font-mono text-[10px] text-slate-400">{p.ticker}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-mono font-medium">
                              {p.portfolio_name || "Direct"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                            {p.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            ₹{p.avg_buy_price}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            ₹{p.current_price}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            ₹{Math.round(p.current_value).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            <span className={`font-bold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                              {isPositive ? `+₹${Math.round(p.unrealized_pnl).toLocaleString()}` : `-₹${Math.abs(Math.round(p.unrealized_pnl)).toLocaleString()}`}
                            </span>
                            <span className={`block text-[10px] font-semibold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                              {isPositive ? `+${p.unrealized_pnl_pct}%` : `${p.unrealized_pnl_pct}%`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            <span
                              className={`font-semibold text-[11px] ${
                                p.day_change_pct >= 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {p.day_change_pct >= 0 ? `+${p.day_change_pct}%` : `${p.day_change_pct}%`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenQuickSell(p)}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold font-mono px-3 py-1.5 rounded-lg shadow-xs transition-colors"
                                title={`Sell / Exit ${p.ticker}`}
                              >
                                Sell
                              </button>
                              <button
                                onClick={() => {
                                  setOrderTicker(p.ticker);
                                  setOrderName(p.company_name);
                                  setOrderPrice(p.current_price);
                                  setOrderAction("BUY");
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold font-mono px-2 py-1.5 rounded-lg transition-colors"
                                title={`Buy more shares of ${p.ticker}`}
                              >
                                + Buy
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ORDER EXECUTION HISTORY LOG */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">
              LOGS
            </span>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              Order Execution History & Confirmations ({orders.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Auto-Synced Across Portfolia Studio</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200 font-mono">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Execution Time</th>
                <th className="px-4 py-3">Security</th>
                <th className="px-4 py-3">Portfolio</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Executed Price</th>
                <th className="px-4 py-3 text-right">Order Value</th>
                <th className="px-4 py-3 text-right">Charges</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-mono text-xs">
                    No executed orders yet under this account.
                  </td>
                </tr>
              ) : (
                orders.map((ord, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {ord.order_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {ord.execution_time}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{ord.company_name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{ord.ticker}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-mono">
                        {ord.portfolio_name || "Direct"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                          ord.action === "BUY"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {ord.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {ord.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      ₹{ord.executed_price}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      ₹{ord.order_value.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[10px] text-slate-500">
                      ₹{(ord.brokerage + ord.stt).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DIRECT 1-CLICK SELL MODAL */}
      {showQuickSellModal && sellingPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                    Direct Sell Desk
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">
                    Sell Demat Holding
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Execute an immediate direct sale order at real-time NSE market prices.
                </p>
              </div>
              <button
                onClick={() => setShowQuickSellModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-base p-1"
              >
                ✕
              </button>
            </div>

            {/* Position details summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">{sellingPosition.company_name}</span>
                  <span className="font-mono text-slate-500 text-[11px]">{sellingPosition.ticker} • {sellingPosition.portfolio_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Available Quantity</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{sellingPosition.quantity} Shares</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Avg Purchase Price</span>
                  <span className="font-semibold text-slate-800">₹{sellingPosition.avg_buy_price}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Live Market LTP</span>
                  <span className="font-bold text-blue-600">₹{quickSellPrice}</span>
                </div>
              </div>
            </div>

            {/* Quantity Selector & Percentage shortcuts */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700 font-mono">Shares to Sell</label>
                <span className="text-[11px] font-mono text-slate-500">Max: {sellingPosition.quantity}</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={sellingPosition.quantity}
                  value={quickSellQuantity}
                  onChange={(e) => setQuickSellQuantity(Math.min(sellingPosition.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="border border-slate-200 px-3.5 py-2 rounded-xl text-sm font-mono font-bold w-full outline-none focus:border-slate-900"
                />
              </div>

              {/* Percentage buttons */}
              <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setQuickSellQuantity(Math.max(1, Math.floor(sellingPosition.quantity * 0.25)))}
                  className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSellQuantity(Math.max(1, Math.floor(sellingPosition.quantity * 0.50)))}
                  className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSellQuantity(Math.max(1, Math.floor(sellingPosition.quantity * 0.75)))}
                  className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSellQuantity(sellingPosition.quantity)}
                  className="py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold transition-colors"
                >
                  100% (ALL)
                </button>
              </div>
            </div>

            {/* Estimated Financial Realization */}
            {(() => {
              const grossVal = Math.round(quickSellQuantity * quickSellPrice * 100) / 100;
              const costBasis = quickSellQuantity * sellingPosition.avg_buy_price;
              const realizedGainLoss = Math.round((grossVal - costBasis) * 100) / 100;
              const isProfit = realizedGainLoss >= 0;

              return (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Gross Sale Value:</span>
                    <span className="font-bold text-slate-900 text-sm">₹{grossVal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Estimated Realized P&L:</span>
                    <span className={`font-bold text-sm ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                      {isProfit ? `+₹${realizedGainLoss.toLocaleString()}` : `-₹${Math.abs(realizedGainLoss).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                    <span>Est. Brokerage & STT (0.1%):</span>
                    <span>₹{(Math.min(20, grossVal * 0.0003) + grossVal * 0.001).toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuickSellModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold font-mono transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmQuickSell}
                disabled={isExecutingQuickSell}
                className="flex-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-mono transition-colors shadow-sm disabled:opacity-50"
              >
                {isExecutingQuickSell ? "Executing Sale..." : `Confirm & Sell ${quickSellQuantity} Shares Now →`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AuthTeaserGate>
  );
}
