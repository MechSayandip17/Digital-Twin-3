import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Sliders,
  Download,
  Upload,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Package,
  CheckCircle2,
  AlertCircle,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  CustomBlock,
  CustomBlockCategory,
  CustomConnection,
  CustomLayoutState,
} from '../types/customLayout';
import { PlantSimulationState } from '../types/factory';
import {
  createDefaultCustomLayout,
  tickCustomLayoutSimulation,
} from '../simulation/customSimEngine';

const CATEGORY_STYLES: Record<
  CustomBlockCategory,
  { bg: string; border: string; text: string; icon: React.ReactNode }
> = {
  SOURCE: {
    bg: 'bg-blue-950/80',
    border: 'border-blue-500/60',
    text: 'text-blue-300',
    icon: <Truck className="w-4 h-4 text-blue-400" />,
  },
  PROCESSING: {
    bg: 'bg-indigo-950/80',
    border: 'border-indigo-500/60',
    text: 'text-indigo-300',
    icon: <Cpu className="w-4 h-4 text-indigo-400" />,
  },
  TRANSPORT: {
    bg: 'bg-cyan-950/80',
    border: 'border-cyan-500/60',
    text: 'text-cyan-300',
    icon: <ArrowRight className="w-4 h-4 text-cyan-400" />,
  },
  QUEUE: {
    bg: 'bg-amber-950/80',
    border: 'border-amber-500/60',
    text: 'text-amber-300',
    icon: <Layers className="w-4 h-4 text-amber-400" />,
  },
  QUALITY: {
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-500/60',
    text: 'text-emerald-300',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  },
  ASSEMBLY: {
    bg: 'bg-purple-950/80',
    border: 'border-purple-500/60',
    text: 'text-purple-300',
    icon: <Wrench className="w-4 h-4 text-purple-400" />,
  },
  SINK: {
    bg: 'bg-rose-950/80',
    border: 'border-rose-500/60',
    text: 'text-rose-300',
    icon: <Package className="w-4 h-4 text-rose-400" />,
  },
};

export interface CustomLayoutBuilderProps {
  currentPlantSimulationState?: PlantSimulationState;
  onApplyLayoutToPlantTwin?: (blocks: CustomBlock[], connections: CustomConnection[]) => void;
  onSwitchToPhysicalTwinView?: () => void;
}

export const CustomLayoutBuilder: React.FC<CustomLayoutBuilderProps> = ({
  currentPlantSimulationState,
  onApplyLayoutToPlantTwin,
  onSwitchToPhysicalTwinView,
}) => {
  const [layoutState, setLayoutState] = useState<CustomLayoutState>(() => {
    try {
      const saved = localStorage.getItem('aerotwin_custom_simulink_layout');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.blocks?.length) return parsed;
      }
    } catch {
      // fallback
    }
    return createDefaultCustomLayout();
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [connectingSource, setConnectingSource] = useState<{
    blockId: string;
    portId: string;
  } | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(layoutState);
  stateRef.current = layoutState;

  // Convert current physical plant twin stations into editable Simulink blocks & connections
  const handleLoadActiveTwinLayout = () => {
    if (!currentPlantSimulationState?.stations) {
      setLayoutState(createDefaultCustomLayout());
      return;
    }

    const stations = currentPlantSimulationState.stations;
    const blocks: CustomBlock[] = [];
    const connections: CustomConnection[] = [];

    for (const st of Object.values(stations)) {
      let category: CustomBlockCategory = 'PROCESSING';
      if (st.type === 'truck_source') category = 'SOURCE';
      else if (st.type === 'inventory_fifo' || st.type === 'buffer_fifo') category = 'QUEUE';
      else if (st.type.includes('transporter')) category = 'TRANSPORT';
      else if (st.type === 'quality_control') category = 'QUALITY';
      else if (st.type === 'converge_join' || st.type === 'final_assembly') category = 'ASSEMBLY';
      else if (st.type === 'sink_dispatch') category = 'SINK';
      else if (st.type === 'packaging') category = 'PROCESSING';

      const inputs = category === 'SOURCE' ? [] : (
        st.type === 'converge_join' ? [
          { id: 'in-1', type: 'INPUT' as const, label: 'Line 1 (RM1)' },
          { id: 'in-2', type: 'INPUT' as const, label: 'Line 2 (RM2)' },
          { id: 'in-3', type: 'INPUT' as const, label: 'Line 3 (RM3)' },
        ] : [{ id: 'in-1', type: 'INPUT' as const, label: 'Infeed' }]
      );

      const outputs = category === 'SINK' ? [] : [{ id: 'out-1', type: 'OUTPUT' as const, label: 'Outfeed' }];

      blocks.push({
        id: st.id,
        name: st.name,
        tag: st.simulinkTag || st.name.toUpperCase().replace(/\s+/g, '_'),
        category,
        x: Math.round(st.x),
        y: Math.round(st.y),
        width: Math.max(160, st.width + 50),
        height: 85,
        inputs,
        outputs,
        cycleTimeSeconds: st.nominalProcessingTime > 0 ? st.nominalProcessingTime : 4.0,
        queueCapacity: st.maxQueueCapacity || (st.isQueue ? 60 : 15),
        failureRatePerHour: 0.02,
        powerKw: 15.0,
        costPerHour: 45.0,
        colorTheme: category === 'PROCESSING' ? 'indigo' : category === 'QUEUE' ? 'amber' : category === 'TRANSPORT' ? 'cyan' : 'blue',
        currentlyProcessing: st.currentlyProcessingCount,
        inQueue: st.currentQueueCount,
        processedCount: st.processedToday,
        blockedCount: 0,
        utilization: st.utilization,
        status: st.status === 'BUSY' ? 'BUSY' : st.status === 'MAINTENANCE_REQUIRED' ? 'FAULT' : 'IDLE',
        processingTimeRemaining: st.processingTimeRemaining,
        assignedOperatorName: st.assignedOperator,
      });
    }

    const pipelineEdges: [string, string][] = [
      ['truck_rm1', 'unloading_rm1'],
      ['unloading_rm1', 'inventory_rm1'],
      ['inventory_rm1', 'transporter_rm1'],
      ['transporter_rm1', 'cnc_lathe'],
      ['cnc_lathe', 'buffer_rm1'],
      ['buffer_rm1', 'qc_rm1'],
      ['qc_rm1', 'converge_join'],

      ['truck_rm2', 'unloading_rm2'],
      ['unloading_rm2', 'inventory_rm2'],
      ['inventory_rm2', 'transporter_rm2'],
      ['transporter_rm2', 'cnc_milling'],
      ['cnc_milling', 'buffer_rm2'],
      ['buffer_rm2', 'qc_rm2'],
      ['qc_rm2', 'converge_join'],

      ['truck_rm3', 'unloading_rm3'],
      ['unloading_rm3', 'inventory_rm3'],
      ['inventory_rm3', 'transporter_rm3'],
      ['transporter_rm3', 'cnc_shaping'],
      ['cnc_shaping', 'buffer_rm3'],
      ['buffer_rm3', 'qc_rm3'],
      ['qc_rm3', 'converge_join'],

      ['converge_join', 'final_assembly'],
      ['final_assembly', 'packaging'],
      ['packaging', 'transporter_out'],
      ['transporter_out', 'sink_dispatch'],
    ];

    for (let i = 0; i < pipelineEdges.length; i++) {
      const [fromId, toId] = pipelineEdges[i];
      if (blocks.some(b => b.id === fromId) && blocks.some(b => b.id === toId)) {
        connections.push({
          id: `conn-${fromId}-${toId}`,
          fromBlockId: fromId,
          fromPortId: 'out-1',
          toBlockId: toId,
          toPortId: 'in-1',
          transferRateSeconds: 1.5,
          activeEntities: 0,
        });
      }
    }

    setLayoutState({
      blocks,
      connections,
      entities: [],
      isRunning: false,
      simulationSpeed: 1,
      simulatedSeconds: 0,
      totalCompletedCount: 0,
      systemWipCount: 0,
      bottleneckBlockId: null,
    });
    setSelectedBlockId(null);
    setApplySuccessMessage('Loaded Active Physical Plant Twin Layout onto Simulink Sheet!');
    setTimeout(() => setApplySuccessMessage(null), 3500);
  };

  const handleApplyToPlantTwin = () => {
    if (onApplyLayoutToPlantTwin) {
      onApplyLayoutToPlantTwin(layoutState.blocks, layoutState.connections);
      setApplySuccessMessage('Custom Layout & Block Parameters Successfully Applied to Physical Plant Twin!');
      setTimeout(() => setApplySuccessMessage(null), 4000);
    }
  };

  // Simulation loop for custom topology
  useEffect(() => {
    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const safeDt = Math.min(0.2, Math.max(0.01, dt));

      setLayoutState(prev => tickCustomLayoutSimulation(prev, safeDt));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('aerotwin_custom_simulink_layout', JSON.stringify(layoutState));
      } catch {
        // ignore
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [layoutState]);

  const handleTogglePlay = () => {
    setLayoutState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const handleReset = () => {
    setLayoutState(prev => {
      const reset = createDefaultCustomLayout();
      return {
        ...prev,
        blocks: prev.blocks.map(b => ({
          ...b,
          currentlyProcessing: 0,
          inQueue: b.category === 'SOURCE' ? 120 : 0,
          processedCount: 0,
          status: 'IDLE',
          processingTimeRemaining: 0,
        })),
        entities: [],
        simulatedSeconds: 0,
        totalCompletedCount: 0,
        systemWipCount: 0,
      };
    });
  };

  const handleSpeedChange = (speed: number) => {
    setLayoutState(prev => ({ ...prev, simulationSpeed: speed }));
  };

  // Add block from palette
  const handleAddBlock = (category: CustomBlockCategory, name: string, cycleTime = 4.0) => {
    const id = `blk-${category.toLowerCase()}-${Date.now() % 10000}`;
    const x = 300 + Math.random() * 150;
    const y = 180 + Math.random() * 120;

    const newBlock: CustomBlock = {
      id,
      name,
      tag: name.toUpperCase().replace(/\s+/g, '_'),
      category,
      x: Math.round(x / 20) * 20,
      y: Math.round(y / 20) * 20,
      width: 170,
      height: 90,
      inputs: category === 'SOURCE' ? [] : [{ id: 'in-1', type: 'INPUT', label: 'Infeed' }],
      outputs: category === 'SINK' ? [] : [{ id: 'out-1', type: 'OUTPUT', label: 'Outfeed' }],
      cycleTimeSeconds: cycleTime,
      queueCapacity: 25,
      failureRatePerHour: 0.02,
      powerKw: 15.0,
      costPerHour: 35.0,
      colorTheme: 'cyan',
      currentlyProcessing: 0,
      inQueue: category === 'SOURCE' ? 120 : 0,
      processedCount: 0,
      blockedCount: 0,
      utilization: 0,
      status: 'IDLE',
      processingTimeRemaining: 0,
    };

    setLayoutState(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
    setSelectedBlockId(id);
  };

  // Delete selected block
  const handleDeleteBlock = (blockId: string) => {
    setLayoutState(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== blockId),
      connections: prev.connections.filter(
        c => c.fromBlockId !== blockId && c.toBlockId !== blockId
      ),
      entities: prev.entities.filter(e => e.currentBlockId !== blockId),
    }));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  };

  // Delete a connection
  const handleDeleteConnection = (connId: string) => {
    setLayoutState(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c.id !== connId),
    }));
  };

  // Port click for connecting
  const handlePortClick = (blockId: string, portId: string, type: 'INPUT' | 'OUTPUT') => {
    if (type === 'OUTPUT') {
      setConnectingSource({ blockId, portId });
    } else if (type === 'INPUT' && connectingSource) {
      if (connectingSource.blockId === blockId) {
        // Can't connect to itself
        setConnectingSource(null);
        return;
      }

      // Check if connection already exists
      const exists = layoutState.connections.some(
        c =>
          c.fromBlockId === connectingSource.blockId &&
          c.fromPortId === connectingSource.portId &&
          c.toBlockId === blockId &&
          c.toPortId === portId
      );

      if (!exists) {
        const newConn: CustomConnection = {
          id: `conn-${connectingSource.blockId}-${blockId}-${Date.now() % 1000}`,
          fromBlockId: connectingSource.blockId,
          fromPortId: connectingSource.portId,
          toBlockId: blockId,
          toPortId: portId,
          transferRateSeconds: 1.5,
          activeEntities: 0,
        };

        setLayoutState(prev => ({
          ...prev,
          connections: [...prev.connections, newConn],
        }));
      }
      setConnectingSource(null);
    }
  };

  // Mouse drag handling for positioning blocks
  const handleBlockMouseDown = (e: React.MouseEvent, block: CustomBlock) => {
    e.stopPropagation();
    setSelectedBlockId(block.id);
    setDraggedBlockId(block.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - block.x,
        y: e.clientY - rect.top - block.y,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggedBlockId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(20, Math.min(2200, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(20, Math.min(1200, e.clientY - rect.top - dragOffset.y));

    // Snap to 10px grid
    const snappedX = Math.round(newX / 10) * 10;
    const snappedY = Math.round(newY / 10) * 10;

    setLayoutState(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.id === draggedBlockId ? { ...b, x: snappedX, y: snappedY } : b
      ),
    }));
  };

  const handleCanvasMouseUp = () => {
    setDraggedBlockId(null);
  };

  // Block selected for properties
  const selectedBlock = layoutState.blocks.find(b => b.id === selectedBlockId);

  // Preset layouts loader
  const handleLoadPreset = (presetName: string) => {
    if (presetName === 'blank') {
      setLayoutState({
        blocks: [],
        connections: [],
        entities: [],
        isRunning: false,
        simulationSpeed: 1,
        simulatedSeconds: 0,
        totalCompletedCount: 0,
        systemWipCount: 0,
        bottleneckBlockId: null,
      });
      setSelectedBlockId(null);
    } else {
      setLayoutState(createDefaultCustomLayout());
      setSelectedBlockId(null);
    }
  };

  return (
    <div className="flex flex-col h-[780px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Controls Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white rounded-lg">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white text-sm flex items-center gap-2">
              Simulink-Style Custom Layout Canvas
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-mono">
                Interactive Factory Topology
              </span>
            </span>
            <p className="text-[11px] text-slate-400">
              Drag manufacturing blocks onto the sheet, wire ports together, and simulate autonomous material flow
            </p>
          </div>
        </div>

        {/* Simulation Execution Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePlay}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition ${
              layoutState.isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {layoutState.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{layoutState.isRunning ? 'Pause' : 'Run Simulation'}</span>
          </button>

          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            title="Reset Simulation State"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset</span>
          </button>

          {/* Speed Multipliers */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            {[1, 5, 15, 60].map(spd => (
              <button
                key={spd}
                onClick={() => handleSpeedChange(spd)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition ${
                  layoutState.simulationSpeed === spd
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Presets */}
          <select
            onChange={e => handleLoadPreset(e.target.value)}
            defaultValue="default"
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 font-medium"
          >
            <option value="default">Preset: 6-Stage Aerospace Line</option>
            <option value="blank">New Blank Canvas</option>
          </select>

          {/* Plant Twin Integration Buttons */}
          <button
            onClick={handleLoadActiveTwinLayout}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
            title="Load current running stations & cycle times from the Physical Plant Twin onto this Simulink canvas"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Load Active Twin Layout</span>
          </button>

          <button
            onClick={handleApplyToPlantTwin}
            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-950/60 border border-cyan-400/40 transition"
            title="Apply all custom block parameters, cycle times, queue capacities, and layout to the live Physical Plant Twin"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-200" />
            <span>Apply Layout to Physical Plant Twin</span>
          </button>
        </div>
      </div>

      {/* Real-time Layout Application Banner */}
      {applySuccessMessage && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 border-b border-emerald-500/50 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in duration-200 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <strong className="text-white font-bold">{applySuccessMessage}</strong>
          </div>
          {onSwitchToPhysicalTwinView && (
            <button
              onClick={onSwitchToPhysicalTwinView}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md text-xs flex items-center gap-1 transition"
            >
              <span>View in Physical Plant Twin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Workspace (Palette + Canvas + Inspector) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Side: Simulink Block Palette */}
        <div className="w-64 bg-slate-900/90 border-r border-slate-800 p-3.5 overflow-y-auto space-y-4 shrink-0 text-xs">
          <div>
            <div className="font-bold text-white uppercase text-[10px] tracking-wider mb-2 flex items-center gap-1.5 text-cyan-400">
              <Plus className="w-3.5 h-3.5" />
              <span>Block Library (Click to Add)</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Click any block to place it on the canvas sheet:
            </p>
          </div>

          {/* Category: Source */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">
              1. Material Inflow
            </span>
            <button
              onClick={() => handleAddBlock('SOURCE', 'Raw Material Inflow Dock', 3.5)}
              className="w-full text-left p-2 bg-slate-950 hover:bg-slate-800 border border-blue-900/60 rounded-lg flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300">
                    Material Inflow Dock
                  </div>
                  <div className="text-[9px] text-slate-500">Source generator (3.5s)</div>
                </div>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
            </button>
          </div>

          {/* Category: Processing Machines */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
              2. Machining & Processing
            </span>
            <button
              onClick={() => handleAddBlock('PROCESSING', 'CNC Lathe Machine', 6.0)}
              className="w-full text-left p-2 bg-slate-950 hover:bg-slate-800 border border-indigo-900/60 rounded-lg flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300">
                    CNC Lathe (Turning)
                  </div>
                  <div className="text-[9px] text-slate-500">Cycle: 6.0 min (360s)</div>
                </div>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
            </button>

            <button
              onClick={() => handleAddBlock('PROCESSING', 'CNC Milling Center', 4.0)}
              className="w-full text-left p-2 bg-slate-950 hover:bg-slate-800 border border-indigo-900/60 rounded-lg flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300">
                    CNC Milling Machine
                  </div>
                  <div className="text-[9px] text-slate-500">Cycle: 4.0 min (240s)</div>
                </div>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
            </button>

            <button
              onClick={() => handleAddBlock('PROCESSING', 'CNC Gear Shaping', 3.5)}
              className="w-full text-left p-2 bg-slate-950 hover:bg-slate-800 border border-indigo-900/60 rounded-lg flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300">
                    CNC Gear Shaping
                  </div>
                  <div className="text-[9px] text-slate-500">Cycle: 3.5 min (210s)</div>
                </div>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
            </button>
          </div>

          {/* Category: Transport */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">
              3. Transporter Conveyors
            </span>
            <button
              onClick={() => handleAddBlock('TRANSPORT', 'Flat Belt Conveyor', 3.0)}
              className="w-full text-left p-2 bg-slate-950 hover:bg-slate-800 border border-cyan-900/60 rounded-lg flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300">
                    Belt Conveyor Transport
                  </div>
                  <div className="text-[9px] text-slate-500">Tension monitored (3s)</div>
                </div>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
            </button>
          </div>

          {/* Category: Queues */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
              4. Buffers & Queues
            </span>
            <button
              onClick={() => handleAddBlock('QUEUE', 'FIFO Staging Buffer', 0.5)}
              className="w-full text-left p-2 bg-slate-950 hover:bg-slate-800 border border-amber-900/60 rounded-lg flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300">
                    FIFO Intermediate Buffer
                  </div>
                  <div className="text-[9px] text-slate-500">Decouples bottlenecks</div>
                </div>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
            </button>
          </div>

          {/* Category: Quality */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
              5. Metrology & QC
            </span>
            <button
              onClick={() => handleAddBlock('QUALITY', '3-Stage QC Subsystem', 3.5)}
              className="w-full text-left p-2 bg-slate-950 hover:bg-slate-800 border border-emerald-900/60 rounded-lg flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300">
                    Quality Control & Rework
                  </div>
                  <div className="text-[9px] text-slate-500">Check I-III inspection</div>
                </div>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
            </button>
          </div>

          {/* Category: Assembly & Sink */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">
              6. Assembly & Dispatch
            </span>
            <button
              onClick={() => handleAddBlock('ASSEMBLY', 'Final Assembly Cell', 4.0)}
              className="w-full text-left p-2 bg-slate-950 hover:bg-slate-800 border border-purple-900/60 rounded-lg flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300">
                    Final Assembly Cell
                  </div>
                  <div className="text-[9px] text-slate-500">Combines parts (4.0m)</div>
                </div>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
            </button>

            <button
              onClick={() => handleAddBlock('SINK', 'Warehouse Outfeed (Sink)', 1.0)}
              className="w-full text-left p-2 bg-slate-950 hover:bg-slate-800 border border-rose-900/60 rounded-lg flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300">
                    Warehouse Dispatch
                  </div>
                  <div className="text-[9px] text-slate-500">Finished goods sink</div>
                </div>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Center: Simulink Interactive Sheet */}
        <div
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={() => {
            if (connectingSource) setConnectingSource(null);
          }}
          className="flex-1 bg-slate-950 overflow-auto relative select-none cursor-crosshair min-w-0 w-full"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(51, 65, 85, 0.3) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* Wire Connections (SVG Layer) */}
          <svg className="absolute inset-0 w-[2400px] h-[1600px] pointer-events-none z-10">
            <defs>
              <marker
                id="wire-arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#06b6d4" />
              </marker>
            </defs>

            {layoutState.connections.map(conn => {
              const fromBlock = layoutState.blocks.find(b => b.id === conn.fromBlockId);
              const toBlock = layoutState.blocks.find(b => b.id === conn.toBlockId);
              if (!fromBlock || !toBlock) return null;

              // Compute port positions
              const startX = fromBlock.x + fromBlock.width;
              const startY = fromBlock.y + fromBlock.height / 2;
              const endX = toBlock.x;
              const endY = toBlock.y + toBlock.height / 2;

              // Cubic Bezier curve control points
              const dx = Math.abs(endX - startX) * 0.5;
              const pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

              return (
                <g key={conn.id} className="pointer-events-auto group">
                  {/* Background fat wire for easy clicking */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
                    className="cursor-pointer"
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm('Delete this signal connection wire?')) {
                        handleDeleteConnection(conn.id);
                      }
                    }}
                  />
                  {/* Visible Wire */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                    markerEnd="url(#wire-arrow)"
                    className="group-hover:stroke-cyan-400 group-hover:stroke-[3.5] transition"
                  />

                  {/* Flow Particles along active wire */}
                  {layoutState.entities
                    .filter(e => e.currentConnectionId === conn.id)
                    .map(ent => {
                      const t = ent.wireProgressRatio ?? 0;
                      // Approximate cubic Bezier coordinate
                      const px =
                        Math.pow(1 - t, 3) * startX +
                        3 * Math.pow(1 - t, 2) * t * (startX + dx) +
                        3 * (1 - t) * Math.pow(t, 2) * (endX - dx) +
                        Math.pow(t, 3) * endX;
                      const py =
                        Math.pow(1 - t, 3) * startY +
                        3 * Math.pow(1 - t, 2) * t * startY +
                        3 * (1 - t) * Math.pow(t, 2) * endY +
                        Math.pow(t, 3) * endY;

                      return (
                        <circle
                          key={ent.id}
                          cx={px}
                          cy={py}
                          r="5"
                          fill="#38bdf8"
                          className="animate-pulse shadow-lg shadow-cyan-400"
                        />
                      );
                    })}
                </g>
              );
            })}

            {/* Connecting wire draft */}
            {connectingSource && (
              <g>
                {(() => {
                  const fromBlock = layoutState.blocks.find(b => b.id === connectingSource.blockId);
                  if (!fromBlock) return null;
                  const startX = fromBlock.x + fromBlock.width;
                  const startY = fromBlock.y + fromBlock.height / 2;
                  return (
                    <circle
                      cx={startX}
                      cy={startY}
                      r="7"
                      fill="#06b6d4"
                      className="animate-ping"
                    />
                  );
                })()}
              </g>
            )}
          </svg>

          {/* Render Blocks */}
          {layoutState.blocks.map(block => {
            const isSelected = block.id === selectedBlockId;
            const style = CATEGORY_STYLES[block.category] || CATEGORY_STYLES.PROCESSING;

            return (
              <div
                key={block.id}
                onMouseDown={e => handleBlockMouseDown(e, block)}
                style={{
                  transform: `translate3d(${block.x}px, ${block.y}px, 0)`,
                  width: `${block.width}px`,
                  height: `${block.height}px`,
                }}
                className={`absolute z-20 rounded-xl border p-2.5 shadow-xl transition-shadow flex flex-col justify-between cursor-move select-none ${
                  isSelected
                    ? 'border-cyan-400 ring-2 ring-cyan-500/50 shadow-cyan-950/80 bg-slate-900'
                    : `${style.border} ${style.bg} hover:border-slate-500`
                }`}
              >
                {/* Block Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    {style.icon}
                    <span className="font-bold text-white text-[11px] truncate">{block.name}</span>
                  </div>
                  <span
                    className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      block.status === 'BUSY'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : block.status === 'STARVED'
                        ? 'bg-slate-900 text-slate-400 border border-slate-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {block.status}
                  </span>
                </div>

                {/* Real-Time Live Metrics inside block */}
                <div className="grid grid-cols-3 gap-1 text-[9px] bg-slate-950/80 rounded-lg p-1 border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block">Queue</span>
                    <strong className="text-amber-300 font-mono text-[10px]">{block.inQueue}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Active</span>
                    <strong className="text-cyan-300 font-mono text-[10px]">
                      {block.currentlyProcessing}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Done</span>
                    <strong className="text-emerald-400 font-mono text-[10px]">
                      {block.processedCount}
                    </strong>
                  </div>
                </div>

                {/* Cycle Time progress indicator */}
                <div className="flex items-center justify-between text-[8px] text-slate-400">
                  <span>Cycle: {block.cycleTimeSeconds}s</span>
                  <span>Util: {block.utilization}%</span>
                </div>

                {/* Input Port (Left side) */}
                {block.inputs.map(port => (
                  <button
                    key={port.id}
                    title="Input Port (Click here after clicking an Outfeed port to wire)"
                    onClick={e => {
                      e.stopPropagation();
                      handlePortClick(block.id, port.id, 'INPUT');
                    }}
                    className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-900 border-2 border-cyan-500 hover:bg-cyan-400 hover:scale-125 transition flex items-center justify-center shadow-lg z-30"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </button>
                ))}

                {/* Output Port (Right side) */}
                {block.outputs.map(port => (
                  <button
                    key={port.id}
                    title="Output Port (Click here to start wiring a connection to downstream block)"
                    onClick={e => {
                      e.stopPropagation();
                      handlePortClick(block.id, port.id, 'OUTPUT');
                    }}
                    className={`absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 transition flex items-center justify-center shadow-lg z-30 ${
                      connectingSource?.blockId === block.id
                        ? 'bg-cyan-400 border-white scale-125 animate-ping'
                        : 'bg-slate-900 border-cyan-500 hover:bg-cyan-400 hover:scale-125'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Right Side: Block Inspector & Properties Panel */}
        <div className="w-72 bg-slate-900/90 border-l border-slate-800 p-4 overflow-y-auto shrink-0 text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Block Properties Inspector</span>
            </span>
          </div>

          {selectedBlock ? (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Block Name</label>
                <input
                  type="text"
                  value={selectedBlock.name}
                  onChange={e => {
                    const val = e.target.value;
                    setLayoutState(prev => ({
                      ...prev,
                      blocks: prev.blocks.map(b =>
                        b.id === selectedBlock.id ? { ...b, name: val } : b
                      ),
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-medium"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">
                  Processing Cycle Time (Seconds)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="60"
                  value={selectedBlock.cycleTimeSeconds}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setLayoutState(prev => ({
                      ...prev,
                      blocks: prev.blocks.map(b =>
                        b.id === selectedBlock.id ? { ...b, cycleTimeSeconds: val } : b
                      ),
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-cyan-300 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Queue Capacity</label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={selectedBlock.queueCapacity}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setLayoutState(prev => ({
                      ...prev,
                      blocks: prev.blocks.map(b =>
                        b.id === selectedBlock.id ? { ...b, queueCapacity: val } : b
                      ),
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-amber-300 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">
                  Operating Cost ($/Hour)
                </label>
                <input
                  type="number"
                  min="5"
                  max="200"
                  value={selectedBlock.costPerHour}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setLayoutState(prev => ({
                      ...prev,
                      blocks: prev.blocks.map(b =>
                        b.id === selectedBlock.id ? { ...b, costPerHour: val } : b
                      ),
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Assigned Operator</label>
                <input
                  type="text"
                  placeholder="e.g. John Chen (Machinist)"
                  value={selectedBlock.assignedOperatorName || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setLayoutState(prev => ({
                      ...prev,
                      blocks: prev.blocks.map(b =>
                        b.id === selectedBlock.id ? { ...b, assignedOperatorName: val } : b
                      ),
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white"
                />
              </div>

              {/* Block Statistics Box */}
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Units Processed:</span>
                  <strong className="text-emerald-400 font-mono">
                    {selectedBlock.processedCount}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Queue:</span>
                  <strong className="text-amber-300 font-mono">{selectedBlock.inQueue}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Utilization Score:</span>
                  <strong className="text-cyan-300 font-mono">{selectedBlock.utilization}%</strong>
                </div>
              </div>

              <button
                onClick={() => handleDeleteBlock(selectedBlock.id)}
                className="w-full py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Block from Sheet</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 space-y-2">
              <Layers className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">Click any block in the canvas to inspect and edit its parameters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer KPI bar */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-4 text-slate-400">
          <span>
            Total Blocks: <strong className="text-white">{layoutState.blocks.length}</strong>
          </span>
          <span>
            Connections: <strong className="text-cyan-400">{layoutState.connections.length}</strong>
          </span>
          <span>
            System WIP: <strong className="text-amber-400">{layoutState.systemWipCount}</strong>
          </span>
          <span>
            Completed Outfeed: <strong className="text-emerald-400">{layoutState.totalCompletedCount}</strong>
          </span>
        </div>

        <div className="text-[11px] text-slate-400">
          Tip: Click right port of block A, then left port of block B to connect.
        </div>
      </div>
    </div>
  );
};
