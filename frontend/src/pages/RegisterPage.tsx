import { useState, type FormEvent } from "react";
import {
  Tag,
  User,
  Building2,
  Mail,
  Phone,
  Lock,
  MapPin,
  ArrowRight,
  AlertCircle,
  Briefcase
} from "lucide-react";
import { registerBusiness, saveAuthSession, splitOwnerName } from "../services/authApi";

interface RegisterPageProps {
  onNavigate: (view: "landing" | "login") => void;
  onRegisterSuccess: (userId: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function RegisterPage({
  onNavigate,
  onRegisterSuccess,
  showToast
}: RegisterPageProps) {
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [businessType, setBusinessType] = useState("Oto Lastik & Servis");
  const [address, setAddress] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError(null);

    const trimmedBusinessName = businessName.trim();
    const trimmedOwnerName = ownerName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedBusinessName) {
      setError("İşletme adı ve ünvanı boş bırakılamaz.");
      return;
    }

    if (!trimmedOwnerName) {
      setError("Yetkili isim ve soyisim bilgisi yazılmalıdır.");
      return;
    }

    const { firstName, lastName } = splitOwnerName(trimmedOwnerName);

    if (!firstName || !lastName) {
      setError("Yetkili ad soyad bilgisini ad ve soyad olarak yazın.");
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }

    if (!trimmedPhone) {
      setError("İletişim için telefon numarası zorunludur.");
      return;
    }

    if (password.length < 6) {
      setError("Şifreniz güvenliğiniz için en az 6 karakter olmalıdır.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Girdiğiniz şifreler birbiriyle eşleşmiyor.");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await registerBusiness({
        businessName: trimmedBusinessName,
        ownerName: trimmedOwnerName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password
      });

      saveAuthSession(result);

      const compatibleUserId = String(result.user.businessId);

      showToast(`Hesabınız oluşturuldu! Hoş geldiniz, ${trimmedBusinessName}.`, "success");
      onRegisterSuccess(compatibleUserId);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Kayıt sırasında beklenmeyen bir hata oluştu.";

      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col md:flex-row items-stretch">
        <div className="w-full md:w-4/12 bg-indigo-655 bg-gradient-to-br from-indigo-600 to-blue-650 text-white p-8 sm:p-10 flex flex-col justify-between">
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => onNavigate("landing")}
              className="inline-flex items-center gap-2 cursor-pointer group text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Tag className="w-4.5 h-4.5" />
              </div>
              <span className="font-bold text-base tracking-tight select-none">
                LastikOtelim
              </span>
            </button>

            <div className="pt-8">
              <h3 className="text-xl sm:text-2xl font-black leading-tight tracking-tight">
                Kendi İşletme Panelini Şimdi Oluştur
              </h3>
              <p className="text-xs text-blue-100 leading-normal mt-2.5 font-medium">
                Dükkanınızın lastik depolama, müşteri, araç ve emanet kayıtlarını tek panelden yönetin.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-[11px] text-blue-100/75 space-y-4">
            <p className="font-semibold">Güvenli ve API bağlantılı altyapı</p>
            <p className="leading-relaxed">
              Hesabınız oluşturulduktan sonra işletme, müşteri, araç ve lastik kayıtları backend üzerinden yönetilir.
            </p>
          </div>
        </div>

        <div className="w-full md:w-8/12 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-extrabold text-xl text-slate-900 tracking-tight">
                  Ücretsiz Hesap Açın
                </h4>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  İşletme ve kullanıcı bilgilerinizle hesabınızı oluşturun.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate("login")}
                className="text-blue-650 hover:text-blue-850 font-bold text-xs cursor-pointer"
              >
                Giriş Yap’a Git ➜
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-150 rounded-xl p-3.5 mb-5 flex items-start gap-2 text-rose-800 text-xs font-semibold leading-relaxed">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={handleRegister}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans"
            >
              <div>
                <label className="block font-bold text-slate-705 mb-1.5 label-required">
                  İşletme Adı / Ünvanı
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Örn: Öz Hilal Otomotiv"
                    className="w-full bg-slate-50 border border-slate-205 pl-10 pr-4 py-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-705 mb-1.5 label-required">
                  Yetkili Ad Soyad
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Örn: Ramazan Usta"
                    className="w-full bg-slate-50 border border-slate-205 pl-10 pr-4 py-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-705 mb-1.5 label-required">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramazan@hilaloto.com"
                    className="w-full bg-slate-50 border border-slate-205 pl-10 pr-4 py-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-705 mb-1.5 label-required">
                  İletişim Telefon No
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Örn: 0555 123 45 67"
                    className="w-full bg-slate-50 border border-slate-205 pl-10 pr-4 py-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-705 mb-1.5">
                  İşletme Türü
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    placeholder="Örn: Lastik Depolama & Oto Lastikçi"
                    className="w-full bg-slate-50 border border-slate-205 pl-10 pr-4 py-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden text-sm"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Bu alan şimdilik panel görünümü için kullanılır.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-705 mb-1.5 label-required">
                  Kilit Şifresi (Min 6 Karakter)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-205 pl-10 pr-4 py-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-705 mb-1.5 label-required">
                  Şifre Tekrarı
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-205 pl-10 pr-4 py-2.5 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-705 mb-1.5">
                  Açık İşletme Adresi
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="İşletme adresinizi yazabilirsiniz. Bu bilgi daha sonra Ayarlar ekranından güncellenebilir."
                    className="w-full bg-slate-50 border border-slate-205 pl-10 pr-4 py-2 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden text-sm"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Register endpoint’i şu an adres bilgisini almıyor. Adres güncellemesi Ayarlar ekranından yapılır.
                </p>
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    "Kayıt oluşturuluyor..."
                  ) : (
                    <>
                      Hesabı Oluştur ve Giriş Yap <ArrowRight className="w-4 h-4" />
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