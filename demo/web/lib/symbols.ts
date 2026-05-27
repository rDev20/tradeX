export type Sector =
  | "Index"
  | "Currency"
  | "Banking"
  | "IT"
  | "Auto"
  | "Pharma"
  | "FMCG"
  | "Energy"
  | "Metals"
  | "Financials"
  | "Infra";

export type DemoSymbol = {
  ticker: string;
  displayName: string;
  kind: "INDEX" | "EQUITY" | "CURRENCY";
  exchange: "NSE" | "BSE" | "FX";
  sector: Sector;
};

export const DEMO_SYMBOLS: DemoSymbol[] = [
  // Indices
  { ticker: "^NSEI", displayName: "NIFTY 50", kind: "INDEX", exchange: "NSE", sector: "Index" },
  { ticker: "^NSEBANK", displayName: "BANK NIFTY", kind: "INDEX", exchange: "NSE", sector: "Index" },
  { ticker: "^BSESN", displayName: "SENSEX", kind: "INDEX", exchange: "BSE", sector: "Index" },
  { ticker: "USDINR=X", displayName: "USD/INR", kind: "CURRENCY", exchange: "FX", sector: "Currency" },

  // Banking
  { ticker: "HDFCBANK.NS", displayName: "HDFC Bank", kind: "EQUITY", exchange: "NSE", sector: "Banking" },
  { ticker: "ICICIBANK.NS", displayName: "ICICI Bank", kind: "EQUITY", exchange: "NSE", sector: "Banking" },
  { ticker: "SBIN.NS", displayName: "State Bank of India", kind: "EQUITY", exchange: "NSE", sector: "Banking" },
  { ticker: "AXISBANK.NS", displayName: "Axis Bank", kind: "EQUITY", exchange: "NSE", sector: "Banking" },
  { ticker: "KOTAKBANK.NS", displayName: "Kotak Mahindra Bank", kind: "EQUITY", exchange: "NSE", sector: "Banking" },

  // IT
  { ticker: "TCS.NS", displayName: "TCS", kind: "EQUITY", exchange: "NSE", sector: "IT" },
  { ticker: "INFY.NS", displayName: "Infosys", kind: "EQUITY", exchange: "NSE", sector: "IT" },
  { ticker: "WIPRO.NS", displayName: "Wipro", kind: "EQUITY", exchange: "NSE", sector: "IT" },
  { ticker: "HCLTECH.NS", displayName: "HCL Tech", kind: "EQUITY", exchange: "NSE", sector: "IT" },

  // Auto
  { ticker: "MARUTI.NS", displayName: "Maruti Suzuki", kind: "EQUITY", exchange: "NSE", sector: "Auto" },
  { ticker: "M&M.NS", displayName: "Mahindra & Mahindra", kind: "EQUITY", exchange: "NSE", sector: "Auto" },
  { ticker: "EICHERMOT.NS", displayName: "Eicher Motors", kind: "EQUITY", exchange: "NSE", sector: "Auto" },

  // Pharma
  { ticker: "DRREDDY.NS", displayName: "Dr. Reddy's Labs", kind: "EQUITY", exchange: "NSE", sector: "Pharma" },
  { ticker: "SUNPHARMA.NS", displayName: "Sun Pharma", kind: "EQUITY", exchange: "NSE", sector: "Pharma" },

  // FMCG
  { ticker: "HINDUNILVR.NS", displayName: "Hindustan Unilever", kind: "EQUITY", exchange: "NSE", sector: "FMCG" },
  { ticker: "ITC.NS", displayName: "ITC", kind: "EQUITY", exchange: "NSE", sector: "FMCG" },

  // Energy
  { ticker: "RELIANCE.NS", displayName: "Reliance Industries", kind: "EQUITY", exchange: "NSE", sector: "Energy" },
  { ticker: "ONGC.NS", displayName: "ONGC", kind: "EQUITY", exchange: "NSE", sector: "Energy" },
  { ticker: "BPCL.NS", displayName: "BPCL", kind: "EQUITY", exchange: "NSE", sector: "Energy" },

  // Metals
  { ticker: "TATASTEEL.NS", displayName: "Tata Steel", kind: "EQUITY", exchange: "NSE", sector: "Metals" },
  { ticker: "JSWSTEEL.NS", displayName: "JSW Steel", kind: "EQUITY", exchange: "NSE", sector: "Metals" },

  // Financials
  { ticker: "BAJFINANCE.NS", displayName: "Bajaj Finance", kind: "EQUITY", exchange: "NSE", sector: "Financials" },

  // Infra
  { ticker: "LT.NS", displayName: "Larsen & Toubro", kind: "EQUITY", exchange: "NSE", sector: "Infra" },
  { ticker: "ADANIENT.NS", displayName: "Adani Enterprises", kind: "EQUITY", exchange: "NSE", sector: "Infra" },
];

export const SECTORS: Sector[] = [
  "Index",
  "Currency",
  "Banking",
  "IT",
  "Auto",
  "Pharma",
  "FMCG",
  "Energy",
  "Metals",
  "Financials",
  "Infra",
];
