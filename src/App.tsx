import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { initAuth, googleSignIn, logout } from "./firebase";
import {
  parseRawSheetData,
  calculateKPIs,
  getCategoryBreakdown,
  getMonthlyTrend,
  getProductPerformance,
  getSalespersonPerformance,
  getRegionBreakdown,
  getFallbackData,
  parseTargetSheetData,
  calculateActualMetrics,
  normalizeStoreCode,
  normalizeDateStr,
  isStoreActive,
} from "./utils/sheetsParser";
import { KPICard } from "./components/KPICard";
import { DashboardCharts } from "./components/DashboardCharts";
import { TokoPerformanceRank } from "./components/TokoPerformanceRank";
import { CopyLaporan } from "./components/CopyLaporan";
import {
  Database,
  RefreshCw,
  FileSpreadsheet,
  ExternalLink,
  LogOut,
  Sparkles,
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  CloudLightning,
  AlertTriangle,
  Info,
  Layers,
  Percent,
  Gift,
  HeartPulse,
  PieChart,
  BadgePercent,
  Apple,
  Coffee,
  ShoppingBag,
  Trophy,
  ThumbsDown,
  Store,
  Search,
  ChevronDown,
  Share2,
  Copy,
  Check,
  X,
  Sun,
  Moon,
  Calendar,
} from "lucide-react";
import { SalesRecord, TargetData } from "./types";

import { User } from "firebase/auth";

const DEFAULT_SPREADSHEET_ID = "16zG8ey5YQ13O3tiVBHApLOeCawlhJ0Zw4ZDE7LiHuhs";

const getRecordMonthAndYear = (dateStr: string) => {
  if (!dateStr) return { month: null, year: null };
  const norm = normalizeDateStr(dateStr);
  const parts = norm.split("/");
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10); // 1-12
    const year = parseInt(parts[2], 10);
    return { month, year };
  }
  return { month: null, year: null };
};

const MONTH_OPTIONS = [
  { value: "ALL", label: "SEMUA BULAN" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const ELIGIBLE_RTD_STORES = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];

// Automatically route proxy requests to production backend when hosted on GitHub Pages
const API_BASE = typeof window !== "undefined" && window.location.hostname.includes("github.io")
  ? "https://ais-pre-vmgreydjwcuqo2kqij4njx-965477161653.asia-southeast1.run.app"
  : "";

const isMonWedFriTop = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const norm = normalizeDateStr(dateStr);
  const parts = norm.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
  }
  const fallbackDate = new Date(dateStr);
  if (!isNaN(fallbackDate.getTime())) {
    const dayOfWeek = fallbackDate.getDay();
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
  }
  const lower = dateStr.toLowerCase();
  return lower.includes("mon") || lower.includes("wed") || lower.includes("fri") ||
         lower.includes("senin") || lower.includes("rabu") || lower.includes("jumat") || lower.includes("jum'at");
};

const getCategoryDisplayNameAndUnit = (catStr: string, salesperson?: string) => {
  const clean = (catStr || "LAIN").toUpperCase().trim();
  if (clean === "SERBA" || clean.includes("SERBA") || clean === "SH") {
    return { name: "SERBA", unit: "Pkt" };
  }
  if (clean === "PSM") {
    return { name: "PSM", unit: "Pcs" };
  }
  if (clean === "PWP") {
    return { name: "PWP", unit: "Pcs" };
  }
  if (clean === "SEGER") {
    return { name: "SEGER", unit: "Pcs" };
  }
  if (clean === "RTD BASIC" || clean === "RTD COFFE BASIC" || clean === "COFFE BASIC") {
    return { name: "RTD BASIC", unit: "Pcs" };
  }
  if (clean === "RTD" || clean.includes("COFFE") || clean.includes("RTD")) {
    const isSpecialStore = ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(salesperson || ""));
    if (isSpecialStore) {
      return { name: "RTD COFFEDAY", unit: "Pcs" };
    } else {
      return { name: "RTD BASIC", unit: "Pcs" };
    }
  }
  if (clean === "CEBAN" || clean.includes("CEBAN") || clean.includes("CEMILAN")) {
    return { name: "CEBAN", unit: "Pcs" };
  }
  if (clean === "TELUR" || clean.includes("TELUR")) {
    return { name: "TELUR", unit: "Pcs" };
  }
  if (clean === "TOYS" || clean.includes("TOYS") || clean.includes("MAINAN")) {
    return { name: "TOYS", unit: "Pcs" };
  }
  if (clean === "NEW MEMBER" || clean.includes("MEMBER") || clean === "MBR" || clean.includes("NEW") || clean === "ACTUAL NEW") {
    return { name: "NEW MEMBER", unit: "Member" };
  }
  if (clean === "BOOTLE" || clean.includes("BOOTLE") || clean === "BOTTLE" || clean.includes("BOTTLE") || clean.includes("BOTOL") || clean.includes("SUSU")) {
    return { name: "BOTTLE", unit: "Pcs" };
  }
  return { name: clean, unit: "Pcs" };
};

const getGroupedByIndicator = (recordsList: SalesRecord[]) => {
  const map: Record<string, { name: string; quantity: number; unit: string }> = {};
  recordsList.forEach((r) => {
    const info = getCategoryDisplayNameAndUnit(r.category, r.salesperson);
    let key = info.name;
    
    // In Input Data view, display RTD COFFEDAY as "RTD COFFEDAY (SENIN, RABU, JUMAT)" and RTD BASIC as "RTD COFFE BASIC"
    if (key === "RTD COFFEDAY") {
      key = "RTD COFFEDAY (SENIN, RABU, JUMAT)";
    } else if (key === "RTD BASIC") {
      key = "RTD COFFE BASIC";
    }

    if (!map[key]) {
      map[key] = { name: key, quantity: 0, unit: info.unit };
    }

    // Filter and compute quantity
    if (key === "RTD COFFEDAY (SENIN, RABU, JUMAT)") {
      if (r.date && isMonWedFriTop(r.date)) {
        map[key].quantity += r.quantity || 0;
      }
    } else {
      map[key].quantity += r.quantity || 0;
    }
  });

  const order = [
    "PSM",
    "SERBA",
    "PWP",
    "SEGER",
    "RTD COFFEDAY (SENIN, RABU, JUMAT)",
    "RTD COFFE BASIC",
    "CEBAN",
    "TELUR",
    "TOYS",
    "NEW MEMBER"
  ];

  return Object.values(map).sort((a, b) => {
    const idxA = order.indexOf(a.name);
    const idxB = order.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
};

const parseCSV = (csvText: string): string[][] => {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(cell);
      lines.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length > 0) {
    row.push(cell);
    lines.push(row);
  }
  return lines.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ""));
};

export default function App() {
  const [spreadsheetId, setSpreadsheetId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("sheetId") || params.get("id");
    if (urlId) {
      localStorage.setItem("sheetId", urlId);
      return urlId;
    }
    return localStorage.getItem("sheetId") || DEFAULT_SPREADSHEET_ID;
  });
  const isFirstLoad = useRef(true);
  const lastSpreadsheetIdRef = useRef(spreadsheetId);
  const [sheetTabs, setSheetTabs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("cached_sheet_tabs");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get("tab") || params.get("activeTab");
    return urlTab || "DASHBOARD";
  });
  const [loading, setLoading] = useState(false);
  const [checkingMeta, setCheckingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // App Core Records State
  const [rawRecords, setRawRecords] = useState<SalesRecord[]>(() => {
    try {
      const saved = localStorage.getItem("cached_records");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed parsing cached records:", e);
    }
    return [];
  });
  const [rawDashboardRecords, setRawDashboardRecords] = useState<SalesRecord[]>(() => {
    try {
      const saved = localStorage.getItem("cached_dashboard_records");
      if (saved) return JSON.parse(saved);
      const savedRecords = localStorage.getItem("cached_records");
      if (savedRecords) return JSON.parse(savedRecords);
    } catch (e) {
      console.warn("Failed parsing cached dashboard records:", e);
    }
    return [];
  });

  const [selectedFilterMonth, setSelectedFilterMonth] = useState<string>("ALL");
  const [selectedFilterYear, setSelectedFilterYear] = useState<string>("ALL");

  const records = useMemo(() => {
    return rawRecords.filter((r) => {
      if (!r.date) return false;
      const { month, year } = getRecordMonthAndYear(r.date);
      if (selectedFilterMonth !== "ALL" && month !== parseInt(selectedFilterMonth, 10)) {
        return false;
      }
      if (selectedFilterYear !== "ALL" && year !== parseInt(selectedFilterYear, 10)) {
        return false;
      }
      return true;
    });
  }, [rawRecords, selectedFilterMonth, selectedFilterYear]);

  const dashboardRecords = useMemo(() => {
    return rawDashboardRecords.filter((r) => {
      if (!r.date) return false;
      const { month, year } = getRecordMonthAndYear(r.date);
      if (selectedFilterMonth !== "ALL" && month !== parseInt(selectedFilterMonth, 10)) {
        return false;
      }
      if (selectedFilterYear !== "ALL" && year !== parseInt(selectedFilterYear, 10)) {
        return false;
      }
      return true;
    });
  }, [rawDashboardRecords, selectedFilterMonth, selectedFilterYear]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const allRecs = [...rawRecords, ...rawDashboardRecords];
    allRecs.forEach((r) => {
      if (r.date) {
        const { year } = getRecordMonthAndYear(r.date);
        if (year) {
          yearsSet.add(String(year));
        }
      }
    });
    const sorted = Array.from(yearsSet).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
    if (sorted.length === 0) {
      return ["2026", "2025"];
    }
    return sorted;
  }, [rawRecords, rawDashboardRecords]);
  const [targets, setTargets] = useState<TargetData>(() => {
    try {
      const saved = localStorage.getItem("cached_targets");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed parsing cached targets:", e);
    }
    return {
      psm: 0,
      serba: 0,
      pwp: 0,
      seger: 0,
      rtd: 0,
      ceban: 0,
      telur: 0,
      toys: 0,
      new_member: 0,
      total: 0,
    };
  });
  const [isSandboxMode, setIsSandboxMode] = useState(() => {
    const hasCached = localStorage.getItem("cached_records");
    return !hasCached;
  });

  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() => {
    return localStorage.getItem("last_synced_time");
  });

  const [isLoadingServerCache, setIsLoadingServerCache] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);

  const loadServerCachedDashboard = useCallback(async (sId: string) => {
    if (!sId || sId.trim().length < 20) return false;
    setIsLoadingServerCache(true);
    try {
      console.log(`[Cache Load] Requesting server cache for spreadsheetId: ${sId}`);
      const res = await fetch(`${API_BASE}/api/get-dashboard?spreadsheetId=${sId}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`[Cache Load] Successfully loaded cache from server!`, data);
        if (data.records && data.records.length > 0) {
          setRawRecords(data.records);
          setRawDashboardRecords(data.records);
          if (data.targets) setTargets(data.targets);
          if (data.sheetTabs) setSheetTabs(data.sheetTabs);
          if (data.activeTab) setActiveTab(data.activeTab);
          if (data.lastSyncedTime) {
            setLastSyncedTime(data.lastSyncedTime);
            localStorage.setItem("last_synced_time", data.lastSyncedTime);
          }
          setIsSandboxMode(false);
          
          // Also save to guest's local storage so they have instant client persistence next time too
          localStorage.setItem("cached_records", JSON.stringify(data.records));
          localStorage.setItem("cached_dashboard_records", JSON.stringify(data.records));
          if (data.targets) localStorage.setItem("cached_targets", JSON.stringify(data.targets));
          if (data.sheetTabs) localStorage.setItem("cached_sheet_tabs", JSON.stringify(data.sheetTabs));
          if (data.activeTab) localStorage.setItem("google_active_tab", data.activeTab);
          return true;
        }
      }
    } catch (err) {
      console.warn("Failed retrieving server cache:", err);
    } finally {
      setIsLoadingServerCache(false);
    }
    return false;
  }, []);

  // State for the interactive Store & Date log viewer card
  const [selectedLogStore, setSelectedLogStore] = useState<string>("ALL");
  const [selectedLogDate, setSelectedLogDate] = useState<string>("ALL");

  // State for marketing tab page filters and search
  const [selectedMarketingDate, setSelectedMarketingDate] = useState<string>("ALL");
  const [marketingSearchQuery, setMarketingSearchQuery] = useState<string>("");

  // State for application layout view navigation (Dashboard vs Pencapaian)
  const [activeMenuTab, setActiveMenuTab] = useState<"dashboard" | "pencapaian" | "marketing" | "copy_laporan">("dashboard");
  const [pencapaianSearchQuery, setPencapaianSearchQuery] = useState<string>("");
  const [selectedPencapaianDate, setSelectedPencapaianDate] = useState<string>("ALL");
  const [selectedPencapaianStore, setSelectedPencapaianStore] = useState<string>("ALL");
  const [pencapaianSortField, setPencapaianSortField] = useState<string>("store");
  const [pencapaianSortDirection, setPencapaianSortDirection] = useState<"asc" | "desc">("asc");

  const handleSortPencapaian = (field: string) => {
    if (pencapaianSortField === field) {
      setPencapaianSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setPencapaianSortField(field);
      setPencapaianSortDirection(field === "store" ? "asc" : "desc");
    }
  };

  // Unique store codes (salesperson field matches toko code - active stores only)
  const uniqueSalespersons = useMemo(() => {
    const list = records
      .map((r) => r.salesperson)
      .filter((s): s is string => Boolean(s))
      .filter((s) => isStoreActive(s));
    const unique = Array.from(new Set(list)).sort();
    return unique;
  }, [records]);

  // Count active shops that matches RTD Coffeday store codes
  const activeRtdStoresCount = useMemo(() => {
    const rtdStoresList = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];
    return uniqueSalespersons.filter((store) =>
      rtdStoresList.some((code) => store.toUpperCase().includes(code.toUpperCase()))
    ).length;
  }, [uniqueSalespersons]);

  // Calculate total days: unique dates where there is at least one active input for any of the 9 main actual categories/indicators
  const totalDaysWithIndicators = useMemo(() => {
    const rtdStores = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];
    const activeDates = new Set<string>();

    records.forEach((r) => {
      if (!r.date || !r.quantity || r.quantity <= 0) return;

      const categoryLower = (r.category || "").toLowerCase();
      const productLower = (r.product || "").toLowerCase();
      const salespersonUpper = (r.salesperson || "").toUpperCase();

      const isRtdStore = rtdStores.some(code => salespersonUpper.includes(code.toUpperCase()));
      const isRtdProduct = categoryLower === "rtd" || categoryLower.includes("rtd") || productLower.includes("rtd");

      const matchesPsm = categoryLower === "psm" || categoryLower.includes("psm") || productLower.includes("psm");
      const matchesSerba = categoryLower === "serba" || categoryLower.includes("serba") || productLower.includes("serba");
      const matchesPwp = categoryLower === "pwp" || categoryLower.includes("pwp") || productLower.includes("pwp");
      const matchesSeger = categoryLower === "seger" || categoryLower.includes("seger") || productLower.includes("seger");
      const matchesRtd = isRtdStore && isRtdProduct;
      const matchesCeban = categoryLower.includes("ceban") || productLower.includes("ceban") || categoryLower.includes("cemilan") || productLower.includes("cemilan");
      const matchesTelur = categoryLower.includes("telur") || productLower.includes("telur");
      const matchesToys = categoryLower.includes("toys") || productLower.includes("toys") || categoryLower.includes("mainan") || productLower.includes("mainan");
      const matchesMember = categoryLower.includes("member") || productLower.includes("member") || categoryLower === "mbr";

      if (
        matchesPsm ||
        matchesSerba ||
        matchesPwp ||
        matchesSeger ||
        matchesRtd ||
        matchesCeban ||
        matchesTelur ||
        matchesToys ||
        matchesMember
      ) {
        activeDates.add(r.date.trim());
      }
    });

    return activeDates.size;
  }, [records]);

  // Unique chronological input dates
  const uniqueDates = useMemo(() => {
    const list = records.map((r) => r.date).filter((d): d is string => Boolean(d));
    const unique = Array.from(new Set<string>(list));
    
    // Sort dates chronological descending
    return unique.sort((a: string, b: string) => {
      const parseDate = (s: string) => {
        const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (dmy) {
          return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10)).getTime();
        }
        const iso = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
        if (iso) {
          return new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10)).getTime();
        }
        return Date.parse(s) || 0;
      };
      return parseDate(b) - parseDate(a);
    });
  }, [records]);

  // Unique chronological dashboard input dates specifically
  const dashboardUniqueDates = useMemo(() => {
    const list = dashboardRecords.map((r) => r.date).filter((d): d is string => Boolean(d));
    const unique = Array.from(new Set<string>(list));
    
    // Sort dates chronological descending
    return unique.sort((a: string, b: string) => {
      const parseDate = (s: string) => {
        const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (dmy) {
          return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10)).getTime();
        }
        const iso = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
        if (iso) {
          return new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10)).getTime();
        }
        return Date.parse(s) || 0;
      };
      return parseDate(b) - parseDate(a);
    });
  }, [dashboardRecords]);

  // Automatically validate store selection once data is loaded (allowing "ALL")
  useEffect(() => {
    if (uniqueSalespersons.length > 0 && selectedLogStore !== "ALL" && !uniqueSalespersons.includes(selectedLogStore)) {
      setSelectedLogStore("ALL");
    }
  }, [uniqueSalespersons, selectedLogStore]);

  // Automatically validate date selection once data is loaded (allowing "ALL")
  useEffect(() => {
    if (uniqueDates.length > 0 && selectedLogDate !== "ALL" && !uniqueDates.includes(selectedLogDate)) {
      setSelectedLogDate("ALL");
    }
  }, [uniqueDates, selectedLogDate]);

  // Filter records dynamically for the interactive card (show RTD for non-eligible stores under RTD COFFE BASIC)
  const filteredLogRecords = useMemo(() => {
    return records.filter((r) => {
      const matchStore = selectedLogStore === "ALL" || r.salesperson === selectedLogStore;
      const matchDate = selectedLogDate === "ALL" || r.date === selectedLogDate;
      if (!matchStore || !matchDate) return false;
      return true;
    });
  }, [records, selectedLogStore, selectedLogDate]);

  // Grouped records by salesperson when selectedLogStore is "ALL"
  const groupedLogRecords = useMemo(() => {
    if (selectedLogStore !== "ALL") {
      return null;
    }
    const groups: { salesperson: string; list: SalesRecord[] }[] = [];
    uniqueSalespersons.forEach((store) => {
      const list = filteredLogRecords.filter((r) => r.salesperson === store);
      if (list.length > 0) {
        groups.push({ salesperson: store, list });
      }
    });
    return groups;
  }, [filteredLogRecords, selectedLogStore, uniqueSalespersons]);

  // Sum metrics for these filtered log records
  const logStats = useMemo(() => {
    let q = 0;
    let s = 0;
    filteredLogRecords.forEach((r) => {
      q += r.quantity || 0;
      s += r.total || 0;
    });
    return { count: filteredLogRecords.length, qty: q, sales: s };
  }, [filteredLogRecords]);


  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Sync spreadsheetId with localStorage
  useEffect(() => {
    localStorage.setItem("sheetId", spreadsheetId);
  }, [spreadsheetId]);

  // Auto-refresh is always active and synchronizes automatically in the background
  const autoRefresh = true;

  // Configuration panel expanded/collapsed State (defaults to true)
  const [isConfigExpanded, setIsConfigExpanded] = useState(() => {
    const saved = localStorage.getItem("isConfigExpanded");
    return saved !== null ? saved === "true" : true;
  });

  // Sync isConfigExpanded with localStorage
  useEffect(() => {
    localStorage.setItem("isConfigExpanded", String(isConfigExpanded));
  }, [isConfigExpanded]);

  // State Ganti Tema (Dark Mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const [copiedLink, setCopiedLink] = useState(false);

  const getShareableLink = useCallback(() => {
    let origin = window.location.origin;
    if (origin.includes("ais-dev-")) {
      origin = origin.replace("ais-dev-", "ais-pre-");
    }
    const baseUrl = origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set("id", spreadsheetId);
    if (activeTab && activeTab !== "DASHBOARD") {
      params.set("tab", activeTab);
    }
    return `${baseUrl}?${params.toString()}`;
  }, [spreadsheetId, activeTab]);

  const handleCopyLink = useCallback(() => {
    const link = getShareableLink();
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      })
      .catch((e) => console.warn("Failed sharing link:", e));
  }, [getShareableLink]);

  // Format IDR Helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Helper load standard fallback data for direct playground preview
  const loadSandboxData = useCallback(() => {
    const demoRecords = getFallbackData();
    setRawRecords(demoRecords);
    setRawDashboardRecords(demoRecords);
    try {
      localStorage.setItem("cached_dashboard_records", JSON.stringify(demoRecords));
    } catch (e) {}
    setTargets({
      psm: 1200,
      serba: 1800,
      pwp: 1000,
      seger: 800,
      rtd: 500,
      ceban: 900,
      telur: 1400,
      toys: 600,
      new_member: 400,
      total: 7600,
    });
    setIsSandboxMode(true);
    setError(null);
  }, []);


  // Primary loader to fetch live sheet coordinates
  const fetchLiveSheet = useCallback(
    async (sId: string, token: string | null, rangeTab: string, isSilent = false) => {
      if (!isSilent) {
        setLoading(true);
      }
      setError(null);
      try {
        let parsed: SalesRecord[] = [];
        if (token) {
          const encodedRange = encodeURIComponent(rangeTab);
          const apiPath = `/v4/spreadsheets/${sId}/values/${encodedRange}`;
          const res = await fetch(
            `${API_BASE}/api/proxy/sheets?path=${encodeURIComponent(apiPath)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (!res.ok) {
            if (res.status === 401) {
              throw new Error("Sesi login Google telah usang. Silakan log out dan masuk kembali.");
            }
            if (res.status === 403) {
              throw new Error(
                "Izin ditolak. Dokumen Spreadsheet ini terkunci atau Anda tidak memiliki izin baca."
              );
            }
            if (res.status === 404) {
              throw new Error(
                "Spreadsheet tidak ditemukan. Harap periksa apakah Google Spreadsheet ID Anda sudah benar."
              );
            }
            throw new Error(`Koneksi API Gagal. Status error: ${res.status}`);
          }

          const data = await res.json();
          const rows = data.values || [];

          if (rows.length === 0) {
            throw new Error(
              `Tab sheet '${rangeTab}' kosong atau tidak memiliki data di dalamnya.`
            );
          }
          parsed = parseRawSheetData(rows);
        } else {
          // Public Access fallback via backend proxy to bypass CORS
          const url = `${API_BASE}/api/proxy/csv?spreadsheetId=${sId}&sheet=${encodeURIComponent(rangeTab)}`;
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`Gagal mengunduh data publik. Pastikan spreadsheet di-share 'Anyone with the link can view' (Semua orang dengan link bisa melihat). Status: ${res.status}`);
          }
          const csvText = await res.text();
          const rows = parseCSV(csvText);
          if (rows.length === 0) {
            throw new Error(`Tab sheet '${rangeTab}' kosong atau tidak memiliki data.`);
          }
          parsed = parseRawSheetData(rows);
        }

        if (parsed.length === 0) {
          throw new Error(
            `Kandungan kolom tidak dikenali. Pastikan baris atas berisi baris penanda kolom (misal: Tanggal, Produk, Qty, Total, Salesperson).`
          );
        }

        setRawRecords(parsed);
        if (rangeTab.toUpperCase().includes("DASHBOARD")) {
          setRawDashboardRecords(parsed);
          try {
            localStorage.setItem("cached_dashboard_records", JSON.stringify(parsed));
          } catch (e) {}
        }
        setIsSandboxMode(false);
        try {
          localStorage.setItem("cached_records", JSON.stringify(parsed));
          const nowStr = new Date().toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          localStorage.setItem("last_synced_time", nowStr);
          setLastSyncedTime(nowStr);
        } catch (e) {
          console.warn("Failed storing cached records:", e);
        }
      } catch (err: any) {
        console.warn("Fetch Sheet Error:", err);
        if (!isSilent) {
          let errMsg = err.message || "Gagal menghubungi Google Sheets API.";
          if (typeof errMsg === "string" && (errMsg.includes("Failed to fetch") || errMsg.toLowerCase().includes("failed to fetch") || errMsg.includes("TypeError"))) {
            errMsg = "Koneksi Gagal (Failed to Fetch / CORS). Pastikan dokumen Google Spreadsheet Anda diatur ke publik atau Anda sudah masuk melalui tombol Login Google.";
          }
          setError(errMsg);
          // Revert to demo mode if load fails so dashboard doesn't display broken elements
          if (rawRecords.length === 0) {
            loadSandboxData();
          }
        }
      } finally {
        if (!isSilent) {
          setLoading(false);
        }
      }
    },
    [loadSandboxData, rawRecords.length]
  );

  // Metadata querier to find sheet tabs
  const fetchSpreadsheetMetaAndLoad = useCallback(
    async (sId: string, token: string | null, isSilent = false) => {
      if (!isSilent) {
        setCheckingMeta(true);
      }
      setError(null);
      try {
        let titles: string[] = [];
        if (token) {
          const apiPath = `/v4/spreadsheets/${sId}?fields=sheets.properties.title`;
          const res = await fetch(
            `${API_BASE}/api/proxy/sheets?path=${encodeURIComponent(apiPath)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (!res.ok) {
            if (res.status === 404) {
              throw new Error("Tautan spreadsheet salah atau ID Spreadsheet tidak valid.");
            }
            throw new Error("Gagal mengambil daftar sheet tab dari dokumen ini.");
          }

          const data = await res.json();
          titles = data.sheets?.map((s: any) => s.properties.title) || [];
        } else {
          // Fetch from htmlview via backend proxy to bypass CORS and extract sheet titles
          const res = await fetch(`${API_BASE}/api/proxy/htmlview?spreadsheetId=${sId}`);
          if (!res.ok) {
            throw new Error("Gagal memuat metadata spreadsheet publik. Pastikan akses spreadsheet diatur ke 'Anyone with the link can view' (Siapa saja yang memiliki link dapat melihat).");
          }
          const html = await res.text();
          
          const matchedTitles = new Set<string>();
          
          // 1. Check for tab links in sheet menu
          const tabLinkRegex = /id="sheet-button-[^"]+">\s*<a[^>]*>([^<]+)<\/a>/gi;
          let match;
          while ((match = tabLinkRegex.exec(html)) !== null) {
            if (match[1]) matchedTitles.add(match[1].trim());
          }

          // 2. Modern Google Sheet htmlview pattern: `items.push({name: "01 Oktober 2026", ...})`
          const itemsPushRegex = /items\.push\({\s*name:\s*"([^"]+)"/gi;
          while ((match = itemsPushRegex.exec(html)) !== null) {
            if (match[1]) matchedTitles.add(match[1].trim());
          }

          // 3. Fallbacks: script boots metadata pattern: `{"sheetId":...,"title":"..."}`
          const titleJsonRegex = /"title"\s*:\s*"([^"]+)"/gi;
          while ((match = titleJsonRegex.exec(html)) !== null) {
            const possibleTitle = match[1];
            if (possibleTitle && possibleTitle.length < 50 && !possibleTitle.includes("{") && !possibleTitle.includes("\\")) {
              matchedTitles.add(possibleTitle);
            }
          }

          titles = Array.from(matchedTitles);

          if (titles.length === 0) {
            titles = ["DASHBOARD", "TARGET"];
          }
        }

        setSheetTabs(titles);
        try {
          localStorage.setItem("cached_sheet_tabs", JSON.stringify(titles));
        } catch (e) {}

        // Fetch targets if TARGET sheet exists (prefer TARGETR if exists, then TARGET, then containing TARGET)
        const matchedTarget = titles.find((t) => t.toUpperCase().trim() === "TARGETR") || titles.find(
          (t) => t.toUpperCase().trim() === "TARGET" || t.toUpperCase().includes("TARGET")
        );
        if (matchedTarget) {
          try {
            if (token) {
              const encodedTargetRange = encodeURIComponent(matchedTarget);
              const apiPath = `/v4/spreadsheets/${sId}/values/${encodedTargetRange}`;
              const targetRes = await fetch(
                `${API_BASE}/api/proxy/sheets?path=${encodeURIComponent(apiPath)}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              if (targetRes.ok) {
                const targetData = await targetRes.json();
                const targetRows = targetData.values || [];
                if (targetRows.length > 0) {
                  const parsedTargets = parseTargetSheetData(targetRows);
                  setTargets(parsedTargets);
                  try {
                    localStorage.setItem("cached_targets", JSON.stringify(parsedTargets));
                  } catch (e) {}
                }
              }
            } else {
              // Public Access via backend proxy: fetch target as CSV to bypass CORS
              const targetUrl = `${API_BASE}/api/proxy/csv?spreadsheetId=${sId}&sheet=${encodeURIComponent(matchedTarget)}`;
              const targetRes = await fetch(targetUrl);
              if (targetRes.ok) {
                const csvText = await targetRes.text();
                const targetRows = parseCSV(csvText);
                if (targetRows.length > 0) {
                  const parsedTargets = parseTargetSheetData(targetRows);
                  setTargets(parsedTargets);
                  try {
                    localStorage.setItem("cached_targets", JSON.stringify(parsedTargets));
                  } catch (e) {}
                }
              }
            }
          } catch (targetErr) {
            console.warn("Failed to load targets from sheet:", targetErr);
          }
        }

        let targetTab = activeTab;
        const tabExistsNow = titles.includes(activeTab);

        if (!tabExistsNow || isFirstLoad.current || !activeTab || activeTab === "DASHBOARD") {
          let chosen = "DASHBOARD";
          const matched = titles.find(
            (t) => t.toUpperCase() === "DASHBOARD" || t.toUpperCase().includes("DASHBOARD")
          );
          if (matched) {
            chosen = matched;
          } else if (titles.length > 0) {
            chosen = titles[0];
          }
          targetTab = chosen;
          setActiveTab(chosen);
        }

        // Load target tab values immediately
        await fetchLiveSheet(sId, token, targetTab, isSilent);

        // Fetch dashboard records specifically if activeTab is not the dashboard tab
        const matchedDashboard = titles.find(
          (t) => t.toUpperCase().trim() === "DASHBOARD" || t.toUpperCase().includes("DASHBOARD")
        );
        if (matchedDashboard && targetTab !== matchedDashboard) {
          try {
            let dbParsed: SalesRecord[] = [];
            if (token) {
              const encodedDbRange = encodeURIComponent(matchedDashboard);
              const apiPath = `/v4/spreadsheets/${sId}/values/${encodedDbRange}`;
              const dbRes = await fetch(
                `${API_BASE}/api/proxy/sheets?path=${encodeURIComponent(apiPath)}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              if (dbRes.ok) {
                const dbData = await dbRes.json();
                const dbRows = dbData.values || [];
                if (dbRows.length > 0) {
                  dbParsed = parseRawSheetData(dbRows);
                }
              }
            } else {
              const dbUrl = `${API_BASE}/api/proxy/csv?spreadsheetId=${sId}&sheet=${encodeURIComponent(matchedDashboard)}`;
              const dbRes = await fetch(dbUrl);
              if (dbRes.ok) {
                const csvText = await dbRes.text();
                const dbRows = parseCSV(csvText);
                if (dbRows.length > 0) {
                  dbParsed = parseRawSheetData(dbRows);
                }
              }
            }
            if (dbParsed.length > 0) {
              setRawDashboardRecords(dbParsed);
              try {
                localStorage.setItem("cached_dashboard_records", JSON.stringify(dbParsed));
              } catch (e) {}
            }
          } catch (dbErr) {
            console.warn("Failed to load dashboard records in background:", dbErr);
          }
        }
      } catch (err: any) {
        console.warn("Meta Fetch Error:", err);
        if (!isSilent) {
          let errMsg = err.message || "Spreadsheet tidak valid.";
          if (typeof errMsg === "string" && (errMsg.includes("Failed to fetch") || errMsg.toLowerCase().includes("failed to fetch") || errMsg.includes("TypeError"))) {
            errMsg = "Koneksi Gagal (Failed to Fetch / CORS). Pastikan dokumen Google Spreadsheet Anda diatur ke publik atau Anda sudah masuk melalui tombol Login Google.";
          }
          setError(errMsg);
          const hasCached = localStorage.getItem("cached_records");
          if (!hasCached) {
            loadSandboxData();
          }
        }
      } finally {
        if (!isSilent) {
          setCheckingMeta(false);
        }
      }
    },
    [fetchLiveSheet, loadSandboxData, activeTab]
  );

  // Set up Firebase Auth state observer and load server cache on launch
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("sheetId") || params.get("id");
    const sId = urlId || localStorage.getItem("sheetId") || "";

    const init = async () => {
      let isLoadedFromCache = false;
      if (sId && sId.trim().length >= 20) {
        isLoadedFromCache = await loadServerCachedDashboard(sId);
        if (isLoadedFromCache) {
          setIsCacheLoaded(true);
        }
      }
      if (!isLoadedFromCache) {
        const hasCached = localStorage.getItem("cached_records");
        if (!hasCached) {
          loadSandboxData(); // Prepare playground immediately on page enter only if no cached records exist
        }
      }
      setIsInitialized(true);
    };

    init();

    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );

    return () => unsubscribe();
  }, [loadServerCachedDashboard, loadSandboxData]);

  // Synchronize dashboard state to server-side cache for sharing whenever live data changes!
  useEffect(() => {
    if (isSandboxMode || !spreadsheetId || spreadsheetId.length < 20 || rawRecords.length === 0) return;
    
    const timeout = setTimeout(() => {
      fetch(`${API_BASE}/api/save-dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId,
          sheetTabs,
          activeTab,
          records: rawRecords,
          targets,
          lastSyncedTime,
        }),
      }).catch((e) => console.warn("Failed automatic server cache post:", e));
    }, 1000); // Debounce by 1 second to prevent overlapping API calls

    return () => clearTimeout(timeout);
  }, [rawRecords, targets, spreadsheetId, sheetTabs, activeTab, lastSyncedTime, isSandboxMode]);

  // Auto-sync spreadsheet data whenever spreadsheetId or accessToken changes (making it completely auto!)
  useEffect(() => {
    if (!isInitialized) return;
    if (!spreadsheetId || spreadsheetId.trim().length < 20) return;
    
    const spreadsheetChanged = spreadsheetId !== lastSpreadsheetIdRef.current;
    lastSpreadsheetIdRef.current = spreadsheetId;

    const triggerSync = () => {
      // If we are viewing as a public guest (no accessToken) and have already successfully loaded the server-side persistent cache,
      // skip live Google API / scraper proxy calls entirely. This avoids 403 rate limits & CORS blocking on Guest access!
      if (!accessToken && isCacheLoaded) {
        console.log("Cached dashboard loaded successfully for guest. Bypassing live Google Sheet fetch to avoid 403.");
        return;
      }
      console.log("Auto-connecting and syncing spreadsheet data...");
      fetchSpreadsheetMetaAndLoad(spreadsheetId, accessToken);
    };

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      triggerSync();
    } else if (!spreadsheetChanged) {
      // If only authentication or active session changed, update instantly
      triggerSync();
    } else {
      // Debounce when editing/typing the ID to prevent key-by-key API calls
      const delayDebounceFn = setTimeout(() => {
        triggerSync();
      }, 750);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [isInitialized, isCacheLoaded, spreadsheetId, accessToken, fetchSpreadsheetMetaAndLoad]);

  // Auto-refresh interval (5 seconds) - Silently updates both data entries and tab structures automatically!
  useEffect(() => {
    if (!autoRefresh) return;
    if (!spreadsheetId || spreadsheetId.trim().length < 20) return;
    
    const interval = setInterval(() => {
      if (!accessToken && isCacheLoaded) {
        console.log("Auto-refreshing guest view from server-side persistent cache...");
        loadServerCachedDashboard(spreadsheetId);
      } else {
        console.log("Auto-refreshing dashboard layout and values...");
        fetchSpreadsheetMetaAndLoad(spreadsheetId, accessToken, true);
      }
    }, 5 * 1000); // 5 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, isCacheLoaded, spreadsheetId, accessToken, fetchSpreadsheetMetaAndLoad, loadServerCachedDashboard]);

  // User trigger google login
  const handleConnectGoogle = async () => {
    if (isAuthenticating) return;
    try {
      setIsAuthenticating(true);
      setError(null);
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        await fetchSpreadsheetMetaAndLoad(spreadsheetId, result.accessToken);
      }
    } catch (err: any) {
      console.warn("Auth Exception:", err);
      const errMsg = (err.message || "").toLowerCase();
      const errCode = (err.code || "").toLowerCase();
      
      if (
        errMsg.includes("cancelled-popup-request") || 
        errMsg.includes("popup-closed-by-user") ||
        errMsg.includes("popup-blocked") ||
        errCode.includes("cancelled-popup-request") ||
        errCode.includes("popup-closed-by-user") ||
        errCode.includes("popup-blocked")
      ) {
        setError(
          "Koneksi login dibatalkan atau diblokir oleh browser. Karena batasan privasi iframe/cookies di lingkungan AI Studio, POPUP dari Google Auth seringkali dicegah oleh browser Anda. Klik tombol 'Buka Aplikasi di Tab Baru' di bawah untuk membuka aplikasi ini di luar iframe AI Studio, kemudian hubungkan kembali akun Google Anda dengan mulus!"
        );
      } else {
        setError("Autentikasi gagal atau dibatalkan oleh pengguna: " + (err.message || err));
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setSheetTabs([]);
    // Fall back to loading public spreadsheet rather than blank sandbox
    fetchSpreadsheetMetaAndLoad(spreadsheetId, null);
  };

  const handleRefresh = () => {
    fetchLiveSheet(spreadsheetId, accessToken, activeTab);
  };

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    fetchLiveSheet(spreadsheetId, accessToken, tabName);
  };

  // Derived dashboard analytics memoised selectors
  const kpis = useMemo(() => calculateKPIs(records), [records]);
  const categoryChartData = useMemo(() => getCategoryBreakdown(records), [records]);
  const monthlyChartData = useMemo(() => getMonthlyTrend(records), [records]);
  const productRatingData = useMemo(() => getProductPerformance(records), [records]);
  const salespersonRatingData = useMemo(() => getSalespersonPerformance(records), [records]);
  const regionalData = useMemo(() => getRegionBreakdown(records), [records]);

  // Derived dominant Indonesian month name for dynamic header display
  const activeMonthName = useMemo(() => {
    if (!records || records.length === 0) {
      return "JUNI 2026";
    }

    const countMap: Record<string, number> = {};
    records.forEach((r) => {
      if (!r.date || r.date === "Tanpa Tanggal" || r.date.toLowerCase().includes("tanggal")) return;
      
      let mKey = "";
      if (r.date.includes("/") || r.date.includes("-")) {
        const separator = r.date.includes("/") ? "/" : "-";
        const parts = r.date.split(separator);
        if (parts.length >= 2) {
          if (parts[0].length === 4) {
            mKey = parts[1];
          } else {
            mKey = parts[1];
          }
        }
      }

      if (!mKey || isNaN(Number(mKey))) {
        const lowerDate = r.date.toLowerCase();
        const subMap: Record<string, string> = {
          janua: "01", jan: "01", peb: "02", feb: "02", mar: "03", apr: "04",
          mei: "05", may: "05", jun: "06", jul: "07", agust: "08", agu: "08", aug: "08",
          sept: "09", sep: "09", okt: "10", oct: "10", nov: "11", des: "12", dec: "12"
        };
        for (const [sub, code] of Object.entries(subMap)) {
          if (lowerDate.includes(sub)) {
            mKey = code;
            break;
          }
        }
      }

      if (mKey) {
        const num = parseInt(mKey, 10);
        if (num >= 1 && num <= 12) {
          const padded = num.toString().padStart(2, "0");
          countMap[padded] = (countMap[padded] || 0) + 1;
        }
      }
    });

    let maxMonthCode = "06"; // Default June
    let maxCount = 0;
    Object.entries(countMap).forEach(([code, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxMonthCode = code;
      }
    });

    let year = "2026";
    for (const r of records) {
      if (r.date) {
        const match = r.date.match(/\b(20\d{2})\b/);
        if (match) {
          year = match[1];
          break;
        }
      }
    }

    const MONTHS_INDO = [
      "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
      "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
    ];
    const monthIndex = parseInt(maxMonthCode, 10) - 1;
    const finalMonth = MONTHS_INDO[monthIndex] || "JUNI";
    return `${finalMonth} ${year}`;
  }, [records]);

  // Derived actual metrics comparing categories with targets
  const actuals = useMemo(() => calculateActualMetrics(records), [records]);

  // Information about elapsed period for scaling targets based on current records (tanggal yang sudah berjalan)
  const elapsedPeriodInfo = useMemo(() => {
    let maxDay = 0;
    let recordMonth = 6; // default June
    let recordYear = 2026; // default 2026

    if (selectedFilterMonth !== "ALL") {
      recordMonth = parseInt(selectedFilterMonth, 10);
    }
    if (selectedFilterYear !== "ALL") {
      recordYear = parseInt(selectedFilterYear, 10);
    }

    records.forEach((r) => {
      if (r.date) {
        const norm = normalizeDateStr(r.date);
        const parts = norm.split("/");
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const y = parseInt(parts[2], 10);
          if (d > maxDay) {
            maxDay = d;
          }
          if (selectedFilterMonth === "ALL") {
            recordMonth = m;
          }
          if (selectedFilterYear === "ALL") {
            recordYear = y;
          }
        }
      }
    });

    const totalDays = new Date(recordYear, recordMonth, 0).getDate() || 30;
    const elapsedDays = uniqueDates.length > 0 ? uniqueDates.length : 13;

    return {
      elapsedDays,
      totalDays,
      ratio: elapsedDays / totalDays,
    };
  }, [records, uniqueDates, selectedFilterMonth, selectedFilterYear]);

  // Adjusted target calculations based on elapsed dates ("tanggal yang sudah berjalan")
  const adjustedPsmTarget = useMemo(() => {
    let sum = 0;
    const dateTargets = targets.targetsByDate;
    const activeDates = uniqueDates;
    const hasDateTargets = dateTargets && Object.keys(dateTargets).length > 0;

    if (hasDateTargets) {
      activeDates.forEach((d) => {
        const normDate = normalizeDateStr(d);
        const dayTargetObj = dateTargets[normDate];
        if (dayTargetObj && typeof dayTargetObj.psm === "number") {
          sum += dayTargetObj.psm;
        } else {
          const monthlyTarget = targets.psm || 0;
          const totalDays = elapsedPeriodInfo.totalDays;
          sum += monthlyTarget / totalDays;
        }
      });
    } else {
      const monthlyTarget = targets.psm || 0;
      sum = monthlyTarget * elapsedPeriodInfo.ratio;
    }
    return sum > 0 ? sum : (targets.psm || 0) * elapsedPeriodInfo.ratio;
  }, [targets, uniqueDates, elapsedPeriodInfo]);

  const adjustedSerbaTarget = useMemo(() => {
    let sum = 0;
    const dateTargets = targets.targetsByDate;
    const activeDates = uniqueDates;
    const hasDateTargets = dateTargets && Object.keys(dateTargets).length > 0;

    if (hasDateTargets) {
      activeDates.forEach((d) => {
        const normDate = normalizeDateStr(d);
        const dayTargetObj = dateTargets[normDate];
        if (dayTargetObj && typeof dayTargetObj.serba === "number") {
          sum += dayTargetObj.serba;
        } else {
          const monthlyTarget = targets.serba || 0;
          const totalDays = elapsedPeriodInfo.totalDays;
          sum += monthlyTarget / totalDays;
        }
      });
    } else {
      const monthlyTarget = targets.serba || 0;
      sum = monthlyTarget * elapsedPeriodInfo.ratio;
    }
    return sum > 0 ? sum : (targets.serba || 0) * elapsedPeriodInfo.ratio;
  }, [targets, uniqueDates, elapsedPeriodInfo]);

  const adjustedPwpTarget = useMemo(() => {
    let sum = 0;
    const dateTargets = targets.targetsByDate;
    const activeDates = uniqueDates;
    const hasDateTargets = dateTargets && Object.keys(dateTargets).length > 0;

    if (hasDateTargets) {
      activeDates.forEach((d) => {
        const normDate = normalizeDateStr(d);
        const dayTargetObj = dateTargets[normDate];
        if (dayTargetObj && typeof dayTargetObj.pwp === "number") {
          sum += dayTargetObj.pwp;
        } else {
          const monthlyTarget = targets.pwp || 0;
          const totalDays = elapsedPeriodInfo.totalDays;
          sum += monthlyTarget / totalDays;
        }
      });
    } else {
      const monthlyTarget = targets.pwp || 0;
      sum = monthlyTarget * elapsedPeriodInfo.ratio;
    }
    return sum > 0 ? sum : (targets.pwp || 0) * elapsedPeriodInfo.ratio;
  }, [targets, uniqueDates, elapsedPeriodInfo]);

  const adjustedSegerTarget = useMemo(() => {
    let sum = 0;
    const dateTargets = targets.targetsByDate;
    const activeDates = uniqueDates;
    const hasDateTargets = dateTargets && Object.keys(dateTargets).length > 0;

    if (hasDateTargets) {
      activeDates.forEach((d) => {
        const normDate = normalizeDateStr(d);
        const dayTargetObj = dateTargets[normDate];
        if (dayTargetObj && typeof dayTargetObj.seger === "number") {
          sum += dayTargetObj.seger;
        } else {
          const monthlyTarget = targets.seger || 0;
          const totalDays = elapsedPeriodInfo.totalDays;
          sum += monthlyTarget / totalDays;
        }
      });
    } else {
      const monthlyTarget = targets.seger || 0;
      sum = monthlyTarget * elapsedPeriodInfo.ratio;
    }
    return sum > 0 ? sum : (targets.seger || 0) * elapsedPeriodInfo.ratio;
  }, [targets, uniqueDates, elapsedPeriodInfo]);

  // Derived target percentage achievements based on scaled/adjusted targets
  const psmPercentage = useMemo(() => {
    const targetVal = adjustedPsmTarget;
    return targetVal > 0 ? ((actuals?.psmActual ?? 0) / targetVal) * 100 : 0;
  }, [actuals?.psmActual, adjustedPsmTarget]);

  const serbaPercentage = useMemo(() => {
    const targetVal = adjustedSerbaTarget;
    return targetVal > 0 ? ((actuals?.serbaActual ?? 0) / targetVal) * 100 : 0;
  }, [actuals?.serbaActual, adjustedSerbaTarget]);

  const pwpPercentage = useMemo(() => {
    const targetVal = adjustedPwpTarget;
    return targetVal > 0 ? ((actuals?.pwpActual ?? 0) / targetVal) * 100 : 0;
  }, [actuals?.pwpActual, adjustedPwpTarget]);

  const segerPercentage = useMemo(() => {
    const targetVal = adjustedSegerTarget;
    return targetVal > 0 ? ((actuals?.segerActual ?? 0) / targetVal) * 100 : 0;
  }, [actuals?.segerActual, adjustedSegerTarget]);

  const totalPercentage = useMemo(() => {
    const targetVal = targets?.total ?? 0;
    return targetVal > 0 ? ((actuals?.totalActual ?? 0) / targetVal) * 100 : 0;
  }, [actuals?.totalActual, targets?.total]);

  const cebanPercentage = useMemo(() => {
    const targetVal = targets?.ceban ?? 0;
    return targetVal > 0 ? ((actuals?.cebanActual ?? 0) / targetVal) * 100 : 0;
  }, [actuals?.cebanActual, targets?.ceban]);

  const telurPercentage = useMemo(() => {
    const targetVal = targets?.telur ?? 0;
    return targetVal > 0 ? ((actuals?.telurActual ?? 0) / targetVal) * 100 : 0;
  }, [actuals?.telurActual, targets?.telur]);

  const toysPercentage = useMemo(() => {
    const targetVal = targets?.toys ?? 0;
    return targetVal > 0 ? ((actuals?.toysActual ?? 0) / targetVal) * 100 : 0;
  }, [actuals?.toysActual, targets?.toys]);

  const newMemberPercentage = useMemo(() => {
    const targetVal = targets?.new_member ?? 0;
    return targetVal > 0 ? ((actuals?.newMemberActual ?? 0) / targetVal) * 100 : 0;
  }, [actuals?.newMemberActual, targets?.new_member]);

  const [selectedRtdStore, setSelectedRtdStore] = useState<string>("ALL");

  // Helper functions for RTD trend date checks
  const isMonWedFri = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const norm = normalizeDateStr(dateStr); // returns "DD/MM/YYYY" or original
    const parts = norm.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed month
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday, etc.
      return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
    }
    // Fallback for cases like iso, standard string, or text
    const fallbackDate = new Date(dateStr);
    if (isNaN(fallbackDate.getTime())) {
      const lower = dateStr.toLowerCase();
      return lower.includes("mon") || lower.includes("wed") || lower.includes("fri") ||
             lower.includes("senin") || lower.includes("rabu") || lower.includes("jumat") || lower.includes("jum'at");
    }
    const dayOfWeek = fallbackDate.getDay();
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
  };

  const adjustedRtdTarget = useMemo(() => {
    const ELIGIBLE_RTD_STORES = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];
    let sum = 0;
    const storeAndDateTargets = targets.targetsByStoreAndDate;
    const activeDates = uniqueDates;
    
    if (storeAndDateTargets) {
      ELIGIBLE_RTD_STORES.forEach((storeCode) => {
        const normStore = normalizeStoreCode(storeCode);
        const storeMapTarget = storeAndDateTargets[normStore];
        if (storeMapTarget) {
          activeDates.forEach((d) => {
            if (isMonWedFri(d)) {
              const normDate = normalizeDateStr(d);
              const dayTargetObj = storeMapTarget[normDate];
              if (dayTargetObj && typeof dayTargetObj.rtd === "number") {
                sum += dayTargetObj.rtd;
              }
            }
          });
        } else {
          // Fallback if this store doesn't have custom targets in targetsByStoreAndDate
          const baseIndicatorTarget = targets.rtd || 0;
          const allStores = Array.from(new Set(records.map(r => r.salesperson).filter((s): s is string => Boolean(s)))) as string[];
          const totalBaseStore = allStores.length > 0 ? (baseIndicatorTarget / allStores.length) : (baseIndicatorTarget / 6);
          const totalDays = elapsedPeriodInfo.totalDays;
          const dailyTarget = totalBaseStore / totalDays;
          const mwfCount = uniqueDates.filter(d => isMonWedFri(d)).length;
          sum += dailyTarget * mwfCount;
        }
      });
    } else {
      // Fallback if no targetsByStoreAndDate exists at all
      const baseIndicatorTarget = targets.rtd || 0;
      const allStores = Array.from(new Set(records.map(r => r.salesperson).filter((s): s is string => Boolean(s)).filter(isStoreActive))) as string[];
      const eligibleCount = allStores.filter(st => ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(st))).length || 6;
      const totalStores = Math.max(allStores.length, 1);
      const totalBaseStoresTarget = baseIndicatorTarget * (eligibleCount / totalStores);
      const totalDays = elapsedPeriodInfo.totalDays;
      const mwfCount = uniqueDates.filter(d => isMonWedFri(d)).length;
      sum = (totalBaseStoresTarget / totalDays) * mwfCount;
    }
    return sum > 0 ? sum : (targets.rtd || 0) * elapsedPeriodInfo.ratio;
  }, [targets, uniqueDates, records, elapsedPeriodInfo]);

  const rtdPercentage = useMemo(() => {
    const targetVal = adjustedRtdTarget;
    return targetVal > 0 ? ((actuals?.rtdActual ?? 0) / targetVal) * 100 : 0;
  }, [actuals?.rtdActual, adjustedRtdTarget]);

  const adjustedRtdBasicTarget = useMemo(() => {
    const ELIGIBLE_RTD_STORES = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];
    let sum = 0;
    const storeAndDateTargets = targets.targetsByStoreAndDate;
    const activeDates = uniqueDates;
    const allStores = Array.from(new Set(records.map(r => r.salesperson).filter((s): s is string => Boolean(s)).filter(isStoreActive))) as string[];
    const nonEligibleStores = allStores.filter(st => !ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(st)));
    
    if (storeAndDateTargets) {
      nonEligibleStores.forEach((storeCode) => {
        const normStore = normalizeStoreCode(storeCode);
        const storeMapTarget = storeAndDateTargets[normStore];
        if (storeMapTarget) {
          activeDates.forEach((d) => {
            const normDate = normalizeDateStr(d);
            const dayTargetObj = storeMapTarget[normDate];
            if (dayTargetObj && typeof dayTargetObj.rtd === "number") {
              sum += dayTargetObj.rtd;
            }
          });
        } else {
          // Fallback if store doesn't have custom targets in targetsByStoreAndDate
          const baseIndicatorTarget = targets.rtd || 0;
          const totalBaseStore = allStores.length > 0 ? (baseIndicatorTarget / allStores.length) : 0;
          const totalDays = elapsedPeriodInfo.totalDays;
          const dailyTarget = totalBaseStore / totalDays;
          sum += dailyTarget * uniqueDates.length;
        }
      });
    } else {
      // Fallback if no targetsByStoreAndDate exists at all
      const baseIndicatorTarget = targets.rtd || 0;
      const eligibleCount = allStores.filter(st => ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(st))).length || 6;
      const totalStores = Math.max(allStores.length, 1);
      const nonEligibleCount = Math.max(totalStores - eligibleCount, 0);
      const baseStoresTarget = baseIndicatorTarget * (nonEligibleCount / totalStores);
      sum = baseStoresTarget * elapsedPeriodInfo.ratio;
    }
    return sum > 0 ? sum : 0;
  }, [targets, uniqueDates, records, elapsedPeriodInfo]);

  const rtdBasicPercentage = useMemo(() => {
    const targetVal = adjustedRtdBasicTarget;
    return targetVal > 0 ? ((actuals?.rtdBasicActual ?? 0) / targetVal) * 100 : 0;
  }, [actuals?.rtdBasicActual, adjustedRtdBasicTarget]);

  const getDayPartOnly = (rawDate: string): string => {
    if (!rawDate) return "";
    let display = rawDate;
    const dmyMatch = rawDate.match(/^(\d{1,2})[-/](\d{1,2})[-/]/);
    if (dmyMatch) {
      display = dmyMatch[1].padStart(2, "0");
    } else {
      const ymdMatch = rawDate.match(/^\d{4}[-/](\d{1,2})[-/](\d{1,2})/);
      if (ymdMatch) {
        display = ymdMatch[2].padStart(2, "0");
      } else {
        const firstNumMatch = rawDate.match(/\b(\d{1,2})\b/);
        if (firstNumMatch) {
          display = firstNumMatch[1].padStart(2, "0");
        }
      }
    }
    return display;
  };

  // Special trend data for RTD COFFEDAY (only for eligible stores)
  const rtdTrendData = useMemo(() => {
    const ELIGIBLE_RTD_STORES = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];

    // 1. Filter original dates that match Mon, Wed, Fri
    const mwfExistingDates = uniqueDates.filter(dateStr => isMonWedFri(dateStr));

    // 2. Sort chronologically
    mwfExistingDates.sort((a, b) => {
      const parseDate = (s: string) => {
        const norm = normalizeDateStr(s);
        const parts = norm.split("/");
        if (parts.length === 3) {
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
        }
        return Date.parse(s) || 0;
      };
      return parseDate(a) - parseDate(b);
    });

    const dateMap: Record<string, { dateStr: string; qty: number; target: number; displayDate: string }> = {};

    mwfExistingDates.forEach((date) => {
      const normDate = normalizeDateStr(date);
      let dateTarget = 0;

      if (selectedRtdStore === "ALL") {
        ELIGIBLE_RTD_STORES.forEach((store) => {
          const storeMap = targets.targetsByStoreAndDate?.[store];
          const val = storeMap?.[normDate]?.rtd;
          if (typeof val === "number") {
            dateTarget += val;
          }
        });
      } else {
        const storeMap = targets.targetsByStoreAndDate?.[selectedRtdStore];
        const val = storeMap?.[normDate]?.rtd;
        if (typeof val === "number") {
          dateTarget = val;
        }
      }

      if (dateTarget === 0) {
        const totalDates = Math.max(uniqueDates.length, 1);
        const baseRTDTarget = targets.rtd || 0;
        if (selectedRtdStore === "ALL") {
          dateTarget = (baseRTDTarget / totalDates);
        } else {
          dateTarget = (baseRTDTarget / totalDates) / 6;
        }
      }

      dateMap[date] = {
        dateStr: date,
        qty: 0,
        target: dateTarget,
        displayDate: getDayPartOnly(date),
      };
    });

    records.forEach((r) => {
      const catInfo = getCategoryDisplayNameAndUnit(r.category, r.salesperson);
      const storeCode = normalizeStoreCode(r.salesperson || "");
      if (catInfo.name === "RTD COFFEDAY") {
        const matchesStore = selectedRtdStore === "ALL"
          ? ELIGIBLE_RTD_STORES.includes(storeCode)
          : storeCode === selectedRtdStore;

        if (matchesStore) {
          const d = r.date;
          if (d && dateMap[d]) {
            dateMap[d].qty += r.quantity || 0;
          }
        }
      }
    });

    return Object.values(dateMap);
  }, [records, uniqueDates, targets, selectedRtdStore]);

  const [hoveredRtdIdx, setHoveredRtdIdx] = useState<number | null>(null);

  const [selectedRankIndicator, setSelectedRankIndicator] = useState<string>("PSM");
  const [selectedRankDate, setSelectedRankDate] = useState<string>("ALL");

  const [selectedMarketingRankIndicator, setSelectedMarketingRankIndicator] = useState<string>("CEBAN");
  const [selectedMarketingRankDate, setSelectedMarketingRankDate] = useState<string>("ALL");

  const getRankDataHelper = useCallback((indicator: string, dateFilter: string) => {
    const storeQtyMap: Record<string, number> = {};
    const allStores = Array.from(new Set(records.map(r => r.salesperson).filter((s): s is string => Boolean(s)))) as string[];
    
    allStores.forEach(st => {
      storeQtyMap[st] = 0;
    });

    records.forEach(r => {
      if (!r.salesperson) return;
      if (dateFilter !== "ALL" && r.date !== dateFilter) return;
      const catInfo = getCategoryDisplayNameAndUnit(r.category, r.salesperson);
      
      let match = false;
      if (indicator === "PSM" && catInfo.name === "PSM") match = true;
      if (indicator === "SERBA" && catInfo.name === "SERBA") match = true;
      if (indicator === "PWP" && catInfo.name === "PWP") match = true;
      if (indicator === "SEGER" && catInfo.name === "SEGER") match = true;
      if (indicator === "RTD COFFEDAY" && catInfo.name === "RTD COFFEDAY") {
        if (r.date && isMonWedFri(r.date)) {
          match = true;
        }
      }
      if (indicator === "RTD BASIC" && catInfo.name === "RTD BASIC") match = true;
      if (indicator === "CEBAN" && catInfo.name === "CEBAN") match = true;
      if (indicator === "TELUR" && catInfo.name === "TELUR") match = true;
      if (indicator === "TOYS" && catInfo.name === "TOYS") match = true;
      if (indicator === "NEW MEMBER" && catInfo.name === "NEW MEMBER") match = true;

      if (match) {
        storeQtyMap[r.salesperson] = (storeQtyMap[r.salesperson] || 0) + (r.quantity || 0);
      }
    });

    const getStoreTarget = (storeCode: string): number => {
      const normStore = normalizeStoreCode(storeCode);
      const storeMap = targets.targetsByStoreAndDate?.[normStore];
      if (!storeMap) {
        let baseIndicatorTarget = 0;
        if (indicator === "PSM") baseIndicatorTarget = targets.psm || 0;
        else if (indicator === "SERBA") baseIndicatorTarget = targets.serba || 0;
        else if (indicator === "PWP") baseIndicatorTarget = targets.pwp || 0;
        else if (indicator === "SEGER") baseIndicatorTarget = targets.seger || 0;
        else if (indicator === "RTD COFFEDAY" || indicator === "RTD BASIC") baseIndicatorTarget = targets.rtd || 0;
        else if (indicator === "CEBAN") baseIndicatorTarget = targets.ceban || 0;
        else if (indicator === "TELUR") baseIndicatorTarget = targets.telur || 0;
        else if (indicator === "TOYS") baseIndicatorTarget = targets.toys || 0;
        else if (indicator === "NEW MEMBER") baseIndicatorTarget = targets.new_member || 0;
        else if (indicator === "BOOTLE" || indicator === "BOTTLE") baseIndicatorTarget = targets.bootle || 0;

        const baseStore = allStores.length > 0 ? (baseIndicatorTarget / allStores.length) : baseIndicatorTarget;
        if (dateFilter !== "ALL") {
          return uniqueDates.length > 0 ? (baseStore / uniqueDates.length) : baseStore;
        }
        return baseStore;
      }
      
      let sum = 0;
      const activeDatesToUse = dateFilter === "ALL" ? uniqueDates : [dateFilter];
      activeDatesToUse.forEach(date => {
        const normDate = normalizeDateStr(date);
        const dateTargets = storeMap[normDate];
        if (dateTargets) {
          if (indicator === "PSM") sum += dateTargets.psm || 0;
          else if (indicator === "SERBA") sum += dateTargets.serba || 0;
          else if (indicator === "PWP") sum += dateTargets.pwp || 0;
          else if (indicator === "SEGER") sum += dateTargets.seger || 0;
          else if (indicator === "RTD COFFEDAY" || indicator === "RTD BASIC") sum += dateTargets.rtd || 0;
          else if (indicator === "CEBAN") sum += dateTargets.ceban || 0;
          else if (indicator === "TELUR") sum += dateTargets.telur || 0;
          else if (indicator === "TOYS") sum += dateTargets.toys || 0;
          else if (indicator === "NEW MEMBER") sum += dateTargets.new_member || 0;
          else if (indicator === "BOOTLE" || indicator === "BOTTLE") sum += dateTargets.bootle || 0;
        }
      });

      if (sum === 0) {
        let baseIndicatorTarget = 0;
        if (indicator === "PSM") baseIndicatorTarget = targets.psm || 0;
        else if (indicator === "SERBA") baseIndicatorTarget = targets.serba || 0;
        else if (indicator === "PWP") baseIndicatorTarget = targets.pwp || 0;
        else if (indicator === "SEGER") baseIndicatorTarget = targets.seger || 0;
        else if (indicator === "RTD COFFEDAY" || indicator === "RTD BASIC") baseIndicatorTarget = targets.rtd || 0;
        else if (indicator === "CEBAN") baseIndicatorTarget = targets.ceban || 0;
        else if (indicator === "TELUR") baseIndicatorTarget = targets.telur || 0;
        else if (indicator === "TOYS") baseIndicatorTarget = targets.toys || 0;
        else if (indicator === "NEW MEMBER") baseIndicatorTarget = targets.new_member || 0;
        else if (indicator === "BOOTLE" || indicator === "BOTTLE") baseIndicatorTarget = targets.bootle || 0;
        const totalBaseStore = allStores.length > 0 ? (baseIndicatorTarget / allStores.length) : baseIndicatorTarget;
        
        if (dateFilter !== "ALL") {
          return uniqueDates.length > 0 ? (totalBaseStore / uniqueDates.length) : totalBaseStore;
        }
        return totalBaseStore;
      }

      return sum;
    };

    const listWithAcv = Object.entries(storeQtyMap).map(([store, qty]) => {
      const unit = getCategoryDisplayNameAndUnit(indicator).unit;
      const targetVal = getStoreTarget(store);
      const acv = targetVal > 0 ? (qty / targetVal) * 100 : 0;
      return { store, qty, target: targetVal, unit, acv };
    });

    let finalRankList = listWithAcv.filter((item) => isStoreActive(item.store));
    const eligibleStores = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];
    if (indicator === "RTD COFFEDAY") {
      finalRankList = finalRankList.filter((item) => eligibleStores.includes(normalizeStoreCode(item.store)));
    } else if (indicator === "RTD BASIC") {
      finalRankList = finalRankList.filter((item) => {
        const norm = normalizeStoreCode(item.store);
        return !eligibleStores.includes(norm) && norm !== "K288" && norm !== "KF47";
      });
    }

    const limit = indicator === "RTD COFFEDAY" ? 3 : 9;

    const sortedDesc = [...finalRankList].sort((a, b) => {
      if (b.acv !== a.acv) return b.acv - a.acv;
      if (b.qty !== a.qty) return b.qty - a.qty;
      return a.store.localeCompare(b.store);
    });
    const top5 = sortedDesc.slice(0, limit);

    const sortedAsc = [...finalRankList].sort((a, b) => {
      if (a.acv !== b.acv) return a.acv - b.acv;
      if (a.qty !== b.qty) return a.qty - b.qty;
      return a.store.localeCompare(b.store);
    });
    const flop5 = sortedAsc.slice(0, limit);

    return { top5, flop5, maxQty: sortedDesc[0]?.qty || 1 };
  }, [records, targets, uniqueDates]);

  const rankData = useMemo(() => {
    return getRankDataHelper(selectedRankIndicator, selectedRankDate);
  }, [getRankDataHelper, selectedRankIndicator, selectedRankDate]);

  const marketingRankData = useMemo(() => {
    return getRankDataHelper(selectedMarketingRankIndicator, selectedMarketingRankDate);
  }, [getRankDataHelper, selectedMarketingRankIndicator, selectedMarketingRankDate]);

  const marketingStoresBreakdown = useMemo(() => {
    const storeMap: Record<string, {
      store: string;
      ceban: { actual: number; target: number; pct: number };
      telur: { actual: number; target: number; pct: number };
      toys: { actual: number; target: number; pct: number };
      member: { actual: number; target: number; pct: number };
    }> = {};

    uniqueSalespersons.forEach((store) => {
      storeMap[store] = {
        store,
        ceban: { actual: 0, target: 0, pct: 0 },
        telur: { actual: 0, target: 0, pct: 0 },
        toys: { actual: 0, target: 0, pct: 0 },
        member: { actual: 0, target: 0, pct: 0 },
      };
    });

    records.forEach((r) => {
      if (!r.salesperson) return;
      if (selectedMarketingDate !== "ALL" && normalizeDateStr(r.date) !== normalizeDateStr(selectedMarketingDate)) return;

      const categoryLower = (r.category || "").toLowerCase();
      const productLower = (r.product || "").toLowerCase();
      const storeKey = r.salesperson;

      if (!storeMap[storeKey]) {
        storeMap[storeKey] = {
          store: storeKey,
          ceban: { actual: 0, target: 0, pct: 0 },
          telur: { actual: 0, target: 0, pct: 0 },
          toys: { actual: 0, target: 0, pct: 0 },
          member: { actual: 0, target: 0, pct: 0 },
        };
      }

      const qty = r.quantity || 0;

      if (categoryLower.includes("ceban") || productLower.includes("ceban") || categoryLower.includes("cemilan") || productLower.includes("cemilan")) {
        storeMap[storeKey].ceban.actual += qty;
      } else if (categoryLower.includes("telur") || productLower.includes("telur")) {
        storeMap[storeKey].telur.actual += qty;
      } else if (categoryLower.includes("toys") || productLower.includes("toys") || categoryLower.includes("mainan") || productLower.includes("mainan")) {
        storeMap[storeKey].toys.actual += qty;
      } else if (categoryLower.includes("member") || productLower.includes("member") || categoryLower === "mbr") {
        storeMap[storeKey].member.actual += qty;
      }
    });

    // Helper to calculate target
    const getStoreTarget = (indicator: string, storeCode: string): number => {
      const normStore = normalizeStoreCode(storeCode);
      const storeMapTarget = targets.targetsByStoreAndDate?.[normStore];
      
      const activeDates = selectedMarketingDate === "ALL" ? uniqueDates : [selectedMarketingDate];
      const allStores = Array.from(new Set(records.map(r => r.salesperson).filter((s): s is string => Boolean(s)).filter(isStoreActive))) as string[];
      
      if (!storeMapTarget) {
        let baseIndicatorTarget = 0;
        if (indicator === "CEBAN") baseIndicatorTarget = targets.ceban || 0;
        else if (indicator === "TELUR") baseIndicatorTarget = targets.telur || 0;
        else if (indicator === "TOYS") baseIndicatorTarget = targets.toys || 0;
        else if (indicator === "NEW MEMBER") baseIndicatorTarget = targets.new_member || 0;

        const totalBaseStore = allStores.length > 0 ? (baseIndicatorTarget / allStores.length) : baseIndicatorTarget;
        const totalDays = uniqueDates.length || 30;
        const dailyTarget = totalBaseStore / totalDays;
        
        if (selectedMarketingDate !== "ALL") {
          return dailyTarget;
        } else {
          return totalBaseStore;
        }
      }

      let sum = 0;
      let hasStoreDateTarget = false;
      activeDates.forEach((d) => {
        const normDate = normalizeDateStr(d);
        const dayTargetObj = storeMapTarget[normDate];
        if (dayTargetObj) {
          let val = 0;
          if (indicator === "CEBAN") val = dayTargetObj.ceban || 0;
          else if (indicator === "TELUR") val = dayTargetObj.telur || 0;
          else if (indicator === "TOYS") val = dayTargetObj.toys || 0;
          else if (indicator === "NEW MEMBER") val = dayTargetObj.new_member || 0;

          if (val > 0) {
            sum += val;
            hasStoreDateTarget = true;
          }
        }
      });

      if (!hasStoreDateTarget) {
        let baseIndicatorTarget = 0;
        if (indicator === "CEBAN") baseIndicatorTarget = targets.ceban || 0;
        else if (indicator === "TELUR") baseIndicatorTarget = targets.telur || 0;
        else if (indicator === "TOYS") baseIndicatorTarget = targets.toys || 0;
        else if (indicator === "NEW MEMBER") baseIndicatorTarget = targets.new_member || 0;
        
        const totalBaseStore = allStores.length > 0 ? (baseIndicatorTarget / allStores.length) : baseIndicatorTarget;
        const totalDays = uniqueDates.length || 30;
        const dailyTarget = totalBaseStore / totalDays;
        
        if (selectedMarketingDate !== "ALL") {
          return dailyTarget;
        } else {
          return totalBaseStore;
        }
      }

      return sum;
    };

    // Compute targets and achievement percentages
    Object.keys(storeMap).forEach((st) => {
      const data = storeMap[st];
      // CEBAN
      data.ceban.target = getStoreTarget("CEBAN", st);
      data.ceban.pct = data.ceban.target > 0 ? (data.ceban.actual / data.ceban.target) * 100 : 0;

      // TELUR
      data.telur.target = getStoreTarget("TELUR", st);
      data.telur.pct = data.telur.target > 0 ? (data.telur.actual / data.telur.target) * 100 : 0;

      // TOYS
      data.toys.target = getStoreTarget("TOYS", st);
      data.toys.pct = data.toys.target > 0 ? (data.toys.actual / data.toys.target) * 100 : 0;

      // MEMBER
      data.member.target = getStoreTarget("NEW MEMBER", st);
      data.member.pct = data.member.target > 0 ? (data.member.actual / data.member.target) * 100 : 0;
    });

    return Object.values(storeMap).sort((a, b) => {
      const totalCombinedA = a.ceban.actual + a.telur.actual + a.toys.actual + a.member.actual;
      const totalCombinedB = b.ceban.actual + b.telur.actual + b.toys.actual + b.member.actual;
      return totalCombinedB - totalCombinedA;
    });
  }, [records, uniqueSalespersons, selectedMarketingDate, targets, uniqueDates]);

  const pencapaianStoresBreakdown = useMemo(() => {
    const allStores = Array.from(new Set(records.map(r => r.salesperson).filter((s): s is string => Boolean(s)).filter(isStoreActive))) as string[];
    const ELIGIBLE_RTD_STORES = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];

    const storeMap: Record<string, {
      store: string;
      psm: { actual: number; target: number; pct: number };
      serba: { actual: number; target: number; pct: number };
      pwp: { actual: number; target: number; pct: number };
      seger: { actual: number; target: number; pct: number };
      rtd: { actual: number; target: number; pct: number; isEligible: boolean };
      ceban: { actual: number; target: number; pct: number };
      telur: { actual: number; target: number; pct: number };
      toys: { actual: number; target: number; pct: number };
      member: { actual: number; target: number; pct: number };
      bootle?: { actual: number; target: number; pct: number };
    }> = {};

    allStores.forEach((st) => {
      storeMap[st] = {
        store: st,
        psm: { actual: 0, target: 0, pct: 0 },
        serba: { actual: 0, target: 0, pct: 0 },
        pwp: { actual: 0, target: 0, pct: 0 },
        seger: { actual: 0, target: 0, pct: 0 },
        rtd: { actual: 0, target: 0, pct: 0, isEligible: ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(st)) },
        ceban: { actual: 0, target: 0, pct: 0 },
        telur: { actual: 0, target: 0, pct: 0 },
        toys: { actual: 0, target: 0, pct: 0 },
        member: { actual: 0, target: 0, pct: 0 },
        bootle: { actual: 0, target: 0, pct: 0 },
      };
    });

     // 1. Accumulate actuals
     records.forEach((r) => {
       if (!r.salesperson || !storeMap[r.salesperson]) return;
       if (selectedPencapaianDate !== "ALL" && normalizeDateStr(r.date) !== normalizeDateStr(selectedPencapaianDate)) return;
       const catInfo = getCategoryDisplayNameAndUnit(r.category, r.salesperson);
       const qty = r.quantity || 0;
 
       if (catInfo.name === "PSM") {
         storeMap[r.salesperson].psm.actual += qty;
       } else if (catInfo.name === "SERBA") {
         storeMap[r.salesperson].serba.actual += qty;
       } else if (catInfo.name === "PWP") {
         storeMap[r.salesperson].pwp.actual += qty;
       } else if (catInfo.name === "SEGER") {
         storeMap[r.salesperson].seger.actual += qty;
       } else if (catInfo.name === "RTD COFFEDAY") {
         if (r.date && isMonWedFri(r.date)) {
           storeMap[r.salesperson].rtd.actual += qty;
         }
       } else if (catInfo.name === "RTD BASIC") {
         storeMap[r.salesperson].rtd.actual += qty;
       } else if (catInfo.name === "CEBAN") {
         storeMap[r.salesperson].ceban.actual += qty;
       } else if (catInfo.name === "TELUR") {
         storeMap[r.salesperson].telur.actual += qty;
       } else if (catInfo.name === "TOYS") {
         storeMap[r.salesperson].toys.actual += qty;
       } else if (catInfo.name === "NEW MEMBER") {
         storeMap[r.salesperson].member.actual += qty;
       } else if (catInfo.name === "BOTTLE" || catInfo.name === "BOOTLE") {
         if (storeMap[r.salesperson].bootle) {
           storeMap[r.salesperson].bootle.actual += qty;
         }
       }
     });

    // Helper to calculate target
    const getStoreTarget = (indicator: string, storeCode: string): number => {
      const normStore = normalizeStoreCode(storeCode);
      const isSpecialStore = ELIGIBLE_RTD_STORES.includes(normStore);
      const storeMapTarget = targets.targetsByStoreAndDate?.[normStore];
      
      const activeDates = selectedPencapaianDate === "ALL" ? uniqueDates : [selectedPencapaianDate];
      
      if (!storeMapTarget) {
        let baseIndicatorTarget = 0;
        if (indicator === "PSM") baseIndicatorTarget = targets.psm || 0;
        else if (indicator === "SERBA") baseIndicatorTarget = targets.serba || 0;
        else if (indicator === "PWP") baseIndicatorTarget = targets.pwp || 0;
        else if (indicator === "SEGER") baseIndicatorTarget = targets.seger || 0;
        else if (indicator === "RTD COFFEDAY") baseIndicatorTarget = targets.rtd || 0;
        else if (indicator === "CEBAN") baseIndicatorTarget = targets.ceban || 0;
        else if (indicator === "TELUR") baseIndicatorTarget = targets.telur || 0;
        else if (indicator === "TOYS") baseIndicatorTarget = targets.toys || 0;
        else if (indicator === "NEW MEMBER") baseIndicatorTarget = targets.new_member || 0;
        else if (indicator === "BOOTLE" || indicator === "BOTTLE") baseIndicatorTarget = targets.bootle || 0;

        const totalBaseStore = allStores.length > 0 ? (baseIndicatorTarget / allStores.length) : baseIndicatorTarget;
        const totalDays = uniqueDates.length || 30;
        const dailyTarget = totalBaseStore / totalDays;
        
        if (selectedPencapaianDate !== "ALL") {
          return 0;
        } else {
          if (indicator === "RTD COFFEDAY") {
            if (isSpecialStore) {
              const mwfCount = uniqueDates.filter(d => isMonWedFri(d)).length;
              return dailyTarget * mwfCount;
            } else {
              return totalBaseStore;
            }
          }
          return totalBaseStore;
        }
      }

      let sum = 0;
      let hasStoreDateTarget = false;
      activeDates.forEach((d) => {
        const normDate = normalizeDateStr(d);
        const dayTargetObj = storeMapTarget[normDate];
        if (dayTargetObj) {
          let val = 0;
          if (indicator === "PSM") val = dayTargetObj.psm || 0;
          else if (indicator === "SERBA") val = dayTargetObj.serba || 0;
          else if (indicator === "PWP") val = dayTargetObj.pwp || 0;
          else if (indicator === "SEGER") val = dayTargetObj.seger || 0;
          else if (indicator === "RTD COFFEDAY") {
            if (isSpecialStore) {
              if (isMonWedFri(d)) {
                val = dayTargetObj.rtd || 0;
              } else {
                val = 0;
              }
            } else {
              val = dayTargetObj.rtd || 0;
            }
          }
          else if (indicator === "CEBAN") val = dayTargetObj.ceban || 0;
          else if (indicator === "TELUR") val = dayTargetObj.telur || 0;
          else if (indicator === "TOYS") val = dayTargetObj.toys || 0;
          else if (indicator === "NEW MEMBER") val = dayTargetObj.new_member || 0;
          else if (indicator === "BOOTLE" || indicator === "BOTTLE") val = dayTargetObj.bootle || 0;

          if (val > 0) {
            sum += val;
            hasStoreDateTarget = true;
          }
        }
      });

      if (!hasStoreDateTarget) {
        let baseIndicatorTarget = 0;
        if (indicator === "PSM") baseIndicatorTarget = targets.psm || 0;
        else if (indicator === "SERBA") baseIndicatorTarget = targets.serba || 0;
        else if (indicator === "PWP") baseIndicatorTarget = targets.pwp || 0;
        else if (indicator === "SEGER") baseIndicatorTarget = targets.seger || 0;
        else if (indicator === "RTD COFFEDAY") baseIndicatorTarget = targets.rtd || 0;
        else if (indicator === "CEBAN") baseIndicatorTarget = targets.ceban || 0;
        else if (indicator === "TELUR") baseIndicatorTarget = targets.telur || 0;
        else if (indicator === "TOYS") baseIndicatorTarget = targets.toys || 0;
        else if (indicator === "NEW MEMBER") baseIndicatorTarget = targets.new_member || 0;
        else if (indicator === "BOOTLE" || indicator === "BOTTLE") baseIndicatorTarget = targets.bootle || 0;
        
        const totalBaseStore = allStores.length > 0 ? (baseIndicatorTarget / allStores.length) : baseIndicatorTarget;
        const totalDays = uniqueDates.length || 30;
        const dailyTarget = totalBaseStore / totalDays;
        
        if (selectedPencapaianDate !== "ALL") {
          return 0;
        } else {
          if (indicator === "RTD COFFEDAY") {
            if (isSpecialStore) {
              const mwfCount = uniqueDates.filter(d => isMonWedFri(d)).length;
              return dailyTarget * mwfCount;
            } else {
              return totalBaseStore;
            }
          }
          return totalBaseStore;
        }
      }

      return sum;
    };

    // 2. Compute targets and achievement percentages
    Object.keys(storeMap).forEach((st) => {
      const data = storeMap[st];
      // PSM
      data.psm.target = getStoreTarget("PSM", st);
      data.psm.pct = data.psm.target > 0 ? (data.psm.actual / data.psm.target) * 100 : 0;

      // SERBA
      data.serba.target = getStoreTarget("SERBA", st);
      data.serba.pct = data.serba.target > 0 ? (data.serba.actual / data.serba.target) * 100 : 0;

      // PWP
      data.pwp.target = getStoreTarget("PWP", st);
      data.pwp.pct = data.pwp.target > 0 ? (data.pwp.actual / data.pwp.target) * 100 : 0;

      // SEGER
      data.seger.target = getStoreTarget("SEGER", st);
      data.seger.pct = data.seger.target > 0 ? (data.seger.actual / data.seger.target) * 100 : 0;

      // RTD
      data.rtd.target = getStoreTarget("RTD COFFEDAY", st);
      data.rtd.pct = data.rtd.target > 0 ? (data.rtd.actual / data.rtd.target) * 100 : 0;

      // CEBAN
      data.ceban.target = getStoreTarget("CEBAN", st);
      data.ceban.pct = data.ceban.target > 0 ? (data.ceban.actual / data.ceban.target) * 100 : 0;

      // TELUR
      data.telur.target = getStoreTarget("TELUR", st);
      data.telur.pct = data.telur.target > 0 ? (data.telur.actual / data.telur.target) * 100 : 0;

      // TOYS
      data.toys.target = getStoreTarget("TOYS", st);
      data.toys.pct = data.toys.target > 0 ? (data.toys.actual / data.toys.target) * 100 : 0;

      // MEMBER
      data.member.target = getStoreTarget("NEW MEMBER", st);
      data.member.pct = data.member.target > 0 ? (data.member.actual / data.member.target) * 100 : 0;
    });

    const sorted = Object.values(storeMap).sort((a, b) => {
      if (pencapaianSortField === "store") {
        return pencapaianSortDirection === "asc"
          ? a.store.localeCompare(b.store)
          : b.store.localeCompare(a.store);
      } else {
        const field = pencapaianSortField as 'psm' | 'serba' | 'pwp' | 'seger' | 'rtd' | 'ceban' | 'telur' | 'toys' | 'member';
        const valA = a[field]?.pct ?? 0;
        const valB = b[field]?.pct ?? 0;
        if (valA === valB) {
          const actA = a[field]?.actual ?? 0;
          const actB = b[field]?.actual ?? 0;
          return pencapaianSortDirection === "asc" ? actA - actB : actB - actA;
        }
        return pencapaianSortDirection === "asc" ? valA - valB : valB - valA;
      }
    });

    return sorted;
  }, [records, targets, uniqueDates, selectedPencapaianDate, pencapaianSortField, pencapaianSortDirection]);

  const storesWithNoSales = useMemo(() => {
    if (selectedPencapaianDate === "ALL") return [];
    return pencapaianStoresBreakdown.filter((item) => {
      const totalActual =
        item.psm.actual +
        item.serba.actual +
        item.pwp.actual +
        item.seger.actual +
        item.rtd.actual +
        item.ceban.actual +
        item.telur.actual +
        item.toys.actual +
        item.member.actual;
      return totalActual === 0;
    });
  }, [pencapaianStoresBreakdown, selectedPencapaianDate]);


  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 font-sans selection:bg-blue-100 text-slate-800 dark:text-slate-100">
      
      {/* Top Universal Banner indicating Sandbox / Live Status */}
      <AnimatePresence>
        {isLoadingServerCache && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-600 text-white font-sans text-xs px-4 py-2.5 flex items-center justify-center gap-2 shadow-sm overflow-hidden border-b border-indigo-700/20"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Memulihkan rincian dashboard tersinkronisasi dari server...</span>
          </motion.div>
        )}
        {isSandboxMode && !isLoadingServerCache && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-500 text-white font-sans text-xs px-4 py-2.5 flex items-center justify-between shadow-sm overflow-hidden border-b border-amber-600/20"
          >
            <div className="flex items-center gap-2 max-w-4xl">
              <Info className="w-4.5 h-4.5 shrink-0" />
              <span>
                <strong>Mode Demo Sandbox (Data Simulasi Aktif):</strong> Anda sedang melihat data tiruan penjualan. Sambungkan akun Google Google Sheets Anda dengan tombol di samping untuk memuat rincian asli secara live.
              </span>
            </div>
            <button
              onClick={handleConnectGoogle}
              disabled={isAuthenticating}
              className="bg-white/15 hover:bg-white/30 text-white font-semibold px-3 py-1 rounded-lg transition-colors border border-white/20 hover:border-white/40 shadow-sm shrink-0 ml-4 font-sans uppercase tracking-wider text-[10px] disabled:opacity-50"
            >
              {isAuthenticating ? "Menghubungkan..." : "Hubungkan Sheets"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Container bar */}
      <nav id="navbar-sales" className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md rotate-1 shadow-blue-500/20">
              <FileSpreadsheet className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tracking-tight font-sans">
                Rekap Penjualan
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider uppercase">
                Interactive Sales Operations Dashboard
              </p>
            </div>
          </div>

          {/* Quick spreadsheet and credentials bar */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Google Sheets Link Badge */}
            <a
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-all font-mono"
            >
              Spreadsheet <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Google Identity Auth badge */}
            {user ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30">
                <div className="w-5 h-5 rounded-full overflow-hidden border border-blue-400">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || "Avatar"} referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {user.displayName?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 line-clamp-1">
                    {user.displayName}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout dari akun Google"
                  className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100/50 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={isAuthenticating}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all font-sans disabled:opacity-50"
              >
                <CloudLightning className={`w-4 h-4 ${isAuthenticating ? "animate-spin" : ""}`} /> {isAuthenticating ? "Menghubungkan..." : "Hubungkan Ke Google Sheets"}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Core Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Dynamic Controls / Sheet Config Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 md:p-5 shadow-sm space-y-4 transition-all duration-300">
          
          {/* Collapsible Panel Header */}
          <div 
            onClick={() => setIsConfigExpanded(!isConfigExpanded)}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 cursor-pointer select-none group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/25 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-105 transition-transform duration-300">
                <Database className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center flex-wrap gap-2">
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Konfigurasi Konektor Google Sheets
                  </h3>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide font-sans ${
                    isSandboxMode 
                      ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" 
                      : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {isSandboxMode ? "Mode Demo" : "Mode Live"}
                  </span>
                </div>
                
                {isConfigExpanded ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                    Input Google Spreadsheet ID di bawah dan pilih tab rujukan rekap untuk membaca data secara real-time
                  </p>
                ) : (
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span>Spreadsheet ID: <strong className="text-slate-700 dark:text-slate-200 font-mono text-[11px]">{spreadsheetId ? `${spreadsheetId.substring(0, 10)}...` : "(kosong)"}</strong></span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span>Tab Rujukan: <strong className="text-blue-600 dark:text-blue-400 font-sans text-[11px] bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-md">{activeTab}</strong></span>
                    {autoRefresh && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[10px] uppercase font-bold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Auto-Refresh Aktif
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end sm:justify-start">
              {isConfigExpanded && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpreadsheetId(DEFAULT_SPREADSHEET_ID);
                    if (accessToken) {
                      fetchSpreadsheetMetaAndLoad(DEFAULT_SPREADSHEET_ID, accessToken);
                    }
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold hover:underline focus:outline-none"
                >
                  Reset Default
                </button>
              )}
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfigExpanded(!isConfigExpanded);
                }}
                className="p-1.5 px-3 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200/40 dark:border-slate-800/65 flex items-center gap-1.5 font-sans cursor-pointer focus:outline-none"
              >
                <span className="font-semibold">{isConfigExpanded ? "Minimize" : "Maximize"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-350 ${isConfigExpanded ? "rotate-180" : "rotate-0"}`} />
              </button>
            </div>
          </div>

          {/* Interactive Collapsible Container */}
          <AnimatePresence initial={false}>
            {isConfigExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden space-y-4 pt-1"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Input field for custom spreadsheet ID */}
                  <div className="md:col-span-6">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                      spreadsheet file id
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan ID Google Spreadsheet..."
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Dynamic tab dropdown selection if logged in */}
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                      pilih tab rujukan (sheet)
                    </label>
                    {sheetTabs.length > 0 ? (
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                          <Layers className="w-3.5 h-3.5" />
                        </span>
                        <select
                          value={activeTab}
                          onChange={(e) => handleTabChange(e.target.value)}
                          className="appearance-none w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans cursor-pointer"
                        >
                          {sheetTabs.map((tab, idx) => (
                            <option key={idx} value={tab}>
                              {tab}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-xs text-slate-400 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl leading-none flex items-center justify-center">
                        TAB DASHBOARD (Default)
                      </div>
                    )}
                  </div>

                  {/* Primary Fetch button */}
                  <div className="md:col-span-3 flex items-end">
                    <button
                      onClick={() => fetchSpreadsheetMetaAndLoad(spreadsheetId, accessToken)}
                      disabled={loading || checkingMeta || isAuthenticating}
                      className="w-full bg-slate-900 border-indigo-700 border hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700/50 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 font-sans cursor-pointer"
                    >
                      {loading || checkingMeta || isAuthenticating ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span>{loading || checkingMeta ? "Sajarkan data..." : "Mutakhirkan Data"}</span>
                    </button>
                  </div>
                </div>



                {/* Ganti Tema Tampilan Section */}
                <div id="theme-toggle-card-container" className="p-4 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/60 mt-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded-xl transition-colors">
                        {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          Ganti Tema Tampilan
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                          Sesuaikan tampilan dashboard antara Mode Terang (Light) atau Mode Gelap (Dark).
                        </p>
                      </div>
                    </div>
                    
                    {/* Toggle Switch */}
                    <button
                      type="button"
                      id="toggle-theme-btn"
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isDarkMode ? "bg-sky-605 text-white" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isDarkMode ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Bagikan Link Publik Section */}
                <div id="share-link-card-container" className="p-4 bg-gradient-to-br from-blue-50/20 via-transparent to-slate-50/20 dark:from-blue-950/10 dark:via-transparent dark:to-slate-900/10 rounded-xl border border-blue-100/60 dark:border-blue-900/45 mt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl transition-colors shrink-0">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 font-sans">
                        Bagikan Link Publik (Tanpa Login)
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
                        Bagikan link khusus agar tim Anda dapat melihat laporan real-time tanpa perlu log in ke Google Sheet atau memiliki akun Google.
                      </p>
                    </div>
                  </div>

                  {spreadsheetId && spreadsheetId.trim().length >= 20 ? (
                    <div className="space-y-3 pt-1">
                      {/* Shareable Link Input Group */}
                      <div className="flex gap-2">
                        <div className="relative flex-grow">
                          <input
                            type="text"
                            readOnly
                            value={getShareableLink()}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 pr-8 text-[11px] text-slate-600 dark:text-slate-350 font-mono outline-none cursor-text truncate"
                          />
                          <button
                            onClick={handleCopyLink}
                            className="absolute right-2 top-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Salin Link"
                          >
                            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <button
                          onClick={handleCopyLink}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-blue-650 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg shadow-sm transition-all focus:outline-none flex items-center gap-1 shrink-0 font-sans cursor-pointer whitespace-nowrap"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-3.5 h-3.5 animate-pulse" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin Link</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Instructions with elegant mini info box */}
                      <div className="p-2.5 bg-amber-500/5 dark:bg-amber-400/5 border border-amber-500/15 dark:border-amber-400/10 rounded-lg text-[10px] text-slate-600 dark:text-slate-400 font-sans space-y-1.5">
                        <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 uppercase tracking-wide">
                          ⚠️ Langkah Penting Sebelum Membagikan:
                        </span>
                        <p className="leading-relaxed">
                          Agar orang lain dapat melihat data dari link ini, dokumen Google Spreadsheet Anda harus diatur ke publik:
                        </p>
                        <ol className="list-decimal pl-4 space-y-1 leading-normal text-slate-600 dark:text-slate-400">
                          <li>Buka Google Spreadsheet lalu klik tombol <strong className="text-slate-800 dark:text-slate-200">"Bagikan / Share"</strong> di pojok kanan atas.</li>
                          <li>Di bagian <strong className="text-slate-800 dark:text-slate-250">"Akses umum / General access"</strong>, ubah pengaturan dari <strong className="text-slate-800 dark:text-slate-200">"Dibatasi / Restricted"</strong> menjadi <strong className="text-slate-800 dark:text-slate-200">"Siapa saja yang memiliki link / Anyone with the link"</strong>.</li>
                          <li>Pastikan perannya diset sebagai <strong className="text-slate-800 dark:text-slate-200">"Pelihat / Viewer"</strong>.</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-100/50 dark:bg-slate-900/45 rounded-lg border border-slate-205 dark:border-slate-800/40 text-[10px] text-slate-500 dark:text-slate-450 italic text-center leading-relaxed">
                      Silakan hubungkan akun Google Anda atau masukkan Google Spreadsheet ID terlebih dahulu untuk mengaktifkan link publik.
                    </div>
                  )}
                </div>

                {/* Dashboard Auto Link Sync & Auto Refresh Status Info bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${accessToken ? "bg-blue-500" : "bg-emerald-500"}`} />
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-sans uppercase tracking-wide">
                        Konektivitas: {accessToken ? "Google Auth Terkoneksi (Sesi Aktif)" : "Sinkronisasi Publik Otomatis (Tanpa Login)"}
                      </span>
                    </div>
                    {lastSyncedTime && (
                      <div className="flex items-center gap-2 pl-4.5">
                        <span className="text-[10px] font-medium text-slate-450 dark:text-slate-500 font-sans">
                          Terakhir Berhasil Disinkronkan: <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">{lastSyncedTime}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Always-on Auto Refresh Status indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
                      Sinkronisasi Otomatis: Aktif (Setiap 5 Detik)
                    </span>
                  </div>
                </div>

                {/* Detailed Error Box */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-xl flex items-start gap-3 mt-4"
                  >
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-xs flex-1">
                      <span className="font-bold text-rose-800 dark:text-rose-450">Hubungan Gagal: </span>
                      <span className="text-rose-700 dark:text-rose-300">{error}</span>
                      <p className="mt-1 text-slate-500 dark:text-slate-400 font-sans">
                        Saran: Pastikan profil Google Anda memiliki izin membaca ("readonly") spreadsheet target dan file share link tersetting dengan "Anyone with link" atau di-share ke akun login Anda.
                      </p>
                      {error.includes("Tab Baru") && (
                        <div className="mt-3">
                          <a
                            href={window.location.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-750/90 rounded-xl shadow-md transition-all font-sans cursor-pointer"
                          >
                            Buka Aplikasi di Tab Baru <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modern Segmented Navigation Tabs */}
        <div id="navigation-tabs" className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-2.5 mt-6 mb-8 gap-2 shadow-xs w-full max-w-4xl mx-auto">
          {/* Header for menu */}
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 font-mono">
            <div className="flex items-center gap-1.5 ">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              <span>MENU NAVIGASI UTAMA</span>
            </div>
            <span className="text-[9px] text-slate-400 font-medium italic lowercase">klik kategori untuk bertukar halaman</span>
          </div>

          {/* Filter Periode Terintegrasi */}
          <div className="p-3 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/40 rounded-xl mx-2.5 mt-2 mb-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider font-sans">Saring Periode:</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedFilterMonth}
                onChange={(e) => setSelectedFilterMonth(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans cursor-pointer flex-1 sm:flex-none uppercase"
              >
                {MONTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label.toUpperCase()}
                  </option>
                ))}
              </select>

              <select
                value={selectedFilterYear}
                onChange={(e) => setSelectedFilterYear(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans cursor-pointer flex-1 sm:flex-none uppercase"
              >
                <option value="ALL">SEMUA TAHUN</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <button
              id="tab-dashboard"
              onClick={() => setActiveMenuTab("dashboard")}
              className={`flex items-center justify-between py-3 px-4 text-left text-xs sm:text-sm font-extrabold border-l-4 transition-all cursor-pointer relative uppercase tracking-wider rounded-r-xl ${
                activeMenuTab === "dashboard"
                  ? "border-blue-600 text-blue-600 bg-blue-50/20 dark:bg-blue-950/20 dark:text-blue-400 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className={`w-4 h-4 shrink-0 ${activeMenuTab === "dashboard" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                <span>DASHBOARD</span>
              </div>
              {activeMenuTab === "dashboard" && (
                <span className="text-[10px] font-mono font-bold bg-blue-105-wait dark:bg-blue-900/40 px-2 py-0.5 rounded text-blue-700 dark:text-blue-400">AKTIF</span>
              )}
            </button>

            <button
              id="tab-pencapaian"
              onClick={() => setActiveMenuTab("pencapaian")}
              className={`flex items-center justify-between py-3 px-4 text-left text-xs sm:text-sm font-extrabold border-l-4 transition-all cursor-pointer relative uppercase tracking-wider rounded-r-xl ${
                activeMenuTab === "pencapaian"
                  ? "border-blue-600 text-blue-600 bg-blue-50/20 dark:bg-blue-950/20 dark:text-blue-400 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <Trophy className={`w-4 h-4 shrink-0 ${activeMenuTab === "pencapaian" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                <span>PENCAPAIAN VS TARGET</span>
              </div>
              {activeMenuTab === "pencapaian" && (
                <span className="text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded text-blue-700 dark:text-blue-400 font-bold">AKTIF</span>
              )}
            </button>

            <button
              id="tab-copy"
              onClick={() => setActiveMenuTab("copy_laporan")}
              className={`flex items-center justify-between py-3 px-4 text-left text-xs sm:text-sm font-extrabold border-l-4 transition-all cursor-pointer relative uppercase tracking-wider rounded-r-xl ${
                activeMenuTab === "copy_laporan"
                  ? "border-blue-600 text-blue-600 bg-blue-50/20 dark:bg-blue-950/20 dark:text-blue-400 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className={`w-4 h-4 shrink-0 ${activeMenuTab === "copy_laporan" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                <span>COPY LAPORAN</span>
              </div>
              {activeMenuTab === "copy_laporan" && (
                <span className="text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded text-blue-700 dark:text-blue-400 font-bold">AKTIF</span>
              )}
            </button>
          </div>
        </div>

        {/* Tab content rendering */}
        <AnimatePresence mode="wait">
          {activeMenuTab === "pencapaian" && (
            <motion.div
              key="pencapaian-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Title for progress dashboard */}
              <div className="mt-8 mb-5">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                  <span className="w-1.5 h-5 bg-blue-600 rounded"></span>
                  PENCAPAIAN VS TARGET {activeMonthName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Perbandingan total volume pencapaian transaksi aktual terhadap performa target yang ditentukan per kategori
                </p>
              </div>

              {/* 4 KPI Summary Metric Cards Column Layout */}
              <div id="metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title="ACTUAL PSM"
                  value={`${(actuals?.psmActual ?? 0).toLocaleString("id-ID")} Pcs`}
                  subtitle={`Target: ${Math.round(targets?.psm ?? 0).toLocaleString("id-ID")} Pcs`}
                  icon={<span className="font-extrabold font-mono text-[11px] tracking-wide h-6 w-6 flex items-center justify-center select-none">PSM</span>}
                  trend={{ label: `${psmPercentage.toFixed(1)}% Tercapai`, isPositive: psmPercentage >= 100 }}
                  color="blue"
                  delay={0}
                />
                <KPICard
                  title="ACTUAL SERBA GRATIS"
                  value={`${(actuals?.serbaActual ?? 0).toLocaleString("id-ID")} Pkt`}
                  subtitle={`Target: ${Math.round(targets?.serba ?? 0).toLocaleString("id-ID")} Pkt`}
                  icon={<span className="font-extrabold font-mono text-[11px] tracking-wide h-6 w-6 flex items-center justify-center select-none">SBG</span>}
                  trend={{ label: `${serbaPercentage.toFixed(1)}% Tercapai`, isPositive: serbaPercentage >= 100 }}
                  color="purple"
                  delay={0.05}
                />
                <KPICard
                  title="ACTUAL PWP"
                  value={`${(actuals?.pwpActual ?? 0).toLocaleString("id-ID")} Pcs`}
                  subtitle={`Target: ${Math.round(targets?.pwp ?? 0).toLocaleString("id-ID")} Pcs`}
                  icon={<span className="font-extrabold font-mono text-[11px] tracking-wide h-6 w-6 flex items-center justify-center select-none">PWP</span>}
                  trend={{ label: `${pwpPercentage.toFixed(1)}% Tercapai`, isPositive: pwpPercentage >= 100 }}
                  color="orange"
                  delay={0.1}
                />
                <KPICard
                  title="ACTUAL SEGER"
                  value={`${(actuals?.segerActual ?? 0).toLocaleString("id-ID")} Pcs`}
                  subtitle={`Target: ${Math.round(targets?.seger ?? 0).toLocaleString("id-ID")} Pcs`}
                  icon={<span className="font-extrabold font-mono text-[11px] tracking-wide h-6 w-6 flex items-center justify-center select-none">SG</span>}
                  trend={{ label: `${segerPercentage.toFixed(1)}% Tercapai`, isPositive: segerPercentage >= 100 }}
                  color="green"
                  delay={0.15}
                />
              </div>

              {/* Side-by-side Layout: RTD Target Card (Left) & specific RTD trend chart (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch mt-6">
                <div className="lg:col-span-1 flex flex-col h-full gap-4">
                  <KPICard
                    title="ACTUAL RTD COFFEDAY"
                    description="Senin, Rabu, Jumat"
                    value={`${(actuals?.rtdActual ?? 0).toLocaleString("id-ID")} Pcs`}
                    subtitle={`Target: ${Math.round(adjustedRtdTarget).toLocaleString("id-ID")} Pcs`}
                    icon={<Coffee className="w-6 h-6 text-pink-500" />}
                    trend={{ label: `${rtdPercentage.toFixed(1)}% Tercapai`, isPositive: rtdPercentage >= 100 }}
                    color="pink"
                    delay={0.2}
                    footerExtra={
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Kode Toko Khusus RTD:
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {["KE45", "KC36", "KD17", "K883", "KF66", "KD54"].map((code) => (
                            <span
                              key={code}
                              className="px-2 py-0.5 text-[10px] font-mono font-bold bg-pink-50/60 dark:bg-pink-950/25 border border-pink-100/30 dark:border-pink-900/30 rounded text-pink-650 dark:text-pink-300 shadow-sm"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    }
                  />
                  <KPICard
                    title="ACTUAL RTD BASIC"
                    description="Selain Toko Syarat RTD (Setiap Hari)"
                    value={`${(actuals?.rtdBasicActual ?? 0).toLocaleString("id-ID")} Pcs`}
                    subtitle={`Target: ${Math.round(adjustedRtdBasicTarget).toLocaleString("id-ID")} Pcs`}
                    icon={<Coffee className="w-6 h-6 text-purple-500" />}
                    trend={{ label: `${rtdBasicPercentage.toFixed(1)}% Tercapai`, isPositive: rtdBasicPercentage >= 100 }}
                    color="purple"
                    delay={0.25}
                  />
                </div>

                <div className="lg:col-span-2">
                  {/* Grafik Trend Khusus RTD COFFEDAY */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm flex flex-col group relative">
                    <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest block font-sans">
                          Grafik Trend Khusus
                        </span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          GRAFIK RTD COFFEDAY (TOKO SYARAT)
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed font-sans">
                          Tren harian aktual vs target rujukan toko berpartisipasi (Senin, Rabu, Jumat)
                        </p>
                      </div>

                      {/* Dropdown Toko Bersyarat RTD */}
                      <div className="flex items-center gap-1.5 self-center">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Filter Toko:</span>
                        <select
                          value={selectedRtdStore}
                          onChange={(e) => {
                            setSelectedRtdStore(e.target.value);
                            setHoveredRtdIdx(null);
                          }}
                          className="text-[10px] font-bold bg-pink-50/60 dark:bg-pink-95/20 border border-pink-100/30 dark:border-pink-900/30 text-pink-650 dark:text-pink-300 rounded px-2 py-1 outline-none cursor-pointer focus:ring-1 focus:ring-pink-500 transition-all font-sans"
                        >
                          <option value="ALL">SEMUA TOKO</option>
                          {["KE45", "KC36", "KD17", "K883", "KF66", "KD54"].map((tok) => (
                            <option key={tok} value={tok}>{tok}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {rtdTrendData.length === 0 ? (
                      <div className="py-12 text-center text-[11px] text-slate-400 italic font-mono">
                        Belum ada data penjualan RTD tersedia untuk filter ini
                      </div>
                    ) : (
                      <div className="relative mt-2">
                        <svg viewBox="0 0 500 150" className="w-full overflow-visible">
                          <defs>
                            <linearGradient id="rtdAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.00" />
                            </linearGradient>
                          </defs>

                          {/* Horizontal Solid Gridlines */}
                          {(() => {
                            const maxVal = Math.max(...rtdTrendData.map(d => Math.max(d.qty, d.target)), 10) * 1.15;
                            return [0, 0.5, 1].map((scale, i) => {
                              const y = 15 + scale * 115;
                              const labelValue = Math.round(maxVal - scale * maxVal);
                              return (
                                <g key={i} className="opacity-40">
                                  <line
                                    x1={35}
                                    y1={y}
                                    x2={465}
                                    y2={y}
                                    stroke="#f1f5f9"
                                    className="dark:stroke-slate-800/60"
                                    strokeWidth="1"
                                  />
                                  <text
                                    x={30}
                                    y={y + 3}
                                    textAnchor="end"
                                    className="fill-slate-400 text-[8px] font-mono font-bold"
                                  >
                                    {labelValue}
                                  </text>
                                </g>
                              );
                            });
                          })()}

                          {/* Plot Line Curves */}
                          {(() => {
                            const maxVal = Math.max(...rtdTrendData.map(d => Math.max(d.qty, d.target)), 10) * 1.15;
                            const points = rtdTrendData.map((p, idx) => {
                              const x = 35 + (idx / Math.max(rtdTrendData.length - 1, 1)) * 430;
                              const yQty = 15 + 115 - (p.qty / maxVal) * 115;
                              const yTarget = 15 + 115 - (p.target / maxVal) * 115;
                              return { x, yQty, yTarget, data: p };
                            });

                            const qtyPath = `M ${points[0]?.x ?? 35} ${points[0]?.yQty ?? 130} ` + points.slice(1).map((p) => `L ${p.x} ${p.yQty}`).join(" ");
                            const targetPath = `M ${points[0]?.x ?? 35} ${points[0]?.yTarget ?? 130} ` + points.slice(1).map((p) => `L ${p.x} ${p.yTarget}`).join(" ");
                            const areaPath = points.length > 0
                              ? `${qtyPath} L ${points[points.length - 1].x} 130 L ${points[0].x} 130 Z`
                              : "";

                            return (
                              <g>
                                {/* Rich Pink Area */}
                                {areaPath && <path d={areaPath} fill="url(#rtdAreaGrad)" className="pointer-events-none" />}

                                {/* Solid Target Line (No dashes) */}
                                {targetPath && (
                                  <path
                                    d={targetPath}
                                    fill="none"
                                    stroke="#f43f5e"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    className="pointer-events-none opacity-80"
                                  />
                                )}

                                {/* Solid Actual Line */}
                                {qtyPath && (
                                  <path
                                    d={qtyPath}
                                    fill="none"
                                    stroke="#ec4899"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    className="pointer-events-none"
                                  />
                                )}

                                {/* Interactive Hover Guides & Indicator Dots */}
                                {points.map((p, idx) => {
                                  const isHovered = hoveredRtdIdx === idx;
                                  return (
                                    <g key={idx}>
                                      {isHovered && (
                                        <>
                                          <line
                                            x1={p.x}
                                            y1={15}
                                            x2={p.x}
                                            y2={130}
                                            stroke="#db2777"
                                            strokeWidth="1"
                                            className="opacity-40"
                                          />
                                          <circle
                                            cx={p.x}
                                            cy={p.yQty}
                                            r="4.5"
                                            className="fill-pink-500 stroke-white dark:stroke-slate-900"
                                            strokeWidth="1.5"
                                          />
                                          <circle
                                            cx={p.x}
                                            cy={p.yTarget}
                                            r="3.5"
                                            className="fill-rose-500 stroke-white dark:stroke-slate-900"
                                            strokeWidth="1.5"
                                          />
                                        </>
                                      )}
                                      {/* Invisible interactive hover slice columns */}
                                      <rect
                                        x={p.x - 15}
                                        y={15}
                                        width={30}
                                        height={115}
                                        fill="transparent"
                                        className="cursor-crosshair"
                                        onMouseEnter={() => setHoveredRtdIdx(idx)}
                                        onMouseLeave={() => setHoveredRtdIdx(null)}
                                      />
                                    </g>
                                  );
                                })}
                              </g>
                            );
                          })()}

                          {/* X axis dates labeling */}
                          {rtdTrendData.map((p, idx) => {
                            if (rtdTrendData.length > 10 && idx % 2 !== 0) return null; // reduce label density
                            const x = 35 + (idx / Math.max(rtdTrendData.length - 1, 1)) * 430;
                            return (
                              <text
                                key={idx}
                                x={x}
                                y={145}
                                textAnchor="middle"
                                className="fill-slate-400 dark:fill-slate-500 font-mono text-[7px] font-bold"
                              >
                                {p.displayDate}
                              </text>
                            );
                          })}
                        </svg>

                        {/* Tooltip detail display right below chart when interactive slice is active */}
                        <div className="mt-2.5 min-h-[50px] flex items-center justify-center">
                          {hoveredRtdIdx !== null && rtdTrendData[hoveredRtdIdx] ? (
                            <div className="w-full bg-pink-50/40 dark:bg-pink-950/20 border border-pink-100/20 dark:border-pink-900/30 rounded-xl px-4 py-2 flex items-center justify-between text-xs animate-fade-in">
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wider font-mono">
                                  Tanggal: {getDayPartOnly(rtdTrendData[hoveredRtdIdx].dateStr)}
                                </p>
                                <p className="font-semibold text-slate-500 dark:text-slate-400">
                                  {selectedRtdStore === "ALL" ? "Tren Akumulasi 6 Toko" : `Tren Performa Toko ${selectedRtdStore}`}
                                </p>
                              </div>
                              <div className="flex gap-4">
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">AKTUAL</span>
                                  <span className="font-mono font-extrabold text-pink-600 dark:text-pink-400 text-sm">
                                    {rtdTrendData[hoveredRtdIdx].qty.toLocaleString("id-ID")} Pcs
                                  </span>
                                </div>
                                <div className="text-right border-l border-slate-200/50 dark:border-slate-800/50 pl-4">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">TARGET</span>
                                  <span className="font-mono font-extrabold text-rose-500 text-sm">
                                    {Math.round(rtdTrendData[hoveredRtdIdx].target).toLocaleString("id-ID")} Pcs
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold italic text-center py-1 flex items-center gap-1">
                              <Info className="w-3.5 h-3.5 text-slate-400 font-sans" />
                              Arahkan kursor pada titik grafik untuk detail performa harian
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section Divider for Fokus Marketing */}
              <div className="border-t border-slate-200/80 dark:border-slate-800/80 my-10 pt-8" />

              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                    <span className="w-1.5 h-5 bg-blue-600 rounded"></span>
                    PENCAPAIAN VS TARGET FOKUS MARKETING {activeMonthName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                    Perbandingan total volume pencapaian transaksi aktual terhadap performa target yang ditentukan per kategori fokus marketing
                  </p>
                </div>

                {/* 4 KPI Summary Metric Cards Column Layout */}
                <div id="marketing-metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KPICard
                    title="ACTUAL CEBAN"
                    value={`${(actuals?.cebanActual ?? 0).toLocaleString("id-ID")} Pcs`}
                    subtitle={`Target: ${Math.round(targets?.ceban ?? 0).toLocaleString("id-ID")} Pcs`}
                    icon={<span className="font-extrabold font-mono text-[11px] tracking-wide h-6 w-6 flex items-center justify-center select-none">CBN</span>}
                    trend={{ label: `${cebanPercentage.toFixed(1)}% Tercapai`, isPositive: cebanPercentage >= 100 }}
                    color="blue"
                    delay={0}
                  />
                  <KPICard
                    title="ACTUAL DELTA / TELUR"
                    value={`${(actuals?.telurActual ?? 0).toLocaleString("id-ID")} Pcs`}
                    subtitle={`Target: ${Math.round(targets?.telur ?? 0).toLocaleString("id-ID")} Pcs`}
                    icon={<span className="font-extrabold font-mono text-[11px] tracking-wide h-6 w-6 flex items-center justify-center select-none">TLR</span>}
                    trend={{ label: `${telurPercentage.toFixed(1)}% Tercapai`, isPositive: telurPercentage >= 100 }}
                    color="purple"
                    delay={0.05}
                  />
                  <KPICard
                    title="ACTUAL TOYS"
                    value={`${(actuals?.toysActual ?? 0).toLocaleString("id-ID")} Pcs`}
                    subtitle={`Target: ${Math.round(targets?.toys ?? 0).toLocaleString("id-ID")} Pcs`}
                    icon={<span className="font-extrabold font-mono text-[11px] tracking-wide h-6 w-6 flex items-center justify-center select-none">TYS</span>}
                    trend={{ label: `${toysPercentage.toFixed(1)}% Tercapai`, isPositive: toysPercentage >= 100 }}
                    color="orange"
                    delay={0.1}
                  />
                  <KPICard
                    title="ACTUAL NEW MEMBER"
                    value={`${(actuals?.newMemberActual ?? 0).toLocaleString("id-ID")} Member`}
                    subtitle={`Target: ${Math.round(targets?.new_member ?? 0).toLocaleString("id-ID")} Member`}
                    icon={<span className="font-extrabold font-mono text-[11px] tracking-wide h-6 w-6 flex items-center justify-center select-none">MBR</span>}
                    trend={{ label: `${newMemberPercentage.toFixed(1)}% Tercapai`, isPositive: newMemberPercentage >= 100 }}
                    color="green"
                    delay={0.15}
                  />
                </div>
              </div>

              {/* Visualizer multi-perspective charts (Moved here from Marketing Tab) */}
              <div className="mt-8">
                <DashboardCharts
                  records={records}
                  monthlyTrend={monthlyChartData}
                  categoryBreakdown={categoryChartData}
                  regionBreakdown={regionalData}
                  targets={targets}
                />
              </div>

              {/* Toko Target Comparison rankings panel */}
              <TokoPerformanceRank
                selectedRankIndicator={selectedRankIndicator}
                setSelectedRankIndicator={setSelectedRankIndicator}
                selectedRankDate={selectedRankDate}
                setSelectedRankDate={setSelectedRankDate}
                uniqueDates={uniqueDates}
                rankData={rankData}
              />

              {/* Uraian Penjualan per Toko Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-blue-600 rounded"></span>
                      URAIAN PENJUALAN PER TOKO
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed font-sans mt-0.5">
                      Rincian detail volume pencapaian transaksi aktual vs target kontribusi per kategori untuk setiap toko
                    </p>
                  </div>

                  {/* Filters Row */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search box for filtering specific stores */}
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search className="w-4 h-4 text-slate-400" />
                      </span>
                      <input
                        type="text"
                        placeholder="Cari Kode Toko..."
                        value={pencapaianSearchQuery}
                        onChange={(e) => setPencapaianSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-1.5 text-xs bg-slate-100 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-sans font-medium"
                      />
                    </div>

                    {/* Toko Dropdown Filter (Store and Semua) */}
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Pilih Toko:</span>
                    <select
                      value={selectedPencapaianStore}
                      onChange={(e) => setSelectedPencapaianStore(e.target.value)}
                      className="text-xs font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 transition-all font-sans"
                    >
                      <option value="ALL">SEMUA TOKO</option>
                      {uniqueSalespersons.map((store) => (
                        <option key={store} value={store}>
                          {store}
                        </option>
                      ))}
                    </select>

                    {/* Date Dropdown */}
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Pilih Tanggal:</span>
                    <select
                      value={selectedPencapaianDate}
                      onChange={(e) => setSelectedPencapaianDate(e.target.value)}
                      className="text-xs font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 transition-all font-sans"
                    >
                      <option value="ALL">SEMUA HARI</option>
                      {uniqueDates.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table container with responsive design */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                        <th 
                          id="th-pencapaian-toko"
                          onClick={() => handleSortPencapaian("store")}
                          className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 cursor-pointer select-none transition-all uppercase"
                        >
                          <div className="flex items-center gap-1 justify-start">
                            <span>Toko</span>
                            {pencapaianSortField === "store" ? (
                              <span className="text-blue-500 font-sans text-[10px]">{pencapaianSortDirection === "asc" ? "▲" : "▼"}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-sans text-[9px]">⇅</span>
                            )}
                          </div>
                        </th>
                        <th 
                          id="th-pencapaian-psm"
                          onClick={() => handleSortPencapaian("psm")}
                          className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 cursor-pointer select-none transition-all uppercase text-center"
                        >
                          <div className="flex items-center gap-1 justify-center">
                            <span>PSM</span>
                            {pencapaianSortField === "psm" ? (
                              <span className="text-blue-500 font-sans text-[10px]">{pencapaianSortDirection === "asc" ? "▲" : "▼"}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-sans text-[9px]">⇅</span>
                            )}
                          </div>
                        </th>
                        <th 
                          id="th-pencapaian-serba"
                          onClick={() => handleSortPencapaian("serba")}
                          className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 cursor-pointer select-none transition-all uppercase text-center"
                        >
                          <div className="flex items-center gap-1 justify-center">
                            <span>SERBA GRATIS</span>
                            {pencapaianSortField === "serba" ? (
                              <span className="text-blue-500 font-sans text-[10px]">{pencapaianSortDirection === "asc" ? "▲" : "▼"}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-sans text-[9px]">⇅</span>
                            )}
                          </div>
                        </th>
                        <th 
                          id="th-pencapaian-pwp"
                          onClick={() => handleSortPencapaian("pwp")}
                          className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 cursor-pointer select-none transition-all uppercase text-center font-bold"
                        >
                          <div className="flex items-center gap-1 justify-center">
                            <span>PWP</span>
                            {pencapaianSortField === "pwp" ? (
                              <span className="text-blue-500 font-sans text-[10px]">{pencapaianSortDirection === "asc" ? "▲" : "▼"}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-sans text-[9px]">⇅</span>
                            )}
                          </div>
                        </th>
                        <th 
                          id="th-pencapaian-seger"
                          onClick={() => handleSortPencapaian("seger")}
                          className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 cursor-pointer select-none transition-all uppercase text-center"
                        >
                          <div className="flex items-center gap-1 justify-center">
                            <span>SEGER</span>
                            {pencapaianSortField === "seger" ? (
                              <span className="text-blue-500 font-sans text-[10px]">{pencapaianSortDirection === "asc" ? "▲" : "▼"}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-sans text-[9px]">⇅</span>
                            )}
                          </div>
                        </th>
                        <th 
                          id="th-pencapaian-rtd"
                          onClick={() => handleSortPencapaian("rtd")}
                          className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 cursor-pointer select-none transition-all uppercase text-center"
                        >
                          <div className="flex items-center gap-1 justify-center">
                            <span>RTD COFFEDAY</span>
                            {pencapaianSortField === "rtd" ? (
                              <span className="text-blue-500 font-sans text-[10px]">{pencapaianSortDirection === "asc" ? "▲" : "▼"}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-sans text-[9px]">⇅</span>
                            )}
                          </div>
                        </th>
                        <th 
                          id="th-pencapaian-ceban"
                          onClick={() => handleSortPencapaian("ceban")}
                          className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 cursor-pointer select-none transition-all uppercase text-center"
                        >
                          <div className="flex items-center gap-1 justify-center">
                            <span>CEBAN</span>
                            {pencapaianSortField === "ceban" ? (
                              <span className="text-blue-500 font-sans text-[10px]">{pencapaianSortDirection === "asc" ? "▲" : "▼"}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-sans text-[9px]">⇅</span>
                            )}
                          </div>
                        </th>
                        <th 
                          id="th-pencapaian-telur"
                          onClick={() => handleSortPencapaian("telur")}
                          className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 cursor-pointer select-none transition-all uppercase text-center font-bold"
                        >
                          <div className="flex items-center gap-1 justify-center">
                            <span>TELUR</span>
                            {pencapaianSortField === "telur" ? (
                              <span className="text-blue-500 font-sans text-[10px]">{pencapaianSortDirection === "asc" ? "▲" : "▼"}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-sans text-[9px]">⇅</span>
                            )}
                          </div>
                        </th>
                        <th 
                          id="th-pencapaian-toys"
                          onClick={() => handleSortPencapaian("toys")}
                          className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 cursor-pointer select-none transition-all uppercase text-center"
                        >
                          <div className="flex items-center gap-1 justify-center">
                            <span>TOYS</span>
                            {pencapaianSortField === "toys" ? (
                              <span className="text-blue-500 font-sans text-[10px]">{pencapaianSortDirection === "asc" ? "▲" : "▼"}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-sans text-[9px]">⇅</span>
                            )}
                          </div>
                        </th>
                        <th 
                          id="th-pencapaian-member"
                          onClick={() => handleSortPencapaian("member")}
                          className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 cursor-pointer select-none transition-all uppercase text-center"
                        >
                          <div className="flex items-center gap-1 justify-center">
                            <span>NEW MEMBER</span>
                            {pencapaianSortField === "member" ? (
                              <span className="text-blue-500 font-sans text-[10px]">{pencapaianSortDirection === "asc" ? "▲" : "▼"}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-sans text-[9px]">⇅</span>
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-[11.5px] font-sans">
                      {(() => {
                        const filtered = pencapaianStoresBreakdown.filter(item => {
                          const matchesQuery = item.store.toLowerCase().includes(pencapaianSearchQuery.toLowerCase());
                          const matchesStore = selectedPencapaianStore === "ALL" || item.store === selectedPencapaianStore;
                          return matchesQuery && matchesStore;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={10} className="py-8 text-center text-slate-400 italic font-mono">
                                Tidak ada toko yang cocok dengan pencarian / filter
                              </td>
                            </tr>
                          );
                        }

                        // Helper formatting achievement badge
                        const renderPill = (actual: number, target: number, pct: number, label?: string) => {
                          const formattedPct = pct.toFixed(0);
                          let colorClass = "text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20";
                          let dotColor = "bg-rose-500";
                          if (pct >= 100) {
                            colorClass = "text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20";
                            dotColor = "bg-emerald-500";
                          } else if (pct >= 70) {
                            colorClass = "text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20";
                            dotColor = "bg-amber-500";
                          }

                          return (
                            <div className="flex flex-col items-center space-y-1 py-1">
                              <div className="flex items-center gap-1 font-mono font-bold text-slate-700 dark:text-slate-200">
                                <span>{actual.toLocaleString("id-ID")}</span>
                                <span className="text-slate-400/80 font-normal">/</span>
                                <span className="text-slate-400 dark:text-slate-400 font-medium">{Math.round(target).toLocaleString("id-ID")}</span>
                                {label && (
                                  <span className="ml-1 px-1.5 py-0.5 text-[8px] font-mono font-extrabold rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/40 uppercase leading-none select-none tracking-tight">
                                    {label}
                                  </span>
                                )}
                              </div>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-extrabold rounded ${colorClass}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                                {formattedPct}%
                              </span>
                            </div>
                          );
                        };

                        return filtered.map((item) => (
                          <tr key={item.store} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/10 transition-colors">
                            <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800/40">{item.store}</td>
                            <td className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-800/40">{renderPill(item.psm.actual, item.psm.target, item.psm.pct)}</td>
                            <td className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-800/40">{renderPill(item.serba.actual, item.serba.target, item.serba.pct)}</td>
                            <td className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-800/40">{renderPill(item.pwp.actual, item.pwp.target, item.pwp.pct)}</td>
                            <td className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-800/40">{renderPill(item.seger.actual, item.seger.target, item.seger.pct)}</td>
                            <td className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-800/40">
                              {(() => {
                                const normStore = normalizeStoreCode(item.store);
                                if (normStore === "KF47" || normStore === "K288") {
                                  return (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold bg-slate-50 dark:bg-slate-800/40 py-1 px-2.5 rounded border border-slate-200/50 dark:border-slate-800/60 font-mono select-none uppercase tracking-wider">TIDAK MAIN</span>
                                  );
                                }
                                return item.rtd.isEligible ? (
                                  renderPill(item.rtd.actual, item.rtd.target, item.rtd.pct)
                                ) : (
                                  renderPill(item.rtd.actual, item.rtd.target, item.rtd.pct, "BASIC")
                                );
                              })()}
                            </td>
                            <td className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-800/40">{renderPill(item.ceban.actual, item.ceban.target, item.ceban.pct)}</td>
                            <td className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-800/40">{renderPill(item.telur.actual, item.telur.target, item.telur.pct)}</td>
                            <td className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-800/40">{renderPill(item.toys.actual, item.toys.target, item.toys.pct)}</td>
                            <td className="py-3 px-4 text-center">{renderPill(item.member.actual, item.member.target, item.member.pct)}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>


              </div>

              {/* Section Divider for Fokus Marketing Details */}
              <div className="border-t border-slate-200/80 dark:border-slate-800/80 my-10 pt-8" />

              <div className="hidden">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                    <span className="w-1.5 h-5 bg-blue-600 rounded"></span>
                    PENCAPAIAN VS TARGET FOKUS MARKETING {activeMonthName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                    Perbandingan total volume pencapaian transaksi aktual terhadap performa target yang ditentukan per kategori fokus marketing
                  </p>
                </div>

                {/* 4 KPI Summary Metric Cards Column Layout */}
                <div id="marketing-metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KPICard
                    title="ACTUAL CEBAN"
                    value={`${(actuals?.cebanActual ?? 0).toLocaleString("id-ID")} Pcs`}
                    subtitle={`Target: ${Math.round(targets?.ceban ?? 0).toLocaleString("id-ID")} Pcs`}
                    icon={<span className="font-extrabold font-mono text-[11px] tracking-wide h-6 w-6 flex items-center justify-center select-none">CBN</span>}
                    trend={{ label: `${cebanPercentage.toFixed(1)}% Tercapai`, isPositive: cebanPercentage >= 100 }}
                    color="blue"
                    delay={0}
                  />
                  <KPICard
                    title="ACTUAL TELUR"
                    value={`${(actuals?.telurActual ?? 0).toLocaleString("id-ID")} Pcs`}
                    subtitle={`Target: ${Math.round(targets?.telur ?? 0).toLocaleString("id-ID")} Pcs`}
                    icon={<span className="font-extrabold font-mono text-[11px] tracking-wide h-6 w-6 flex items-center justify-center select-none">TLR</span>}
                    trend={{ label: `${telurPercentage.toFixed(1)}% Tercapai`, isPositive: telurPercentage >= 100 }}
                    color="purple"
                    delay={0.05}
                  />
                  <KPICard
                    title="ACTUAL TOYS"
                    value={`${(actuals?.toysActual ?? 0).toLocaleString("id-ID")} Pcs`}
                    subtitle={`Target: ${Math.round(targets?.toys ?? 0).toLocaleString("id-ID")} Pcs`}
                    icon={<span className="font-extrabold font-mono text-[11px] tracking-wide h-6 w-6 flex items-center justify-center select-none">TYS</span>}
                    trend={{ label: `${toysPercentage.toFixed(1)}% Tercapai`, isPositive: toysPercentage >= 100 }}
                    color="orange"
                    delay={0.1}
                  />
                  <KPICard
                    title="ACTUAL NEW MEMBER"
                    value={`${(actuals?.newMemberActual ?? 0).toLocaleString("id-ID")} Member`}
                    subtitle={`Target: ${Math.round(targets?.new_member ?? 0).toLocaleString("id-ID")} Member`}
                    icon={<span className="font-extrabold font-mono text-[11px] tracking-wide h-6 w-6 flex items-center justify-center select-none">MBR</span>}
                    trend={{ label: `${newMemberPercentage.toFixed(1)}% Tercapai`, isPositive: newMemberPercentage >= 100 }}
                    color="green"
                    delay={0.15}
                  />
                </div>

                {/* Visualizer multi-perspective charts for Marketing categories */}
                <div className="mt-8">
                  <DashboardCharts
                    records={records}
                    monthlyTrend={monthlyChartData}
                    categoryBreakdown={categoryChartData}
                    regionBreakdown={regionalData}
                    targets={targets}
                    allowedCategories={["CEBAN", "TELUR", "TOYS", "NEW MEMBER"]}
                  />
                </div>

                {/* Toko Target Comparison rankings panel for Marketing indicators */}
                <TokoPerformanceRank
                  selectedRankIndicator={selectedMarketingRankIndicator}
                  setSelectedRankIndicator={setSelectedMarketingRankIndicator}
                  selectedRankDate={selectedMarketingRankDate}
                  setSelectedRankDate={setSelectedMarketingRankDate}
                  uniqueDates={uniqueDates}
                  rankData={marketingRankData}
                  allowedIndicators={["CEBAN", "TELUR", "TOYS", "NEW MEMBER"]}
                />

                {/* Main Uraian Per Toko Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800/80 pb-5">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 font-sans">
                        <Store className="w-5 h-5 text-blue-600" />
                        URAIAN PENJUALAN PER TOKO
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold font-sans">
                        Daftar rincian kuantitas aktual penjualan yang diraih setiap toko untuk seluruh produk fokus pemasaran.
                      </p>
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search Field */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input
                          type="text"
                          placeholder="Cari kode toko..."
                          value={marketingSearchQuery}
                          onChange={(e) => setMarketingSearchQuery(e.target.value)}
                          className="text-xs font-semibold pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                        />
                      </div>

                      {/* Date Dropdown */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Pilih Tanggal:</span>
                        <select
                          value={selectedMarketingDate}
                          onChange={(e) => setSelectedMarketingDate(e.target.value)}
                          className="text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                        >
                          <option value="ALL">SEMUA HARI</option>
                          {uniqueDates.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Computed Selection Summary */}
                  {(() => {
                    const filtered = marketingStoresBreakdown.filter(item => 
                      item.store.toLowerCase().includes(marketingSearchQuery.toLowerCase())
                    );
                    
                    let totalCeban = 0;
                    let totalTelur = 0;
                    let totalToys = 0;
                    let totalMember = 0;

                    filtered.forEach(item => {
                      totalCeban += item.ceban.actual;
                      totalTelur += item.telur.actual;
                      totalToys += item.toys.actual;
                      totalMember += item.member.actual;
                    });

                    // Helper formatting achievement badge
                    const renderMarketingPill = (actual: number, target: number, pct: number, label?: string) => {
                      const formattedPct = pct.toFixed(0);
                      let colorClass = "text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20";
                      let dotColor = "bg-rose-500";
                      if (pct >= 100) {
                        colorClass = "text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20";
                        dotColor = "bg-emerald-500";
                      } else if (pct >= 70) {
                        colorClass = "text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20";
                        dotColor = "bg-amber-500";
                      }

                      return (
                        <div className="flex flex-col items-center space-y-1 py-1">
                          <div className="flex items-center gap-1 font-mono font-bold text-slate-700 dark:text-slate-200">
                            <span>{actual.toLocaleString("id-ID")}</span>
                            <span className="text-slate-400/80 font-normal">/</span>
                            <span className="text-slate-400 dark:text-slate-400 font-medium">{Math.round(target).toLocaleString("id-ID")}</span>
                            {label && (
                              <span className="ml-1 px-1.5 py-0.5 text-[8px] font-mono font-extrabold rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/40 uppercase leading-none select-none tracking-tight">
                                {label}
                              </span>
                            )}
                          </div>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-extrabold rounded ${colorClass}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                            {formattedPct}%
                          </span>
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-6">
                        {/* Summary Badges Panel */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                          <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 rounded-lg shadow-2xs">
                            <span className="text-[9px] font-bold text-sky-500 block uppercase font-mono">Total Ceban</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                              {totalCeban.toLocaleString("id-ID")} <span className="text-[9px] font-normal text-slate-400">Pcs</span>
                            </span>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 rounded-lg shadow-2xs">
                            <span className="text-[9px] font-bold text-indigo-500 block uppercase font-mono">Total Telur</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                              {totalTelur.toLocaleString("id-ID")} <span className="text-[9px] font-normal text-slate-400">Pcs</span>
                            </span>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 rounded-lg shadow-2xs">
                            <span className="text-[9px] font-bold text-amber-500 block uppercase font-mono">Total Toys</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                              {totalToys.toLocaleString("id-ID")} <span className="text-[9px] font-normal text-slate-400">Pcs</span>
                            </span>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 rounded-lg shadow-2xs">
                            <span className="text-[9px] font-bold text-emerald-500 block uppercase font-mono">Total Member</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                              {totalMember.toLocaleString("id-ID")} <span className="text-[9px] font-normal text-slate-400">Mbr</span>
                            </span>
                          </div>
                        </div>

                        {/* Store detail listing */}
                        {filtered.length === 0 ? (
                          <div className="py-12 border border-dashed border-slate-150 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-400 dark:text-slate-500 italic font-sans bg-slate-50/20">
                            Tidak ada data toko yang cocok dengan pencarian
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-150 dark:border-slate-800/40 rounded-xl">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50/70 dark:bg-slate-850/40 border-b border-slate-150 dark:border-slate-800/60">
                                  <th className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 uppercase">Toko</th>
                                  <th className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 uppercase text-center">CEBAN</th>
                                  <th className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 uppercase text-center">TELUR</th>
                                  <th className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 uppercase text-center font-bold">TOYS</th>
                                  <th className="py-3 px-4 text-[10px] font-mono font-extrabold tracking-wider text-slate-400 uppercase text-center">NEW MEMBER</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-[11.5px] font-sans">
                                {filtered.map((item) => (
                                  <tr key={item.store} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/10 transition-colors">
                                    <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800/40">{item.store}</td>
                                    <td className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-800/40">{renderMarketingPill(item.ceban.actual, item.ceban.target, item.ceban.pct)}</td>
                                    <td className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-800/40">{renderMarketingPill(item.telur.actual, item.telur.target, item.telur.pct)}</td>
                                    <td className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-800/40">{renderMarketingPill(item.toys.actual, item.toys.target, item.toys.pct)}</td>
                                    <td className="py-3 px-4 text-center">{renderMarketingPill(item.member.actual, item.member.target, item.member.pct)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}

          {activeMenuTab === "dashboard" && (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="mt-8 mb-5">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                  <span className="w-1.5 h-5 bg-blue-600 rounded"></span>
                  DASHBOARD {activeMonthName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                  Detail monitoring masukan data real-time, ringkasan transaksi per toko, serta filter visual riwayat log.
                </p>
              </div>

              {/* RANGKUMAN UTAMA SHEET DASHBOARD */}
              <div id="dashboard-sheet-summary" className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-visible group">
                <div className="flex items-start justify-between mb-5">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 tracking-wide uppercase font-mono">
                      RANGKUMAN DATA SHEET DASHBOARD
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-sans">
                      Akumulasi total inputan, volume indikator, dan performa keseluruhan toko dari database log
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                </div>

                {/* Grid 3 Mini Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono block mb-1">
                      TOTAL TOKO AKTIF
                    </span>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
                      {uniqueSalespersons.length.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Outlet Aktif</span>
                  </div>
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono block mb-1">
                      TOTAL TOKO RTD COFFEDAY
                    </span>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
                      {activeRtdStoresCount.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Outlet RTD</span>
                  </div>
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono block mb-1">
                      TOTAL HARI
                    </span>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
                      {totalDaysWithIndicators.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Hari Terinput di Dashboard</span>
                  </div>
                </div>

                {/* Subtitle list of values */}
                <div className="mb-4">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Analisis performa mendalam yang dikelompokkan berdasarkan kategori prioritas nasional dan fokus pemasaran harian.
                  </p>
                </div>

                {/* Section A: PENCAPAIAN VS TARGET (ITEM FOKUS) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="w-1 h-3.5 bg-blue-600 rounded"></span>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider font-mono">
                      PENCAPAIAN VS TARGET (ITEM FOKUS)
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: "PSM", actual: actuals?.psmActual ?? 0, target: adjustedPsmTarget, pct: psmPercentage, unit: "Pcs", color: "from-blue-500 to-indigo-500" },
                      { name: "SERBA GRATIS", actual: actuals?.serbaActual ?? 0, target: adjustedSerbaTarget, pct: serbaPercentage, unit: "Pkt", color: "from-purple-500 to-fuchsia-500" },
                      { name: "PWP", actual: actuals?.pwpActual ?? 0, target: adjustedPwpTarget, pct: pwpPercentage, unit: "Pcs", color: "from-orange-500 to-amber-500" },
                      { name: "SEGER", actual: actuals?.segerActual ?? 0, target: adjustedSegerTarget, pct: segerPercentage, unit: "Pcs", color: "from-teal-500 to-emerald-500" },
                      { name: "RTD COFFEDAY", actual: actuals?.rtdActual ?? 0, target: adjustedRtdTarget, pct: rtdPercentage, unit: "Pcs", color: "from-pink-500 to-rose-500" },
                      { name: "RTD BASIC", actual: actuals?.rtdBasicActual ?? 0, target: adjustedRtdBasicTarget, pct: rtdBasicPercentage, unit: "Pcs", color: "from-rose-400 to-pink-500" },
                    ].map((indicator) => {
                      const progressVal = Math.min(indicator.pct, 100);
                      return (
                        <div key={indicator.name} className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/50 rounded-xl flex flex-col justify-between shadow-xs hover:border-slate-200 dark:hover:border-slate-800 transition-all duration-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <div>
                              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 tracking-tight font-sans block">
                                {indicator.name}
                              </span>
                              {indicator.name === "RTD COFFEDAY" && (
                                <span className="text-[8px] font-black font-mono text-rose-500 tracking-wide block uppercase mt-0.5">
                                  SENIN, RABU, JUMAT
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${indicator.pct >= 100 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 md:dark:bg-emerald-950/80" : "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"}`}>
                              {indicator.pct.toFixed(0)}%
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between text-[11px]">
                              <span className="text-slate-400 dark:text-slate-500 font-semibold">Aktual:</span>
                              <span className="font-mono font-black text-slate-800 dark:text-slate-100">
                                {indicator.actual.toLocaleString("id-ID")} <span className="text-[9px] font-normal text-slate-400">{indicator.unit}</span>
                              </span>
                            </div>
                            
                            <div className="flex items-baseline justify-between text-[10px]">
                              <span className="text-slate-400 dark:text-slate-500 font-bold">Target:</span>
                              <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                                {Math.round(indicator.target).toLocaleString("id-ID")} <span className="text-[9px] font-normal text-slate-400">{indicator.unit}</span>
                              </span>
                            </div>

                            {/* Mini Progress Bar Line */}
                            <div className="w-full bg-slate-200 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden mt-1.5">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressVal}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className={`h-full bg-gradient-to-r ${indicator.color}`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section B: PENCAPAIAN VS TARGET (FOKUS MARKETING) */}
                <div className="space-y-3 mt-6">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="w-1 h-3.5 bg-emerald-500 rounded"></span>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider font-mono">
                      PENCAPAIAN VS TARGET (FOKUS MARKETING)
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { name: "CEBAN", actual: actuals?.cebanActual ?? 0, target: targets?.ceban ?? 0, pct: cebanPercentage, unit: "Pcs", color: "from-sky-500 to-blue-500" },
                      { name: "TELUR", actual: actuals?.telurActual ?? 0, target: targets?.telur ?? 0, pct: telurPercentage, unit: "Pcs", color: "from-indigo-500 to-violet-500" },
                      { name: "TOYS", actual: actuals?.toysActual ?? 0, target: targets?.toys ?? 0, pct: toysPercentage, unit: "Pcs", color: "from-amber-500 to-orange-500" },
                      { name: "NEW MEMBER", actual: actuals?.newMemberActual ?? 0, target: targets?.new_member ?? 0, pct: newMemberPercentage, unit: "Member", color: "from-emerald-500 to-green-500" },
                    ].map((indicator) => {
                      const progressVal = Math.min(indicator.pct, 100);
                      return (
                        <div key={indicator.name} className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/50 rounded-xl flex flex-col justify-between shadow-xs hover:border-slate-200 dark:hover:border-slate-800 transition-all duration-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 tracking-tight font-sans">
                              {indicator.name}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${indicator.pct >= 100 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 md:dark:bg-emerald-950/80" : "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"}`}>
                              {indicator.pct.toFixed(0)}%
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between text-[11px]">
                              <span className="text-slate-400 dark:text-slate-500 font-semibold">Aktual:</span>
                              <span className="font-mono font-black text-slate-800 dark:text-slate-100">
                                {indicator.actual.toLocaleString("id-ID")} <span className="text-[9px] font-normal text-slate-400">{indicator.unit}</span>
                              </span>
                            </div>
                            
                            <div className="flex items-baseline justify-between text-[10px]">
                              <span className="text-slate-400 dark:text-slate-500 font-bold">Target:</span>
                              <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                                {Math.round(indicator.target).toLocaleString("id-ID")} <span className="text-[9px] font-normal text-slate-400">{indicator.unit}</span>
                              </span>
                            </div>

                            {/* Mini Progress Bar Line */}
                            <div className="w-full bg-slate-200 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden mt-1.5">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressVal}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className={`h-full bg-gradient-to-r ${indicator.color}`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-visible group">
                {/* Soft backdrop radial glow */}
                <div className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500 bg-blue-500" />
                
                <div className="h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase font-mono">
                          INPUT DATA TRANSAKSI
                        </p>
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 font-sans">
                          Dropdown semua data yg diinput setiap toko per tanggal
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-blue-500 dark:text-blue-400 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <Database className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Dropdowns Row */}
                    <div className="grid grid-cols-2 gap-3 mt-5">
                      {/* Dropdown Toko */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">
                          PILIH TOKO / KODE
                        </label>
                        <select
                          id="log-store-select"
                          value={selectedLogStore}
                          onChange={(e) => setSelectedLogStore(e.target.value)}
                          className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2.5 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer shadow-sm"
                        >
                          <option value="ALL">SEMUA TOKO</option>
                          {uniqueSalespersons.map((store) => (
                            <option key={store} value={store}>
                              {store}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dropdown Tanggal */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">
                          PILIH TANGGAL
                        </label>
                        <select
                          id="log-date-select"
                          value={selectedLogDate}
                          onChange={(e) => setSelectedLogDate(e.target.value)}
                          className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2.5 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer shadow-sm"
                        >
                          <option value="ALL">SEMUA HARI</option>
                          {uniqueDates.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Log List View (No scroll height limits, fully expanded) */}
                    <div className="mt-5 space-y-4">
                      {filteredLogRecords.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 italic font-sans">
                          Tidak ada data inputan yang cocok
                        </div>
                      ) : selectedLogStore === "ALL" ? (
                        // Aggregate view for ALL STORE (both single date and all dates combinations), DO NOT elaborate per store!
                        <div className="space-y-2 border-l-2 border-emerald-500/50 pl-3">
                          <div className="flex items-center gap-2 pt-1">
                            <span className="font-mono font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] tracking-wide border border-emerald-100/35 dark:border-emerald-800/40">
                              REKAP TOTAL: SEMUA TOKO {selectedLogDate === "ALL" ? "& SEMUA TANGGAL" : `- TANGGAL ${selectedLogDate}`}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold font-sans">
                              ({getGroupedByIndicator(filteredLogRecords).length} indikator)
                            </span>
                          </div>

                          <div className="space-y-1.5 ml-1">
                            {getGroupedByIndicator(filteredLogRecords).map((item, itemIdx) => {
                              return (
                                <div
                                  key={itemIdx}
                                  className="px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl flex items-center justify-between text-xs transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-900/30 font-bold"
                                >
                                  <span className="text-slate-700 dark:text-slate-300 font-sans tracking-wide">
                                    {item.name}
                                  </span>
                                  <span className="font-mono text-slate-800 dark:text-slate-100">
                                    {item.quantity.toLocaleString("id-ID")} {item.unit}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        // Single store view: listing details directly without salesperson repeated
                        getGroupedByIndicator(filteredLogRecords).map((item, index) => {
                          return (
                            <div
                              key={index}
                              className="px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl flex items-center justify-between text-xs transition-all hover:bg-slate-100/50 dark:hover:bg-slate-900/30 font-bold"
                            >
                              <span className="text-slate-700 dark:text-slate-300 font-sans tracking-wide">
                                {item.name}
                              </span>
                              <span className="font-mono text-slate-800 dark:text-slate-100">
                                {item.quantity.toLocaleString("id-ID")} {item.unit}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Stats Footer hidden/removed to keep the UI clean as requested */}
                </div>
              </div>
            </motion.div>
          )}

          {activeMenuTab === "copy_laporan" && (
            <motion.div
              key="copy-laporan-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="mt-8 mb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                  <span className="w-1.5 h-5 bg-blue-600 rounded"></span>
                  COPY LAPORAN HARIAN OPERASIONAL
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                  Sistem otomatis perakit pesan rekapitulasi data harian instan untuk disalin dan dibagikan langsung ke WhatsApp maupun Telegram.
                </p>
              </div>

              {/* Interactive report copying widget */}
              <CopyLaporan
                records={dashboardRecords && dashboardRecords.length > 0 ? dashboardRecords : records}
                uniqueDates={dashboardUniqueDates && dashboardUniqueDates.length > 0 ? dashboardUniqueDates : uniqueDates}
                targets={targets}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Symmetrical footer element */}
      <footer className="py-12 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 mt-16 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 text-slate-450 dark:text-slate-500 font-sans tracking-wide">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-slate-600 dark:text-slate-400">
            <span className="font-bold">Rekap Penjualan Dashboard App</span>
            <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-serif lowercase">v1.1</span>
          </div>
          <p className="mb-4">
            Terhubung secara aman dengan Google Sheets lewat token Firebase OAuth sandbox 2026. Seluruh rincian data disinkronisasikan secara dinamis.
          </p>
          <div className="flex items-center justify-center gap-4 text-slate-400">
            <span>Google Workspaces API</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span>React App Client</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
