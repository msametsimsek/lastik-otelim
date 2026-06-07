import React, { useEffect, useState } from "react";
import { HardDrive, Loader2, Mail, Save, Settings } from "lucide-react";

import {
  getBusinessById,
  updateBusiness
} from "../services/businessApi";

import type { BusinessApiResponse } from "../services/businessApi";
import { getAuthDetail } from "../services/authApi";

interface SettingsPageProps {
  onResetDatabase: () => void;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onSaveSuccess?: () => void;
}

const DEFAULT_BUSINESS_TYPE = "Oto Lastik & Servis";

export default function SettingsPage({
  showToast,
  onSaveSuccess
}: SettingsPageProps) {
  const [businessSlug, setBusinessSlug] = useState("");
  const [uploadFileId, setUploadFileId] = useState<number | null>(null);

  const [accountEmail, setAccountEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType] = useState(DEFAULT_BUSINESS_TYPE);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);

  const applyBusinessToForm = (business: BusinessApiResponse) => {
    setBusinessSlug(business.slug || "");
    setUploadFileId(business.uploadFileId ?? null);

    setBusinessName(business.name || "");
    setPhone(business.phone || "");
    setAddress(business.address || "");
  };

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

        console.error("İşletme bilgileri API'den alınamadı:", error);

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
  }, [showToast]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedBusinessName = businessName.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    if (!trimmedBusinessName || !trimmedPhone || !trimmedAddress) {
      showToast("Lütfen tüm zorunlu işletme ayarlarını doldurun.", "warning");
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

      if (onSaveSuccess) {
        await onSaveSuccess();
      }

      showToast("İşletme bilgileri API üzerinde başarıyla güncellendi.", "success");
    } catch (error) {
      console.error("İşletme bilgileri kaydedilemedi:", error);

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

  return (
    <div className="max-w-3xl space-y-6 text-zinc-800 animate-slide-in">
      <section className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-3xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              <Settings className="w-5.5 h-5.5 text-blue-600 animate-spin-slow" />
              İşletme &amp; Sistem Ayarları
            </h2>

            <p className="text-xs text-zinc-500 mt-1">
              İşletmenize ait temel bilgiler doğrudan backend API üzerinden görüntülenir ve güncellenir.
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
      </section>

      <section className="bg-white rounded-2xl border border-zinc-100 shadow-3xs p-6 space-y-5">
        <div className="border-b pb-2 border-zinc-50">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5 uppercase">
            <HardDrive className="w-4.5 h-4.5 text-blue-500" />
            İşletme Bilgileri
          </h3>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Kayıtlı Hesap E-postası
            </label>

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />

              <input
                type="email"
                value={accountEmail || "E-posta bilgisi API'den alınamadı"}
                disabled
                className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-500 cursor-not-allowed outline-none"
              />
            </div>

            <p className="mt-1.5 text-[11px] text-zinc-400 leading-relaxed">
              Bu bilgi Auth/Detail endpoint’i üzerinden okunur. Bu ekrandan değiştirilemez.
            </p>
          </div>

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
                disabled={isLoadingBusiness || isSavingBusiness}
                placeholder="Örn: Emin Oto Lastik"
                className="w-full bg-zinc-50 px-3.5 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-hidden focus:border-blue-500 focus:bg-white disabled:bg-zinc-100 disabled:text-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Hizmet Türü / Altyazı
              </label>

              <input
                type="text"
                value={businessType}
                disabled
                className="w-full bg-zinc-100 px-3.5 py-2 text-sm border border-zinc-200 rounded-lg text-zinc-500 cursor-not-allowed outline-none"
              />

              <p className="mt-1.5 text-[11px] text-zinc-400 leading-relaxed">
                Business API içinde bu alan için kalıcı bir field olmadığı için local kayıt yapılmaz.
              </p>
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
                disabled={isLoadingBusiness || isSavingBusiness}
                placeholder="Örn: 0312 345 67 89"
                className="w-full bg-zinc-50 px-3.5 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-hidden focus:border-blue-500 focus:bg-white disabled:bg-zinc-100 disabled:text-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              İşletme Adresi *
            </label>

            <textarea
              required
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isLoadingBusiness || isSavingBusiness}
              placeholder="Makbuzun alt bandında çıkacak açık dükkan adresi..."
              className="w-full bg-zinc-50 px-3.5 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-hidden focus:border-blue-500 focus:bg-white disabled:bg-zinc-100 disabled:text-zinc-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingBusiness || isLoadingBusiness}
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
                Değişiklikleri API'ye Kaydet
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}