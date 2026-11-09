import React, { useState, useMemo } from 'react';
import {
  X,
  Boxes,
  GitMerge,
  Truck,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Calendar,
  Sparkles,
  Barcode as BarcodeIcon,
  LayoutGrid,
  Table as TableIcon,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { PlantSimulationState, ItemEntity, ItemLifecycleRecord, Station } from '../types/factory';

export type InspectableStationId = 
  | 'inventory_rm1'
  | 'inventory_rm2'
  | 'inventory_rm3'
  | 'converge_join'
  | 'sink_dispatch';

interface EntityInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: InspectableStationId;
  onSelectStation?: (stationId: InspectableStationId) => void;
  state: PlantSimulationState;
}

const STATION_METADATA: Record<InspectableStationId, {
  name: string;
  tag: string;
  line: 'RM1' | 'RM2' | 'RM3' | 'MERGE' | 'FINAL';
  category: 'INVENTORY' | 'MERGER' | 'DISPATCH';
  materialDescription: string;
  nominalSpecs: string;
  colorScheme: {
    badge: string;
    border: string;
    bg: string;
  };
}> = {
  inventory_rm1: {
    name: 'RM1 Infeed Inventory (FIFO Rack)',
    tag: 'FIFO_QUEUE_RM1',
    line: 'RM1',
    category: 'INVENTORY',
    materialDescription: 'Grade 5 Titanium Billet (Ti-6Al-4V) - Ø45mm × 180mm',
    nominalSpecs: 'Tensile: 950 MPa | Hardness: 36 HRC | Lot Spec: AMS 4928',
    colorScheme: {
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      border: 'border-cyan-500/30',
      bg: 'from-cyan-950/30 to-slate-900/40',
    },
  },
  inventory_rm2: {
    name: 'RM2 Infeed Inventory (FIFO Rack)',
    tag: 'FIFO_QUEUE_RM2',
    line: 'RM2',
    category: 'INVENTORY',
    materialDescription: 'Aerospace 7075-T6 Aluminum Casting - 120mm × 85mm',
    nominalSpecs: 'Tensile: 570 MPa | Hardness: 150 HB | Lot Spec: QQ-A-250/12',
    colorScheme: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      border: 'border-emerald-500/30',
      bg: 'from-emerald-950/30 to-slate-900/40',
    },
  },
  inventory_rm3: {
    name: 'RM3 Infeed Inventory (FIFO Rack)',
    tag: 'FIFO_QUEUE_RM3',
    line: 'RM3',
    category: 'INVENTORY',
    materialDescription: 'High-Strength 4340 Alloy Steel Plate - 95mm × 65mm',
    nominalSpecs: 'Yield: 860 MPa | Hardness: 48 HRC | Lot Spec: AMS 6415',
    colorScheme: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      border: 'border-amber-500/30',
      bg: 'from-amber-950/30 to-slate-900/40',
    },
  },
  converge_join: {
    name: 'Converge / 3-Way Joining Cell',
    tag: 'CONVERGE_JOINER',
    line: 'MERGE',
    category: 'MERGER',
    materialDescription: 'Matched Aerospace Hydraulic Sub-Assembly (RM1+RM2+RM3)',
    nominalSpecs: 'Assembly Clearance: 0.012mm | Torque Target: 42 Nm | Spec: AS9100D',
    colorScheme: {
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      border: 'border-purple-500/30',
      bg: 'from-purple-950/30 to-slate-900/40',
    },
  },
  sink_dispatch: {
    name: 'Final Product Dispatch & Shipping Sink',
    tag: 'SINK_DISPATCH',
    line: 'FINAL',
    category: 'DISPATCH',
    materialDescription: 'Certified Aerospace Hydraulic Actuator Unit',
    nominalSpecs: 'QC Passed 100% | Nitrogen Purged | Flight Tag: MIL-STD-810G',
    colorScheme: {
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      border: 'border-blue-500/30',
      bg: 'from-blue-950/30 to-slate-900/40',
    },
  },
};

export const EntityInspectionModal: React.FC<EntityInspectionModalProps> = ({
  isOpen,
  onClose,
  stationId,
  onSelectStation,
  state,
}) => {
  const [activeStationId, setActiveStationId] = useState<InspectableStationId>(stationId);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null);

  // Sync if stationId changes from parent
  React.useEffect(() => {
    setActiveStationId(stationId);
  }, [stationId]);

  const currentStationMeta = STATION_METADATA[activeStationId];
  const stationObj: Station | undefined = state.stations[activeStationId];

  // Helper to format simulated seconds into clock string
  const formatSimClock = (secondsOfDay: number) => {
    const sec = Math.floor(secondsOfDay) % 86400;
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
    return `${String(displayHrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} ${ampm}`;
  };

  // Find entities currently at this station or dispatched
  const presentEntities = useMemo(() => {
    const list: Array<{
      entity: ItemEntity;
      lifecycle?: ItemLifecycleRecord;
      dwellSeconds: number;
      barcode: string;
      itemId: string;
      lotNumber: string;
      materialName: string;
      heatCode: string;
      weightGrams: number;
    }> = [];

    // Map through live entities
    state.entities.forEach((ent) => {
      let isMatch = false;
      if (ent.currentStationId === activeStationId) {
        isMatch = true;
      } else if (activeStationId === 'sink_dispatch' && ent.targetStationId === 'sink_dispatch' && ent.positionRatio >= 0.95) {
        isMatch = true;
      }

      if (isMatch) {
        const lifecycle = state.itemLifecycleLedger?.find((l) => l.itemId === ent.id || l.code === ent.code);
        const dwell = Math.max(0, state.timeSeconds - ent.creationTime);
        const cleanSeq = ent.code.replace(/[^0-9]/g, '').slice(-3) || '001';
        const canonicalBarcode = ent.barcode || `DT-${ent.code}`;
        const canonicalLot = ent.lotBatchId || lifecycle?.lotBatchId || `LOT-${state.config.simulatedDate.replace(/-/g, '')}-${ent.line}`;
        const canonicalMaterial = ent.materialName || lifecycle?.materialName || currentStationMeta.materialDescription;

        list.push({
          entity: ent,
          lifecycle,
          dwellSeconds: dwell,
          barcode: canonicalBarcode,
          itemId: ent.code,
          lotNumber: canonicalLot,
          materialName: canonicalMaterial,
          heatCode: `HT-AMS-${ent.line}-${cleanSeq}`,
          weightGrams: ent.line === 'RM1' ? 842 : ent.line === 'RM2' ? 515 : ent.line === 'RM3' ? 680 : 2037,
        });
      }
    });

    // If active station is sink_dispatch or inventory and no live items are present, check lifecycle ledger for historical entries
    if (list.length === 0 && activeStationId === 'sink_dispatch' && state.itemLifecycleLedger) {
      const dispatched = state.itemLifecycleLedger
        .filter((l) => l.status === 'COMPLETED_DISPATCH')
        .slice(-25)
        .reverse();

      dispatched.forEach((l, idx) => {
        const syntheticEnt: ItemEntity = {
          id: l.itemId,
          code: l.code,
          barcode: l.barcode || `DT-${l.code}`,
          materialName: l.materialName || 'Certified Aerospace Hydraulic Actuator Unit',
          lotBatchId: l.lotBatchId || `LOT-${state.config.simulatedDate.replace(/-/g, '')}-FINAL`,
          type: 'PACKAGED_PRODUCT',
          line: 'FINAL',
          currentStationId: 'sink_dispatch',
          targetStationId: null,
          positionRatio: 1.0,
          isProcessing: false,
          qualityPassed: true,
          creationTime: l.creationTimeSeconds,
          totalCycleTime: l.totalLeadTimeSeconds,
        };
        const cleanSeq = l.code.replace(/[^0-9]/g, '').slice(-3) || String(idx + 1).padStart(3, '0');
        list.push({
          entity: syntheticEnt,
          lifecycle: l,
          dwellSeconds: l.totalLeadTimeSeconds,
          barcode: l.barcode || `DT-${l.code}`,
          itemId: l.code,
          lotNumber: l.lotBatchId || `LOT-${state.config.simulatedDate.replace(/-/g, '')}-FINAL`,
          materialName: l.materialName || 'Certified Aerospace Hydraulic Actuator Unit',
          heatCode: `HT-AMS-FIN-${cleanSeq}`,
          weightGrams: 2037,
        });
      });
    }

    // Filter by search term
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (item) =>
        item.barcode.toLowerCase().includes(term) ||
        item.itemId.toLowerCase().includes(term) ||
        item.lotNumber.toLowerCase().includes(term) ||
        item.materialName.toLowerCase().includes(term) ||
        item.entity.type.toLowerCase().includes(term)
    );
  }, [state.entities, state.itemLifecycleLedger, state.timeSeconds, activeStationId, searchTerm, state.config.simulatedDate, currentStationMeta]);

  // Export current list to CSV
  const handleExportManifest = () => {
    const headers = ['Item ID', 'Barcode', 'Material Description', 'Line', 'Station', 'Lot Number', 'Melt Heat Code', 'Weight (g)', 'Dwell Time (s)', 'QC Status'];
    const rows = presentEntities.map((item) => [
      `"${item.itemId}"`,
      `"${item.barcode}"`,
      `"${item.materialName}"`,
      `"${item.entity.line}"`,
      `"${activeStationId}"`,
      `"${item.lotNumber}"`,
      `"${item.heatCode}"`,
      item.weightGrams,
      item.dwellSeconds.toFixed(1),
      item.entity.qualityPassed ? 'IN-SPEC' : 'PENDING',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DigiTwin_Manifest_${activeStationId}_Day${state.config.simulatedDayCount}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTabChange = (newId: InspectableStationId) => {
    setActiveStationId(newId);
    if (onSelectStation) {
      onSelectStation(newId);
    }
    setExpandedEntityId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-7xl max-h-[92vh] md:max-h-[88vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
              <Boxes className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">
                  Entity & Material In-Situ Inspection Manifest
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE TWIN TELEMETRY
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Discrete entity tracking synchronized with Traceability & QC Defect Audit subsystems
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition ${
                  viewMode === 'cards' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Cards with expandable inspection details"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition ${
                  viewMode === 'table' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Dense tabular view"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            <button
              onClick={handleExportManifest}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
              title="Export Current Manifest to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Station Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-2 bg-slate-950/80 border-b border-slate-800/80 overflow-x-auto scrollbar-none shrink-0">
          {(Object.keys(STATION_METADATA) as InspectableStationId[]).map((stId) => {
            const meta = STATION_METADATA[stId];
            const isActive = activeStationId === stId;
            const count = stId === 'sink_dispatch' 
              ? (state.stations[stId]?.processedToday ?? state.completedCount)
              : (state.stations[stId]?.currentQueueCount ?? 0);

            return (
              <button
                key={stId}
                onClick={() => handleTabChange(stId)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-semibold rounded-t-lg transition border-t border-x shrink-0 ${
                  isActive
                    ? 'bg-slate-900 border-slate-700 text-cyan-300 border-b-2 border-b-cyan-400'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {meta.category === 'INVENTORY' && <Boxes className="w-3.5 h-3.5 text-cyan-400" />}
                {meta.category === 'MERGER' && <GitMerge className="w-3.5 h-3.5 text-purple-400" />}
                {meta.category === 'DISPATCH' && <Truck className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{meta.name.split(' (')[0]}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Station Info Banner */}
        <div className={`px-4 sm:px-6 py-3 bg-gradient-to-r ${currentStationMeta.colorScheme.bg} border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0`}>
          <div className="space-y-1 min-w-0 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${currentStationMeta.colorScheme.badge}`}>
                {currentStationMeta.tag}
              </span>
              <span className="text-sm font-semibold text-slate-200">{currentStationMeta.name}</span>
            </div>
            <p className="text-xs text-slate-300 truncate">
              <strong className="text-white">Material:</strong> {currentStationMeta.materialDescription}
            </p>
            <p className="text-[11px] text-slate-400 font-mono truncate">
              <strong className="text-slate-300">Cert Specs:</strong> {currentStationMeta.nominalSpecs}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono shrink-0">
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700/60 text-center">
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Queue / On-Hand</div>
              <div className="text-sm sm:text-base font-bold text-cyan-400">
                {stationObj?.currentQueueCount ?? 0} <span className="text-[10px] font-normal text-slate-400">units</span>
              </div>
            </div>
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700/60 text-center">
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Shift Processed</div>
              <div className="text-sm sm:text-base font-bold text-emerald-400">
                {stationObj?.processedToday ?? 0} <span className="text-[10px] font-normal text-slate-400">units</span>
              </div>
            </div>
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700/60 text-center">
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Status</div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${stationObj?.status === 'BUSY' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                {stationObj?.status ?? 'IDLE'}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Stats Bar */}
        <div className="px-4 sm:px-6 py-2 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by Item ID, Barcode, Material, Lot #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-3">
            <span>
              Showing <strong className="text-white font-mono">{presentEntities.length}</strong> synchronized workpieces
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="hidden sm:inline">
              Sim Clock:{' '}
              <strong className="text-cyan-400 font-mono">
                {formatSimClock(state.config.simulatedSecondsOfDay)}
              </strong>
            </span>
          </div>
        </div>

        {/* Workpiece Content Container */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
          {presentEntities.length === 0 ? (
            <div className="py-14 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
              <Boxes className="w-10 h-10 mx-auto text-slate-600 mb-2.5" />
              <p className="text-sm font-semibold text-slate-300">No items currently queued at this station</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {activeStationId.startsWith('inventory')
                  ? 'Truck unloading transfers raw material into this FIFO buffer upon arrival. Run simulation to observe discrete entity intake.'
                  : activeStationId === 'converge_join'
                  ? 'The converge station awaits 1 unit each from RM1, RM2, and RM3 lines before releasing a joined assembly kit.'
                  : 'Finished goods appear here once final assembly and packaging pass inspection.'}
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* Dense Responsive Table View */
            <div className="rounded-xl border border-slate-800 overflow-x-auto bg-slate-950/40">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Item ID / Code</th>
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-3">Material Description</th>
                    <th className="py-2.5 px-3">Lot / Batch ID</th>
                    <th className="py-2.5 px-3">Heat Code</th>
                    <th className="py-2.5 px-3 text-right">Mass</th>
                    <th className="py-2.5 px-3 text-right">Dwell Time</th>
                    <th className="py-2.5 px-3 text-center">QC Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {presentEntities.map((item) => (
                    <tr key={item.entity.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-2 px-3 font-bold text-cyan-300">{item.itemId}</td>
                      <td className="py-2 px-3 text-slate-200 flex items-center gap-1.5">
                        <BarcodeIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{item.barcode}</span>
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-300 max-w-xs truncate" title={item.materialName}>
                        {item.materialName}
                      </td>
                      <td className="py-2 px-3 text-slate-400">{item.lotNumber}</td>
                      <td className="py-2 px-3 text-slate-400">{item.heatCode}</td>
                      <td className="py-2 px-3 text-right text-slate-300">{item.weightGrams} g</td>
                      <td className="py-2 px-3 text-right text-amber-300 font-semibold">{item.dwellSeconds.toFixed(1)}s</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            item.entity.qualityPassed
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {item.entity.qualityPassed ? 'IN-SPEC' : 'QUEUED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Card View with Expandable Audit Details */
            <div className="space-y-2">
              {presentEntities.map((item) => {
                const isExpanded = expandedEntityId === item.entity.id;
                return (
                  <div
                    key={item.entity.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl transition overflow-hidden"
                  >
                    {/* Main Row */}
                    <div
                      onClick={() => setExpandedEntityId(isExpanded ? null : item.entity.id)}
                      className="px-4 py-2.5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-800/40 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button className="text-slate-500 hover:text-cyan-400 transition shrink-0">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        
                        {/* Barcode badge & Item ID */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded bg-slate-800 border border-slate-700 text-cyan-400 shrink-0">
                            <BarcodeIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-mono font-bold text-xs text-white tracking-wider flex items-center gap-2 flex-wrap">
                              <span className="text-cyan-300 font-extrabold">{item.itemId}</span>
                              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {item.barcode}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 truncate mt-0.5">
                              <span className="truncate">{item.materialName}</span>
                              <span>•</span>
                              <span className="font-mono shrink-0">Lot: {item.lotNumber}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right-Side Metrics */}
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-xs">
                        <div className="hidden sm:block text-right">
                          <div className="text-[9px] text-slate-400 uppercase tracking-wider">Mass</div>
                          <div className="font-mono font-semibold text-slate-200">{item.weightGrams} g</div>
                        </div>

                        <div className="text-right">
                          <div className="text-[9px] text-slate-400 uppercase tracking-wider">Dwell</div>
                          <div className="font-mono font-semibold text-amber-300 flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />
                            {item.dwellSeconds.toFixed(1)}s
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[9px] text-slate-400 uppercase tracking-wider">QC</div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              item.entity.qualityPassed
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {item.entity.qualityPassed ? 'IN-SPEC' : 'QUEUED'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 py-3.5 bg-slate-950/70 border-t border-slate-800/80 space-y-3 text-xs animate-fadeIn">
                        {/* Specs & Material Properties */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-cyan-400" />
                              Metrology & QA Clearance
                            </div>
                            <div className="text-slate-200">Tolerance: <span className="font-mono text-cyan-300">ISO 2768-mK</span></div>
                            <div className="text-slate-200">NDT Ultrasonic: <span className="text-emerald-400 font-semibold">100% Defect Free</span></div>
                            <div className="text-slate-400 text-[10px] mt-0.5">QC Stamp: #QC-IIESTS-A4</div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                              <Layers className="w-3 h-3 text-purple-400" />
                              Material Composition
                            </div>
                            <div className="text-slate-200 truncate">{item.materialName}</div>
                            <div className="text-slate-400 text-[10px]">Melt Heat Code: <span className="font-mono text-slate-300">{item.heatCode}</span></div>
                            <div className="text-slate-400 text-[10px]">RoHS / REACH Compliant</div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              Station Residence
                            </div>
                            <div className="text-slate-200">
                              Created:{' '}
                              <span className="font-mono text-slate-300">
                                {formatSimClock(item.entity.creationTime)}
                              </span>
                            </div>
                            <div className="text-slate-200">
                              Current Station: <span className="font-mono text-cyan-400">{activeStationId}</span>
                            </div>
                            <div className="text-slate-400 text-[10px]">Elapsed: {item.dwellSeconds.toFixed(1)}s</div>
                          </div>
                        </div>

                        {/* Step History Audit Trail */}
                        <div>
                          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            Station Traversal & Step Audit Trail
                          </div>

                          {item.lifecycle && item.lifecycle.steps && item.lifecycle.steps.length > 0 ? (
                            <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-900/60">
                              <table className="w-full text-left text-[11px] min-w-[500px]">
                                <thead className="bg-slate-900 text-slate-400 font-mono text-[10px] border-b border-slate-800">
                                  <tr>
                                    <th className="py-1 px-2.5">#</th>
                                    <th className="py-1 px-2.5">Station Name</th>
                                    <th className="py-1 px-2.5">Entered</th>
                                    <th className="py-1 px-2.5">Exited</th>
                                    <th className="py-1 px-2.5">Duration</th>
                                    <th className="py-1 px-2.5">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 font-mono">
                                  {item.lifecycle.steps.map((step) => (
                                    <tr key={step.stepIndex} className="hover:bg-slate-800/30">
                                      <td className="py-1 px-2.5 text-slate-500">{step.stepIndex}</td>
                                      <td className="py-1 px-2.5 text-slate-200 font-sans">{step.stationName}</td>
                                      <td className="py-1 px-2.5 text-slate-400">{step.enteredAtClock}</td>
                                      <td className="py-1 px-2.5 text-slate-400">{step.exitedAtClock || 'Active'}</td>
                                      <td className="py-1 px-2.5 text-amber-300">{step.durationSeconds.toFixed(1)}s</td>
                                      <td className="py-1 px-2.5">
                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                          {step.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/60 text-slate-400 text-[11px]">
                              Entity initiated at intake dock <span className="font-mono text-cyan-400">{activeStationId}</span>. Currently resident in FIFO queue waiting for downstream conveyor call.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] sm:text-xs">
              Synchronized 1:1 with Material Traceability & QC Defect Logs
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition text-xs font-medium"
          >
            Close Manifest
          </button>
        </div>
      </div>
    </div>
  );
};
