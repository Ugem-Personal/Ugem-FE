export type Application = {
  id: string;
  type?: string;
  status?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string | null;
  name?: string;
  description?: string;
  restaurantType?: string;
  mainDishType?: string;
  priceRange?: string;
  applicant?: {
    userId: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    avatarUrl: string | null;
  } | null;
  applicationMenus?: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    category?: string;
    price?: number;
  }[];
};
