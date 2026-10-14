import React from "react";
import { motion } from "motion/react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    label: string;
    isPositive: boolean;
  };
  color: "blue" | "green" | "purple" | "orange" | "pink";
  delay?: number;
  description?: string;
  footerExtra?: React.ReactNode;
}

export function KPICard({ title, value, subtitle, icon, trend, color, delay = 0, description, footerExtra }: KPICardProps) {
  const colorMap = {
    blue: {
      bg: "bg-blue-50/80 dark:bg-blue-950/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-100 dark:border-blue-900/50",
      glow: "shadow-blue-100/40",
    },
    green: {
      bg: "bg-emerald-50/80 dark:bg-emerald-950/20",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-100 dark:border-emerald-900/50",
      glow: "shadow-emerald-100/40",
    },
    purple: {
      bg: "bg-purple-50/80 dark:bg-purple-950/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-100 dark:border-purple-900/50",
      glow: "shadow-purple-100/40",
    },
    orange: {
      bg: "bg-amber-50/80 dark:bg-amber-950/20",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-100 dark:border-amber-900/50",
      glow: "shadow-amber-100/40",
    },
    pink: {
      bg: "bg-pink-50/80 dark:bg-pink-950/20",
      text: "text-pink-600 dark:text-pink-400",
      border: "border-pink-100 dark:border-pink-900/50",
      glow: "shadow-pink-100/40",
    },
  };

  const currentStyles = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={`relative p-5 rounded-2xl border bg-white dark:bg-slate-900 ${currentStyles.border} shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group`}
    >
      {/* Background radial soft light effect on hover */}
      <div className={`absolute -right-10 -bottom-10 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${currentStyles.bg}`} />

      <div className="flex items-start justify-between">
        <div className="space-y-1.5 matches-rtd-layout">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
            {title}
          </p>
          {description && (
            <p className="text-[11px] font-semibold text-pink-600 dark:text-pink-400 bg-pink-50/50 dark:bg-pink-950/25 px-2 py-0.5 rounded-md inline-block">
              {description}
            </p>
          )}
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl ${currentStyles.bg} ${currentStyles.text} transition-transform duration-300 group-hover:scale-105`}>
          {icon}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-xs">
        {subtitle && (
          <span className="text-slate-500 dark:text-slate-400 font-mono">
            {subtitle}
          </span>
        )}
        {trend && (
          <span
            className={`flex items-center gap-1 font-medium font-mono px-2 py-0.5 rounded-full ${
              trend.isPositive
                ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30"
                : "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30"
            }`}
          >
            {trend.isPositive ? "▲" : "▼"} {trend.label}
          </span>
        )}
      </div>

      {footerExtra && (
        <div className="mt-3 pt-2.5 border-t border-dashed border-slate-100 dark:border-slate-800">
          {footerExtra}
        </div>
      )}
    </motion.div>
  );
}
