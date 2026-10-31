/**
 * Operations & Fulfilment Feature Module
 * Author: Member 3 (Operations & Fulfilment Lead)
 * Exports primary module container and all individual phase components.
 */

export { default as OperationsModule } from './OperationsModule';
export { default as ProductCatalogView } from './products/ProductCatalogView';
export { default as WarehouseInventoryDashboard } from './inventory/WarehouseInventoryDashboard';
export { default as ReservationShortageDashboard } from './reservations/ReservationShortageDashboard';
export { default as DispatchManagementView } from './dispatch/DispatchManagementView';
export { default as BarcodeScannerView } from './serials/BarcodeScannerView';
export { default as SerialTraceabilityDossier } from './serials/SerialTraceabilityDossier';
export { default as TechnicianRosterView } from './technicians/TechnicianRosterView';
export { default as CrewSchedulingView } from './technicians/CrewSchedulingView';
export { default as MobileJobCardView } from './installations/MobileJobCardView';
export { default as WarrantyLookupView } from './warranties/WarrantyLookupView';
export { operationsApi } from './services/operationsApi';
