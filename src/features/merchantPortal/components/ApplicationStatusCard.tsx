import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Store,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { MerchantApplication } from "../types";

type StatusTone = "empty" | "pending" | "approved" | "rejected" | "default";

type StatusInfo = {
  label: string;
  description: string;
  tone: StatusTone;
  actionLabel: string;
  actionTo: string;
};

const STATUS_CONFIG = {
  empty: {
    icon: FilePlus2,
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    iconBox: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  pending: {
    icon: Clock3,
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    iconBox: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  approved: {
    icon: CheckCircle2,
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    iconBox: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  rejected: {
    icon: XCircle,
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    iconBox: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  default: {
    icon: Store,
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    iconBox: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
} as const;

function getStatusText(application?: MerchantApplication): StatusInfo {
  if (!application) {
    return {
      label: "Chưa gửi hồ sơ",
      description:
        "Hãy bắt đầu gửi thông tin để quán của bạn được xuất hiện trên UGem.",
      tone: "empty",
      actionLabel: "Bắt đầu nộp hồ sơ",
      actionTo: "/merchant/application/create",
    };
  }

  if (application.status === "Pending") {
    return {
      label: "Đang xét duyệt",
      description: "Hồ sơ của bạn đang được đội ngũ thẩm định kiểm tra và xử lý.",
      tone: "pending",
      actionLabel: "Xem hồ sơ",
      actionTo: "/merchant/application/status",
    };
  }

  if (
    application.status === "Approved" ||
    application.status === "Accepted" ||
    application.status === "Accept"
  ) {
    return {
      label: "Đã được duyệt",
      description: "Quán của bạn đã được duyệt thành công và hiển thị trên UGem.",
      tone: "approved",
      actionLabel: "Quản lý nhà hàng",
      actionTo: "/merchant/restaurant",
    };
  }

  if (application.status === "Rejected") {
    return {
      label: "Bị từ chối",
      description: "Hồ sơ chưa đạt yêu cầu. Bạn có thể cập nhật lại thông tin.",
      tone: "rejected",
      actionLabel: "Chỉnh sửa và gửi lại",
      actionTo: "/merchant/application/create",
    };
  }

  return {
    label: application.status,
    description: "Trạng thái hồ sơ hiện tại của bạn.",
    tone: "default",
    actionLabel: "Xem hồ sơ",
    actionTo: "/merchant/application/status",
  };
}

export function ApplicationStatusCard({
  application,
}: {
  readonly application?: MerchantApplication;
}) {
  const status = getStatusText(application);
  const config = STATUS_CONFIG[status.tone];
  const Icon = config.icon;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-6 shadow-xs backdrop-blur-xl transition-colors duration-300 h-full flex flex-col justify-between">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${config.iconBox}`}>
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${config.badge}`}>
            Trạng thái hiện tại
          </span>

          <h2 className="mt-2.5 text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            {status.label}
          </h2>

          <p className="mt-1.5 text-xs sm:text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
            {status.description}
          </p>

          <Link
            to={status.actionTo}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-cyan-500/20 transition-all duration-200 hover:from-cyan-500 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            {status.actionLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
