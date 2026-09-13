import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Clock3,
  Mail,
  MapPin,
  Search,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/components/ui/pagination";
import { StaffShell } from "../components/StaffShell";
import { useStaffMerchantList } from "../hooks/useMerchants";
import type { StaffMerchant } from "../services/merchantService";

function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return "0";
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatPercent(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return "0%";
  return `${Number(value).toFixed(1).replace(/\.0$/, "")} %`;
}

function normalizeText(value?: string | null) {
  return value?.trim() || "N/A";
}

function parseMerchantDescription(value?: string | null) {
  if (!value) return { summary: "", facts: [] };

  const rawText = value.trim();

  // The legal KYC block begins with "---" or "THÔNG TIN PHÁP LÝ" or "KYC"
  // We cut off anything from the KYC header/separator onwards
  const kycMatch = rawText.match(/(?:^|\n|\r|---)\s*(?:THÔNG TIN PHÁP LÝ|KYC|---\s*THÔNG TIN PHÁP LÝ|---)/i);
  const introBlock = kycMatch && kycMatch.index !== undefined
    ? rawText.slice(0, kycMatch.index).trim()
    : rawText;

  // Extract facts across the entire rawText (e.g. Loại hình ẩm thực, Loại hình quán, Loại món chính)
  const allLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const facts: { label: string; value: string }[] = [];

  const metaKeywords = ["loại hình quán", "loại món chính", "loại hình ẩm thực", "ẩm thực", "địa chỉ"];
  for (const line of allLines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 35) {
      const label = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      if (metaKeywords.some((k) => label.toLowerCase().includes(k))) {
        if (!facts.some((f) => f.label.toLowerCase() === label.toLowerCase())) {
          facts.push({ label, value: val });
        }
      }
    }
  }

  // Now clean the intro lines for display
  const introLines = introBlock
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      const lower = l.toLowerCase();
      // Remove any lines that are KYC or legal leftovers
      if (
        lower.includes("thông tin pháp lý") ||
        lower.includes("định danh") ||
        lower.includes("kyc") ||
        lower.startsWith("---") ||
        lower.endsWith("---") ||
        lower.startsWith("người đại diện:") ||
        lower.startsWith("số cccd:") ||
        lower.startsWith("cccd mặt") ||
        lower.startsWith("mã số gpkd:") ||
        lower.startsWith("giấy phép kd:") ||
        lower.startsWith("ảnh không gian quán:")
      ) {
        return false;
      }
      // Also filter out any metadata lines that became facts
      if (facts.some((f) => l.toLowerCase().startsWith(`${f.label.toLowerCase()}:`))) {
        return false;
      }
      return true;
    })
    .map((l) => l.replace(/^[-\s_•*]+|[-\s_•*]+$/g, "").trim())
    .filter(Boolean);

  return {
    summary: introLines.join("\n"),
    facts,
  };
}

function getInitials(name?: string) {
  const parts = normalizeText(name).split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "MG";

  return parts
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getPageItems(totalPages: number, currentPage: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages]);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) pages.add(page);
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function getScoreTone(score?: number) {
  if (score == null) return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  if (score >= 4.5) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300";
  if (score >= 3.8) return "bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300";
  return "bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300";
}

function getLogoBg(name?: string) {
  const first = (name?.trim().charCodeAt(0) ?? 0) % 4;

  return [
    "from-cyan-600 to-sky-500",
    "from-emerald-600 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-slate-900 to-slate-700",
  ][first];
}

function MerchantCard({ merchant }: { merchant: StaffMerchant }) {
  const underratedScore = merchant.underratedScore ?? 0;
  const merchantDescription = parseMerchantDescription(merchant.description);
  const cuisineType = merchantDescription.facts.find((item) =>
    item.label.toLowerCase().includes("loại hình quán") ||
    item.label.toLowerCase().includes("loại hình ẩm thực") ||
    item.label.toLowerCase().includes("ẩm thực"),
  );
  const mainDish = merchantDescription.facts.find((item) =>
    item.label.toLowerCase().includes("loại món chính") ||
    item.label.toLowerCase().includes("món đặc trưng"),
  );

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/85 dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-xl shadow-cyan-950/5 ring-1 ring-slate-950/5 backdrop-blur-2xl transition hover:-translate-y-1 hover:shadow-2xl">
      <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br ${getLogoBg(merchant.name)} text-lg font-black text-white shadow-lg shadow-slate-950/15`}
        >
          {merchant.logoUrl ? (
            <img
              src={merchant.logoUrl}
              alt={merchant.name}
              className="h-full w-full object-cover"
            />
          ) : (
            getInitials(merchant.name)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-lg font-black tracking-tight text-slate-950 dark:text-white">
                {normalizeText(merchant.name)}
              </h3>

              <div className="mt-2 flex flex-wrap gap-2">
                {cuisineType?.value ? (
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-cyan-50 dark:bg-cyan-950/80 px-3 py-1 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/50"
                  >
                    {cuisineType.value}
                  </Badge>
                ) : null}

                {mainDish?.value ? (
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-amber-50 dark:bg-amber-950/80 px-3 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50"
                  >
                    {mainDish.value}
                  </Badge>
                ) : null}
              </div>

              {merchantDescription.summary ? (
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 break-words whitespace-pre-line">
                  {merchantDescription.summary}
                </p>
              ) : null}
            </div>

            <Badge
              variant="outline"
              className={`shrink-0 rounded-full border-0 px-3 py-1 text-xs font-black ${getScoreTone(underratedScore)}`}
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              US {underratedScore.toFixed(2)}/1.00
            </Badge>
          </div>

          <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 text-sm dark:border-white/5 dark:bg-slate-950/40">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs sm:text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200 break-words">
                {normalizeText(merchant.address)}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 break-all">
                {normalizeText(merchant.email)}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 break-words">
                {normalizeText(merchant.openingHours)}
              </span>
            </div>

            <div className="flex items-center gap-2.5 border-t border-slate-200/70 pt-2.5 dark:border-white/5">
              <Building2 className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Phí nền tảng:{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatPercent(merchant.platformFeePercent)}
                </span>
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 text-xs font-bold"
            >
              <Star className="mr-1 h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              {merchant.rating?.toFixed(1) ?? "0.0"}
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 px-3 py-1 text-xs font-bold"
            >
              <TrendingUp className="mr-1 h-3.5 w-3.5" />
              US {underratedScore.toFixed(2)}/1.00
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 text-xs font-bold"
            >
              {formatNumber(merchant.reviewCount)} đánh giá của khách
            </Badge>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function StaffMerchantsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPageIndex(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useStaffMerchantList({
      searchTerm,
      pageIndex,
      pageSize,
    });

  const merchants = useMemo(() => data?.items ?? [], [data?.items]);
  const totalItems = data?.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(data?.pageIndex ?? pageIndex, totalPages);

  const overview = useMemo(() => {
    const avgRating =
      merchants.length > 0
        ? merchants.reduce((sum, item) => sum + (item.rating ?? 0), 0) /
          merchants.length
        : 0;

    const avgUnderrated =
      merchants.length > 0
        ? merchants.reduce(
            (sum, item) => sum + (item.underratedScore ?? 0),
            0,
          ) / merchants.length
        : 0;

    const avgFee =
      merchants.length > 0
        ? merchants.reduce(
            (sum, item) => sum + (item.platformFeePercent ?? 0),
            0,
          ) / merchants.length
        : 0;

    return { avgRating, avgUnderrated, avgFee };
  }, [merchants]);

  const pageItems = getPageItems(totalPages, currentPage);

  return (
    <StaffShell activeItem="merchants">
      <div className="relative w-full">
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />
        <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative space-y-5">
          <div className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200/80 bg-white/75 p-5 backdrop-blur-xl ring-1 ring-slate-950/5 shadow-2xl shadow-cyan-950/5 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-950/30">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 shadow-sm shadow-cyan-950/5 dark:border-cyan-800/60 dark:bg-cyan-950/80 dark:text-cyan-300">
                Staff Merchant
              </div>

              <h1 className="break-words text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Danh sách merchant
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Màn tổng quan merchant dành cho Staff: tìm nhanh, xem mức đánh
                giá, phí nền tảng và thông tin liên hệ.
              </p>
            </div>
          </div>

          <section className="grid gap-4 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-5 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl xl:col-span-2 dark:border-white/10 dark:bg-slate-900/80">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">
                    Bộ lọc
                  </p>
                  <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                    Tìm merchant theo tên, mô tả hoặc email
                  </h2>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchInput("");
                    setSearchTerm("");
                    setPageIndex(1);
                  }}
                  className="rounded-2xl border-cyan-100 bg-white text-cyan-700 hover:bg-cyan-50 dark:border-white/10 dark:bg-slate-800 dark:text-cyan-300 dark:hover:bg-slate-700"
                >
                  Xoá lọc
                </Button>
              </div>

              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Nhập tên merchant, mô tả hoặc email..."
                  className="h-12 rounded-2xl border border-slate-200 bg-white/90 pl-11 text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-5 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/80">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Tổng merchant
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                {formatNumber(totalItems)}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Kết quả trên toàn bộ hệ thống.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-5 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/80">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Điểm trung bình
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                {overview.avgRating.toFixed(1)}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                US {overview.avgUnderrated.toFixed(2)}/1.00
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-5 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/80">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Phí nền tảng TB
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                {overview.avgFee.toFixed(1)}%
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Dựa trên trang hiện tại.
              </p>
            </div>
          </section>

          {isError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50/85 p-5 text-sm font-semibold text-rose-700 shadow-lg shadow-rose-950/5 ring-1 ring-rose-100 backdrop-blur-xl dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300">
              Không tải được merchant.{" "}
              {error instanceof Error ? error.message : "Vui lòng thử lại."}
            </div>
          ) : null}

          <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/65 p-4 shadow-2xl shadow-cyan-950/10 ring-1 ring-slate-950/5 backdrop-blur-2xl lg:p-5 dark:border-white/10 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                  Merchant đã đăng ký
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {isFetching && !isLoading
                    ? "Đang làm mới dữ liệu..."
                    : `Trang ${currentPage} / ${totalPages}`}
                </p>
              </div>

              <Badge
                variant="secondary"
                className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 text-xs font-black"
              >
                <Building2 className="mr-1 h-3.5 w-3.5" />
                {formatNumber(merchants.length)} merchant trên trang
              </Badge>
            </div>

            {isLoading ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: pageSize }).map((_, index) => (
                  <div
                    key={index}
                    className="h-56 animate-pulse rounded-[28px] border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-slate-800/50"
                  />
                ))}
              </div>
            ) : merchants.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {merchants.map((merchant) => (
                  <MerchantCard key={merchant.id} merchant={merchant} />
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/70 p-8 text-center dark:border-slate-800 dark:bg-slate-950/50">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  Không có merchant nào khớp bộ lọc hiện tại.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60 pt-4 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Hiển thị{" "}
                {merchants.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{" "}
                {Math.min(currentPage * pageSize, totalItems)} trên{" "}
                {formatNumber(totalItems)} merchant.
              </p>

              {totalPages > 1 ? (
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setPageIndex((value) => Math.max(1, value - 1));
                        }}
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                      />
                    </PaginationItem>

                    {pageItems.map((page, index) => {
                      const previousPage = pageItems[index - 1];
                      const shouldShowEllipsis =
                        index > 0 &&
                        previousPage !== undefined &&
                        page - previousPage > 1;

                      return (
                        <PaginationItem key={page}>
                          {shouldShowEllipsis ? <PaginationEllipsis /> : null}
                          <PaginationLink
                            href="#"
                            isActive={page === currentPage}
                            onClick={(event) => {
                              event.preventDefault();
                              setPageIndex(page);
                            }}
                            className="rounded-2xl"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setPageIndex((value) =>
                            Math.min(totalPages, value + 1),
                          );
                        }}
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </div>

            {totalPages > 1 && currentPage > 1 ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => refetch()}
                  className="rounded-2xl text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800 dark:text-cyan-300 dark:hover:bg-cyan-950/50 dark:hover:text-cyan-200"
                >
                  Làm mới dữ liệu
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </StaffShell>
  );
}
