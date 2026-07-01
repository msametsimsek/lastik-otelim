import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Crown,
  Landmark,
  MapPin,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles
} from "lucide-react";

import {
  UserSubscription,
  SubscriptionBillingCycle
} from "../types";

import {
  SubscriptionApi,
  SubscriptionPlanDto
} from "../services/subscriptionApi";

import {
  AddressApi,
  AddressDto
} from "../services/addressApi";

import {
  BankAccountApi,
  BankAccountDto
} from "../services/bankAccountApi";

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
  id: string;
  apiId?: number;
  name: string;
  price: number;
  vatExcludedPrice?: number;
  vatPercent?: string | null;
  vatPrice?: number;
  durationDays?: number;
  durationLabel: string;
  description: string;
  features: string[];
  limits: string[];
  popular?: boolean;
  isFromApi?: boolean;
}

interface AddressFormState {
  title: string;
  contactName: string;
  addressLine: string;
  city: string;
  country: string;
  zipCode: string;
}

interface CardPaymentFormState {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
  registerCard: boolean;
}

interface BankTransferReceipt {
  transactionId?: string;
  referenceCode: string;
  subscriptionPlan: string;
  amount: number;
}

type SubscriptionFlowStep =
  | "plans"
  | "details"
  | "payment"
  | "bankTransferReceipt";

const FALLBACK_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Başlangıç",
    price: 299,
    durationLabel: "aylık",
    description: "Küçük işletmeler için temel takip paketi.",
    features: [
      "Etiket yazdırma",
      "Genel durum ekranı",
      "Müşteri ve plaka takibi",
      "Depo raf sorgulama"
    ],
    limits: ["100 müşteri", "300 lastik kaydı", "1 kullanıcı"]
  },
  {
    id: "pro",
    name: "Pro",
    price: 499,
    durationLabel: "aylık",
    description: "Yoğun çalışan işletmeler için ideal paket.",
    features: [
      "Gelişmiş depo takibi",
      "Etiket geçmişi",
      "Sınırsız müşteri",
      "Raporlama"
    ],
    limits: ["1000 lastik kaydı", "3 kullanıcı", "Öncelikli kullanım"],
    popular: true
  },
  {
    id: "enterprise",
    name: "Kurumsal",
    price: 899,
    durationLabel: "aylık",
    description: "Birden fazla kullanıcı ve geniş operasyonlar için.",
    features: [
      "Sınırsız kayıt",
      "Çoklu kullanıcı",
      "Gelişmiş raporlar",
      "Öncelikli destek"
    ],
    limits: ["Sınırsız müşteri", "Sınırsız lastik kaydı", "10 kullanıcı"]
  }
];

const EMPTY_ADDRESS_FORM: AddressFormState = {
  title: "Ana Teslimat Adresi",
  contactName: "",
  addressLine: "",
  city: "",
  country: "Türkiye",
  zipCode: ""
};

const EMPTY_CARD_PAYMENT_FORM: CardPaymentFormState = {
  cardHolderName: "",
  cardNumber: "",
  expireMonth: "",
  expireYear: "",
  cvc: "",
  registerCard: false
};

function formatPrice(value: number) {
  const hasDecimal = value % 1 !== 0;

  return `₺${value.toLocaleString("tr-TR", {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2
  })}`;
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
  return cycle === "yearly" ? "12 aylık abonelik" : "1 aylık abonelik";
}

function getDurationLabel(durationDays?: number) {
  if (!durationDays || durationDays <= 0) {
    return "abonelik";
  }

  if (durationDays >= 365) {
    return "1 yıllık";
  }

  if (durationDays % 30 === 0) {
    return `${durationDays / 30} aylık`;
  }

  return `${durationDays} günlük`;
}

function getApiIncludedPrice(plan: SubscriptionPlanDto) {
  const includedPrice =
    plan.vatInculededPrice ?? plan.vatIncludedPrice ?? plan.price;

  const parsedPrice = Number(includedPrice);

  return Number.isFinite(parsedPrice) ? parsedPrice : 0;
}

function normalizeOnlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}

function formatIban(value: string) {
  return value
    .replace(/\s/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function writeThreeDSHtmlToWindow(
  paymentWindow: Window,
  htmlContent: string
) {
  paymentWindow.document.open();
  paymentWindow.document.write(htmlContent);
  paymentWindow.document.close();
}

function getAddressTypeLabel(address?: AddressDto) {
  const type = address?.type?.trim();

  if (!type) return "Teslimat Adresi";

  return type;
}

function getAddressSummary(address?: AddressDto) {
  if (!address) return "Adres bulunamadı.";

  const parts = [
    address.addressLine,
    address.city,
    address.country,
    address.zipCode
  ].filter(Boolean);

  return parts.join(" / ") || "Adres detayı eksik.";
}

function mapSubscriptionPlanToPlan(
  plan: SubscriptionPlanDto,
  index: number
): Plan {
  const durationLabel = getDurationLabel(plan.durationDays);
  const cleanDescription = plan.description?.trim();

  const isPopular =
    plan.durationDays === 180 ||
    plan.name.toLocaleLowerCase("tr-TR").includes("6 aylık") ||
    index === 1;

  return {
    id: String(plan.id),
    apiId: plan.id,
    name: plan.name,
    price: getApiIncludedPrice(plan),
    vatExcludedPrice: plan.price,
    vatPercent: plan.vatPercent,
    vatPrice: plan.vatPrice,
    durationDays: plan.durationDays,
    durationLabel,
    description:
      cleanDescription || `${durationLabel} Lastik Otelim abonelik paketi.`,
    features: [
      `${durationLabel} kullanım hakkı`,
      "Müşteri ve plaka takibi",
      "Lastik emanet ve depo yönetimi",
      "Etiket ve kayıt işlemleri"
    ],
    limits: [
      `${plan.durationDays} gün kullanım`,
      `KDV: %${plan.vatPercent || "0"}`,
      `KDV hariç: ${formatPrice(plan.price)}`
    ],
    popular: isPopular,
    isFromApi: true
  };
}

export default function SubscriptionPage({
  subscription,
  onSubscriptionChange,
  showToast
}: SubscriptionPageProps) {
  const [apiPlans, setApiPlans] = useState<Plan[]>([]);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState("");
  const [plansReloadKey, setPlansReloadKey] = useState(0);

  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [isAddressesLoading, setIsAddressesLoading] = useState(false);
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [addressesError, setAddressesError] = useState("");
  const [addressesReloadKey, setAddressesReloadKey] = useState(0);

  const [bankAccounts, setBankAccounts] = useState<BankAccountDto[]>([]);
  const [isBankAccountsLoading, setIsBankAccountsLoading] = useState(false);
  const [bankAccountsError, setBankAccountsError] = useState("");
  const [bankAccountsReloadKey, setBankAccountsReloadKey] = useState(0);

  const [identityNumber, setIdentityNumber] = useState("");

  const [paymentLoadingPlanId, setPaymentLoadingPlanId] =
    useState<string | null>(null);

  const [bankTransferReceipt, setBankTransferReceipt] =
    useState<BankTransferReceipt | null>(null);

  const [selectedThreeDSPlan, setSelectedThreeDSPlan] =
    useState<Plan | null>(null);

  const [threeDSForm, setThreeDSForm] =
    useState<CardPaymentFormState>(EMPTY_CARD_PAYMENT_FORM);

  const [isThreeDSLoading, setIsThreeDSLoading] = useState(false);

  const [addressForm, setAddressForm] =
    useState<AddressFormState>(EMPTY_ADDRESS_FORM);

  const [isSubscribeFlowOpen, setIsSubscribeFlowOpen] = useState(false);
  const [subscriptionStep, setSubscriptionStep] =
    useState<SubscriptionFlowStep>("plans");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const billingCycle: BillingCycle = subscription.billingCycle || "monthly";

  useEffect(() => {
    let ignore = false;

    async function loadPlans() {
      setIsPlansLoading(true);
      setPlansError("");

      try {
        const response = await SubscriptionApi.getPlans({
          page: 0,
          pageSize: 20
        });

        if (ignore) return;

        const mappedPlans = response.items.map(mapSubscriptionPlanToPlan);

        setApiPlans(mappedPlans);
      } catch (error) {
        if (ignore) return;

        setApiPlans([]);
        setPlansError(
          error instanceof Error
            ? error.message
            : "Abonelik planları yüklenemedi."
        );
      } finally {
        if (!ignore) {
          setIsPlansLoading(false);
        }
      }
    }

    loadPlans();

    return () => {
      ignore = true;
    };
  }, [plansReloadKey]);

  useEffect(() => {
    let ignore = false;

    async function loadAddresses() {
      setIsAddressesLoading(true);
      setAddressesError("");

      try {
        const response = await AddressApi.getList({
          page: 0,
          pageSize: 20
        });

        if (ignore) return;

        setAddresses(Array.isArray(response.items) ? response.items : []);
      } catch (error) {
        if (ignore) return;

        setAddresses([]);
        setAddressesError(
          error instanceof Error
            ? error.message
            : "Adres bilgileri yüklenemedi."
        );
      } finally {
        if (!ignore) {
          setIsAddressesLoading(false);
        }
      }
    }

    loadAddresses();

    return () => {
      ignore = true;
    };
  }, [addressesReloadKey]);

  useEffect(() => {
    let ignore = false;

    async function loadBankAccounts() {
      setIsBankAccountsLoading(true);
      setBankAccountsError("");

      try {
        const response = await BankAccountApi.getList({
          page: 0,
          pageSize: 20
        });

        if (ignore) return;

        setBankAccounts(Array.isArray(response.items) ? response.items : []);
      } catch (error) {
        if (ignore) return;

        setBankAccounts([]);
        setBankAccountsError(
          error instanceof Error
            ? error.message
            : "Banka hesapları yüklenemedi."
        );
      } finally {
        if (!ignore) {
          setIsBankAccountsLoading(false);
        }
      }
    }

    loadBankAccounts();

    return () => {
      ignore = true;
    };
  }, [bankAccountsReloadKey]);

  const plans = useMemo(
    () => (apiPlans.length > 0 ? apiPlans : FALLBACK_PLANS),
    [apiPlans]
  );

  const shippingAddress = useMemo(() => {
    const teslimatAddress = addresses.find((address) => {
      const upperType = address.type?.toLocaleUpperCase("tr-TR") || "";

      return upperType.includes("TESLIMAT") || upperType.includes("TESLİMAT");
    });

    return teslimatAddress || addresses[0];
  }, [addresses]);

  const currentPlan = useMemo(() => {
    const currentPlanId = subscription.planId ? String(subscription.planId) : "";

    return plans.find((plan) => {
      return (
        plan.id === currentPlanId ||
        (Boolean(subscription.planName) && plan.name === subscription.planName)
      );
    });
  }, [plans, subscription.planId, subscription.planName]);

  const activePlanPrice = currentPlan
    ? currentPlan.price
    : subscription.amount || 0;

  const activeEndDate = subscription.periodEndAt || subscription.renewalDate;

  const isSubscriptionPending = String(subscription.status) === "pending";

  const handleStartSubscription = () => {
    setIsSubscribeFlowOpen(true);
    setSubscriptionStep("plans");
    setSelectedPlan(null);
    setSelectedThreeDSPlan(null);
    setBankTransferReceipt(null);
  };

  const handleCloseSubscriptionFlow = () => {
    if (Boolean(paymentLoadingPlanId) || isThreeDSLoading || isAddressSaving) {
      return;
    }

    setIsSubscribeFlowOpen(false);
    setSubscriptionStep("plans");
    setSelectedPlan(null);
    setSelectedThreeDSPlan(null);
    setThreeDSForm(EMPTY_CARD_PAYMENT_FORM);
  };

  const handleSelectPlan = (plan: Plan) => {
    if (!plan.isFromApi || !plan.apiId) {
      showToast(
        "Bu plan için ödeme seçeneği hazır değil. Lütfen bilgileri yenileyin.",
        "warning"
      );
      return;
    }

    setSelectedPlan(plan);
    setSelectedThreeDSPlan(null);
    setBankTransferReceipt(null);
    setSubscriptionStep("details");
  };

  const validateSelectedPaymentDetails = () => {
    if (!selectedPlan?.apiId) {
      showToast("Lütfen önce abonelik paketi seçin.", "warning");
      return null;
    }

    if (!selectedPlan.isFromApi) {
      showToast(
        "Bu plan için ödeme seçeneği hazır değil. Lütfen bilgileri yenileyin.",
        "warning"
      );
      return null;
    }

    if (!shippingAddress?.id) {
      showToast(
        "Ödeme adımına geçmek için teslimat/fatura adresi ekleyin.",
        "warning"
      );
      return null;
    }

    const cleanIdentityNumber = normalizeOnlyNumbers(identityNumber);

    if (
      cleanIdentityNumber.length !== 10 &&
      cleanIdentityNumber.length !== 11
    ) {
      showToast(
        "Ödeme adımına geçmek için 10 haneli vergi no veya 11 haneli T.C. kimlik no girin.",
        "warning"
      );
      return null;
    }

    return {
      planId: selectedPlan.apiId,
      identityNumber: cleanIdentityNumber,
      shippingAddressId: shippingAddress.id
    };
  };

  const handleContinueToPayment = () => {
    const paymentDetails = validateSelectedPaymentDetails();

    if (!paymentDetails) return;

    setSelectedThreeDSPlan(null);
    setSubscriptionStep("payment");
  };

  const handleBackToPlans = () => {
    if (Boolean(paymentLoadingPlanId) || isThreeDSLoading) return;

    setSelectedPlan(null);
    setSelectedThreeDSPlan(null);
    setSubscriptionStep("plans");
  };

  const handleBackToDetails = () => {
    if (Boolean(paymentLoadingPlanId) || isThreeDSLoading) return;

    setSelectedThreeDSPlan(null);
    setThreeDSForm(EMPTY_CARD_PAYMENT_FORM);
    setSubscriptionStep("details");
  };

  const handleAddressInputChange =
    (field: keyof AddressFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setAddressForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value
      }));
    };

  const handleCreateAddress = async () => {
    const title = addressForm.title.trim() || "Ana Teslimat Adresi";
    const contactName = addressForm.contactName.trim();
    const addressLine = addressForm.addressLine.trim();
    const city = addressForm.city.trim();
    const country = addressForm.country.trim() || "Türkiye";
    const zipCode = addressForm.zipCode.trim();

    if (!contactName || !addressLine || !city) {
      showToast(
        "Adres eklemek için yetkili kişi, açık adres ve şehir alanlarını doldurun.",
        "warning"
      );
      return;
    }

    setIsAddressSaving(true);

    try {
      await AddressApi.add({
        type: "TESLIMAT",
        title,
        contactName,
        addressLine,
        city,
        country,
        zipCode
      });

      setAddressForm(EMPTY_ADDRESS_FORM);
      setAddressesReloadKey((currentKey) => currentKey + 1);

      showToast(
        "Teslimat/fatura adresi kaydedildi. Artık ödeme başlatabilirsiniz.",
        "success"
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Adres kaydedilemedi.",
        "error"
      );
    } finally {
      setIsAddressSaving(false);
    }
  };

  const validateSharedPaymentRequirements = (
    plan: Plan,
    paymentType: "bankTransfer" | "threeDS"
  ) => {
    if (!plan.isFromApi || !plan.apiId) {
      showToast(
        `Bu plan için ödeme başlatılamıyor. Lütfen bilgileri yenileyin.`,
        "warning"
      );
      return null;
    }

    if (!shippingAddress?.id) {
      showToast(
        paymentType === "threeDS"
          ? "Kart ile ödeme için önce teslimat/fatura adresi ekleyin."
          : "Havale talebi oluşturmak için önce teslimat/fatura adresi ekleyin.",
        "warning"
      );
      return null;
    }

    const cleanIdentityNumber = normalizeOnlyNumbers(identityNumber);

    if (
      cleanIdentityNumber.length !== 10 &&
      cleanIdentityNumber.length !== 11
    ) {
      showToast(
        paymentType === "threeDS"
          ? "Kart ile ödeme için 10 haneli vergi no veya 11 haneli T.C. kimlik no girin."
          : "Havale talebi için 10 haneli vergi no veya 11 haneli T.C. kimlik no girin.",
        "warning"
      );
      return null;
    }

    return {
      planId: plan.apiId,
      identityNumber: cleanIdentityNumber,
      shippingAddressId: shippingAddress.id
    };
  };

  const handlePlanAction = async (plan: Plan) => {
    const paymentBase = validateSharedPaymentRequirements(plan, "bankTransfer");

    if (!paymentBase) return;

    setPaymentLoadingPlanId(plan.id);

    try {
      const response = await SubscriptionApi.createBankTransferPayment({
        subscriptionPlanId: paymentBase.planId,
        identityNumber: paymentBase.identityNumber,
        shippingAddressId: paymentBase.shippingAddressId,
        billingAddressId: null,
        useShippingAsBilling: true
      });

      setBankTransferReceipt({
        transactionId: response.transactionId,
        referenceCode: response.referenceCode || "",
        subscriptionPlan: response.subscriptionPlan || plan.name,
        amount:
          typeof response.amount === "number"
            ? response.amount
            : plan.price
      });

      setSubscriptionStep("bankTransferReceipt");

      showToast(
        response.referenceCode
          ? `${plan.name} için havale talebi oluşturuldu. Referans kodu: ${response.referenceCode}`
          : `${plan.name} için havale abonelik talebi oluşturuldu.`,
        "success"
      );

      void onSubscriptionChange();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Havale abonelik talebi oluşturulamadı.",
        "error"
      );
    } finally {
      setPaymentLoadingPlanId(null);
    }
  };

  const handleThreeDSInputChange =
    (field: keyof CardPaymentFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "cardNumber" ||
        field === "expireMonth" ||
        field === "expireYear" ||
        field === "cvc"
          ? normalizeOnlyNumbers(event.target.value)
          : event.target.value;

      setThreeDSForm((currentForm) => ({
        ...currentForm,
        [field]: value
      }));
    };

  const handleOpenThreeDSForm = (plan: Plan) => {
    const paymentBase = validateSharedPaymentRequirements(plan, "threeDS");

    if (!paymentBase) return;

    setSelectedThreeDSPlan(plan);
    setThreeDSForm(EMPTY_CARD_PAYMENT_FORM);
  };

  const handleCloseThreeDSForm = () => {
    if (isThreeDSLoading) return;

    setSelectedThreeDSPlan(null);
    setThreeDSForm(EMPTY_CARD_PAYMENT_FORM);
    setSubscriptionStep("payment");
  };

  const handleInitializeThreeDSPayment = async () => {
    if (!selectedThreeDSPlan?.apiId) {
      showToast("Kart ile ödeme için plan seçimi bulunamadı.", "warning");
      return;
    }

    if (!shippingAddress?.id) {
      showToast("Kart ile ödeme için teslimat/fatura adresi bulunamadı.", "warning");
      return;
    }

    const cleanIdentityNumber = normalizeOnlyNumbers(identityNumber);
    const cleanCardNumber = normalizeOnlyNumbers(threeDSForm.cardNumber);
    const cleanExpireMonth = normalizeOnlyNumbers(threeDSForm.expireMonth);
    const cleanExpireYear = normalizeOnlyNumbers(threeDSForm.expireYear);
    const cleanCvc = normalizeOnlyNumbers(threeDSForm.cvc);

    if (
      cleanIdentityNumber.length !== 10 &&
      cleanIdentityNumber.length !== 11
    ) {
      showToast(
        "Kart ile ödeme için 10 haneli vergi no veya 11 haneli T.C. kimlik no girin.",
        "warning"
      );
      return;
    }

    if (!threeDSForm.cardHolderName.trim()) {
      showToast("Kart üzerindeki isim alanını doldurun.", "warning");
      return;
    }

    if (cleanCardNumber.length < 12) {
      showToast("Kart numarası eksik görünüyor.", "warning");
      return;
    }

    if (!cleanExpireMonth || !cleanExpireYear) {
      showToast("Kart son kullanma ay/yıl alanlarını doldurun.", "warning");
      return;
    }

    if (cleanCvc.length < 3) {
      showToast("CVC alanını kontrol edin.", "warning");
      return;
    }

    const paymentWindow = window.open("", "_blank");

    if (!paymentWindow) {
      showToast(
        "Kart doğrulama penceresi açılamadı. Tarayıcınızın açılır pencere iznini kontrol edin.",
        "error"
      );
      return;
    }

    writeThreeDSHtmlToWindow(
      paymentWindow,
      "<p style='font-family:Arial,sans-serif;padding:24px'>Kart doğrulama sayfası hazırlanıyor...</p>"
    );

    setIsThreeDSLoading(true);

    try {
      const response = await SubscriptionApi.initializeThreeDSPayment({
        subscriptionPlanId: selectedThreeDSPlan.apiId,
        identityNumber: cleanIdentityNumber,
        shippingAddressId: shippingAddress.id,
        billingAddressId: null,
        useShippingAsBilling: true,
        autoRenew: false,
        paymentCard: {
          cardHolderName: threeDSForm.cardHolderName,
          cardNumber: cleanCardNumber,
          expireMonth: cleanExpireMonth,
          expireYear: cleanExpireYear,
          cvc: cleanCvc,
          registerCard: threeDSForm.registerCard
        }
      });

      if (response.success === false) {
        throw new Error(
          response.errorMessage ||
            response.message ||
            "Kart doğrulama başlatılamadı."
        );
      }

      const htmlContent = response.htmlContent || response.threeDSHtmlContent;
      const redirectUrl = response.redirectUrl || response.paymentPageUrl;

      if (htmlContent) {
        writeThreeDSHtmlToWindow(paymentWindow, htmlContent);
      } else if (redirectUrl) {
        paymentWindow.location.href = redirectUrl;
      } else {
        paymentWindow.close();

        throw new Error(
          response.errorMessage ||
            response.message ||
            "Kart doğrulama sayfası oluşturulamadı."
        );
      }

      showToast(
        "Kart ile ödeme başlatıldı.",
        "success"
      );

      setSelectedThreeDSPlan(null);
      setThreeDSForm(EMPTY_CARD_PAYMENT_FORM);

      void onSubscriptionChange();
    } catch (error) {
      paymentWindow.close();

      showToast(
        error instanceof Error
          ? error.message
          : "Kart ile ödeme başlatılamadı.",
        "error"
      );
    } finally {
      setIsThreeDSLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    showToast(
      "Aboneliği pasife alma işlemi şu anda hazır değil.",
      "warning"
    );
  };

  const handleRefreshSubscription = () => {
    setPlansReloadKey((currentKey) => currentKey + 1);
    setAddressesReloadKey((currentKey) => currentKey + 1);
    setBankAccountsReloadKey((currentKey) => currentKey + 1);

    void onSubscriptionChange();

    showToast(
      "Abonelik, plan, adres ve banka bilgileri yeniden yükleniyor.",
      "info"
    );
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
      <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-4 animate-slide-in sm:space-y-6 sm:pb-6">
        <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700">
                <CreditCard className="h-3.5 w-3.5" />
                Abonelik Yönetimi
              </div>

              <h1 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Lastik Otelim Abonelik Planı
              </h1>

              <p className="mt-2 max-w-2xl text-xs font-medium leading-6 text-slate-500 sm:text-sm">
                Mevcut abonelik durumunuzu görüntüleyin, ihtiyacınıza uygun
                paketi seçin ve ödeme işlemini adım adım tamamlayın.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshSubscription}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Bilgileri Yenile
            </button>
          </div>
        </header>

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
                    {currentPlan?.name || subscription.planName || "Aktif"} Plan
                  </h2>

                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
                    Bitiş veya yenileme tarihi: {formatDateTR(activeEndDate)}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SubscriptionSummaryCard
                    label="Ödeme Periyodu"
                    value={getBillingCycleLabel(billingCycle)}
                    description={getBillingCycleDescription(billingCycle)}
                  />

                  <SubscriptionSummaryCard
                    label="Paket Tutarı"
                    value={activePlanPrice ? formatPrice(activePlanPrice) : "-"}
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
                    {isSubscriptionPending
                      ? "Havale Onayı Bekleniyor"
                      : "Abonelik Durumu"}
                  </p>

                  <h2 className="mt-1 text-lg font-black leading-snug sm:text-xl">
                    {isSubscriptionPending
                      ? "Havale abonelik talebiniz oluşturuldu"
                      : "Aktif abonelik kaydı bulunamadı"}
                  </h2>

                  <p className="mt-2 max-w-2xl text-xs font-semibold leading-6 text-blue-100 sm:text-sm">
                    {isSubscriptionPending
                      ? "Ödemeniz kontrol edildikten sonra hesabınız aktif edilecektir."
                      : "Abone ol butonuna basarak paket seçimi ve ödeme adımlarına geçebilirsiniz."}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:min-w-[220px]">
                <div className="rounded-2xl bg-white/10 px-5 py-3 text-center text-xs font-black ring-1 ring-inset ring-white/20 sm:text-sm">
                  {isSubscriptionPending ? "Onay bekleniyor" : "Abonelik yok"}
                </div>

                {!isSubscriptionPending && !isSubscribeFlowOpen && (
                  <button
                    type="button"
                    onClick={handleStartSubscription}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-black text-blue-700 shadow-lg shadow-blue-950/10 transition hover:bg-blue-50 active:scale-[0.98] sm:text-sm"
                  >
                    <Sparkles className="h-4 w-4" />
                    Abone Ol
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {!subscription.isActive &&
          (isSubscribeFlowOpen || Boolean(bankTransferReceipt)) &&
          (!isSubscriptionPending || Boolean(bankTransferReceipt)) && (
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:rounded-[2rem]">
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                      Abonelik Başlat
                    </p>

                    <h2 className="mt-1 text-lg font-black text-slate-950 sm:text-xl">
                      {subscriptionStep === "plans" && "Paket seçimi"}
                      {subscriptionStep === "details" && "Ödeme bilgileri"}
                      {subscriptionStep === "payment" && "Ödeme yöntemi"}
                      {subscriptionStep === "bankTransferReceipt" &&
                        "Havale talebi oluşturuldu"}
                    </h2>

                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                      {subscriptionStep === "plans" &&
                        "İşletmenize uygun abonelik paketini seçin."}
                      {subscriptionStep === "details" &&
                        "Adres ve kimlik/vergi bilgilerinizi kontrol edin."}
                      {subscriptionStep === "payment" &&
                        "Ödemenizi kart veya havale/EFT ile tamamlayın."}
                      {subscriptionStep === "bankTransferReceipt" &&
                        "Açıklama kısmına referans kodunu yazarak ödeme yapın."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <SubscriptionFlowStepper currentStep={subscriptionStep} />

                    {subscriptionStep !== "bankTransferReceipt" && (
                      <button
                        type="button"
                        onClick={handleCloseSubscriptionFlow}
                        disabled={
                          Boolean(paymentLoadingPlanId) ||
                          isThreeDSLoading ||
                          isAddressSaving
                        }
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Kapat
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {subscriptionStep === "plans" && (
                  <div>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-black text-slate-950">
                          Abonelik Planları
                        </h3>

                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Paketleri inceleyip devam etmek istediğiniz planı seçin.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isPlansLoading && (
                          <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">
                            Planlar yükleniyor...
                          </span>
                        )}

                        {!isPlansLoading && apiPlans.length > 0 && (
                          <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
                            Planlar hazır
                          </span>
                        )}

                        {!isPlansLoading && plansError && (
                          <span
                            title={plansError}
                            className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700"
                          >
                            Planlar geçici olarak gösteriliyor
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
                      {plans.map((plan) => {
                        const isCurrentPlan =
                          subscription.isActive &&
                          (String(subscription.planId || "") === plan.id ||
                            subscription.planName === plan.name);

                        return (
                          <article
                            key={plan.id}
                            className={`relative flex min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-sm transition duration-300 sm:rounded-[2rem] sm:p-6 lg:hover:-translate-y-1 lg:hover:shadow-xl ${
                              selectedPlan?.id === plan.id
                                ? "border-blue-300 ring-4 ring-blue-50"
                                : plan.popular
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
                                  {formatPrice(plan.price)}
                                </span>

                                <span className="pb-1 text-xs font-bold text-slate-400 sm:text-sm">
                                  / {plan.durationLabel}
                                </span>
                              </div>

                              <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-400">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                {plan.vatExcludedPrice
                                  ? `KDV hariç: ${formatPrice(
                                      plan.vatExcludedPrice
                                    )}`
                                  : "Plan fiyatı"}
                                {plan.vatPercent
                                  ? ` • KDV: %${plan.vatPercent}`
                                  : ""}
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
                                Paket Detayları
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
                              disabled={isCurrentPlan || !plan.isFromApi}
                              onClick={() => handleSelectPlan(plan)}
                              className={`mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-black transition active:scale-[0.98] disabled:cursor-not-allowed sm:text-sm ${
                                isCurrentPlan
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : plan.isFromApi
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                                    : "border border-slate-200 bg-slate-50 text-slate-400"
                              }`}
                            >
                              {isCurrentPlan
                                ? "Mevcut Plan"
                                : plan.isFromApi
                                  ? "Bu Paketi Seç"
                                  : "Ödeme Seçeneği Hazır Değil"}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}

                {subscriptionStep === "details" && selectedPlan && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
                            Seçilen Paket
                          </p>

                          <h3 className="mt-1 text-base font-black text-slate-950">
                            {selectedPlan.name}
                          </h3>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            Tutar: {formatPrice(selectedPlan.price)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleBackToPlans}
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-100 bg-white px-4 text-xs font-black text-blue-700 transition hover:bg-blue-50"
                        >
                          Paketi Değiştir
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
                      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                            <MapPin className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-base font-black text-slate-950">
                              Teslimat / Fatura Bilgisi
                            </h3>

                            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                              Havale ve kart ödemesi için bu bilgiler gereklidir.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isAddressesLoading && (
                            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">
                              Adresler yükleniyor...
                            </span>
                          )}

                          {!isAddressesLoading && shippingAddress && (
                            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
                              Adres hazır
                            </span>
                          )}

                          {!isAddressesLoading && !shippingAddress && (
                            <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700">
                              Adres gerekli
                            </span>
                          )}
                        </div>
                      </div>

                      {addressesError && (
                        <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
                          {addressesError}
                        </div>
                      )}

                      {shippingAddress ? (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                              {getAddressTypeLabel(shippingAddress)}
                            </p>

                            <h3 className="mt-1 text-sm font-black text-slate-950">
                              {shippingAddress.title || "Kayıtlı Adres"}
                            </h3>

                            <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
                              {shippingAddress.contactName ||
                                "Yetkili kişi belirtilmemiş"}
                            </p>

                            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                              {getAddressSummary(shippingAddress)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                              T.C. Kimlik No / Vergi No
                            </label>

                            <input
                              value={identityNumber}
                              onChange={(event) =>
                                setIdentityNumber(
                                  normalizeOnlyNumbers(event.target.value)
                                )
                              }
                              inputMode="numeric"
                              maxLength={11}
                              placeholder="10 veya 11 hane"
                              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                            />

                            <p className="mt-2 text-[11px] font-medium leading-5 text-slate-400">
                              Ödeme işlemi için gereklidir.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          <AddressInput
                            label="Adres Başlığı"
                            value={addressForm.title}
                            onChange={handleAddressInputChange("title")}
                            placeholder="Ana Teslimat Adresi"
                          />

                          <AddressInput
                            label="Yetkili Kişi"
                            value={addressForm.contactName}
                            onChange={handleAddressInputChange("contactName")}
                            placeholder="İsim Soyisim"
                          />

                          <div className="lg:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Açık Adres
                            </label>

                            <textarea
                              value={addressForm.addressLine}
                              onChange={handleAddressInputChange(
                                "addressLine"
                              )}
                              placeholder="Mahalle, cadde, sokak, bina no..."
                              rows={3}
                              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                            />
                          </div>

                          <AddressInput
                            label="Şehir"
                            value={addressForm.city}
                            onChange={handleAddressInputChange("city")}
                            placeholder="Çorum"
                          />

                          <AddressInput
                            label="Ülke"
                            value={addressForm.country}
                            onChange={handleAddressInputChange("country")}
                            placeholder="Türkiye"
                          />

                          <AddressInput
                            label="Posta Kodu"
                            value={addressForm.zipCode}
                            onChange={handleAddressInputChange("zipCode")}
                            placeholder="19000"
                          />

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={handleCreateAddress}
                              disabled={isAddressSaving}
                              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              <Save className="h-4 w-4" />
                              {isAddressSaving
                                ? "Adres Kaydediliyor..."
                                : "Adresi Kaydet"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={handleBackToPlans}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-5 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                      >
                        Geri
                      </button>

                      <button
                        type="button"
                        onClick={handleContinueToPayment}
                        disabled={isAddressesLoading || isAddressSaving}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-blue-400"
                      >
                        Ödeme Seçeneklerine Geç
                      </button>
                    </div>
                  </div>
                )}

                {subscriptionStep === "payment" && selectedPlan && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 lg:col-span-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
                          Seçilen Paket
                        </p>

                        <h3 className="mt-1 text-base font-black text-slate-950">
                          {selectedPlan.name}
                        </h3>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Tutar: {formatPrice(selectedPlan.price)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePlanAction(selectedPlan)}
                        disabled={Boolean(paymentLoadingPlanId) || isThreeDSLoading}
                        className="flex min-h-[128px] flex-col items-start justify-center rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-left transition hover:bg-emerald-100/60 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                          <Landmark className="h-5 w-5" />
                        </div>

                        <span className="mt-3 text-sm font-black text-slate-950">
                          {paymentLoadingPlanId === selectedPlan.id
                            ? "Talep Oluşturuluyor..."
                            : "Havale / EFT ile Öde"}
                        </span>

                        <span className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                          Referans kodu oluşturulur, ödeme sonrası hesabınız
                          kontrol edilir.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenThreeDSForm(selectedPlan)}
                        disabled={
                          Boolean(paymentLoadingPlanId) ||
                          isThreeDSLoading ||
                          !selectedPlan.isFromApi
                        }
                        className="flex min-h-[128px] flex-col items-start justify-center rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left transition hover:bg-blue-100/70 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                          <CreditCard className="h-5 w-5" />
                        </div>

                        <span className="mt-3 text-sm font-black text-slate-950">
                          3D Kart ile Öde
                        </span>

                        <span className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                          Kart bilgilerinizi girerek güvenli ödeme adımına
                          devam edin.
                        </span>
                      </button>
                    </div>

                    {selectedThreeDSPlan && (
                      <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                              Kart ile Ödeme
                            </p>

                            <h2 className="mt-1 text-lg font-black text-slate-950">
                              {selectedThreeDSPlan.name}
                            </h2>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Tutar: {formatPrice(selectedThreeDSPlan.price)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={handleCloseThreeDSForm}
                            disabled={isThreeDSLoading}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                          >
                            Kapat
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          <AddressInput
                            label="Kart Üzerindeki İsim"
                            value={threeDSForm.cardHolderName}
                            onChange={handleThreeDSInputChange("cardHolderName")}
                            placeholder="İsim Soyisim"
                          />

                          <AddressInput
                            label="Kart Numarası"
                            value={threeDSForm.cardNumber}
                            onChange={handleThreeDSInputChange("cardNumber")}
                            placeholder="0000 0000 0000 0000"
                          />

                          <AddressInput
                            label="Son Kullanma Ay"
                            value={threeDSForm.expireMonth}
                            onChange={handleThreeDSInputChange("expireMonth")}
                            placeholder="12"
                          />

                          <AddressInput
                            label="Son Kullanma Yıl"
                            value={threeDSForm.expireYear}
                            onChange={handleThreeDSInputChange("expireYear")}
                            placeholder="2030"
                          />

                          <AddressInput
                            label="CVC"
                            value={threeDSForm.cvc}
                            onChange={handleThreeDSInputChange("cvc")}
                            placeholder="123"
                          />

                          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-600">
                            <input
                              type="checkbox"
                              checked={threeDSForm.registerCard}
                              onChange={(event) =>
                                setThreeDSForm((currentForm) => ({
                                  ...currentForm,
                                  registerCard: event.target.checked
                                }))
                              }
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            Kartı sonraki ödemeler için kaydet
                          </label>

                          <div className="lg:col-span-2">
                            <button
                              type="button"
                              onClick={handleInitializeThreeDSPayment}
                              disabled={isThreeDSLoading}
                              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-blue-400"
                            >
                              <CreditCard className="h-4 w-4" />
                              {isThreeDSLoading
                                ? "Ödeme Başlatılıyor..."
                                : "3D Kart ile Öde"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={handleBackToDetails}
                        disabled={Boolean(paymentLoadingPlanId) || isThreeDSLoading}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-5 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Geri
                      </button>
                    </div>
                  </div>
                )}

                {subscriptionStep === "bankTransferReceipt" &&
                  bankTransferReceipt && (
                    <div className="space-y-5">
                      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                              <Landmark className="h-6 w-6" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 sm:text-xs">
                                Havale Talebi Oluşturuldu
                              </p>

                              <h2 className="mt-1 text-lg font-black leading-snug text-slate-950 sm:text-xl">
                                {bankTransferReceipt.subscriptionPlan}
                              </h2>

                              <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 sm:text-sm">
                                Ödemenizi banka hesabına gönderirken açıklama
                                alanına aşağıdaki referans kodunu yazın.
                                Ödemeniz kontrol edildikten sonra hesabınız
                                aktif edilecektir.
                              </p>
                            </div>
                          </div>

                          <div className="grid min-w-[260px] gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                                Referans Kodu
                              </p>

                              <p className="mt-1 select-all rounded-xl bg-slate-950 px-4 py-3 text-center text-xl font-black tracking-[0.18em] text-white">
                                {bankTransferReceipt.referenceCode || "-"}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                              <span>Tutar</span>

                              <span className="text-slate-950">
                                {formatPrice(bankTransferReceipt.amount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                              Banka Hesapları
                            </p>

                            <h3 className="mt-1 text-sm font-black text-slate-950">
                              Aşağıdaki hesaplardan birine ödeme yapın
                            </h3>

                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                              Açıklama alanına mutlaka referans kodunu yazın:{" "}
                              <span className="font-black text-slate-950">
                                {bankTransferReceipt.referenceCode || "-"}
                              </span>
                            </p>
                          </div>

                          {isBankAccountsLoading && (
                            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">
                              Hesaplar yükleniyor...
                            </span>
                          )}
                        </div>

                        {bankAccountsError && (
                          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
                            {bankAccountsError}
                          </div>
                        )}

                        {!isBankAccountsLoading &&
                          !bankAccountsError &&
                          bankAccounts.length === 0 && (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
                              Banka hesabı bulunamadı. Lütfen ödeme için işletme
                              yetkilisiyle iletişime geçin.
                            </div>
                          )}

                        {bankAccounts.length > 0 && (
                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {bankAccounts.map((account) => (
                              <div
                                key={`${account.bankName}-${account.iban}`}
                                className="rounded-2xl border border-slate-100 bg-white p-4"
                              >
                                <div className="flex flex-col gap-1">
                                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                    Banka
                                  </p>

                                  <h4 className="text-sm font-black text-slate-950">
                                    {account.bankName || "-"}
                                  </h4>
                                </div>

                                <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600">
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                                      Hesap Sahibi
                                    </p>

                                    <p className="mt-1 text-slate-700">
                                      {account.holderName || "-"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                                      IBAN
                                    </p>

                                    <p className="mt-1 select-all break-words rounded-xl bg-slate-50 px-3 py-2 font-black tracking-wide text-slate-950">
                                      {formatIban(account.iban || "") || "-"}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Para Birimi</span>

                                    <span className="font-black text-slate-950">
                                      {account.currency || "TRY"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </section>
          )}
      </div>
    </div>
  );

}


function SubscriptionFlowStepper({
  currentStep
}: {
  currentStep: SubscriptionFlowStep;
}) {
  const steps: { key: SubscriptionFlowStep; label: string }[] = [
    { key: "plans", label: "Paket" },
    { key: "details", label: "Bilgiler" },
    { key: "payment", label: "Ödeme" },
    { key: "bankTransferReceipt", label: "Sonuç" }
  ];

  const activeIndex = steps.findIndex((step) => step.key === currentStep);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        const isCompleted = activeIndex > index;

        return (
          <div
            key={step.key}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black ${
              isActive
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : isCompleted
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-400"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                isActive
                  ? "bg-blue-600 text-white"
                  : isCompleted
                    ? "bg-emerald-500 text-white"
                    : "bg-white text-slate-400"
              }`}
            >
              {index + 1}
            </span>
            {step.label}
          </div>
        );
      })}
    </div>
  );
}

function AddressInput({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </label>

      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
      />
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
          compactValue ? "text-sm" : "text-lg"
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