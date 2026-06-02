import React, { useEffect, useState } from "react";
import {
  HardDrive,
  Loader2,
  RefreshCw,
  Save,
  Settings,
  ShieldAlert,
  Trash2
} from "lucide-react";
import { AppSettings } from "../types";
import { StorageService } from "../services/storageService";
import {
  BusinessApiResponse,
  getBusinessById,
  mapBusinessToSettings,
  updateBusiness
} from "../services/businessApi";

interface SettingsPageProps {
  onResetDatabase: () => void;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onSaveSuccess?: () => void;
}

export default function SettingsPage({
  onResetDatabase,
  showToast,
  onSaveSuccess
}: SettingsPageProps) {
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [businessSlug, setBusinessSlug] = useState("");
  const [uploadFileId, setUploadFileId] = useState<number | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const applyBusinessToForm = (
    business: BusinessApiResponse,
    fallbackBusinessType: string
  ) => {
    const syncedSettings = mapBusinessToSettings(
      business,
      fallbackBusinessType || "Oto Lastik & Servis"
    );

    setBusinessId(business.id);
    setBusinessSlug(business.slug || "");
    setUploadFileId(business.uploadFileId ?? null);

    setBusinessName(syncedSettings.businessName);
    setBusinessType(syncedSettings.businessType);
    setPhone(syncedSettings.phone);
    setAddress(syncedSettings.address);

    localStorage.setItem("businessId", String(business.id));
    localStorage.setItem("businessSlug", business.slug || "");

    StorageService.saveSettings(syncedSettings);
  };

  useEffect(() => {
    let isMounted = true;

    const loadBusinessSettings = async () => {
      const localConfig = StorageService.getSettings();

      setBusinessName(localConfig.businessName);
      setBusinessType(localConfig.businessType);
      setPhone(localConfig.phone);
      setAddress(localConfig.address);

      try {
        setIsLoadingBusiness(true);

        const business = await getBusinessById();

        if (!isMounted) return;

        applyBusinessToForm(business, localConfig.businessType);

        if (onSaveSuccess) {
          onSaveSuccess();
        }
      } catch (error) {
        if (!isMounted) return;

        console.warn("İşletme bilgileri API'den alınamadı:", error);
        showToast("İşletme bilgileri API'den alınamadı. Local bilgiler gösteriliyor.", "warning");
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
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName.trim() || !phone.trim() || !address.trim()) {
      showToast("Lütfen tüm zorunlu işletme ayarlarını doldurun.", "warning");
      return;
    }

    if (!businessId) {
      showToast("İşletme ID bilgisi bulunamadı. Lütfen tekrar giriş yapın.", "error");
      return;
    }

    try {
      setIsSavingBusiness(true);

      const updatedBusiness = await updateBusiness({
        id: businessId,
        name: businessName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        uploadFileId
      });

      const updatedConfig: AppSettings = {
        businessName: updatedBusiness.name || businessName.trim(),
        businessType: businessType.trim() || "Oto Lastik & Servis",
        phone: updatedBusiness.phone || phone.trim(),
        address: updatedBusiness.address || address.trim()
      };

      setBusinessId(updatedBusiness.id);
      setBusinessSlug(updatedBusiness.slug || "");
      setUploadFileId(updatedBusiness.uploadFileId ?? null);

      setBusinessName(updatedConfig.businessName);
      setBusinessType(updatedConfig.businessType);
      setPhone(updatedConfig.phone);
      setAddress(updatedConfig.address);

      localStorage.setItem("businessId", String(updatedBusiness.id));
      localStorage.setItem("businessSlug", updatedBusiness.slug || "");

      StorageService.saveSettings(updatedConfig);

      if (onSaveSuccess) {
        onSaveSuccess();
      }

      showToast("İşletme bilgileri başarıyla güncellendi.", "success");
    } catch (error) {
      console.error("İşletme bilgileri kaydedilemedi:", error);

      const message =
        error instanceof Error
          ? error.message
          : "İşletme bilgileri kaydedilirken hata oluştu.";

      showToast(message, "error");
    } finally {
      setIsSavingBusiness(false);
    }
  };

  const handleConfirmReset = () => {
    try {
      onResetDatabase();

      const config = StorageService.getSettings();

      setBusinessName(config.businessName);
      setBusinessType(config.businessType);
      setPhone(config.phone);
      setAddress(config.address);

      setShowConfirmReset(false);
      showToast("Tüm veriler temizlendi ve demo kayıtları yeniden yüklendi.", "success");
    } catch {
      showToast("Sıfırlama başarısız oldu.", "error");
    }
  };

  return (
    <div className="max-w-3xl space-y-6 text-zinc-800 animate-slide-in">
      <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-3xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              <Settings className="w-5.5 h-5.5 text-blue-600 animate-spin-slow" />
              İşletme &amp; Sistem Ayarları
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              İşletme bilgilerini, makbuz künye alanlarını ve sistem ayarlarını yönetin.
            </p>
          </div>

          {isLoadingBusiness && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              API kontrol
            </div>
          )}
        </div>

        {businessSlug && (
          <p className="mt-3 text-[11px] text-zinc-400">
            İşletme slug:{" "}
            <span className="font-semibold text-zinc-600">{businessSlug}</span>
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-3xs p-6 space-y-5">
        <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 border-zinc-50 flex items-center gap-1.5 uppercase">
          <HardDrive className="w-4.5 h-4.5 text-blue-500" />
          Fatura / Makbuz Künye Bilgileri
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                İşletme Adı *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Örn: Emin Oto Lastik"
                className="w-full bg-zinc-50 px-3.5 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Hizmet Türü / Altyazı
              </label>
              <input
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="Örn: Lastik Emanet, Rot Balans ve Servis"
                className="w-full bg-zinc-50 px-3.5 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                İşletme Telefon No *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Örn: 0312 345 67 89"
                className="w-full bg-zinc-50 px-3.5 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Fiziksel Mağaza Adresi *
            </label>
            <textarea
              required
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Makbuzun alt bandında çıkacak açık dükkan adresi..."
              className="w-full bg-zinc-50 px-3.5 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-hidden focus:border-blue-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingBusiness}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-all self-start"
          >
            {isSavingBusiness ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Değişiklikleri Kaydet
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 shadow-3xs space-y-4">
        <div className="flex items-center gap-2 text-rose-800">
          <ShieldAlert className="w-5.5 h-5.5" />
          <h3 className="font-bold text-sm uppercase">
            Sistem Temizleme (Tehlikeli Alan)
          </h3>
        </div>

        <p className="text-xs text-rose-900/65 leading-relaxed">
          Aşağıdaki buton tarayıcınızda kayıtlı olan tüm müşterileri, plakaları,
          çekilen lastik fotoğraflarını ve emanet fişlerini kalıcı olarak siler.
          Bu işlem geri alınamaz.
        </p>

        <button
          type="button"
          onClick={() => setShowConfirmReset(true)}
          className="flex items-center gap-1.5 px-4.5 py-2 bg-rose-600 hover:bg-rose-700 transition-colors text-white font-bold text-xs rounded-lg shadow-md cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          Tüm LocalStorage Veritabanını Sıfırla
        </button>
      </div>

      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-rose-100 p-6 space-y-4 animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6 animate-bounce" />
              </div>

              <h4 className="font-bold text-zinc-950 text-sm">
                Veriler Silinecektir! Onaylıyor musunuz?
              </h4>

              <p className="text-xs text-zinc-500 leading-relaxed">
                Bu dükkanda kaydettiğiniz tüm teslimatlar, araç sahipleri,
                konum rafları ve görseller geri getirilmeyecek şekilde silinecektir.
              </p>
            </div>

            <div className="flex justify-end gap-2 text-xs font-sans">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-lg"
              >
                Vazgeç / İptal
              </button>

              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Evet, Tamamen Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}