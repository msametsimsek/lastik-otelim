import { Customer, Vehicle, TireRecord } from "../types";

// Base64-like SVG template for an interactive placeholder image
const WHEEL_SVG_GREEN = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%"><rect width="100%" height="100%" fill="%23f1f5f9"/><circle cx="60" cy="60" r="45" fill="none" stroke="%233b82f6" stroke-width="14"/><circle cx="60" cy="60" r="45" fill="none" stroke="%231e3a8a" stroke-width="4" stroke-dasharray="10 5"/><circle cx="60" cy="60" r="20" fill="none" stroke="%233b82f6" stroke-width="2"/><circle cx="60" cy="60" r="8" fill="%231d4ed8"/><path d="M60 15 L60 105 M15 60 L105 60" stroke="%231e3a8a" stroke-width="2"/><text x="60" y="115" font-family="sans-serif" font-size="9" fill="%2364748b" text-anchor="middle">LASTIK TAKIP</text></svg>`;

const WHEEL_SVG_ORANGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%"><rect width="100%" height="100%" fill="%23fcf6f0"/><circle cx="60" cy="60" r="45" fill="none" stroke="%23f97316" stroke-width="12"/><circle cx="60" cy="60" r="30" fill="none" stroke="%237c2d12" stroke-width="3" stroke-dasharray="8 6"/><circle cx="60" cy="60" r="12" fill="none" stroke="%23f97316" stroke-width="2"/><circle cx="60" cy="60" r="5" fill="%23c2410c"/><path d="M60 15 L60 105 M15 60 L105 60" stroke="%237c2d12" stroke-width="2"/><text x="60" y="115" font-family="sans-serif" font-size="9" fill="%239a3412" text-anchor="middle">KISLIK SET</text></svg>`;

export const DEMO_CUSTOMERS: Customer[] = [
  {
    id: "cust-1",
    fullName: "Fatih Çenesiz",
    phone: "055123414",
    createdAt: "2026-05-15T09:30:00Z"
  },
  {
    id: "cust-2",
    fullName: "Süleyman Demir",
    phone: "05329876543",
    createdAt: "2026-05-18T14:15:00Z"
  },
  {
    id: "cust-3",
    fullName: "Mehmet Kaya",
    phone: "05051112233",
    createdAt: "2026-05-22T10:00:00Z"
  },
  {
    id: "cust-4",
    fullName: "Ayşe Yılmaz",
    phone: "05445556677",
    createdAt: "2026-05-28T16:45:00Z"
  }
];

export const DEMO_VEHICLES: Vehicle[] = [
  {
    id: "veh-1",
    customerId: "cust-1",
    plate: "19AFC353",
    createdAt: "2026-05-15T09:30:00Z"
  },
  {
    id: "veh-2",
    customerId: "cust-2",
    plate: "34AB7890",
    createdAt: "2026-05-18T14:15:00Z"
  },
  {
    id: "veh-3",
    customerId: "cust-3",
    plate: "06ANK06",
    createdAt: "2026-05-22T10:00:00Z"
  },
  {
    id: "veh-4",
    customerId: "cust-4",
    plate: "35SMT99",
    createdAt: "2026-05-28T16:45:00Z"
  }
];

export const DEMO_TIRE_RECORDS: TireRecord[] = [
  {
    id: "rec-1",
    customerId: "cust-1",
    vehicleId: "veh-1",
    tireCode: "LT-2026-10394",
    tireType: "Kışlık",
    brand: "Petlas",
    size: "225/45/17",
    quantity: 4,
    storageLocation: "A5-3",
    photos: [
      {
        id: "p1",
        name: "petlas_kislik_1.jpg",
        type: "image/svg+xml",
        dataUrl: WHEEL_SVG_ORANGE
      }
    ],
    createdAt: "2026-05-15T09:35:00Z"
  },
  {
    id: "rec-2",
    customerId: "cust-2",
    vehicleId: "veh-2",
    tireCode: "LT-2026-39622",
    tireType: "Yazlık",
    brand: "Michelin",
    size: "205/55 R16",
    quantity: 4,
    storageLocation: "B2-1",
    photos: [
      {
        id: "p2",
        name: "michelin_primacy.jpg",
        type: "image/svg+xml",
        dataUrl: WHEEL_SVG_GREEN
      }
    ],
    createdAt: "2026-05-18T14:20:00Z"
  },
  {
    id: "rec-3",
    customerId: "cust-3",
    vehicleId: "veh-3",
    tireCode: "LT-2026-88412",
    tireType: "4 Mevsim",
    brand: "Continental",
    size: "195/65 R15",
    quantity: 4,
    storageLocation: "C1-4",
    photos: [],
    createdAt: "2026-05-22T10:05:00Z"
  },
  {
    id: "rec-4",
    customerId: "cust-4",
    vehicleId: "veh-4",
    tireCode: "LT-2026-000123",
    tireType: "Kışlık",
    brand: "Bridgestone",
    size: "245/40 R18",
    quantity: 4,
    storageLocation: "A3-9",
    photos: [
      {
        id: "p3",
        name: "bridgestone_blizzak.jpg",
        type: "image/svg+xml",
        dataUrl: WHEEL_SVG_ORANGE
      }
    ],
    createdAt: "2026-05-28T16:50:00Z"
  }
];
