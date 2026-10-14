import React from "react";
import { motion } from "motion/react";
import { Award, ShoppingBag, TrendingUp, Sparkles } from "lucide-react";
import { SalespersonPerformance, ProductPerformance } from "../types";

interface LeaderboardProps {
  salespeople: SalespersonPerformance[];
  products: ProductPerformance[];
}

export function Leaderboard({ salespeople, products }: LeaderboardProps) {

  // Helper to format currency in Rupiah
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const topSalesperson = salespeople[0];
  const topProduct = products[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Salesperson Rankings */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Leaderboard Salesperson
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peringkat staf berdasarkan total kontribusi omset penjualan
              </p>
            </div>
          </div>
          {topSalesperson && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 px-2 py-1 rounded-full font-sans animate-pulse">
              <Sparkles className="w-3.5 h-3.5" /> Best Staff: {topSalesperson.name.split(" ")[0]}
            </span>
          )}
        </div>

        <div className="space-y-3.5">
          {salespeople.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada data staf terinput
            </div>
          ) : (
            salespeople.slice(0, 5).map((person, idx) => {
              const ranks = ["🥇", "🥈", "🥉", "4", "5"];
              const rankColor = [
                "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
                "text-slate-400 bg-slate-50 dark:bg-slate-800",
                "text-amber-700 bg-amber-100/50 dark:bg-amber-900/10",
                "text-slate-500 bg-slate-50 dark:bg-slate-800",
                "text-slate-500 bg-slate-50 dark:bg-slate-800",
              ];

              return (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-50 dark:border-slate-800/40 hover:border-slate-100 dark:hover:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold leading-none ${rankColor[idx] || "text-slate-600"}`}>
                      {ranks[idx] || (idx + 1).toString()}
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-500 transition-colors">
                        {person.name}
                      </h5>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {person.transactions} total transaksi
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                      {formatIDR(person.sales)}
                    </span>
                    <div className="text-[9px] text-slate-400 font-mono">
                      Rata-rata: {formatIDR(person.sales / person.transactions)}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Top Performing Products */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-50 dark:bg-pink-950/30 text-pink-500 rounded-lg">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Produk Terlaris
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peringkat barang/jasa berdasarkan total perolehan kas tertinggi
              </p>
            </div>
          </div>
          {topProduct && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-950/20 px-2 py-1 rounded-full font-sans">
              <TrendingUp className="w-3.5 h-3.5" /> Top: {topProduct.quantity} Pcs
            </span>
          )}
        </div>

        <div className="space-y-3.5">
          {products.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada data produk terinput
            </div>
          ) : (
            products.slice(0, 5).map((item, idx) => {
              return (
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-50 dark:border-slate-800/40 hover:border-slate-100 dark:hover:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-pink-50 text-pink-600 text-xs font-mono font-bold leading-none dark:bg-pink-950/20 dark:text-pink-400">
                      #{idx + 1}
                    </span>
                    <div className="max-w-[150px] sm:max-w-[200px] truncate">
                      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-pink-500 transition-colors truncate">
                        {item.product}
                      </h5>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-sans">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                      {formatIDR(item.sales)}
                    </span>
                    <div className="text-[9px] text-slate-400 font-mono">
                      Kuantitas: <span className="font-bold text-slate-700 dark:text-slate-300">{item.quantity} unit</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
