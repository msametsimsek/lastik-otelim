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
  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
}

type BillingCycle = SubscriptionBillingCycle;

interface Plan {
  id: SubscriptionPlanId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  limits: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Başlangıç",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    description: "Küçük lastikçiler için temel takip paketi.",
    features: [
      "Etiket yazdırma",
      "Temel dashboard",
      "Müşteri ve plaka takibi",
      "Depo raf sorgulama"
    ],
    limits: [
      "100 müşteri",
      "300 lastik kaydı",
      "1 kullanıcı"
    ]
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 499,
    yearlyPrice: 4990,
    description: "Yoğun çalışan işletmeler için ideal paket.",
    features: [
      "Gelişmiş depo takibi",
      "Etiket geçmişi",
      "Sınırsız müşteri",
      "Raporlama altyapısı"
    ],
    limits: [
      "1000 lastik kaydı",
      "3 kullanıcı",
      "Öncelikli özellikler"
    ],
    popular: true
  },
  {
    id: "enterprise",
    name: "Kurumsal",
    monthlyPrice: 899,
    yearlyPrice: 8990,
    description:
      "Birden fazla kullanıcı ve geniş operasyonlar için.",
    features: [
      "Sınırsız kayıt",
      "Çoklu kullanıcı",
      "Gelişmiş raporlar",
      "Öncelikli destek"
    ],
    limits: [
      "Sınırsız müşteri",
      "Sınırsız lastik kaydı",
      "10 kullanıcı"
    ]
  }
];

function formatPrice(value: number) {
  return `₺${value.toLocaleString("tr-TR")}`;
}

function formatDateTR(date?: string) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function getBillingCycleLabel(cycle?: BillingCycle) {
  return cycle === "yearly" ? "Yıllık" : "Aylık";
}

function getBillingCycleDescription(cycle?: BillingCycle) {
  return cycle === "yearly"
    ? "12 aylık abonelik"
    : "1 aylık abonelik";
}

function getPlanPrice(plan: Plan, cycle: BillingCycle) {
  return cycle === "yearly"
    ? plan.yearlyPrice
    : plan.monthlyPrice;
}

export default function SubscriptionPage({
  subscription,
  onSubscriptionChange,
  showToast
}: SubscriptionPageProps) {
  const billingCycle: BillingCycle =
    subscription.billingCycle || "monthly";

  const currentPlan = useMemo(
    () =>
      PLANS.find(
        (plan) => plan.id === subscription.planId
      ),
    [subscription.planId]
  );

  const activePlanPrice = currentPlan
    ? getPlanPrice(currentPlan, billingCycle)
    : subscription.amount || 0;

  const activeEndDate =
    subscription.periodEndAt ||
    subscription.renewalDate;

  const handlePlanAction = (plan: Plan) => {
    showToast(
      `${plan.name} planı için abonelik ve ödeme endpoint'i henüz backend'e bağlı değil. Sahte ödeme veya local abonelik oluşturulmadı.`,
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
      "Abonelik bilgileri API üzerinden yeniden yükleniyor.",
      "info"
    );
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
      <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-4 animate-slide-in sm:space-y-8 sm:pb-6">
        {/* Sayfa başlığı */}
        <header className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm sm:rounded-3xl sm:p-7">
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700">
              <CreditCard className="h-3.5 w-3.5" />
              Abonelik Yönetimi
            </div>

            <h1 className="mt-4 text-xl font-black tracking-tight text-slate-950 sm:text-3xl">
              LastikOtelim Abonelik Planı
            </h1>

            <p className="mt-2 max-w-2xl text-xs font-medium leading-6 text-slate-500 sm:text-sm">
              Abonelik ve ödeme servisleri backend tarafında
              hazır olduğunda bu ekran gerçek abonelik durumuyla
              çalışacaktır. Şu anda sahte ödeme veya local
              abonelik işlemi yapılmaz.
            </p>

            <button
              type="button"
              onClick={handleRefreshSubscription}
              className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              API Verilerini Yenile
            </button>
          </div>
        </header>

        {/* Aktif veya pasif abonelik özeti */}
        {subscription.isActive ? (
          <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm sm:rounded-[2rem] sm:p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 sm:text-xs">
                    Abonelik Aktif
                  </p>

                  <h2 className="mt-1 truncate text-lg font-black text-slate-950 sm:text-xl">
                    {currentPlan?.name ||
                      subscription.planName ||
                      "Aktif"}{" "}
                    Plan
                  </h2>

                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
                    Bitiş veya yenileme tarihi:{" "}
                    {formatDateTR(activeEndDate)}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SubscriptionSummaryCard
                    label="Ödeme Periyodu"
                    value={getBillingCycleLabel(
                      billingCycle
                    )}
                    description={getBillingCycleDescription(
                      billingCycle
                    )}
                  />

                  <SubscriptionSummaryCard
                    label="Paket Tutarı"
                    value={
                      activePlanPrice
                        ? formatPrice(activePlanPrice)
                        : "-"
                    }
                    description="Aktif"
                    descriptionClass="text-emerald-600"
                  />

                  <SubscriptionSummaryCard
                    label="Bitiş / Yenileme"
                    value={formatDateTR(activeEndDate)}
                    description={`Başlangıç: ${formatDateTR(
                      subscription.startedAt
                    )}`}
                    compactValue
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-5 text-xs font-black text-rose-600 shadow-sm transition hover:bg-rose-50 active:scale-[0.98] xl:self-end"
                >
                  Pasife Al
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-5 text-white shadow-xl shadow-blue-600/15 sm:rounded-[2rem] sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/20">
                  <Crown className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100 sm:text-xs">
                    Abonelik Endpoint'i Bekleniyor
                  </p>

                  <h2 className="mt-1 text-lg font-black leading-snug sm:text-xl">
                    LastikOtelim abonelik sistemi backend'e
                    bağlanacak
                  </h2>

                  <p className="mt-2 max-w-2xl text-xs font-semibold leading-6 text-blue-100 sm:text-sm">
                    Müşteri, emanet, depo, barkod ve raporlama
                    özellikleri için planlar hazırdır. Ödeme ve
                    abonelik durumu backend endpoint'i geldiğinde
                    aktif edilecektir.
                  </p>
                </div>
              </div>

              <div className="shrink-0 rounded-2xl bg-white/10 px-5 py-3 text-center text-xs font-black ring-1 ring-inset ring-white/20 sm:text-sm">
                Sahte abonelik oluşturulmaz
              </div>
            </div>
          </section>
        )}

        {/* Plan kartları */}
        <section>
          <div className="mb-4 sm:mb-5">
            <h2 className="text-base font-black text-slate-950 sm:text-lg">
              Abonelik Planları
            </h2>

            <p className="mt-1 text-xs font-medium text-slate-500">
              İşletmenizin kayıt ve kullanıcı ihtiyacına uygun
              paketi inceleyin.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
            {PLANS.map((plan) => {
              const isCurrentPlan =
                subscription.isActive &&
                subscription.planId === plan.id;

              return (
                <article
                  key={plan.id}
                  className={`relative flex min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-sm transition duration-300 sm:rounded-[2rem] sm:p-6 lg:hover:-translate-y-1 lg:hover:shadow-xl ${
                    plan.popular
                      ? "border-blue-200 ring-4 ring-blue-50"
                      : "border-slate-200/80"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700 sm:right-5 sm:top-5 sm:px-3 sm:text-[10px]">
                      <Sparkles className="h-3 w-3" />
                      Önerilen
                    </div>
                  )}

                  <div className="pr-20">
                    <h3 className="text-lg font-black text-slate-950">
                      {plan.name}
                    </h3>

                    <p className="mt-2 text-xs font-medium leading-5 text-slate-500 sm:min-h-10 sm:text-sm sm:leading-relaxed">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mt-5 border-y border-slate-100 py-5 sm:mt-6">
                    <div className="flex flex-wrap items-end gap-1">
                      <span className="text-3xl font-black tracking-tight text-slate-950">
                        {formatPrice(plan.monthlyPrice)}
                      </span>

                      <span className="pb-1 text-xs font-bold text-slate-400 sm:text-sm">
                        / aylık
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-400">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      Yıllık: {formatPrice(plan.yearlyPrice)}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2 text-xs font-bold leading-5 text-slate-600 sm:text-sm"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">
                      Paket Limitleri
                    </p>

                    <div className="space-y-2">
                      {plan.limits.map((limit) => (
                        <div
                          key={limit}
                          className="flex items-start gap-2 text-xs font-bold leading-5 text-slate-600"
                        >
                          <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <span>{limit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isCurrentPlan}
                    onClick={() => handlePlanAction(plan)}
                    className={`mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-xs font-black transition active:scale-[0.98] disabled:cursor-not-allowed sm:mt-7 sm:text-sm ${
                      isCurrentPlan
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : plan.popular
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {isCurrentPlan
                      ? "Mevcut Plan"
                      : subscription.isActive
                        ? "Endpoint Bekleniyor"
                        : "Backend Bağlantısı Bekleniyor"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function SubscriptionSummaryCard({
  label,
  value,
  description,
  descriptionClass = "text-slate-400",
  compactValue = false
}: {
  label: string;
  value: string;
  description: string;
  descriptionClass?: string;
  compactValue?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-emerald-100 bg-white px-4 py-4 text-left shadow-sm sm:px-5">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">
        {label}
      </p>

      <p
        className={`mt-1 truncate font-black text-slate-950 ${
          compactValue
            ? "text-sm"
            : "text-lg"
        }`}
        title={value}
      >
        {value}
      </p>

      <p
        className={`mt-0.5 truncate text-[11px] font-bold ${descriptionClass}`}
        title={description}
      >
        {description}
      </p>
    </div>
  );
}