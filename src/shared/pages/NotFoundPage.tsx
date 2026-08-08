import { useNavigate } from "react-router-dom";
import { Compass, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ModeToggle } from "@/shared/components/ModeToggle";
import { useSafeBack } from "@/shared/hooks/useSafeBack";

export function NotFoundPage() {
  const navigate = useNavigate();
  const handleBack = useSafeBack("/login");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 transition-colors duration-300 relative">
      <div className="absolute top-6 right-6">
        <ModeToggle />
      </div>

      <div className="max-w-md w-full text-center space-y-6 bg-white/90 border border-slate-200/80 p-8 rounded-3xl shadow-xl dark:bg-slate-900/90 dark:border-white/10 backdrop-blur-xl">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 mx-auto ring-8 ring-cyan-500/5">
          <Compass className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            Error 404
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            Trang Không Tồn Tại
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Đường dẫn bạn truy cập không tồn tại hoặc đã được di chuyển sang địa chỉ khác.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleBack}
            className="w-full sm:w-auto font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Quay lại
          </Button>

          <Button
            variant="accent"
            onClick={() => navigate("/login")}
            className="w-full sm:w-auto font-bold text-xs"
          >
            <Home className="w-4 h-4 mr-1.5" />
            Về Đăng nhập
          </Button>
        </div>
      </div>
    </main>
  );
}

export default NotFoundPage;
