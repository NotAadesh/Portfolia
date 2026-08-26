export interface MarketStatus {
  isOpen: boolean;
  statusText: "OPEN" | "CLOSED" | "PRE_OPEN" | "WEEKEND";
  message: string;
  nextOpenTime: string;
  currentTimeIST: string;
}

/**
 * Checks whether the Indian stock market (NSE/BSE) is open for live trading.
 * Trading Hours: Monday to Friday, 09:15 AM to 03:30 PM IST (UTC+5:30)
 */
export function getIndianMarketStatus(): MarketStatus {
  const now = new Date();

  // Convert to Indian Standard Time (Asia/Kolkata)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";

  const weekday = getPart("weekday"); // "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
  const hour = parseInt(getPart("hour"), 10);
  const minute = parseInt(getPart("minute"), 10);
  const timeInMinutes = hour * 60 + minute;

  const isWeekend = weekday === "Sat" || weekday === "Sun";
  const marketOpenMinutes = 9 * 60 + 15; // 09:15 AM
  const marketCloseMinutes = 15 * 60 + 30; // 03:30 PM (15:30)
  const preOpenMinutes = 9 * 60 + 0; // 09:00 AM

  const currentTimeIST = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} IST`;

  if (isWeekend) {
    return {
      isOpen: false,
      statusText: "WEEKEND",
      message: "NSE/BSE Markets are closed for the weekend.",
      nextOpenTime: "Monday 09:15 AM IST",
      currentTimeIST,
    };
  }

  if (timeInMinutes < preOpenMinutes) {
    return {
      isOpen: false,
      statusText: "CLOSED",
      message: "NSE/BSE Markets are closed before market open.",
      nextOpenTime: "Today 09:15 AM IST",
      currentTimeIST,
    };
  }

  if (timeInMinutes >= preOpenMinutes && timeInMinutes < marketOpenMinutes) {
    return {
      isOpen: false,
      statusText: "PRE_OPEN",
      message: "Pre-market session active. Regular trading starts at 09:15 AM IST.",
      nextOpenTime: "Today 09:15 AM IST",
      currentTimeIST,
    };
  }

  if (timeInMinutes >= marketOpenMinutes && timeInMinutes <= marketCloseMinutes) {
    return {
      isOpen: true,
      statusText: "OPEN",
      message: "NSE/BSE Live Market Session Active (09:15 AM - 03:30 PM IST).",
      nextOpenTime: "Closes at 03:30 PM IST",
      currentTimeIST,
    };
  }

  // After 3:30 PM IST on weekdays
  const nextDay = weekday === "Fri" ? "Monday" : "Tomorrow";
  return {
    isOpen: false,
    statusText: "CLOSED",
    message: "NSE/BSE Markets are closed for the day (Trading Hours: 09:15 AM - 03:30 PM IST).",
    nextOpenTime: `${nextDay} 09:15 AM IST`,
    currentTimeIST,
  };
}
