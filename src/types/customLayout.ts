export type CustomBlockCategory =
  | 'SOURCE'
  | 'PROCESSING'
  | 'TRANSPORT'
  | 'QUEUE'
  | 'QUALITY'
  | 'ASSEMBLY'
  | 'SINK';

export interface CustomPort {
  id: string;
  type: 'INPUT' | 'OUTPUT';
  label: string;
  maxConnections?: number;
}

export interface CustomBlock {
  id: string;
  name: string;
  tag: string;
  category: CustomBlockCategory;
  x: number;
  y: number;
  width: number;
  height: number;
  inputs: CustomPort[];
  outputs: CustomPort[];
  
  // Operational Parameters
  cycleTimeSeconds: number; // default processing duration
  queueCapacity: number; // for buffers and machines
  failureRatePerHour: number; // probability factor
  powerKw: number; // electrical load
  costPerHour: number; // operating cost rate
  colorTheme: string; // Tailwind color accent
  
  // Real-Time Simulation State
  currentlyProcessing: number;
  inQueue: number;
  processedCount: number;
  blockedCount: number;
  utilization: number;
  status: 'IDLE' | 'BUSY' | 'BLOCKED' | 'STARVED' | 'FAULT';
  processingTimeRemaining: number;
  assignedOperatorName?: string;
}

export interface CustomConnection {
  id: string;
  fromBlockId: string;
  fromPortId: string;
  toBlockId: string;
  toPortId: string;
  transferRateSeconds: number; // delay along wire
  activeEntities: number; // items currently in flight
}

export interface CustomLayoutEntity {
  id: string;
  code: string;
  currentBlockId: string;
  currentConnectionId?: string;
  wireProgressRatio?: number; // 0.0 to 1.0 along connection wire
  isProcessing: boolean;
  creationTime: number;
}

export interface CustomLayoutState {
  blocks: CustomBlock[];
  connections: CustomConnection[];
  entities: CustomLayoutEntity[];
  isRunning: boolean;
  simulationSpeed: number; // 1x, 5x, 15x, 60x
  simulatedSeconds: number;
  totalCompletedCount: number;
  systemWipCount: number;
  bottleneckBlockId: string | null;
}
