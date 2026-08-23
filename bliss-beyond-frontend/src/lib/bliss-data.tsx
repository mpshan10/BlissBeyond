import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { packageCatalog } from "./package-catalog";

export type UserRole = "customer" | "admin";

export type UserAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
};

export type PackageItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  guestLimit: number;
  image: string;
  venueIds: string[];
  highlights: string[];
  serviceIds?: string[];
  prototypePath?: string;
};

export type VenueItem = {
  id: string;
  name: string;
  location: string;
  description: string;
  capacity: number;
  price: number;
  image: string;
  packageIds: string[];
  amenities: string[];
  serviceIds?: string[];
};

export type ServiceGroup = "special-set" | "beverage" | "tea" | "service";

export type ServiceItem = {
  id: string;
  group: ServiceGroup;
  name: string;
  description: string;
  price: number;
  image?: string;
};

export type BookingStatus = "Pending" | "Approved" | "Rejected" | "Cancelled" | "Confirmed";

export type BookingItem = {
  id: string;
  customerId: string;
  packageId: string;
  venueId: string;
  bookingDate: string;
  bookingTime: string;
  specialSetId: string;
  beverageId: string;
  teaId: string;
  serviceIds: string[];
  status: BookingStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type DraftBooking = {
  packageId: string | null;
  venueId: string | null;
  bookingDate: string;
  bookingTime: string;
  specialSetId: string | null;
  beverageId: string | null;
  teaId: string | null;
  serviceIds: string[];
};

type AppState = {
  users: UserAccount[];
  packages: PackageItem[];
  venues: VenueItem[];
  services: ServiceItem[];
  bookings: BookingItem[];
  sessionUserId: string | null;
  draft: DraftBooking;
  lastBookingId: string | null;
};

type AuthInput = { email: string; password: string };
type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
};
type PackageInput = Omit<PackageItem, "id"> & { id?: string };
type VenueInput = Omit<VenueItem, "id"> & { id?: string };
type ServiceInput = Omit<ServiceItem, "id"> & { id?: string };

type BlissContextValue = AppState & {
  currentUser: UserAccount | null;
  currentBooking: BookingItem | null;
  selectedPackage: PackageItem | null;
  selectedVenue: VenueItem | null;
  selectedSpecialSet: ServiceItem | null;
  selectedBeverage: ServiceItem | null;
  selectedTea: ServiceItem | null;
  selectedServices: ServiceItem[];
  availablePackages: PackageItem[];
  availableVenues: VenueItem[];
  login: (input: AuthInput) => { ok: true } | { ok: false; message: string };
  register: (input: RegisterInput) => { ok: true } | { ok: false; message: string };
  logout: () => void;
  setDraftDate: (date: string) => void;
  setDraftTime: (time: string) => void;
  choosePackage: (packageId: string) => { ok: true } | { ok: false; message: string };
  chooseVenue: (venueId: string) => { ok: true } | { ok: false; message: string };
  chooseSpecialSet: (serviceId: string) => void;
  chooseBeverage: (serviceId: string) => void;
  chooseTea: (serviceId: string) => void;
  toggleService: (serviceId: string) => void;
  resetDraft: () => void;
  confirmBooking: () => { ok: true; booking: BookingItem } | { ok: false; message: string };
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  cancelBooking: (bookingId: string) => void;
  upsertPackage: (input: PackageInput) => void;
  removePackage: (packageId: string) => void;
  upsertVenue: (input: VenueInput) => void;
  removeVenue: (venueId: string) => void;
  upsertService: (input: ServiceInput) => void;
  removeService: (serviceId: string) => void;
};

const STORAGE_KEY = "bliss-beyond:app-state:v1";
const EMPTY_DRAFT: DraftBooking = {
  packageId: null,
  venueId: null,
  bookingDate: "",
  bookingTime: "",
  specialSetId: null,
  beverageId: null,
  teaId: null,
  serviceIds: [],
};

const packageImage = "/prototype/assets/img/venue-2.jpg";
const gardenImage = "/prototype/assets/img/venue-1.jpg";
const cityImage = "/prototype/assets/img/venue-3.jpg";
const cateringImage = "/prototype/assets/img/catering.jpg";

const defaultUsers: UserAccount[] = [
  {
    id: "user-admin",
    firstName: "Bliss",
    lastName: "Admin",
    email: "admin@bliss.test",
    phone: "+94 77 000 0000",
    password: "blissadmin",
    role: "admin",
  },
  {
    id: "user-maya",
    firstName: "Maya",
    lastName: "Fernando",
    email: "maya@bliss.test",
    phone: "+94 77 111 1111",
    password: "bliss123",
    role: "customer",
  },
];

const defaultVenues: VenueItem[] = [
  {
    id: "venue-lumiere",
    name: "Lumière Ballroom",
    location: "Colombo 03",
    description:
      "Crystal chandeliers, marble foyer, and an in-house kitchen for polished indoor celebrations.",
    capacity: 400,
    price: 2400,
    image: packageImage,
    packageIds: ["pkg-eternal-vows", "pkg-confetti-bash", "pkg-executive-summit"],
    amenities: ["Air-conditioned hall", "Bridal suite", "Parking", "In-house kitchen"],
  },
  {
    id: "venue-willow",
    name: "Willow Garden Estate",
    location: "Kandy",
    description:
      "Two acres of manicured lawn with marquee options, ideal for romantic outdoor gatherings.",
    capacity: 300,
    price: 1850,
    image: gardenImage,
    packageIds: ["pkg-eternal-vows", "pkg-garden-whisper", "pkg-graduation-grand"],
    amenities: ["Garden lawn", "Marquee space", "Sunset ceremony", "Photo corners"],
  },
  {
    id: "venue-skyline",
    name: "Skyline Terrace",
    location: "Colombo 02",
    description: "Panoramic city views with lounge seating and a dramatic sunset skyline.",
    capacity: 180,
    price: 1600,
    image: cityImage,
    packageIds: ["pkg-golden-hour", "pkg-confetti-bash", "pkg-eternal-vows"],
    amenities: ["Rooftop deck", "Lounge seating", "Cocktail bar", "City view"],
  },
  {
    id: "venue-rose",
    name: "Rose Garden Pavilion",
    location: "Mount Lavinia",
    description: "Soft florals, warm light and a refined pavilion setting for intimate milestones.",
    capacity: 220,
    price: 1950,
    image: gardenImage,
    packageIds: ["pkg-garden-whisper", "pkg-royal-milestone", "pkg-graduation-grand"],
    amenities: ["Pavilion stage", "Floral arch", "Ceremony aisle", "Lawn access"],
  },
  {
    id: "venue-harbor",
    name: "Harbor Grand Hall",
    location: "Galle Road",
    description: "A polished hall for corporate events, graduations and formal dinners.",
    capacity: 260,
    price: 2100,
    image: packageImage,
    packageIds: ["pkg-executive-summit", "pkg-royal-milestone", "pkg-golden-hour"],
    amenities: ["AV-ready hall", "Conference seating", "Stage lighting", "Reception lounge"],
  },
];

const defaultPackages: PackageItem[] = [
  {
    id: "pkg-eternal-vows",
    name: "Eternal Vows",
    category: "Wedding",
    description:
      "Classic ballroom wedding with plated dining, floral styling and live coordination.",
    price: 12000,
    guestLimit: 250,
    image: packageImage,
    venueIds: ["venue-lumiere", "venue-willow", "venue-skyline"],
    highlights: ["Full-day planning", "Bridal floral suite", "Plated dinner", "Live band & MC"],
  },
  {
    id: "pkg-garden-whisper",
    name: "Garden Whisper",
    category: "Wedding",
    description: "Rustic outdoor wedding under soft lights with a relaxed elegant finish.",
    price: 8500,
    guestLimit: 150,
    image: gardenImage,
    venueIds: ["venue-willow", "venue-rose"],
    highlights: ["Marquee styling", "Farm-table buffet", "Acoustic duo", "Photo corner"],
  },
  {
    id: "pkg-golden-hour",
    name: "Golden Hour",
    category: "Engagement",
    description: "Sunset celebration with cocktails, ring-moment lighting and a rooftop mood.",
    price: 4200,
    guestLimit: 80,
    image: cityImage,
    venueIds: ["venue-skyline", "venue-harbor"],
    highlights: ["Rooftop styling", "Canapés", "Photographer", "Sunset moment"],
  },
  {
    id: "pkg-confetti-bash",
    name: "Confetti Bash",
    category: "Birthday",
    description:
      "A lively birthday package with playful décor, live stations and upbeat entertainment.",
    price: 2400,
    guestLimit: 60,
    image: cityImage,
    venueIds: ["venue-lumiere", "venue-skyline"],
    highlights: ["Theme décor", "Live food stations", "Custom cake", "DJ set"],
  },
  {
    id: "pkg-executive-summit",
    name: "Executive Summit",
    category: "Corporate",
    description: "Professional event setup for conferences, launches and corporate gatherings.",
    price: 6800,
    guestLimit: 200,
    image: packageImage,
    venueIds: ["venue-lumiere", "venue-harbor"],
    highlights: ["Stage setup", "AV support", "Branding area", "Networking lounge"],
  },
  {
    id: "pkg-graduation-grand",
    name: "Graduation Grand Ceremonies",
    category: "Graduation",
    description: "A polished graduation celebration with ceremony flow and family-friendly dining.",
    price: 5600,
    guestLimit: 180,
    image: gardenImage,
    venueIds: ["venue-willow", "venue-rose"],
    highlights: ["Ceremony seating", "Photography", "Buffet service", "Speaker system"],
  },
  {
    id: "pkg-royal-milestone",
    name: "Royal Milestone",
    category: "Anniversary",
    description: "Elegant milestone dining with refined florals, speeches and warm ambience.",
    price: 7400,
    guestLimit: 140,
    image: packageImage,
    venueIds: ["venue-rose", "venue-harbor"],
    highlights: ["Refined florals", "Anniversary cake", "Toast service", "Soft lighting"],
  },
];

const defaultServices: ServiceItem[] = [
  {
    id: "special-royal-feast",
    group: "special-set",
    name: "Royal Feast",
    description: "A premium plated menu with elegant presentation and richer menu pairings.",
    price: 65,
    image: cateringImage,
  },
  {
    id: "special-elegant-banquet",
    group: "special-set",
    name: "Elegant Banquet",
    description: "A classic special set with balanced courses for formal celebrations.",
    price: 45,
    image: cateringImage,
  },
  {
    id: "special-heritage-table",
    group: "special-set",
    name: "Heritage Table",
    description: "A warm local-inspired menu with familiar flavours and polished service.",
    price: 55,
    image: cateringImage,
  },
  {
    id: "beverage-sparkling",
    group: "beverage",
    name: "Sparkling Service",
    description: "Sparkling drinks and refined welcome service for the opening hour.",
    price: 12,
  },
  {
    id: "beverage-citrus",
    group: "beverage",
    name: "Citrus Breeze",
    description: "Refreshing citrus mocktails and juice-forward drinks.",
    price: 10,
  },
  {
    id: "beverage-coffee",
    group: "beverage",
    name: "Coffee & Tea Station",
    description: "Classic coffee service with a calm tea station for the full event.",
    price: 8,
  },
  {
    id: "beverage-welcome",
    group: "beverage",
    name: "Signature Welcome Drinks",
    description: "A presentation-led welcome drink bar with your chosen flavours.",
    price: 14,
  },
  {
    id: "tea-classic",
    group: "tea",
    name: "Classic Tea Service",
    description: "Traditional tea service with a clean, familiar presentation.",
    price: 9,
  },
  {
    id: "tea-afternoon",
    group: "tea",
    name: "Afternoon Tea Set",
    description: "A more elegant tea service with light bites and refined service.",
    price: 13,
  },
  {
    id: "tea-dessert",
    group: "tea",
    name: "Dessert Tea Pairing",
    description: "Tea service designed to complement desserts and after-dinner moments.",
    price: 11,
  },
  {
    id: "service-decoration",
    group: "service",
    name: "Decoration",
    description: "Theme styling for the room, tables and entrance.",
    price: 900,
    image: cateringImage,
  },
  {
    id: "service-floral",
    group: "service",
    name: "Floral Arrangements",
    description: "Bouquets, arches and centrepieces aligned to your event palette.",
    price: 450,
    image: cateringImage,
  },
  {
    id: "service-cake",
    group: "service",
    name: "Wedding Cake",
    description: "A custom celebration cake with flavour and design options.",
    price: 300,
    image: cateringImage,
  },
  {
    id: "service-photography",
    group: "service",
    name: "Photography",
    description: "Photography coverage for the important moments and family portraits.",
    price: 650,
    image: cateringImage,
  },
  {
    id: "service-videography",
    group: "service",
    name: "Videography",
    description: "Highlight and ceremony video coverage for the day.",
    price: 780,
  },
  {
    id: "service-entertainment",
    group: "service",
    name: "Entertainment",
    description: "DJ or live entertainment to keep the room moving.",
    price: 500,
  },
  {
    id: "service-sound",
    group: "service",
    name: "Sound System",
    description: "Reliable sound and microphone support throughout the event.",
    price: 380,
  },
  {
    id: "service-lighting",
    group: "service",
    name: "Lighting",
    description: "Ambient lighting and highlight effects for the stage and room.",
    price: 420,
  },
  {
    id: "service-table",
    group: "service",
    name: "Table Setup",
    description: "Table styling, linen and place setting coordination.",
    price: 260,
  },
  {
    id: "service-stage",
    group: "service",
    name: "Stage Decoration",
    description: "A refined stage backdrop and focal area for ceremonies.",
    price: 550,
  },
  {
    id: "service-invitation",
    group: "service",
    name: "Invitation Services",
    description: "Invitation layout, digital send-out and print coordination.",
    price: 180,
  },
  {
    id: "service-coordination",
    group: "service",
    name: "Event Coordination",
    description: "On-the-day coordination to keep the timeline on track.",
    price: 600,
  },
];

const defaultBookings: BookingItem[] = [
  {
    id: "booking-1",
    customerId: "user-maya",
    packageId: "pkg-eternal-vows",
    venueId: "venue-lumiere",
    bookingDate: "2026-09-20",
    bookingTime: "17:00",
    specialSetId: "special-royal-feast",
    beverageId: "beverage-sparkling",
    teaId: "tea-afternoon",
    serviceIds: ["service-decoration", "service-photography"],
    status: "Confirmed",
    total: 15027,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
];

function createInitialState(): AppState {
  return {
    users: defaultUsers,
    packages: defaultPackages,
    venues: defaultVenues,
    services: defaultServices,
    bookings: defaultBookings,
    sessionUserId: "user-maya",
    draft: {
      ...EMPTY_DRAFT,
      customerId: "user-maya",
    } as DraftBooking & { customerId?: string },
    lastBookingId: "booking-1",
  } as AppState;
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readStoredState(): AppState {
  if (typeof window === "undefined") {
    return createInitialState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...createInitialState(),
      ...parsed,
      draft: {
        ...EMPTY_DRAFT,
        ...(parsed.draft ?? {}),
        serviceIds: parsed.draft?.serviceIds ?? [],
      },
    };
  } catch {
    return createInitialState();
  }
}

function packagePrice(packages: PackageItem[], packageId: string | null): number {
  return packages.find((item) => item.id === packageId)?.price ?? 0;
}

function venuePrice(venues: VenueItem[], venueId: string | null): number {
  return venues.find((item) => item.id === venueId)?.price ?? 0;
}

function servicePrice(services: ServiceItem[], serviceId: string | null): number {
  return services.find((item) => item.id === serviceId)?.price ?? 0;
}

function calculateTotal(state: AppState, draft: DraftBooking): number {
  const base =
    packagePrice(state.packages, draft.packageId) +
    venuePrice(state.venues, draft.venueId) +
    servicePrice(state.services, draft.specialSetId) +
    servicePrice(state.services, draft.beverageId) +
    servicePrice(state.services, draft.teaId);
  const extras = draft.serviceIds.reduce((sum, id) => sum + servicePrice(state.services, id), 0);
  return base + extras;
}

function isBooked(state: AppState, venueId: string, bookingDate: string, bookingTime: string) {
  return state.bookings.some(
    (booking) =>
      booking.status !== "Cancelled" &&
      booking.bookingDate === bookingDate &&
      booking.bookingTime === bookingTime &&
      (booking.venueId === venueId || booking.packageId === venueId),
  );
}

function findCurrentUser(state: AppState) {
  return state.users.find((user) => user.id === state.sessionUserId) ?? null;
}

function initialDraftForUser(userId: string | null): DraftBooking {
  return {
    ...EMPTY_DRAFT,
    serviceIds: [],
  };
}

function packageAvailable(state: AppState, packageId: string, date: string, time: string) {
  const pkg = state.packages.find((item) => item.id === packageId);
  if (!pkg) {
    return false;
  }

  const venueAvailable = pkg.venueIds.some(
    (venueId) =>
      !state.bookings.some(
        (booking) =>
          booking.status !== "Cancelled" &&
          booking.bookingDate === date &&
          booking.bookingTime === time &&
          booking.venueId === venueId,
      ),
  );

  const packageConflict = state.bookings.some(
    (booking) =>
      booking.status !== "Cancelled" &&
      booking.bookingDate === date &&
      booking.bookingTime === time &&
      booking.packageId === packageId,
  );

  return venueAvailable && !packageConflict;
}

function venueAvailable(state: AppState, venueId: string, date: string, time: string) {
  return !state.bookings.some(
    (booking) =>
      booking.status !== "Cancelled" &&
      booking.bookingDate === date &&
      booking.bookingTime === time &&
      booking.venueId === venueId,
  );
}

const BlissContext = createContext<BlissContextValue | null>(null);

export function BlissProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(createInitialState);
  const currentUser = findCurrentUser(state);
  const selectedPackage = state.packages.find((item) => item.id === state.draft.packageId) ?? null;
  const selectedVenue = state.venues.find((item) => item.id === state.draft.venueId) ?? null;
  const selectedSpecialSet =
    state.services.find((item) => item.id === state.draft.specialSetId) ?? null;
  const selectedBeverage =
    state.services.find((item) => item.id === state.draft.beverageId) ?? null;
  const selectedTea = state.services.find((item) => item.id === state.draft.teaId) ?? null;
  const selectedServices = state.services.filter((item) =>
    state.draft.serviceIds.includes(item.id),
  );
  const currentBooking =
    state.bookings.find((booking) => booking.id === state.lastBookingId) ?? null;
  const availablePackages = useMemo(() => {
    const date = state.draft.bookingDate;
    const time = state.draft.bookingTime;
    if (!date || !time) {
      return state.packages;
    }
    return state.packages.filter((pkg) => packageAvailable(state, pkg.id, date, time));
  }, [state]);
  const availableVenues = useMemo(() => {
    const date = state.draft.bookingDate;
    const time = state.draft.bookingTime;
    if (!date || !time) {
      return state.draft.packageId
        ? state.venues.filter((venue) => selectedPackage?.venueIds.includes(venue.id))
        : state.venues;
    }
    return state.venues.filter((venue) => {
      const packageMatch = state.draft.packageId
        ? selectedPackage?.venueIds.includes(venue.id)
        : true;
      return packageMatch && venueAvailable(state, venue.id, date, time);
    });
  }, [state, selectedPackage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setState(readStoredState());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    setState((current) =>
      current.draft.packageId || current.draft.venueId || current.draft.bookingDate
        ? current
        : { ...current, draft: { ...current.draft } },
    );
  }, [currentUser]);

  const value: BlissContextValue = {
    ...state,
    currentUser,
    currentBooking,
    selectedPackage,
    selectedVenue,
    selectedSpecialSet,
    selectedBeverage,
    selectedTea,
    selectedServices,
    availablePackages,
    availableVenues,
    login: (input) => {
      const email = normalizeEmail(input.email);
      const user = state.users.find(
        (item) => item.email.toLowerCase() === email && item.password === input.password,
      );
      if (!user) {
        return { ok: false, message: "Invalid email or password." };
      }
      setState((current) => ({
        ...current,
        sessionUserId: user.id,
        draft: { ...current.draft },
      }));
      return { ok: true };
    },
    register: (input) => {
      const email = normalizeEmail(input.email);
      if (state.users.some((item) => item.email.toLowerCase() === email)) {
        return { ok: false, message: "That email is already registered." };
      }
      const user: UserAccount = {
        id: createId("user"),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email,
        phone: input.phone?.trim() || "",
        password: input.password,
        role: "customer",
      };
      setState((current) => ({
        ...current,
        users: [user, ...current.users],
        sessionUserId: user.id,
        draft: { ...current.draft },
      }));
      return { ok: true };
    },
    logout: () => {
      setState((current) => ({
        ...current,
        sessionUserId: null,
        draft: initialDraftForUser(null),
      }));
    },
    setDraftDate: (date) => {
      setState((current) => {
        const next = {
          ...current,
          draft: {
            ...current.draft,
            bookingDate: date,
          },
        };
        if (
          next.draft.venueId &&
          next.draft.bookingTime &&
          !venueAvailable(next, next.draft.venueId, date, next.draft.bookingTime)
        ) {
          next.draft.venueId = null;
        }
        return next;
      });
    },
    setDraftTime: (time) => {
      setState((current) => {
        const next = {
          ...current,
          draft: {
            ...current.draft,
            bookingTime: time,
          },
        };
        if (
          next.draft.venueId &&
          next.draft.bookingDate &&
          !venueAvailable(next, next.draft.venueId, next.draft.bookingDate, time)
        ) {
          next.draft.venueId = null;
        }
        return next;
      });
    },
    choosePackage: (packageId) => {
      const pkg = state.packages.find((item) => item.id === packageId);
      if (!pkg) {
        return { ok: false, message: "Package not found." };
      }
      if (
        state.draft.bookingDate &&
        state.draft.bookingTime &&
        !packageAvailable(state, packageId, state.draft.bookingDate, state.draft.bookingTime)
      ) {
        return { ok: false, message: "That package is already booked for the selected slot." };
      }
      setState((current) => {
        const nextDraft = {
          ...current.draft,
          packageId,
        };
        if (nextDraft.venueId && !pkg.venueIds.includes(nextDraft.venueId)) {
          nextDraft.venueId = null;
        }
        return {
          ...current,
          draft: nextDraft,
        };
      });
      return { ok: true };
    },
    chooseVenue: (venueId) => {
      const venue = state.venues.find((item) => item.id === venueId);
      if (!venue) {
        return { ok: false, message: "Venue not found." };
      }
      if (state.draft.packageId && !venue.packageIds.includes(state.draft.packageId)) {
        return { ok: false, message: "That venue is not compatible with the selected package." };
      }
      if (
        state.draft.bookingDate &&
        state.draft.bookingTime &&
        !venueAvailable(state, venueId, state.draft.bookingDate, state.draft.bookingTime)
      ) {
        return { ok: false, message: "That venue is already booked for the selected slot." };
      }
      setState((current) => ({
        ...current,
        draft: {
          ...current.draft,
          venueId,
        },
      }));
      return { ok: true };
    },
    chooseSpecialSet: (serviceId) => {
      setState((current) => ({
        ...current,
        draft: {
          ...current.draft,
          specialSetId: serviceId,
        },
      }));
    },
    chooseBeverage: (serviceId) => {
      setState((current) => ({
        ...current,
        draft: {
          ...current.draft,
          beverageId: serviceId,
        },
      }));
    },
    chooseTea: (serviceId) => {
      setState((current) => ({
        ...current,
        draft: {
          ...current.draft,
          teaId: serviceId,
        },
      }));
    },
    toggleService: (serviceId) => {
      setState((current) => ({
        ...current,
        draft: {
          ...current.draft,
          serviceIds: current.draft.serviceIds.includes(serviceId)
            ? current.draft.serviceIds.filter((id) => id !== serviceId)
            : [...current.draft.serviceIds, serviceId],
        },
      }));
    },
    resetDraft: () => {
      setState((current) => ({
        ...current,
        draft: initialDraftForUser(current.sessionUserId),
      }));
    },
    confirmBooking: () => {
      const user = findCurrentUser(state);
      if (!user) {
        return { ok: false, message: "Please sign in before confirming a booking." };
      }
      if (
        !state.draft.packageId ||
        !state.draft.venueId ||
        !state.draft.bookingDate ||
        !state.draft.bookingTime
      ) {
        return { ok: false, message: "Package, venue, date and time are required." };
      }
      const venue = state.venues.find((item) => item.id === state.draft.venueId);
      if (venue && !venue.packageIds.includes(state.draft.packageId)) {
        return { ok: false, message: "The selected venue does not support that package." };
      }
      if (
        !packageAvailable(
          state,
          state.draft.packageId,
          state.draft.bookingDate,
          state.draft.bookingTime,
        )
      ) {
        return { ok: false, message: "That package is no longer available for this slot." };
      }
      if (
        !venueAvailable(
          state,
          state.draft.venueId,
          state.draft.bookingDate,
          state.draft.bookingTime,
        )
      ) {
        return { ok: false, message: "That venue is no longer available for this slot." };
      }
      const total = calculateTotal(state, state.draft);
      const booking: BookingItem = {
        id: createId("booking"),
        customerId: user.id,
        packageId: state.draft.packageId,
        venueId: state.draft.venueId,
        bookingDate: state.draft.bookingDate,
        bookingTime: state.draft.bookingTime,
        specialSetId: state.draft.specialSetId ?? "",
        beverageId: state.draft.beverageId ?? "",
        teaId: state.draft.teaId ?? "",
        serviceIds: state.draft.serviceIds,
        status: "Pending",
        total,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setState((current) => ({
        ...current,
        bookings: [booking, ...current.bookings],
        draft: initialDraftForUser(current.sessionUserId),
        lastBookingId: booking.id,
      }));
      return { ok: true, booking };
    },
    updateBookingStatus: (bookingId, status) => {
      setState((current) => ({
        ...current,
        bookings: current.bookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status, updatedAt: new Date().toISOString() }
            : booking,
        ),
      }));
    },
    cancelBooking: (bookingId) => {
      setState((current) => ({
        ...current,
        bookings: current.bookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: "Cancelled", updatedAt: new Date().toISOString() }
            : booking,
        ),
      }));
    },
    upsertPackage: (input) => {
      const id = input.id ?? createId("pkg");
      setState((current) => {
        const nextPackage: PackageItem = { ...input, id };
        const exists = current.packages.some((item) => item.id === id);
        return {
          ...current,
          packages: exists
            ? current.packages.map((item) => (item.id === id ? nextPackage : item))
            : [nextPackage, ...current.packages],
        };
      });
    },
    removePackage: (packageId) => {
      setState((current) => ({
        ...current,
        packages: current.packages.filter((item) => item.id !== packageId),
        bookings: current.bookings.filter((booking) => booking.packageId !== packageId),
        draft:
          current.draft.packageId === packageId
            ? { ...current.draft, packageId: null, venueId: null }
            : current.draft,
      }));
    },
    upsertVenue: (input) => {
      const id = input.id ?? createId("venue");
      setState((current) => {
        const nextVenue: VenueItem = { ...input, id };
        const exists = current.venues.some((item) => item.id === id);
        return {
          ...current,
          venues: exists
            ? current.venues.map((item) => (item.id === id ? nextVenue : item))
            : [nextVenue, ...current.venues],
        };
      });
    },
    removeVenue: (venueId) => {
      setState((current) => ({
        ...current,
        venues: current.venues.filter((item) => item.id !== venueId),
        bookings: current.bookings.filter((booking) => booking.venueId !== venueId),
        draft:
          current.draft.venueId === venueId ? { ...current.draft, venueId: null } : current.draft,
      }));
    },
    upsertService: (input) => {
      const id = input.id ?? createId("service");
      setState((current) => {
        const nextService: ServiceItem = { ...input, id };
        const exists = current.services.some((item) => item.id === id);
        return {
          ...current,
          services: exists
            ? current.services.map((item) => (item.id === id ? nextService : item))
            : [nextService, ...current.services],
        };
      });
    },
    removeService: (serviceId) => {
      setState((current) => ({
        ...current,
        services: current.services.filter((item) => item.id !== serviceId),
        draft: {
          ...current.draft,
          specialSetId:
            current.draft.specialSetId === serviceId ? null : current.draft.specialSetId,
          beverageId: current.draft.beverageId === serviceId ? null : current.draft.beverageId,
          teaId: current.draft.teaId === serviceId ? null : current.draft.teaId,
          serviceIds: current.draft.serviceIds.filter((item) => item !== serviceId),
        },
      }));
    },
  };

  return <BlissContext.Provider value={value}>{children}</BlissContext.Provider>;
}

export function useBliss() {
  const context = useContext(BlissContext);
  if (!context) {
    throw new Error("useBliss must be used inside BlissProvider");
  }
  return context;
}

export function useBookingPricing() {
  const { draft, packages, venues, services } = useBliss();
  return useMemo(
    () =>
      calculateTotal(
        {
          packages,
          venues,
          services,
          bookings: [],
          users: [],
          sessionUserId: null,
          draft,
          lastBookingId: null,
        },
        draft,
      ),
    [draft, packages, venues, services],
  );
}

export const blissAssets = {
  packageImage,
  gardenImage,
  cityImage,
  cateringImage,
};
