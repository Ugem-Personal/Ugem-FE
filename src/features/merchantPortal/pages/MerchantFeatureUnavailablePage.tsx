import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  CalendarClock,
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
  TicketPercent,
} from "lucide-react";

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

import { getCurrentMerchantId } from "../services";
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
  title: string;
  description: string;
  missingApis: string[];
};

function MerchantFeatureUnavailablePage({
  title,
  description,
  missingApis,
}: MerchantFeatureUnavailablePageProps) {
  return (
    <main className="merchant-portal-layout">
      <MerchantSidebar />

      <section className="merchant-main">
        <MerchantHeader />

        <div className="merchant-content">
          <section className="rounded-2xl border border-amber-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <AlertCircle size={22} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                  Chưa có API backend
                </p>
                <h1 className="mt-2 text-2xl font-bold text-slate-950">
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">BE hiện chưa public các endpoint:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
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
export function MerchantCampaignPage() {
  const merchantId = getCurrentMerchantId();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
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

        const haystack = [
          campaign.code,
          campaign.title,
          campaign.description ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(term);
      });
  }, [campaigns, merchantId, searchTerm]);

  const stats = useMemo(
    () => ({
      total: visibleCampaigns.length,
      active: visibleCampaigns.filter((campaign) => campaign.isActive).length,
      global: visibleCampaigns.filter((campaign) => campaign.isGlobal).length,
      mine: visibleCampaigns.filter(
        (campaign) => campaign.merchantId === merchantId,
      ).length,
    }),
    [merchantId, visibleCampaigns],
  );

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

  async function handleDelete(campaign: Campaign) {
    if (!window.confirm(`Xóa campaign ${campaign.code}?`)) {
      return;
    }

    setDeletingId(campaign.id);

    try {
      await deleteCampaign(campaign.id);
      notify.success("Đã xóa campaign.");

      if (selectedCampaign?.id === campaign.id) {
        setDetailOpen(false);
        setSelectedCampaign(null);
      }

      if (form.id === campaign.id) {
        resetForm();
      }

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
    <main className="merchant-portal-layout relative bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_28%),linear-gradient(135deg,#ecfeff_0%,#f8fafc_48%,#fff7ed_100%)]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-size-[32px_32px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <MerchantSidebar />

      <section className="merchant-main relative z-10">
        <MerchantHeader />

        <div className="merchant-content space-y-6">
          <section className="overflow-hidden rounded-4xl border border-white/60 bg-white/75 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.08)] backdrop-blur-2xl">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                  <Megaphone className="h-3.5 w-3.5" />
                  Campaign workspace
                </div>

                <h1 className="text-[30px] font-black tracking-tight text-slate-950 sm:text-[34px]">
                  Quản lý campaign cho quán
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                  Tạo, chỉnh sửa và theo dõi các campaign đang mở. FE hiện đã
                  nối với backend campaign CRUD nên bạn có thể quản lý trực tiếp
                  ngay tại đây.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:w-140">
                <CampaignStat
                  label="Tổng"
                  value={stats.total}
                  icon={Sparkles}
                />
                <CampaignStat
                  label="Đang active"
                  value={stats.active}
                  icon={CalendarClock}
                />
                <CampaignStat
                  label="Global"
                  value={stats.global}
                  icon={Store}
                />
                <CampaignStat
                  label="Của tôi"
                  value={stats.mine}
                  icon={TicketPercent}
                />
              </div>
            </div>

            {merchantId ? null : (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Tài khoản hiện tại chưa có MerchantId trong session. Bạn vẫn có
                thể xem danh sách, nhưng thao tác tạo/sửa/xóa sẽ bị chặn cho đến
                khi token có MerchantId.
              </div>
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <article className="rounded-4xl border border-white/60 bg-white/75 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.08)] backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                    Campaign form
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {form.id ? "Chỉnh sửa campaign" : "Tạo campaign mới"}
                  </h2>
                </div>

                {form.id ? (
                  <Badge className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700 hover:bg-cyan-50">
                    Đang sửa
                  </Badge>
                ) : null}
              </div>

              <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Code
                    </label>
                    <Input
                      value={form.code}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          code: event.target.value,
                        }))
                      }
                      placeholder="SUMMER20"
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Tiêu đề
                    </label>
                    <Input
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Giảm giá cuối tuần"
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Giá trị giảm
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.discountValue}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          discountValue: event.target.value,
                        }))
                      }
                      placeholder="10"
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Điều kiện
                    </label>
                    <div className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={form.isPercentage}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            isPercentage: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>Giảm theo phần trăm</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Đơn tối thiểu
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.minOrderAmount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          minOrderAmount: event.target.value,
                        }))
                      }
                      placeholder="100000"
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Giảm tối đa
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.maxDiscountAmount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          maxDiscountAmount: event.target.value,
                        }))
                      }
                      placeholder="50000"
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Số lượng
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          quantity: event.target.value,
                        }))
                      }
                      placeholder="100"
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Số lần / user
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={form.maxUsagePerUser}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          maxUsagePerUser: event.target.value,
                        }))
                      }
                      placeholder="1"
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Bắt đầu
                    </label>
                    <Input
                      type="datetime-local"
                      value={form.startDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          startDate: event.target.value,
                        }))
                      }
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Kết thúc
                    </label>
                    <Input
                      type="datetime-local"
                      value={form.endDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          endDate: event.target.value,
                        }))
                      }
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Mô tả
                  </label>
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Mô tả ngắn về campaign..."
                    className="min-h-28 rounded-2xl border-slate-200 bg-white"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.isNewUserOnly}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          isNewUserOnly: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    Chỉ user mới
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          isActive: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    Đang hoạt động
                  </label>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 sm:col-span-2 lg:col-span-1">
                    Global campaign hiện chưa mở trên FE này. Backend sẽ từ chối
                    nếu merchant tạo campaign toàn hệ thống.
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="h-11 rounded-2xl bg-slate-950 px-5 font-black text-white shadow-lg shadow-slate-950/15 hover:bg-cyan-700"
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : form.id ? (
                      <Save className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {form.id ? "Cập nhật campaign" : "Tạo campaign"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="h-11 rounded-2xl border-slate-200 px-5 font-bold text-slate-600"
                  >
                    Reset form
                  </Button>
                </div>
              </form>
            </article>

            <article className="rounded-4xl border border-white/60 bg-white/75 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.08)] backdrop-blur-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                    Campaign list
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Danh sách campaign
                  </h2>
                </div>

                <Button
                  type="button"
                  onClick={() => void loadCampaigns()}
                  disabled={loading}
                  className="h-10 rounded-2xl bg-cyan-600 px-4 font-black text-white shadow-lg shadow-cyan-900/15 hover:bg-cyan-700"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Làm mới
                </Button>
              </div>

              <div className="relative mt-5">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm theo code, tiêu đề hoặc mô tả..."
                  className="h-11 rounded-2xl border-slate-200 bg-white pl-10"
                />
              </div>

              <div className="mt-5 space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-32 animate-pulse rounded-4xl border border-slate-200 bg-slate-100"
                      />
                    ))}
                  </div>
                ) : visibleCampaigns.length > 0 ? (
                  visibleCampaigns.map((campaign) => (
                    <section
                      key={campaign.id}
                      className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700 hover:bg-cyan-50">
                              {campaign.code}
                            </Badge>
                            {campaign.isGlobal ? (
                              <Badge className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50">
                                Global
                              </Badge>
                            ) : (
                              <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
                                Merchant
                              </Badge>
                            )}
                            <Badge
                              className={`rounded-full px-3 py-1 hover:bg-transparent ${
                                campaign.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {campaign.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>

                          <h3 className="mt-3 text-xl font-black text-slate-950">
                            {campaign.title}
                          </h3>

                          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                            {campaign.description || "Chưa có mô tả campaign."}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                            <span className="rounded-full bg-slate-50 px-3 py-1">
                              {formatDateTime(campaign.startDate)} →{" "}
                              {formatDateTime(campaign.endDate)}
                            </span>
                            <span className="rounded-full bg-slate-50 px-3 py-1">
                              {campaign.usedCount}/{campaign.quantity} lượt
                            </span>
                            <span className="rounded-full bg-slate-50 px-3 py-1">
                              {campaign.maxUsagePerUser} lần/user
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-3">
                          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-right">
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">
                              Discount
                            </p>
                            <p className="mt-1 text-2xl font-black text-slate-950">
                              {getCampaignDiscountLabel(campaign)}
                            </p>
                          </div>

                          <Button
                            type="button"
                            onClick={() => openCampaignDetail(campaign)}
                            className="h-10 rounded-2xl bg-slate-950 px-4 font-black text-white shadow-lg shadow-slate-950/15 hover:bg-cyan-700"
                          >
                            <Eye className="h-4 w-4" />
                            Xem chi tiết
                          </Button>
                        </div>
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/70 px-6 py-14 text-center text-slate-500">
                    <Sparkles className="mx-auto h-10 w-10 text-slate-300" />
                    <h3 className="mt-4 text-lg font-black text-slate-950">
                      Chưa có campaign phù hợp
                    </h3>
                    <p className="mt-2 text-sm leading-6">
                      Tạo campaign mới hoặc thử đổi bộ lọc tìm kiếm.
                    </p>
                  </div>
                )}
              </div>
            </article>
          </section>
        </div>

        <Dialog
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) {
              setSelectedCampaign(null);
            }
          }}
        >
          <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden border-white/80 bg-slate-50/95 p-0 shadow-2xl shadow-slate-950/25 backdrop-blur-xl">
            {selectedCampaign ? (
              <>
                <DialogHeader className="border-b border-cyan-100 bg-white/90 px-6 py-5 text-left">
                  <DialogTitle className="text-2xl font-black text-slate-950">
                    {selectedCampaign.title}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm leading-6 text-slate-500">
                    Xem thông tin đầy đủ, sau đó bấm sửa nếu cần chỉnh campaign.
                  </DialogDescription>
                </DialogHeader>

                <div className="max-h-[calc(92vh-104px)] space-y-5 overflow-y-auto px-6 py-5">
                  <div className="grid gap-3 rounded-3xl border border-white/80 bg-white p-4 text-sm text-slate-700 shadow-sm ring-1 ring-slate-950/5 sm:grid-cols-2">
                    <div>
                      <div className="text-slate-500">Code</div>
                      <div className="mt-1 font-black text-slate-950">
                        {selectedCampaign.code}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Trạng thái</div>
                      <div
                        className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${
                          selectedCampaign.isActive
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-500"
                        }`}
                      >
                        {selectedCampaign.isActive ? "Active" : "Inactive"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Loại campaign</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {selectedCampaign.isGlobal ? "Global" : "Merchant"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Discount</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {getCampaignDiscountLabel(selectedCampaign)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-3xl border border-white/80 bg-white p-4 shadow-sm ring-1 ring-slate-950/5 sm:grid-cols-2 xl:grid-cols-4">
                    <CampaignDetail
                      label="Đơn tối thiểu"
                      value={formatOptionalCurrency(
                        selectedCampaign.minOrderAmount,
                      )}
                    />
                    <CampaignDetail
                      label="Giảm tối đa"
                      value={formatOptionalCurrency(
                        selectedCampaign.maxDiscountAmount,
                      )}
                    />
                    <CampaignDetail
                      label="Số lượng"
                      value={`${selectedCampaign.usedCount} / ${selectedCampaign.quantity}`}
                    />
                    <CampaignDetail
                      label="Lượt / user"
                      value={String(selectedCampaign.maxUsagePerUser)}
                    />
                  </div>

                  <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Thời gian
                      </p>
                      <p className="mt-1 font-semibold text-slate-700">
                        {formatDateTime(selectedCampaign.startDate)} →{" "}
                        {formatDateTime(selectedCampaign.endDate)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Ownership
                      </p>
                      <p className="mt-1 font-semibold text-slate-700">
                        {selectedCampaign.isGlobal
                          ? "Áp dụng toàn hệ thống"
                          : selectedCampaign.merchantId || "Merchant campaign"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-950/5">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Mô tả
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {selectedCampaign.description ||
                        "Chưa có mô tả campaign."}
                    </p>
                  </div>

                  <DialogFooter className="border-t border-slate-100 pt-4 gap-3 sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => {
                          handleEdit(selectedCampaign);
                          setDetailOpen(false);
                          setSelectedCampaign(null);
                        }}
                        disabled={!selectedCanManage}
                        className="h-10 rounded-2xl bg-slate-950 px-4 font-black text-white shadow-lg shadow-slate-950/15 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <Pencil className="h-4 w-4" />
                        Sửa
                      </Button>

                      <Button
                        type="button"
                        onClick={() => void handleDelete(selectedCampaign)}
                        disabled={
                          !selectedCanManage ||
                          deletingId === selectedCampaign.id
                        }
                        variant="outline"
                        className="h-10 rounded-2xl border-rose-200 px-4 font-black text-rose-600 hover:bg-rose-50"
                      >
                        {deletingId === selectedCampaign.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Xóa
                      </Button>
                    </div>

                    {!selectedCanManage ? (
                      <div className="self-center text-xs font-semibold text-slate-400">
                        Campaign global chỉ hiển thị, không sửa từ merchant
                        portal.
                      </div>
                    ) : null}
                  </DialogFooter>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </section>
    </main>
  );
}

function CampaignStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex min-h-32 flex-col rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="min-h-9 text-[11px] font-black uppercase leading-5 tracking-[0.14em] text-slate-400">
          {label}
        </p>
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
      </div>
      <p className="mt-auto text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function CampaignDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

export function MerchantViewStatisticsPage() {
  return (
    <MerchantFeatureUnavailablePage
      title="Thống kê lượt xem"
      description="Trong backend hiện tại chưa có API ghi nhận hoặc đọc lượt xem nhà hàng. Khi BE bổ sung contract, FE sẽ nối biểu đồ và số liệu tại trang này."
      missingApis={[
        "GET /api/v1/merchants/me/views",
        "GET /api/v1/merchants/me/statistics",
        "POST /api/v1/merchants/{id}/views",
      ]}
    />
  );
}
