import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CalendarClock,
  Car,
  Copy,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Snowflake,
  SunMedium,
  UserRound
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import type {
  AppSettings,
  Customer,
  TireRecord,
  Vehicle
} from "../types";

import {
  clientApi,
  tireApi,
  vehicleApi,
  type ClientListItemDto,
  type TireListItemDto,
  type VehicleListItemDto
} from "../services/tireApi";

import { normalizeTurkish } from "../utils/helpers";

interface RemindersPageProps {
  /**
   * Eski App.tsx prop'ları geçici uyumluluk için optional bırakıldı.
   * Bu sayfa artık customers / vehicles / records prop'larını kullanmıyor.
   */
  customers?: Customer[];
  vehicles?: Vehicle[];
  records?: TireRecord[];

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

interface ReminderCustomer {
  id: string;
  fullName: string;
  phone: string;
}

interface ReminderVehicle {
  id: string;
  clientId: string;
  plate: string;
  note: string;
}

interface ReminderItem {
  id: string;
  customer: ReminderCustomer;
  vehicle: ReminderVehicle;
  tire: TireListItemDto;
  message: string;
  daysUntilSeason: number;
  isWarning: boolean;
  seasonRange: SeasonReminderRange;
}

const WARNING_THRESHOLD_DAYS = 20;
const REMINDER_PAGE_SIZE = 1000;

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

function getDayDifference(targetDate: Date, currentDate = new Date()) {
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
    (target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

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

function normalizeTireType(value?: string | null) {
  const normalizedValue = normalizeTurkish(value || "");

  if (normalizedValue.includes("kis")) return "Kışlık";

  if (normalizedValue.includes("4") || normalizedValue.includes("mevsim")) {
    return "4 Mevsim";
  }

  return "Yazlık";
}

function buildReminderMessage(params: {
  customerName: string;
  plate: string;
  businessName: string;
  seasonRange: SeasonReminderRange;
}) {
  const seasonName =
    params.seasonRange.type === "winter" ? "kışlık" : "yazlık";

  return `Merhaba ${params.customerName},

${params.plate} plakalı aracınız için ${seasonName} lastik değişim zamanı yaklaşıyor.

Geçiş dönemi ${formatDate(params.seasonRange.start)} tarihinde başlayacaktır. Yoğunluk başlamadan randevunuzu oluşturmak için bizimle iletişime geçebilirsiniz.

${params.businessName}`;
}

function getExpectedTireType(seasonType: ReminderSeasonType) {
  return seasonType === "winter" ? "Kışlık" : "Yazlık";
}

function getRemainingText(daysUntilSeason: number) {
  if (daysUntilSeason < 0) {
    return `${Math.abs(daysUntilSeason)} gün geçti`;
  }

  if (daysUntilSeason === 0) {
    return "Bugün";
  }

  return `${daysUntilSeason} gün kaldı`;
}

function mapClientToReminderCustomer(
  client: ClientListItemDto | null,
  fallbackName: string,
  fallbackClientId = ""
): ReminderCustomer {
  return {
    id: client ? String(client.id) : fallbackClientId,
    fullName: client?.name || fallbackName || "Bilinmeyen Müşteri",
    phone: client?.phone || ""
  };
}

function mapVehicleToReminderVehicle(
  vehicle: VehicleListItemDto | null,
  tire: TireListItemDto
): ReminderVehicle {
  return {
    id: vehicle ? String(vehicle.id) : String(tire.vehicleId || ""),
    clientId: vehicle ? String(vehicle.clientId || "") : "",
    plate: vehicle?.licensePlate || tire.vehicleLicensePlate || "-",
    note: vehicle?.note || ""
  };
}

async function buildReminderItem(params: {
  tire: TireListItemDto;
  seasonRange: SeasonReminderRange;
  businessName: string;
}): Promise<ReminderItem> {
  const { tire, seasonRange, businessName } = params;

  let vehicleDetail: VehicleListItemDto | null = null;
  let clientDetail: ClientListItemDto | null = null;

  try {
    if (tire.vehicleId) {
      vehicleDetail = await vehicleApi.getVehicleById(tire.vehicleId);
    }
  } catch (error) {
    console.warn("Hatırlatma araç detayı alınamadı:", error);
  }

  try {
    if (vehicleDetail?.clientId) {
      clientDetail = await clientApi.getClientById(vehicleDetail.clientId);
    }
  } catch (error) {
    console.warn("Hatırlatma müşteri detayı alınamadı:", error);
  }

  const customer = mapClientToReminderCustomer(
    clientDetail,
    tire.clientName || "Bilinmeyen Müşteri",
    vehicleDetail?.clientId ? String(vehicleDetail.clientId) : ""
  );

  const vehicle = mapVehicleToReminderVehicle(vehicleDetail, tire);

  const daysUntilSeason = getDayDifference(seasonRange.start);

  const message = buildReminderMessage({
    customerName: customer.fullName,
    plate: vehicle.plate,
    businessName,
    seasonRange
  });

  return {
    id: `${tire.id}-${seasonRange.type}`,
    customer,
    vehicle,
    tire,
    message,
    daysUntilSeason,
    isWarning: daysUntilSeason <= WARNING_THRESHOLD_DAYS,
    seasonRange
  };
}

export default function RemindersPage({
  settings,
  showToast
}: RemindersPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ReminderFilter>("all");

  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [selectedReminderId, setSelectedReminderId] = useState("");

  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const [isLoadingReminders, setIsLoadingReminders] = useState(true);
  const [reminderErrorMessage, setReminderErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const seasonRange = useMemo(() => getCurrentSeasonReminderRange(), []);

  const loadReminders = useCallback(async () => {
    try {
      setIsLoadingReminders(true);
      setReminderErrorMessage("");

      const expectedTireType = getExpectedTireType(seasonRange.type);

      const response = await tireApi.getTires({
        page: 0,
        pageSize: REMINDER_PAGE_SIZE
      });

      const tires = response.items || [];

      const matchingTires = tires.filter(
        (tire) => normalizeTireType(tire.brandConstantName) === expectedTireType
      );

      const builtReminders = await Promise.all(
        matchingTires.map((tire) =>
          buildReminderItem({
            tire,
            seasonRange,
            businessName: settings.businessName || "LastikOtelim"
          })
        )
      );

      setReminders(builtReminders);
    } catch (error) {
      console.error("Hatırlatmalar yüklenemedi:", error);

      setReminders([]);

      setReminderErrorMessage(
        error instanceof Error
          ? error.message
          : "Hatırlatmalar yüklenirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setIsLoadingReminders(false);
    }
  }, [seasonRange, settings.businessName]);

  useEffect(() => {
    void loadReminders();
  }, [loadReminders, reloadKey]);

  const filteredReminders = useMemo(() => {
    const normalizedQuery = normalizeTurkish(searchQuery.trim());

    return reminders.filter((item) => {
      if (activeFilter === "warning" && !item.isWarning) {
        return false;
      }

      if (!normalizedQuery) return true;

      const searchableText = [
        item.customer.fullName,
        item.customer.phone,
        item.vehicle.plate,
        item.tire.code,
        item.tire.modelConstantName,
        item.tire.sizes,
        item.tire.storageLocation
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeTurkish(searchableText).includes(normalizedQuery);
    });
  }, [reminders, searchQuery, activeFilter]);

  useEffect(() => {
    const selectedReminderStillVisible = filteredReminders.some(
      (item) => item.id === selectedReminderId
    );

    if (selectedReminderStillVisible) {
      return;
    }

    const nextReminderId = filteredReminders[0]?.id || "";

    setSelectedReminderId(nextReminderId);

    if (!nextReminderId) {
      setIsMobileDetailOpen(false);
    }
  }, [filteredReminders, selectedReminderId]);

  const selectedReminder = reminders.find(
    (item) => item.id === selectedReminderId
  );

  const warningCount = reminders.filter((item) => item.isWarning).length;

  const handleSelectReminder = (reminderId: string) => {
    setSelectedReminderId(reminderId);
    setIsMobileDetailOpen(true);
  };

  const handleFilterChange = (filter: ReminderFilter) => {
    setActiveFilter(filter);
    setIsMobileDetailOpen(false);
  };

  const openWhatsApp = (item: ReminderItem) => {
    const phone = normalizePhoneForWhatsApp(item.customer.phone);

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

      showToast("Hatırlatma mesajı panoya kopyalandı.", "success");
    } catch {
      showToast("Mesaj panoya kopyalanamadı.", "error");
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden text-slate-950 animate-slide-in lg:grid-cols-12 lg:gap-6">
      <section
        className={`h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-4 lg:flex lg:rounded-3xl ${
          isMobileDetailOpen ? "hidden" : "flex"
        }`}
      >
        <header className="shrink-0 border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <BellRing className="h-4 w-4 shrink-0 text-blue-600" />
                Hatırlatmalar
              </h2>

              <p className="mt-1 text-[11px] font-medium text-slate-400">
                {reminders.length} müşteri kaydı
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <span className="block text-xl font-black text-amber-700">
                  {warningCount}
                </span>

                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Yaklaşan
                </span>
              </div>

              <button
                type="button"
                onClick={() => setReloadKey((currentKey) => currentKey + 1)}
                disabled={isLoadingReminders}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                title="Hatırlatmaları yenile"
                aria-label="Hatırlatmaları yenile"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    isLoadingReminders ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                {seasonRange.type === "winter" ? (
                  <Snowflake className="h-5 w-5" />
                ) : (
                  <SunMedium className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-black text-blue-900">
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
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Müşteri, telefon, plaka veya kod ara..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
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
              onClick={() => handleFilterChange("warning")}
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {isLoadingReminders ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="text-xs font-bold text-slate-500">
                Hatırlatmalar yükleniyor
              </p>
            </div>
          ) : reminderErrorMessage ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
              <BellRing className="h-8 w-8 text-rose-300" />

              <p className="text-xs font-black text-rose-700">
                Hatırlatmalar yüklenemedi
              </p>

              <p className="text-[11px] font-medium leading-relaxed text-rose-500">
                {reminderErrorMessage}
              </p>

              <button
                type="button"
                onClick={() => setReloadKey((currentKey) => currentKey + 1)}
                className="mt-1 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
              >
                Tekrar Dene
              </button>
            </div>
          ) : filteredReminders.length === 0 ? (
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
                const isSelected = selectedReminderId === item.id;
                const remainingText = getRemainingText(item.daysUntilSeason);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectReminder(item.id)}
                    className={`relative flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition sm:px-5 ${
                      isSelected ? "bg-blue-50/80" : "hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xs font-black text-slate-900">
                        {item.customer.fullName}
                      </h3>

                      <p className="mt-1 truncate font-mono text-[11px] font-black uppercase text-blue-700">
                        {item.vehicle.plate || "-"}
                      </p>

                      <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
                        {item.tire.modelConstantName || "-"} •{" "}
                        {item.tire.sizes || "-"}
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

      <section
        className={`h-full min-h-0 flex-col overflow-hidden lg:col-span-8 lg:flex ${
          isMobileDetailOpen ? "flex" : "hidden"
        }`}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileDetailOpen(false)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            Hatırlatmalara Dön
          </button>

          <span className="max-w-[130px] truncate pr-2 text-[10px] font-bold text-blue-700">
            {selectedReminder?.customer.fullName || "Hatırlatma detayı"}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 pr-0.5 [-webkit-overflow-scrolling:touch]">
          {selectedReminder ? (
            <ReminderDetail
              item={selectedReminder}
              onOpenWhatsApp={() => openWhatsApp(selectedReminder)}
              onCopyMessage={() => copyMessage(selectedReminder.message)}
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-12">
              <BellRing className="h-9 w-9 text-slate-300" />

              <h2 className="mt-3 text-sm font-black text-slate-700">
                Hatırlatma seçilmedi
              </h2>

              <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
                Detayları görüntülemek için hatırlatma listesinden bir müşteri
                seçin.
              </p>
            </div>
          )}
        </div>
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
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md sm:h-14 sm:w-14">
              <UserRound className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-slate-950 sm:text-lg">
                {item.customer.fullName}
              </h2>

              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-blue-600">
                <Phone className="h-3.5 w-3.5 shrink-0" />

                <span className="truncate">
                  {item.customer.phone || "Telefon belirtilmedi"}
                </span>
              </p>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-3 text-center sm:min-w-40 sm:p-4 ${
              item.isWarning
                ? "border-amber-100 bg-amber-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Kalan Süre
            </p>

            <p
              className={`mt-1 text-base font-black sm:text-lg ${
                item.isWarning ? "text-amber-800" : "text-slate-800"
              }`}
            >
              {remainingText}
            </p>
          </div>
        </div>
      </section>

      {item.isWarning && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:rounded-3xl sm:p-5">
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

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <DetailCard
          icon={<Car className="h-5 w-5" />}
          label="Araç Plakası"
          value={item.vehicle.plate || "-"}
          secondary={item.vehicle.note || "Araç notu bulunmuyor"}
          mono
        />

        <DetailCard
          icon={<MapPin className="h-5 w-5" />}
          label="Depo Konumu"
          value={item.tire.storageLocation || "Girilmedi"}
          secondary={item.tire.code || "-"}
          mono
        />
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <h3 className="text-sm font-black text-slate-900">Lastik Bilgileri</h3>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:grid-cols-4">
          <InfoItem label="Marka" value={item.tire.modelConstantName || "-"} />

          <InfoItem label="Ebat" value={item.tire.sizes || "-"} />

          <InfoItem
            label="Mevsim"
            value={item.tire.brandConstantName || "-"}
          />

          <InfoItem label="Adet" value={`${item.tire.count || 0} adet`} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CalendarClock className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900">
              {item.seasonRange.title}
            </h3>

            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
              {formatDate(item.seasonRange.start)} -{" "}
              {formatDate(item.seasonRange.end)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex items-center gap-2 text-sm font-black text-blue-800">
          <MessageCircle className="h-5 w-5 shrink-0" />
          WhatsApp Mesajı
        </div>

        <p className="mt-4 whitespace-pre-line break-words rounded-2xl border border-blue-100 bg-white p-4 text-xs font-semibold leading-6 text-slate-700">
          {item.message}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCopyMessage}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] sm:w-auto sm:rounded-2xl"
          >
            <Copy className="h-4 w-4" />
            Mesajı Kopyala
          </button>

          <button
            type="button"
            onClick={onOpenWhatsApp}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98] sm:w-auto sm:rounded-2xl"
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
    <article className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
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
        title={value}
      >
        {value}
      </p>

      <p
        className="mt-1 truncate text-[11px] font-medium text-slate-400"
        title={secondary}
      >
        {secondary}
      </p>
    </article>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className="mt-1 truncate text-xs font-black text-slate-900 sm:text-sm"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}