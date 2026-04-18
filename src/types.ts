export type UserRole = 'donor' | 'ngo' | 'volunteer' | 'super_admin' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  location?: string;
  /** Permisos granulares solo para rol `admin` (delegados). */
  adminPermissions?: Record<string, boolean> | null;
}

export type DonationStatus = 'available' | 'reserved' | 'collected' | 'delivered' | 'expired' | 'cancel_pending' | 'cancelled';

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  title: string;
  description: string;
  quantity: string;
  expirationDate: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  status: DonationStatus;
  imageUrl?: string;
  createdAt: string;
  claimedBy?: string; // NGO ID
  claimedByName?: string; // NGO Name
  transportedBy?: string; // Volunteer ID
  cancelRequestedBy?: string; // User ID who requested cancellation
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  donationId: string;
  content: string;
  timestamp: string;
}
