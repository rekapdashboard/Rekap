import React, { useState, useMemo } from "react";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Calendar, Filter } from "lucide-react";
import { SalesRecord } from "../types";

interface DataTableProps {
  records: SalesRecord[];
}

export function DataTable({ records }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState("All");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [sortField, setSortField] = useState<keyof SalesRecord | "">("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Format IDR helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Get unique categories for filtering select
  const categories = useMemo(() => {
    const list = new Set<string>();
    records.forEach((r) => {
      if (r.category) list.add(r.category);
    });
    return ["All", ...Array.from(list)];
  }, [records]);

  // Get unique products for filtering select (Nama Produk)
  const products = useMemo(() => {
    const list = new Set<string>();
    records.forEach((r) => {
      if (r.product) list.add(r.product);
    });
    return ["All", ...Array.from(list).sort()];
  }, [records]);

  // Get unique regions for filtering select (Wilayah)
  const regions = useMemo(() => {
    const list = new Set<string>();
    records.forEach((r) => {
      if (r.region) list.add(r.region);
    });
    return ["All", ...Array.from(list).sort()];
  }, [records]);

  // Handle headers sorting trigger
  const handleSort = (field: keyof SalesRecord) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Trigger quick sort by Total Penjualan (Terbesar ke Terkecil)
  const triggerTotalSalesDescSort = () => {
    setSortField("total");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  // Reset all filters in one click
  const resetAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSelectedProduct("All");
    setSelectedRegion("All");
    setSortField("");
    setSortOrder("asc");
    setCurrentPage(1);
  };

  // Process rows filtering and sorting
  const processedRecords = useMemo(() => {
    let filtered = [...records];

    // Search query matches
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.product.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.salesperson.toLowerCase().includes(q) ||
          r.region.toLowerCase().includes(q)
      );
    }

    // Category matches
    if (selectedCategory !== "All") {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }

    // Product matches
    if (selectedProduct !== "All") {
      filtered = filtered.filter((r) => r.product === selectedProduct);
    }

    // Region matches
    if (selectedRegion !== "All") {
      filtered = filtered.filter((r) => r.region === selectedRegion);
    }

    // Interactive Sorting
    if (sortField !== "") {
      filtered.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        // Format special sorting for numbers vs text
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
        }

        // Special Date sorting helper
        if (sortField === "date") {
          const parseDate = (dStr: string) => {
            const p = dStr.split("/");
            if (p.length === 3) {
              return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10)).getTime();
            }
            return new Date(dStr).getTime() || 0;
          };
          aVal = parseDate(aVal as string);
          bVal = parseDate(bVal as string);
          return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        }

        const aStr = (aVal?.toString() || "").toLowerCase();
        const bStr = (bVal?.toString() || "").toLowerCase();
        return sortOrder === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    return filtered;
  }, [records, searchTerm, selectedCategory, selectedProduct, selectedRegion, sortField, sortOrder]);

  // Pagination bounds computation
  const totalItems = processedRecords.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = useMemo(() => {
    return processedRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [processedRecords, startIndex]);

  const isSortedByTotalSalesDesc = sortField === "total" && sortOrder === "desc";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
      {/* Table header controls */}
      <div className="p-5 border-b border-slate-50 dark:border-slate-800/60 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Daftar Transaksi Sheet DASHBOARD
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gunakan bilah di bawah untuk memfilter berdasarkan produk/wilayah dan mengurutkan omset penjualan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Sorter Clicker Badge */}
            <button
              onClick={triggerTotalSalesDescSort}
              className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all flex items-center gap-1.5 border ${
                isSortedByTotalSalesDesc
                  ? "bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500 shadow-sm"
                  : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-105 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30"
              }`}
              title="Urutkan berdasarkan Total Penjualan dari terbesar ke terkecil"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sortir: Penjualan Terbesar-Terkecil</span>
              {isSortedByTotalSalesDesc && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 block animate-pulse" />
              )}
            </button>

            {/* Reset Fields Button */}
            {(selectedProduct !== "All" || selectedRegion !== "All" || selectedCategory !== "All" || searchTerm || sortField) && (
              <button
                onClick={resetAllFilters}
                className="px-3 py-1.5 text-xs rounded-xl font-medium border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Filters & Search Zone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          
          {/* 1. Dynamic Search Bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari kata kunci..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
            />
          </div>

          {/* 2. Filter: Nama Produk */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-[10px]">
              <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[8px] font-bold text-slate-600 dark:text-slate-400">
                PRODUK
              </span>
            </span>
            <select
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full appearance-none pl-16 pr-8 py-1.5 text-xs rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans cursor-pointer"
            >
              <option value="All">Semua Produk</option>
              {products.filter((p) => p !== "All").map((p, idx) => (
                <option key={idx} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter: Wilayah */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <span className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[8px] font-bold text-slate-600 dark:text-slate-400">
                KOTA
              </span>
            </span>
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full appearance-none pl-14 pr-8 py-1.5 text-xs rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans cursor-pointer"
            >
              <option value="All">Semua Kota/Wilayah</option>
              {regions.filter((r) => r !== "All").map((r, idx) => (
                <option key={idx} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Filter: Kategori */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full appearance-none pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans cursor-pointer"
            >
              <option value="All">Semua Kategori</option>
              {categories.filter((c) => c !== "All").map((c, idx) => (
                <option key={idx} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Main Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] text-left border-collapse font-sans text-slate-600 dark:text-slate-400">
          <thead className="bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 font-semibold tracking-wider border-b border-slate-100 dark:border-slate-800/40">
            <tr>
              <th className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={() => handleSort("date")}>
                <div className="flex items-center gap-1.5">
                  TANGGAL <ArrowUpDown className="w-3 h-3 hover:text-slate-800" />
                </div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={() => handleSort("product")}>
                <div className="flex items-center gap-1.5">
                  PRODUK <ArrowUpDown className="w-3 h-3 hover:text-slate-800" />
                </div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={() => handleSort("category")}>
                <div className="flex items-center gap-1.5">
                  KATEGORI <ArrowUpDown className="w-3 h-3 hover:text-slate-800" />
                </div>
              </th>
              <th className="p-4 text-center cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={() => handleSort("quantity")}>
                <div className="flex items-center justify-center gap-1.5">
                  QTY <ArrowUpDown className="w-3 h-3 hover:text-slate-800" />
                </div>
              </th>
              <th className="p-4 text-right cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={() => handleSort("price")}>
                <div className="flex items-center justify-end gap-1.5">
                  HARGA <ArrowUpDown className="w-3 h-3 hover:text-slate-800" />
                </div>
              </th>
              <th className="p-4 text-right cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={() => handleSort("total")}>
                <div className="flex items-center justify-end gap-1.5">
                  TOTAL <ArrowUpDown className="w-3 h-3 hover:text-slate-800" />
                </div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={() => handleSort("salesperson")}>
                <div className="flex items-center gap-1.5">
                  SALESPERSON <ArrowUpDown className="w-3 h-3 hover:text-slate-800" />
                </div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={() => handleSort("region")}>
                <div className="flex items-center gap-1.5">
                  WILAYAH <ArrowUpDown className="w-3 h-3 hover:text-slate-800" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  Data pencarian atau filter kosong
                </td>
              </tr>
            ) : (
              paginatedRecords.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors group"
                >
                  <td className="p-4 whitespace-nowrap font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {item.date}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-500 transition-colors">
                    {item.product}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-sans text-[10px]">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                    {item.quantity}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-500">
                    {formatIDR(item.price)}
                  </td>
                  <td className="p-4 text-right font-bold font-mono text-slate-800 dark:text-slate-100">
                    {formatIDR(item.total)}
                  </td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                    {item.salesperson}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-semibold font-mono text-[10px]">
                      {item.region}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination component footer */}
      <div className="p-4 border-t border-slate-50 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          Menampilkan <span className="font-bold text-slate-700 dark:text-slate-300">{totalItems === 0 ? 0 : startIndex + 1}</span> - <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(startIndex + itemsPerPage, totalItems)}</span> dari <span className="font-semibold">{totalItems}</span> entry
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono px-3 py-1 font-semibold text-slate-700 dark:text-slate-300">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
