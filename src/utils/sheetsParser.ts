import {
  SalesRecord,
  SalesKPIs,
  CategoryBreakdown,
  MonthlyTrend,
  ProductPerformance,
  SalespersonPerformance,
  RegionBreakdown,
  TargetData,
} from "../types";


/**
 * Robust date normalization to consistently compare DD/MM/YYYY, YYYY-MM-DD formats
 */
export function normalizeDateStr(s: string): string {
  if (!s) return "";
  const cleaned = s.trim();

  // 1. Check for standard DD/MM/YYYY or DD/MM/YY or DD-MM-YYYY or DD-MM-YY
  const dmy = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmy) {
    const day = parseInt(dmy[1], 10).toString().padStart(2, "0");
    const month = parseInt(dmy[2], 10).toString().padStart(2, "0");
    let year = dmy[3];
    if (year.length === 2) {
      year = "20" + year;
    }
    return `${day}/${month}/${year}`;
  }

  // 2. Check for standard YYYY-MM-DD or YYYY/MM/DD
  const ymd = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    const year = ymd[1];
    const month = parseInt(ymd[2], 10).toString().padStart(2, "0");
    const day = parseInt(ymd[3], 10).toString().padStart(2, "0");
    return `${day}/${month}/${year}`;
  }

  // 3. Check for DD Month YYYY (e.g., 11 Juni 2026, 11-Jun-2026, 11/Jun/26)
  const dMy = cleaned.match(/^(\d{1,2})[\s\-\/]+([a-zA-Z]+)[\s\-\/]+(\d{2,4})/);
  if (dMy) {
    const day = parseInt(dMy[1], 10).toString().padStart(2, "0");
    const mStr = dMy[2].toLowerCase();
    let year = dMy[3];
    if (year.length === 2) year = "20" + year;

    const monthMap: Record<string, string> = {
      jan: "01", januari: "01", january: "01",
      feb: "02", peb: "02", februari: "02", february: "02",
      mar: "03", maret: "03", march: "03",
      apr: "04", april: "04",
      mei: "05", may: "05",
      jun: "06", juni: "06", june: "06",
      jul: "07", juli: "07", july: "07",
      agu: "08", agust: "08", agustus: "08", aug: "08", august: "08",
      sep: "09", sept: "09", september: "09",
      okt: "10", oct: "10", oktober: "10", october: "10",
      nov: "11", november: "11",
      des: "12", dec: "12", desember: "12", december: "12",
    };
    for (const [key, code] of Object.entries(monthMap)) {
      if (mStr.startsWith(key)) {
        return `${day}/${code}/${year}`;
      }
    }
  }

  // 4. Try standard JavaScript Date parsing
  try {
    const parsedDate = new Date(cleaned);
    if (!isNaN(parsedDate.getTime())) {
      const day = parsedDate.getDate().toString().padStart(2, "0");
      const month = (parsedDate.getMonth() + 1).toString().padStart(2, "0");
      let year = parsedDate.getFullYear().toString();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // ignores
  }

  return cleaned;
}


/**
 * Robust store/salesperson code normalization to extract code (like KE45) or keep cleaned string
 */
export function normalizeStoreCode(s: string): string {
  if (!s) return "";
  const cleaned = s.trim().toUpperCase();
  // Match standard store code prefix (alphanumeric like KE45, KC36, K883)
  const match = cleaned.match(/^([A-Z0-9]+)/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return cleaned;
}

/**
 * Check if a store is active. Excludes inactive stores such as KF04 (SYAHDAN RAYA).
 */
export function isStoreActive(storeOrCode: string): boolean {
  if (!storeOrCode) return false;
  const s = storeOrCode.toString().trim().toUpperCase();
  const code = normalizeStoreCode(s);
  if (code === "KF04") return false;
  if (s.includes("KF04") || s.includes("SYAHDAN")) return false;
  return true;
}

// Helper matching function for row-based category names
export const detectCategoryFromCell = (cellVal: string, rowLen?: number): "psm" | "serba" | "pwp" | "seger" | "rtd" | "telur" | "ceban" | "toys" | "new_member" | "bootle" | "total" | null => {
  const norm = cellVal.toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // Check for target combinations
  if (norm.includes("TARGETPSM") || norm.includes("TARGERPSM") || norm.includes("TGTPSM") || norm.includes("PSMTARGET") || norm.includes("PSMTARGER") || norm.includes("PSMTGT")) {
    return "psm";
  }
  if (norm.includes("TARGETSERBA") || norm.includes("TARGERSERBA") || norm.includes("TGTSERBA") || norm.includes("SERBATARGET") || norm.includes("SERBATARGER") || norm.includes("SERBAHEMAT") || norm.includes("SEHEMAT") || norm.includes("HEMAT") || norm.includes("SH") || norm.includes("TARGETSERTIS") || norm.includes("SERTISTARGET") || norm.includes("SERTIS")) {
    return "serba";
  }
  if (norm.includes("TARGETPWP") || norm.includes("TARGERPWP") || norm.includes("TGTPWP") || norm.includes("PWPTARGET") || norm.includes("PWPTARGER") || norm.includes("PWPTGT")) {
    return "pwp";
  }
  if (norm.includes("TARGETSEGER") || norm.includes("TARGERSEGER") || norm.includes("TGTSEGER") || norm.includes("SEGERTARGET") || norm.includes("SEGERTARGER") || norm.includes("SEGERTGT") || norm.includes("SGRTARGET") || norm.includes("TARGETSGR") || norm.includes("SEGERA") || norm.includes("SGR")) {
    return "seger";
  }
  if (norm.includes("TARGETRTD") || norm.includes("TARGERRTD") || norm.includes("TGTRTD") || norm.includes("RTDTARGET") || norm.includes("RTDTARGER") || norm.includes("RTDTGT")) {
    return "rtd";
  }
  if (norm.includes("TARGETTELUR") || norm.includes("TARGERTELUR") || norm.includes("TGTTELUR") || norm.includes("TELURTARGET") || norm.includes("TELURTARGER") || norm.includes("TELURTGT") || norm.includes("TELUR")) {
    return "telur";
  }
  if (norm.includes("TARGETCEBAN") || norm.includes("CEBANTARGET") || norm.includes("CEBAN") || norm.includes("TARGETCEMILANCEBAN") || norm.includes("CEMILANCEBAN") || norm.includes("CEMILAN") || norm.includes("TARGETCEMILAN")) {
    return "ceban";
  }
  if (norm.includes("TARGETTOYS") || norm.includes("TOYSTARGET") || norm.includes("TOYS") || norm.includes("MAINAN")) {
    return "toys";
  }
  if (norm.includes("TARGETMEMBER") || norm.includes("MEMBERTARGET") || norm.includes("MEMBER") || norm.includes("NEWMEMBER") || norm.includes("MBR") || norm.includes("TARGETNEWMEMBER")) {
    return "new_member";
  }
  if (norm.includes("TARGETBOOTLE") || norm.includes("BOOTLETARGET") || norm.includes("TARGETBOTTLE") || norm.includes("BOTTLETARGET") || norm.includes("BOOTLE") || norm.includes("BOTTLE") || norm.includes("BOTOL") || norm.includes("SUSU")) {
    return "bootle";
  }
  if (norm.includes("TARGETTOTAL") || norm.includes("TARGERTOTAL") || norm.includes("TGTTOTAL") || norm.includes("GRANDTOTAL") || norm.includes("TOTALTARGET") || norm.includes("TOTALTARGER") || norm.includes("TOTALTGT") || norm === "JUMLAH" || norm === "TOTAL") {
    return "total";
  }

  // fallback base strings
  if (norm === "PSM") return "psm";
  if (norm === "SERBA" || norm === "SERBAGRATIS") return "serba";
  if (norm === "PWP") return "pwp";
  if (norm === "SEGER" || norm === "SGR") return "seger";
  if (norm === "RTD" || norm === "RTDCOFFEDAY") return "rtd";
  if (norm === "TELUR") return "telur";
  if (norm === "CEBAN" || norm === "CEMILANCEBAN" || norm === "CEMILAN" || norm === "TARGETCEMILANCEBAN" || norm === "TARGETCEMILAN") return "ceban";
  if (norm === "TOYS" || norm === "MAINAN") return "toys";
  if (norm === "MEMBER" || norm === "NEWMEMBER") return "new_member";
  if (norm === "BOOTLE" || norm === "BOTTLE" || norm === "BOTOL" || norm.includes("SUSU")) return "bootle";
  if (norm === "TOTAL" || norm === "GRANDTOTAL") return "total";

  return null;
};


/**
 * Intelligent parser to parse TARGET sheet values (2D array of strings) into target data.
 * Adheres to dynamic matching of labels and cell positioning.
 * Sums up targets across all rows if they are inputted daily/per date.
 */
export function parseTargetSheetData(values: string[][]): TargetData {
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
    bootle: 0,
    total: 0,
  };

  if (!values || values.length < 1) return defaultTargets;

  // Helper to parse numbers safely
  const parseNum = (val: any): number => {
    if (val === undefined || val === null) return 0;
    const valStr = val.toString().trim();
    // Exclude dates, times, barcodes or other values with many non-alphanumeric chars
    if (/[\/\-:\\]/.test(valStr)) return 0;
    
    let clean = valStr.replace(/rp/gi, "").replace(/\s/g, "");
    
    if (clean.includes(".") && clean.includes(",")) {
      clean = clean.replace(/\./g, "").replace(/,/g, ".");
    } else if (clean.includes(",")) {
      const postComma = clean.split(",")[1];
      if (postComma && postComma.length === 3) {
        clean = clean.replace(/,/g, "");
      } else {
        clean = clean.replace(/,/g, ".");
      }
    } else if (clean.includes(".")) {
      const postDot = clean.split(".")[1];
      if (postDot && postDot.length === 3 && (clean.match(/\./g) || []).length === 1) {
        clean = clean.replace(/\./g, "");
      }
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Gather columns that represent "Total" or "Jumlah" so we can exclude them from the row sums
  const totalColIndices = new Set<number>();
  for (let r = 0; r < Math.min(values.length, 12); r++) {
    const row = values[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const val = row[c]?.toString().trim().toUpperCase() || "";
      if (val === "TOTAL" || val === "JUMLAH" || val === "GRAND TOTAL" || val === "SUM" || val.includes("TOTAL TARGET")) {
        totalColIndices.add(c);
      }
    }
  }

  // Attempt to build colIndexToDate first
  const colIndexToDate: Record<number, string> = {};
  for (let r = 0; r < Math.min(values.length, 10); r++) {
    const row = values[r];
    if (!row) continue;
    let dateCount = 0;
    const temp: Record<number, string> = {};
    for (let c = 0; c < row.length; c++) {
      const cellVal = row[c]?.toString().trim() || "";
      const norm = normalizeDateStr(cellVal);
      if (norm && /^\d{2}\/\d{2}\/\d{4}$/.test(norm)) {
        dateCount++;
        temp[c] = norm;
      }
    }
    if (dateCount >= 2) {
      Object.assign(colIndexToDate, temp);
      break;
    }
  }

  const targetsByDate: Record<string, { psm: number; serba: number; pwp: number; seger: number; rtd: number; telur?: number; ceban?: number; toys?: number; new_member?: number; bootle?: number; total: number }> = {};
  const targetsByStoreAndDate: Record<string, Record<string, { psm: number; serba: number; pwp: number; seger: number; rtd: number; telur?: number; ceban?: number; toys?: number; new_member?: number; bootle?: number; total: number }>> = {};

  // 1. First, check for ROW-BASED target labels in the sheet
  let psmRowSum = 0;
  let serbaRowSum = 0;
  let pwpRowSum = 0;
  let segerRowSum = 0;
  let rtdRowSum = 0;
  let telurRowSum = 0;
  let cebanRowSum = 0;
  let toysRowSum = 0;
  let newMemberRowSum = 0;
  let bootleRowSum = 0;
  let totalRowSum = 0;

  let rowPsmFound = false;
  let rowSerbaFound = false;
  let rowPwpFound = false;
  let rowSegerFound = false;
  let rowRtdFound = false;
  let rowTelurFound = false;
  let rowCebanFound = false;
  let rowToysFound = false;
  let rowNewMemberFound = false;
  let rowBootleFound = false;
  let rowTotalFound = false;

  for (let rowIdx = 0; rowIdx < values.length; rowIdx++) {
    const row = values[rowIdx];
    if (!row || row.length === 0) continue;

    // Check if any cell in the row matches a category target label
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cellVal = row[colIdx]?.toString().trim() || "";
      if (!cellVal) continue;

      const matchCat = detectCategoryFromCell(cellVal, row.length);

      if (matchCat) {
        let rowSum = 0;
        let hasValueInRow = false;

        // Collect all non-zero numbers in this row, along with their column indices
        const numbers: { val: number; idx: number }[] = [];
        for (let c = 0; c < row.length; c++) {
          if (c === colIdx) continue;
          
          const cellStr = row[c]?.toString().trim() || "";
          if (!cellStr) continue;

          // Exclude date signatures like 11/06/2026 or 11-12-2026
          if (/[\/\-:\\]/.test(cellStr)) continue;

          const val = parseNum(row[c]);
          if (val > 0) {
            numbers.push({ val, idx: c });
          }
        }

        if (numbers.length > 0) {
          hasValueInRow = true;
          
          // To support returning the explicit "Grand Total" written in the sheet as requested by the user,
          // we check if there's an explicit Total/Grand Total column, a last cell total, or column E.
          let rowGrandTotalVal = 0;
          let foundExplicitTotal = false;

          // 1. Check if we have total column indices (explicit Total/Grand Total columns)
          for (let i = 0; i < numbers.length; i++) {
            if (totalColIndices.has(numbers[i].idx)) {
              rowGrandTotalVal = numbers[i].val;
              foundExplicitTotal = true;
              break;
            }
          }

          // 2. Or check if the last cell is exactly equal to the sum of all other cells in the row
          const lastObj = numbers[numbers.length - 1];
          let sumOfOthers = 0;
          for (let i = 0; i < numbers.length - 1; i++) {
            sumOfOthers += numbers[i].val;
          }
          const isLastColTotal = numbers.length > 1 && Math.abs(lastObj.val - sumOfOthers) < 0.01;

          if (!foundExplicitTotal && isLastColTotal) {
            rowGrandTotalVal = lastObj.val;
            foundExplicitTotal = true;
          }

          // 3. Or check Column E (index 4) for PSM / other categories as fallback for explicit Total index
          if (!foundExplicitTotal && row.length > 4) {
            const valInColE = parseNum(row[4]);
            if (valInColE > 0) {
              rowGrandTotalVal = valInColE;
              foundExplicitTotal = true;
            }
          }

          // 4. Default: fallback to the last numeric element if others are not matching
          if (!foundExplicitTotal && numbers.length > 0) {
            rowGrandTotalVal = lastObj.val;
            foundExplicitTotal = true;
          }

          // Set rowSum directly to the Grand Total value found so card targets reflect the written Grand Total
          rowSum = rowGrandTotalVal;
        }

        // Also look vertically (just below) if there are no horizontal numbers (fallback)
        if (!hasValueInRow) {
          for (let nextRow = rowIdx + 1; nextRow < Math.min(values.length, rowIdx + 4); nextRow++) {
            const val = parseNum(values[nextRow]?.[colIdx]);
            if (val > 0) {
              rowSum = val;
              hasValueInRow = true;
              break;
            }
          }
        }

        if (hasValueInRow && rowSum > 0) {
          if (matchCat === "psm") { psmRowSum += rowSum; rowPsmFound = true; }
          else if (matchCat === "serba") { serbaRowSum += rowSum; rowSerbaFound = true; }
          else if (matchCat === "pwp") { pwpRowSum += rowSum; rowPwpFound = true; }
          else if (matchCat === "seger") { segerRowSum += rowSum; rowSegerFound = true; }
          else if (matchCat === "rtd") { rtdRowSum += rowSum; rowRtdFound = true; }
          else if (matchCat === "telur") { telurRowSum += rowSum; rowTelurFound = true; }
          else if (matchCat === "ceban") { cebanRowSum += rowSum; rowCebanFound = true; }
          else if (matchCat === "toys") { toysRowSum += rowSum; rowToysFound = true; }
          else if (matchCat === "new_member") { newMemberRowSum += rowSum; rowNewMemberFound = true; }
          else if (matchCat === "bootle") { bootleRowSum += rowSum; rowBootleFound = true; }
          else if (matchCat === "total") { totalRowSum += rowSum; rowTotalFound = true; }

          // Populate targetsByDate and targetsByStoreAndDate dynamically for row-based layout!
          if (Object.keys(colIndexToDate).length > 0) {
            for (let c = 0; c < row.length; c++) {
              if (c === colIdx) continue;
              const normDate = colIndexToDate[c];
              if (!normDate) continue;
              const val = parseNum(row[c]);
              if (val >= 0) {
                if (!targetsByDate[normDate]) {
                  targetsByDate[normDate] = { psm: 0, serba: 0, pwp: 0, seger: 0, rtd: 0, telur: 0, ceban: 0, toys: 0, new_member: 0, bootle: 0, total: 0 };
                }
                const catKey = matchCat;
                if (catKey !== "total") {
                  (targetsByDate[normDate] as any)[catKey] = val;
                } else {
                  targetsByDate[normDate].total = val;
                }

                // Also populate for dummy/any store selection fallback in the dashboard
                const dummyStores = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54", "ALL"];
                dummyStores.forEach(st => {
                  if (!targetsByStoreAndDate[st]) {
                    targetsByStoreAndDate[st] = {};
                  }
                  if (!targetsByStoreAndDate[st][normDate]) {
                    targetsByStoreAndDate[st][normDate] = { psm: 0, serba: 0, pwp: 0, seger: 0, rtd: 0, telur: 0, ceban: 0, toys: 0, new_member: 0, bootle: 0, total: 0 };
                  }
                  if (catKey !== "total") {
                    (targetsByStoreAndDate[st][normDate] as any)[catKey] = val;
                  } else {
                    targetsByStoreAndDate[st][normDate].total = val;
                  }
                });
              }
            }
          }
        }
        break; // Match once per row to avoid double counting
      }
    }
  }

  // 2. Second, check if there is a multi-column TABLE layout (where multiple category columns are in a single row)
  let headerRowIdx = -1;
  let psmColIdx = -1;
  let serbaColIdx = -1;
  let pwpColIdx = -1;
  let segerColIdx = -1;
  let rtdColIdx = -1;
  let telurColIdx = -1;
  let cebanColIdx = -1;
  let toysColIdx = -1;
  let newMemberColIdx = -1;
  let bootleColIdx = -1;
  let totalColIdx = -1;

  for (let i = 0; i < Math.min(values.length, 15); i++) {
    const row = values[i];
    if (!row) continue;
    const items = row.map(cell => cell?.toString().toLowerCase().trim() || "");
    
    const psmIdx = items.findIndex(h => h === "psm" || (h.includes("psm") && !h.includes("total")));
    const serbaIdx = items.findIndex(h => h === "serba" || h.includes("serba") || h.includes("serba hemat") || h === "sehemat" || h.includes("hemat") || h === "sh" || h.includes("sh") || h === "sertis" || h.includes("sertis"));
    const pwpIdx = items.findIndex(h => h === "pwp" || h.includes("pwp"));
    const segerIdx = items.findIndex(h => h === "seger" || h.includes("seger") || h === "sgr" || h.includes("sgr") || h.includes("segera"));
    const rtdIdx = items.findIndex(h => h === "rtd" || h.includes("rtd"));
    const telurIdx = items.findIndex(h => h === "telur" || h.includes("telur") || h.includes("target telur"));
    let cebanIdx = items.findIndex(h => h === "ceban" || h.includes("ceban") || h.includes("target ceban") || h.includes("cemilan ceban") || h.includes("target cemilan ceban") || h.includes("target_cemilan_ceban") || h.includes("target cemilan"));
    if (items.length >= 10 && cebanIdx === -1) {
      cebanIdx = 9; // Column J (A=0, B=1, ... J=9)
    }
    const toysIdx = items.findIndex(h => h === "toys" || h.includes("toys") || h.includes("mainan") || h.includes("target toys"));
    const newMemberIdx = items.findIndex(h => h === "member" || h.includes("member") || h === "mbr" || h.includes("new member") || h.includes("target new member") || h.includes("actual new") || h === "new");
    const bootleIdx = items.findIndex(h => h === "bootle" || h.includes("bootle") || h === "bottle" || h.includes("bottle") || h.includes("botol") || h.includes("susu"));
    const totalIdx = items.findIndex(h => h === "total" || h === "grand total" || h.includes("total target"));

    const matchedCols = (psmIdx !== -1 ? 1 : 0) + (serbaIdx !== -1 ? 1 : 0) + (pwpIdx !== -1 ? 1 : 0) + (segerIdx !== -1 ? 1 : 0) + (rtdIdx !== -1 ? 1 : 0) + (telurIdx !== -1 ? 1 : 0) + (cebanIdx !== -1 ? 1 : 0) + (toysIdx !== -1 ? 1 : 0) + (newMemberIdx !== -1 ? 1 : 0) + (bootleIdx !== -1 ? 1 : 0);
    if (matchedCols >= 2) {
      headerRowIdx = i;
      // Force Target PSM to Column E (index 4) if present, as requested: "Untuk target PSM di ambil dari sheet TARGET dan berada pada baris E"
      psmColIdx = (items.length > 4) ? 4 : psmIdx;
      serbaColIdx = serbaIdx;
      pwpColIdx = pwpIdx;
      segerColIdx = segerIdx;
      rtdColIdx = rtdIdx;
      telurColIdx = telurIdx;
      cebanColIdx = cebanIdx;
      toysColIdx = toysIdx;
      newMemberColIdx = newMemberIdx;
      bootleColIdx = bootleIdx;
      totalColIdx = totalIdx;
      break;
    }
  }

  let tablePsm = 0;
  let tableSerba = 0;
  let tablePwp = 0;
  let tableSeger = 0;
  let tableRtd = 0;
  let tableTelur = 0;
  let tableCeban = 0;
  let tableToys = 0;
  let tableNewMember = 0;
  let tableBootle = 0;
  let tableTotal = 0;
  let tableDataFound = false;
  let foundTableGrandTotal = false;

  // Use pre-declared targetsByDate and targetsByStoreAndDate

  if (headerRowIdx !== -1) {
    const headerItems = values[headerRowIdx]?.map(cell => cell?.toString().toLowerCase().trim() || "") || [];
    let dateColIdx = headerItems.findIndex(h => /tanggal|date|tgl|hari|waktu/i.test(h));
    if (dateColIdx === -1) {
      // scanned fallback check
      for (let c = 0; c < headerItems.length; c++) {
        let isDateCol = false;
        for (let r = headerRowIdx + 1; r < Math.min(values.length, headerRowIdx + 5); r++) {
          const valStr = values[r]?.[c]?.toString().trim() || "";
          if (/[\/\-:\\]/.test(valStr) && valStr.length >= 5) {
            isDateCol = true;
            break;
          }
        }
        if (isDateCol) {
          dateColIdx = c;
          break;
        }
      }
    }

    let storeColIdx = headerItems.findIndex(h => 
      /kode.*toko|toko.*kode|kd.*toko|kd.*outlet|kode.*outlet|^kode$|^store$|^salesperson$|^toko$|^outlet$|salesperson|cabang/i.test(h)
    );
    if (storeColIdx === -1) {
      // scanned fallback check
      for (let c = 0; c < headerItems.length; c++) {
        let isStoreCol = false;
        for (let r = headerRowIdx + 1; r < Math.min(values.length, headerRowIdx + 10); r++) {
          const valStr = values[r]?.[c]?.toString().trim() || "";
          if (/^[a-zA-Z]{1,2}\d{2,4}\b/.test(valStr)) {
            isStoreCol = true;
            break;
          }
        }
        if (isStoreCol) {
          storeColIdx = c;
          break;
        }
      }
    }

    // A. First search for a explicit Grand Total / Total / Jumlah row
    for (let i = headerRowIdx + 1; i < values.length; i++) {
      const row = values[i];
      if (!row || row.length === 0) continue;

      const rowStr = row.join(" ").toLowerCase();
      const isGrandTotalLike = rowStr.includes("grand total") || 
                                rowStr.includes("total target") || 
                                rowStr.includes("jumlah") || 
                                (rowStr.includes("total") && 
                                 !rowStr.includes("target psm") && 
                                 !rowStr.includes("target serba") && 
                                 !rowStr.includes("target pwp") && 
                                 !rowStr.includes("target seger") &&
                                 !rowStr.includes("target rtd"));

      // Standard row-by-row daily targets mapping
      if (!isGrandTotalLike) {
        const dateStrRaw = dateColIdx !== -1 && row[dateColIdx] ? row[dateColIdx].toString().trim() : "";
        const normDate = dateStrRaw ? normalizeDateStr(dateStrRaw) : "";
        
        const storeStrRaw = storeColIdx !== -1 && row[storeColIdx] ? row[storeColIdx].toString().trim() : "";
        const normStore = storeStrRaw ? normalizeStoreCode(storeStrRaw) : "";

        if (storeStrRaw && (!isStoreActive(storeStrRaw) || !isStoreActive(normStore))) {
          continue;
        }

        if (normDate) {
          const psmVal = psmColIdx !== -1 ? parseNum(row[psmColIdx]) : 0;
          const serbaVal = serbaColIdx !== -1 ? parseNum(row[serbaColIdx]) : 0;
          const pwpVal = pwpColIdx !== -1 ? parseNum(row[pwpColIdx]) : 0;
          const segerVal = segerColIdx !== -1 ? parseNum(row[segerColIdx]) : 0;
          const rtdVal = rtdColIdx !== -1 ? parseNum(row[rtdColIdx]) : 0;
          const telurVal = telurColIdx !== -1 ? parseNum(row[telurColIdx]) : 0;
          const cebanVal = cebanColIdx !== -1 ? parseNum(row[cebanColIdx]) : 0;
          const toysVal = toysColIdx !== -1 ? parseNum(row[toysColIdx]) : 0;
          const newMemberVal = newMemberColIdx !== -1 ? parseNum(row[newMemberColIdx]) : 0;
          const bootleVal = bootleColIdx !== -1 ? parseNum(row[bootleColIdx]) : 0;
          const totalVal = totalColIdx !== -1 ? parseNum(row[totalColIdx]) : 0;

          const rowTarget = {
            psm: psmVal,
            serba: serbaVal,
            pwp: pwpVal,
            seger: segerVal,
            rtd: rtdVal,
            telur: telurVal,
            ceban: cebanVal,
            toys: toysVal,
            new_member: newMemberVal,
            bootle: bootleVal,
            total: totalVal > 0 ? totalVal : (psmVal + serbaVal + pwpVal + segerVal + rtdVal + telurVal + cebanVal + toysVal + newMemberVal + bootleVal),
          };

          // Accumulate overall by date
          if (!targetsByDate[normDate]) {
            targetsByDate[normDate] = { psm: 0, serba: 0, pwp: 0, seger: 0, rtd: 0, telur: 0, ceban: 0, toys: 0, new_member: 0, bootle: 0, total: 0 };
          }
          targetsByDate[normDate].psm += psmVal;
          targetsByDate[normDate].serba += serbaVal;
          targetsByDate[normDate].pwp += pwpVal;
          targetsByDate[normDate].seger += segerVal;
          targetsByDate[normDate].rtd += rtdVal;
          if (targetsByDate[normDate].telur === undefined) targetsByDate[normDate].telur = 0;
          targetsByDate[normDate].telur += telurVal;
          if (targetsByDate[normDate].ceban === undefined) targetsByDate[normDate].ceban = 0;
          targetsByDate[normDate].ceban += cebanVal;
          if (targetsByDate[normDate].toys === undefined) targetsByDate[normDate].toys = 0;
          targetsByDate[normDate].toys += toysVal;
          if (targetsByDate[normDate].new_member === undefined) targetsByDate[normDate].new_member = 0;
          targetsByDate[normDate].new_member += newMemberVal;
          if (targetsByDate[normDate].bootle === undefined) targetsByDate[normDate].bootle = 0;
          targetsByDate[normDate].bootle += bootleVal;
          targetsByDate[normDate].total += rowTarget.total;

          // Map by store and date
          if (normStore) {
            if (!targetsByStoreAndDate[normStore]) {
              targetsByStoreAndDate[normStore] = {};
            }
            if (!targetsByStoreAndDate[normStore][normDate]) {
              targetsByStoreAndDate[normStore][normDate] = { psm: 0, serba: 0, pwp: 0, seger: 0, rtd: 0, telur: 0, ceban: 0, toys: 0, new_member: 0, bootle: 0, total: 0 };
            }
            targetsByStoreAndDate[normStore][normDate].psm += psmVal;
            targetsByStoreAndDate[normStore][normDate].serba += serbaVal;
            targetsByStoreAndDate[normStore][normDate].pwp += pwpVal;
            targetsByStoreAndDate[normStore][normDate].seger += segerVal;
            targetsByStoreAndDate[normStore][normDate].rtd += rtdVal;
            if (targetsByStoreAndDate[normStore][normDate].telur === undefined) targetsByStoreAndDate[normStore][normDate].telur = 0;
            targetsByStoreAndDate[normStore][normDate].telur += telurVal;
            if (targetsByStoreAndDate[normStore][normDate].ceban === undefined) targetsByStoreAndDate[normStore][normDate].ceban = 0;
            targetsByStoreAndDate[normStore][normDate].ceban += cebanVal;
            if (targetsByStoreAndDate[normStore][normDate].toys === undefined) targetsByStoreAndDate[normStore][normDate].toys = 0;
            targetsByStoreAndDate[normStore][normDate].toys += toysVal;
            if (targetsByStoreAndDate[normStore][normDate].new_member === undefined) targetsByStoreAndDate[normStore][normDate].new_member = 0;
            targetsByStoreAndDate[normStore][normDate].new_member += newMemberVal;
            if (targetsByStoreAndDate[normStore][normDate].bootle === undefined) targetsByStoreAndDate[normStore][normDate].bootle = 0;
            targetsByStoreAndDate[normStore][normDate].bootle += bootleVal;
            targetsByStoreAndDate[normStore][normDate].total += rowTarget.total;
          }
        }
      }

      if (isGrandTotalLike) {
        const psmVal = psmColIdx !== -1 ? parseNum(row[psmColIdx]) : 0;
        const serbaVal = serbaColIdx !== -1 ? parseNum(row[serbaColIdx]) : 0;
        const pwpVal = pwpColIdx !== -1 ? parseNum(row[pwpColIdx]) : 0;
        const segerVal = segerColIdx !== -1 ? parseNum(row[segerColIdx]) : 0;
        const rtdVal = rtdColIdx !== -1 ? parseNum(row[rtdColIdx]) : 0;
        const telurVal = telurColIdx !== -1 ? parseNum(row[telurColIdx]) : 0;
        const cebanVal = cebanColIdx !== -1 ? parseNum(row[cebanColIdx]) : 0;
        const toysVal = toysColIdx !== -1 ? parseNum(row[toysColIdx]) : 0;
        const newMemberVal = newMemberColIdx !== -1 ? parseNum(row[newMemberColIdx]) : 0;
        const bootleVal = bootleColIdx !== -1 ? parseNum(row[bootleColIdx]) : 0;
        const totalVal = totalColIdx !== -1 ? parseNum(row[totalColIdx]) : 0;

        if (psmVal > 0 || serbaVal > 0 || pwpVal > 0 || segerVal > 0 || rtdVal > 0 || telurVal > 0 || cebanVal > 0 || toysVal > 0 || newMemberVal > 0 || bootleVal > 0) {
          tablePsm = psmVal;
          tableSerba = serbaVal;
          tablePwp = pwpVal;
          tableSeger = segerVal;
          tableRtd = rtdVal;
          tableTelur = telurVal;
          tableCeban = cebanVal;
          tableToys = toysVal;
          tableNewMember = newMemberVal;
          tableBootle = bootleVal;
          tableTotal = totalVal > 0 ? totalVal : (psmVal + serbaVal + pwpVal + segerVal + rtdVal + telurVal + cebanVal + toysVal + newMemberVal + bootleVal);
          tableDataFound = true;
          foundTableGrandTotal = true;
          break;
        }
      }
    }

    // B. Fallback to summing up rows if no explicit Grand Total row is found
    if (!foundTableGrandTotal) {
      for (let i = headerRowIdx + 1; i < values.length; i++) {
        const row = values[i];
        if (!row || row.length === 0) continue;

        const rowStr = row.join(" ").toLowerCase();
        if (rowStr.includes("grand total") || rowStr.includes("total target") || rowStr.includes("jumlah") || (rowStr.includes("total") && !rowStr.includes("target psm") && !rowStr.includes("target serba"))) {
          continue;
        }

        const psmVal = psmColIdx !== -1 ? parseNum(row[psmColIdx]) : 0;
        const serbaVal = serbaColIdx !== -1 ? parseNum(row[serbaColIdx]) : 0;
        const pwpVal = pwpColIdx !== -1 ? parseNum(row[pwpColIdx]) : 0;
        const segerVal = segerColIdx !== -1 ? parseNum(row[segerColIdx]) : 0;
        const rtdVal = rtdColIdx !== -1 ? parseNum(row[rtdColIdx]) : 0;
        const telurVal = telurColIdx !== -1 ? parseNum(row[telurColIdx]) : 0;
        const cebanVal = cebanColIdx !== -1 ? parseNum(row[cebanColIdx]) : 0;
        const toysVal = toysColIdx !== -1 ? parseNum(row[toysColIdx]) : 0;
        const newMemberVal = newMemberColIdx !== -1 ? parseNum(row[newMemberColIdx]) : 0;
        const bootleVal = bootleColIdx !== -1 ? parseNum(row[bootleColIdx]) : 0;
        const totalVal = totalColIdx !== -1 ? parseNum(row[totalColIdx]) : 0;

        if (psmVal > 0 || serbaVal > 0 || pwpVal > 0 || segerVal > 0 || rtdVal > 0 || telurVal > 0 || cebanVal > 0 || toysVal > 0 || newMemberVal > 0 || bootleVal > 0 || totalVal > 0) {
          tablePsm += psmVal;
          tableSerba += serbaVal;
          tablePwp += pwpVal;
          tableSeger += segerVal;
          tableRtd += rtdVal;
          tableTelur += telurVal;
          tableCeban += cebanVal;
          tableToys += toysVal;
          tableNewMember += newMemberVal;
          tableBootle += bootleVal;
          tableTotal += totalVal > 0 ? totalVal : (psmVal + serbaVal + pwpVal + segerVal + rtdVal + telurVal + cebanVal + toysVal + newMemberVal + bootleVal);
          tableDataFound = true;
        }
      }
    }
  }

  // 3. Resolve final targets
  // If we found a valid multi-column table layout, we prioritize the table-based target columns over row-based fallbacks 
  // (which can be triggered incorrectly by table header labels like "Target PSM" via the vertical lookahead fallback)
  const useTableLayout = (headerRowIdx !== -1 && tableDataFound);

  let finalPsm = Math.round(useTableLayout && tablePsm > 0 ? tablePsm : (rowPsmFound && psmRowSum > 0 ? psmRowSum : (foundTableGrandTotal ? tablePsm : (tableDataFound && tablePsm > 0 ? tablePsm : 0))));
  let finalSerba = Math.round(useTableLayout && tableSerba > 0 ? tableSerba : (rowSerbaFound && serbaRowSum > 0 ? serbaRowSum : (foundTableGrandTotal ? tableSerba : (tableDataFound && tableSerba > 0 ? tableSerba : 0))));
  let finalPwp = Math.round(useTableLayout && tablePwp > 0 ? tablePwp : (rowPwpFound && pwpRowSum > 0 ? pwpRowSum : (foundTableGrandTotal ? tablePwp : (tableDataFound && tablePwp > 0 ? tablePwp : 0))));
  let finalSeger = Math.round(useTableLayout && tableSeger > 0 ? tableSeger : (rowSegerFound && segerRowSum > 0 ? segerRowSum : (foundTableGrandTotal ? tableSeger : (tableDataFound && tableSeger > 0 ? tableSeger : 0))));
  let finalRtd = Math.round(useTableLayout && tableRtd > 0 ? tableRtd : (rowRtdFound && rtdRowSum > 0 ? rtdRowSum : (foundTableGrandTotal ? tableRtd : (tableDataFound && tableRtd > 0 ? tableRtd : 0))));
  let finalTelur = Math.round(useTableLayout && tableTelur > 0 ? tableTelur : (rowTelurFound && telurRowSum > 0 ? telurRowSum : (foundTableGrandTotal ? tableTelur : (tableDataFound && tableTelur > 0 ? tableTelur : 0))));
  let finalCeban = Math.round(useTableLayout && tableCeban > 0 ? tableCeban : (rowCebanFound && cebanRowSum > 0 ? cebanRowSum : (foundTableGrandTotal ? tableCeban : (tableDataFound && tableCeban > 0 ? tableCeban : 0))));
  let finalToys = Math.round(useTableLayout && tableToys > 0 ? tableToys : (rowToysFound && toysRowSum > 0 ? toysRowSum : (foundTableGrandTotal ? tableToys : (tableDataFound && tableToys > 0 ? tableToys : 0))));
  let finalNewMember = Math.round(useTableLayout && tableNewMember > 0 ? tableNewMember : (rowNewMemberFound && newMemberRowSum > 0 ? newMemberRowSum : (foundTableGrandTotal ? tableNewMember : (tableDataFound && tableNewMember > 0 ? tableNewMember : 0))));
  let finalBootle = Math.round(useTableLayout && tableBootle > 0 ? tableBootle : (rowBootleFound && bootleRowSum > 0 ? bootleRowSum : (foundTableGrandTotal ? tableBootle : (tableDataFound && tableBootle > 0 ? tableBootle : 0))));

  if (finalPsm <= 0) finalPsm = 0;
  if (finalSerba <= 0) finalSerba = 0;
  if (finalPwp <= 0) finalPwp = 0;
  if (finalSeger <= 0) finalSeger = 0;
  if (finalRtd <= 0) finalRtd = 0;
  if (finalTelur <= 0) finalTelur = 0;
  if (finalCeban <= 0) finalCeban = 0;
  if (finalToys <= 0) finalToys = 0;
  if (finalNewMember <= 0) finalNewMember = 0;
  if (finalBootle <= 0) finalBootle = 0;
  
  const finalSumTotal = finalPsm + finalSerba + finalPwp + finalSeger + finalRtd + finalTelur + finalCeban + finalToys + finalNewMember + finalBootle;
  const finalTotalVal = Math.round(
    foundTableGrandTotal ? tableTotal : (rowTotalFound ? totalRowSum : (tableDataFound && tableTotal > 0 ? tableTotal : (finalSumTotal > 0 ? finalSumTotal : defaultTargets.total)))
  );

  // Post-process targetsByDate to ensure total is correct
  Object.keys(targetsByDate).forEach((date) => {
    const t = targetsByDate[date];
    if (t) {
      const computedTotal = (t.psm || 0) + (t.serba || 0) + (t.pwp || 0) + (t.seger || 0) + (t.rtd || 0) + (t.telur || 0) + (t.ceban || 0) + (t.toys || 0) + (t.new_member || 0) + (t.bootle || 0);
      if (!t.total || t.total <= 0) {
        t.total = computedTotal;
      }
    }
  });

  return {
    psm: finalPsm,
    serba: finalSerba,
    pwp: finalPwp,
    seger: finalSeger,
    rtd: finalRtd,
    ceban: finalCeban,
    telur: finalTelur,
    toys: finalToys,
    new_member: finalNewMember,
    bootle: finalBootle,
    total: finalTotalVal,
    targetsByDate,
    targetsByStoreAndDate,
  };
}

/**
 * Intelligent summarizer of active categories versus targeting requirements
 * Matches precisely with Copas report sequential filter logic to retain complete harmony
 */
export function calculateActualMetrics(records: SalesRecord[]) {
  let psmActual = 0;
  let serbaActual = 0;
  let pwpActual = 0;
  let segerActual = 0;
  let rtdActual = 0;
  let rtdBasicActual = 0;
  let totalActual = 0;
  let cebanActual = 0;
  let telurActual = 0;
  let toysActual = 0;
  let newMemberActual = 0;
  let bootleActual = 0;

  // Local day of week check helper
  const isMonWedFriLocal = (dateStr: string): boolean => {
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
    // Fallback for string representations
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) {
      const dayOfWeek = fallbackDate.getDay();
      return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
    }
    const lower = dateStr.toLowerCase();
    return lower.includes("mon") || lower.includes("wed") || lower.includes("fri") ||
           lower.includes("senin") || lower.includes("rabu") || lower.includes("jumat") || lower.includes("jum'at");
  };

  // Match codes: KE45, KC36, KD17, K883, KF66, KD54
  const rtdStores = ["KE45", "KC36", "KD17", "K883", "KF66", "KD54"];

  records.forEach((r) => {
    const sp = r.salesperson || "";
    if (!isStoreActive(sp)) return;

    const cat = (r.category || "").toUpperCase().trim();
    const prod = (r.product || "").toUpperCase().trim();
    const qty = r.quantity || 0;
    const spUpper = sp.toUpperCase().trim();

    const catLower = cat.toLowerCase();
    const prodLower = prod.toLowerCase();

    // Harmonized sequential if-else logic matching Copas report directly
    if (cat === "PSM" || cat.includes("PSM") || prod.includes("PSM")) {
      psmActual += qty;
    } else if (cat === "SERBA" || cat.includes("SERBA") || cat === "SH" || cat === "SERTIS" || cat.includes("SERTIS") || prod.includes("SERBA") || prod.includes("SERTIS") || prod.includes("SH")) {
      serbaActual += qty;
    } else if (cat === "PWP" || cat.includes("PWP") || prod.includes("PWP")) {
      pwpActual += qty;
    } else if (cat === "SEGER" || cat.includes("SEGER") || cat === "SGR" || prod.includes("SEGER") || prod.includes("SGR")) {
      segerActual += qty;
    } else if (cat === "TELUR" || cat.includes("TELUR") || prod.includes("TELUR")) {
      telurActual += qty;
    } else if (cat === "RTD" || cat === "RTD BASIC" || cat.includes("RTD") || cat === "COFFE" || cat.includes("COFFE") || cat.includes("COFFEDAY") || prod.includes("RTD") || prod.includes("COFFE")) {
      const isEligibleCoffeStore = rtdStores.some(code => spUpper.includes(code.toUpperCase()));
      if (isEligibleCoffeStore) {
        if (r.date && isMonWedFriLocal(r.date)) {
          rtdActual += qty;
        }
      } else {
        rtdBasicActual += qty;
      }
    } else if (catLower.includes("ceban") || prodLower.includes("ceban") || catLower.includes("actual ceban") || prodLower.includes("actual ceban") || catLower.includes("cemilan") || prodLower.includes("cemilan")) {
      cebanActual += qty;
    } else if (catLower.includes("toys") || prodLower.includes("toys") || catLower.includes("mainan") || prodLower.includes("mainan")) {
      toysActual += qty;
    } else if (catLower.includes("member") || prodLower.includes("member") || catLower === "mbr" || catLower.includes("actual new") || prodLower.includes("actual new") || catLower === "new" || prodLower === "new" || catLower === "new member" || prodLower === "new member") {
      newMemberActual += qty;
    } else if (catLower.includes("bootle") || prodLower.includes("bootle") || catLower.includes("bottle") || prodLower.includes("bottle") || catLower.includes("botol") || prodLower.includes("botol") || catLower.includes("susu") || prodLower.includes("susu")) {
      bootleActual += qty;
    }

    totalActual += qty;
  });

  return {
    psmActual,
    serbaActual,
    pwpActual,
    segerActual,
    rtdActual,
    rtdBasicActual,
    totalActual,
    cebanActual,
    telurActual,
    toysActual,
    newMemberActual,
    bootleActual,
  };
}

/**
 * Intelligent parser to parse Google Sheet values (2D array of strings) into SalesRecord list.
 * Recognizes Indonesian and English headers.
 */
export function parseRawSheetData(values: string[][]): SalesRecord[] {
  if (!values || values.length < 2) return [];

  // Helper to score a row (or merged row pair) based on header keywords
  const getRowScore = (rowCells: string[]): { score: number; matchedCols: Set<string> } => {
    let score = 0;
    const matchedCols = new Set<string>();

    rowCells.forEach((cell) => {
      if (!cell) return;
      const clean = cell.toString().toLowerCase().trim();
      if (!clean) return;

      if (/tanggal|tgl|date|periode|hari|waktu/i.test(clean)) {
        score += 3; matchedCols.add("date");
      }
      if (/kode.*toko|kode.*outlet|kd.*toko|kd.*outlet|^kode$|store.*code|no.*toko|id.*toko/i.test(clean)) {
        score += 3; matchedCols.add("kode");
      }
      if (/nama.*toko|nama.*outlet|outlet|nama.*cabang|toko|store.*name/i.test(clean)) {
        score += 3; matchedCols.add("nama");
      }
      if (/\bpsm\b|target psm|aktual psm|ach psm|pencapaian psm|psm \(pcs\)|qty psm/i.test(clean)) {
        score += 4; matchedCols.add("psm");
      }
      if (/\bserba\b|serba gratis|serba hemat|\bsh\b|\bsertis\b|sehemat|pencapaian serba|aktual serba|serbatis/i.test(clean)) {
        score += 4; matchedCols.add("serba");
      }
      if (/\bpwp\b|target pwp|aktual pwp|pencapaian pwp/i.test(clean)) {
        score += 4; matchedCols.add("pwp");
      }
      if (/\bseger\b|segera|\bsgr\b|aktual seger|pencapaian seger/i.test(clean)) {
        score += 4; matchedCols.add("seger");
      }
      if (/\brtd\b|rtd coffeday|rtd basic|coffe|coffeday|pencapaian rtd|aktual rtd/i.test(clean)) {
        score += 4; matchedCols.add("rtd");
      }
      if (/\bceban\b|nominal ceban|actual ceban|cemilan ceban|cemilan|pencapaian ceban/i.test(clean)) {
        score += 4; matchedCols.add("ceban");
      }
      if (/\btelur\b|target telur|actual telur|pencapaian telur/i.test(clean)) {
        score += 4; matchedCols.add("telur");
      }
      if (/\btoys\b|mainan|target toys|actual toys|pencapaian toys/i.test(clean)) {
        score += 4; matchedCols.add("toys");
      }
      if (/\bnew member\b|\bmember\b|\bmbr\b|actual new member|pencapaian new member|actual new/i.test(clean)) {
        score += 4; matchedCols.add("new_member");
      }
      if (/\bbootle\b|\bbottle\b|\bbotol\b|\bsusu\b|target bootle|actual bootle|actual bottle|pencapaian bootle|pencapaian bottle|penjualan bootle|penjualan bottle/i.test(clean)) {
        score += 4; matchedCols.add("bootle");
      }
      if (/produk|product|barang|item|nama.*barang|sku/i.test(clean)) {
        score += 2; matchedCols.add("product");
      }
      if (/kategori|category|jenis|tipe/i.test(clean)) {
        score += 2; matchedCols.add("category");
      }
      if (/jumlah|qty|quantity|pcs|vol|volume/i.test(clean)) {
        score += 2; matchedCols.add("qty");
      }
      if (/total|omset|omzet|subtotal|amount/i.test(clean)) {
        score += 2; matchedCols.add("total");
      }
      if (/salesperson|sales|marketing|penjual/i.test(clean)) {
        score += 2; matchedCols.add("salesperson");
      }
    });

    return { score, matchedCols };
  };

  let bestHeaderIndex = 0;
  let maxScore = -1;
  let mergedHeaders: string[] = [];

  const maxScan = Math.min(values.length, 25);
  for (let i = 0; i < maxScan; i++) {
    const row = values[i];
    if (!row) continue;

    const rowCells = row.map(c => c?.toString() || "");
    const { score, matchedCols } = getRowScore(rowCells);

    if (score > maxScore) {
      maxScore = score;
      bestHeaderIndex = i;
      mergedHeaders = rowCells.map(c => c.toLowerCase().trim());
    }

    // Check merged adjacent row pair (row i + row i+1)
    if (i + 1 < maxScan && values[i + 1]) {
      const nextRow = values[i + 1];
      const maxCols = Math.max(row.length, nextRow.length);
      const combinedCells: string[] = [];
      for (let c = 0; c < maxCols; c++) {
        const c1 = row[c]?.toString().trim() || "";
        const c2 = nextRow[c]?.toString().trim() || "";
        combinedCells.push(c1 && c2 && c1.toLowerCase() !== c2.toLowerCase() ? `${c1} ${c2}` : (c1 || c2));
      }
      const pairRes = getRowScore(combinedCells);
      if (pairRes.matchedCols.size > matchedCols.size && pairRes.score > maxScore) {
        maxScore = pairRes.score;
        bestHeaderIndex = i + 1; // Data rows start after row i+1
        mergedHeaders = combinedCells.map(c => c.toLowerCase().trim());
      }
    }
  }

  if (maxScore <= 0) {
    for (let i = 0; i < maxScan; i++) {
      if (values[i] && values[i].filter(c => c && c.toString().trim() !== "").length >= 2) {
        bestHeaderIndex = i;
        mergedHeaders = values[i].map(c => c?.toString().toLowerCase().trim() || "");
        break;
      }
    }
  }

  const headers = mergedHeaders;

  // Detect Wide Outlet/Horizontal Format:
  const hasPSMCol = headers.some(h => /\bpsm\b|target psm|aktual psm|ach psm|pencapaian psm|psm \(pcs\)|qty psm/i.test(h));
  const hasSerbaCol = headers.some(h => /\bserba\b|serba gratis|serba hemat|\bsh\b|\bsertis\b|sehemat|pencapaian serba|aktual serba|serbatis/i.test(h));
  const hasPWPCol = headers.some(h => /\bpwp\b|target pwp|aktual pwp|pencapaian pwp/i.test(h));
  const hasSegerCol = headers.some(h => /\bseger\b|segera|\bsgr\b|aktual seger|pencapaian seger/i.test(h));
  const hasRTDCol = headers.some(h => /\brtd\b|rtd coffeday|rtd basic|coffe|coffeday|pencapaian rtd|aktual rtd/i.test(h));
  const hasCebanCol = headers.some(h => /\bceban\b|nominal ceban|actual ceban|cemilan ceban|cemilan|pencapaian ceban/i.test(h));
  const hasTelurCol = headers.some(h => /\btelur\b|target telur|actual telur|pencapaian telur/i.test(h));
  const hasToysCol = headers.some(h => /\btoys\b|mainan|target toys|actual toys|pencapaian toys/i.test(h));
  const hasNewMemberCol = headers.some(h => /\bnew member\b|\bmember\b|\bmbr\b|actual new member|pencapaian new member|actual new/i.test(h));
  const hasBootleCol = headers.some(h => /\bbootle\b|\bbottle\b|\bbotol\b|\bsusu\b|target bootle|actual bootle|actual bottle|pencapaian bootle|pencapaian bottle|penjualan bootle|penjualan bottle/i.test(h));

  const isWideOutletFormat = (hasPSMCol ? 1 : 0) + (hasSerbaCol ? 1 : 0) + (hasPWPCol ? 1 : 0) + (hasSegerCol ? 1 : 0) + (hasRTDCol ? 1 : 0) + (hasCebanCol ? 1 : 0) + (hasTelurCol ? 1 : 0) + (hasToysCol ? 1 : 0) + (hasNewMemberCol ? 1 : 0) + (hasBootleCol ? 1 : 0) >= 1;

  // Find Kode Toko, Nama Toko, Date, Region indices
  let kodeIdx = -1;
  let namaIdx = -1;
  let dateIdx = -1;
  let regionIdx = -1;

  for (let j = 0; j < headers.length; j++) {
    const h = headers[j];
    if (!h) continue;
    if (kodeIdx === -1 && /kode.*toko|kode.*outlet|kd.*toko|kd.*outlet|^kode$|store.*code|no.*toko|id.*toko/i.test(h)) {
      kodeIdx = j;
    } else if (namaIdx === -1 && /nama.*toko|nama.*outlet|outlet|nama.*cabang|toko|store.*name/i.test(h)) {
      namaIdx = j;
    } else if (dateIdx === -1 && /tanggal|date|tgl|hari|waktu|periode/i.test(h)) {
      dateIdx = j;
    } else if (regionIdx === -1 && /wilayah|region|lokasi|cabang|kota|area|branch/i.test(h)) {
      regionIdx = j;
    }
  }

  // Fallback dateIdx auto-detector if not found by header text
  if (dateIdx === -1) {
    for (let c = 0; c < headers.length; c++) {
      let dateMatchCount = 0;
      for (let r = bestHeaderIndex + 1; r < Math.min(values.length, bestHeaderIndex + 15); r++) {
        const valStr = values[r]?.[c]?.toString().trim() || "";
        if (valStr && (/[\/\-:\\]/.test(valStr) || /\b(20\d{2}|\d{2})\b/.test(valStr))) {
          dateMatchCount++;
        }
      }
      if (dateMatchCount >= 2) {
        dateIdx = c;
        break;
      }
    }
  }

  const parseNum = (val: any): number => {
    if (val === undefined || val === null) return 0;
    let clean = val.toString().replace(/rp/gi, "").replace(/\s/g, "");
    if (clean.includes(".") && clean.includes(",")) {
      clean = clean.replace(/\./g, "").replace(/,/g, ".");
    } else if (clean.includes(",")) {
      const postComma = clean.split(",")[1];
      if (postComma && postComma.length === 3) {
        clean = clean.replace(/,/g, "");
      } else {
        clean = clean.replace(/,/g, ".");
      }
    } else if (clean.includes(".")) {
      const postDot = clean.split(".")[1];
      if (postDot && postDot.length === 3 && (clean.match(/\./g) || []).length === 1) {
        clean = clean.replace(/\./g, "");
      }
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // 1. WIDE OUTLET FORMAT PARSING
  if (isWideOutletFormat) {
    const findColIdx = (regex: RegExp) => headers.findIndex(h => regex.test(h));

    const psmColIdx = findColIdx(/\bpsm\b|target psm|aktual psm|ach psm|pencapaian psm|psm \(pcs\)|qty psm/i);
    const serbaColIdx = findColIdx(/\bserba\b|serba gratis|serba hemat|\bsh\b|\bsertis\b|sehemat|pencapaian serba|aktual serba|serbatis/i);
    const pwpColIdx = findColIdx(/\bpwp\b|target pwp|aktual pwp|pencapaian pwp/i);
    const segerColIdx = findColIdx(/\bseger\b|segera|\bsgr\b|aktual seger|pencapaian seger/i);
    const rtdColIdx = findColIdx(/\brtd\b|rtd coffeday|rtd basic|coffe|coffeday|pencapaian rtd|aktual rtd/i);
    const cebanColIdx = findColIdx(/\bceban\b|nominal ceban|actual ceban|cemilan ceban|cemilan|pencapaian ceban/i);
    const telurColIdx = findColIdx(/\btelur\b|target telur|actual telur|pencapaian telur/i);
    const toysColIdx = findColIdx(/\btoys\b|mainan|target toys|actual toys|pencapaian toys/i);
    const newMemberColIdx = findColIdx(/\bnew member\b|\bmember\b|\bmbr\b|actual new member|pencapaian new member|actual new/i);
    const bootleColIdx = findColIdx(/\bbootle\b|\bbottle\b|\bbotol\b|\bsusu\b|target bootle|actual bootle|actual bottle|pencapaian bootle|pencapaian bottle|penjualan bootle|penjualan bottle/i);

    const records: SalesRecord[] = [];
    let lastSeenDate = "";
    let lastSeenKode = "";
    let lastSeenNama = "";

    for (let i = bestHeaderIndex + 1; i < values.length; i++) {
      const row = values[i];
      if (!row || row.length === 0) continue;

      const isEmpty = row.every((cell) => !cell || cell.toString().trim() === "");
      if (isEmpty) continue;

      let dateStr = dateIdx !== -1 && row[dateIdx] ? row[dateIdx].toString().trim() : "";
      if (dateStr) {
        lastSeenDate = dateStr;
      } else if (lastSeenDate) {
        dateStr = lastSeenDate;
      }

      let kodeStr = kodeIdx !== -1 && row[kodeIdx] ? row[kodeIdx].toString().trim() : "";
      if (kodeStr) {
        lastSeenKode = kodeStr;
      }

      let namaStr = namaIdx !== -1 && row[namaIdx] ? row[namaIdx].toString().trim() : "";
      if (namaStr) {
        lastSeenNama = namaStr;
      }

      const outletIdentity = (kodeStr && namaStr) ? `${kodeStr} - ${namaStr}` : (namaStr || kodeStr || (lastSeenKode || lastSeenNama ? `${lastSeenKode} - ${lastSeenNama}`.replace(/^ - |, - $/g, "") : "Outlet"));
      const regionStr = regionIdx !== -1 && row[regionIdx] ? row[regionIdx].toString().trim() : "Nasional";

      if (
        outletIdentity.toLowerCase().includes("grand total") ||
        outletIdentity.toLowerCase() === "total" ||
        dateStr.toLowerCase().includes("total") ||
        !isStoreActive(outletIdentity) ||
        !isStoreActive(kodeStr) ||
        !isStoreActive(namaStr)
      ) {
        continue;
      }

      const colsToCheck = [
        { idx: psmColIdx, name: "PSM" },
        { idx: serbaColIdx, name: "Serba" },
        { idx: pwpColIdx, name: "PWP" },
        { idx: segerColIdx, name: "Seger" },
        { idx: rtdColIdx, name: "RTD" },
        { idx: cebanColIdx, name: "CEBAN" },
        { idx: telurColIdx, name: "TELUR" },
        { idx: toysColIdx, name: "TOYS" },
        { idx: newMemberColIdx, name: "NEW MEMBER" },
        { idx: bootleColIdx, name: "BOTTLE" },
      ];

      colsToCheck.forEach((col) => {
        if (col.idx !== -1) {
          const rawCell = row[col.idx];
          const isCellEmpty = rawCell === undefined || rawCell === null || rawCell.toString().trim() === "";
          const qty = parseNum(rawCell);
          if (qty >= 0) {
            records.push({
              id: `record-wide-${i}-${col.name}`,
              date: dateStr || "Tanpa Tanggal",
              product: col.name,
              category: col.name,
              quantity: qty,
              price: 1,
              total: qty,
              salesperson: outletIdentity,
              region: regionStr,
              status: isCellEmpty ? "EMPTY" : "FILLED",
              rawData: row.map((c) => c?.toString() || ""),
            });
          }
        }
      });
    }

    if (records.length > 0) return records;
  }

  // 1b. ROW-BASED CATEGORY MATRIX PARSING (DASHBOARD row-based format)
  const categoryRows: { rowIdx: number; catName: string; catColIdx: number }[] = [];
  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    if (!row) continue;
    for (let c = 0; c < Math.min(row.length, 5); c++) {
      const cellVal = row[c]?.toString().trim() || "";
      if (!cellVal) continue;
      const cat = detectCategoryFromCell(cellVal, row.length);
      if (cat && cat !== "total") {
        categoryRows.push({
          rowIdx: r,
          catName: cat === "bootle" ? "BOTTLE" :
                   cat === "psm" ? "PSM" :
                   cat === "serba" ? "SERBA" :
                   cat === "pwp" ? "PWP" :
                   cat === "seger" ? "SEGER" :
                   cat === "rtd" ? "RTD" :
                   cat === "telur" ? "TELUR" :
                   cat === "ceban" ? "CEBAN" :
                   cat === "toys" ? "TOYS" :
                   cat === "new_member" ? "NEW MEMBER" : String(cat).toUpperCase(),
          catColIdx: c,
        });
        break;
      }
    }
  }

  if (categoryRows.length >= 1) {
    const matrixRecords: SalesRecord[] = [];
    const colDateMap: Record<number, string> = {};
    const colStoreMap: Record<number, string> = {};

    for (let r = 0; r < Math.min(values.length, 12); r++) {
      const row = values[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const val = row[c]?.toString().trim() || "";
        if (!val) continue;

        if (!colDateMap[c] && (/[\/\-:\\]/.test(val) || /\b(20\d{2}|\d{2})\b/.test(val)) && !/total|target|actual|pencapaian|qty/i.test(val)) {
          const normD = normalizeDateStr(val);
          if (normD && normD !== val) {
            colDateMap[c] = normD;
          } else if (/^\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?$/.test(val)) {
            colDateMap[c] = val;
          }
        }

        if (!colStoreMap[c] && (/^[Kk][A-Za-z0-9]{3,6}$/.test(val) || /store|toko|outlet|cabang/i.test(val))) {
          colStoreMap[c] = val;
        }
      }
    }

    categoryRows.forEach(({ rowIdx, catName, catColIdx }) => {
      const row = values[rowIdx];
      if (!row) return;

      let rowStore = "";
      let rowDate = "";
      for (let c = 0; c < catColIdx; c++) {
        const val = row[c]?.toString().trim() || "";
        if (!val) continue;
        if (/^[Kk][A-Za-z0-9]{3,6}$/.test(val)) rowStore = val;
        else if (/[\/\-]/.test(val)) rowDate = val;
      }

      for (let c = catColIdx + 1; c < row.length; c++) {
        const rawCell = row[c];
        if (rawCell === undefined || rawCell === null) continue;
        const qty = parseNum(rawCell);
        if (qty >= 0) {
          const dateStr = colDateMap[c] || rowDate || "Tanpa Tanggal";
          const storeStr = colStoreMap[c] || rowStore || "Outlet";
          if (!isStoreActive(storeStr)) continue;
          matrixRecords.push({
            id: `record-matrix-${rowIdx}-${c}-${catName}`,
            date: dateStr,
            product: catName,
            category: catName,
            quantity: qty,
            price: 1,
            total: qty,
            salesperson: storeStr,
            region: "Nasional",
            status: qty === 0 ? "EMPTY" : "FILLED",
            rawData: row.map(cell => cell?.toString() || ""),
          });
        }
      }
    });

    if (matrixRecords.length > 0) {
      return matrixRecords;
    }
  }

  // 2. STANDARD TRANSACTION ROUTE
  let productIdx = -1;
  let categoryIdx = -1;
  let quantityIdx = -1;
  let priceIdx = -1;
  let totalIdx = -1;
  let salespersonIdx = -1;

  for (let j = 0; j < headers.length; j++) {
    const header = headers[j];
    if (!header) continue;

    if (productIdx === -1 && /produk|product|barang|item|nama.*barang|nama.*produk|sku/i.test(header)) {
      productIdx = j;
    } else if (categoryIdx === -1 && /kategori|category|jenis|tipe|type|group|klasifikasi/i.test(header)) {
      categoryIdx = j;
    } else if (quantityIdx === -1 && /jumlah|qty|quantity|kuantitas|vol|volume|pcs|unit|buah/i.test(header)) {
      quantityIdx = j;
    } else if (priceIdx === -1 && /harga|price|satuan|rate|tarif|cost/i.test(header)) {
      priceIdx = j;
    } else if (totalIdx === -1 && /total|omset|omzet|subtotal|nilai|amount|pendapatan|revenue/i.test(header)) {
      totalIdx = j;
    } else if (salespersonIdx === -1 && /sales|penjual|salesperson|marketing|staf|salesman|agen/i.test(header)) {
      salespersonIdx = j;
    }
  }

  if (dateIdx === -1 && headers.length > 0) dateIdx = 0;
  if (productIdx === -1 && headers.length > 1) productIdx = 1;
  if (categoryIdx === -1 && headers.length > 2) categoryIdx = 2;
  if (quantityIdx === -1 && headers.length > 3) quantityIdx = 3;
  if (priceIdx === -1 && headers.length > 4) priceIdx = 4;
  if (totalIdx === -1 && headers.length > 5) totalIdx = 5;
  if (salespersonIdx === -1 && headers.length > 6) salespersonIdx = 6;
  if (regionIdx === -1 && headers.length > 7) regionIdx = 7;

  const records: SalesRecord[] = [];
  let lastSeenDate = "";

  for (let i = bestHeaderIndex + 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length === 0) continue;

    const isEmpty = row.every((cell) => !cell || cell.toString().trim() === "");
    if (isEmpty) continue;

    let dateStr = dateIdx !== -1 && row[dateIdx] ? row[dateIdx].toString().trim() : "";
    if (dateStr) {
      lastSeenDate = dateStr;
    } else if (lastSeenDate) {
      dateStr = lastSeenDate;
    }

    const productStr = productIdx !== -1 && row[productIdx] ? row[productIdx].toString().trim() : "Produk Tidak Dikenal";
    const categoryStr = categoryIdx !== -1 && row[categoryIdx] ? row[categoryIdx].toString().trim() : "Lainnya";

    const kodeStr = kodeIdx !== -1 && row[kodeIdx] ? row[kodeIdx].toString().trim() : "";
    const namaStr = namaIdx !== -1 && row[namaIdx] ? row[namaIdx].toString().trim() : "";
    const outletIdentity = (kodeStr && namaStr) ? `${kodeStr} - ${namaStr}` : (namaStr || kodeStr || "");

    const salespersonStr = salespersonIdx !== -1 && row[salespersonIdx] ? row[salespersonIdx].toString().trim() : (outletIdentity || "Umum");
    const regionStr = regionIdx !== -1 && row[regionIdx] ? row[regionIdx].toString().trim() : "Nasional";

    if (
      productStr.toLowerCase().includes("grand total") ||
      productStr.toLowerCase() === "total" ||
      categoryStr.toLowerCase() === "total" ||
      dateStr.toLowerCase().includes("total") ||
      !isStoreActive(salespersonStr) ||
      !isStoreActive(outletIdentity) ||
      !isStoreActive(kodeStr) ||
      !isStoreActive(namaStr)
    ) {
      continue;
    }

    const qty = quantityIdx !== -1 ? parseNum(row[quantityIdx]) : 1;
    const price = priceIdx !== -1 ? parseNum(row[priceIdx]) : 0;
    let total = totalIdx !== -1 ? parseNum(row[totalIdx]) : 0;

    if (total === 0 && price > 0 && qty > 0) {
      total = price * qty;
    }

    records.push({
      id: `record-${i}`,
      date: dateStr || "Tanpa Tanggal",
      product: productStr,
      category: categoryStr,
      quantity: qty,
      price: price === 0 && qty > 0 ? total / qty : price,
      total: total,
      salesperson: salespersonStr,
      region: regionStr,
      rawData: row.map((c) => c?.toString() || ""),
    });
  }

  return records;
}

/**
 * Summarize sales history to high level KPI cards
 */
export function calculateKPIs(records: SalesRecord[]): SalesKPIs {
  if (records.length === 0) {
    return {
      totalSales: 0,
      totalTransactions: 0,
      averageTransactionValue: 0,
      totalQuantity: 0,
      topCategory: { name: "N/A", value: 0 },
      topProduct: { name: "N/A", value: 0 },
      topSalesperson: { name: "N/A", value: 0 },
    };
  }

  const totalSales = records.reduce((sum, r) => sum + r.total, 0);
  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
  const totalTransactions = records.length;
  const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  // Map aggregates
  const categoryMap: Record<string, number> = {};
  const productMap: Record<string, number> = {};
  const salesMap: Record<string, number> = {};

  records.forEach((r) => {
    categoryMap[r.category] = (categoryMap[r.category] || 0) + r.total;
    productMap[r.product] = (productMap[r.product] || 0) + r.total;
    salesMap[r.salesperson] = (salesMap[r.salesperson] || 0) + r.total;
  });

  const getTop = (map: Record<string, number>) => {
    let topName = "N/A";
    let topVal = 0;
    Object.entries(map).forEach(([name, val]) => {
      if (val > topVal) {
        topVal = val;
        topName = name;
      }
    });
    return { name: topName, value: topVal };
  };

  return {
    totalSales,
    totalTransactions,
    averageTransactionValue,
    totalQuantity,
    topCategory: getTop(categoryMap),
    topProduct: getTop(productMap),
    topSalesperson: getTop(salesMap),
  };
}

/**
 * Break down sales per generic category
 */
export function getCategoryBreakdown(records: SalesRecord[]): CategoryBreakdown[] {
  const map: Record<string, { sales: number; count: number }> = {};
  records.forEach((r) => {
    if (!map[r.category]) {
      map[r.category] = { sales: 0, count: 0 };
    }
    map[r.category].sales += r.total;
    map[r.category].count += r.quantity;
  });

  const totalSales = records.reduce((sum, r) => sum + r.total, 0);

  return Object.entries(map)
    .map(([category, info]) => ({
      category,
      sales: info.sales,
      percentage: totalSales > 0 ? (info.sales / totalSales) * 100 : 0,
      count: info.count,
    }))
    .sort((a, b) => b.sales - a.sales);
}

/**
 * Dynamic monthly categorization
 */
export function getMonthlyTrend(records: SalesRecord[]): MonthlyTrend[] {
  const map: Record<string, { sales: number; transactions: number; qty: number }> = {};

  records.forEach((r) => {
    // Intelligently parse month name from Indonesian/English style date string
    // e.g., "12/01/2026", "2026-02-15", "Januari 2026"
    let monthKey = "Lainnya";
    const dateStr = r.date;

    if (dateStr) {
      // Try mapping standard ISO pattern 2026-05-12 -> 05
      const isoMatch = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
      // Try mapping standard Indo DD/MM/YYYY pattern 12/05/2026 -> 05
      const dmyMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);

      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
        "Jul", "Ags", "Sep", "Okt", "Nov", "Des"
      ];

      if (isoMatch) {
        const monthIndex = parseInt(isoMatch[2], 10) - 1;
        const year = isoMatch[1];
        if (monthIndex >= 0 && monthIndex < 12) {
          monthKey = `${monthNames[monthIndex]} ${year}`;
        }
      } else if (dmyMatch) {
        const monthIndex = parseInt(dmyMatch[2], 10) - 1;
        const year = dmyMatch[3];
        if (monthIndex >= 0 && monthIndex < 12) {
          monthKey = `${monthNames[monthIndex]} ${year}`;
        }
      } else {
        // Match string names
        const lowerDate = dateStr.toLowerCase();
        let foundMonth = "";
        let foundYear = "";

        const indoMonthMap: Record<string, string> = {
          jan: "Jan", janua: "Jan", feb: "Feb", peb: "Feb", mar: "Mar", apr: "Apr",
          mei: "Mei", may: "Mei", jun: "Jun", jul: "Jul", agu: "Ags", aug: "Ags",
          sep: "Sep", okt: "Okt", oct: "Okt", nov: "Nov", des: "Des", dec: "Des"
        };

        for (const [sub, mKey] of Object.entries(indoMonthMap)) {
          if (lowerDate.includes(sub)) {
            foundMonth = mKey;
            break;
          }
        }

        const yearMatch = dateStr.match(/\b(20\d{2})\b/);
        if (yearMatch) foundYear = yearMatch[1];

        if (foundMonth) {
          monthKey = foundYear ? `${foundMonth} ${foundYear}` : foundMonth;
        } else {
          // If fallback fails, truncate or slice first 7 chars (e.g. "2026-06")
          monthKey = dateStr.length > 7 ? dateStr.substring(0, 7) : dateStr;
        }
      }
    }

    if (!map[monthKey]) {
      map[monthKey] = { sales: 0, transactions: 0, qty: 0 };
    }
    map[monthKey].sales += r.total;
    map[monthKey].qty += r.quantity;
    map[monthKey].transactions += 1;
  });

  // Reorder chronologically if possible, or keep as is
  const monthOrder = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
    "Jul", "Ags", "Sep", "Okt", "Nov", "Des"
  ];

  return Object.entries(map)
    .map(([month, info]) => ({
      month,
      sales: info.sales,
      transactions: info.transactions,
      quantity: info.qty,
    }))
    .sort((a, b) => {
      // Sort helper by month name and year
      const getScore = (mStr: string) => {
        const parts = mStr.split(" ");
        const mName = parts[0];
        const yNum = parts[1] ? parseInt(parts[1], 10) : 2026;
        const mIdx = monthOrder.indexOf(mName);
        return yNum * 12 + (mIdx !== -1 ? mIdx : 0);
      };
      return getScore(a.month) - getScore(b.month);
    });
}

/**
 * Top selling items
 */
export function getProductPerformance(records: SalesRecord[]): ProductPerformance[] {
  const map: Record<string, { sales: number; qty: number; category: string }> = {};

  records.forEach((r) => {
    if (!map[r.product]) {
      map[r.product] = { sales: 0, qty: 0, category: r.category };
    }
    map[r.product].sales += r.total;
    map[r.product].qty += r.quantity;
  });

  return Object.entries(map)
    .map(([product, info]) => ({
      product,
      sales: info.sales,
      quantity: info.qty,
      category: info.category,
    }))
    .sort((a, b) => b.sales - a.sales);
}

/**
 * Salesperson revenue generation dashboard
 */
export function getSalespersonPerformance(records: SalesRecord[]): SalespersonPerformance[] {
  const map: Record<string, { sales: number; transactions: number }> = {};

  records.forEach((r) => {
    if (!map[r.salesperson]) {
      map[r.salesperson] = { sales: 0, transactions: 0 };
    }
    map[r.salesperson].sales += r.total;
    map[r.salesperson].transactions += 1;
  });

  return Object.entries(map)
    .map(([name, info]) => ({
      name,
      sales: info.sales,
      transactions: info.transactions,
    }))
    .sort((a, b) => b.sales - a.sales);
}

/**
 * Regional sales breakdown
 */
export function getRegionBreakdown(records: SalesRecord[]): RegionBreakdown[] {
  const map: Record<string, number> = {};
  records.forEach((r) => {
    map[r.region] = (map[r.region] || 0) + r.total;
  });

  const totalSales = records.reduce((sum, r) => sum + r.total, 0);

  return Object.entries(map)
    .map(([region, sales]) => ({
      region,
      sales,
      percentage: totalSales > 0 ? (sales / totalSales) * 100 : 0,
    }))
    .sort((a, b) => b.sales - a.sales);
}

/**
 * Beautiful comprehensive sandbox default sales data (Indonesian context, e.g. electronics store "Galaxy Elektronik")
 */
export function getFallbackData(): SalesRecord[] {
  const products = [
    { name: "Minyak Goreng Sania 2L [PSM]", category: "PSM", price: 38500 },
    { name: "Susu Frisian Flag UHT [PSM]", category: "PSM", price: 18200 },
    { name: "Teh Botol Sosro Kotak [PSM]", category: "PSM", price: 7200 },
    { name: "Kopi Instan Kapal Api [PSM]", category: "PSM", price: 12500 },
    
    { name: "Soklin Pembersih Lantai 800ml [Serba]", category: "Serba", price: 14500 },
    { name: "Mama Lemon Sabun Piring [Serba]", category: "Serba", price: 9200 },
    { name: "Paseo Facial Tissue 250s [Serba]", category: "Serba", price: 13900 },
    { name: "Sari Roti Tawar Kupas [Serba]", category: "Serba", price: 15500 },
    
    { name: "Maspion Wajan Teflon Pro [PWP]", category: "PWP", price: 62000 },
    { name: "Payung Lipat J-Series [PWP]", category: "PWP", price: 42000 },
    { name: "Lock&Lock Tumbler 500ml [PWP]", category: "PWP", price: 32000 },
    { name: "Set Sendok Stainless [PWP]", category: "PWP", price: 27000 },

    { name: "Apel Washington Segar [Seger]", category: "Seger", price: 35000 },
    { name: "Jeruk Pontianak Manis [Seger]", category: "Seger", price: 28000 },
    { name: "Semangka Tanpa Biji [Seger]", category: "Seger", price: 40000 },

    { name: "Susu Chocolate Can RTD", category: "RTD", price: 9500 },
    { name: "Teh Kotak Melati RTD", category: "RTD", price: 6500 },
    { name: "Kopi Nescafe Original RTD", category: "RTD", price: 11000 },

    { name: "Actual Ceban Snack Combo [Ceban]", category: "CEBAN", price: 10000 },
    { name: "Actual Telur Ayam Negeri [Telur]", category: "TELUR", price: 2500 },
    { name: "Actual Toys Lego Mini [Toys]", category: "TOYS", price: 15000 },
    { name: "New Member Registration [New Member]", category: "NEW MEMBER", price: 0 },
  ];

  const salesPeople = [
    "KE45 - Toko Maju Jaya",
    "KC36 - Toko Berkah",
    "KD17 - Toko Laris",
    "K883 - Star Minom",
    "KF66 - Fresh Mart",
    "KD54 - Indah Lestari",
    "KC99 - Toko Mandiri"
  ];
  const regions = ["Jakarta", "Bandung", "Surabaya", "Semarang", "Medan"];
  const dates = [
    "01/05/2026", "05/05/2026", "12/05/2026", "20/05/2026", "25/05/2026",
    "02/06/2026", "08/06/2026", "11/06/2026", "12/06/2026", "15/06/2026",
    "18/06/2026", "22/06/2026", "28/06/2026", "30/06/2026", "01/07/2026",
    "05/07/2026", "10/07/2026", "15/07/2026", "22/07/2026", "29/07/2026"
  ];

  // Deterministically generate a beautiful list of 35 sales transactions with robust scaling
  const records: SalesRecord[] = [];
  const seed = 42;
  const pseudoRandom = (num: number) => {
    const x = Math.sin(num) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 95; i++) {
    const r1 = pseudoRandom(seed + i);
    const r2 = pseudoRandom(seed + i * 2);
    const r3 = pseudoRandom(seed + i * 3);
    const r4 = pseudoRandom(seed + i * 4);
    const r5 = pseudoRandom(seed + i * 5);

    const product = products[Math.floor(r1 * products.length)];
    const salesperson = salesPeople[Math.floor(r2 * salesPeople.length)];
    const region = regions[Math.floor(r3 * regions.length)];
    const date = dates[Math.floor(r4 * dates.length)];
    
    // Quantity scaled, e.g., 20 to 100 units to reach beautiful total revenue millions
    const qty = Math.floor(r5 * 52) + 12; 
    const total = product.price * qty;

    records.push({
      id: `fallback-${i}`,
      date,
      product: product.name,
      category: product.category,
      quantity: qty,
      price: product.price,
      total,
      salesperson,
      region,
      rawData: [date, product.name, product.category, qty.toString(), product.price.toString(), total.toString(), salesperson, region],
    });
  }


  // Sort by date chronologically
  return records.sort((a, b) => {
    const parseDate = (dStr: string) => {
      const p = dStr.split("/");
      return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10)).getTime();
    };
    return parseDate(a.date) - parseDate(b.date);
  });
}
