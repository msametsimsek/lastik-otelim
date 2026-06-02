import {
  Customer,
  Vehicle,
  TireRecord,
  AppSettings,
  AuthUser,
  UserSubscription,
  SubscriptionPlanId
} from "../types";
import { DEFAULT_BRANDS } from "../data/defaultBrands";

const KEYS = {
  CUSTOMERS: "lastikTakip_customers",
  VEHICLES: "lastikTakip_vehicles",
  TIRE_RECORDS: "lastikTakip_tireRecords",
  BRANDS: "lastikTakip_brands",
  SETTINGS: "lastikTakip_settings",
  PRINT_COUNTER: "lastikTakip_printCounter",
  USERS: "lastikTakip_users",
  SESSION: "lastikTakip_session",
  SUBSCRIPTION: "lastikTakip_subscription"
};

const DEFAULT_SETTINGS: AppSettings = {
  businessName: "LastikOtelim",
  businessType: "Oto Lastik & Rot Balans Servisi",
  phone: "",
  address: ""
};

const DEFAULT_SUBSCRIPTION: UserSubscription = {
  id: "sub-local-default",
  planId: null,
  planName: "",
  status: "inactive",
  isActive: false
};

function getSafeItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);

    if (!item) {
      return defaultValue;
    }

    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading key "${key}" from localStorage:`, error);
    return defaultValue;
  }
}

function setSafeItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing key "${key}" to localStorage:`, error);
  }
}

export const StorageService = {
  initDatabase(forceReset = false): void {
    if (forceReset) {
      localStorage.removeItem(KEYS.SUBSCRIPTION);
      localStorage.removeItem(KEYS.CUSTOMERS);
      localStorage.removeItem(KEYS.VEHICLES);
      localStorage.removeItem(KEYS.TIRE_RECORDS);
      localStorage.removeItem(KEYS.BRANDS);
      localStorage.removeItem(KEYS.SETTINGS);
      localStorage.removeItem(KEYS.PRINT_COUNTER);
    }

    if (!localStorage.getItem(KEYS.CUSTOMERS)) {
      setSafeItem<Customer[]>(KEYS.CUSTOMERS, []);
    }

    if (!localStorage.getItem(KEYS.VEHICLES)) {
      setSafeItem<Vehicle[]>(KEYS.VEHICLES, []);
    }

    if (!localStorage.getItem(KEYS.TIRE_RECORDS)) {
      setSafeItem<TireRecord[]>(KEYS.TIRE_RECORDS, []);
    }

    if (!localStorage.getItem(KEYS.BRANDS)) {
      setSafeItem<string[]>(KEYS.BRANDS, DEFAULT_BRANDS);
    }

    if (!localStorage.getItem(KEYS.SETTINGS)) {
      setSafeItem<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
    }

    if (!localStorage.getItem(KEYS.PRINT_COUNTER)) {
      setSafeItem<number>(KEYS.PRINT_COUNTER, 0);
    }

    if (!localStorage.getItem(KEYS.SUBSCRIPTION)) {
      setSafeItem<UserSubscription>(KEYS.SUBSCRIPTION, DEFAULT_SUBSCRIPTION);
    }

    this.getUsers();
  },

  resetDatabase(): void {
    this.initDatabase(true);
  },

  getCustomers(): Customer[] {
    return getSafeItem<Customer[]>(KEYS.CUSTOMERS, []);
  },

  addCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    customers.push(customer);
    setSafeItem(KEYS.CUSTOMERS, customers);
  },

  updateCustomer(updated: Customer): void {
    const customers = this.getCustomers();
    const index = customers.findIndex((customer) => customer.id === updated.id);

    if (index !== -1) {
      customers[index] = {
        ...updated,
        updatedAt: new Date().toISOString()
      };

      setSafeItem(KEYS.CUSTOMERS, customers);
    }
  },

  getVehicles(): Vehicle[] {
    return getSafeItem<Vehicle[]>(KEYS.VEHICLES, []);
  },

  addVehicle(vehicle: Vehicle): void {
    const vehicles = this.getVehicles();

    const exists = vehicles.some(
      (item) =>
        item.customerId === vehicle.customerId &&
        item.plate.toUpperCase() === vehicle.plate.toUpperCase()
    );

    if (!exists) {
      vehicles.push(vehicle);
      setSafeItem(KEYS.VEHICLES, vehicles);
    }
  },

  updateVehicle(updated: Vehicle): void {
    const vehicles = this.getVehicles();
    const index = vehicles.findIndex((vehicle) => vehicle.id === updated.id);

    if (index !== -1) {
      vehicles[index] = {
        ...updated,
        updatedAt: new Date().toISOString()
      };

      setSafeItem(KEYS.VEHICLES, vehicles);
    }
  },

  getTireRecords(): TireRecord[] {
    return getSafeItem<TireRecord[]>(KEYS.TIRE_RECORDS, []);
  },

  addTireRecord(record: TireRecord): void {
    const records = this.getTireRecords();
    records.push(record);
    setSafeItem(KEYS.TIRE_RECORDS, records);
  },

  updateTireRecord(updated: TireRecord): void {
    const records = this.getTireRecords();
    const index = records.findIndex((record) => record.id === updated.id);

    if (index !== -1) {
      records[index] = {
        ...updated,
        updatedAt: new Date().toISOString()
      };

      setSafeItem(KEYS.TIRE_RECORDS, records);
    }
  },

  deleteTireRecord(id: string): void {
    const records = this.getTireRecords();
    const filteredRecords = records.filter((record) => record.id !== id);

    setSafeItem(KEYS.TIRE_RECORDS, filteredRecords);
  },

  getBrands(): string[] {
    return getSafeItem<string[]>(KEYS.BRANDS, DEFAULT_BRANDS);
  },

  addBrand(brandName: string): void {
    const brands = this.getBrands();
    const trimmedName = brandName.trim();

    if (
      trimmedName &&
      !brands.some((brand) => brand.toLowerCase() === trimmedName.toLowerCase())
    ) {
      brands.push(trimmedName);
      brands.sort((a, b) => a.localeCompare(b, "tr"));
      setSafeItem(KEYS.BRANDS, brands);
    }
  },

  getSettings(): AppSettings {
    return getSafeItem<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
  },

  saveSettings(settings: AppSettings): void {
    setSafeItem(KEYS.SETTINGS, settings);
  },

  getSubscription(): UserSubscription {
    return getSafeItem<UserSubscription>(KEYS.SUBSCRIPTION, DEFAULT_SUBSCRIPTION);
  },

  saveSubscription(subscription: UserSubscription): void {
    setSafeItem(KEYS.SUBSCRIPTION, subscription);
  },

  activateSubscription(
    planId: SubscriptionPlanId,
    planName: string
  ): UserSubscription {
    const now = new Date();
    const renewalDate = new Date(now);
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    const subscription: UserSubscription = {
      id: `sub-${Date.now()}`,
      planId,
      planName,
      status: "active",
      isActive: true,
      startedAt: now.toISOString(),
      renewalDate: renewalDate.toISOString()
    };

    this.saveSubscription(subscription);
    return subscription;
  },

  cancelSubscription(): UserSubscription {
    const currentSubscription = this.getSubscription();

    const subscription: UserSubscription = {
      ...currentSubscription,
      status: "cancelled",
      isActive: false,
      cancelledAt: new Date().toISOString()
    };

    this.saveSubscription(subscription);
    return subscription;
  },

  incrementPrintCounter(): number {
    const count = getSafeItem<number>(KEYS.PRINT_COUNTER, 0);
    const newCount = count + 1;

    setSafeItem(KEYS.PRINT_COUNTER, newCount);

    return newCount;
  },

  getPrintCounter(): number {
    return getSafeItem<number>(KEYS.PRINT_COUNTER, 0);
  },

  getUsers(): AuthUser[] {
    return getSafeItem<AuthUser[]>(KEYS.USERS, []);
  },

  registerUser(user: AuthUser): void {
    const users = this.getUsers();

    const alreadyExists = users.some(
      (item) => item.email.toLowerCase() === user.email.toLowerCase()
    );

    if (!alreadyExists) {
      users.push(user);
      setSafeItem(KEYS.USERS, users);
    }
  },

  getCurrentUser(): AuthUser | null {
    const sessionUserId = getSafeItem<string | null>(KEYS.SESSION, null);

    if (!sessionUserId) {
      return null;
    }

    const users = this.getUsers();

    return users.find((user) => user.id === sessionUserId) || null;
  },

  login(userId: string): void {
    setSafeItem(KEYS.SESSION, userId);

    const users = this.getUsers();
    const user = users.find((item) => item.id === userId);

    if (user) {
      const currentConfig: AppSettings = {
        businessName: user.businessName,
        businessType: user.businessType || "Oto Lastik & Servis",
        phone: user.phone || "",
        address: user.address || ""
      };

      this.saveSettings(currentConfig);
    }
  },

  logout(): void {
    localStorage.removeItem(KEYS.SESSION);
  }
};