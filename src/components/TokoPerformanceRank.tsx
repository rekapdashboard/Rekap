import { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Trophy, ThumbsDown } from "lucide-react";

interface TokoRankItem {
  store: string;
  qty: number;
  target: number;
  unit: string;
}

interface TokoPerformanceRankProps {
  selectedRankIndicator: string;
  setSelectedRankIndicator: (val: string) => void;
  selectedRankDate: string;
  setSelectedRankDate: (val: string) => void;
  uniqueDates: string[];
  rankData: {
    top5: TokoRankItem[];
    flop5: TokoRankItem[];
  };
  allowedIndicators?: string[];
}

const isMonWedFri = (dateStr: string): boolean => {
  if (!dateStr || dateStr === "ALL") return false;
  const cleaned = dateStr.trim();
  
  // Try pattern DD/MM/YYYY or DD-MM-YYYY
  const parts = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    const year = parseInt(parts[3], 10);
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
  }

  // ISO pattern YYYY-MM-DD
  const isoParts = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoParts) {
    const year = parseInt(isoParts[1], 10);
    const month = parseInt(isoParts[2], 10) - 1;
    const day = parseInt(isoParts[3], 10);
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
  }

  // Fallback try standard JS Date constructor
  try {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      const dayOfWeek = d.getDay();
      return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
    }
  } catch (e) {
    // ignore
  }

  return false;
};

export function TokoPerformanceRank({
  selectedRankIndicator,
  setSelectedRankIndicator,
  selectedRankDate,
  setSelectedRankDate,
  uniqueDates,
  rankData,
  allowedIndicators,
}: TokoPerformanceRankProps) {
  const limitCount = selectedRankIndicator === "RTD COFFEDAY" 
    ? "3" 
    : "9";

  const allOptions = [
    { value: "PSM", label: "PSM" },
    { value: "SERBA", label: "SERBA GRATIS (SBG)" },
    { value: "PWP", label: "PWP" },
    { value: "SEGER", label: "SEGER (SG)" },
    { value: "RTD COFFEDAY", label: "RTD COFFEDAY" },
    { value: "RTD BASIC", label: "RTD BASIC" },
    { value: "CEBAN", label: "CEBAN" },
    { value: "TELUR", label: "TELUR" },
    { value: "TOYS", label: "TOYS" },
    { value: "NEW MEMBER", label: "NEW MEMBER" },
  ];

  const filteredOptions = allowedIndicators
    ? allOptions.filter((opt) => allowedIndicators.includes(opt.value))
    : allOptions;

  const shownDates = useMemo(() => {
    if (selectedRankIndicator === "RTD COFFEDAY") {
      return uniqueDates.filter(isMonWedFri);
    }
    return uniqueDates;
  }, [selectedRankIndicator, uniqueDates]);

  useEffect(() => {
    if (selectedRankIndicator === "RTD COFFEDAY" && selectedRankDate !== "ALL" && !shownDates.includes(selectedRankDate)) {
      setSelectedRankDate("ALL");
    }
  }, [selectedRankIndicator, shownDates, selectedRankDate, setSelectedRankDate]);

  return (
    <div id="toko-ranking-panel" className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-5 bg-gradient-to-b from-blue-500 to-emerald-600 rounded"></span>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight uppercase">
              Performa Toko: {limitCount} Top vs {limitCount} Flop
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Peringkat {limitCount} pencapaian kuantitas tertinggi (Top) dan terendah (Flop) berdasarkan indikator pilihan dibanding target
          </p>
        </div>

        {/* Dropdowns for Indicator and Date */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pilih Indikator:</span>
            <select
              value={selectedRankIndicator}
              onChange={(e) => setSelectedRankIndicator(e.target.value)}
              className="text-xs font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 transition-all font-sans"
            >
              {filteredOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pilih Tanggal:</span>
            <select
              value={selectedRankDate}
              onChange={(e) => setSelectedRankDate(e.target.value)}
              className="text-xs font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 transition-all font-sans"
            >
              <option value="ALL">SEMUA HARI</option>
              {shownDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Top Section */}
        <div className="bg-emerald-50/10 dark:bg-emerald-950/5 border border-emerald-100/20 dark:border-emerald-900/10 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-4 text-emerald-600 dark:text-emerald-400">
            <Trophy className="w-5 h-5" />
            <h4 className="text-xs font-black uppercase tracking-wider font-sans">
              {limitCount} TOKO TERBAIK (TOP)
            </h4>
          </div>

          <div className="space-y-3">
            {rankData.top5.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">Tidak ada data penjualan pada kategori ini</p>
            ) : (
              rankData.top5.map((item, idx) => {
                const achievement = item.target > 0 ? (item.qty / item.target) * 100 : 0;
                const progressBarWidth = Math.min(achievement, 100);
                return (
                  <div key={item.store} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-xl p-3.5 flex flex-col gap-2 relative shadow-sm hover:border-emerald-500/20 transition-all group overflow-hidden animate-fade-in">
                    
                    {/* Decorative champion tag */}
                    {idx === 0 && item.qty > 0 && (
                      <div className="absolute top-0 right-0 bg-yellow-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-bl-lg tracking-widest uppercase">
                        TOP 1
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-355 font-mono">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                          TOKO {item.store}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {item.qty.toLocaleString("id-ID")} {item.unit}
                        </span>
                      </div>
                    </div>

                    {/* Store Target Comparison */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>Target: <span className="font-semibold font-mono text-slate-700 dark:text-slate-300">{Math.round(item.target).toLocaleString("id-ID")} {item.unit}</span></span>
                      <span className={`font-bold px-1.5 py-0.5 rounded ${achievement >= 100 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {achievement.toFixed(1)}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressBarWidth}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full rounded-full ${achievement >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Flop Section */}
        <div className="bg-rose-50/10 dark:bg-rose-955/5 border border-rose-100/20 dark:border-rose-900/10 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-4 text-rose-600 dark:text-rose-400">
            <ThumbsDown className="w-5 h-5" />
            <h4 className="text-xs font-black uppercase tracking-wider font-sans">
              {limitCount} TOKO TERENDAH (FLOP)
            </h4>
          </div>

          <div className="space-y-3">
            {rankData.flop5.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">Tidak ada data toko tersedia</p>
            ) : (
              rankData.flop5.map((item, idx) => {
                const achievement = item.target > 0 ? (item.qty / item.target) * 100 : 0;
                const progressBarWidth = Math.min(achievement, 100);
                return (
                  <div key={item.store} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-xl p-3.5 flex flex-col gap-2 relative shadow-sm hover:border-rose-500/20 transition-all group overflow-hidden animate-fade-in">
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-355 font-mono">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                          TOKO {item.store}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <span className="font-mono text-xs font-black text-rose-600 dark:text-rose-400">
                          {item.qty.toLocaleString("id-ID")} {item.unit}
                        </span>
                      </div>
                    </div>

                    {/* Store Target Comparison */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>Target: <span className="font-semibold font-mono text-slate-700 dark:text-slate-300">{Math.round(item.target).toLocaleString("id-ID")} {item.unit}</span></span>
                      <span className={`font-bold px-1.5 py-0.5 rounded ${achievement >= 100 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'}`}>
                        {achievement.toFixed(1)}%
                      </span>
                    </div>

                    {/* Progress Bar reflecting achievement */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(progressBarWidth, 2.5)}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
