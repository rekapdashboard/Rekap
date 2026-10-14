import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MonthlyTrend, CategoryBreakdown, RegionBreakdown, SalesRecord, TargetData } from "../types";
import { TrendingUp, BarChart3, PieChart, MapPin, Filter, Store } from "lucide-react";
import { getMonthlyTrend, getRegionBreakdown, normalizeDateStr, normalizeStoreCode, isStoreActive } from "../utils/sheetsParser";

interface ChartsProps {
  records: SalesRecord[];
  monthlyTrend: MonthlyTrend[];
  categoryBreakdown: CategoryBreakdown[];
  regionBreakdown: RegionBreakdown[];
  targets?: TargetData;
  allowedCategories?: string[];
}

const ALL_INDICATORS = ["PSM", "SERBA", "PWP", "SEGER", "RTD COFFEDAY", "RTD BASIC", "CEBAN", "TELUR", "TOYS", "NEW MEMBER"];

const indicatorLabels: Record<string, string> = {
  "PSM": "PSM",
  "SERBA": "SERBA GRATIS (SBG)",
  "PWP": "PWP",
  "SEGER": "SEGER (SG)",
  "RTD COFFEDAY": "RTD COFFEDAY",
  "RTD BASIC": "RTD BASIC",
  "CEBAN": "CEBAN",
  "TELUR": "TELUR",
  "TOYS": "TOYS",
  "NEW MEMBER": "NEW MEMBER",
};

const getCategoryDisplayNameAndUnit = (catStr: string) => {
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
  if (clean === "RTD" || clean.includes("COFFE") || clean.includes("RTD")) {
    return { name: "RTD COFFEDAY", unit: "Pcs" };
  }
  if (clean === "RTD BASIC") {
    return { name: "RTD BASIC", unit: "Pcs" };
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
  if (clean === "NEW MEMBER" || clean.includes("MEMBER") || clean === "MBR" || clean.includes("NEW") || clean.includes("ACTUAL NEW")) {
    return { name: "NEW MEMBER", unit: "Member" };
  }
  if (clean === "BOOTLE" || clean.includes("BOOTLE") || clean === "BOTTLE" || clean.includes("BOTTLE") || clean.includes("BOTOL") || clean.includes("SUSU")) {
    return { name: "BOTTLE", unit: "Pcs" };
  }
  return { name: clean, unit: "Pcs" };
};

export function DashboardCharts({ records, monthlyTrend, categoryBreakdown, regionBreakdown, targets, allowedCategories }: ChartsProps) {
  const [selectedStore, setSelectedStore] = useState<string>("ALL");
  const initialCategory = allowedCategories && allowedCategories.length > 0 ? allowedCategories[0] : "PSM";
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [hoveredDailyBar, setHoveredDailyBar] = useState<number | null>(null);
  const [hoveredDailyLine, setHoveredDailyLine] = useState<number | null>(null);

  React.useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  // Extract unique stores/salespeople from records dynamically (active stores only)
  const uniqueStores = React.useMemo(() => {
    const list = records
      .map((r) => r.salesperson)
      .filter((s): s is string => Boolean(s))
      .filter(isStoreActive);
    return Array.from(new Set(list)).sort();
  }, [records]);

  // Filter records dynamically based on selected store and selected category in the dropdowns
  const filteredRecords = React.useMemo(() => {
    const ELIGIBLE_RTD_STORES = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];
    return records.filter((r) => {
      // 1. Store Filter
      if (selectedStore !== "ALL" && r.salesperson !== selectedStore) {
        return false;
      }
      
      // 2. Category Filter
      const mapped = getCategoryDisplayNameAndUnit(r.category || "");
      if (selectedCategory === "RTD BASIC") {
        if (mapped.name !== "RTD COFFEDAY") return false;
        const normCode = normalizeStoreCode(r.salesperson || "");
        return !ELIGIBLE_RTD_STORES.includes(normCode);
      } else if (selectedCategory === "RTD COFFEDAY") {
        if (mapped.name !== "RTD COFFEDAY") return false;
        const normCode = normalizeStoreCode(r.salesperson || "");
        return ELIGIBLE_RTD_STORES.includes(normCode);
      }
      return mapped.name === selectedCategory;
    });
  }, [records, selectedStore, selectedCategory]);

  // Fallback to initial default targets if not present from sheets
  const defaultTargets: TargetData = {
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
  const activeTargets = targets || defaultTargets;

  // Compute daily target dynamically adjusted for category and chosen store filter context
  const targetVal = React.useMemo(() => {
    const ELIGIBLE_RTD_STORES = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];
    let keyStr = selectedCategory.toLowerCase();
    if (keyStr === "new member") {
      keyStr = "new_member";
    } else if (keyStr === "rtd coffeday" || keyStr === "rtd basic") {
      keyStr = "rtd";
    }
    const key = keyStr as keyof Omit<TargetData, "targetsByDate">;
    const baseTarget = Number(activeTargets[key]) || 0;
    
    // Total unique days with transactions in the database
    const allDates = Array.from(new Set(records.map((r) => r.date).filter((d): d is string => Boolean(d))));
    const numDates = Math.max(allDates.length, 1);
    
    if (selectedStore === "ALL") {
      if (selectedCategory === "RTD COFFEDAY") {
        const allStores = Array.from(new Set(records.map((r) => r.salesperson).filter((s): s is string => Boolean(s)).filter(isStoreActive))) as string[];
        const eligibleCount = allStores.filter(st => ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(st))).length;
        const totalStores = Math.max(allStores.length, 1);
        const storeRatio = eligibleCount / totalStores;
        return (baseTarget * storeRatio) / numDates;
      } else if (selectedCategory === "RTD BASIC") {
        const allStores = Array.from(new Set(records.map((r) => r.salesperson).filter((s): s is string => Boolean(s)).filter(isStoreActive))) as string[];
        const basicCount = allStores.filter(st => !ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(st))).length;
        const totalStores = Math.max(allStores.length, 1);
        const storeRatio = basicCount / totalStores;
        return (baseTarget * storeRatio) / numDates;
      }
      // Target shared across all stores per day
      return baseTarget / numDates;
    } else {
      // Target for a single specific store per day
      const normStore = normalizeStoreCode(selectedStore);
      const isSpecialStore = ELIGIBLE_RTD_STORES.includes(normStore);
      if (selectedCategory === "RTD COFFEDAY" && !isSpecialStore) {
        return 0; // ineligible store doesn't get RTD Coffeday target
      }
      if (selectedCategory === "RTD BASIC" && isSpecialStore) {
        return 0; // special store doesn't get RTD Basic target
      }
      const allStores = Array.from(new Set(records.map((r) => r.salesperson).filter((s): s is string => Boolean(s))));
      const numStores = Math.max(allStores.length, 1);
      return baseTarget / (numDates * numStores);
    }
  }, [selectedCategory, selectedStore, activeTargets, records]);

  // Dynamically compute daily trend data (qty and input count) Specifically filtered for that category & store
  const dynamicDailyTrend = React.useMemo(() => {
    const map: Record<string, { dateStr: string; qty: number; inputs: number; totalSales: number; displayDate: string }> = {};

    filteredRecords.forEach((r) => {
      const rawDate = r.date || "Unknown";
      if (!map[rawDate]) {
        let display = rawDate;
        // Extract only the day part, such as "12" or "11"
        const dmyMatch = rawDate.match(/^(\d{1,2})[-/](\d{1,2})[-/]/);
        if (dmyMatch) {
          display = dmyMatch[1].padStart(2, "0");
        } else {
          const ymdMatch = rawDate.match(/^\d{4}[-/](\d{1,2})[-/](\d{1,2})/);
          if (ymdMatch) {
            display = ymdMatch[2].padStart(2, "0");
          } else {
            // Check for standalone 1-2 digit number representing the date
            const firstNumMatch = rawDate.match(/\b(\d{1,2})\b/);
            if (firstNumMatch) {
              display = firstNumMatch[1].padStart(2, "0");
            }
          }
        }
        map[rawDate] = {
          dateStr: rawDate,
          qty: 0,
          inputs: 0,
          totalSales: 0,
          displayDate: display,
        };
      }
      map[rawDate].qty += r.quantity || 0;
      map[rawDate].inputs += 1;
      map[rawDate].totalSales += r.total || 0;
    });

    return Object.values(map).sort((a, b) => {
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
      return parseDate(a.dateStr) - parseDate(b.dateStr);
    });
  }, [filteredRecords]);

  // Keep dynamicMonthlyTrend for reference/safety if used elsewhere, but focus on Daily
  const dynamicMonthlyTrend = dynamicDailyTrend;

  // Number of unique stores to compute store division
  const numStores = React.useMemo(() => {
    const allStores = Array.from(new Set(records.map((r) => r.salesperson).filter((s): s is string => Boolean(s)).filter(isStoreActive)));
    return Math.max(allStores.length, 1);
  }, [records]);

  // Total unique dates
  const numDates = React.useMemo(() => {
    const allDates = Array.from(new Set(records.map((r) => r.date).filter((d): d is string => Boolean(d))));
    return Math.max(allDates.length, 1);
  }, [records]);

  // Compute points with their specific targets
  const trendPointsWithTargets = React.useMemo(() => {
    let keyStr = selectedCategory.toLowerCase();
    if (keyStr === "new member") {
      keyStr = "new_member";
    } else if (keyStr === "rtd coffeday" || keyStr === "rtd basic") {
      keyStr = "rtd";
    }
    const key = keyStr as keyof Omit<TargetData, "targetsByDate" | "targetsByStoreAndDate">;
    const ELIGIBLE_RTD_STORES = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];

    return dynamicDailyTrend.map((t) => {
      const normDate = normalizeDateStr(t.dateStr);
      let dayTarget = 0;

      if (selectedStore === "ALL") {
        if (selectedCategory === "RTD COFFEDAY") {
          const storeAndDateTargets = activeTargets.targetsByStoreAndDate;
          if (storeAndDateTargets) {
            let sumEligibleDay = 0;
            Object.keys(storeAndDateTargets).forEach((storeCode) => {
              const normSt = normalizeStoreCode(storeCode);
              if (ELIGIBLE_RTD_STORES.includes(normSt)) {
                const dateTargetsObj = storeAndDateTargets[storeCode]?.[normDate];
                if (dateTargetsObj && typeof dateTargetsObj.rtd === "number") {
                  sumEligibleDay += dateTargetsObj.rtd;
                }
              }
            });
            if (sumEligibleDay > 0) {
              dayTarget = sumEligibleDay;
            } else {
              const dateTargets = activeTargets.targetsByDate?.[normDate];
              const baseDayTarget = (dateTargets && typeof dateTargets.rtd === "number" && dateTargets.rtd > 0)
                ? Number(dateTargets.rtd)
                : (Number(activeTargets.rtd || 0) / numDates);
              const allStores = Array.from(new Set(records.map((r) => r.salesperson).filter((s): s is string => Boolean(s)).filter(isStoreActive)));
              const eligibleCount = allStores.filter(st => ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(st))).length;
              const totalStores = Math.max(allStores.length, 1);
              dayTarget = baseDayTarget * (eligibleCount / totalStores);
            }
          } else {
            const dateTargets = activeTargets.targetsByDate?.[normDate];
            const baseDayTarget = (dateTargets && typeof dateTargets.rtd === "number" && dateTargets.rtd > 0)
              ? Number(dateTargets.rtd)
              : (Number(activeTargets.rtd || 0) / numDates);
            const allStores = Array.from(new Set(records.map((r) => r.salesperson).filter((s): s is string => Boolean(s)).filter(isStoreActive)));
            const eligibleCount = allStores.filter(st => ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(st))).length;
            const totalStores = Math.max(allStores.length, 1);
            dayTarget = baseDayTarget * (eligibleCount / totalStores);
          }
        } else if (selectedCategory === "RTD BASIC") {
          const storeAndDateTargets = activeTargets.targetsByStoreAndDate;
          if (storeAndDateTargets) {
            let sumBasicDay = 0;
            Object.keys(storeAndDateTargets).forEach((storeCode) => {
              const normSt = normalizeStoreCode(storeCode);
              if (!ELIGIBLE_RTD_STORES.includes(normSt)) {
                const dateTargetsObj = storeAndDateTargets[storeCode]?.[normDate];
                if (dateTargetsObj && typeof dateTargetsObj.rtd === "number") {
                  sumBasicDay += dateTargetsObj.rtd;
                }
              }
            });
            if (sumBasicDay > 0) {
              dayTarget = sumBasicDay;
            } else {
              const dateTargets = activeTargets.targetsByDate?.[normDate];
              const baseDayTarget = (dateTargets && typeof dateTargets.rtd === "number" && dateTargets.rtd > 0)
                ? Number(dateTargets.rtd)
                : (Number(activeTargets.rtd || 0) / numDates);
              const allStores = Array.from(new Set(records.map((r) => r.salesperson).filter((s): s is string => Boolean(s)).filter(isStoreActive)));
              const basicCount = allStores.filter(st => !ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(st))).length;
              const totalStores = Math.max(allStores.length, 1);
              dayTarget = baseDayTarget * (basicCount / totalStores);
            }
          } else {
            const dateTargets = activeTargets.targetsByDate?.[normDate];
            const baseDayTarget = (dateTargets && typeof dateTargets.rtd === "number" && dateTargets.rtd > 0)
              ? Number(dateTargets.rtd)
              : (Number(activeTargets.rtd || 0) / numDates);
            const allStores = Array.from(new Set(records.map((r) => r.salesperson).filter((s): s is string => Boolean(s)).filter(isStoreActive)));
            const basicCount = allStores.filter(st => !ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(st))).length;
            const totalStores = Math.max(allStores.length, 1);
            dayTarget = baseDayTarget * (basicCount / totalStores);
          }
        } else {
          // Look up total daily target for this date
          const dateTargets = activeTargets.targetsByDate?.[normDate];
          if (dateTargets && typeof dateTargets[key] === "number" && dateTargets[key] > 0) {
            dayTarget = Number(dateTargets[key]);
          } else {
            // Fallback dividing base target amongst dates
            dayTarget = (Number(activeTargets[key] || 0) / numDates);
          }
        }
      } else {
        // Look up specific store target for this date
        const normSelectedStore = normalizeStoreCode(selectedStore);
        const isSpecialStore = ELIGIBLE_RTD_STORES.includes(normSelectedStore);
        if (selectedCategory === "RTD COFFEDAY" && !isSpecialStore) {
          dayTarget = 0;
        } else if (selectedCategory === "RTD BASIC" && isSpecialStore) {
          dayTarget = 0;
        } else {
          const storeTargetsMap = activeTargets.targetsByStoreAndDate?.[normSelectedStore];
          const storeDateTargets = storeTargetsMap?.[normDate];

          if (storeDateTargets && typeof storeDateTargets[key] === "number" && storeDateTargets[key] > 0) {
            dayTarget = Number(storeDateTargets[key]);
          } else {
            // Fallback dividing base target divided amongst dates & stores
            const baseTarget = Number(activeTargets[key] || 0);
            dayTarget = baseTarget / (numDates * numStores);
          }
        }
      }

      return {
        ...t,
        target: dayTarget,
      };
    });
  }, [dynamicDailyTrend, selectedCategory, activeTargets, numDates, selectedStore, numStores, records]);

  const maxQty = React.useMemo(() => {
    return dynamicDailyTrend.length > 0 ? Math.max(...dynamicDailyTrend.map((t) => t.qty)) : 1;
  }, [dynamicDailyTrend]);

  const maxQtyLine = React.useMemo(() => {
    const maxActual = trendPointsWithTargets.length > 0 ? Math.max(...trendPointsWithTargets.map((t) => t.qty)) : 0;
    const maxTarget = trendPointsWithTargets.length > 0 ? Math.max(...trendPointsWithTargets.map((t) => t.target)) : 0;
    return Math.max(maxActual, maxTarget, 1);
  }, [trendPointsWithTargets]);

  const dynamicRegionBreakdown = React.useMemo(() => {
    return selectedCategory === "ALL" ? regionBreakdown : getRegionBreakdown(filteredRecords);
  }, [selectedCategory, regionBreakdown, filteredRecords]);

  // Helper to format currency in Rupiah
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatQty = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num);
  };

  // Chart dimensions config (expanded for beautiful single chart view)
  const chartHeight = 260;
  const chartWidth = 700;
  const paddingLeft = 50;
  const paddingRight = 50; // balanced for double axis label sizing
  const paddingTop = 30;
  const paddingBottom = 40;
  
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const innerWidth = chartWidth - paddingLeft - paddingRight;

  const categoryUnit = React.useMemo(() => {
    return getCategoryDisplayNameAndUnit(selectedCategory).unit;
  }, [selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Consolidated Single Chart Panel with Integrated Store & Category Dual Dropdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/55 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all relative overflow-hidden">
        
        {/* Card Header Area */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/60 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded"></span>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
                Tren Kinerja Harian: Aktual vs Target
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Perbandingan kuantitas penjualan ({selectedCategory}) terhadap target kontribusi {selectedStore !== "ALL" ? `khusus ${selectedStore}` : "seluruh toko"} per tanggal
            </p>
          </div>

          {/* Dual Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Dropdown 1: Pilih Nama Toko */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="chart-store-select"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="text-xs font-bold font-sans bg-transparent border-none text-slate-700 dark:text-slate-200 cursor-pointer outline-none focus:ring-0 min-w-[130px] py-0.5"
              >
                <option value="ALL">SEMUA TOKO</option>
                {uniqueStores.map((store) => (
                  <option key={store} value={store}>
                    {store}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown 2: Pilih Kategori / Indikator */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="chart-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs font-bold font-sans bg-transparent border-none text-slate-700 dark:text-slate-200 cursor-pointer outline-none focus:ring-0 min-w-[110px] py-0.5"
              >
                {(allowedCategories || ALL_INDICATORS).map((cat) => (
                  <option key={cat} value={cat}>
                    {indicatorLabels[cat] || cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 1 Single Wide Beautiful Line Chart Only */}
        {trendPointsWithTargets.length === 0 ? (
          <div className="h-[250px] flex flex-col items-center justify-center text-sm text-slate-400 italic">
            <p>Belum ada data harian untuk filter terpilih</p>
            <span className="text-xs text-slate-500 font-sans not-italic mt-1">Sesuaikan kembali kombinasi filter di atas</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-emerald-500 shadow-sm" />
                <span className="text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider">
                  Grafik Komparasi: Aktual vs Target Harian ({selectedCategory})
                </span>
              </div>
              {/* Custom Color Legend */}
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Aktual ({categoryUnit})
                </span>
                <span className="flex items-center gap-1 text-rose-500 dark:text-rose-450">
                  <span className="w-2.5 h-1.5 rounded-full bg-rose-500 inline-block" style={{ borderStyle: "dashed" }} />
                  Target ({categoryUnit})
                </span>
              </div>
            </div>

            <div className="bg-slate-50/15 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-850/40 rounded-xl p-3 sm:p-4">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto overflow-visible font-sans"
              >
                {/* SVG Definitions for gradients */}
                <defs>
                  <linearGradient id="areaActualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                  </linearGradient>
                  <linearGradient id="areaTargetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {/* Grid Lines with Double-Sided Quantity Scale Labels */}
                {Array.from({ length: 4 }).map((_, idx) => {
                  const y = paddingTop + (idx / 3) * innerHeight;
                  const valQty = maxQtyLine - (idx / 3) * maxQtyLine;
                  return (
                    <g key={idx}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke="#f1f5f9"
                        className="dark:stroke-slate-800/60"
                        strokeDasharray="4 4"
                      />
                      {/* Qty label (Left side) */}
                      <text
                        x={paddingLeft - 8}
                        y={y + 3}
                        textAnchor="end"
                        className="fill-emerald-500 text-[8px] font-mono font-bold"
                      >
                        {formatQty(Math.round(valQty))}
                      </text>
                      {/* Qty label (Right side matching same scale for comparison) */}
                      <text
                        x={chartWidth - paddingRight + 8}
                        y={y + 3}
                        textAnchor="start"
                        className="fill-rose-500 text-[8px] font-mono font-bold"
                      >
                        {formatQty(Math.round(valQty))}
                      </text>
                    </g>
                  );
                })}

                {/* Draw Curves & Area */}
                {(() => {
                  const points = trendPointsWithTargets.map((t, idx) => {
                    const segmentX = trendPointsWithTargets.length > 1 ? innerWidth / (trendPointsWithTargets.length - 1) : innerWidth;
                    const x = paddingLeft + idx * segmentX;
                    const yQty = chartHeight - paddingBottom - (t.qty / maxQtyLine) * innerHeight;
                    const yTarget = chartHeight - paddingBottom - (t.target / maxQtyLine) * innerHeight;
                    return { x, yQty, yTarget, data: t };
                  });

                  // Line paths
                  const qtyPath = points.length > 0
                    ? `M ${points[0].x} ${points[0].yQty} ` + points.slice(1).map((p) => `L ${p.x} ${p.yQty}`).join(" ")
                    : "";

                  const targetPath = points.length > 0
                    ? `M ${points[0].x} ${points[0].yTarget} ` + points.slice(1).map((p) => `L ${p.x} ${p.yTarget}`).join(" ")
                    : "";

                  // Glowing area path for actual
                  const qtyAreaPath = points.length > 0
                    ? `${qtyPath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`
                    : "";

                  return (
                    <g>
                      {/* Area beneath curves first */}
                      {qtyAreaPath && (
                        <path
                          d={qtyAreaPath}
                          fill="url(#areaActualGrad)"
                          className="pointer-events-none"
                        />
                      )}

                      {/* Target Line (Horizontal line plotted symmetrically) */}
                      {targetPath && (
                        <path
                          d={targetPath}
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="pointer-events-none opacity-85"
                        />
                      )}

                      {/* Emerald Qty Line */}
                      {qtyPath && (
                        <path
                          d={qtyPath}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className="pointer-events-none"
                        />
                      )}

                      {/* Hover elements & Circular nodes */}
                      {points.map((p, idx) => {
                        const isHovered = hoveredDailyLine === idx;

                        return (
                          <g key={idx}>
                            {/* Touch Target Anchor Box */}
                            <circle
                              cx={p.x}
                              cy={p.yQty}
                              r="16"
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredDailyLine(idx)}
                              onMouseLeave={() => setHoveredDailyLine(null)}
                            />

                            {/* Qty dot pin */}
                            <circle
                              cx={p.x}
                              cy={p.yQty}
                              r={isHovered ? 6 : 3.5}
                              fill="#10b981"
                              className="stroke-white dark:stroke-slate-900 transition-all pointer-events-none shadow-sm"
                              strokeWidth={isHovered ? 2 : 1.5}
                            />

                            {/* Target dot pin (Only highlighted when hovered or active) */}
                            <circle
                              cx={p.x}
                              cy={p.yTarget}
                              r={isHovered ? 4.5 : 2}
                              fill="#f43f5e"
                              className="stroke-white dark:stroke-slate-900 transition-all pointer-events-none"
                              strokeWidth="1"
                            />

                            {/* X-Axis bottom label */}
                            <text
                              x={p.x}
                              y={chartHeight - paddingBottom + 16}
                              textAnchor="middle"
                              className={`text-[8px] font-mono transition-colors ${
                                isHovered
                                  ? "fill-emerald-650 font-bold dark:fill-emerald-400"
                                  : "fill-slate-550 dark:fill-slate-400"
                              }`}
                            >
                              {p.data.displayDate}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}

                {/* Ground line */}
                <line
                  x1={paddingLeft}
                  y1={chartHeight - paddingBottom}
                  x2={chartWidth - paddingRight}
                  y2={chartHeight - paddingBottom}
                  stroke="#e2e8f0"
                  className="dark:stroke-slate-800"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Tooltip rendering */}
              <div className="h-10 mt-3 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {hoveredDailyLine !== null && trendPointsWithTargets[hoveredDailyLine] ? (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="w-full py-1.5 px-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/40 dark:border-emerald-900/30 rounded-xl text-xs flex justify-between items-center"
                    >
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {trendPointsWithTargets[hoveredDailyLine].dateStr}
                      </span>
                      <span className="text-slate-400">|</span>
                      <div className="flex gap-5">
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          Aktual: <strong className="font-mono font-bold">{formatQty(trendPointsWithTargets[hoveredDailyLine].qty)} {categoryUnit}</strong>
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          Target: <strong className="font-mono font-bold">{formatQty(Math.round(trendPointsWithTargets[hoveredDailyLine].target))} {categoryUnit}</strong>
                        </span>
                        <span className={`font-bold font-sans ${trendPointsWithTargets[hoveredDailyLine].qty >= trendPointsWithTargets[hoveredDailyLine].target ? 'text-emerald-600' : 'text-amber-600'}`}>
                          ({Math.round((trendPointsWithTargets[hoveredDailyLine].qty / Math.max(trendPointsWithTargets[hoveredDailyLine].target, 1)) * 100)}%)
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic font-medium">
                      Arahkan kursor ke titik kurva untuk melihat perbandingan harian ({selectedCategory})
                    </p>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
