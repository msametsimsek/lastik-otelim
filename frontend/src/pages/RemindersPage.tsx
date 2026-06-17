import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  Car,
  Copy,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Snowflake,
  SunMedium,
  UserRound
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  AppSettings,
  Customer,
  TireRecord,
  Vehicle
} from "../types";

import { normalizeTurkish } from "../utils/helpers";

interface RemindersPageProps {
  customers: Customer[];
  vehicles: Vehicle[];
  records: TireRecord[];
  settings: AppSettings;
  showToast: (
    message: string,
    type?: "success" | "error" | "info" | "warning"
  ) => void;
}

type ReminderSeasonType = "winter" | "summer";
type ReminderFilter = "all" | "warning";

interface SeasonReminderRange {
  type: ReminderSeasonType;
  title: string;
  label: string;
  start: Date;
  end: Date;
}

interface ReminderItem {
  id: string;
  customer: Customer;
  vehicle?: Vehicle;
  record: TireRecord;
  message: string;
  daysUntilSeason: number;
  isWarning: boolean;
  seasonRange: SeasonReminderRange;
}

const WARNING_THRESHOLD_DAYS = 20;

function getCurrentSeasonReminderRange(
  today = new Date()
): SeasonReminderRange {
  const year = today.getFullYear();

  const summerStartThisYear = new Date(year, 3, 15);
  const winterStartThisYear = new Date(year, 10, 15);
  const winterEndNextYear = new Date(year + 1, 3, 15);
  const summerStartNextYear = new Date(year + 1, 3, 15);
  const winterStartNextYear = new Date(year + 1, 10, 15);

  if (today < summerStartThisYear) {
    return {
      type: "summer",
      title: "Yazlık lastik geçiş dönemi",
      label: "Yazlık Geçiş",
      start: summerStartThisYear,
      end: winterStartThisYear
    };
  }

  if (today < winterStartThisYear) {
    return {
      type: "winter",
      title: "Kışlık lastik geçiş dönemi",
      label: "Kışlık Geçiş",
      start: winterStartThisYear,
      end: winterEndNextYear
    };
  }

  return {
    type: "summer",
    title: "Yazlık lastik geçiş dönemi",
    label: "Yazlık Geçiş",
    start: summerStartNextYear,
    end: winterStartNextYear
  };
}

function getDayDifference(
  targetDate: Date,
  currentDate = new Date()
) {
  const target = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  );

  const current = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
  );

  return Math.ceil(
    (target.getTime() - current.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function formatDate(value: Date | string) {
  const date =
    typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function normalizePhoneForWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("90") && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `9${digits}`;
  }

  if (digits.length === 10) {
    return `90${digits}`;
  }

  return digits;
}

function buildReminderMessage(params: {
  customerName: string;
  plate: string;
  businessName: string;
  seasonRange: SeasonReminderRange;
}) {
  const seasonName =
    params.seasonRange.type === "winter"
      ? "kışlık"
      : "yazlık";

  return `Merhaba ${params.customerName},

${params.plate} plakalı aracınız için ${seasonName} lastik değişim zamanı yaklaşıyor.

Geçiş dönemi ${formatDate(params.seasonRange.start)} tarihinde başlayacaktır. Yoğunluk başlamadan randevunuzu oluşturmak için bizimle iletişime geçebilirsiniz.

${params.businessName}`;
}

function getExpectedTireType(
  seasonType: ReminderSeasonType
) {
  return seasonType === "winter" ? "Kışlık" : "Yazlık";
}

export default function RemindersPage({
  customers,
  vehicles,
  records,
  settings,
  showToast
}: RemindersPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<ReminderFilter>("all");

  const [selectedReminderId, setSelectedReminderId] =
    useState("");

  const seasonRange = useMemo(
    () => getCurrentSeasonReminderRange(),
    []
  );

  const reminders = useMemo<ReminderItem[]>(() => {
    const expectedTireType = getExpectedTireType(
      seasonRange.type
    );

    return records
      .filter(
        (record) =>
          record.status !== "delivered" &&
          record.tireType === expectedTireType
      )
      .map((record) => {
        const customer = customers.find(
          (item) => item.id === record.clientId
        );

        if (!customer || customer.isActive === false) {
          return null;
        }

        const vehicle = vehicles.find(
          (item) => item.id === record.vehicleId
        );

        const daysUntilSeason = getDayDifference(
          seasonRange.start
        );

        const plate =
          vehicle?.plate ||
          record.snapshot?.plate ||
          "Plaka belirtilmedi";

        const message = buildReminderMessage({
          customerName: customer.fullName,
          plate,
          businessName:
            settings.businessName || "LastikOtelim",
          seasonRange
        });

        return {
          id: `${record.id}-${seasonRange.type}`,
          customer,
          vehicle,
          record,
          message,
          daysUntilSeason,
          isWarning:
            daysUntilSeason <= WARNING_THRESHOLD_DAYS,
          seasonRange
        };
      })
      .filter(
        (item): item is ReminderItem => item !== null
      );
  }, [
    customers,
    vehicles,
    records,
    settings.businessName,
    seasonRange
  ]);

  const filteredReminders = useMemo(() => {
    const normalizedQuery = normalizeTurkish(
      searchQuery.trim()
    );

    return reminders.filter((item) => {
      if (activeFilter === "warning" && !item.isWarning) {
        return false;
      }

      if (!normalizedQuery) return true;

      const searchableText = [
        item.customer.fullName,
        item.customer.phone,
        item.vehicle?.plate,
        item.record.snapshot?.plate,
        item.record.tireCode,
        item.record.brand,
        item.record.size,
        item.record.storageLocation
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeTurkish(searchableText).includes(
        normalizedQuery
      );
    });
  }, [reminders, searchQuery, activeFilter]);

  useEffect(() => {
    const selectedReminderStillVisible =
      filteredReminders.some(
        (item) => item.id === selectedReminderId
      );

    if (!selectedReminderStillVisible) {
      setSelectedReminderId(
        filteredReminders[0]?.id || ""
      );
    }
  }, [filteredReminders, selectedReminderId]);

  const selectedReminder = reminders.find(
    (item) => item.id === selectedReminderId
  );

  const warningCount = reminders.filter(
    (item) => item.isWarning
  ).length;

  const openWhatsApp = (item: ReminderItem) => {
    const phone = normalizePhoneForWhatsApp(
      item.customer.phone
    );

    if (!phone || phone.length < 10) {
      showToast(
        "Müşteri telefon numarası WhatsApp için geçerli görünmüyor.",
        "error"
      );
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(
      item.message
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyMessage = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      showToast(
        "Hatırlatma mesajı panoya kopyalandı.",
        "success"
      );
    } catch {
      showToast(
        "Mesaj panoya kopyalanamadı.",
        "error"
      );
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 pb-12 text-slate-950 animate-slide-in lg:grid-cols-12">
      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm lg:col-span-4 lg:h-[calc(100dvh-10rem)]">
        <header className="shrink-0 border-b border-slate-100 bg-slate-50/60 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <BellRing className="h-4 w-4 text-blue-600" />
                Hatırlatmalar
              </h2>

              <p className="mt-1 text-[11px] font-medium text-slate-400">
                {reminders.length} müşteri kaydı
              </p>
            </div>

            <div className="text-right">
              <span className="block text-xl font-black text-amber-700">
                {warningCount}
              </span>

              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Yaklaşan
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                {seasonRange.type === "winter" ? (
                  <Snowflake className="h-5 w-5" />
                ) : (
                  <SunMedium className="h-5 w-5" />
                )}
              </div>

              <div>
                <p className="text-xs font-black text-blue-900">
                  {seasonRange.label}
                </p>

                <p className="mt-1 text-[10px] font-semibold leading-relaxed text-blue-700">
                  {formatDate(seasonRange.start)} başlangıç
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="shrink-0 space-y-3 border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Müşteri, telefon, plaka veya kod ara..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`rounded-lg px-3 py-2 text-[10px] font-black transition ${
                activeFilter === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tümü
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveFilter("warning")
              }
              className={`rounded-lg px-3 py-2 text-[10px] font-black transition ${
                activeFilter === "warning"
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Yaklaşanlar
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredReminders.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
              <CalendarClock className="h-7 w-7 text-slate-300" />

              <p className="text-xs font-bold text-slate-500">
                Hatırlatma bulunamadı
              </p>

              <p className="max-w-xs text-[10px] leading-relaxed text-slate-400">
                Aktif döneme uygun lastik kaydı bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReminders.map((item) => {
                const isSelected =
                  selectedReminderId === item.id;

                const remainingText =
                  item.daysUntilSeason < 0
                    ? `${Math.abs(
                        item.daysUntilSeason
                      )} gün geçti`
                    : item.daysUntilSeason === 0
                      ? "Bugün"
                      : `${item.daysUntilSeason} gün kaldı`;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setSelectedReminderId(item.id)
                    }
                    className={`relative flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition ${
                      isSelected
                        ? "bg-blue-50/80"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
                    )}

                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-black text-slate-900">
                        {item.customer.fullName}
                      </h3>

                      <p className="mt-1 font-mono text-[11px] font-black uppercase text-blue-700">
                        {item.vehicle?.plate ||
                          item.record.snapshot?.plate ||
                          "-"}
                      </p>

                      <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
                        {item.record.brand} •{" "}
                        {item.record.size}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-black ${
                        item.isWarning
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {remainingText}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="lg:col-span-8">
        {selectedReminder ? (
          <ReminderDetail
            item={selectedReminder}
            onOpenWhatsApp={() =>
              openWhatsApp(selectedReminder)
            }
            onCopyMessage={() =>
              copyMessage(selectedReminder.message)
            }
          />
        ) : (
          <div className="flex min-h-[620px] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
            <BellRing className="h-9 w-9 text-slate-300" />

            <h2 className="mt-3 text-sm font-black text-slate-700">
              Hatırlatma seçilmedi
            </h2>

            <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
              Detayları görüntülemek için soldaki listeden bir müşteri seçin.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ReminderDetail({
  item,
  onOpenWhatsApp,
  onCopyMessage
}: {
  item: ReminderItem;
  onOpenWhatsApp: () => void;
  onCopyMessage: () => void;
}) {
  const remainingText =
    item.daysUntilSeason < 0
      ? `${Math.abs(item.daysUntilSeason)} gün geçti`
      : item.daysUntilSeason === 0
        ? "Geçiş dönemi bugün başlıyor"
        : `${item.daysUntilSeason} gün kaldı`;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
              <UserRound className="h-7 w-7" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-950">
                {item.customer.fullName}
              </h2>

              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-blue-600">
                <Phone className="h-3.5 w-3.5" />
                {item.customer.phone}
              </p>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 text-center ${
              item.isWarning
                ? "border-amber-100 bg-amber-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Kalan Süre
            </p>

            <p
              className={`mt-1 text-lg font-black ${
                item.isWarning
                  ? "text-amber-800"
                  : "text-slate-800"
              }`}
            >
              {remainingText}
            </p>
          </div>
        </div>
      </section>

      {item.isWarning && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>
              <h3 className="text-sm font-black text-amber-900">
                Hatırlatma zamanı yaklaştı
              </h3>

              <p className="mt-1 text-xs font-semibold leading-relaxed text-amber-700">
                Geçiş dönemine 20 gün veya daha az kaldı.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailCard
          icon={<Car className="h-5 w-5" />}
          label="Araç Plakası"
          value={
            item.vehicle?.plate ||
            item.record.snapshot?.plate ||
            "-"
          }
          secondary={
            item.vehicle?.note ||
            item.record.vehicleNote ||
            "Araç notu bulunmuyor"
          }
          mono
        />

        <DetailCard
          icon={<MapPin className="h-5 w-5" />}
          label="Depo Konumu"
          value={
            item.record.storageLocation || "Girilmedi"
          }
          secondary={item.record.tireCode}
          mono
        />
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">
          Lastik Bilgileri
        </h3>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoItem
            label="Marka"
            value={item.record.brand}
          />

          <InfoItem
            label="Ebat"
            value={item.record.size}
          />

          <InfoItem
            label="Mevsim"
            value={item.record.tireType}
          />

          <InfoItem
            label="Adet"
            value={`${item.record.quantity} adet`}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CalendarClock className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-900">
              {item.seasonRange.title}
            </h3>

            <p className="mt-1 text-xs font-medium text-slate-500">
              {formatDate(item.seasonRange.start)} -{" "}
              {formatDate(item.seasonRange.end)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-black text-blue-800">
          <MessageCircle className="h-5 w-5" />
          WhatsApp Mesajı
        </div>

        <p className="mt-4 whitespace-pre-line rounded-2xl border border-blue-100 bg-white p-4 text-xs font-semibold leading-6 text-slate-700">
          {item.message}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCopyMessage}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" />
            Mesajı Kopyala
          </button>

          <button
            type="button"
            onClick={onOpenWhatsApp}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp'ta Aç
          </button>
        </div>
      </section>
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
  secondary,
  mono = false
}: {
  icon: ReactNode;
  label: string;
  value: string;
  secondary: string;
  mono?: boolean;
}) {
  return (
    <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        {icon}
      </div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-sm font-black text-slate-900 ${
          mono ? "font-mono uppercase tracking-wider" : ""
        }`}
      >
        {value}
      </p>

      <p className="mt-1 truncate text-[11px] font-medium text-slate-400">
        {secondary}
      </p>
    </article>
  );
}

function InfoItem({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}
