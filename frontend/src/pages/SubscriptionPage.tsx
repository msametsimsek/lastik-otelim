import { useMemo } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Crown,
  RefreshCcw,
  ShieldCheck,
  Sparkles
} from "lucide-react";

import {
  SubscriptionPlanId,
  UserSubscription,
  SubscriptionBillingCycle
} from "../types";

interface SubscriptionPageProps {
  subscription: UserSubscription;
  onSubscriptionChange: () => void;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

type BillingCycle = SubscriptionBillingCycle;

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

function getPlanPrice(plan: Plan, cycle: BillingCycle) {
  return cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

function getBillingLabel(cycle: BillingCycle) {
  return cycle === "yearly" ? "yıllık" : "aylık";
}

export default function SubscriptionPage({
  subscription,
  onSubscriptionChange,
  showToast
}: SubscriptionPageProps) {
  const billingCycle: BillingCycle = subscription.billingCycle || "monthly";

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === subscription.planId),
    [subscription.planId]
  );

  const activePlanPrice = currentPlan
    ? getPlanPrice(currentPlan, billingCycle)
    : subscription.amount || 0;

  const activeEndDate = subscription.periodEndAt || subscription.renewalDate;

  const handlePlanAction = (plan: Plan) => {
    showToast(
      `${plan.name} planı için abonelik/ödeme endpoint'i henüz backend'e bağlı değil. Sahte ödeme veya local abonelik oluşturulmadı.`,
      "warning"
    );
  };

  const handleCancelSubscription = () => {
    showToast(
      "Abonelik pasife alma endpoint'i henüz backend'e bağlı değil. Local abonelik durumu değiştirilmedi.",
      "warning"
    );
  };

  const handleRefreshSubscription = () => {
    onSubscriptionChange();

    showToast(
      "Abonelik bilgileri için API verileri yeniden yükleniyor.",
      "info"
    );
  };

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="space-y-5 text-center">
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            <CreditCard className="h-3.5 w-3.5" />
            Abonelik Yönetimi
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            LastikOtelim Abonelik Planı
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
            Bu ekran backend abonelik/ödeme endpoint’i hazır olduğunda gerçek
            abonelik durumunu gösterecek şekilde hazırlanmıştır. Şu an sahte
            ödeme veya local abonelik işlemi yapılmaz.
          </p>

          <button
            type="button"
            onClick={handleRefreshSubscription}
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            API Verilerini Yenile
          </button>
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
                  {currentPlan?.name || subscription.planName || "Aktif"} Plan
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
                    {getBillingCycleLabel(billingCycle)}
                  </p>

                  <p className="mt-0.5 text-xs font-bold text-slate-400">
                    {getBillingCycleDescription(billingCycle)}
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
                  Abonelik Endpoint’i Bekleniyor
                </p>

                <h2 className="mt-1 text-xl font-black">
                  LastikOtelim abonelik sistemi backend’e bağlanacak
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-blue-100">
                  Müşteri, emanet, depo, barkod ve raporlama özellikleri için
                  planlar hazır. Ödeme ve abonelik durumu backend endpoint’i
                  geldiğinde aktif edilecek.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-black ring-1 ring-white/20">
              Sahte abonelik oluşturulmaz
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan =
            subscription.isActive && subscription.planId === plan.id;

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

              <div className="mt-6 space-y-2">
                <div>
                  <span className="text-3xl font-black tracking-tight text-slate-950">
                    {formatPrice(plan.monthlyPrice)}
                  </span>

                  <span className="ml-1 text-sm font-bold text-slate-400">
                    / {getBillingLabel("monthly")}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Yıllık: {formatPrice(plan.yearlyPrice)}
                </div>
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
                onClick={() => handlePlanAction(plan)}
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
                    ? "Endpoint Bekleniyor"
                    : "Backend Bağlantısı Bekleniyor"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}