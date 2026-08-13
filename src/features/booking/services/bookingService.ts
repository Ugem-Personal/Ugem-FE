import { api } from "@/lib/axios";

export interface Booking {
  id: string;
  customerId: string;
  merchantId: string;
  bookingAt: string;
  partySize: number;
  note?: string;
  status: "Pending" | "Accepted" | "Rejected" | "Cancelled" | "Completed";
  rejectionReason?: string;
  createdAt: string;
  merchant?: {
    id: string;
    name: string;
    logoUrl?: string;
    address: string;
    phone: string;
  };
  customer?: {
    id: string;
    user: {
      fullName: string;
      email: string;
      phoneNumber?: string;
      avatarUrl?: string;
    };
  };
}

export interface CreateBookingData {
  merchantId: string;
  bookingAt: string;
  partySize: number;
  note?: string;
}

export async function createBooking(data: CreateBookingData): Promise<Booking> {
  const response = await api.post("/bookings", data);
  return response.data.data;
}

export async function getMyBookings(): Promise<Booking[]> {
  const response = await api.get("/bookings/my-bookings");
  return response.data.data;
}

export async function cancelBooking(id: string): Promise<Booking> {
  const response = await api.patch(`/bookings/${id}/cancel`);
  return response.data.data;
}

export async function getMerchantBookings(): Promise<Booking[]> {
  const response = await api.get("/bookings/merchant-bookings");
  return response.data.data;
}

export async function reviewBooking(
  id: string,
  data: { status: "Accepted" | "Rejected"; rejectionReason?: string },
): Promise<Booking> {
  const response = await api.patch(`/bookings/${id}/status`, data);
  return response.data.data;
}
