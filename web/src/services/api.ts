import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

export interface TransactionQueryParams {
  town?: string;
  flatType?: string;
  storeyRange?: string;
  minPrice?: number;
  maxPrice?: number;
  minLeaseMonths?: number;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface ResaleTransaction {
  id: string;
  month: string;
  town: string;
  flatType: string;
  block: string;
  streetName: string;
  storeyRange: string;
  floorAreaSqm: number;
  flatModel: string;
  leaseCommenceDate: number;
  remainingLeaseRaw: string;
  remainingLeaseMonths: number;
  resalePrice: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Metadata {
  towns: string[];
  flatTypes: string[];
  storeyRanges: string[];
  priceRange: { min: number; max: number };
  leaseMonthsRange: { min: number; max: number };
}

export interface AvgPriceByTown {
  town: string;
  avgPrice: number;
  count: number;
}

export interface PriceTrendPoint {
  month: string;
  avgPrice: number;
  count: number;
}

export interface PriceVsLeaseBand {
  leaseBand: string;
  avgPrice: number;
  count: number;
}

export const api = {
  getTransactions: (params: TransactionQueryParams = {}) =>
    apiClient.get<PaginatedResponse<ResaleTransaction>>('/resale-flats', { params }).then((res) => res.data),

  getMetadata: () => apiClient.get<Metadata>('/resale-flats/metadata').then((res) => res.data),

  getAvgPriceByTown: () =>
    apiClient.get<AvgPriceByTown[]>('/resale-flats/insights/avg-price-by-town').then((res) => res.data),

  getPriceTrend: (params: { town?: string; flatType?: string }) =>
    apiClient
      .get<PriceTrendPoint[]>('/resale-flats/insights/price-trend', { params })
      .then((res) => res.data),

  getPriceVsLease: () =>
    apiClient.get<PriceVsLeaseBand[]>('/resale-flats/insights/price-vs-lease').then((res) => res.data),
};
