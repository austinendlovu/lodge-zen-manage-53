export type UserRole = "ADMIN" | "RECEPTIONIST" | "USER" | "CLEANER";

// Updated to match the actual case used in the API responses
export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "CLEANING" | "RESERVED" | "available" | "occupied" | "cleaning" | "reserved";

export type RoomType = "standard" | "deluxe" | "suite";

export type BookingDuration = "hourly" | "daily" | "overnight";

export type PaymentMethod = "cash" | "ecocash" | "card";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

export interface RoomCategory {
  id: number;
  name: string;
  description: string;
}

export interface Room {
  id: number | string;
  roomNumber: string;
  status: string;
  floor: number;
  specialFeatures?: string;
  lastCleanedAt?: string;
  category?: {
    id: number;
    name: string;
  };
  baseHourlyRate?: number;
  baseDailyRate?: number;
  baseOvernightRate?: number;
  // Add compatibility with older code
  pricePerHour?: number;
  pricePerDay?: number;
  priceOvernight?: number;
}

export interface Guest {
  id: string;
  name: string;
  idNumber: string;
  contact: string;
  email?: string;
}

export interface Booking {
  id: string;
  roomId: string;
  guestId: string;
  checkInDate: Date;
  checkOutDate?: Date;
  duration: BookingDuration;
  status: "pending" | "checked-in" | "checked-out" | "canceled";
  totalPrice: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: "paid" | "pending" | "partial";
  notes?: string;
  createdBy: string;
  bookingCode?: string; // Added for booking code functionality
}

export interface BookingRequest {
  roomId: string;
  guestName: string;
  email: string;
  phoneNumber: string;
  bookingType: string;
  date: string;
  startTime: string;
  durationHours: number;
  paymentMethod: string;
  status: string;
}

export interface BookingResponse {
  id: string;
  bookingCode: string;
  guestName: string;
  room: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

export interface BookingTimeInfo {
  bookingId: string;
  remainingTime: string;
  isOverdue: boolean;
  originalEndTime: string;
}
