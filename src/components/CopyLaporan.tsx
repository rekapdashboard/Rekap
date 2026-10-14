import { useState, useMemo, useEffect, useRef } from "react";
import { Copy, Check, FileText, Calendar, Layers, RefreshCw, Smartphone, Award, Trophy, Camera, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SalesRecord, TargetData } from "../types";
import { normalizeDateStr, normalizeStoreCode, calculateActualMetrics, isStoreActive } from "../utils/sheetsParser";

interface CopyLaporanProps {
  records: SalesRecord[];
  uniqueDates: string[];
  targets: TargetData;
}

const ELIGIBLE_RTD_STORES = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];

const getIndonesianDayAndDate = (dateStr: string) => {
  if (!dateStr || dateStr === "ALL") return "Pilih Tanggal";
  
  // Try pattern DD/MM/YYYY or DD-MM-YYYY
  const parts = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    const year = parseInt(parts[3], 10);
    const d = new Date(year, month, day);
    const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const MONTHS = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    if (!isNaN(d.getTime())) {
      return `${DAYS[d.getDay()]}, ${day} ${MONTHS[month]} ${year}`;
    }
  }

  // ISO pattern YYYY-MM-DD
  const isoParts = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoParts) {
    const year = parseInt(isoParts[1], 10);
    const month = parseInt(isoParts[2], 10) - 1;
    const day = parseInt(isoParts[3], 10);
    const d = new Date(year, month, day);
    const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const MONTHS = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    if (!isNaN(d.getTime())) {
      return `${DAYS[d.getDay()]}, ${day} ${MONTHS[month]} ${year}`;
    }
  }

  return dateStr;
};

const getIndonesianDateUpper = (dateStr: string) => {
  if (!dateStr || dateStr === "ALL") return "";
  
  // Try pattern DD/MM/YYYY or DD-MM-YYYY
  const parts = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    const year = parseInt(parts[3], 10);
    const MONTHS = [
      "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
      "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
    ];
    const monthName = MONTHS[month] || "JUNI";
    return `${day} ${monthName} ${year}`;
  }

  // ISO pattern YYYY-MM-DD
  const isoParts = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoParts) {
    const year = parseInt(isoParts[1], 10);
    const month = parseInt(isoParts[2], 10) - 1;
    const day = parseInt(isoParts[3], 10);
    const MONTHS = [
      "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
      "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
    ];
    const monthName = MONTHS[month] || "JUNI";
    return `${day} ${monthName} ${year}`;
  }

  return dateStr.toUpperCase();
};

const isMonWedFri = (dateStr: string): boolean => {
  if (!dateStr || dateStr === "ALL") return false;
  const cleaned = dateStr.trim();
  const lower = cleaned.toLowerCase();

  // Check if string explicitly contains Indonesian or English day names
  if (lower.includes("senin") || lower.includes("rabu") || lower.includes("jumat") || lower.includes("jum'at") ||
      lower.includes("mon") || lower.includes("wed") || lower.includes("fri")) {
    return true;
  }
  if (lower.includes("selasa") || lower.includes("kamis") || lower.includes("sabtu") || lower.includes("minggu") ||
      lower.includes("tue") || lower.includes("thu") || lower.includes("sat") || lower.includes("sun")) {
    return false;
  }

  // Try pattern DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY
  const parts = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    let year = parseInt(parts[3], 10);
    if (year < 100) year += 2000;
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

  // Normalized date string check
  const norm = normalizeDateStr(cleaned);
  if (norm && norm !== cleaned) {
    const parts2 = norm.match(/^(\d{1,2})[/](\d{1,2})[/](\d{4})/);
    if (parts2) {
      const day = parseInt(parts2[1], 10);
      const month = parseInt(parts2[2], 10) - 1;
      const year = parseInt(parts2[3], 10);
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay();
      return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
    }
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

export function CopyLaporan({ records, uniqueDates, targets }: CopyLaporanProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [activeTemplate, setActiveTemplate] = useState<"item_fokus" | "whatsapp" | "focused" | "target" | "top_flop">("item_fokus");
  const [selectedRankIndicator, setSelectedRankIndicator] = useState<string>("PSM");
  const [editedText, setEditedText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [amName, setAmName] = useState<string>("DRI");
  const [acName, setAcName] = useState<string>("ADE ANWAR");
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const unreportedRef = useRef<HTMLDivElement>(null);

  const handleScreenshotUnreported = async () => {
    if (!unreportedRef.current) return;
    setIsCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(unreportedRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const dateFormatted = (selectedDate || "Laporan").replace(/[/\\?%*:|"<>]/g, "-");
      link.href = image;
      link.download = `Toko_Belum_Laporan_${dateFormatted}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to capture screenshot:", err);
    } finally {
      setIsCapturing(false);
    }
  };

  const getCategoryDisplayNameAndUnit = (catStr: string) => {
    const norm = (catStr || "").toUpperCase().trim();
    if (norm === "PSM" || norm.includes("PSM")) return { name: "PSM", unit: "Pcs" };
    if (norm === "SERBA" || norm.includes("SERBA") || norm === "SH" || norm === "SERTIS") return { name: "SERBA", unit: "Pkt" };
    if (norm === "PWP" || norm.includes("PWP")) return { name: "PWP", unit: "Pcs" };
    if (norm === "SEGER" || norm.includes("SEGER") || norm === "SGR") return { name: "SEGER", unit: "Pcs" };
    if (norm === "RTD COFFEDAY" || norm.includes("COFFE") || norm.includes("RTD")) return { name: "RTD COFFEDAY", unit: "Pcs" };
    if (norm === "RTD BASIC") return { name: "RTD BASIC", unit: "Pcs" };
    if (norm === "CEBAN" || norm.includes("CEBAN") || norm.includes("CEMILAN")) return { name: "CEBAN", unit: "Pcs" };
    if (norm === "TELUR" || norm.includes("TELUR")) return { name: "TELUR", unit: "Pcs" };
    if (norm === "TOYS" || norm.includes("TOYS") || norm.includes("MAINAN")) return { name: "TOYS", unit: "Pcs" };
    if (norm === "NEW MEMBER" || norm.includes("MEMBER") || norm === "MBR") return { name: "NEW MEMBER", unit: "Pcs" };
    if (norm === "BOOTLE" || norm.includes("BOOTLE") || norm === "BOTTLE" || norm.includes("BOTTLE") || norm.includes("BOTOL") || norm.includes("SUSU")) return { name: "BOTTLE", unit: "Pcs" };
    return { name: norm, unit: "Pcs" };
  };

  // Set default selected date once uniqueDates load
  useEffect(() => {
    if (uniqueDates.length > 0 && !selectedDate) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);

  // Filter unique dates to include only Mondays, Wednesdays, and Fridays when selecting Top & Flop for RTD COFFEDAY
  const shownUniqueDates = useMemo(() => {
    if (activeTemplate === "top_flop" && selectedRankIndicator === "RTD COFFEDAY") {
      return uniqueDates.filter(isMonWedFri);
    }
    return uniqueDates;
  }, [activeTemplate, selectedRankIndicator, uniqueDates]);

  // Automatically select a valid date when filtering updates the shown dates
  useEffect(() => {
    if (shownUniqueDates.length > 0 && !shownUniqueDates.includes(selectedDate)) {
      setSelectedDate(shownUniqueDates[0]);
    }
  }, [shownUniqueDates, selectedDate]);

  // Unique stores represented in the raw data (active stores only)
  const allStores = useMemo(() => {
    const list = records
      .map((r) => r.salesperson)
      .filter((s): s is string => Boolean(s))
      .filter((s) => isStoreActive(s));
    return Array.from(new Set(list)).sort();
  }, [records]);

  // Total unique dates count
  const numDates = useMemo(() => {
    return Math.max(uniqueDates.length, 1);
  }, [uniqueDates]);

  // Compute stats specifically for the selected date
  const dailyData = useMemo<{
    records: SalesRecord[];
    psmActual: number;
    serbaActual: number;
    pwpActual: number;
    segerActual: number;
    rtdActual: number;
    telurActual: number;
    cebanActual: number;
    toysActual: number;
    newMemberActual: number;
    bootleActual: number;
    totalActual: number;
    storeBreakdown: Record<string, { psm: number; serba: number; pwp: number; seger: number; rtd: number; telur: number; ceban: number; toys: number; new_member: number; bootle: number; total: number }>;
  }>(() => {
    if (!selectedDate) {
      return {
        records: [],
        psmActual: 0,
        serbaActual: 0,
        pwpActual: 0,
        segerActual: 0,
        rtdActual: 0,
        telurActual: 0,
        cebanActual: 0,
        toysActual: 0,
        newMemberActual: 0,
        bootleActual: 0,
        totalActual: 0,
        storeBreakdown: {} as Record<string, { psm: number; serba: number; pwp: number; seger: number; rtd: number; telur: number; ceban: number; toys: number; new_member: number; bootle: number; total: number }>,
      };
    }

    const filtered = records.filter((r) => r.date === selectedDate && (!r.salesperson || isStoreActive(r.salesperson)));
    
    // Compute total metrics for the selected date using the robust app-wide function
    const dayMetrics = calculateActualMetrics(filtered);

    const storeBreakdown: Record<string, { psm: number; serba: number; pwp: number; seger: number; rtd: number; telur: number; ceban: number; toys: number; new_member: number; bootle: number; total: number }> = {};
    
    // Initialize breakdown
    allStores.forEach((store) => {
      storeBreakdown[store] = { psm: 0, serba: 0, pwp: 0, seger: 0, rtd: 0, telur: 0, ceban: 0, toys: 0, new_member: 0, bootle: 0, total: 0 };
    });

    filtered.forEach((r) => {
      if (!r.salesperson || !isStoreActive(r.salesperson)) return;
      const cat = (r.category || "").toUpperCase().trim();
      const prod = (r.product || "").toUpperCase().trim();
      const qty = r.quantity || 0;
      const sp = r.salesperson;
      const spUpper = sp.toUpperCase().trim();

      const catLower = cat.toLowerCase();
      const prodLower = prod.toLowerCase();
      
      if (!storeBreakdown[sp]) {
        storeBreakdown[sp] = { psm: 0, serba: 0, pwp: 0, seger: 0, rtd: 0, telur: 0, ceban: 0, toys: 0, new_member: 0, bootle: 0, total: 0 };
      }

      if (cat === "PSM" || cat.includes("PSM") || prod.includes("PSM")) {
        storeBreakdown[sp].psm += qty;
      } else if (cat === "SERBA" || cat.includes("SERBA") || cat === "SH" || cat === "SERTIS" || cat.includes("SERTIS") || prod.includes("SERBA") || prod.includes("SERTIS") || prod.includes("SH")) {
        storeBreakdown[sp].serba += qty;
      } else if (cat === "PWP" || cat.includes("PWP") || prod.includes("PWP")) {
        storeBreakdown[sp].pwp += qty;
      } else if (cat === "SEGER" || cat.includes("SEGER") || cat === "SGR" || prod.includes("SEGER") || prod.includes("SGR")) {
        storeBreakdown[sp].seger += qty;
      } else if (cat === "TELUR" || cat.includes("TELUR") || prod.includes("TELUR")) {
        storeBreakdown[sp].telur += qty;
      } else if (cat === "RTD" || cat.includes("RTD") || cat === "COFFE" || cat.includes("COFFE") || cat.includes("COFFEDAY") || prod.includes("RTD") || prod.includes("COFFE")) {
        const normCode = normalizeStoreCode(sp);
        if (ELIGIBLE_RTD_STORES.includes(normCode) && isMonWedFri(selectedDate)) {
          storeBreakdown[sp].rtd += qty;
        }
      } else if (catLower.includes("ceban") || prodLower.includes("ceban") || catLower.includes("actual ceban") || prodLower.includes("actual ceban") || catLower.includes("cemilan") || prodLower.includes("cemilan")) {
        storeBreakdown[sp].ceban += qty;
      } else if (catLower.includes("toys") || prodLower.includes("toys") || catLower.includes("mainan") || prodLower.includes("mainan")) {
        storeBreakdown[sp].toys += qty;
      } else if (catLower.includes("member") || prodLower.includes("member") || catLower === "mbr" || catLower.includes("actual new") || prodLower.includes("actual new") || catLower === "new" || prodLower === "new" || catLower === "new member" || prodLower === "new member") {
        storeBreakdown[sp].new_member += qty;
      } else if (catLower.includes("bootle") || prodLower.includes("bootle") || catLower.includes("bottle") || prodLower.includes("bottle") || catLower.includes("botol") || prodLower.includes("botol") || catLower.includes("susu") || prodLower.includes("susu")) {
        storeBreakdown[sp].bootle += qty;
      }
    });

    // Sum overall store totals
    Object.keys(storeBreakdown).forEach((store) => {
      const b = storeBreakdown[store];
      b.total = b.psm + b.serba + b.pwp + b.seger + b.rtd + b.telur + b.ceban + b.toys + b.new_member + b.bootle;
    });

    const calculatedRtdActual = Object.values(storeBreakdown).reduce((sum, s) => sum + s.rtd, 0);
    const calculatedTotalActual = dayMetrics.psmActual + dayMetrics.serbaActual + dayMetrics.pwpActual + dayMetrics.segerActual + calculatedRtdActual + dayMetrics.telurActual + dayMetrics.cebanActual + dayMetrics.toysActual + dayMetrics.newMemberActual + (dayMetrics.bootleActual || 0);

    return {
      records: filtered,
      psmActual: dayMetrics.psmActual,
      serbaActual: dayMetrics.serbaActual,
      pwpActual: dayMetrics.pwpActual,
      segerActual: dayMetrics.segerActual,
      rtdActual: calculatedRtdActual,
      telurActual: dayMetrics.telurActual,
      cebanActual: dayMetrics.cebanActual,
      toysActual: dayMetrics.toysActual,
      newMemberActual: dayMetrics.newMemberActual,
      bootleActual: dayMetrics.bootleActual || 0,
      totalActual: calculatedTotalActual,
      storeBreakdown,
    };
  }, [records, selectedDate, allStores]);

  // Identify all active/relevant stores to aggregate targets from
  const targetStores = useMemo(() => {
    const storeSet = new Set<string>();
    allStores.forEach((s) => {
      const norm = normalizeStoreCode(s);
      if (norm && norm !== "ALL" && isStoreActive(norm)) storeSet.add(norm);
    });
    if (targets?.targetsByStoreAndDate) {
      Object.keys(targets.targetsByStoreAndDate).forEach((s) => {
        const norm = normalizeStoreCode(s);
        if (norm && norm !== "ALL" && isStoreActive(norm)) storeSet.add(norm);
      });
    }
    return Array.from(storeSet);
  }, [allStores, targets]);

  // Compute daily targets for the selected date (accumulated across all stores for the selected date)
  const dailyTargets = useMemo(() => {
    if (!selectedDate) {
      return { psm: 0, serba: 0, pwp: 0, seger: 0, rtd: 0, telur: 0, ceban: 0, toys: 0, new_member: 0, bootle: 0, total: 0 };
    }

    const normSelectedDate = normalizeDateStr(selectedDate);
    const ELIGIBLE_RTD_STORES = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];
    const isSpecialDate = isMonWedFri(selectedDate);
    const totalDaysCount = Math.max(uniqueDates.length, 1);
    const storesCount = Math.max(targetStores.length, 1);

    let sumPsm = 0;
    let sumSerba = 0;
    let sumPwp = 0;
    let sumSeger = 0;
    let sumRtd = 0;
    let sumTelur = 0;
    let sumCeban = 0;
    let sumToys = 0;
    let sumNewMember = 0;
    let sumBootle = 0;

    // Check if store-level map contains data for this specific date
    let hasStoreLevelData = false;
    targetStores.forEach((storeCode) => {
      const normStore = normalizeStoreCode(storeCode);
      if (targets?.targetsByStoreAndDate?.[normStore]?.[normSelectedDate]) {
        hasStoreLevelData = true;
      }
    });

    if (hasStoreLevelData) {
      targetStores.forEach((storeCode) => {
        const normStore = normalizeStoreCode(storeCode);
        const isRtdEligibleStore = ELIGIBLE_RTD_STORES.includes(normStore);
        const storeMapTarget = targets?.targetsByStoreAndDate?.[normStore];

        if (storeMapTarget && storeMapTarget[normSelectedDate]) {
          const dayObj = storeMapTarget[normSelectedDate];
          sumPsm += Number(dayObj.psm) || 0;
          sumSerba += Number(dayObj.serba) || 0;
          sumPwp += Number(dayObj.pwp) || 0;
          sumSeger += Number(dayObj.seger) || 0;

          if (isRtdEligibleStore && isSpecialDate) {
            sumRtd += Number(dayObj.rtd) || 0;
          }

          sumTelur += Number(dayObj.telur) || Number((dayObj as any).telur_actual) || 0;
          sumCeban += Number(dayObj.ceban) || 0;
          sumToys += Number(dayObj.toys) || 0;
          sumNewMember += Number(dayObj.new_member) || Number((dayObj as any).member) || 0;
          sumBootle += Number(dayObj.bootle) || 0;
        }
      });
    } else if (targets?.targetsByDate && targets.targetsByDate[normSelectedDate]) {
      // Direct accumulation of all stores on the selected date
      const dateObj = targets.targetsByDate[normSelectedDate];
      sumPsm = Number(dateObj.psm) || 0;
      sumSerba = Number(dateObj.serba) || 0;
      sumPwp = Number(dateObj.pwp) || 0;
      sumSeger = Number(dateObj.seger) || 0;
      const eligibleCount = targetStores.filter(s => ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(s))).length || 6;
      const storeRatio = storesCount > 0 ? (eligibleCount / storesCount) : 1;
      sumRtd = isSpecialDate ? (Number(dateObj.rtd) || 0) * storeRatio : 0;
      sumTelur = Number(dateObj.telur) || Number((dateObj as any).telur_actual) || 0;
      sumCeban = Number(dateObj.ceban) || 0;
      sumToys = Number(dateObj.toys) || 0;
      sumNewMember = Number(dateObj.new_member) || Number((dateObj as any).member) || 0;
      sumBootle = Number(dateObj.bootle) || 0;
    } else {
      // Fallback: divide total targets by total days
      sumPsm = (targets?.psm || 1200) / totalDaysCount;
      sumSerba = (targets?.serba || 1800) / totalDaysCount;
      sumPwp = (targets?.pwp || 1000) / totalDaysCount;
      sumSeger = (targets?.seger || 800) / totalDaysCount;
      const eligibleCount = targetStores.filter(s => ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(s))).length || 6;
      const storeRatio = storesCount > 0 ? (eligibleCount / storesCount) : 1;
      sumRtd = isSpecialDate ? ((targets?.rtd || 500) / totalDaysCount) * storeRatio : 0;
      sumTelur = (targets?.telur || 1400) / totalDaysCount;
      sumCeban = (targets?.ceban || 900) / totalDaysCount;
      sumToys = (targets?.toys || 600) / totalDaysCount;
      sumNewMember = (targets?.new_member || 400) / totalDaysCount;
      sumBootle = (targets?.bootle || 500) / totalDaysCount;
    }

    const total = sumPsm + sumSerba + sumPwp + sumSeger + sumRtd + sumTelur + sumCeban + sumToys + sumNewMember + sumBootle;

    return {
      psm: sumPsm,
      serba: sumSerba,
      pwp: sumPwp,
      seger: sumSeger,
      rtd: sumRtd,
      telur: sumTelur,
      ceban: sumCeban,
      toys: sumToys,
      new_member: sumNewMember,
      bootle: sumBootle,
      total,
    };
  }, [targets, selectedDate, uniqueDates, targetStores]);

  // Helper percentages
  const psmPct = dailyTargets.psm > 0 ? (dailyData.psmActual / dailyTargets.psm) * 100 : 0;
  const serbaPct = dailyTargets.serba > 0 ? (dailyData.serbaActual / dailyTargets.serba) * 100 : 0;
  const pwpPct = dailyTargets.pwp > 0 ? (dailyData.pwpActual / dailyTargets.pwp) * 100 : 0;
  const segerPct = dailyTargets.seger > 0 ? (dailyData.segerActual / dailyTargets.seger) * 100 : 0;
  const rtdPct = dailyTargets.rtd > 0 ? (dailyData.rtdActual / dailyTargets.rtd) * 100 : 0;
  const telurPct = dailyTargets.telur > 0 ? (dailyData.telurActual / dailyTargets.telur) * 100 : 0;
  const cebanPct = dailyTargets.ceban > 0 ? (dailyData.cebanActual / dailyTargets.ceban) * 100 : 0;
  const toysPct = dailyTargets.toys > 0 ? (dailyData.toysActual / dailyTargets.toys) * 100 : 0;
  const newMemberPct = dailyTargets.new_member > 0 ? (dailyData.newMemberActual / dailyTargets.new_member) * 100 : 0;
  const bootlePct = dailyTargets.bootle > 0 ? (dailyData.bootleActual / dailyTargets.bootle) * 100 : 0;
  const totalPct = dailyTargets.total > 0 ? (dailyData.totalActual / dailyTargets.total) * 100 : 0;

  // Stores that have not reported/fully-completed on the selected date
  const unreportedStores = useMemo(() => {
    if (!selectedDate) return [];

    // All indicators required for a report to be counted as fully completed
    const baseIndicators = ["PSM", "Serba", "PWP", "Seger", "CEBAN", "TELUR", "TOYS", "NEW MEMBER", "BOTTLE"];

    return allStores.filter((store) => {
      // Find all records for this specific store on the selected date
      const storeRecords = dailyData.records.filter(
        (r) => r.salesperson === store
      );

      // If there are no records at all for this store on this date, they are definitely unreported
      if (storeRecords.length === 0) return true;

      const normStore = normalizeStoreCode(store);
      const isRtdEligible = ELIGIBLE_RTD_STORES.includes(normStore);

      // Build list of required indicators for this store
      const required = [...baseIndicators];
      if (isRtdEligible && isMonWedFri(selectedDate)) {
        required.push("RTD");
      }

      // Check if every required indicator category is present and has been marked as FILLED (not empty)
      const allFilled = required.every((indicator) => {
        const rec = storeRecords.find((r) => {
          const cat = (r.category || "").toUpperCase().trim();
          const targetCat = indicator.toUpperCase().trim();

          if (targetCat === "SERBA") {
            return cat === "SERBA" || cat === "SERBA GRATIS" || cat === "SH" || cat === "SERTIS";
          }
          if (targetCat === "RTD") {
            return cat === "RTD" || cat.includes("COFFE") || cat.includes("RTD");
          }
          return cat === targetCat;
        });

        // If the record exists and status is not "EMPTY", count as filled
        return rec && rec.status !== "EMPTY";
      });

      return !allFilled; // Filter out stores where not all required columns are completed
    });
  }, [allStores, dailyData.records, selectedDate]);

  // Helper to determine which specific indicators are missing for an unreported store
  const getMissingIndicators = (store: string) => {
    const baseIndicators = ["PSM", "Serba", "PWP", "Seger", "CEBAN", "TELUR", "TOYS", "NEW MEMBER", "BOTTLE"];
    const storeRecords = dailyData.records.filter((r) => r.salesperson === store);

    if (storeRecords.length === 0) {
      return ["Semua"];
    }

    const normStore = normalizeStoreCode(store);
    const isRtdEligible = ELIGIBLE_RTD_STORES.includes(normStore);
    const required = [...baseIndicators];
    if (isRtdEligible && isMonWedFri(selectedDate)) {
      required.push("RTD");
    }

    const missing: string[] = [];
    required.forEach((indicator) => {
      const rec = storeRecords.find((r) => {
        const cat = (r.category || "").toUpperCase().trim();
        const targetCat = indicator.toUpperCase().trim();
        if (targetCat === "SERBA") {
          return cat === "SERBA" || cat === "SERBA GRATIS" || cat === "SH" || cat === "SERTIS";
        }
        if (targetCat === "RTD") {
          return cat === "RTD" || cat.includes("COFFE") || cat.includes("RTD");
        }
        return cat === targetCat;
      });
      if (!rec || rec.status === "EMPTY") {
        missing.push(indicator);
      }
    });

    return missing;
  };

  // Compute ranking data (top/flop) for the selected date and selected indicator
  const rankData = useMemo(() => {
    if (!selectedDate) return { topRange: [], flopRange: [], limit: 5, unit: "Pcs" };

    const indicator = selectedRankIndicator;
    const storeQtyMap: Record<string, number> = {};
    
    allStores.forEach(st => {
      storeQtyMap[st] = 0;
    });

    const filtered = records.filter(r => r.date === selectedDate);
    filtered.forEach(r => {
      if (!r.salesperson) return;
      const cat = (r.category || "").toUpperCase().trim();
      const prod = (r.product || "").toUpperCase().trim();
      const qty = r.quantity || 0;

      let match = false;
      if (indicator === "PSM" && (cat === "PSM" || cat.includes("PSM") || prod.includes("PSM"))) match = true;
      if (indicator === "SERBA" && (cat === "SERBA" || cat.includes("SERBA") || cat === "SH" || cat === "SERTIS" || cat.includes("SERTIS") || prod.includes("SERBA") || prod.includes("SERTIS") || prod.includes("SH"))) match = true;
      if (indicator === "PWP" && (cat === "PWP" || cat.includes("PWP") || prod.includes("PWP"))) match = true;
      if (indicator === "SEGER" && (cat === "SEGER" || cat.includes("SEGER") || cat === "SGR" || prod.includes("SEGER") || prod.includes("SGR"))) match = true;
      if ((indicator === "RTD COFFEDAY" || indicator === "RTD BASIC") && (cat === "RTD" || cat.includes("RTD") || cat === "COFFE" || cat.includes("COFFE") || cat.includes("COFFEDAY") || prod.includes("RTD") || prod.includes("COFFE"))) {
        if (indicator === "RTD COFFEDAY") {
          const isSpecial = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"].includes(normalizeStoreCode(r.salesperson));
          if (isSpecial) {
            if (isMonWedFri(selectedDate)) {
              match = true;
            }
          }
        } else {
          const isSpecial = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"].includes(normalizeStoreCode(r.salesperson));
          if (!isSpecial) {
            match = true;
          }
        }
      }
      if (indicator === "CEBAN" && (cat === "CEBAN" || cat.includes("CEBAN") || prod.includes("CEBAN"))) match = true;
      if (indicator === "TELUR" && (cat === "TELUR" || cat.includes("TELUR") || prod.includes("TELUR"))) match = true;
      if (indicator === "TOYS" && (cat === "TOYS" || cat.includes("TOYS") || cat.includes("MAINAN") || prod.includes("TOYS") || prod.includes("MAINAN"))) match = true;
      if (indicator === "NEW MEMBER" && (cat === "NEW MEMBER" || cat.includes("MEMBER") || cat === "MBR" || prod.includes("MEMBER") || prod.includes("MBR"))) match = true;
      if ((indicator === "BOTTLE" || indicator === "BOOTLE") && (cat === "BOOTLE" || cat.includes("BOOTLE") || cat === "BOTTLE" || cat.includes("BOTTLE") || prod.includes("BOOTLE") || prod.includes("BOTTLE") || cat.includes("BOTOL") || prod.includes("BOTOL") || cat.includes("SUSU") || prod.includes("SUSU"))) match = true;

      if (match) {
        storeQtyMap[r.salesperson] = (storeQtyMap[r.salesperson] || 0) + qty;
      }
    });

    const getStoreTarget = (storeCode: string): number => {
      const normStore = normalizeStoreCode(storeCode);
      const storeMap = targets.targetsByStoreAndDate?.[normStore];
      const isSpecialStore = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"].includes(normStore);

      if (!storeMap) {
        let baseIndicatorTarget = 100;
        if (indicator === "PSM") baseIndicatorTarget = targets.psm || 1200;
        else if (indicator === "SERBA") baseIndicatorTarget = targets.serba || 1800;
        else if (indicator === "PWP") baseIndicatorTarget = targets.pwp || 1000;
        else if (indicator === "SEGER") baseIndicatorTarget = targets.seger || 800;
        else if (indicator === "RTD COFFEDAY" || indicator === "RTD BASIC") baseIndicatorTarget = targets.rtd || 500;
        else if (indicator === "CEBAN") baseIndicatorTarget = targets.ceban || 900;
        else if (indicator === "TELUR") baseIndicatorTarget = targets.telur || 1400;
        else if (indicator === "TOYS") baseIndicatorTarget = targets.toys || 600;
        else if (indicator === "NEW MEMBER") baseIndicatorTarget = targets.new_member || 400;
        else if (indicator === "BOTTLE" || indicator === "BOOTLE") baseIndicatorTarget = targets.bootle || 500;

        const baseStore = allStores.length > 0 ? (baseIndicatorTarget / allStores.length) : baseIndicatorTarget;
        const dailyTarget = uniqueDates.length > 0 ? (baseStore / uniqueDates.length) : baseStore;

        if (indicator === "RTD COFFEDAY") {
          return isSpecialStore ? (isMonWedFri(selectedDate) ? dailyTarget : 0) : 0;
        }
        if (indicator === "RTD BASIC") {
          return !isSpecialStore ? dailyTarget : 0;
        }
        return dailyTarget;
      }
      
      const normDate = normalizeDateStr(selectedDate);
      const dateTargets = storeMap[normDate];
      if (dateTargets) {
        if (indicator === "PSM") return dateTargets.psm || 0;
        if (indicator === "SERBA") return dateTargets.serba || 0;
        if (indicator === "PWP") return dateTargets.pwp || 0;
        if (indicator === "SEGER") return dateTargets.seger || 0;
        if (indicator === "RTD COFFEDAY") {
          return isSpecialStore ? (isMonWedFri(selectedDate) ? (dateTargets.rtd || 0) : 0) : 0;
        }
        if (indicator === "RTD BASIC") {
          return !isSpecialStore ? (dateTargets.rtd || 0) : 0;
        }
        if (indicator === "CEBAN") return dateTargets.ceban || 0;
        if (indicator === "TELUR") return dateTargets.telur || 0;
        if (indicator === "TOYS") return dateTargets.toys || 0;
        if (indicator === "NEW MEMBER") return dateTargets.new_member || 0;
        if (indicator === "BOTTLE" || indicator === "BOOTLE") return dateTargets.bootle || 0;
      }

      let baseIndicatorTarget = 100;
      if (indicator === "PSM") baseIndicatorTarget = targets.psm || 1200;
      else if (indicator === "SERBA") baseIndicatorTarget = targets.serba || 1800;
      else if (indicator === "PWP") baseIndicatorTarget = targets.pwp || 1000;
      else if (indicator === "SEGER") baseIndicatorTarget = targets.seger || 800;
      else if (indicator === "RTD COFFEDAY" || indicator === "RTD BASIC") baseIndicatorTarget = targets.rtd || 500;
      else if (indicator === "CEBAN") baseIndicatorTarget = targets.ceban || 900;
      else if (indicator === "TELUR") baseIndicatorTarget = targets.telur || 1400;
      else if (indicator === "TOYS") baseIndicatorTarget = targets.toys || 600;
      else if (indicator === "NEW MEMBER") baseIndicatorTarget = targets.new_member || 400;
      else if (indicator === "BOTTLE" || indicator === "BOOTLE") baseIndicatorTarget = targets.bootle || 500;
      const totalBaseStore = allStores.length > 0 ? (baseIndicatorTarget / allStores.length) : baseIndicatorTarget;
      const dailyTarget = uniqueDates.length > 0 ? (totalBaseStore / uniqueDates.length) : totalBaseStore;

      if (indicator === "RTD COFFEDAY") {
        return isSpecialStore ? (isMonWedFri(selectedDate) ? dailyTarget : 0) : 0;
      }
      if (indicator === "RTD BASIC") {
        return !isSpecialStore ? dailyTarget : 0;
      }
      return dailyTarget;
    };

    const unit = getCategoryDisplayNameAndUnit(indicator).unit;

    const listWithAcv = Object.entries(storeQtyMap).map(([store, qty]) => {
      const targetVal = getStoreTarget(store);
      const acv = targetVal > 0 ? (qty / targetVal) * 100 : 0;
      return { store, qty, target: targetVal, unit, acv };
    }).filter(item => {
      if (!isStoreActive(item.store)) return false;
      const normCode = normalizeStoreCode(item.store);
      if (indicator === "RTD COFFEDAY") {
        return ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"].includes(normCode);
      }
      if (indicator === "RTD BASIC") {
        return !["KE45", "KC36", "KD17", "K883", "KF66", "KD54"].includes(normCode) && normCode !== "K288" && normCode !== "KF47";
      }
      return true;
    });

    const limit = indicator === "RTD COFFEDAY" ? 3 : (indicator === "RTD BASIC" ? 5 : 8);

    const sortedDesc = [...listWithAcv].sort((a, b) => {
      if (b.acv !== a.acv) return b.acv - a.acv;
      if (b.qty !== a.qty) return b.qty - a.qty;
      return a.store.localeCompare(b.store);
    });
    const topRange = sortedDesc.slice(0, limit);

    const sortedAsc = [...listWithAcv].sort((a, b) => {
      if (a.acv !== b.acv) return a.acv - b.acv;
      if (a.qty !== b.qty) return a.qty - b.qty;
      return a.store.localeCompare(b.store);
    });
    const flopRange = sortedAsc.slice(0, limit);

    return { topRange, flopRange, limit, unit };
  }, [records, targets, selectedDate, selectedRankIndicator, allStores, uniqueDates]);

  // Generate template text outputs dynamically
  const generatedText = useMemo(() => {
    if (!selectedDate) return "Silakan pilih tanggal terlebih dahulu.";

    const displayDateIndo = getIndonesianDayAndDate(selectedDate);
    const showCoffe = isMonWedFri(selectedDate);

    if (activeTemplate === "item_fokus") {
      const filtered = records.filter((r) => r.date === selectedDate && (!r.salesperson || isStoreActive(r.salesperson)));
      const activeStores = Array.from(new Set(filtered.map(r => r.salesperson).filter((s): s is string => Boolean(s)).filter(isStoreActive)));
      const jtTokoAktifVal = activeStores.length;

      // Actual indicators from our robustly computed dailyData
      const psmAct = dailyData.psmActual;
      const sertisAct = dailyData.serbaActual;
      const pwpAct = dailyData.pwpActual;
      const segerAct = dailyData.segerActual;
      const telurAct = dailyData.telurActual;
      const cebanAct = dailyData.cebanActual;
      const toysAct = dailyData.toysActual;
      const memberAct = dailyData.newMemberActual;
      const bootleAct = dailyData.bootleActual;
      const coffeAct = dailyData.rtdActual;

      // Sets for JTJ stores reporting each indicator
      const psmStores = new Set<string>();
      const sertisStores = new Set<string>();
      const pwpStores = new Set<string>();
      const segerStores = new Set<string>();
      const telurStores = new Set<string>();
      const cebanStores = new Set<string>();
      const toysStores = new Set<string>();
      const memberStores = new Set<string>();
      const bootleStores = new Set<string>();
      const coffeStores = new Set<string>();

      filtered.forEach((r) => {
        const cat = (r.category || "").toUpperCase().trim();
        const prod = (r.product || "").toUpperCase().trim();
        const qty = r.quantity || 0;
        const sp = r.salesperson;
        if (!sp || qty <= 0) return;

        const catLower = cat.toLowerCase();
        const prodLower = prod.toLowerCase();

        if (cat === "PSM" || cat.includes("PSM") || prod.includes("PSM")) {
          psmStores.add(sp);
        } else if (cat === "SERBA" || cat.includes("SERBA") || cat === "SH" || cat === "SERTIS" || cat.includes("SERTIS") || prod.includes("SERBA") || prod.includes("SERTIS") || prod.includes("SH")) {
          sertisStores.add(sp);
        } else if (cat === "PWP" || cat.includes("PWP") || prod.includes("PWP")) {
          pwpStores.add(sp);
        } else if (cat === "SEGER" || cat.includes("SEGER") || cat === "SGR" || prod.includes("SEGER") || prod.includes("SGR")) {
          segerStores.add(sp);
        } else if (cat === "TELUR" || cat.includes("TELUR") || prod.includes("TELUR")) {
          telurStores.add(sp);
        } else if (catLower.includes("ceban") || prodLower.includes("ceban") || catLower.includes("actual ceban") || prodLower.includes("actual ceban") || catLower.includes("cemilan") || prodLower.includes("cemilan")) {
          cebanStores.add(sp);
        } else if (catLower.includes("toys") || prodLower.includes("toys") || catLower.includes("mainan") || prodLower.includes("mainan")) {
          toysStores.add(sp);
        } else if (catLower.includes("member") || prodLower.includes("member") || catLower === "mbr" || catLower.includes("actual new") || prodLower.includes("actual new") || catLower === "new" || prodLower === "new" || catLower === "new member" || prodLower === "new member") {
          memberStores.add(sp);
        } else if (catLower.includes("bootle") || prodLower.includes("bootle") || catLower.includes("bottle") || prodLower.includes("bottle") || catLower.includes("botol") || prodLower.includes("botol") || catLower.includes("susu") || prodLower.includes("susu")) {
          bootleStores.add(sp);
        } else if (cat === "RTD" || cat.includes("RTD") || cat === "COFFE" || cat.includes("COFFE") || cat.includes("COFFEDAY") || prod.includes("RTD") || prod.includes("COFFE")) {
          const normCode = normalizeStoreCode(sp);
          if (ELIGIBLE_RTD_STORES.includes(normCode)) {
            coffeStores.add(sp);
          }
        }
      });

      // Targets: use precomputed dailyTargets directly!
      let psmTgt = dailyTargets.psm;
      let sertisTgt = dailyTargets.serba;
      let pwpTgt = dailyTargets.pwp;
      let segerTgt = dailyTargets.seger;
      let telurTgt = dailyTargets.telur;
      let cebanTgt = dailyTargets.ceban;
      let toysTgt = dailyTargets.toys;
      let memberTgt = dailyTargets.new_member;
      let bootleTgt = dailyTargets.bootle;
      let coffeTgt = dailyTargets.rtd;

      // Round targets to integers
      psmTgt = Math.round(psmTgt);
      sertisTgt = Math.round(sertisTgt);
      pwpTgt = Math.round(pwpTgt);
      segerTgt = Math.round(segerTgt);
      telurTgt = Math.round(telurTgt);
      cebanTgt = Math.round(cebanTgt);
      toysTgt = Math.round(toysTgt);
      memberTgt = Math.round(memberTgt);
      bootleTgt = Math.round(bootleTgt);
      coffeTgt = Math.round(coffeTgt);

      // Achievements
      const psmAcv = psmTgt > 0 ? Math.floor((psmAct / psmTgt) * 100) : 0;
      const sertisAcv = sertisTgt > 0 ? Math.floor((sertisAct / sertisTgt) * 100) : 0;
      const pwpAcv = pwpTgt > 0 ? Math.floor((pwpAct / pwpTgt) * 100) : 0;
      const segerAcv = segerTgt > 0 ? Math.floor((segerAct / segerTgt) * 100) : 0;
      const telurAcv = telurTgt > 0 ? Math.floor((telurAct / telurTgt) * 100) : 0;
      const cebanAcv = cebanTgt > 0 ? Math.floor((cebanAct / cebanTgt) * 100) : 0;
      const toysAcv = toysTgt > 0 ? Math.floor((toysAct / toysTgt) * 100) : 0;
      const memberAcv = memberTgt > 0 ? Math.floor((memberAct / memberTgt) * 100) : 0;
      const bootleAcv = bootleTgt > 0 ? Math.floor((bootleAct / bootleTgt) * 100) : 0;
      const coffeAcv = coffeTgt > 0 ? Math.floor((coffeAct / coffeTgt) * 100) : 0;

      // JTJ Target & Actual
      const psmJtjTgt = jtTokoAktifVal;
      const psmJtjAct = psmStores.size;
      const psmJtjAcv = psmJtjTgt > 0 ? Math.floor((psmJtjAct / psmJtjTgt) * 100) : 0;

      const sertisJtjTgt = jtTokoAktifVal;
      const sertisJtjAct = sertisStores.size;
      const sertisJtjAcv = sertisJtjTgt > 0 ? Math.floor((sertisJtjAct / sertisJtjTgt) * 100) : 0;

      const pwpJtjTgt = jtTokoAktifVal;
      const pwpJtjAct = pwpStores.size;
      const pwpJtjAcv = pwpJtjTgt > 0 ? Math.floor((pwpJtjAct / pwpJtjTgt) * 100) : 0;

      const segerJtjTgt = jtTokoAktifVal;
      const segerJtjAct = segerStores.size;
      const segerJtjAcv = segerJtjTgt > 0 ? Math.floor((segerJtjAct / segerJtjTgt) * 100) : 0;

      const telurJtjTgt = jtTokoAktifVal;
      const telurJtjAct = telurStores.size;
      const telurJtjAcv = telurJtjTgt > 0 ? Math.floor((telurJtjAct / telurJtjTgt) * 100) : 0;

      const cebanJtjTgt = jtTokoAktifVal;
      const cebanJtjAct = cebanStores.size;
      const cebanJtjAcv = cebanJtjTgt > 0 ? Math.floor((cebanJtjAct / cebanJtjTgt) * 100) : 0;

      const toysJtjTgt = jtTokoAktifVal;
      const toysJtjAct = toysStores.size;
      const toysJtjAcv = toysJtjTgt > 0 ? Math.floor((toysJtjAct / toysJtjTgt) * 100) : 0;

      const memberJtjTgt = jtTokoAktifVal;
      const memberJtjAct = memberStores.size;
      const memberJtjAcv = memberJtjTgt > 0 ? Math.floor((memberJtjAct / memberJtjTgt) * 100) : 0;

      const bootleJtjTgt = jtTokoAktifVal;
      const bootleJtjAct = bootleStores.size;
      const bootleJtjAcv = bootleJtjTgt > 0 ? Math.floor((bootleJtjAct / bootleJtjTgt) * 100) : 0;

      // Coffe has 6 specified eligible stores
      const coffeJtjTgt = 6;
      // count active coffe stores
      const coffeJtjAct = coffeStores.size;
      const coffeJtjAcv = coffeJtjTgt > 0 ? Math.floor((coffeJtjAct / coffeJtjTgt) * 100) : 0;

      // AVG Qty Sales = Math.round(actual / target_jtj)
      const psmAvg = psmJtjTgt > 0 ? Math.round(psmAct / psmJtjTgt) : 0;
      const sertisAvg = sertisJtjTgt > 0 ? Math.round(sertisAct / sertisJtjTgt) : 0;
      const pwpAvg = pwpJtjTgt > 0 ? Math.round(pwpAct / pwpJtjTgt) : 0;
      const segerAvg = segerJtjTgt > 0 ? Math.round(segerAct / segerJtjTgt) : 0;
      const telurAvg = telurJtjTgt > 0 ? Math.round(telurAct / telurJtjTgt) : 0;
      const cebanAvg = cebanJtjTgt > 0 ? Math.round(cebanAct / cebanJtjTgt) : 0;
      const toysAvg = toysJtjTgt > 0 ? Math.round(toysAct / toysJtjTgt) : 0;
      const memberAvg = memberJtjTgt > 0 ? Math.round(memberAct / memberJtjTgt) : 0;
      const bootleAvg = bootleJtjTgt > 0 ? Math.round(bootleAct / bootleJtjTgt) : 0;
      const coffeAvg = coffeJtjTgt > 0 ? Math.round(coffeAct / coffeJtjTgt) : 0;

      // TARGET Qty Sales All Toko = Math.round(target / target_jtj)
      const psmTgtAvg = psmJtjTgt > 0 ? Math.round(psmTgt / psmJtjTgt) : 0;
      const sertisTgtAvg = sertisJtjTgt > 0 ? Math.round(sertisTgt / sertisJtjTgt) : 0;
      const pwpTgtAvg = pwpJtjTgt > 0 ? Math.round(pwpTgt / pwpJtjTgt) : 0;
      const segerTgtAvg = segerJtjTgt > 0 ? Math.round(segerTgt / segerJtjTgt) : 0;
      const telurTgtAvg = telurJtjTgt > 0 ? Math.round(telurTgt / telurJtjTgt) : 0;
      const cebanTgtAvg = cebanJtjTgt > 0 ? Math.round(cebanTgt / cebanJtjTgt) : 0;
      const toysTgtAvg = toysJtjTgt > 0 ? Math.round(toysTgt / toysJtjTgt) : 0;
      const memberTgtAvg = memberJtjTgt > 0 ? Math.round(memberTgt / memberJtjTgt) : 0;
      const bootleTgtAvg = bootleJtjTgt > 0 ? Math.round(bootleTgt / bootleJtjTgt) : 0;
      const coffeTgtAvg = coffeJtjTgt > 0 ? Math.round(coffeTgt / coffeJtjTgt) : 0;

      // Gap per Toko = AVG QTY SALES ALL TOKO - TARGET QTY SALES ALL TOKO
      const psmGapVal = psmAvg - psmTgtAvg;
      const sertisGapVal = sertisAvg - sertisTgtAvg;
      const pwpGapVal = pwpAvg - pwpTgtAvg;
      const segerGapVal = segerAvg - segerTgtAvg;
      const telurGapVal = telurAvg - telurTgtAvg;
      const cebanGapVal = cebanAvg - cebanTgtAvg;
      const toysGapVal = toysAvg - toysTgtAvg;
      const memberGapVal = memberAvg - memberTgtAvg;
      const bootleGapVal = bootleAvg - bootleTgtAvg;
      const coffeGapVal = coffeAvg - coffeTgtAvg;

      const formatGap = (val: number) => {
        if (val === 0) return "0";
        if (val > 0) return `+${val}`;
        return `-${Math.abs(val)}`;
      };

      const psmGap = formatGap(psmGapVal);
      const sertisGap = formatGap(sertisGapVal);
      const pwpGap = formatGap(pwpGapVal);
      const segerGap = formatGap(segerGapVal);
      const telurGap = formatGap(telurGapVal);
      const cebanGap = formatGap(cebanGapVal);
      const toysGap = formatGap(toysGapVal);
      const memberGap = formatGap(memberGapVal);
      const bootleGap = formatGap(bootleGapVal);
      const coffeGap = formatGap(coffeGapVal);

      // Month name upper
      const dateUpper = getIndonesianDateUpper(selectedDate);

      let text = `_Berikut Pak Laporan Item Fokus_\n`;
      text += `- Tanggal : ${dateUpper}\n`;
      text += `- AM:\t${amName}\n`;
      text += `- AC:\t${acName}\n`;
      text += `JUMLAH TOKO AKTIF :  ${jtTokoAktifVal}\n\n`;

      text += `*TARGET/AKTUAL/ACV%*\n`;
      text += `1.PSM : ${psmTgt}/${psmAct}/${psmAcv}%\n`;
      text += `2.SERTIS : ${sertisTgt}/${sertisAct}/${sertisAcv}%\n`;
      text += `3.PWP:\t${pwpTgt}/${pwpAct}/${pwpAcv}%\n`;
      text += `4.SEGER : ${segerTgt}/${segerAct}/${segerAcv}%\n`;
      text += `5.TELUR : ${telurTgt}/${telurAct}/${telurAcv}%\n`;
      text += `6.CEBAN: ${cebanTgt}/${cebanAct}/${cebanAcv}%\n`;
      text += `7.TOYS: ${toysTgt}/${toysAct}/${toysAcv}%\n`;
      text += `8.NEW MEMBER: ${memberTgt}/${memberAct}/${memberAcv}%\n`;
      text += `9.BOTTLE: ${bootleTgt}/${bootleAct}/${bootleAcv}%\n`;
      if (showCoffe) {
        text += `10.COFFEDAY: ${coffeTgt}/${coffeAct}/${coffeAcv}%\n\n\n`;
      } else {
        text += `\n\n`;
      }

      text += `*=================*\n`;
      text += `*JTJ/AKTUAL/ACV%*\n`;
      text += `1.   ${psmJtjTgt}/${psmJtjAct}/${psmJtjAcv}%\n`;
      text += `2.   ${sertisJtjTgt}/${sertisJtjAct}/${sertisJtjAcv}%\n`;
      text += `3.   ${pwpJtjTgt}/${pwpJtjAct}/${pwpJtjAcv}%\n`;
      text += `4.   ${segerJtjTgt}/${segerJtjAct}/${segerJtjAcv}%\n`;
      text += `5.   ${telurJtjTgt}/${telurJtjAct}/${telurJtjAcv}%\n`;
      text += `6.   ${cebanJtjTgt}/${cebanJtjAct}/${cebanJtjAcv}%\n`;
      text += `7.   ${toysJtjTgt}/${toysJtjAct}/${toysJtjAcv}%\n`;
      text += `8.   ${memberJtjTgt}/${memberJtjAct}/${memberJtjAcv}%\n`;
      text += `9.   ${bootleJtjTgt}/${bootleJtjAct}/${bootleJtjAcv}%\n`;
      if (showCoffe) {
        text += `10.  ${coffeJtjTgt}/${coffeJtjAct}/${coffeJtjAcv}%\n\n\n\n`;
      } else {
        text += `\n\n\n`;
      }

      text += `*=================*\n`;
      text += `*AVG QTY SALES*\n`;
      text += `1.PSM :\t ${psmAvg}\n`;
      text += `2.SERTIS : ${sertisAvg}\n`;
      text += `3.PWP:\t ${pwpAvg}\n`;
      text += `4.SEGER : ${segerAvg}\n`;
      text += `5.TELUR: ${telurAvg}\n`;
      text += `6.CEBAN: ${cebanAvg}\n`;
      text += `7.TOYS: ${toysAvg}\n`;
      text += `8.NEW MEMBER: ${memberAvg}\n`;
      text += `9.BOTTLE: ${bootleAvg}\n`;
      if (showCoffe) {
        text += `10.COFFEDAY : ${coffeAvg}\n\n\n`;
      } else {
        text += `\n\n`;
      }

      text += `*=================*\n`;
      text += `*GAP QTY/PERTOKO*\n`;
      text += `1.PSM :\t  ${psmGap}\n`;
      text += `2.SERTIS : ${sertisGap}\n`;
      text += `3.PWP:\t ${pwpGap}\n`;
      text += `4.SEGER : ${segerGap}\n`;
      text += `5.TELUR: ${telurGap}\n`;
      text += `6.CEBAN: ${cebanGap}\n`;
      text += `7.TOYS: ${toysGap}\n`;
      text += `8.NEW MEMBER: ${memberGap}\n`;
      text += `9.BOTTLE: ${bootleGap}\n`;
      if (showCoffe) {
        text += `10.COFFEDAY : ${coffeGap}\n\n\n\n`;
      } else {
        text += `\n\n\n`;
      }

      text += `Terima Kasih`;
      return text;
    }

    if (activeTemplate === "whatsapp") {
      let text = `📊 *LAPORAN HARIAN PENJUALAN GROUP*\n`;
      text += `📅 *Hari/Tanggal:* ${displayDateIndo}\n`;
      text += `--------------------------------------------------\n\n`;
      
      text += `🎯 *PENCAPAIAN VS TARGET HARIAN:*\n`;
      text += `🔹 *PSM:* ${dailyData.psmActual.toLocaleString("id-ID")} Pcs / Target: ${Math.round(dailyTargets.psm).toLocaleString("id-ID")} Pcs (*${psmPct.toFixed(1)}%*)\n`;
      text += `🔹 *SERBA:* ${dailyData.serbaActual.toLocaleString("id-ID")} Pkt / Target: ${Math.round(dailyTargets.serba).toLocaleString("id-ID")} Pkt (*${serbaPct.toFixed(1)}%*)\n`;
      text += `🔹 *PWP:* ${dailyData.pwpActual.toLocaleString("id-ID")} Pcs / Target: ${Math.round(dailyTargets.pwp).toLocaleString("id-ID")} Pcs (*${pwpPct.toFixed(1)}%*)\n`;
      text += `🔹 *SEGER:* ${dailyData.segerActual.toLocaleString("id-ID")} Pcs / Target: ${Math.round(dailyTargets.seger).toLocaleString("id-ID")} Pcs (*${segerPct.toFixed(1)}%*)\n`;
      text += `🔹 *TELUR:* ${dailyData.telurActual.toLocaleString("id-ID")} Pcs / Target: ${Math.round(dailyTargets.telur).toLocaleString("id-ID")} Pcs (*${telurPct.toFixed(1)}%*)\n`;
      text += `🔹 *CEBAN:* ${dailyData.cebanActual.toLocaleString("id-ID")} Pcs / Target: ${Math.round(dailyTargets.ceban).toLocaleString("id-ID")} Pcs (*${cebanPct.toFixed(1)}%*)\n`;
      text += `🔹 *TOYS:* ${dailyData.toysActual.toLocaleString("id-ID")} Pcs / Target: ${Math.round(dailyTargets.toys).toLocaleString("id-ID")} Pcs (*${toysPct.toFixed(1)}%*)\n`;
      text += `🔹 *NEW MEMBER:* ${dailyData.newMemberActual.toLocaleString("id-ID")} Member / Target: ${Math.round(dailyTargets.new_member).toLocaleString("id-ID")} Member (*${newMemberPct.toFixed(1)}%*)\n`;
      text += `🔹 *BOTTLE:* ${dailyData.bootleActual.toLocaleString("id-ID")} Pcs / Target: ${Math.round(dailyTargets.bootle).toLocaleString("id-ID")} Pcs (*${bootlePct.toFixed(1)}%*)\n`;
      if (showCoffe) {
        text += `🔸 *RTD COFFEDAY:* ${dailyData.rtdActual.toLocaleString("id-ID")} Pcs / Target: ${Math.round(dailyTargets.rtd).toLocaleString("id-ID")} Pcs (*${rtdPct.toFixed(1)}%*)\n`;
      }
      text += `--------------------------------------------------\n`;
      text += `🏆 *GRAND TOTAL:* ${dailyData.totalActual.toLocaleString("id-ID")} / ${Math.round(dailyTargets.total).toLocaleString("id-ID")} Pcs/Pkt (*${totalPct.toFixed(1)}%*)\n\n`;

      text += `🏪 *RINCIAN PENCAPAIAN PER TOKO:*\n`;
      text += `--------------------------------------------------\n`;
      
      Object.keys(dailyData.storeBreakdown).forEach((storeCode) => {
        const st = dailyData.storeBreakdown[storeCode];
        const normCode = normalizeStoreCode(storeCode);
        const isRtdStore = ELIGIBLE_RTD_STORES.includes(normCode);
        
        text += `🏪 *TOKO ${storeCode}*\n`;
        text += `  • PSM : ${st.psm.toLocaleString("id-ID")} Pcs\n`;
        text += `  • SBG : ${st.serba.toLocaleString("id-ID")} Pkt\n`;
        text += `  • PWP : ${st.pwp.toLocaleString("id-ID")} Pcs\n`;
        text += `  • SEGER : ${st.seger.toLocaleString("id-ID")} Pcs\n`;
        text += `  • TELUR : ${st.telur.toLocaleString("id-ID")} Pcs\n`;
        text += `  • CEBAN : ${st.ceban.toLocaleString("id-ID")} Pcs\n`;
        text += `  • TOYS : ${st.toys.toLocaleString("id-ID")} Pcs\n`;
        text += `  • MEMBER : ${st.new_member.toLocaleString("id-ID")} Member\n`;
        text += `  • BOTTLE : ${st.bootle.toLocaleString("id-ID")} Pcs\n`;
        if (isRtdStore && showCoffe) {
          text += `  • RTD : ${st.rtd.toLocaleString("id-ID")} Pcs (☕)*\n`;
        }
        text += `  • *TOTAL* : ${st.total.toLocaleString("id-ID")} Pcs/Pkt\n`;
        text += `  ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\n`;
      });

      text += `\n⚡ _Laporan dikompilasi via Rekap Penjualan Dashboard App_`;
      return text;
    } 
    
    if (activeTemplate === "focused") {
      // Find the highest and lowest performing stores of the day
      const sortedStoresDesc = Object.keys(dailyData.storeBreakdown)
        .map((code) => ({ code, total: dailyData.storeBreakdown[code].total }))
        .sort((a,b) => b.total - a.total);

      const topStore = sortedStoresDesc[0];
      const botStore = sortedStoresDesc[sortedStoresDesc.length - 1];

      let text = `🎯 *FOKUS UTAMA PRODUK & KINERJA MARKETING*\n`;
      text += `📅 *Tanggal:* ${displayDateIndo}\n`;
      text += `--------------------------------------------------\n\n`;
      
      text += `⭐ *BINTANG KINERJA HARI INI:*\n`;
      if (topStore && topStore.total > 0) {
        text += `🥇 *Toko Teratas:* TOKO ${topStore.code} dengan total volume *${topStore.total.toLocaleString("id-ID")} Pcs/Pkt*\n`;
      } else {
        text += `🥇 *Toko Teratas:* -\n`;
      }
      if (botStore) {
        text += `⚠️ *Toko Terendah:* TOKO ${botStore.code} (*${botStore.total.toLocaleString("id-ID")} Pcs/Pkt*)\n`;
      }
      text += `--------------------------------------------------\n\n`;

      text += `💡 *KAMPANYE AKSI CEPAT FOKUS MARKETING:*\n`;
      
      // Dynamic tips based on achievement levels
      if (psmPct < 100) {
        text += `📌 *PSM (${psmPct.toFixed(1)}%):* Tingkatkan penawaran produk PSM di area kasir utama. Jaga stok visual tetap menarik.\n`;
      } else {
        text += `🟢 *PSM (${psmPct.toFixed(1)}%):* Kinerja luar biasa! Pertahankan konsistensi penawaran aktif.\n`;
      }

      if (serbaPct < 100) {
        text += `📌 *SERBA (${serbaPct.toFixed(1)}%):* Fokuskan pemasaran paket bundling Serba Gratis untuk mendongkrak transaksi multi-item.\n`;
      } else {
        text += `🟢 *SERBA (${serbaPct.toFixed(1)}%):* Target tercapai! Teruskan penawaran paket hemat.\n`;
      }

      if (pwpPct < 100) {
        text += `📌 *PWP (${pwpPct.toFixed(1)}%):* Tekankan mekanisme tebus murah di struk belanja konsumen.\n`;
      } else {
        text += `🟢 *PWP (${pwpPct.toFixed(1)}%):* Capaian melampaui target. Kerja bagus tim!\n`;
      }

      if (showCoffe) {
        if (rtdPct < 100) {
          text += `📌 *RTD COFFEDAY (${rtdPct.toFixed(1)}%):* Maksimalkan pendingin minuman RTD CoffeDay khusus di 6 Toko Syarat pada hari penawaran (Senin, Rabu, Jumat).\n`;
        } else {
          text += `🟢 *RTD COFFEDAY (${rtdPct.toFixed(1)}%):* Penjualan RTD CoffeDay di 6 Toko Syarat melaju melampaui target!\n`;
        }
      }

      if (telurPct < 100) {
        text += `📌 *TELUR (${telurPct.toFixed(1)}%):* Pastikan ketersediaan pasokan telur segar berkualitas tinggi di toko.\n`;
      } else {
        text += `🟢 *TELUR (${telurPct.toFixed(1)}%):* Capaian target telur sangat memuaskan!\n`;
      }

      if (cebanPct < 100) {
        text += `📌 *CEBAN (${cebanPct.toFixed(1)}%):* Susun tumpukan menarik snack serba ceban di area dekat kasir.\n`;
      } else {
        text += `🟢 *CEBAN (${cebanPct.toFixed(1)}%):* Kategori ceban melaju di atas target harian!\n`;
      }

      if (toysPct < 100) {
        text += `📌 *TOYS (${toysPct.toFixed(1)}%):* Tingkatkan aktivitas penawaran mainan anak bermuatan edukasi di kasir.\n`;
      } else {
        text += `🟢 *TOYS (${toysPct.toFixed(1)}%):* Luar biasa, performa kategori toys di atas 100%!\n`;
      }

      if (newMemberPct < 100) {
        text += `📌 *MEMBER (${newMemberPct.toFixed(1)}%):* Edukasi tim toko untuk aktif menawarkan pembuatan member baru.\n`;
      } else {
        text += `🟢 *MEMBER (${newMemberPct.toFixed(1)}%):* Pembuatan member baru berjalan sangat solid!\n`;
      }

      if (bootlePct < 100) {
        text += `📌 *BOTTLE (${bootlePct.toFixed(1)}%):* Jaga ketersediaan dan penetrasi penjualan produk Bottle di area kasir.\n`;
      } else {
        text += `🟢 *BOTTLE (${bootlePct.toFixed(1)}%):* Kategori bottle melaju di atas target!\n`;
      }

      text += `\n🔥 _Semangat menawarkan! Sukses hari ini ada di tangan kita!_`;
      return text;
    }

    if (activeTemplate === "top_flop") {
      const limit = rankData.limit;
      const unit = rankData.unit;

      let text = `🏆 *PERFORMA TOKO: TOP ${limit} VS FLOP ${limit}*\n`;
      text += `📅 *Hari/Tanggal:* ${displayDateIndo}\n`;
      text += `🎯 *Fokus Indikator:* ${selectedRankIndicator}\n`;
      text += `--------------------------------------------------\n\n`;

      text += `🥇 *${limit} TOKO TERBAIK (TOP):*\n`;
      if (rankData.topRange.length === 0) {
        text += `_Tidak ada data penjualan_\n`;
      } else {
        rankData.topRange.forEach((item, idx) => {
          text += `  ${idx + 1}. TOKO ${item.store} : ${item.qty.toLocaleString("id-ID")} ${unit} (Target: ${Math.round(item.target).toLocaleString("id-ID")} ${unit} / *${item.acv.toFixed(1)}%*)\n`;
        });
      }

      text += `\n⚠️ *${limit} TOKO TERENDAH (FLOP):*\n`;
      if (rankData.flopRange.length === 0) {
        text += `_Tidak ada data penjualan_\n`;
      } else {
        rankData.flopRange.forEach((item, idx) => {
          text += `  ${idx + 1}. TOKO ${item.store} : ${item.qty.toLocaleString("id-ID")} ${unit} (Target: ${Math.round(item.target).toLocaleString("id-ID")} ${unit} / *${item.acv.toFixed(1)}%*)\n`;
        });
      }

      text += `\n--------------------------------------------------\n`;
      text += `⚡ _Laporan dikompilasi via Rekap Penjualan Dashboard App_`;
      return text;
    }

    // "target" template
    let text = `📈 *PENCAPAIAN VS TARGET HARIAN RINGKAS*\n`;
    text += `📅 *Tanggal:* ${displayDateIndo}\n`;
    text += `--------------------------------------------------\n\n`;
    
    text += `🔹 *PSM:* ${dailyData.psmActual.toLocaleString("id-ID")} / ${Math.round(dailyTargets.psm).toLocaleString("id-ID")} Pcs (${psmPct.toFixed(1)}%)\n`;
    text += `🔹 *SERBA:* ${dailyData.serbaActual.toLocaleString("id-ID")} / ${Math.round(dailyTargets.serba).toLocaleString("id-ID")} Pkt (${serbaPct.toFixed(1)}%)\n`;
    text += `🔹 *PWP:* ${dailyData.pwpActual.toLocaleString("id-ID")} / ${Math.round(dailyTargets.pwp).toLocaleString("id-ID")} Pcs (${pwpPct.toFixed(1)}%)\n`;
    text += `🔹 *SEGER:* ${dailyData.segerActual.toLocaleString("id-ID")} / ${Math.round(dailyTargets.seger).toLocaleString("id-ID")} Pcs (${segerPct.toFixed(1)}%)\n`;
    text += `🔹 *TELUR:* ${dailyData.telurActual.toLocaleString("id-ID")} / ${Math.round(dailyTargets.telur).toLocaleString("id-ID")} Pcs (${telurPct.toFixed(1)}%)\n`;
    text += `🔹 *CEBAN:* ${dailyData.cebanActual.toLocaleString("id-ID")} / ${Math.round(dailyTargets.ceban).toLocaleString("id-ID")} Pcs (${cebanPct.toFixed(1)}%)\n`;
    text += `🔹 *TOYS:* ${dailyData.toysActual.toLocaleString("id-ID")} / ${Math.round(dailyTargets.toys).toLocaleString("id-ID")} Pcs (${toysPct.toFixed(1)}%)\n`;
    text += `🔹 *NEW MEMBER:* ${dailyData.newMemberActual.toLocaleString("id-ID")} / ${Math.round(dailyTargets.new_member).toLocaleString("id-ID")} Member (${newMemberPct.toFixed(1)}%)\n`;
    text += `🔹 *BOTTLE:* ${dailyData.bootleActual.toLocaleString("id-ID")} / ${Math.round(dailyTargets.bootle).toLocaleString("id-ID")} Pcs (${bootlePct.toFixed(1)}%)\n`;
    if (showCoffe) {
      text += `🔸 *RTD:* ${dailyData.rtdActual.toLocaleString("id-ID")} / ${Math.round(dailyTargets.rtd).toLocaleString("id-ID")} Pcs (${rtdPct.toFixed(1)}%)\n`;
    }
    text += `--------------------------------------------------\n`;
    text += `🏆 *GRAND TOTAL:* ${dailyData.totalActual.toLocaleString("id-ID")} / ${Math.round(dailyTargets.total).toLocaleString("id-ID")} Pcs (*${totalPct.toFixed(1)}%*)\n`;
    
    return text;
  }, [selectedDate, activeTemplate, dailyData, dailyTargets, psmPct, serbaPct, pwpPct, segerPct, rtdPct, telurPct, cebanPct, toysPct, newMemberPct, bootlePct, totalPct, records, numDates, targets, amName, acName, selectedRankIndicator, rankData]);

  // Sync edited text when selectedDate, activeTemplate or records change
  useEffect(() => {
    setEditedText(generatedText);
  }, [generatedText, selectedDate, activeTemplate]);

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(editedText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Gagal menyalin laporan:", err);
      });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4 animate-fade-in">
      
      {/* Date & Template Selection Panel */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 rounded-lg">
              <FileText className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
              Penyusun Laporan Harian
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium font-sans leading-relaxed">
            Format otomatis laporan ke dalam pesan teks siap kirim ke Whatsapp rekan-rekan kerja Anda.
          </p>
        </div>

        {/* Template Options */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-mono">
            pilih gaya template rekap
          </label>
          <div className="space-y-2">
            <button
              id="template-item-fokus-btn"
              onClick={() => setActiveTemplate("item_fokus")}
              className={`w-full flex items-center justify-between text-left p-3 rounded-xl border text-xs transition-all font-sans cursor-pointer ${
                activeTemplate === "item_fokus"
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold shadow-sm"
                  : "bg-transparent border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-xs font-bold leading-tight">Laporan Item Fokus</p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Format laporan target, actual, JTJ, & GAP</p>
                </div>
              </div>
              <AnimatePresence>
                {activeTemplate === "item_fokus" && (
                  <motion.span layoutId="indicator" className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </AnimatePresence>
            </button>

            <button
              id="template-top-flop-btn"
              onClick={() => setActiveTemplate("top_flop")}
              className={`w-full flex items-center justify-between text-left p-3 rounded-xl border text-xs transition-all font-sans cursor-pointer ${
                activeTemplate === "top_flop"
                  ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold shadow-sm"
                  : "bg-transparent border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4 shrink-0 text-rose-500" />
                <div>
                  <p className="text-xs font-bold leading-tight">Template Top Vs Flop</p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Peringkat teratas & terendah toko harian (3/5/8)</p>
                </div>
              </div>
              <AnimatePresence>
                {activeTemplate === "top_flop" && (
                  <motion.span layoutId="indicator" className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </AnimatePresence>
            </button>

            {/* Indicator Selector for Top 5 & Flop 5 */}
            <AnimatePresence>
              {activeTemplate === "top_flop" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="space-y-1.5 overflow-hidden pl-3 border-l-2 border-rose-500/30 dark:border-rose-500/20"
                >
                  <label className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest block font-mono">
                    pilih indikator top / flop
                  </label>
                  <select
                    id="report-indicator-selector"
                    value={selectedRankIndicator}
                    onChange={(e) => setSelectedRankIndicator(e.target.value)}
                    className="appearance-none w-full bg-rose-50/20 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 rounded-xl px-2.5 py-2 text-xs text-rose-700 dark:text-rose-300 font-bold outline-none focus:ring-1 focus:ring-rose-500 transition-all cursor-pointer shadow-sm"
                  >
                    <option value="PSM">PSM</option>
                    <option value="SERBA">SERBA GRATIS (SBG)</option>
                    <option value="PWP">PWP</option>
                    <option value="SEGER">SEGER (SG)</option>
                    <option value="RTD COFFEDAY">RTD COFFEDAY</option>
                    <option value="RTD BASIC">RTD BASIC</option>
                    <option value="CEBAN">CEBAN</option>
                    <option value="TELUR">TELUR</option>
                    <option value="TOYS">TOYS</option>
                    <option value="NEW MEMBER">NEW MEMBER</option>
                    <option value="BOTTLE">BOTTLE</option>
                  </select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Date Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">
              pilih tanggal laporan
            </label>
            {isMonWedFri(selectedDate) && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono flex items-center gap-1">
                ☕ COFFEDAY Active (Senin/Rabu/Jumat)
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            <select
              id="report-date-selector"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 appearance-none w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 font-bold outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer shadow-sm"
            >
              {shownUniqueDates.length === 0 ? (
                <option value="">Belum Memuat Data</option>
              ) : (
                shownUniqueDates.map((date) => (
                  <option key={date} value={date}>
                    {getIndonesianDayAndDate(date)}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* AM & AC Name Inputs (Customized for User's Format) */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">
            IDENTITAS AREA MANAGER & AREA COORDINATOR (AM & AC)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">NAMA AM</span>
              <input
                type="text"
                value={amName}
                onChange={(e) => setAmName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-700 dark:text-slate-200 font-bold outline-none focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                placeholder="DRI"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">NAMA AC</span>
              <input
                type="text"
                value={acName}
                onChange={(e) => setAcName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-700 dark:text-slate-200 font-bold outline-none focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                placeholder="ADE ANWAR"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Report Editor & Copy Preview Panel */}
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm flex flex-col h-full space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Pratinjau Salin Pesan (Dapat Diedit)
            </h4>
            <p className="text-[10px] text-slate-400">
              Sesuaikan teks di bawah jika Anda ingin menambahkan komentar ekstra sebelum menyalin.
            </p>
          </div>

          <button
            id="copy-laporan-clipboard-btn"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2 font-black rounded-xl text-xs transition-all shadow-sm shrink-0 cursor-pointer ${
              copied
                ? "bg-emerald-500 text-white shadow-emerald-500/20"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Salin Berhasil!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Laporan</span>
              </>
            )}
          </button>
        </div>

        {/* Text Area Compiler */}
        <div className="relative flex-1">
          <textarea
            id="report-textarea-field"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full min-h-[460px] p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono leading-relaxed text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y focus:bg-white dark:focus:bg-slate-950 transition-all outline-none"
            placeholder="Menyusun laporan harian..."
          />
        </div>
        
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
          <span>Karakter Laporan: {editedText.length}</span>
          <span>Baris: {editedText.split("\n").length}</span>
        </div>

        {/* Unreported Stores Detail Panel */}
        <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${unreportedStores.length > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
              <h5 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider font-sans">
                Status Pengiriman Laporan Toko ({selectedDate})
              </h5>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
              {allStores.length - unreportedStores.length} Lapor / {allStores.length} Total Toko
            </span>
          </div>

          {unreportedStores.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] text-rose-700 dark:text-rose-400 font-extrabold flex items-center gap-1.5">
                  <span>⚠️ TOKO BELUM LENGKAP LAPORANNYA ({unreportedStores.length}):</span>
                </p>
                <button
                  type="button"
                  onClick={handleScreenshotUnreported}
                  disabled={isCapturing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer font-sans"
                >
                  <Camera className={`w-3.5 h-3.5 ${isCapturing ? "animate-spin" : ""}`} />
                  <span>{isCapturing ? "Mengunduh Gambar..." : "Screenshot Belum Lapor"}</span>
                </button>
              </div>

              <div
                ref={unreportedRef}
                className="p-4 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-rose-100 dark:border-rose-900/40 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shrink-0" />
                    <div>
                      <h6 className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider font-sans">
                        DAFTAR TOKO BELUM LENGKAP LAPORAN
                      </h6>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold mt-0.5">
                        Tanggal: {selectedDate} • {unreportedStores.length} Toko Belum Lengkap ({allStores.length - unreportedStores.length}/{allStores.length} Lapor)
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                    AM: {amName} | AC: {acName}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {unreportedStores.map((store) => {
                    const missing = getMissingIndicators(store);
                    const isAllMissing = missing.includes("Semua") || missing.length >= (ELIGIBLE_RTD_STORES.includes(normalizeStoreCode(store)) ? 9 : 8);
                    return (
                      <div
                        key={store}
                        className="flex flex-col p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 shadow-3xs"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[11px] font-mono font-black text-rose-700 dark:text-rose-400 truncate">
                            {store}
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                        </div>
                        <div className="mt-1.5 text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase flex flex-wrap gap-1 items-center">
                          <span>Kurang:</span>
                          {isAllMissing ? (
                            <span className="px-1 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-extrabold border border-rose-200 dark:border-rose-900/40">Belum Lapor</span>
                          ) : (
                            missing.map((m) => (
                              <span key={m} className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-extrabold border border-amber-200 dark:border-amber-900/40 leading-none">{m}</span>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 rounded-xl text-center">
              <p className="text-xs font-black text-emerald-700 dark:text-emerald-450 flex items-center justify-center gap-2">
                <span>🟢 SEMUA TOKO SUDAH MELAPORKAN PENJUALAN HARI INI</span>
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
