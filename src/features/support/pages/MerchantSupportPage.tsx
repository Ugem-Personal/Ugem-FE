import { useEffect, useState } from "react";
import {
  BookOpen,
  LifeBuoy,
  MessageSquare,
  RefreshCw,
  Send,
} from "lucide-react";

import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/notify";
import {
  createMerchantSupportTicket,
  getMerchantSupportTicket,
  getMerchantSupportTickets,
  replyMerchantSupportTicket,
  updateMerchantSupportStatus,
  type SupportCategory,
  type SupportPriority,
  type SupportStatus,
  type SupportTicket,
} from "../services";

const faqs = [
  [
    "Không thấy đơn mới",
    "Kiểm tra trạng thái quán, bộ lọc đơn và tải lại trang Quản lý đơn.",
  ],
  [
    "Khách chưa nhận được món",
    "Mở chi tiết đơn để kiểm tra trạng thái giao hàng và thông tin liên hệ.",
  ],
  [
    "Thanh toán",
    "Kiểm tra phương thức thanh toán, trạng thái Paid và mã đơn liên quan.",
  ],
  [
    "Thực đơn",
    "Kiểm tra trạng thái bán, giá món và danh mục trong Quản lý món ăn.",
  ],
] as const;

const statusLabels: Record<SupportStatus, string> = {
  Open: "Chờ xử lý",
  InProgress: "Đang xử lý",
  WaitingForMerchant: "Chờ Merchant phản hồi",
  Resolved: "Đã giải quyết",
  Closed: "Đã đóng",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MerchantSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    category: "Orders" as SupportCategory,
    priority: "Normal" as SupportPriority,
    subject: "",
    description: "",
    orderId: "",
  });

  async function loadTickets(selectId?: string) {
    setLoading(true);
    try {
      const nextTickets = await getMerchantSupportTickets();
      setTickets(nextTickets);
      const nextId = selectId ?? selected?.id ?? nextTickets[0]?.id;
      if (nextId) setSelected(await getMerchantSupportTicket(nextId));
    } catch (error) {
      console.error(error);
      notify.error("Không tải được yêu cầu hỗ trợ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const ticket = await createMerchantSupportTicket({
        ...form,
        orderId: form.orderId.trim() || undefined,
      });
      notify.success("Đã gửi yêu cầu hỗ trợ.");
      setForm({
        category: "Orders",
        priority: "Normal",
        subject: "",
        description: "",
        orderId: "",
      });
      await loadTickets(ticket.id);
    } catch (error) {
      console.error(error);
      notify.error("Gửi yêu cầu hỗ trợ thất bại.");
    }
  }

  async function handleReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !message.trim()) return;
    try {
      const ticket = await replyMerchantSupportTicket(
        selected.id,
        message.trim(),
      );
      setSelected(ticket);
      setMessage("");
      await loadTickets(ticket.id);
    } catch (error) {
      console.error(error);
      notify.error("Không gửi được phản hồi.");
    }
  }

  async function handleStatus(status: "Open") {
    if (!selected) return;
    try {
      const ticket = await updateMerchantSupportStatus(selected.id, status);
      setSelected(ticket);
      await loadTickets(ticket.id);
    } catch (error) {
      console.error(error);
      notify.error("Không cập nhật được trạng thái.");
    }
  }

  return (
    <main className="merchant-portal-layout min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <MerchantSidebar />
      <section className="merchant-main flex min-h-screen min-w-0 flex-1 flex-col">
        <MerchantHeader />
        <div className="merchant-content space-y-6 p-4 sm:p-6 lg:p-8">
          <header>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
              Merchant support
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Trung tâm hỗ trợ
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              Xem hướng dẫn hoặc gửi yêu cầu để Staff hỗ trợ quán.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {faqs.map(([title, text]) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900"
              >
                <BookOpen className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="mt-3 text-sm font-black">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {text}
                </p>
              </article>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <form
              onSubmit={handleCreate}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900"
            >
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-cyan-600" />
                <h2 className="text-lg font-black">Gửi yêu cầu</h2>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value as SupportCategory,
                    })
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-slate-950"
                >
                  <option value="Orders">Không thấy đơn mới</option>
                  <option value="Delivery">Khách chưa nhận được món</option>
                  <option value="Payment">Thanh toán</option>
                  <option value="Menu">Thực đơn</option>
                  <option value="Account">Tài khoản / quán</option>
                  <option value="Other">Khác</option>
                </select>
                <select
                  value={form.priority}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      priority: event.target.value as SupportPriority,
                    })
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-slate-950"
                >
                  <option value="Low">Thấp</option>
                  <option value="Normal">Bình thường</option>
                  <option value="High">Cao</option>
                  <option value="Urgent">Khẩn cấp</option>
                </select>
              </div>
              <Input
                required
                minLength={3}
                value={form.subject}
                onChange={(event) =>
                  setForm({ ...form, subject: event.target.value })
                }
                placeholder="Tiêu đề vấn đề"
                className="mt-3 h-11"
              />
              <Input
                value={form.orderId}
                onChange={(event) =>
                  setForm({ ...form, orderId: event.target.value })
                }
                placeholder="Mã đơn nếu có"
                className="mt-3 h-11"
              />
              <textarea
                required
                minLength={10}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Mô tả vấn đề..."
                className="mt-3 min-h-32 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-slate-950"
              />
              <Button
                type="submit"
                className="mt-3 h-11 w-full gap-2 font-black"
              >
                <Send className="h-4 w-4" />
                Gửi yêu cầu
              </Button>
            </form>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-cyan-600" />
                  <h2 className="text-lg font-black">Yêu cầu của tôi</h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void loadTickets()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="space-y-2">
                  {loading ? (
                    <p className="text-sm text-slate-500">Đang tải...</p>
                  ) : tickets.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Chưa có yêu cầu nào.
                    </p>
                  ) : (
                    tickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() =>
                          void getMerchantSupportTicket(ticket.id).then(
                            setSelected,
                          )
                        }
                        className={`w-full rounded-xl border p-3 text-left ${selected?.id === ticket.id ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30" : "border-slate-200 dark:border-white/10"}`}
                      >
                        <p className="truncate text-sm font-black">
                          {ticket.subject}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {statusLabels[ticket.status]} ·{" "}
                          {formatDate(ticket.updatedAt)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
                {selected ? (
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                          {statusLabels[selected.status]}
                        </p>
                        <h3 className="mt-1 text-lg font-black">
                          {selected.subject}
                        </h3>
                      </div>
                      {selected.status === "Resolved" || selected.status === "Closed" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleStatus("Open")}
                        >
                          Mở lại
                        </Button>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      {selected.description}
                    </p>
                    <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
                      {selected.messages.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950"
                        >
                          <p className="font-bold">
                            {item.sender?.fullName || "Hệ thống"}
                          </p>
                          <p className="mt-1 text-slate-600 dark:text-slate-300">
                            {item.message}
                          </p>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleReply} className="mt-4 flex gap-2">
                      <Input
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Phản hồi cho Staff..."
                      />
                      <Button type="submit" size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-white/10">
                    Chọn một yêu cầu để xem chi tiết.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
