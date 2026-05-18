export interface VehicleCompatibilityEntry {
  make: string;
  model: string;
  years: number[];
  notes?: string;
}

export interface VehicleCompatibility {
  vehicles: VehicleCompatibilityEntry[];
}
