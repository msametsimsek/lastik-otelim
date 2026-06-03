import React, { useState } from "react";
import {
  Tag,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { loginBusiness, saveAuthSession } from "../services/authApi";

interface LoginPageProps {
  onNavigate: (view: "landing" | "register") => void;
  onLoginSuccess: (userId: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function LoginPage({
  onNavigate,
  onLoginSuccess,
  showToast
}: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Lütfen e-posta ve şifre alanlarını doldurun.");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await loginBusiness({
        email: trimmedEmail,
        password: trimmedPassword
      });

      saveAuthSession(result);

      const userId = String(result.user.businessId);
      const ownerName = `${result.user.firstName} ${result.user.lastName}`.trim();

      showToast(`Hoş geldiniz, ${ownerName || result.user.email}!`, "success");
      onLoginSuccess(userId);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Giriş sırasında beklenmeyen bir hata oluştu.";

      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col md:flex-row items-stretch min-h-[550px]">
        <div className="w-full md:w-5/12 bg-indigo-655 bg-gradient-to-br from-blue-650 to-indigo-700 text-white p-8 sm:p-10 flex flex-col justify-between">
          <div className="space-y-4">
            <div
              onClick={() => onNavigate("landing")}
              className="inline-flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Tag className="w-4.5 h-4.5" />
              </div>
              <span className="font-bold text-base tracking-tight select-none">
                LastikOtelim
              </span>
            </div>

            <div className="pt-8">
              <h3 className="text-2xl font-black leading-tight tracking-tight">
                Akıllı Lastik Emanet Paneli
              </h3>
              <p className="text-xs text-blue-100 leading-normal mt-2.5 font-medium">
                Müşterilerinizin mevsimlik lastiklerini saniyeler içerisinde
                barkodlayın, depodaki raf konumunu asla şaşırmayın.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-[11px] text-blue-100/75 space-y-2">
            <p className="font-semibold">Neden Biz?</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                <span>Anında plaka bazlı arama</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                <span>Termal barkod çıktısı desteği</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-7/12 p-8 sm:p-12 flex flex-col justify-center">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-extrabold text-xl text-slate-900 tracking-tight">
                  İşletme Girişi
                </h4>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Lütfen kayıtlı e-posta ve şifrenizi yazın.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate("register")}
                className="text-blue-600 hover:text-blue-700 font-bold text-xs cursor-pointer"
              >
                Yeni Hesap Aç ➜
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-150 rounded-xl p-3.5 mb-5 flex items-start gap-2 text-rose-800 text-xs font-semibold leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1.5 label-required">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@isletme.com"
                    disabled={isSubmitting}
                    className="w-full bg-slate-50 border border-slate-205 pl-10 pr-4 py-2.5 text-sm rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1.5 label-required">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    className="w-full bg-slate-50 border border-slate-205 pl-10 pr-4 py-2.5 text-sm rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-850 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    "Giriş yapılıyor..."
                  ) : (
                    <>
                      Giriş Yap <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}