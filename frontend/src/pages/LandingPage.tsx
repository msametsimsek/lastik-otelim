import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Database,
  FileSpreadsheet,
  MapPin,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  Users2,
  Warehouse,
  Wrench
} from "lucide-react";

interface LandingPageProps {
  onNavigate: (view: "login" | "register") => void;
}

const LogoMark = () => (
  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] bg-white shadow-lg shadow-blue-950/10 ring-1 ring-slate-200">
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
      <defs>
        <linearGradient id="logoBlue" x1="8" x2="56" y1="10" y2="54">
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path
        d="M33 8c-12.15 0-22 9.85-22 22s9.85 22 22 22 22-9.85 22-22S45.15 8 33 8Zm0 34c-6.63 0-12-5.37-12-12s5.37-12 12-12 12 5.37 12 12-5.37 12-12 12Z"
        fill="url(#logoBlue)"
      />
      <path
        d="M29 15c-1.8 4-2.4 7.8-1.8 11.4.95 5.9 4.2 10.8 8.6 17.2M42.2 18.8c-6.7 3.9-10.8 8.8-13 15.2M20.4 22.4c8 1.2 14.8 4.6 21.6 10.8"
        fill="none"
        stroke="#eff6ff"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M7 20h9M5 30h10M8 40h8"
        stroke="#f59e0b"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  </div>
);

const PlateCard = () => (
  <div className="absolute -left-2 top-10 hidden rotate-[-5deg] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-blue-950/10 sm:block lg:-left-8">
    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
      Plaka Arama
    </div>
    <div className="mt-2 rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-2 text-center font-black tracking-widest text-slate-900">
      34 ABC 01
    </div>
  </div>
);

const HeroIllustration = () => {
  const rows = [
    ["34 ABC 01", "A-12", "Kışlık", "Hazır"],
    ["06 DEF 06", "B-04", "Yazlık", "Depoda"],
    ["19 TGG 19", "C-18", "4 Mevsim", "Kontrol"],
    ["35 XYZ 35", "D-07", "Kışlık", "Hazır"]
  ];

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-sky-100 via-blue-50 to-amber-50 blur-2xl" />
      <PlateCard />

      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-white to-sky-50 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-950">LastikOtelim Panel</p>
              <p className="text-[11px] font-bold text-slate-400">
                Bugünkü saklama operasyonu
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Aktif
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [Users2, "Müşteri", "1.248"],
              [Car, "Araç", "2.356"],
              [Database, "Lastik Seti", "4.892"],
              [Warehouse, "Raf", "128"]
            ].map(([Icon, label, value]) => {
              const StatIcon = Icon as typeof Users2;

              return (
                <div
                  key={label as string}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <StatIcon className="h-4 w-4 text-blue-600" />
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-400 ring-1 ring-slate-200">
                      +12%
                    </span>
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    {label as string}
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950">
                    {value as string}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950">Saklama Yoğunluğu</p>
                  <p className="text-[11px] font-bold text-slate-400">
                    Mevsimsel lastik dağılımı
                  </p>
                </div>
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>

              <div className="space-y-3">
                {[
                  ["Kışlık", "78%", "bg-blue-600"],
                  ["Yazlık", "54%", "bg-amber-500"],
                  ["4 Mevsim", "32%", "bg-slate-400"]
                ].map(([name, value, color]) => (
                  <div key={name as string}>
                    <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
                      <span>{name as string}</span>
                      <span>{value as string}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${color as string}`}
                        style={{ width: value as string }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-black text-slate-950">Raf Durumu</p>
                <Search className="h-4 w-4 text-blue-600" />
              </div>

              <div className="space-y-2">
                {rows.map(([plate, shelf, type, status]) => (
                  <div
                    key={plate}
                    className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100"
                  >
                    <div>
                      <p className="text-xs font-black text-slate-950">{plate}</p>
                      <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                        {type} • {status}
                      </p>
                    </div>
                    <div className="grid place-items-center rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-700">
                      {shelf}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [QrCode, "LastikCode"],
              [Printer, "Etiket"],
              [MapPin, "Raf Bul"],
              [FileSpreadsheet, "Rapor"]
            ].map(([Icon, label]) => {
              const ActionIcon = Icon as typeof QrCode;

              return (
                <div
                  key={label as string}
                  className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-3 text-xs font-black text-blue-700"
                >
                  <ActionIcon className="h-4 w-4 shrink-0" />
                  {label as string}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-6 -right-2 hidden rounded-3xl border border-amber-200 bg-white px-4 py-3 shadow-xl shadow-amber-900/10 sm:block">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-950">
              Yoğun sezonda hızlı teslim
            </p>
            <p className="text-[11px] font-bold text-slate-400">
              Plaka ile saniyeler içinde bul
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const features = [
    {
      icon: Users2,
      title: "Müşteri & Araç Takibi",
      desc: "Müşteri, araç ve plaka bilgilerini düzenli tutun; geçmiş saklama kayıtlarına hızlıca ulaşın."
    },
    {
      icon: Search,
      title: "Plaka ile Hızlı Bulma",
      desc: "Yoğun sezonda plaka aratın, lastik setinin hangi raf/kutuda olduğunu bekletmeden görün."
    },
    {
      icon: QrCode,
      title: "LastikCode Sistemi",
      desc: "Her lastik kaydı için özel kod oluşturun, karışıklığı ve yanlış teslim riskini azaltın."
    },
    {
      icon: Printer,
      title: "Etiket Yazdırma",
      desc: "Barkod/QR destekli etiket çıktısı alın, lastik setlerini fiziksel olarak da takip edilebilir yapın."
    },
    {
      icon: Warehouse,
      title: "Depo & Raf Yönetimi",
      desc: "A-12, B-04 gibi raf konumlarıyla lastiklerinizin nerede olduğunu net şekilde yönetin."
    },
    {
      icon: Smartphone,
      title: "Mobil Uyumlu Kullanım",
      desc: "Dükkan içinde telefon veya tabletten yeni kayıt oluşturun, fotoğraf ve detay ekleyin."
    }
  ];

  const workflow = [
    {
      icon: Users2,
      title: "Müşteriyi Kaydet",
      desc: "Ad, telefon ve plaka bilgisiyle hızlı müşteri kaydı oluşturun."
    },
    {
      icon: Database,
      title: "Lastik Setini Tanımla",
      desc: "Marka, ebat, adet, mevsim tipi ve fotoğraf detaylarını ekleyin."
    },
    {
      icon: MapPin,
      title: "Raf Konumu Ver",
      desc: "Lastiklerin kaldırıldığı depo ve raf bilgisini sisteme işleyin."
    },
    {
      icon: Printer,
      title: "Etiketi Yazdır",
      desc: "LastikCode etiketini çıkarıp set üzerine yapıştırın."
    }
  ];

  const targets = [
    {
      icon: Warehouse,
      name: "Oto Lastik Bayileri",
      desc: "Sezonluk lastik saklama hizmeti veren işletmeler."
    },
    {
      icon: Wrench,
      name: "Rot Balans Noktaları",
      desc: "Günlük giriş-çıkış trafiği yoğun servis noktaları."
    },
    {
      icon: Car,
      name: "Özel Oto Servisleri",
      desc: "Müşterisine düzenli lastik saklama hizmeti sunan servisler."
    },
    {
      icon: Database,
      name: "Depolu İşletmeler",
      desc: "Raf, konum ve geçmiş takibini dijitalleştirmek isteyenler."
    }
  ];

  const pricing = [
    {
      name: "Başlangıç Paket",
      price: "199 TL",
      period: "aylık",
      desc: "Küçük ve orta ölçekli tek şube lastik işletmeleri için sade başlangıç planı.",
      features: [
        "Müşteri ve araç kayıtları",
        "Lastik saklama kaydı oluşturma",
        "Plaka ile hızlı arama",
        "Depo ve raf konumu takibi",
        "Standart etiket yazdırma",
        "Temel rapor ekranları"
      ],
      button: "Başlangıç Yap",
      action: () => onNavigate("register"),
      popular: false
    },
    {
      name: "Profesyonel Paket",
      price: "299 TL",
      period: "aylık",
      desc: "Yoğun sezonda daha hızlı işlem yapmak isteyen profesyonel lastikçiler için.",
      features: [
        "Başlangıç paketindeki her şey",
        "Gelişmiş LastikCode yönetimi",
        "Fotoğraflı lastik kayıtları",
        "Silinen/eski kayıt geçmişi",
        "CSV/Excel dışa aktarma",
        "Öncelikli destek"
      ],
      button: "Hemen Başla",
      action: () => onNavigate("register"),
      popular: true
    },
    {
      name: "Kurumsal Paket",
      price: "599 TL",
      period: "aylık",
      desc: "Çoklu personel, yüksek kayıt hacmi ve şube yapısı olan işletmeler için.",
      features: [
        "Profesyonel paketteki her şey",
        "Çoklu kullanıcı ve rol yönetimi",
        "Şube/depo bazlı takip",
        "Gelişmiş raporlama ekranları",
        "Özel etiket şablonu",
        "Kurulum ve geçiş desteği"
      ],
      button: "Kurumsal Başvuru",
      action: () => onNavigate("register"),
      popular: false
    }
  ];

  const faqs = [
    {
      q: "LastikOtelim ne işe yarar?",
      a: "LastikOtelim; lastik işletmelerinin müşteri, araç, plaka, lastik saklama kaydı, depo konumu ve etiket yazdırma süreçlerini tek panelden yönetmesini sağlar."
    },
    {
      q: "Etiket yazıcılarla kullanılabilir mi?",
      a: "Evet. Sistem standart yazdırma akışıyla çalışacak şekilde tasarlanmıştır. Termal etiket yazıcı veya A4 yazıcı kullanımına göre şablon düzeni geliştirilebilir."
    },
    {
      q: "Verilerimi Excel olarak alabilir miyim?",
      a: "Paket kapsamına göre kayıtları CSV/Excel formatında dışa aktarma ve eski kayıtları takip etme özellikleri eklenebilir."
    }
  ];

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f7f9fc] text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur-xl shadow-sm shadow-slate-900/5 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark />
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-lg font-black tracking-tight text-slate-950">
                LastikOtelim
              </h1>
              <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                Lastik saklama yönetimi
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm font-bold text-slate-600 lg:flex">
            <a href="#features" className="transition-colors hover:text-blue-700">
              Özellikler
            </a>
            <a href="#workflow" className="transition-colors hover:text-blue-700">
              Nasıl Çalışır?
            </a>
            <a href="#pricing" className="transition-colors hover:text-blue-700">
              Fiyatlandırma
            </a>
            <a href="#faq" className="transition-colors hover:text-blue-700">
              SSS
            </a>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => onNavigate("login")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              Giriş Yap
            </button>
            <button
              onClick={() => onNavigate("register")}
              className="rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-xl active:scale-95"
            >
              Kayıt Ol
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-[76px]">
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-sky-50/60 to-[#f7f9fc] px-4 py-14 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
          <div className="absolute left-0 top-10 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-100/70 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="text-center lg:text-left">
              <div className="mx-auto mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700 shadow-sm lg:mx-0">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="truncate">Lastik saklama sürecini dijitalleştirin</span>
              </div>

              <h2 className="mx-auto max-w-4xl text-4xl font-black leading-[1.03] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:mx-0 lg:text-7xl">
                Plaka girin, rafı bulun, lastiği doğru teslim edin.
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-600 sm:text-lg lg:mx-0">
                LastikOtelim; müşteri, araç, lastik seti, depo/raf konumu ve etiket
                yazdırma işlemlerini sade bir panelde toplar. Yoğun sezonda karışıklığı
                azaltır, teslim sürecini hızlandırır.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:mx-auto sm:max-w-md sm:flex-row lg:mx-0 lg:max-w-none">
                <button
                  onClick={() => onNavigate("register")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-black text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95"
                >
                  Hemen Başla <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onNavigate("login")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-black text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:shadow-md active:scale-95"
                >
                  Giriş Yap
                </button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  [ShieldCheck, "Daha güvenli kayıt"],
                  [Clock3, "Hızlı teslim"],
                  [BadgeCheck, "Düzenli depo"]
                ].map(([Icon, label]) => {
                  const MiniIcon = Icon as typeof ShieldCheck;

                  return (
                    <div
                      key={label as string}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 shadow-sm lg:justify-start"
                    >
                      <MiniIcon className="h-4 w-4 text-blue-600" />
                      {label as string}
                    </div>
                  );
                })}
              </div>
            </div>

            <HeroIllustration />
          </div>
        </section>

        <section className="border-y border-slate-200/80 bg-white px-4 py-10 sm:px-6 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {targets.map((target) => {
              const TargetIcon = target.icon;

              return (
                <div
                  key={target.name}
                  className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
                >
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                    <TargetIcon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-black text-slate-950">{target.name}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    {target.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="features" className="bg-[#f7f9fc] px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                Özellikler
              </span>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Lastikçilerin günlük iş akışına göre tasarlandı.
              </h3>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-500 sm:text-base">
                Karmaşık ekranlar yerine, dükkan içinde gerçekten ihtiyaç duyulan işlemler
                öne çıkarıldı.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const FeatureIcon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="group rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5"
                  >
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-blue-600 ring-1 ring-slate-100 transition-all group-hover:bg-blue-600 group-hover:text-white">
                        <FeatureIcon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-blue-500" />
                    </div>
                    <h4 className="text-lg font-black text-slate-950">{feature.title}</h4>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                      {feature.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="bg-gradient-to-b from-[#f7f9fc] via-white to-blue-50/40 px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="lg:sticky lg:top-28">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">
                  İş Akışı
                </span>
                <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  Dükkan temposuna uygun basit kayıt akışı.
                </h3>
                <p className="mt-4 text-sm font-semibold leading-7 text-slate-500 sm:text-base">
                  Müşteri geldiğinde kayıt açın, lastik setini tanımlayın, raf konumunu
                  girin ve LastikCode etiketiyle fiziksel takibi tamamlayın.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {workflow.map((item, index) => {
                  const WorkflowIcon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="relative rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60"
                    >
                      <div className="mb-8 flex items-center justify-between">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                          <WorkflowIcon className="h-5 w-5" />
                        </div>
                        <span className="text-4xl font-black text-slate-100">
                          0{index + 1}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-slate-950">{item.title}</h4>
                      <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                Fiyatlandırma
              </span>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                İşletmenizin büyüklüğüne göre 3 net paket.
              </h3>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-500 sm:text-base">
                Küçük işletmelerden yoğun kayıt hacmine sahip profesyonel servislere
                kadar farklı ihtiyaçlara uygun paketler sunulur.
              </p>
            </div>

            <div className="grid items-stretch gap-6 lg:grid-cols-3">
              {pricing.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-[2rem] border bg-white p-6 shadow-sm transition-all sm:p-8 ${
                    plan.popular
                      ? "border-blue-300 shadow-2xl shadow-blue-950/10 ring-4 ring-blue-50"
                      : "border-slate-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-8 rounded-full bg-blue-600 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-blue-600/20">
                      En Çok Seçilen
                    </div>
                  )}

                  <div className="flex-1">
                    <h4 className="text-xl font-black text-slate-950">{plan.name}</h4>
                    <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
                      {plan.desc}
                    </p>

                    <div className="mt-6 flex items-end gap-2">
                      <span className="text-4xl font-black tracking-tight text-slate-950">
                        {plan.price}
                      </span>
                      <span className="pb-1 text-sm font-black text-slate-400">
                        / {plan.period}
                      </span>
                    </div>

                    <div className="my-6 h-px bg-slate-100" />

                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex gap-3 text-sm font-bold leading-6 text-slate-600"
                        >
                          <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={plan.action}
                    className={`mt-8 w-full rounded-2xl px-5 py-4 text-sm font-black transition-all active:scale-95 ${
                      plan.popular
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    {plan.button}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="bg-gradient-to-b from-white to-slate-50 px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 text-center">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                SSS
              </span>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Sıkça Sorulan Sorular
              </h3>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = activeFaq === index;

                return (
                  <div
                    key={faq.q}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-black text-slate-950 transition-colors hover:bg-slate-50 sm:text-base"
                      aria-expanded={isOpen}
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm font-semibold leading-7 text-slate-500">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-blue-600 px-4 py-14 text-white sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 text-center lg:flex-row lg:text-left">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">
                LastikOtelim
              </p>
              <h3 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Lastik saklama karmaşasını bugün sadeleştirin.
              </h3>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-blue-100">
                İşletmenizi daha düzenli, daha hızlı ve daha güvenilir bir takip
                sistemine taşıyın.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button
                onClick={() => onNavigate("register")}
                className="rounded-2xl bg-white px-7 py-4 text-sm font-black text-blue-700 shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-50 active:scale-95"
              >
                Kayıt Ol
              </button>
              <button
                onClick={() => onNavigate("login")}
                className="rounded-2xl border border-white/30 bg-white/10 px-7 py-4 text-sm font-black text-white backdrop-blur transition-all hover:bg-white/20 active:scale-95"
              >
                Giriş Yap
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <p className="text-sm font-black text-slate-950">LastikOtelim</p>
              <p className="mt-0.5 text-xs font-bold text-slate-400">
                Lastik saklama ve depo takip sistemi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-5 text-xs font-black text-slate-500">
            <a href="#features" className="transition-colors hover:text-blue-700">
              Özellikler
            </a>
            <a href="#workflow" className="transition-colors hover:text-blue-700">
              İş Akışı
            </a>
            <a href="#pricing" className="transition-colors hover:text-blue-700">
              Fiyatlandırma
            </a>
            <a href="#faq" className="transition-colors hover:text-blue-700">
              SSS
            </a>
          </div>

          <p className="text-xs font-bold text-slate-400">
            © 2026 LastikOtelim.{" "}
            <a
              href="https://megriva.com"
              className="text-slate-600 hover:text-blue-700"
            >
              Megriva
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}