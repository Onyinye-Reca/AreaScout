export type Role = 'tenant' | 'landlord' | 'agent' | 'admin';
export type Grade = 'Good' | 'Fair' | 'Poor' | 'No data';

export interface User { id: number; name: string; email: string; phone: string; role: Role; verified: boolean }

export interface Listing {
  id: number; owner_id: number; title: string; description: string; address: string;
  property_type: string; bedrooms: number; bathrooms: number;
  rent: number; rent_period: string;
  agency_fee: number; legal_fee: number; caution_deposit: number; service_charge: number; utilities: number;
  features: string[]; photos: string[]; verified: boolean; status: ListingStatus;
  created_at: string; updated_at: string;
  area: string; area_slug: string; city: string; owner_name: string; owner_verified: boolean;
  move_in_total: number;
  /** Only present on the lister's own listings. */
  stats?: ListingStats;
  /** Only on the single-listing endpoint. */
  owner_rating?: { average: number | null; count: number };
  /** Only for signed-in renters, and only when the lister has added a number. */
  owner_phone?: string | null;
}

export interface Area {
  id: number; slug: string; name: string; city: string; description: string;
  power: Grade; flooding: Grade; security: Grade; water: Grade; transport: Grade; internet: Grade;
  score: number; listing_count: number; community_reports: number;
  rating_averages: Partial<Record<'power' | 'flooding' | 'security' | 'water' | 'transport' | 'internet', number>>;
  updated_at: string;
}

export interface SavedSearch {
  id: number; name: string; alerts: boolean; created_at: string; match_count: number; new_count: number;
  filters: { q?: string; type?: string; beds?: number; min_rent?: number; max_rent?: number; verified?: '1' | 'true'; area?: string; city?: string };
}

export interface Preferences { inspection_updates: boolean; messages: boolean; saved_search_alerts: boolean; area_report_updates: boolean }

export interface CityInfo { city: string; area_count: number; listing_count: number }

export interface AreaReviewItem {
  id: number; comment: string; created_at: string; reviewer: string;
}

export type ListingStatus = 'draft' | 'pending' | 'live' | 'rejected' | 'removed';

export interface Dashboard {
  live_listings: number; pending_review: number; drafts: number;
  pending_inspections: number; upcoming_inspections: number;
  unanswered_messages: number; oldest_unanswered_at: string | null;
}

export interface ListingStats { views: number; saves: number; inquiries: number }

export interface AdminDashboard {
  open_reports: number; urgent_reports: number; pending_listings: number; live_listings: number;
  pending_area_reviews: number; resolved_this_week: number; users: number;
}

export type ReportReason = 'inaccurate' | 'scam' | 'unavailable' | 'duplicate' | 'other';
export interface ReportGroup {
  listing_id: number; listing_title: string; rent: number; photo: string | null;
  listing_status: ListingStatus; hidden_by_reports: boolean;
  report_count: number; reporters: number; oldest_at: string; urgent: boolean; reasons: ReportReason[];
  owner: { id: number; name: string; role: Role; verified: boolean; suspended: boolean; account_age_days: number; listing_count: number; past_reports: number };
  reports: { id: number; reason: ReportReason; details: string; status: string; created_at: string }[];
}

export interface AdminListing extends Listing { flags: { type: 'duplicate' | 'low_price'; detail: string }[] }
export interface AdminUser {
  id: number; name: string; email: string; role: Role; verified: boolean; suspended: boolean; created_at: string; listing_count: number;
}
export interface PendingAreaReview {
  id: number; area: string; reviewer: string; comment: string; created_at: string;
  power: number | null; flooding: number | null; security: number | null; water: number | null; transport: number | null; internet: number | null;
}

export interface Inspection {
  id: number; listing_id: number; listing_title?: string; tenant_name?: string; tenant_id?: number; requested_at: string; note: string;
  status: 'pending' | 'confirmed' | 'declined' | 'new_time' | 'cancelled'; owner_note: string;
  owner_name?: string; can_review?: boolean; reviewed?: boolean;
}

export interface ConversationSummary {
  id: number; listing_id: number; listing_title: string; with: string; last_message: string; unread: number; updated_at: string;
}
export interface Message { id: number; sender_id: number; body: string; created_at: string; read_at: string | null }

export interface Filters { type?: string; beds?: number; minRent?: number; maxRent?: number; verified?: boolean; q?: string; area?: string }
