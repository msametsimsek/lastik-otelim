import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Crown,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  X,
  XCircle
} from "lucide-react";
import { StorageService } from "../services/storageService";
import { BillingCycle, SubscriptionApi } from "../services/subscriptionApi";
import { SubscriptionPlanId, UserSubscription } from "../types";

interface SubscriptionPageProps {
  subscription: UserSubscription;
  onSubscriptionChange: () => void;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

type Plan = {
  id: SubscriptionPlanId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  desc: string;
  features: string[];
  limits: string[];
  popular?: boolean;
};

type PaymentForm = {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
  registerCard: boolean;
  fullName: string;
  phone: string;
  email: string;
  address: string;
};

const initialPaymentForm: PaymentForm = {
  cardHolderName: "",
  cardNumber: "",
  expireMonth: "",
  expireYear: "",
  cvc: "",
  registerCard: false,
  fullName: "",
  phone: "",
  email: "",
  address: ""
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Başlangıç",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    desc: "Küçük lastikçiler için temel takip paketi.",
    features: [
      "Etiket yazdırma",
      "Temel dashboard",
      "Müşteri ve plaka takibi",
      "Depo raf sorgulama"
    ],
    limits: ["100 müşteri", "300 lastik kaydı", "1 kullanıcı"]
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 499,
    yearlyPrice: 4990,
    desc: "Yoğun çalışan işletmeler için ideal paket.",
    features: [
      "Gelişmiş depo takibi",
      "Etiket geçmişi",
      "Sınırsız müşteri",
      "Raporlama altyapısı"
    ],
    limits: ["1000 lastik kaydı", "3 kullanıcı", "Öncelikli özellikler"],
    popular: true
  },
  {
    id: "enterprise",
    name: "Kurumsal",
    monthlyPrice: 899,
    yearlyPrice: 8990,
    desc: "Birden fazla kullanıcı ve geniş operasyonlar için.",
    features: [
      "Sınırsız kayıt",
      "Çoklu kullanıcı",
      "Gelişmiş raporlar",
      "Öncelikli destek"
    ],
    limits: ["Sınırsız müşteri", "Sınırsız lastik kaydı", "10 kullanıcı"]
  }
];

function formatPrice(value: number) {
  return `₺${value.toLocaleString("tr-TR")}`;
}

function onlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}

function formatCardNumber(value: string) {
  return onlyNumbers(value)
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatDateTR(date?: string) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function getBillingCycleLabel(cycle?: BillingCycle) {
  return cycle === "yearly" ? "Yıllık" : "Aylık";
}

function getBillingCycleDescription(cycle?: BillingCycle) {
  return cycle === "yearly" ? "12 aylık abonelik" : "1 aylık abonelik";
}

export default function SubscriptionPage({
  subscription,
  onSubscriptionChange,
  showToast
}: SubscriptionPageProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(initialPaymentForm);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [threeDSHtmlContent, setThreeDSHtmlContent] = useState<string | null>(null);

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === subscription.planId),
    [subscription.planId]
  );

  const activeBillingCycle: BillingCycle = subscription.billingCycle || "monthly";

  const activePlanPrice = currentPlan
    ? activeBillingCycle === "yearly"
      ? currentPlan.yearlyPrice
      : currentPlan.monthlyPrice
    : subscription.amount || 0;

  const activeEndDate = subscription.periodEndAt || subscription.renewalDate;
  const isPaymentModalOpen = Boolean(selectedPlan);

  useEffect(() => {
    if (isPaymentModalOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isPaymentModalOpen]);

  const getPlanPrice = (plan: Plan, cycle: BillingCycle = billingCycle) => {
    return cycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  };

  const getBillingLabel = (cycle: BillingCycle = billingCycle) => {
    return cycle === "monthly" ? "aylık" : "yıllık";
  };

  const resetPaymentModal = () => {
    setSelectedPlan(null);
    setPaymentForm(initialPaymentForm);
    setThreeDSHtmlContent(null);
  };

  const closePaymentModal = () => {
    if (isSubmittingPayment) return;
    resetPaymentModal();
  };

  const handleOpenPayment = (plan: Plan) => {
    setSelectedPlan(plan);
    setThreeDSHtmlContent(null);
    setPaymentForm(initialPaymentForm);
  };

  const handleCancelSubscription = () => {
    StorageService.cancelSubscription();
    onSubscriptionChange();
    showToast("Abonelik pasif duruma alındı.", "info");
  };

  const handlePaymentChange = (
    field: keyof PaymentForm,
    value: string | boolean
  ) => {
    setPaymentForm((prev) => {
      if (field === "cardNumber" && typeof value === "string") {
        return { ...prev, cardNumber: formatCardNumber(value) };
      }

      if (field === "expireMonth" && typeof value === "string") {
        return { ...prev, expireMonth: onlyNumbers(value).slice(0, 2) };
      }

      if (field === "expireYear" && typeof value === "string") {
        return { ...prev, expireYear: onlyNumbers(value).slice(0, 4) };
      }

      if (field === "cvc" && typeof value === "string") {
        return { ...prev, cvc: onlyNumbers(value).slice(0, 4) };
      }

      return { ...prev, [field]: value };
    });
  };

  const validatePaymentForm = () => {
    const cleanCardNumber = onlyNumbers(paymentForm.cardNumber);

    if (!selectedPlan) {
      showToast("Lütfen bir abonelik planı seçin.", "warning");
      return false;
    }

    if (!paymentForm.fullName.trim()) {
      showToast("Lütfen fatura ad soyad alanını doldurun.", "warning");
      return false;
    }

    if (!paymentForm.phone.trim()) {
      showToast("Lütfen telefon alanını doldurun.", "warning");
      return false;
    }

    if (!paymentForm.cardHolderName.trim()) {
      showToast("Lütfen kart üzerindeki isim alanını doldurun.", "warning");
      return false;
    }

    if (cleanCardNumber.length < 16) {
      showToast("Kart numarası 16 haneli olmalıdır.", "warning");
      return false;
    }

    if (!paymentForm.expireMonth || paymentForm.expireMonth.length < 2) {
      showToast("Son kullanma ayını girin.", "warning");
      return false;
    }

    if (!paymentForm.expireYear || paymentForm.expireYear.length < 2) {
      showToast("Son kullanma yılını girin.", "warning");
      return false;
    }

    if (!paymentForm.cvc || paymentForm.cvc.length < 3) {
      showToast("CVC alanını kontrol edin.", "warning");
      return false;
    }

    return true;
  };

  const handleSubmitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedPlan || !validatePaymentForm()) return;

    setIsSubmittingPayment(true);

    try {
      const response = await SubscriptionApi.initializePayment({
        planId: selectedPlan.id,
        billingCycle,
        card: {
          cardHolderName: paymentForm.cardHolderName.trim(),
          cardNumber: paymentForm.cardNumber,
          expireMonth: paymentForm.expireMonth,
          expireYear: paymentForm.expireYear,
          cvc: paymentForm.cvc,
          registerCard: paymentForm.registerCard
        },
        billingInfo: {
          fullName: paymentForm.fullName.trim(),
          phone: paymentForm.phone.trim(),
          email: paymentForm.email.trim() || undefined,
          address: paymentForm.address.trim() || undefined
        },
        returnUrl: `${window.location.origin}/subscription/callback`
      });

      if (!response.success) {
        showToast(response.message || "Ödeme başlatılamadı.", "error");
        return;
      }

      if (response.requires3ds && response.threeDSHtmlContent) {
        setThreeDSHtmlContent(response.threeDSHtmlContent);
        showToast("3D Secure doğrulaması başlatıldı.", "info");
        return;
      }

      if (response.subscription) {
        StorageService.saveSubscription({
          ...response.subscription,
          billingCycle,
          amount: getPlanPrice(selectedPlan),
          currency: "TRY",
          periodEndAt:
            response.subscription.periodEndAt ||
            response.subscription.renewalDate
        });

        onSubscriptionChange();
        showToast(
          response.message || `${selectedPlan.name} planı aktif edildi.`,
          "success"
        );
        resetPaymentModal();
        return;
      }

      showToast("Ödeme başarılı fakat abonelik bilgisi alınamadı.", "warning");
    } catch (error) {
      console.error("Subscription payment error:", error);
      showToast("Ödeme işlemi sırasında hata oluştu.", "error");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const paymentModal =
    isPaymentModalOpen && selectedPlan
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4 py-5 backdrop-blur-sm">
            <div className="flex max-h-[calc(100dvh-40px)] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
              <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
                      <LockKeyhole className="h-3.5 w-3.5" />
                      Güvenli Ödeme
                    </div>

                    <h3 className="mt-2 text-lg font-black text-slate-950">
                      {selectedPlan.name} planı için ödeme
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {threeDSHtmlContent ? (
                  <div className="space-y-4 p-6">
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                      3D Secure doğrulaması açıldı. Banka doğrulaması
                      tamamlanınca backend abonelik durumunu güncelleyecek.
                    </div>

                    <iframe
                      title="3D Secure"
                      srcDoc={threeDSHtmlContent}
                      className="h-[520px] w-full rounded-2xl border border-slate-200 bg-white"
                    />
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmitPayment}
                    className="grid grid-cols-1 lg:grid-cols-5"
                  >
                    <div className="space-y-4 p-6 lg:col-span-3">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-xs font-black text-slate-700">
                            Fatura Ad Soyad / Ünvan
                          </label>
                          <input
                            type="text"
                            value={paymentForm.fullName}
                            onChange={(e) =>
                              handlePaymentChange("fullName", e.target.value)
                            }
                            placeholder="Emin Oto Lastik"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-black text-slate-700">
                            Telefon
                          </label>
                          <input
                            type="tel"
                            value={paymentForm.phone}
                            onChange={(e) =>
                              handlePaymentChange("phone", e.target.value)
                            }
                            placeholder="0532 123 45 67"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-black text-slate-700">
                            E-posta
                          </label>
                          <input
                            type="email"
                            value={paymentForm.email}
                            onChange={(e) =>
                              handlePaymentChange("email", e.target.value)
                            }
                            placeholder="ornek@mail.com"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-xs font-black text-slate-700">
                            Fatura Adresi
                          </label>
                          <textarea
                            value={paymentForm.address}
                            onChange={(e) =>
                              handlePaymentChange("address", e.target.value)
                            }
                            placeholder="İşletme adresi"
                            rows={3}
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>
                      </div>

                      <div className="my-2 border-t border-slate-100" />

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-xs font-black text-slate-700">
                            Kart Üzerindeki İsim
                          </label>
                          <input
                            type="text"
                            value={paymentForm.cardHolderName}
                            onChange={(e) =>
                              handlePaymentChange(
                                "cardHolderName",
                                e.target.value
                              )
                            }
                            placeholder="AD SOYAD"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold uppercase text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-xs font-black text-slate-700">
                            Kart Numarası
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={paymentForm.cardNumber}
                            onChange={(e) =>
                              handlePaymentChange("cardNumber", e.target.value)
                            }
                            placeholder="0000 0000 0000 0000"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm font-black tracking-widest text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-black text-slate-700">
                              Ay
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={paymentForm.expireMonth}
                              onChange={(e) =>
                                handlePaymentChange(
                                  "expireMonth",
                                  e.target.value
                                )
                              }
                              placeholder="12"
                              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm font-black text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-black text-slate-700">
                              Yıl
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={paymentForm.expireYear}
                              onChange={(e) =>
                                handlePaymentChange(
                                  "expireYear",
                                  e.target.value
                                )
                              }
                              placeholder="2028"
                              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm font-black text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-black text-slate-700">
                            CVC
                          </label>
                          <input
                            type="password"
                            inputMode="numeric"
                            value={paymentForm.cvc}
                            onChange={(e) =>
                              handlePaymentChange("cvc", e.target.value)
                            }
                            placeholder="123"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm font-black text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>
                      </div>

                      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <input
                          type="checkbox"
                          checked={paymentForm.registerCard}
                          onChange={(e) =>
                            handlePaymentChange(
                              "registerCard",
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        <span className="text-xs font-bold text-slate-600">
                          Kartımı sonraki ödemeler için güvenli şekilde kaydet
                        </span>
                      </label>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50 p-6 lg:col-span-2 lg:border-l lg:border-t-0">
                      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <ReceiptText className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                              Sipariş Özeti
                            </p>
                            <h4 className="text-base font-black text-slate-950">
                              {selectedPlan.name} Plan
                            </h4>
                          </div>
                        </div>

                        <div className="mt-5 space-y-3 text-sm font-bold text-slate-600">
                          <div className="flex justify-between">
                            <span>Faturalandırma</span>
                            <span>
                              {billingCycle === "monthly" ? "Aylık" : "Yıllık"}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span>Paket Tutarı</span>
                            <span>{formatPrice(getPlanPrice(selectedPlan))}</span>
                          </div>

                          <div className="flex justify-between text-slate-400">
                            <span>KDV</span>
                            <span>Backend hesaplayacak</span>
                          </div>

                          <div className="border-t border-slate-100 pt-3">
                            <div className="flex items-center justify-between text-slate-950">
                              <span>Ödenecek Tutar</span>
                              <span className="text-xl font-black">
                                {formatPrice(getPlanPrice(selectedPlan))}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-slate-500">
                            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                            Ödeme tamamlanınca aboneliğiniz{" "}
                            {billingCycle === "monthly" ? "1 ay" : "1 yıl"}{" "}
                            aktif edilir. Backend yenileme ve bitiş tarihini
                            response içinde döndürebilir.
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingPayment}
                          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSubmittingPayment
                            ? "Ödeme Başlatılıyor..."
                            : "Ödemeyi Başlat"}
                        </button>

                        <button
                          type="button"
                          onClick={closePaymentModal}
                          disabled={isSubmittingPayment}
                          className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Vazgeç
                        </button>
                      </div>

                      <p className="mt-4 text-center text-[11px] font-semibold leading-relaxed text-slate-400">
                        Kart bilgileri kalıcı olarak tarayıcıda saklanmaz.
                        Backend geldiğinde ödeme sağlayıcı üzerinden güvenli
                        işlem yapılır.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="space-y-5 text-center">
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            <CreditCard className="h-3.5 w-3.5" />
            Abonelik Yönetimi
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            LastikTakip Abonelik Planı
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
            İşletmenin aktif paketini görüntüle, plan değiştir veya aboneliğini
            güvenli ödeme akışıyla başlat.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`h-10 rounded-xl px-5 text-xs font-black transition-all ${
                billingCycle === "monthly"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              Aylık
            </button>

            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`h-10 rounded-xl px-5 text-xs font-black transition-all ${
                billingCycle === "yearly"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              Yıllık
            </button>
          </div>
        </div>
      </div>

      {subscription.isActive ? (
        <div className="rounded-[2rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                  Abonelik Aktif
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {currentPlan?.name || subscription.planName} Plan
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Bitiş / yenileme tarihi: {formatDateTR(activeEndDate)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-4 text-left shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Ödeme Periyodu
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {getBillingCycleLabel(activeBillingCycle)}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-400">
                    {getBillingCycleDescription(activeBillingCycle)}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-4 text-left shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Paket Tutarı
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {activePlanPrice ? formatPrice(activePlanPrice) : "-"}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-emerald-600">
                    Aktif
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-4 text-left shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Bitiş / Yenileme
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {formatDateTR(activeEndDate)}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-slate-400">
                    Başlangıç: {formatDateTR(subscription.startedAt)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancelSubscription}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 text-sm font-black text-rose-600 shadow-sm transition-all hover:bg-rose-50 active:scale-[0.98]"
              >
                <XCircle className="h-4 w-4" />
                Pasife Al
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-600/20">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20">
                <Crown className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-100">
                  Abonelik Bulunamadı
                </p>

                <h2 className="mt-1 text-xl font-black">
                  LastikTakip’i tam kapasite kullanmaya başlayın
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-blue-100">
                  Müşteri, emanet, depo, barkod ve raporlama özelliklerini
                  profesyonel paketlerle yönetin.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-black ring-1 ring-white/20">
              Plan seçerek başlayın
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan =
            subscription.isActive &&
            subscription.planId === plan.id &&
            activeBillingCycle === billingCycle;

          return (
            <div
              key={plan.id}
              className={`relative rounded-[2rem] border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                plan.popular
                  ? "border-blue-200 ring-4 ring-blue-50"
                  : "border-slate-200/80"
              }`}
            >
              {plan.popular && (
                <div className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                  <Sparkles className="h-3 w-3" />
                  Önerilen
                </div>
              )}

              <h3 className="text-lg font-black text-slate-950">
                {plan.name}
              </h3>

              <p className="mt-2 min-h-[40px] text-sm font-medium leading-relaxed text-slate-500">
                {plan.desc}
              </p>

              <div className="mt-6">
                <span className="text-3xl font-black tracking-tight text-slate-950">
                  {formatPrice(getPlanPrice(plan))}
                </span>
                <span className="ml-1 text-sm font-bold text-slate-400">
                  / {getBillingLabel()}
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 text-sm font-bold text-slate-600"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    {feature}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Paket Limitleri
                </p>

                <div className="space-y-2">
                  {plan.limits.map((limit) => (
                    <div
                      key={limit}
                      className="flex items-center gap-2 text-xs font-bold text-slate-600"
                    >
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                      {limit}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={isCurrentPlan}
                onClick={() => handleOpenPayment(plan)}
                className={`mt-7 inline-flex h-11 w-full items-center justify-center rounded-2xl text-sm font-black transition-all active:scale-[0.98] disabled:cursor-not-allowed ${
                  isCurrentPlan
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : plan.popular
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {isCurrentPlan
                  ? "Mevcut Plan"
                  : subscription.isActive
                    ? "Planı Güncelle"
                    : "Ödeme ile Başlat"}
              </button>
            </div>
          );
        })}
      </div>

      {paymentModal}
    </div>
  );
}