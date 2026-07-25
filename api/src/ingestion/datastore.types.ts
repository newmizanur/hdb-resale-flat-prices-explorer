export interface DatastoreRecord {
  month: string;
  town: string;
  flat_type: string;
  block: string;
  street_name: string;
  storey_range: string;
  floor_area_sqm: string;
  flat_model: string;
  lease_commence_date: string;
  remaining_lease: string;
  resale_price: string;
}

export interface DatastoreResponse {
  success: boolean;
  result: {
    records: DatastoreRecord[];
    total: number;
  };
}
