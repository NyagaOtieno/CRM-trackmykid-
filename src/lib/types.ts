// USERS
export interface User {
  id: number;
  name: string;
  email: string;
  role: string; // "admin" | "staff"
}

// CUSTOMERS
export interface Customer {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt?: string;
  updatedAt?: string;
}

// VEHICLES
export interface Vehicle {
  id: number;
  plate: string;
  model: string;
  customerId: number;
  createdAt?: string;
  updatedAt?: string;
}

// DEVICES (GPS devices)
export interface Device {
  id: number;
  imei: string;
  simNumber: string;
  status: "active" | "inactive" | "installed";
  vehicleId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// JOBS (installation jobs)
export interface Job {
  id: number;
  customerId: number;
  vehicleId: number;
  deviceId: number;
  technician: string;
  jobDate: string;
  status: "pending" | "completed" | "cancelled";
  createdAt?: string;
  updatedAt?: string;
}

// SUBSCRIPTIONS (tracking subscription)
export interface Subscription {
  id: number;
  customerId: number;
  deviceId: number;
  amount: number;
  period: "monthly" | "annual";
  startDate: string;
  endDate: string;
  status: "active" | "expired";
  createdAt?: string;
  updatedAt?: string;
}
