import {
  useCallback,
  useEffect,
  useState,
  type FormEvent
} from "react";

import {
  Building2,
  CheckCircle2,
  HardDrive,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings,
  ShieldCheck
} from "lucide-react";

import {
  getBusinessById,
  updateBusiness,
  type BusinessApiResponse
} from "../services/businessApi";

import { getAuthDetail } from "../services/authApi";

interface SettingsPageProps {
  onResetDatabase: () => void;
  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
  onSaveSuccess?: () => void | Promise<void>;
}

const DEFAULT_BUSINESS_TYPE = "Oto Lastik & Servis";

export default function SettingsPage({
  showToast,
  onSaveSuccess
}: SettingsPageProps) {
  const [businessSlug, setBusinessSlug] = useState("");
  const [uploadFileId, setUploadFileId] = useState<number | null>(
    null
  );

  const [accountEmail, setAccountEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [isLoadingBusiness, setIsLoadingBusiness] =
    useState(true);

  const [isSavingBusiness, setIsSavingBusiness] =
    useState(false);

  const applyBusinessToForm = useCallback(
    (business: BusinessApiResponse) => {
      setBusinessSlug(business.slug || "");
      setUploadFileId(business.uploadFileId ?? null);

      setBusinessName(business.name || "");
      setPhone(business.phone || "");
      setAddress(business.address || "");
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    const loadBusinessSettings = async () => {
      try {
        setIsLoadingBusiness(true);

        const [authUser, business] = await Promise.all([
          getAuthDetail(),
          getBusinessById()
        ]);

        if (!isMounted) return;

        setAccountEmail(authUser.email || "");
        applyBusinessToForm(business);
      } catch (error) {
        if (!isMounted) return;

        console.error(
          "İşletme bilgileri API'den alınamadı:",
          error
        );

        showToast(
          error instanceof Error
            ? error.message
            : "İşletme bilgileri API'den alınamadı.",
          "error"
        );
      } finally {
        if (isMounted) {
          setIsLoadingBusiness(false);
        }
      }
    };

    loadBusinessSettings();

    return () => {
      isMounted = false;
    };
  }, [applyBusinessToForm, showToast]);

  const handleSaveSettings = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const trimmedBusinessName = businessName.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    if (
      !trimmedBusinessName ||
      !trimmedPhone ||
      !trimmedAddress
    ) {
      showToast(
        "Lütfen tüm zorunlu işletme bilgilerini doldurun.",
        "warning"
      );

      return;
    }

    try {
      setIsSavingBusiness(true);

      const updatedBusiness = await updateBusiness({
        name: trimmedBusinessName,
        address: trimmedAddress,
        phone: trimmedPhone,
        uploadFileId
      });

      applyBusinessToForm(updatedBusiness);

      await onSaveSuccess?.();

      showToast(
        "İşletme bilgileri başarıyla güncellendi.",
        "success"
      );
    } catch (error) {
      console.error(
        "İşletme bilgileri kaydedilemedi:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "İşletme bilgileri kaydedilirken hata oluştu.",
        "error"
      );
    } finally {
      setIsSavingBusiness(false);
    }
  };

  const isFormDisabled =
    isLoadingBusiness || isSavingBusiness;

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
      <div className="mx-auto w-full max-w-4xl space-y-5 pb-4 text-slate-950 animate-slide-in sm:space-y-6 sm:pb-6">
        {/* Sayfa üst alanı */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:rounded-3xl">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/20">
                <Settings className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <h1 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                  İşletme ve Sistem Ayarları
                </h1>

                <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-500 sm:text-sm sm:leading-6">
                  İşletmenize ait temel bilgiler backend API
                  üzerinden görüntülenir ve güncellenir.
                </p>

                {businessSlug && (
                  <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Slug
                    </span>

                    <span
                      className="truncate font-mono text-[11px] font-bold text-slate-700"
                      title={businessSlug}
                    >
                      {businessSlug}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-full border px-3 text-[10px] font-black uppercase tracking-wide ${
                isLoadingBusiness
                  ? "border-blue-100 bg-blue-50 text-blue-700"
                  : "border-emerald-100 bg-emerald-50 text-emerald-700"
              }`}
            >
              {isLoadingBusiness ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  API Kontrol
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  API Bağlı
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 border-t border-slate-100 bg-slate-50/60 sm:grid-cols-3">
            <StatusItem
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Veri Kaynağı"
              value="Backend API"
            />

            <StatusItem
              icon={<HardDrive className="h-4 w-4" />}
              label="İşletme Kaydı"
              value={businessName || "Yükleniyor"}
            />

            <StatusItem
              icon={<Mail className="h-4 w-4" />}
              label="Hesap"
              value={accountEmail || "Yükleniyor"}
            />
          </div>
        </section>

        {/* İşletme bilgileri formu */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:rounded-3xl">
          <header className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Building2 className="h-4.5 w-4.5" />
              </div>

              <div>
                <h2 className="text-sm font-black text-slate-900">
                  İşletme Bilgileri
                </h2>

                <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                  İşletme adı, telefon ve adres bilgilerini yönetin.
                </p>
              </div>
            </div>
          </header>

          <form onSubmit={handleSaveSettings}>
            <div className="space-y-5 p-5 sm:p-6">
              {/* Hesap e-posta */}
              <div>
                <FormLabel>
                  Kayıtlı Hesap E-postası
                </FormLabel>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="email"
                    value={accountEmail}
                    disabled
                    placeholder="E-posta bilgisi bulunamadı"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-100 pl-10 pr-4 text-sm font-semibold text-slate-500 outline-none disabled:cursor-not-allowed"
                  />
                </div>

                <p className="mt-2 text-[11px] font-medium leading-5 text-slate-400">
                  Bu bilgi Auth/Detail endpoint'i üzerinden okunur
                  ve bu ekrandan değiştirilemez.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* İşletme adı */}
                <div>
                  <FormLabel required>
                    İşletme Adı
                  </FormLabel>

                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(event) =>
                        setBusinessName(event.target.value)
                      }
                      disabled={isFormDisabled}
                      placeholder="Örn: Emin Oto Lastik"
                      autoComplete="organization"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>

                {/* Hizmet türü */}
                <div>
                  <FormLabel>
                    Hizmet Türü / Altyazı
                  </FormLabel>

                  <input
                    type="text"
                    value={DEFAULT_BUSINESS_TYPE}
                    disabled
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-500 outline-none disabled:cursor-not-allowed"
                  />

                  <p className="mt-2 text-[11px] font-medium leading-5 text-slate-400">
                    Business API içerisinde bu alan için kalıcı
                    bir field bulunmadığından local kayıt yapılmaz.
                  </p>
                </div>

                {/* Telefon */}
                <div className="md:col-span-2">
                  <FormLabel required>
                    İşletme Telefon Numarası
                  </FormLabel>

                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value)
                      }
                      disabled={isFormDisabled}
                      placeholder="Örn: 0312 345 67 89"
                      autoComplete="tel"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Adres */}
              <div>
                <FormLabel required>
                  İşletme Adresi
                </FormLabel>

                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />

                  <textarea
                    required
                    rows={4}
                    value={address}
                    onChange={(event) =>
                      setAddress(event.target.value)
                    }
                    disabled={isFormDisabled}
                    placeholder="İşletmenin açık adresini girin..."
                    autoComplete="street-address"
                    className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <p className="mt-2 text-[11px] font-medium leading-5 text-slate-400">
                  Bu adres işletme bilgileri ve gerekli çıktı
                  alanlarında kullanılabilir.
                </p>
              </div>
            </div>

            {/* Form alt alanı */}
            <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-[11px] font-medium leading-5 text-slate-400">
                Kaydettiğiniz bilgiler doğrudan backend üzerinde
                güncellenir.
              </p>

              <button
                type="submit"
                disabled={isFormDisabled}
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none sm:w-auto"
              >
                {isSavingBusiness ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Değişiklikleri Kaydet
                  </>
                )}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </div>
  );
}

function FormLabel({
  children,
  required = false
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-xs font-bold text-slate-700">
      {children}

      {required && (
        <span className="ml-1 text-rose-500">*</span>
      )}
    </label>
  );
}

function StatusItem({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-slate-100 px-5 py-3.5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-6 sm:last:border-r-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p
          className="mt-0.5 truncate text-[11px] font-bold text-slate-700"
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}