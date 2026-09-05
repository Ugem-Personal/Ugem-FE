import { Loader2, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { trackAffiliateLink } from "../services";

export default function AffiliateRedirectPage() {
  const { linkCode } = useParams<{ linkCode: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!linkCode) return;
    const code = linkCode;

    let active = true;

    async function trackAndRedirect() {
      try {
        const result = await trackAffiliateLink(code);

        if (active) {
          navigate(
            `/customer/merchants/${result.merchantId}?ref=${encodeURIComponent(
              result.linkCode,
            )}`,
            { replace: true },
          );
        }
      } catch (trackingError) {
        console.error(trackingError);
        if (active) setError(true);
      }
    }

    void trackAndRedirect();

    return () => {
      active = false;
    };
  }, [linkCode, navigate]);

  if (!linkCode) {
    return (
      <main className="app-page grid place-items-center px-4">
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
    <main className="app-page grid place-items-center px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200/80 bg-white/90 p-6 text-center shadow-xl dark:border-white/10 dark:bg-slate-900/90">
        {error ? (
          <>
            <Link2 className="mx-auto h-9 w-9 text-slate-500 dark:text-slate-400" />
            <h1 className="mt-3 text-2xl font-black">Không thể mở link</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Link affiliate không tồn tại, đã bị khóa hoặc merchant không còn
              hoạt động.
            </p>
            <Link
              to="/customer"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Về trang chủ
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-slate-700 dark:text-slate-300" />
            <h1 className="mt-3 text-2xl font-black">Đang mở quán</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              UGem đang ghi nhận lượt click affiliate và chuyển bạn tới trang
              quán.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
