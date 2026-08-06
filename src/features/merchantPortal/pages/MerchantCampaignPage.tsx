import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  Eye,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Store,
  Trash2,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { notify } from "@/shared/lib/notify";

import {
  getCurrentMerchantId,
  getMyMerchantStatistics,
  getMyMerchantViews,
  type MerchantStatistics,
} from "../services";
import {
  createCampaign,
  deleteCampaign,
  getCampaigns,
  type Campaign,
  type CreateCampaignPayload,
  type UpdateCampaignPayload,
  updateCampaign,
} from "../services/campaignService";

type MerchantFeatureUnavailablePageProps = {
  title?: string;
  description?: string;
  missingApis?: string[];
};

export function MerchantFeatureUnavailablePage({
  title = "Tính năng chưa khả dụng",
  description = "Tính năng này hiện đang được hoàn thiện hệ thống.",
  missingApis = [],
}: MerchantFeatureUnavailablePageProps = {}) {
  const navigate = useNavigate();

  return (
    <main className="merchant-portal-layout relative bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex">
      <MerchantSidebar />

      <section className="merchant-main flex-1 min-w-0 relative z-10 flex flex-col min-h-screen">
        <MerchantHeader />

        <div className="merchant-content px-4 py-6 sm:px-8 sm:py-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition hover:border-cyan-400"
          >
            <ChevronLeft size={16} /> Quay lại
          </button>

          <section className="rounded-3xl border border-amber-200/80 bg-white/90 dark:border-amber-900/50 dark:bg-slate-900/90 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <AlertCircle size={26} />
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                  Chưa có API backend
                </span>
                <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-xs sm:text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                  {description}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 p-4 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300">
              <p className="font-bold">Hệ thống đang đợi các endpoint Backend sau:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-[11px]">
                {missingApis.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

type CampaignFormState = {
  id?: string;
  code: string;
  title: string;
  description: string;
  discountValue: string;
  isPercentage: boolean;
  minOrderAmount: string;
  maxDiscountAmount: string;
  quantity: string;
  maxUsagePerUser: string;
  isNewUserOnly: boolean;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatOptionalCurrency(value?: number | null) {
  return value === null || value === undefined ? "-" : formatCurrency(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString();
}

function normalizeCampaignTerm(value: string) {
  return value.trim().toLowerCase();
}

function isCampaignEditable(campaign: Campaign, merchantId: string | null) {
  if (!merchantId) return false;

  return !campaign.isGlobal && campaign.merchantId === merchantId;
}

function isCampaignExpired(campaign: Campaign) {
  if (!campaign.endDate) return false;
  return new Date(campaign.endDate).getTime() < Date.now();
}

function getCampaignDiscountLabel(campaign: Campaign) {
  if (campaign.isPercentage) {
    return `${campaign.discountValue.toLocaleString("vi-VN")} %`;
  }

  return formatCurrency(campaign.discountValue);
}

function createEmptyCampaignForm(): CampaignFormState {
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    code: "",
    title: "",
    description: "",
    discountValue: "",
    isPercentage: true,
    minOrderAmount: "",
    maxDiscountAmount: "",
    quantity: "",
    maxUsagePerUser: "",
    isNewUserOnly: false,
    isActive: true,
    startDate: toDateTimeLocalValue(now.toISOString()),
    endDate: toDateTimeLocalValue(endDate.toISOString()),
  };
}

function campaignToForm(campaign: Campaign): CampaignFormState {
  return {
    id: campaign.id,
    code: campaign.code,
    title: campaign.title,
    description: campaign.description ?? "",
    discountValue: String(campaign.discountValue ?? ""),
    isPercentage: campaign.isPercentage,
    minOrderAmount:
      campaign.minOrderAmount === null || campaign.minOrderAmount === undefined
        ? ""
        : String(campaign.minOrderAmount),
    maxDiscountAmount:
      campaign.maxDiscountAmount === null ||
      campaign.maxDiscountAmount === undefined
        ? ""
        : String(campaign.maxDiscountAmount),
    quantity: String(campaign.quantity ?? ""),
    maxUsagePerUser: String(campaign.maxUsagePerUser ?? ""),
    isNewUserOnly: campaign.isNewUserOnly,
    isActive: campaign.isActive,
    startDate: toDateTimeLocalValue(campaign.startDate),
    endDate: toDateTimeLocalValue(campaign.endDate),
  };
}

function buildCampaignPayload(form: CampaignFormState): CreateCampaignPayload {
  return {
    code: form.code.trim().toUpperCase(),
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    discountValue: Number(form.discountValue) || 0,
    isPercentage: form.isPercentage,
    minOrderAmount:
      form.minOrderAmount.trim() === ""
        ? undefined
        : Number(form.minOrderAmount),
    maxDiscountAmount:
      form.maxDiscountAmount.trim() === ""
        ? undefined
        : Number(form.maxDiscountAmount),
    quantity: Number.parseInt(form.quantity, 10) || 0,
    maxUsagePerUser: Number.parseInt(form.maxUsagePerUser, 10) || 0,
    isGlobal: false,
    isNewUserOnly: form.isNewUserOnly,
    startDate: fromDateTimeLocalValue(form.startDate),
    endDate: fromDateTimeLocalValue(form.endDate),
  };
}

// MODULE 1: Merchant Campaign Management
export function MerchantCampaignPage() {
  const navigate = useNavigate();
  const merchantId = getCurrentMerchantId();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "inactive">("all");
  const [form, setForm] = useState<CampaignFormState>(() =>
    createEmptyCampaignForm(),
  );

  async function loadCampaigns() {
    setLoading(true);

    try {
      const data = await getCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error(error);
      notify.error("Không tải được danh sách campaign.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCampaigns();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const visibleCampaigns = useMemo(() => {
    const term = normalizeCampaignTerm(searchTerm);

    return campaigns
      .filter((campaign) => {
        if (!merchantId) return true;
        return campaign.isGlobal || campaign.merchantId === merchantId;
      })
      .filter((campaign) => {
        if (!term) return true;
        const haystack = [campaign.code, campaign.title, campaign.description ?? ""]
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .filter((campaign) => {
        const expired = isCampaignExpired(campaign);
        if (statusFilter === "active") return campaign.isActive && !expired;
        if (statusFilter === "expired") return expired;
        if (statusFilter === "inactive") return !campaign.isActive && !expired;
        return true;
      });
  }, [campaigns, merchantId, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter(
      (c) => c.isActive && !isCampaignExpired(c),
    ).length;
    const expired = campaigns.filter((c) => isCampaignExpired(c)).length;
    const global = campaigns.filter((c) => c.isGlobal).length;
    const mine = campaigns.filter(
      (c) => c.merchantId === merchantId,
    ).length;
    return { total, active, expired, global, mine };
  }, [campaigns, merchantId]);

  function resetForm() {
    setForm(createEmptyCampaignForm());
  }

  function handleEdit(campaign: Campaign) {
    setForm(campaignToForm(campaign));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCampaignDetail(campaign: Campaign) {
    setSelectedCampaign(campaign);
    setDetailOpen(true);
  }

  async function confirmDelete() {
    if (!campaignToDelete) return;

    setDeletingId(campaignToDelete.id);

    try {
      await deleteCampaign(campaignToDelete.id);
      notify.success(`Đã xóa campaign ${campaignToDelete.code}.`);

      if (selectedCampaign?.id === campaignToDelete.id) {
        setDetailOpen(false);
        setSelectedCampaign(null);
      }

      if (form.id === campaignToDelete.id) {
        resetForm();
      }

      setCampaignToDelete(null);
      await loadCampaigns();
    } catch (error) {
      console.error(error);
      notify.error("Không xóa được campaign.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!merchantId) {
      notify.error("Tài khoản hiện tại chưa có MerchantId.");
      return;
    }

    if (!form.code.trim() || !form.title.trim()) {
      notify.error("Vui lòng nhập code và tiêu đề campaign.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      notify.error("Vui lòng chọn thời gian bắt đầu và kết thúc.");
      return;
    }

    if (
      new Date(form.endDate).getTime() <= new Date(form.startDate).getTime()
    ) {
      notify.error("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    const payload = buildCampaignPayload(form);

    setSaving(true);

    try {
      if (form.id) {
        const updatePayload: UpdateCampaignPayload = {
          ...payload,
          id: form.id,
          isActive: form.isActive,
        };

        await updateCampaign(updatePayload);
        notify.success("Đã cập nhật campaign.");
      } else {
        await createCampaign(payload);
        notify.success("Đã tạo campaign.");
      }

      resetForm();
      await loadCampaigns();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      notify.error(message || "Lưu campaign thất bại.");
    } finally {
      setSaving(false);
    }
  }

  const selectedCanManage = selectedCampaign
    ? isCampaignEditable(selectedCampaign, merchantId)
    : false;

  return (
    <main className="merchant-portal-layout relative bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex">
      <MerchantSidebar />

      <section className="merchant-main flex-1 min-w-0 relative z-10 flex flex-col min-h-screen">
        <MerchantHeader />

        <div className="merchant-content px-4 py-6 sm:px-8 sm:py-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-3 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs backdrop-blur-md transition hover:border-cyan-400"
              >
                <ChevronLeft size={16} /> Quay lại
              </button>

              <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-cyan-200/60 bg-cyan-50 dark:border-cyan-900/50 dark:bg-cyan-950/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                <Megaphone className="h-3.5 w-3.5" />
                Campaign Management
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Quản lý chương trình khuyến mãi
                <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3.5 py-2 shadow-xs">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tổng số:</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{stats.total}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40 px-3.5 py-2 shadow-xs">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Đang chạy:</span>
                <span className="text-sm font-black text-emerald-800 dark:text-emerald-300">{stats.active}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40 px-3.5 py-2 shadow-xs">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Hết hạn:</span>
                <span className="text-sm font-black text-rose-800 dark:text-rose-300">{stats.expired}</span>
              </div>
            </div>
          </div>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            {/* Form Create / Edit Campaign */}
            <article className="rounded-3xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {form.id ? "Chỉnh sửa Campaign" : "Tạo Campaign mới"}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {form.id
                      ? "Cập nhật các thông số chương trình khuyến mãi hiện tại."
                      : "Thiết lập mã giảm giá, mức giảm và thời hạn áp dụng."}
                  </p>
                </div>

                {form.id && (
                  <Badge variant="outline" className="border-cyan-500 text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50">
                    Đang sửa
                  </Badge>
                )}
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Mã Code <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={form.code}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, code: e.target.value }))
                      }
                      placeholder="SUMMER20"
                      className="h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Tiêu đề <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={form.title}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, title: e.target.value }))
                      }
                      placeholder="Giảm giá cuối tuần"
                      className="h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Giá trị giảm <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.discountValue}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, discountValue: e.target.value }))
                      }
                      placeholder="10"
                      className="h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Loại giảm giá
                    </label>
                    <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isPercentage}
                        onChange={(e) =>
                          setForm((c) => ({ ...c, isPercentage: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>Giảm theo phần trăm (%)</span>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Đơn tối thiểu (VNĐ)
                    </label>
                    <Input
                      type="number"
                      step="5000"
                      min="0"
                      value={form.minOrderAmount}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, minOrderAmount: e.target.value }))
                      }
                      placeholder="100000"
                      className="h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Giảm tối đa (VNĐ)
                    </label>
                    <Input
                      type="number"
                      step="5000"
                      min="0"
                      value={form.maxDiscountAmount}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, maxDiscountAmount: e.target.value }))
                      }
                      placeholder="50000"
                      className="h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Tổng số lượng
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, quantity: e.target.value }))
                      }
                      placeholder="100"
                      className="h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Số lần / Khách
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={form.maxUsagePerUser}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, maxUsagePerUser: e.target.value }))
                      }
                      placeholder="1"
                      className="h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Thời gian bắt đầu <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="datetime-local"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, startDate: e.target.value }))
                      }
                      className="h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Thời gian kết thúc <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="datetime-local"
                      value={form.endDate}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, endDate: e.target.value }))
                      }
                      className="h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Mô tả chương trình
                  </label>
                  <Textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, description: e.target.value }))
                    }
                    placeholder="Mô tả điều kiện và lợi ích chương trình..."
                    className="rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium resize-none"
                  />
                </div>

                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isNewUserOnly}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, isNewUserOnly: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    Chỉ dành cho Khách hàng mới
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, isActive: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    Đang hoạt động
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="h-10 rounded-xl text-xs font-bold"
                  >
                    Reset
                  </Button>

                  <Button
                    type="submit"
                    disabled={saving}
                    className="h-10 rounded-xl bg-cyan-600 text-white font-extrabold text-xs shadow-md hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : form.id ? (
                      <Save className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    {saving ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Tạo Campaign"}
                  </Button>
                </div>
              </form>
            </article>

            {/* List & Filters */}
            <article className="rounded-3xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200/60 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Danh sách Campaign
                  </h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Theo dõi các chương trình đang mở và lịch sử khuyến mãi.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => void loadCampaigns()}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-bold"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Làm mới
                </Button>
              </div>

              {/* Search & Status Filter */}
              <div className="space-y-3 mb-5">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo mã code, tiêu đề hoặc mô tả..."
                    className="h-10 rounded-xl bg-white dark:bg-slate-800 pl-10 text-xs font-medium border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                  {(["all", "active", "expired", "inactive"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition capitalize ${
                        statusFilter === st
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      {st === "all"
                        ? "Tất cả"
                        : st === "active"
                        ? "Đang chạy"
                        : st === "expired"
                        ? "Hết hạn"
                        : "Tạm dừng"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campaign Cards List */}
              <div className="space-y-3.5">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-28 animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50"
                      />
                    ))}
                  </div>
                ) : visibleCampaigns.length > 0 ? (
                  visibleCampaigns.map((campaign) => {
                    const expired = isCampaignExpired(campaign);
                    const canEdit = isCampaignEditable(campaign, merchantId);

                    return (
                      <div
                        key={campaign.id}
                        className={`rounded-2xl border p-4 shadow-2xs transition hover:shadow-md ${
                          expired
                            ? "border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 opacity-75"
                            : campaign.isActive
                            ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-75"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge className="bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-extrabold uppercase text-[10px]">
                                {campaign.code}
                              </Badge>

                              {campaign.isGlobal ? (
                                <Badge className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px]">
                                  Global
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                                  Merchant
                                </Badge>
                              )}

                              {expired ? (
                                <Badge className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px]">
                                  Hết hạn
                                </Badge>
                              ) : campaign.isActive ? (
                                <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px]">
                                  Đang chạy
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">
                                  Tạm dừng
                                </Badge>
                              )}
                            </div>

                            <h3 className="mt-2 text-sm font-extrabold text-slate-900 dark:text-white truncate">
                              {campaign.title}
                            </h3>

                            {campaign.description && (
                              <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                {campaign.description}
                              </p>
                            )}

                            <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock size={11} /> {formatDateTime(campaign.startDate)} → {formatDateTime(campaign.endDate)}
                              </span>
                              <span>•</span>
                              <span>Đã dùng: {campaign.usedCount}/{campaign.quantity}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">
                              {getCampaignDiscountLabel(campaign)}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openCampaignDetail(campaign)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                aria-label="Xem chi tiết"
                              >
                                <Eye size={14} />
                              </button>

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleEdit(campaign)}
                                  className="p-1.5 rounded-lg border border-cyan-200 dark:border-cyan-900 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50"
                                  aria-label="Sửa campaign"
                                >
                                  <Pencil size={14} />
                                </button>
                              )}

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => setCampaignToDelete(campaign)}
                                  className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50"
                                  aria-label="Xóa campaign"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                    <Sparkles className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Không tìm thấy campaign phù hợp.
                    </p>
                  </div>
                )}
              </div>
            </article>
          </section>
        </div>

        {/* Dialog Confirm Delete */}
        <Dialog open={Boolean(campaignToDelete)} onOpenChange={(o) => !o && setCampaignToDelete(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <AlertTriangle size={18} />
                Xác nhận xóa Campaign
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-600 dark:text-slate-400 pt-2">
                Bạn có chắc chắn muốn xóa mã khuyến mãi <span className="font-extrabold text-slate-900 dark:text-white">"{campaignToDelete?.code}"</span> ({campaignToDelete?.title})?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-3">
              <Button variant="outline" size="sm" onClick={() => setCampaignToDelete(null)}>
                Hủy
              </Button>
              <Button
                size="sm"
                disabled={Boolean(deletingId)}
                onClick={() => void confirmDelete()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {deletingId ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 size={14} />}
                Xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Detail */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-xl">
            {selectedCampaign && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {selectedCampaign.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-medium text-slate-500">
                    Chi tiết chương trình khuyến mãi mã: <span className="font-bold text-cyan-600">{selectedCampaign.code}</span>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900">
                    <div>
                      <span className="text-slate-400 font-medium block">Mức giảm:</span>
                      <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">
                        {getCampaignDiscountLabel(selectedCampaign)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Đơn tối thiểu:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatOptionalCurrency(selectedCampaign.minOrderAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Giảm tối đa:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatOptionalCurrency(selectedCampaign.maxDiscountAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Lượt sử dụng:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedCampaign.usedCount} / {selectedCampaign.quantity} lượt
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Thời gian bắt đầu:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formatDateTime(selectedCampaign.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Thời gian kết thúc:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formatDateTime(selectedCampaign.endDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Đối tượng:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedCampaign.isNewUserOnly ? "Chỉ Khách mới" : "Tất cả Khách hàng"}
                      </span>
                    </div>
                    {selectedCampaign.description && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 block">Mô tả:</span>
                        <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                          {selectedCampaign.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  {selectedCanManage && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleEdit(selectedCampaign);
                        setDetailOpen(false);
                      }}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
                    >
                      <Pencil size={14} /> Chỉnh sửa
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>
                    Đóng
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </section>
    </main>
  );
}

// MODULE 2: Merchant Statistics
export function MerchantViewStatisticsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MerchantStatistics | null>(null);
  const [views, setViews] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [statsData, viewsData] = await Promise.all([
        getMyMerchantStatistics().catch(() => null),
        getMyMerchantViews().catch(() => null),
      ]);

      if (statsData) {
        setStats(statsData);
      }
      if (viewsData && typeof viewsData.totalViews === "number") {
        setViews(viewsData.totalViews);
      }
    } catch (err) {
      console.error(err);
      setError("Không thể tải thông tin thống kê Merchant.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="merchant-portal-layout relative bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex">
      <MerchantSidebar />

      <section className="merchant-main flex-1 min-w-0 relative z-10 flex flex-col min-h-screen">
        <MerchantHeader />

        <div className="merchant-content px-4 py-6 sm:px-8 sm:py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-3 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs backdrop-blur-md transition hover:border-cyan-400"
              >
                <ChevronLeft size={16} /> Quay lại
              </button>

              <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-cyan-200/60 bg-cyan-50 dark:border-cyan-900/50 dark:bg-cyan-950/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                <TrendingUp className="h-3.5 w-3.5" />
                Merchant Analytics
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Báo cáo & Thống kê kinh doanh
              </h1>
            </div>

            <Button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              variant="outline"
              className="rounded-xl text-xs font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Cập nhật dữ liệu
            </Button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40 p-4 text-xs font-bold text-rose-800 dark:text-rose-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>{error}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => void loadData()}>
                Thử lại
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
                />
              ))}
            </div>
          )}

          {/* Empty state if stats are null */}
          {!loading && !stats && (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
              <Store className="mx-auto h-12 w-12 text-slate-400 mb-3" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Chưa có dữ liệu thống kê
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Thống kê sẽ hiển thị tự động khi gian hàng của bạn có lượt truy cập và đơn hàng đầu tiên.
              </p>
            </div>
          )}

          {/* Real Statistics Metrics */}
          {!loading && stats && (
            <div className="space-y-6">
              {/* Top KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Revenue */}
                <div className="rounded-3xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Tổng doanh thu</span>
                    <div className="h-9 w-9 grid place-items-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600">
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Tổng giá trị các đơn hàng bán ra
                  </p>
                </div>

                {/* Merchant Receive */}
                <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-5 shadow-xl backdrop-blur-xl">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Thực nhận</span>
                    <div className="h-9 w-9 grid place-items-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700">
                      <CheckCircle2 size={18} />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-black text-emerald-800 dark:text-emerald-300">
                    {formatCurrency(stats.merchantReceive ?? stats.totalRevenue)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-emerald-600/80">
                    Sau khi khấu trừ các phí dịch vụ
                  </p>
                </div>

                {/* Total Orders */}
                <div className="rounded-3xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Tổng đơn hàng</span>
                    <div className="h-9 w-9 grid place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                      <ShoppingBag size={18} />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                    {stats.totalOrders} <span className="text-sm font-bold text-slate-400">đơn</span>
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Trung bình {formatCurrency(stats.avgOrderValue)}/đơn
                  </p>
                </div>

                {/* Views */}
                <div className="rounded-3xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Lượt xem gian hàng</span>
                    <div className="h-9 w-9 grid place-items-center rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                      <Eye size={18} />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                    {views ?? stats.totalViews ?? 0} <span className="text-sm font-bold text-slate-400">lượt</span>
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Lượt xem từ ứng dụng Khách hàng
                  </p>
                </div>
              </div>

              {/* Fee Breakdown Breakdown Card */}
              <div className="rounded-3xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Receipt size={18} className="text-cyan-600" />
                  Chi tiết phân bổ phí dịch vụ
                </h3>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-xs font-bold text-slate-500 block">Phí nền tảng ({stats.platformFeePercent ?? 0}%)</span>
                    <span className="mt-1 text-lg font-black text-slate-900 dark:text-white block">
                      {formatCurrency(stats.platformFee)}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-xs font-bold text-slate-500 block">Phí Reviewer / Giới thiệu</span>
                    <span className="mt-1 text-lg font-black text-slate-900 dark:text-white block">
                      {formatCurrency(stats.reviewerFee)}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-xs font-bold text-slate-500 block">Giá trị đơn trung bình (AOV)</span>
                    <span className="mt-1 text-lg font-black text-slate-900 dark:text-white block">
                      {formatCurrency(stats.avgOrderValue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
