import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  HandCoins,
  Link2,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useSafeBack } from "@/shared/hooks/useSafeBack";

import {
  createAffiliateLink,
  getAffiliateShareUrl,
  getReviewerAffiliateEarnings,
  type AffiliateLink,
  type ReviewerAffiliateEarnings,
} from "../services";
import { searchMerchants } from "@/features/customer/services/merchantService";
import type { Merchant } from "@/features/customer/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { UserAccountMenu } from "@/shared/components/UserAccountMenu";
import { cleanAddress } from "@/shared/utils/address";
import { notify } from "@/shared/lib/notify";

function toNumber(value?: number | null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("vi-VN").format(toNumber(value));
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatPercentRate(value?: number | null) {
  const numeric = toNumber(value);
  const percent = numeric > 1 ? numeric : numeric * 100;

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(percent)}%`;
}

export default function AffiliateLinkPage() {
  const handleBack = useSafeBack("/customer");
  const [searchParams] = useSearchParams();
  const initialMerchantId = searchParams.get("merchantId") ?? "";

  const [keyword, setKeyword] = useState("");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState(initialMerchantId);
  const [affiliateLink, setAffiliateLink] = useState<AffiliateLink | null>(
    null,
  );
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [earnings, setEarnings] = useState<ReviewerAffiliateEarnings | null>(
    null,
  );
  const [loadingEarnings, setLoadingEarnings] = useState(true);
  const [copiedField, setCopiedField] = useState<"track" | "target" | null>(
    null,
  );

  const selectedMerchant = useMemo(
    () =>
      merchants.find((merchant) => merchant.id === selectedMerchantId) ?? null,
    [merchants, selectedMerchantId],
  );

  const shareUrl = useMemo(() => {
    if (!affiliateLink?.linkCode) return "";
    return getAffiliateShareUrl(affiliateLink.linkCode);
  }, [affiliateLink]);

  async function loadEarnings() {
    setLoadingEarnings(true);

    try {
      const data = await getReviewerAffiliateEarnings();
      setEarnings(data);
    } catch (error) {
      console.error(error);
      notify.error("Không tải được số tiền affiliate.");
    } finally {
      setLoadingEarnings(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void loadEarnings());
  }, []);

  useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setLoadingMerchants(true);

      try {
        const data = await searchMerchants({
          keyword,
          pageIndex: 1,
          pageSize: 20,
        });

        if (active) {
          setMerchants(data);
        }
      } catch (error) {
        console.error(error);
        if (active) {
          notify.error("Không tải được danh sách quán.");
        }
      } finally {
        if (active) {
          setLoadingMerchants(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [keyword]);

  async function handleCreateLink() {
    if (!selectedMerchantId) {
      notify.error("Vui lòng chọn một quán.");
      return;
    }

    setIsSubmitting(true);
    setCopiedField(null);

    try {
      const result = await createAffiliateLink({
        merchantId: selectedMerchantId,
      });

      setAffiliateLink(result);
      void loadEarnings();
      notify.success("Đã tạo liên kết affiliate.");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      notify.error(
        message.includes("quyền")
          ? "Tài khoản hiện tại chưa được backend cấp quyền tạo affiliate link."
          : message || "Tạo liên kết affiliate thất bại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyToClipboard(value: string, field: "track" | "target") {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      notify.success("Đã sao chép liên kết.");
      window.setTimeout(() => setCopiedField(null), 1600);
    } catch (error) {
      console.error(error);
      notify.error("Không thể sao chép liên kết.");
    }
  }

  return (
    <div className="app-page">
      <header className="border-b border-white/80 bg-white/75 shadow-sm shadow-cyan-950/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-3xl font-black">UGem</h1>
            <p className="text-sm font-medium text-slate-500">
              Khám phá các quán ăn gần bạn
            </p>
          </div>

          <UserAccountMenu fallbackName="Reviewer" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-5">
        <button
          type="button"
          onClick={handleBack}
          className="mb-4 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-600 shadow-sm transition hover:bg-cyan-50 hover:text-cyan-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>

        <section className="rounded-lg border border-white/80 bg-white/90 p-5 shadow-xl shadow-cyan-950/10 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-black uppercase text-cyan-700">
                <Link2 className="h-3.5 w-3.5" />
                Reviewer affiliate
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">
                Tạo liên kết affiliate
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                Tìm quán trong UGem, chọn merchant rồi tạo link chia sẻ để hệ
                thống ghi nhận lượt click.
              </p>
            </div>

            <span className="w-fit rounded-md border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-sm font-black text-cyan-800">
              Reviewer
            </span>
          </div>
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.75fr))]">
          <EarningsCard
            loading={loadingEarnings}
            title="Tiền affiliate đã kiếm"
            value={formatCurrency(earnings?.currentEarnings)}
            description="Tổng commission đã ghi nhận cho Reviewer này."
            icon={HandCoins}
            strong
            onRefresh={() => void loadEarnings()}
          />
          <EarningsCard
            loading={loadingEarnings}
            title="Đơn có commission"
            value={formatNumber(earnings?.commissionOrderCount)}
            description="Đơn completed có phát sinh tiền affiliate."
          />
          <EarningsCard
            loading={loadingEarnings}
            title="Tổng click"
            value={formatNumber(earnings?.totalClicks)}
            description="Tổng lượt mở từ các link của bạn."
          />
          <EarningsCard
            loading={loadingEarnings}
            title="Link đã tạo"
            value={formatNumber(earnings?.affiliateLinkCount)}
            description="Số link affiliate của reviewer."
          />
        </section>

        <section className="mt-3 grid gap-3 md:grid-cols-4">
          <EarningsCard
            loading={loadingEarnings}
            title="Rank"
            value={earnings?.rank || "-"}
            description="Hạng reviewer hiện tại."
          />
          <EarningsCard
            loading={loadingEarnings}
            title="Points"
            value={formatNumber(earnings?.points)}
            description="Điểm reviewer tích lũy."
          />
          <EarningsCard
            loading={loadingEarnings}
            title="Commission rate"
            value={formatPercentRate(earnings?.commissionRate)}
            description="Tỷ lệ hoa hồng theo hạng Reviewer."
          />
          <EarningsCard
            loading={loadingEarnings}
            title="Conversion rate"
            value={`${earnings?.summary?.conversionRate ?? 0}%`}
            description="Tỷ lệ click chuyển thành đơn hàng."
          />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="rounded-lg border border-white/80 bg-white/90 p-5 shadow-xl shadow-cyan-950/10 backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                  Merchant
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Chọn quán cần tạo link
                </h2>
              </div>

              {selectedMerchant ? (
                <span className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                  Đã chọn
                </span>
              ) : null}
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm theo tên quán..."
                className="h-11 rounded-lg border-slate-200 bg-white pl-10"
              />
            </div>

            <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {loadingMerchants ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-lg bg-slate-100"
                    />
                  ))}
                </div>
              ) : merchants.length > 0 ? (
                merchants.map((merchant) => (
                  <MerchantSelectCard
                    key={merchant.id}
                    merchant={merchant}
                    selected={merchant.id === selectedMerchantId}
                    onSelect={() => {
                      setSelectedMerchantId(merchant.id);
                      setAffiliateLink(null);
                      setCopiedField(null);
                    }}
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <Store className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-500">
                    Không tìm thấy quán phù hợp.
                  </p>
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={() => void handleCreateLink()}
              className="mt-4 h-11 w-full gap-2 rounded-lg font-black"
              disabled={!selectedMerchantId || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {isSubmitting ? "Đang tạo..." : "Tạo affiliate link"}
            </Button>
          </section>

          <div className="rounded-lg border border-white/80 bg-white/90 p-5 shadow-xl shadow-cyan-950/10 backdrop-blur-xl">
            {affiliateLink ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                      Link code
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      {affiliateLink.linkCode}
                    </h2>
                    {selectedMerchant ? (
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {selectedMerchant.name}
                      </p>
                    ) : null}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                      affiliateLink.isActive
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                        : "bg-slate-100 text-slate-500 ring-slate-200"
                    }`}
                  >
                    {affiliateLink.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <LinkBlock
                    label="Link track để chia sẻ"
                    value={shareUrl}
                    copied={copiedField === "track"}
                    onCopy={() => void copyToClipboard(shareUrl, "track")}
                  />

                  <LinkBlock
                    label="Trang quán sau khi chuyển hướng"
                    value={affiliateLink.url}
                    copied={copiedField === "target"}
                    onCopy={() =>
                      void copyToClipboard(affiliateLink.url, "target")
                    }
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Stat label="Click hiện tại" value={affiliateLink.clickCount} />
                  <Stat
                    label="Affiliate Link ID"
                    value={affiliateLink.affiliateLinkId.slice(0, 8)}
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[430px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center">
                <Link2 className="h-9 w-9 text-slate-400" />
                <h2 className="mt-3 text-lg font-black text-slate-950">
                  Chưa có link được tạo
                </h2>
                <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                  Chọn một quán bên trái rồi bấm tạo link. Link chia sẻ sẽ xuất
                  hiện ở đây để bạn sao chép hoặc mở thử.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function MerchantSelectCard({
  merchant,
  onSelect,
  selected,
}: {
  merchant: Merchant;
  onSelect: () => void;
  selected: boolean;
}) {
  const name = merchant.name || "Unnamed merchant";
  const image = merchant.logoUrl?.trim() || "";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full gap-3 rounded-lg border bg-white dark:bg-slate-900 p-3 text-left shadow-sm transition hover:border-cyan-200 dark:hover:border-cyan-800 hover:bg-cyan-50/50 dark:hover:bg-slate-800/50 ${
        selected ? "border-cyan-300 dark:border-cyan-600 ring-2 ring-cyan-100 dark:ring-cyan-900" : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300">
        {image ? (
          <img src={image} alt={name} className="h-full w-full object-cover" />
        ) : (
          <Store className="h-6 w-6" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-sm font-black text-slate-950 dark:text-white">
            {name}
          </h3>
          {selected ? (
            <span className="rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-black text-white">
              Chọn
            </span>
          ) : null}
        </div>

        {merchant.address ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
            <span className="line-clamp-1">{cleanAddress(merchant.address)}</span>
          </p>
        ) : null}
      </div>
    </button>
  );
}

function LinkBlock({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-2 flex gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2">
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold text-cyan-700 dark:text-cyan-400 ring-1 ring-slate-100 dark:ring-slate-800 hover:underline"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span className="truncate">{value}</span>
        </a>

        <Button
          type="button"
          variant="outline"
          className="h-10 w-10 shrink-0 rounded-lg p-0 dark:border-slate-800 dark:text-slate-200"
          onClick={onCopy}
          aria-label={`Sao chép ${label}`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function EarningsCard({
  description,
  icon: Icon,
  loading,
  onRefresh,
  strong,
  title,
  value,
}: {
  description: string;
  icon?: ComponentType<{ className?: string }>;
  loading: boolean;
  onRefresh?: () => void;
  strong?: boolean;
  title: string;
  value: string;
}) {
  return (
    <article
      className={`rounded-lg border p-4 shadow-lg shadow-cyan-950/7 ${
        strong
          ? "border-cyan-100 dark:border-cyan-900 bg-cyan-950 text-white"
          : "border-white/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-950 dark:text-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-xs font-black uppercase tracking-[0.14em] ${
              strong ? "text-cyan-100" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {title}
          </p>
          {loading ? (
            <div className="mt-3 h-8 w-32 animate-pulse rounded bg-slate-200/60 dark:bg-slate-800" />
          ) : (
            <p className="mt-2 truncate text-2xl font-black">{value}</p>
          )}
        </div>

        {Icon ? (
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              strong ? "bg-white/10 text-cyan-100" : "bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}

        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-cyan-100 transition hover:bg-white/15 disabled:opacity-60"
            aria-label="Làm mới tiền affiliate"
            title="Làm mới"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        ) : null}
      </div>
      <p
        className={`mt-3 text-xs font-semibold leading-5 ${
          strong ? "text-cyan-100/80" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {description}
      </p>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
