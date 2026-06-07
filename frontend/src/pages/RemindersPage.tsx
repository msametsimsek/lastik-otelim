import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Snowflake,
  SunMedium,
  UserRound,
  XCircle
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppSettings, Customer, TireRecord, Vehicle } from "../types";

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

type ReminderStatus = "pending" | "sent" | "cancelled";
type ReminderUrgency = "safe" | "soon" | "overdue";
type ReminderSeasonType = "winter" | "summer";

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
  status: ReminderStatus;
  message: string;
  daysUntilSeason: number;
  urgency: ReminderUrgency;
  seasonType: ReminderSeasonType;
  seasonTitle: string;
  seasonLabel: string;
  seasonStartDate: Date;
  seasonEndDate: Date;
}

const WARNING_THRESHOLD_DAYS = 20;

function getCurrentSeasonReminderRange(today = new Date()): SeasonReminderRange {
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

  if (today >= summerStartThisYear && today < winterStartThisYear) {
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

function normalizePhoneForWhatsApp(phone: string) {
  const digitsOnly = phone.replace(/\D/g, "");

  if (!digitsOnly) return "";

  if (digitsOnly.startsWith("90") && digitsOnly.length === 12) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
    return `9${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `90${digitsOnly}`;
  }

  return digitsOnly;
}

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

function formatDate(dateValue: string | Date) {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function getDayDiff(targetDate: Date, fromDate = new Date()) {
  const cleanTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  );

  const cleanFrom = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate()
  );

  const diff = cleanTarget.getTime() - cleanFrom.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function buildReminderMessage(params: {
  customerName: string;
  plate: string;
  businessName: string;
  seasonStartDate: Date;
  seasonType: ReminderSeasonType;
}) {
  const seasonText =
    params.seasonType === "winter"
      ? "kışlık lastik değişim zamanı yaklaşıyor"
      : "yazlık lastik değişim zamanı yaklaşıyor";

  const dateText =
    params.seasonType === "winter"
      ? `Kışlık lastik geçiş dönemi ${formatDate(
          params.seasonStartDate
        )} tarihinde başlayacaktır.`
      : `Yazlık lastik geçiş dönemi ${formatDate(
          params.seasonStartDate
        )} tarihinde başlayacaktır.`;

  return `Merhaba ${params.customerName},

${params.plate} plakalı aracınız için ${seasonText}.

${dateText} Yoğunluk başlamadan randevunuzu oluşturmak için bizimle iletişime geçebilirsiniz.

${params.businessName}`;
}

export default function RemindersPage({
  customers,
  vehicles,
  records,
  settings,
  showToast
}: RemindersPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "warning" | ReminderStatus
  >("all");

  const seasonRange = useMemo(() => getCurrentSeasonReminderRange(), []);
  const daysUntilSeason = getDayDiff(seasonRange.start);

  const activeRecords = useMemo(
    () => records.filter((record) => record.status !== "delivered"),
    [records]
  );

  const reminders = useMemo<ReminderItem[]>(() => {
    return activeRecords
      .map((record) => {
        const customer = customers.find((item) => item.id === record.clientId);
        const vehicle = vehicles.find((item) => item.id === record.vehicleId);

        if (!customer || customer.isActive === false) return null;

        const reminderId = `${record.id}_${customer.id}_${seasonRange.type}_${seasonRange.start.getFullYear()}`;
        const plate = vehicle?.plate || record.snapshot?.plate || "Plaka belirtilmedi";
        const businessName = settings.businessName || "LastikOtelim";
        const remainingDays = getDayDiff(seasonRange.start);

        let urgency: ReminderUrgency = "safe";

        if (remainingDays < 0) {
          urgency = "overdue";
        } else if (remainingDays <= WARNING_THRESHOLD_DAYS) {
          urgency = "soon";
        }

        const message = buildReminderMessage({
          customerName: customer.fullName,
          plate,
          businessName,
          seasonStartDate: seasonRange.start,
          seasonType: seasonRange.type
        });

        return {
          id: reminderId,
          customer,
          vehicle,
          record,
          status: "pending",
          message,
          daysUntilSeason: remainingDays,
          urgency,
          seasonType: seasonRange.type,
          seasonTitle: seasonRange.title,
          seasonLabel: seasonRange.label,
          seasonStartDate: seasonRange.start,
          seasonEndDate: seasonRange.end
        };
      })
      .filter(Boolean) as ReminderItem[];
  }, [
    activeRecords,
    customers,
    vehicles,
    settings.businessName,
    seasonRange.type,
    seasonRange.title,
    seasonRange.label,
    seasonRange.start,
    seasonRange.end
  ]);

  const filteredReminders = reminders.filter((item) => {
    const query = normalizeSearchText(searchTerm);

    const matchesFilter =
      activeFilter === "all" ||
      item.status === activeFilter ||
      (activeFilter === "warning" &&
        item.status === "pending" &&
        item.urgency !== "safe");

    const searchableText = normalizeSearchText(
      [
        item.customer.fullName,
        item.customer.phone,
        item.vehicle?.plate || "",
        item.record.snapshot?.plate || "",
        item.record.tireCode,
        item.record.brand,
        item.record.size,
        item.record.storageLocation || ""
      ].join(" ")
    );

    const matchesSearch = !query || searchableText.includes(query);

    return matchesFilter && matchesSearch;
  });

  const totalCount = reminders.length;
  const warningCount = reminders.filter(
    (item) => item.status === "pending" && item.urgency !== "safe"
  ).length;
  const pendingCount = reminders.filter((item) => item.status === "pending").length;
  const completedCount = reminders.filter((item) => item.status === "sent").length;
  const cancelledCount = reminders.filter((item) => item.status === "cancelled").length;

  const updateReminderStatus = (status: ReminderStatus) => {
    const statusLabel =
      status === "sent"
        ? "hatırlatma yapıldı"
        : status === "cancelled"
          ? "hatırlatma iptal edildi"
          : "bekleyenlere alındı";

    showToast(
      `Bu işlem için backend reminder endpoint'i henüz bağlı değil. "${statusLabel}" durumu localStorage'a yazılmadı.`,
      "warning"
    );
  };

  const openWhatsApp = (item: ReminderItem) => {
    const phone = normalizePhoneForWhatsApp(item.customer.phone);

    if (!phone || phone.length < 10) {
      showToast("Müşteri telefon numarası WhatsApp için geçerli görünmüyor.", "error");
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(item.message)}`;

    window.open(url, "_blank", "noopener,noreferrer");

    showToast(
      "WhatsApp açıldı. Hatırlatma durumu backend endpoint'i gelene kadar kaydedilmez.",
      "info"
    );
  };

  const seasonStatusText =
    daysUntilSeason < 0
      ? `${seasonRange.label} dönemi başladı`
      : daysUntilSeason === 0
        ? `${seasonRange.label} dönemi bugün başlıyor`
        : `${seasonRange.label} dönemine ${daysUntilSeason} gün kaldı`;

  const seasonDescription =
    seasonRange.type === "winter"
      ? "Sistem şu anda kışlık lastik geçiş dönemini takip ediyor."
      : "Sistem şu anda yazlık lastik geçiş dönemini takip ediyor.";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-blue-100/80 blur-3xl" />
        <div className="absolute left-20 bottom-0 h-44 w-44 rounded-full bg-amber-100/90 blur-3xl" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <BellRing className="h-4 w-4" />
                Hatırlatma Yönetimi
              </div>

              <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                {seasonRange.title} için müşteri hatırlatmaları
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                Tüm aktif lastik kayıtları API’den gelen verilerle listelenir.
                Sistem güncel tarihe göre yazlık veya kışlık geçiş dönemini
                otomatik seçer. Hatırlatma durumu için backend endpoint’i gelene
                kadar hiçbir bilgi localStorage’a yazılmaz.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm xl:min-w-[360px]">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                  {seasonRange.type === "winter" ? (
                    <Snowflake className="h-6 w-6" />
                  ) : (
                    <SunMedium className="h-6 w-6" />
                  )}
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                    Aktif Hatırlatma Dönemi
                  </p>

                  <h2 className="mt-1 text-lg font-black text-slate-950">
                    {seasonStatusText}
                  </h2>

                  <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                    {formatDate(seasonRange.start)} - {formatDate(seasonRange.end)}
                  </p>

                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                    {seasonDescription}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {warningCount > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-black text-amber-900">
                      {warningCount} müşteri için hatırlatma zamanı geldi.
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                      {seasonRange.label} dönemine 20 günden az kaldığı için bu
                      müşterilere WhatsApp üzerinden dönüş yapılması önerilir.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveFilter("warning")}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white transition-all hover:bg-amber-700 active:scale-[0.98]"
                >
                  Uyarıları Göster
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500">Toplam Kayıt</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{totalCount}</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-bold text-amber-700">Uyarı</p>
          <p className="mt-1 text-2xl font-black text-amber-900">{warningCount}</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-bold text-blue-700">Bekleyen</p>
          <p className="mt-1 text-2xl font-black text-blue-900">{pendingCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-bold text-emerald-700">Tamamlanan</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">{completedCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-600">İptal</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{cancelledCount}</p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Müşteri, telefon, plaka veya LastikCode ara..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "Tümü" },
              { id: "warning", label: "Uyarıdakiler" },
              { id: "pending", label: "Bekleyen" },
              { id: "sent", label: "Tamamlanan" },
              { id: "cancelled", label: "İptal Edilen" }
            ].map((filter) => {
              const selected = activeFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() =>
                    setActiveFilter(filter.id as "all" | "warning" | ReminderStatus)
                  }
                  className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${
                    selected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/15"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filteredReminders.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <CalendarClock className="h-7 w-7" />
          </div>

          <h2 className="mt-4 text-lg font-black text-slate-900">
            Listelenecek hatırlatma bulunmuyor
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
            Aktif lastik kaydı olan müşteriler burada güncel geçiş dönemine kalan
            süreyle birlikte listelenecek.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredReminders.map((item) => {
            const isPending = item.status === "pending";
            const isSent = item.status === "sent";
            const isCancelled = item.status === "cancelled";
            const isWarning = item.status === "pending" && item.urgency !== "safe";

            const remainingText =
              item.daysUntilSeason < 0
                ? `${Math.abs(item.daysUntilSeason)} gün geçti`
                : item.daysUntilSeason === 0
                  ? "Bugün başladı"
                  : `${item.daysUntilSeason} gün kaldı`;

            return (
              <div
                key={item.id}
                className={`rounded-[2rem] border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  isWarning ? "border-amber-200 ring-4 ring-amber-50" : "border-slate-200"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${
                          isPending
                            ? isWarning
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                              : "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                            : isSent
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                        }`}
                      >
                        {isPending && <Clock3 className="h-3.5 w-3.5" />}
                        {isSent && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {isCancelled && <XCircle className="h-3.5 w-3.5" />}
                        {isPending
                          ? "Bekliyor"
                          : isSent
                            ? "Hatırlatma Yapıldı"
                            : "İptal Edildi"}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${
                          isWarning
                            ? "bg-amber-50 text-amber-700 ring-amber-100"
                            : "bg-slate-50 text-slate-600 ring-slate-200"
                        }`}
                      >
                        {remainingText}
                      </span>
                    </div>

                    <h3 className="mt-3 truncate text-lg font-black text-slate-950">
                      {item.customer.fullName}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2">
                        <Phone className="h-3.5 w-3.5" />
                        {item.customer.phone}
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2">
                        <UserRound className="h-3.5 w-3.5" />
                        {item.vehicle?.plate ||
                          item.record.snapshot?.plate ||
                          "Plaka yok"}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-3 text-right ${
                      isWarning ? "bg-amber-50" : "bg-slate-50"
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Dönem Başlangıcı
                    </p>

                    <p className="mt-1 text-xs font-black text-slate-800">
                      {formatDate(item.seasonStartDate)}
                    </p>

                    <p className="mt-1 text-[10px] font-black text-slate-400">
                      {item.seasonLabel}
                    </p>
                  </div>
                </div>

                {isWarning && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                      <div>
                        <p className="text-sm font-black text-amber-900">
                          Bu müşteriye hatırlatma yapılabilir.
                        </p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                          {item.seasonLabel} dönemine 20 günden az kaldı. WhatsApp
                          üzerinden randevu hatırlatması yapmanız önerilir.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs font-bold text-slate-600 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">
                      Lastik Türü
                    </p>

                    <p className="mt-1 text-slate-800">{item.record.tireType}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">
                      LastikCode
                    </p>

                    <p className="mt-1 text-slate-800">{item.record.tireCode}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">
                      Kayıt Tarihi
                    </p>

                    <p className="mt-1 text-slate-800">
                      {formatDate(item.record.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">
                      Depo Konumu
                    </p>

                    <p className="mt-1 text-slate-800">
                      {item.record.storageLocation || "Belirtilmedi"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-black text-blue-700">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp&apos;ta Açılacak Mesaj
                  </div>

                  <p className="whitespace-pre-line text-xs font-semibold leading-5 text-slate-700">
                    {item.message}
                  </p>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => openWhatsApp(item)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-emerald-600/15 transition-all hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp&apos;ta Aç
                  </button>

                  <button
                    type="button"
                    onClick={() => updateReminderStatus("sent")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-black text-emerald-700 transition-all hover:bg-emerald-50 active:scale-[0.98]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Hatırlatma Yapıldı
                  </button>

                  {item.status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={() => updateReminderStatus("cancelled")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98]"
                    >
                      <XCircle className="h-4 w-4" />
                      İptal Et
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateReminderStatus("pending")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700 transition-all hover:bg-blue-50 active:scale-[0.98]"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Bekleyene Al
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}