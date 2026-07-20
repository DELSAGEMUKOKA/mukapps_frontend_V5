import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/core/api/axiosConfig';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type DossierType = 'IMPORT' | 'EXPORT' | 'TRANSIT';
export type TransportMode = 'SEA' | 'AIR' | 'ROAD' | 'RAIL' | 'MULTIMODAL';
export type DossierStatus =
  | 'DRAFT' | 'CONFIRMED' | 'BOOKING_PLACED' | 'GOODS_READY'
  | 'CUSTOMS_EXPORT' | 'IN_TRANSIT' | 'ARRIVED' | 'CUSTOMS_IMPORT'
  | 'DELIVERED' | 'CLOSED' | 'CANCELLED';
export type Incoterm = 'EXW' | 'FCA' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP' | 'FAS' | 'FOB' | 'CFR' | 'CIF';
export type CarrierType = 'SHIPPING_LINE' | 'AIR_CARRIER' | 'ROAD_CARRIER' | 'RAIL_CARRIER' | 'FREIGHT_FORWARDER' | 'CUSTOMS_BROKER';
export type CostCategory = 'FREIGHT' | 'CUSTOMS' | 'HANDLING' | 'INSURANCE' | 'STORAGE' | 'DEMURRAGE' | 'AGENT_FEE' | 'OTHER';
export type CustomsDeclarationType = 'IMPORT_DECLARATION' | 'EXPORT_DECLARATION' | 'TRANSIT_DECLARATION' | 'TEMPORARY_ADMISSION';
export type CustomsStatus = 'PENDING' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
export type ContainerStatus =
  | 'DRAFT' | 'BOOKED' | 'LOADED' | 'AT_ORIGIN' | 'IN_TRANSIT'
  | 'AT_PORT' | 'CUSTOMS' | 'INLAND_TRANSPORT' | 'ARRIVED' | 'DELIVERED' | 'CLOSED';
export type ContainerType = 'DRY_20' | 'DRY_40' | 'DRY_40HC' | 'REEFER_20' | 'REEFER_40' | 'OPEN_TOP' | 'FLAT_RACK' | 'TANK';
export type VehicleStatus = 'AVAILABLE' | 'ON_DELIVERY' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
export type VehicleType = 'TRUCK' | 'VAN' | 'MOTORCYCLE' | 'PICKUP' | 'TRAILER' | 'OTHER';
export type DeliveryStatus = 'PLANNED' | 'DEPARTED' | 'ARRIVED' | 'CANCELLED';
export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
export type WarehouseType = 'MAIN' | 'TRANSIT' | 'PORT' | 'CUSTOMS' | 'STORE';
export type LcType = 'DOCUMENTARY_CREDIT' | 'STANDBY' | 'REVOLVING' | 'BACK_TO_BACK';
export type LcStatus = 'DRAFT' | 'ISSUED' | 'CONFIRMED' | 'AMENDED' | 'UTILIZED' | 'EXPIRED' | 'CANCELLED';
export type GuaranteeType = 'PERFORMANCE' | 'ADVANCE_PAYMENT' | 'BID_BOND' | 'PAYMENT' | 'RETENTION';
export type GuaranteeStatus = 'ACTIVE' | 'CLAIMED' | 'EXPIRED' | 'RELEASED';
export type InsuranceCoverageType = 'ALL_RISK' | 'BASIC' | 'WAR_RISK' | 'TOTAL_LOSS';
export type InsuranceStatus = 'ACTIVE' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
export type GpsSource = 'TRACCAR' | 'MANUAL' | 'APP';
export type ExchangeRateSource = 'MANUAL' | 'BCC' | 'BCE' | 'API';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Carrier {
  id: string;
  name: string;
  type?: CarrierType;
  code?: string;
  country?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Dossier {
  id: string;
  reference: string;
  type: DossierType;
  status: DossierStatus;
  transportMode?: TransportMode;
  incoterm?: Incoterm;
  currency?: string;
  originCountry?: string;
  originPort?: string;
  destCountry?: string;
  destPort?: string;
  etd?: string;
  eta?: string;
  atd?: string;
  ata?: string;
  totalWeight?: number;
  totalVolume?: number;
  declaredValue?: number;
  notes?: string;
  carrier?: { id: string; name: string; type?: CarrierType };
  shipperId?: string;
  consigneeId?: string;
  forwarderId?: string;
  _count?: { items: number; documents: number; costs: number };
  createdAt: string;
}

export interface DossierItem {
  id: string;
  description: string;
  hsCode?: string;
  quantity: number;
  unit?: string;
  unitValue: number;
  totalValue: number;
  countryOfOrigin?: string;
  productId?: string | null;
  createdAt: string;
}

export interface DossierDocument {
  id: string;
  type?: string;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  createdAt: string;
}

export interface DossierCost {
  id: string;
  category: CostCategory;
  description?: string;
  currency: string;
  amount: number;
  invoiceRef?: string;
  isPaid: boolean;
  paidAt?: string | null;
  supplierId?: string | null;
}

export interface CostsSummary {
  byCategory: Record<string, number>;
  totalPaid: number;
  totalUnpaid: number;
  grandTotal: number;
}

export interface CustomsDeclaration {
  id: string;
  declarationType: CustomsDeclarationType;
  declarationNo?: string;
  regime?: string;
  customsOffice?: string;
  customsDuty?: number;
  vat?: number;
  excise?: number;
  otherTaxes?: number;
  totalTaxes?: number;
  status: CustomsStatus;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

export interface TrackingEvent {
  id: string;
  eventDate: string;
  location?: string;
  status?: string;
  description?: string;
  createdAt: string;
}

export interface ContainerItem {
  id: string;
  description: string;
  quantity?: number;
  unit?: string;
  unitValue?: number;
  weight?: number;
  notes?: string;
}

export interface Container {
  id: string;
  containerNumber?: string;
  type?: ContainerType;
  status: ContainerStatus;
  sealNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  originPort?: string;
  destinationPort?: string;
  currentLocation?: string;
  eta?: string;
  arrivedAt?: string | null;
  deliveredAt?: string | null;
  weight?: number;
  volume?: number | null;
  notes?: string | null;
  items?: ContainerItem[];
  createdAt: string;
}

export interface ContainerSummary {
  total: number;
  arrived: number;
  inTransit: number;
  inCustoms: number;
  pending: number;
  byStatus: Record<string, number>;
  globalStatus: 'NO_CONTAINERS' | 'PENDING' | 'IN_TRANSIT' | 'PARTIALLY_RECEIVED' | 'ALL_RECEIVED';
}

export interface Warehouse {
  id: string;
  name: string;
  type?: WarehouseType;
  address?: string;
  city?: string;
  country?: string;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface WarehouseTransfer {
  id: string;
  fromWarehouse?: { id: string; name: string; city?: string } | null;
  toWarehouse: { id: string; name: string; city?: string };
  transferDate?: string;
  status: TransferStatus;
  notes?: string | null;
  createdAt: string;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  licenseNumber?: string;
  licenseType?: string;
  isActive: boolean;
  vehicles?: { id: string; plateNumber: string; type?: VehicleType; status: VehicleStatus }[];
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  type?: VehicleType;
  brand?: string;
  model?: string;
  year?: number;
  capacity?: number;
  status: VehicleStatus;
  isActive: boolean;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  lastSeenAt?: string | null;
  driver?: { id: string; firstName: string; lastName: string; phone?: string } | null;
}

export interface GpsPosition {
  id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  source?: GpsSource;
  recordedAt: string;
}

export interface Delivery {
  id: string;
  origin?: string;
  destination?: string;
  scheduledAt?: string;
  status: DeliveryStatus;
  departedAt?: string | null;
  arrivedAt?: string | null;
  fuelCost?: number | null;
  distanceKm?: number | null;
  vehicle?: { id: string; plateNumber: string; type?: VehicleType };
  driver?: { id: string; firstName: string; lastName: string; phone?: string };
}

export interface Tariff {
  id: string;
  hsCode: string;
  description: string;
  importDutyRate?: number;
  vatRate?: number;
  exciseRate?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source?: ExchangeRateSource;
  validFrom?: string;
  validTo?: string | null;
  isActive: boolean;
}

export interface Insurance {
  id: string;
  insurer: string;
  policyNumber?: string;
  coverageType?: InsuranceCoverageType;
  insuredValue: number;
  currency?: string;
  premium: number;
  startDate?: string;
  endDate?: string;
  status: InsuranceStatus;
  claimAmount?: number | null;
  notes?: string | null;
}

export interface LetterOfCredit {
  id: string;
  lcNumber?: string;
  type?: LcType;
  issuingBank: string;
  beneficiary: string;
  currency?: string;
  amount: number;
  expiryDate?: string;
  shipmentDeadline?: string;
  status: LcStatus;
  terms?: string;
  notes?: string | null;
}

export interface BankGuarantee {
  id: string;
  guaranteeNumber?: string;
  type?: GuaranteeType;
  bank: string;
  beneficiary: string;
  currency?: string;
  amount: number;
  expiryDate?: string;
  status: GuaranteeStatus;
  dossierId?: string | null;
  notes?: string | null;
}

export interface LogisticsDashboard {
  overview: { totalDossiers: number; activeDossiers: number; overdueDossiers: number };
  dossiersByStatus: { status: DossierStatus; count: number }[];
  dossiersByType: { type: DossierType; count: number }[];
  costs: { monthTotal: number; monthCount: number; unpaidTotal: number; unpaidCount: number };
  containers: { total: number; arrived: number; inTransit: number; inCustoms: number; pending: number; byStatus: { status: string; _count: { _all: number } }[] };
  vehicles: { total: number; available: number; onDelivery: number; byStatus: { status: string; _count: { _all: number } }[] };
  recentDossiers: Dossier[];
  alerts: { etaOverdue: AlertItem[]; pendingCustoms: AlertItem[]; unpaidCosts: AlertItem[] };
}

export interface AlertItem {
  type: string;
  dossierId?: string;
  declarationId?: string;
  costId?: string;
  reference?: string;
  eta?: string;
  status?: string;
  amount?: number;
  currency?: string;
}

// ─── API helper ───────────────────────────────────────────────────────────────

interface ApiResponse<T> { success: boolean; message: string; data: T }
const unwrap = async <T>(p: Promise<ApiResponse<T>>): Promise<T> => (await p).data;
const B = '/logistics';

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const logisticsDashboardApi = {
  get: () => unwrap(apiGet<ApiResponse<LogisticsDashboard>>(`${B}/dashboard`)),
  getActive: () => unwrap(apiGet<ApiResponse<Dossier[]>>(`${B}/dashboard/active`)),
  getAlerts: () => unwrap(apiGet<ApiResponse<{ etaOverdue: AlertItem[]; pendingCustoms: AlertItem[]; unpaidCosts: AlertItem[] }>>(`${B}/dashboard/alerts`)),
  getReports: (params?: { startDate?: string; endDate?: string }) =>
    unwrap(apiGet<ApiResponse<{ dossiers: Dossier[]; costsByCategory: { category: string; total: number; count: number }[]; carrierPerformance: { carrierId: string; _count: { id: number } }[] }>>(`${B}/dashboard/reports`, params as Record<string, unknown>)),
};

// ─── Dossiers ─────────────────────────────────────────────────────────────────

export const logisticsDossiersApi = {
  getAll: (params?: { page?: number; limit?: number; type?: DossierType; status?: DossierStatus; transportMode?: TransportMode; search?: string }) =>
    unwrap(apiGet<ApiResponse<{ dossiers: Dossier[]; total: number; page: number; limit: number }>>(`${B}/dossiers`, params as Record<string, unknown>)),
  getById: (id: string) => unwrap(apiGet<ApiResponse<Dossier & { items: DossierItem[]; customs: CustomsDeclaration[]; documents: DossierDocument[]; costs: DossierCost[]; tracking: TrackingEvent[] }>>(`${B}/dossiers/${id}`)),
  create: (data: Partial<Dossier> & { carrierId?: string }) => unwrap(apiPost<ApiResponse<Dossier>>(`${B}/dossiers`, data)),
  update: (id: string, data: Partial<Dossier> & { carrierId?: string }) => unwrap(apiPut<ApiResponse<Dossier>>(`${B}/dossiers/${id}`, data)),
  changeStatus: (id: string, status: DossierStatus) => unwrap(apiPatch<ApiResponse<Dossier>>(`${B}/dossiers/${id}/status`, { status })),
  delete: (id: string) => unwrap(apiDelete<ApiResponse<null>>(`${B}/dossiers/${id}`)),
};

// ─── Items ────────────────────────────────────────────────────────────────────

export const logisticsItemsApi = {
  getAll: (dossierId: string) => unwrap(apiGet<ApiResponse<DossierItem[]>>(`${B}/dossiers/${dossierId}/items`)),
  create: (dossierId: string, data: { description: string; quantity: number; unitValue: number; hsCode?: string; unit?: string; countryOfOrigin?: string; productId?: string }) =>
    unwrap(apiPost<ApiResponse<DossierItem>>(`${B}/dossiers/${dossierId}/items`, data)),
  update: (dossierId: string, itemId: string, data: Partial<DossierItem>) =>
    unwrap(apiPut<ApiResponse<DossierItem>>(`${B}/dossiers/${dossierId}/items/${itemId}`, data)),
  delete: (dossierId: string, itemId: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${B}/dossiers/${dossierId}/items/${itemId}`)),
};

// ─── Documents ────────────────────────────────────────────────────────────────

export const logisticsDocumentsApi = {
  getAll: (dossierId: string) => unwrap(apiGet<ApiResponse<DossierDocument[]>>(`${B}/dossiers/${dossierId}/documents`)),
  create: (dossierId: string, data: { type?: string; name: string; url: string; size?: number; mimeType?: string }) =>
    unwrap(apiPost<ApiResponse<DossierDocument>>(`${B}/dossiers/${dossierId}/documents`, data)),
  delete: (dossierId: string, docId: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${B}/dossiers/${dossierId}/documents/${docId}`)),
};

// ─── Costs ────────────────────────────────────────────────────────────────────

export const logisticsCostsApi = {
  getAll: (dossierId: string) =>
    unwrap(apiGet<ApiResponse<{ costs: DossierCost[]; summary: CostsSummary }>>(`${B}/dossiers/${dossierId}/costs`)),
  create: (dossierId: string, data: { category: CostCategory; amount: number; currency: string; description?: string; invoiceRef?: string; supplierId?: string }) =>
    unwrap(apiPost<ApiResponse<DossierCost>>(`${B}/dossiers/${dossierId}/costs`, data)),
  update: (dossierId: string, costId: string, data: Partial<DossierCost>) =>
    unwrap(apiPut<ApiResponse<DossierCost>>(`${B}/dossiers/${dossierId}/costs/${costId}`, data)),
  delete: (dossierId: string, costId: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${B}/dossiers/${dossierId}/costs/${costId}`)),
  markPaid: (dossierId: string, costId: string) =>
    unwrap(apiPatch<ApiResponse<DossierCost>>(`${B}/dossiers/${dossierId}/costs/${costId}/pay`, {})),
};

// ─── Customs ──────────────────────────────────────────────────────────────────

export const logisticsCustomsApi = {
  getAll: (dossierId: string) => unwrap(apiGet<ApiResponse<CustomsDeclaration[]>>(`${B}/dossiers/${dossierId}/customs`)),
  create: (dossierId: string, data: { declarationType: CustomsDeclarationType; declarationNo?: string; regime?: string; customsOffice?: string; customsDuty?: number; vat?: number; excise?: number; otherTaxes?: number; notes?: string }) =>
    unwrap(apiPost<ApiResponse<CustomsDeclaration>>(`${B}/dossiers/${dossierId}/customs`, data)),
  update: (dossierId: string, customsId: string, data: Partial<CustomsDeclaration>) =>
    unwrap(apiPut<ApiResponse<CustomsDeclaration>>(`${B}/dossiers/${dossierId}/customs/${customsId}`, data)),
  submit: (dossierId: string, customsId: string) =>
    unwrap(apiPatch<ApiResponse<CustomsDeclaration>>(`${B}/dossiers/${dossierId}/customs/${customsId}/submit`, {})),
  approve: (dossierId: string, customsId: string) =>
    unwrap(apiPatch<ApiResponse<CustomsDeclaration>>(`${B}/dossiers/${dossierId}/customs/${customsId}/approve`, {})),
  reject: (dossierId: string, customsId: string, reason: string) =>
    unwrap(apiPatch<ApiResponse<CustomsDeclaration>>(`${B}/dossiers/${dossierId}/customs/${customsId}/reject`, { reason })),
  calculate: (dossierId: string) =>
    unwrap(apiGet<ApiResponse<Partial<CustomsDeclaration>>>(`${B}/dossiers/${dossierId}/customs/calculate`)),
};

// ─── Tracking ─────────────────────────────────────────────────────────────────

export const logisticsTrackingApi = {
  getAll: (dossierId: string) => unwrap(apiGet<ApiResponse<TrackingEvent[]>>(`${B}/dossiers/${dossierId}/tracking`)),
  create: (dossierId: string, data: { eventDate?: string; location?: string; status?: string; description?: string }) =>
    unwrap(apiPost<ApiResponse<TrackingEvent>>(`${B}/dossiers/${dossierId}/tracking`, data)),
};

// ─── Containers ───────────────────────────────────────────────────────────────

export const logisticsContainersApi = {
  getAll: (dossierId: string) =>
    unwrap(apiGet<ApiResponse<{ containers: Container[]; summary: ContainerSummary }>>(`${B}/dossiers/${dossierId}/containers`)),
  getById: (dossierId: string, containerId: string) =>
    unwrap(apiGet<ApiResponse<Container>>(`${B}/dossiers/${dossierId}/containers/${containerId}`)),
  create: (dossierId: string, data: { containerNumber?: string; type?: ContainerType; sealNumber?: string; vesselName?: string; voyageNumber?: string; originPort?: string; destinationPort?: string; eta?: string; weight?: number; notes?: string }) =>
    unwrap(apiPost<ApiResponse<Container>>(`${B}/dossiers/${dossierId}/containers`, data)),
  update: (dossierId: string, containerId: string, data: Partial<Container>) =>
    unwrap(apiPut<ApiResponse<Container>>(`${B}/dossiers/${dossierId}/containers/${containerId}`, data)),
  changeStatus: (dossierId: string, containerId: string, status: ContainerStatus) =>
    unwrap(apiPatch<ApiResponse<Container>>(`${B}/dossiers/${dossierId}/containers/${containerId}/status`, { status })),
  delete: (dossierId: string, containerId: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${B}/dossiers/${dossierId}/containers/${containerId}`)),
  addItem: (dossierId: string, containerId: string, data: { description: string; quantity?: number; unit?: string; unitValue?: number; weight?: number; notes?: string }) =>
    unwrap(apiPost<ApiResponse<ContainerItem>>(`${B}/dossiers/${dossierId}/containers/${containerId}/items`, data)),
  updateItem: (dossierId: string, containerId: string, itemId: string, data: Partial<ContainerItem>) =>
    unwrap(apiPut<ApiResponse<ContainerItem>>(`${B}/dossiers/${dossierId}/containers/${containerId}/items/${itemId}`, data)),
  deleteItem: (dossierId: string, containerId: string, itemId: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${B}/dossiers/${dossierId}/containers/${containerId}/items/${itemId}`)),
};

// ─── Warehouses ───────────────────────────────────────────────────────────────

export const logisticsWarehousesApi = {
  getAll: (params?: { type?: WarehouseType; isActive?: boolean; search?: string }) =>
    unwrap(apiGet<ApiResponse<Warehouse[]>>(`${B}/warehouses`, params as Record<string, unknown>)),
  getById: (id: string) => unwrap(apiGet<ApiResponse<Warehouse>>(`${B}/warehouses/${id}`)),
  create: (data: { name: string; type?: WarehouseType; address?: string; city?: string; country?: string; notes?: string }) =>
    unwrap(apiPost<ApiResponse<Warehouse>>(`${B}/warehouses`, data)),
  update: (id: string, data: Partial<Warehouse>) =>
    unwrap(apiPut<ApiResponse<Warehouse>>(`${B}/warehouses/${id}`, data)),
  delete: (id: string) => unwrap(apiDelete<ApiResponse<null>>(`${B}/warehouses/${id}`)),
};

// ─── Transfers ────────────────────────────────────────────────────────────────

export const logisticsTransfersApi = {
  getAll: (dossierId: string) => unwrap(apiGet<ApiResponse<WarehouseTransfer[]>>(`${B}/dossiers/${dossierId}/transfers`)),
  create: (dossierId: string, data: { fromWarehouseId?: string; toWarehouseId: string; transferDate?: string; status?: TransferStatus; notes?: string }) =>
    unwrap(apiPost<ApiResponse<WarehouseTransfer>>(`${B}/dossiers/${dossierId}/transfers`, data)),
  changeStatus: (dossierId: string, transferId: string, status: TransferStatus) =>
    unwrap(apiPatch<ApiResponse<WarehouseTransfer>>(`${B}/dossiers/${dossierId}/transfers/${transferId}/status`, { status })),
};

// ─── Deliveries ───────────────────────────────────────────────────────────────

export const logisticsDeliveriesApi = {
  getAll: (dossierId: string) => unwrap(apiGet<ApiResponse<Delivery[]>>(`${B}/dossiers/${dossierId}/deliveries`)),
  create: (dossierId: string, data: { vehicleId?: string; driverId?: string; origin?: string; destination?: string; scheduledAt?: string; notes?: string }) =>
    unwrap(apiPost<ApiResponse<Delivery>>(`${B}/dossiers/${dossierId}/deliveries`, data)),
  update: (dossierId: string, deliveryId: string, data: Partial<Delivery>) =>
    unwrap(apiPut<ApiResponse<Delivery>>(`${B}/dossiers/${dossierId}/deliveries/${deliveryId}`, data)),
  depart: (dossierId: string, deliveryId: string) =>
    unwrap(apiPatch<ApiResponse<Delivery>>(`${B}/dossiers/${dossierId}/deliveries/${deliveryId}/depart`, {})),
  arrive: (dossierId: string, deliveryId: string) =>
    unwrap(apiPatch<ApiResponse<Delivery>>(`${B}/dossiers/${dossierId}/deliveries/${deliveryId}/arrive`, {})),
  delete: (dossierId: string, deliveryId: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${B}/dossiers/${dossierId}/deliveries/${deliveryId}`)),
};

// ─── Insurances ───────────────────────────────────────────────────────────────

export const logisticsInsurancesApi = {
  getAll: (dossierId: string) => unwrap(apiGet<ApiResponse<Insurance[]>>(`${B}/dossiers/${dossierId}/insurances`)),
  create: (dossierId: string, data: { insurer: string; insuredValue: number; premium: number; policyNumber?: string; coverageType?: InsuranceCoverageType; currency?: string; startDate?: string; endDate?: string; notes?: string }) =>
    unwrap(apiPost<ApiResponse<Insurance>>(`${B}/dossiers/${dossierId}/insurances`, data)),
  update: (dossierId: string, insId: string, data: Partial<Insurance>) =>
    unwrap(apiPut<ApiResponse<Insurance>>(`${B}/dossiers/${dossierId}/insurances/${insId}`, data)),
};

// ─── Letters of Credit ────────────────────────────────────────────────────────

export const logisticsLcApi = {
  getAll: (dossierId: string) => unwrap(apiGet<ApiResponse<LetterOfCredit[]>>(`${B}/dossiers/${dossierId}/letters-of-credit`)),
  create: (dossierId: string, data: { issuingBank: string; beneficiary: string; amount: number; lcNumber?: string; type?: LcType; currency?: string; expiryDate?: string; shipmentDeadline?: string; terms?: string; notes?: string }) =>
    unwrap(apiPost<ApiResponse<LetterOfCredit>>(`${B}/dossiers/${dossierId}/letters-of-credit`, data)),
  changeStatus: (dossierId: string, lcId: string, status: LcStatus) =>
    unwrap(apiPatch<ApiResponse<LetterOfCredit>>(`${B}/dossiers/${dossierId}/letters-of-credit/${lcId}/status`, { status })),
};

// ─── Carriers ─────────────────────────────────────────────────────────────────

export const logisticsCarriersApi = {
  getAll: (params?: { type?: CarrierType; isActive?: boolean; search?: string }) =>
    unwrap(apiGet<ApiResponse<Carrier[]>>(`${B}/carriers`, params as Record<string, unknown>)),
  getById: (id: string) => unwrap(apiGet<ApiResponse<Carrier>>(`${B}/carriers/${id}`)),
  create: (data: { name: string; type?: CarrierType; code?: string; country?: string; contactEmail?: string; contactPhone?: string }) =>
    unwrap(apiPost<ApiResponse<Carrier>>(`${B}/carriers`, data)),
  update: (id: string, data: Partial<Carrier>) => unwrap(apiPut<ApiResponse<Carrier>>(`${B}/carriers/${id}`, data)),
  delete: (id: string) => unwrap(apiDelete<ApiResponse<null>>(`${B}/carriers/${id}`)),
};

// ─── Tariffs ──────────────────────────────────────────────────────────────────

export const logisticsTariffsApi = {
  getAll: (params?: { search?: string; isActive?: boolean }) =>
    unwrap(apiGet<ApiResponse<Tariff[]>>(`${B}/tariffs`, params as Record<string, unknown>)),
  getByHsCode: (hsCode: string) => unwrap(apiGet<ApiResponse<Tariff>>(`${B}/tariffs/${hsCode}`)),
  create: (data: { hsCode: string; description: string; importDutyRate?: number; vatRate?: number; exciseRate?: number; notes?: string }) =>
    unwrap(apiPost<ApiResponse<Tariff>>(`${B}/tariffs`, data)),
  update: (id: string, data: Partial<Tariff>) => unwrap(apiPut<ApiResponse<Tariff>>(`${B}/tariffs/${id}`, data)),
  delete: (id: string) => unwrap(apiDelete<ApiResponse<null>>(`${B}/tariffs/${id}`)),
};

// ─── Fleet — Drivers ──────────────────────────────────────────────────────────

export const logisticsDriversApi = {
  getAll: (params?: { isActive?: boolean; search?: string }) =>
    unwrap(apiGet<ApiResponse<Driver[]>>(`${B}/fleet/drivers`, params as Record<string, unknown>)),
  getById: (id: string) => unwrap(apiGet<ApiResponse<Driver>>(`${B}/fleet/drivers/${id}`)),
  create: (data: { firstName: string; lastName: string; phone?: string; licenseNumber?: string; licenseType?: string; notes?: string }) =>
    unwrap(apiPost<ApiResponse<Driver>>(`${B}/fleet/drivers`, data)),
  update: (id: string, data: Partial<Driver> & { notes?: string }) =>
    unwrap(apiPut<ApiResponse<Driver>>(`${B}/fleet/drivers/${id}`, data)),
  delete: (id: string) => unwrap(apiDelete<ApiResponse<null>>(`${B}/fleet/drivers/${id}`)),
};

// ─── Fleet — Vehicles ─────────────────────────────────────────────────────────

export const logisticsVehiclesApi = {
  getAll: (params?: { type?: VehicleType; status?: VehicleStatus; isActive?: boolean; driverId?: string; search?: string }) =>
    unwrap(apiGet<ApiResponse<Vehicle[]>>(`${B}/fleet/vehicles`, params as Record<string, unknown>)),
  getById: (id: string) => unwrap(apiGet<ApiResponse<Vehicle>>(`${B}/fleet/vehicles/${id}`)),
  create: (data: { plateNumber: string; type?: VehicleType; brand?: string; model?: string; year?: number; capacity?: number; driverId?: string; notes?: string }) =>
    unwrap(apiPost<ApiResponse<Vehicle>>(`${B}/fleet/vehicles`, data)),
  update: (id: string, data: Partial<Vehicle> & { driverId?: string; notes?: string }) =>
    unwrap(apiPut<ApiResponse<Vehicle>>(`${B}/fleet/vehicles/${id}`, data)),
  delete: (id: string) => unwrap(apiDelete<ApiResponse<null>>(`${B}/fleet/vehicles/${id}`)),
  sendGps: (id: string, data: { latitude: number; longitude: number; speed?: number; heading?: number; altitude?: number; source?: GpsSource; recordedAt?: string }) =>
    unwrap(apiPost<ApiResponse<GpsPosition>>(`${B}/fleet/vehicles/${id}/gps`, data)),
  getGpsHistory: (id: string, limit?: number) =>
    unwrap(apiGet<ApiResponse<GpsPosition[]>>(`${B}/fleet/vehicles/${id}/gps`, limit ? { limit } : undefined)),
};

// ─── Finance — Exchange Rates ─────────────────────────────────────────────────

export const logisticsExchangeRatesApi = {
  getAll: (params?: { fromCurrency?: string; toCurrency?: string; isActive?: boolean }) =>
    unwrap(apiGet<ApiResponse<ExchangeRate[]>>(`${B}/finance/exchange-rates`, params as Record<string, unknown>)),
  getActive: (from: string, to: string) =>
    unwrap(apiGet<ApiResponse<ExchangeRate>>(`${B}/finance/exchange-rates/${from}/${to}`)),
  convert: (amount: number, from: string, to: string) =>
    unwrap(apiGet<ApiResponse<{ amount: number; rate: number; from: string; to: string; rateDate: string }>>(`${B}/finance/exchange-rates/convert`, { amount, from, to })),
  create: (data: { fromCurrency: string; toCurrency: string; rate: number; source?: ExchangeRateSource; validFrom?: string; isActive?: boolean }) =>
    unwrap(apiPost<ApiResponse<ExchangeRate>>(`${B}/finance/exchange-rates`, data)),
};

// ─── Finance — Bank Guarantees ────────────────────────────────────────────────

export const logisticsBankGuaranteesApi = {
  getAll: (params?: { dossierId?: string }) =>
    unwrap(apiGet<ApiResponse<BankGuarantee[]>>(`${B}/finance/bank-guarantees`, params as Record<string, unknown>)),
  create: (data: { bank: string; beneficiary: string; amount: number; guaranteeNumber?: string; type?: GuaranteeType; currency?: string; expiryDate?: string; dossierId?: string; notes?: string }) =>
    unwrap(apiPost<ApiResponse<BankGuarantee>>(`${B}/finance/bank-guarantees`, data)),
  changeStatus: (id: string, status: GuaranteeStatus) =>
    unwrap(apiPatch<ApiResponse<BankGuarantee>>(`${B}/finance/bank-guarantees/${id}/status`, { status })),
};
