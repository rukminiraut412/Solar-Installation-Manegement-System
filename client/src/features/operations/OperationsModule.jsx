import React, { useState } from 'react';
import {
  Package,
  Boxes,
  Layers,
  Truck,
  QrCode,
  Users,
  Wrench,
  ShieldCheck,
  Activity,
  History,
  FileSpreadsheet
} from 'lucide-react';

import ProductCatalogView from './products/ProductCatalogView';
import WarehouseInventoryDashboard from './inventory/WarehouseInventoryDashboard';
import ReservationShortageDashboard from './reservations/ReservationShortageDashboard';
import WarehouseQuotationManager from './quotations/WarehouseQuotationManager';
import DispatchManagementView from './dispatch/DispatchManagementView';
import BarcodeScannerView from './serials/BarcodeScannerView';
import SerialTraceabilityDossier from './serials/SerialTraceabilityDossier';
import TechnicianRosterView from './technicians/TechnicianRosterView';
import CrewSchedulingView from './technicians/CrewSchedulingView';
import MobileJobCardView from './installations/MobileJobCardView';
import WarrantyLookupView from './warranties/WarrantyLookupView';
import { useAuth } from '../../shared/context/AuthContext';

const ALL_TABS = [
  { id: 'inventory', label: '1. Inventory & Invariants', icon: Boxes, roles: ['Admin/Owner', 'Warehouse'] },
  { id: 'reservations', label: '2. Stock Reservations & Shortages', icon: Layers, roles: ['Admin/Owner', 'Warehouse'] },
  { id: 'quotations', label: '3. Quotation Preparation', icon: FileSpreadsheet, roles: ['Admin/Owner', 'Warehouse'] },
  { id: 'dispatch', label: '4. Dispatch & Challan', icon: Truck, roles: ['Admin/Owner', 'Warehouse'] },
  { id: 'scanner', label: '5. Barcode Scan & Quarantine', icon: QrCode, roles: ['Admin/Owner', 'Warehouse'] },
  { id: 'traceability', label: '6. 360° Serial Traceability', icon: History, roles: ['Admin/Owner', 'Warehouse'] },
  { id: 'roster', label: '7. 15-Technician Roster', icon: Users, roles: ['Admin/Owner'] },
  { id: 'scheduling', label: '8. Crew Scheduling & Slots', icon: Activity, roles: ['Admin/Owner'] },
  { id: 'jobcard', label: '9. Mobile Rooftop Job Card', icon: Wrench, roles: ['Admin/Owner', 'Technician'] },
  { id: 'warranties', label: '10. Warranty Lookup & Claims', icon: ShieldCheck, roles: ['Admin/Owner', 'Warehouse'] },
  { id: 'products', label: '11. Master Product Catalog', icon: Package, roles: ['Admin/Owner', 'Warehouse'] }
];

export default function OperationsModule({ initialTab = 'inventory', currentRole = null }) {
  const { user } = useAuth();
  const effectiveRole = currentRole || user?.role || 'Admin/Owner';
  const isWarehouse = effectiveRole === 'Warehouse';

  const visibleTabs = ALL_TABS.filter(tab => tab.roles.includes(effectiveRole));
  const defaultTab = visibleTabs.some(t => t.id === initialTab) ? initialTab : visibleTabs[0]?.id || 'inventory';

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedSerialForTrace, setSelectedSerialForTrace] = useState('INV-GROW-3K-26-00101');

  const handleSelectSerial = (sn) => {
    setSelectedSerialForTrace(sn);
    setActiveTab('traceability');
  };

  return (
    <div className="space-y-6">
      {/* Module Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
              <Boxes className="h-3.5 w-3.5 text-emerald-600" />
              {isWarehouse ? 'Warehouse Operations & Fulfilment Hub' : 'Operations & Fulfilment Hub'}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isWarehouse
                ? 'Warehouse Inventory, Quotations & Dispatch Hub'
                : 'Solar Operations, Fulfilment & Rooftop Field Execution'}
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-600 max-w-2xl">
              {isWarehouse
                ? 'Manage inventory invariants, stock reservations, quotation preparation, dispatch challans, barcode scanning & quarantine, and 360° serial traceability.'
                : 'End-to-end operational lifecycle: warehouse stock balance invariants, BOM consumption, 100% serial barcode gates, certified electrical crew scheduling, and automated warranties.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-right">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500">Inventory Status</span>
              <div className="font-mono text-sm font-bold text-emerald-700">100% Balanced</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500">Electrical Lead</span>
              <div className="font-mono text-sm font-bold text-amber-600">Certified Strict</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Phase View Container */}
      <div className="transition-all duration-200">
        {activeTab === 'inventory' && <WarehouseInventoryDashboard />}
        {activeTab === 'reservations' && <ReservationShortageDashboard />}
        {activeTab === 'quotations' && <WarehouseQuotationManager />}
        {activeTab === 'dispatch' && <DispatchManagementView />}
        {activeTab === 'scanner' && <BarcodeScannerView onSelectSerial={handleSelectSerial} />}
        {activeTab === 'traceability' && (
          <SerialTraceabilityDossier initialSerialNumber={selectedSerialForTrace} />
        )}
        {activeTab === 'roster' && <TechnicianRosterView />}
        {activeTab === 'scheduling' && <CrewSchedulingView />}
        {activeTab === 'jobcard' && <MobileJobCardView />}
        {activeTab === 'warranties' && <WarrantyLookupView />}
        {activeTab === 'products' && <ProductCatalogView />}
      </div>
    </div>
  );
}
