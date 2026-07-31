import { Loader2, Link2 } from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import { getAffiliateTrackUrl } from "../services";

export default function AffiliateRedirectPage() {
  const { linkCode } = useParams<{ linkCode: string }>();

  useEffect(() => {
    if (!linkCode) return;

    window.location.replace(getAffiliateTrackUrl(linkCode));
  }, [linkCode]);

  if (!linkCode) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#edfafa_0%,#ffffff_100%)] px-4 text-slate-950">
        <section className="w-full max-w-md rounded-lg border border-white/80 bg-white/90 p-6 text-center shadow-xl shadow-cyan-950/10">
          <Link2 className="mx-auto h-9 w-9 text-cyan-700" />
          <h1 className="mt-3 text-2xl font-black">Link không hợp lệ</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Mã affiliate không tồn tại hoặc đã bị thiếu trong đường dẫn.
          </p>
          <Link
            to="/customer"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-cyan-700 px-4 text-sm font-black text-white shadow-lg shadow-cyan-900/15 transition hover:bg-cyan-800"
          >
            Về trang chủ
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#edfafa_0%,#ffffff_100%)] px-4 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-white/80 bg-white/90 p-6 text-center shadow-xl shadow-cyan-950/10">
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-cyan-700" />
        <h1 className="mt-3 text-2xl font-black">Đang mở quán</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          UGem đang ghi nhận lượt click affiliate và chuyển bạn tới trang quán.
        </p>
      </section>
    </main>
  );
}
