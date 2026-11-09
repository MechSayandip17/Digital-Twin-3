import {
  CustomBlock,
  CustomConnection,
  CustomLayoutEntity,
  CustomLayoutState,
} from '../types/customLayout';

export function createDefaultCustomLayout(): CustomLayoutState {
  const blocks: CustomBlock[] = [
    {
      id: 'blk-source-1',
      name: 'Raw Material Dock (Inflow)',
      tag: 'SOURCE_INFLOW',
      category: 'SOURCE',
      x: 60,
      y: 160,
      width: 170,
      height: 90,
      inputs: [],
      outputs: [{ id: 'out-1', type: 'OUTPUT', label: 'Outfeed' }],
      cycleTimeSeconds: 4.0, // emits an item every 4s
      queueCapacity: 50,
      failureRatePerHour: 0.01,
      powerKw: 12.0,
      costPerHour: 25.0,
      colorTheme: 'blue',
      currentlyProcessing: 1,
      inQueue: 120,
      processedCount: 0,
      blockedCount: 0,
      utilization: 85,
      status: 'BUSY',
      processingTimeRemaining: 3.5,
      assignedOperatorName: 'Dock Logistics Automation',
    },
    {
      id: 'blk-conv-1',
      name: 'Infeed Belt Conveyor',
      tag: 'CONVEYOR_1',
      category: 'TRANSPORT',
      x: 300,
      y: 160,
      width: 170,
      height: 90,
      inputs: [{ id: 'in-1', type: 'INPUT', label: 'Infeed' }],
      outputs: [{ id: 'out-1', type: 'OUTPUT', label: 'Outfeed' }],
      cycleTimeSeconds: 3.0,
      queueCapacity: 10,
      failureRatePerHour: 0.02,
      powerKw: 8.5,
      costPerHour: 15.0,
      colorTheme: 'cyan',
      currentlyProcessing: 0,
      inQueue: 0,
      processedCount: 0,
      blockedCount: 0,
      utilization: 40,
      status: 'IDLE',
      processingTimeRemaining: 0,
    },
    {
      id: 'blk-cnc-1',
      name: 'CNC Machining Center',
      tag: 'CNC_MACHINING',
      category: 'PROCESSING',
      x: 540,
      y: 160,
      width: 180,
      height: 90,
      inputs: [{ id: 'in-1', type: 'INPUT', label: 'Infeed' }],
      outputs: [{ id: 'out-1', type: 'OUTPUT', label: 'Outfeed' }],
      cycleTimeSeconds: 5.5,
      queueCapacity: 20,
      failureRatePerHour: 0.04,
      powerKw: 45.0,
      costPerHour: 65.0,
      colorTheme: 'indigo',
      currentlyProcessing: 0,
      inQueue: 0,
      processedCount: 0,
      blockedCount: 0,
      utilization: 60,
      status: 'IDLE',
      processingTimeRemaining: 0,
      assignedOperatorName: 'John Chen (Machinist)',
    },
    {
      id: 'blk-buffer-1',
      name: 'Staging Queue Buffer',
      tag: 'BUFFER_FIFO',
      category: 'QUEUE',
      x: 790,
      y: 160,
      width: 160,
      height: 90,
      inputs: [{ id: 'in-1', type: 'INPUT', label: 'Infeed' }],
      outputs: [{ id: 'out-1', type: 'OUTPUT', label: 'Outfeed' }],
      cycleTimeSeconds: 0.5,
      queueCapacity: 40,
      failureRatePerHour: 0.0,
      powerKw: 2.0,
      costPerHour: 5.0,
      colorTheme: 'amber',
      currentlyProcessing: 0,
      inQueue: 0,
      processedCount: 0,
      blockedCount: 0,
      utilization: 20,
      status: 'IDLE',
      processingTimeRemaining: 0,
    },
    {
      id: 'blk-qc-1',
      name: 'Laser Metrology & QC',
      tag: 'QC_METROLOGY',
      category: 'QUALITY',
      x: 1020,
      y: 160,
      width: 170,
      height: 90,
      inputs: [{ id: 'in-1', type: 'INPUT', label: 'Infeed' }],
      outputs: [{ id: 'out-1', type: 'OUTPUT', label: 'Pass Outfeed' }],
      cycleTimeSeconds: 3.5,
      queueCapacity: 15,
      failureRatePerHour: 0.015,
      powerKw: 14.0,
      costPerHour: 40.0,
      colorTheme: 'emerald',
      currentlyProcessing: 0,
      inQueue: 0,
      processedCount: 0,
      blockedCount: 0,
      utilization: 50,
      status: 'IDLE',
      processingTimeRemaining: 0,
      assignedOperatorName: 'Sarah Jenkins (Metrologist)',
    },
    {
      id: 'blk-sink-1',
      name: 'Warehouse & Dispatch Outfeed',
      tag: 'SINK_WAREHOUSE',
      category: 'SINK',
      x: 1260,
      y: 160,
      width: 180,
      height: 90,
      inputs: [{ id: 'in-1', type: 'INPUT', label: 'Arrival' }],
      outputs: [],
      cycleTimeSeconds: 2.0,
      queueCapacity: 500,
      failureRatePerHour: 0.0,
      powerKw: 10.0,
      costPerHour: 20.0,
      colorTheme: 'purple',
      currentlyProcessing: 0,
      inQueue: 0,
      processedCount: 0,
      blockedCount: 0,
      utilization: 30,
      status: 'IDLE',
      processingTimeRemaining: 0,
      assignedOperatorName: 'Outfeed Logistics Unit',
    },
  ];

  const connections: CustomConnection[] = [
    {
      id: 'conn-1-2',
      fromBlockId: 'blk-source-1',
      fromPortId: 'out-1',
      toBlockId: 'blk-conv-1',
      toPortId: 'in-1',
      transferRateSeconds: 1.5,
      activeEntities: 0,
    },
    {
      id: 'conn-2-3',
      fromBlockId: 'blk-conv-1',
      fromPortId: 'out-1',
      toBlockId: 'blk-cnc-1',
      toPortId: 'in-1',
      transferRateSeconds: 2.0,
      activeEntities: 0,
    },
    {
      id: 'conn-3-4',
      fromBlockId: 'blk-cnc-1',
      fromPortId: 'out-1',
      toBlockId: 'blk-buffer-1',
      toPortId: 'in-1',
      transferRateSeconds: 1.5,
      activeEntities: 0,
    },
    {
      id: 'conn-4-5',
      fromBlockId: 'blk-buffer-1',
      fromPortId: 'out-1',
      toBlockId: 'blk-qc-1',
      toPortId: 'in-1',
      transferRateSeconds: 1.5,
      activeEntities: 0,
    },
    {
      id: 'conn-5-6',
      fromBlockId: 'blk-qc-1',
      fromPortId: 'out-1',
      toBlockId: 'blk-sink-1',
      toPortId: 'in-1',
      transferRateSeconds: 2.0,
      activeEntities: 0,
    },
  ];

  return {
    blocks,
    connections,
    entities: [],
    isRunning: true,
    simulationSpeed: 1,
    simulatedSeconds: 0,
    totalCompletedCount: 0,
    systemWipCount: 0,
    bottleneckBlockId: 'blk-cnc-1',
  };
}

export function tickCustomLayoutSimulation(
  state: CustomLayoutState,
  realDt: number
): CustomLayoutState {
  if (!state.isRunning) return state;

  const dt = realDt * state.simulationSpeed;
  const newSimSeconds = state.simulatedSeconds + dt;

  const blockMap = new Map<string, CustomBlock>();
  state.blocks.forEach(b => blockMap.set(b.id, { ...b }));

  let entities = state.entities.map(e => ({ ...e }));
  let completedCount = state.totalCompletedCount;

  // 1. Advance entities moving along connections
  const updatedConnections = state.connections.map(c => {
    let active = 0;
    entities = entities.map(e => {
      if (e.currentConnectionId === c.id) {
        active++;
        const prog = (e.wireProgressRatio ?? 0) + dt / Math.max(0.2, c.transferRateSeconds);
        if (prog >= 1.0) {
          // Arrived at target block
          const targetBlock = blockMap.get(c.toBlockId);
          if (targetBlock) {
            targetBlock.inQueue++;
          }
          return {
            ...e,
            currentBlockId: c.toBlockId,
            currentConnectionId: undefined,
            wireProgressRatio: 0,
            isProcessing: false,
          };
        }
        return { ...e, wireProgressRatio: prog };
      }
      return e;
    });
    return { ...c, activeEntities: active };
  });

  // 2. Process blocks
  let entityCounter = Date.now() % 10000;
  blockMap.forEach(block => {
    // If Source block: periodically emit entity
    if (block.category === 'SOURCE') {
      block.processingTimeRemaining -= dt;
      if (block.processingTimeRemaining <= 0) {
        block.processingTimeRemaining = block.cycleTimeSeconds;
        block.processedCount++;
        if (block.inQueue > 0) block.inQueue--;

        // Find outgoing connection
        const outConn = updatedConnections.find(c => c.fromBlockId === block.id);
        if (outConn) {
          const newEntity: CustomLayoutEntity = {
            id: `entity-${block.id}-${++entityCounter}`,
            code: `ITM-${Math.floor(Math.random() * 899 + 100)}`,
            currentBlockId: '',
            currentConnectionId: outConn.id,
            wireProgressRatio: 0,
            isProcessing: false,
            creationTime: newSimSeconds,
          };
          entities.push(newEntity);
        }
      }
      block.status = 'BUSY';
      block.currentlyProcessing = 1;
      block.utilization = 90;
      return;
    }

    // If Sink block: consume entities and mark completed
    if (block.category === 'SINK') {
      if (block.inQueue > 0) {
        completedCount += block.inQueue;
        block.processedCount += block.inQueue;
        // remove entities that reached this sink
        entities = entities.filter(e => e.currentBlockId !== block.id);
        block.inQueue = 0;
      }
      block.status = block.processedCount > 0 ? 'BUSY' : 'IDLE';
      block.currentlyProcessing = 0;
      block.utilization = Math.min(100, Math.round((block.processedCount / Math.max(1, newSimSeconds / 60)) * 20));
      return;
    }

    // Standard Processing / Queue / Quality / Assembly block:
    if (block.currentlyProcessing > 0) {
      block.processingTimeRemaining -= dt;
      if (block.processingTimeRemaining <= 0) {
        // Finished processing this workpiece
        block.currentlyProcessing = 0;
        block.processedCount++;

        // Route to outgoing connection
        const outConn = updatedConnections.find(c => c.fromBlockId === block.id);
        if (outConn) {
          // Find the entity that was at this block
          const ent = entities.find(e => e.currentBlockId === block.id && e.isProcessing);
          if (ent) {
            ent.currentBlockId = '';
            ent.currentConnectionId = outConn.id;
            ent.wireProgressRatio = 0;
            ent.isProcessing = false;
          }
        }
      }
      block.status = 'BUSY';
    } else {
      // Pick next entity from queue if available
      if (block.inQueue > 0) {
        block.inQueue--;
        block.currentlyProcessing = 1;
        block.processingTimeRemaining = block.cycleTimeSeconds;
        block.status = 'BUSY';

        const ent = entities.find(e => e.currentBlockId === block.id && !e.isProcessing);
        if (ent) {
          ent.isProcessing = true;
        }
      } else {
        block.status = 'STARVED';
      }
    }

    // Dynamic utilization score
    const busyRatio = block.currentlyProcessing > 0 ? 0.9 : block.inQueue > 0 ? 0.5 : 0.1;
    block.utilization = Math.round(block.utilization * 0.95 + busyRatio * 100 * 0.05);
  });

  // 3. Find bottleneck block (highest queue + cycle time)
  let maxQueue = -1;
  let bottleneckId: string | null = null;
  blockMap.forEach(b => {
    if (b.category !== 'SINK' && b.category !== 'SOURCE') {
      const score = b.inQueue * 10 + b.cycleTimeSeconds;
      if (score > maxQueue) {
        maxQueue = score;
        bottleneckId = b.id;
      }
    }
  });

  return {
    ...state,
    blocks: Array.from(blockMap.values()),
    connections: updatedConnections,
    entities,
    simulatedSeconds: newSimSeconds,
    totalCompletedCount: completedCount,
    systemWipCount: entities.length,
    bottleneckBlockId: bottleneckId,
  };
}
