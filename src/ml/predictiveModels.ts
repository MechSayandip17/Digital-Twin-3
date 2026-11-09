/**
 * Machine Learning Models & Predictive Maintenance Engine
 * Tailored for discrete manufacturing plant equipment:
 * - CNC Machines (Lathe, Milling, Shaping)
 * - Conveyor Transporters & Material Handling
 * - Assembly & Packaging Motors
 */

import { FaultType, MLDetectionResult, StationSensors } from '../types/factory';

// Baseline nominal operating parameters for healthy equipment
export const NOMINAL_BASELINES: Record<string, StationSensors> = {
  cnc: {
    vibrationRms: 1.8, // mm/s
    vibrationPeak: 0.9, // g
    temperature: 42.0, // °C
    motorCurrent: 12.5, // A
    acousticEmission: 22.0, // kHz
    toolWearIndex: 0.05, // mm
    speedRpm: 3200,
  },
  transporter: {
    vibrationRms: 1.2,
    vibrationPeak: 0.4,
    temperature: 36.0,
    motorCurrent: 6.8,
    acousticEmission: 14.0,
    toolWearIndex: 0.0,
    conveyorTension: 450, // Newtons
    speedRpm: 120,
  },
  assembly: {
    vibrationRms: 1.5,
    vibrationPeak: 0.6,
    temperature: 38.5,
    motorCurrent: 9.2,
    acousticEmission: 18.0,
    toolWearIndex: 0.0,
    speedRpm: 1800,
  },
  general: {
    vibrationRms: 1.4,
    vibrationPeak: 0.5,
    temperature: 37.0,
    motorCurrent: 8.0,
    acousticEmission: 16.0,
    toolWearIndex: 0.0,
  },
};

/**
 * Calculate statistical features:
 * - Crest Factor = Peak / RMS
 * - Temperature deviation
 * - Current deviation
 * - Acoustic burst index
 */
export function extractFeatures(sensors: StationSensors, baseline: StationSensors) {
  const vibRatio = sensors.vibrationRms / Math.max(0.1, baseline.vibrationRms);
  const crestFactor = sensors.vibrationPeak / Math.max(0.1, sensors.vibrationRms);
  const tempDelta = sensors.temperature - baseline.temperature;
  const currentRatio = sensors.motorCurrent / Math.max(0.1, baseline.motorCurrent);
  const aeRatio = sensors.acousticEmission / Math.max(0.1, baseline.acousticEmission);
  const toolWear = sensors.toolWearIndex;
  const tensionDelta = (baseline.conveyorTension ?? 450) - (sensors.conveyorTension ?? 450);

  return {
    vibRatio,
    crestFactor,
    tempDelta,
    currentRatio,
    aeRatio,
    toolWear,
    tensionDelta,
  };
}

/**
 * Model 1: Isolation Forest & Mahalanobis Distance Emulator
 * Best suited for: Unsupervised anomaly detection when failure labeled data is scarce.
 * Outputs normalized anomaly score between 0.0 (strictly nominal) and 1.0 (severe outlier).
 */
export function calculateIsolationForestScore(
  sensors: StationSensors,
  baseline: StationSensors
): number {
  const feats = extractFeatures(sensors, baseline);

  // Multivariate squared normalized Mahalanobis distance proxy
  const vibZ = Math.max(0, (feats.vibRatio - 1.0) / 0.8);
  const tempZ = Math.max(0, feats.tempDelta / 12.0);
  const currZ = Math.max(0, Math.abs(feats.currentRatio - 1.0) / 0.35);
  const aeZ = Math.max(0, (feats.aeRatio - 1.0) / 1.1);
  const wearZ = Math.max(0, feats.toolWear / 0.25);
  const tensionZ = Math.max(0, Math.abs(feats.tensionDelta) / 80.0);

  const mahalanobisDist = Math.sqrt(
    vibZ * vibZ * 1.5 +
    tempZ * tempZ * 1.3 +
    currZ * currZ * 1.1 +
    aeZ * aeZ * 1.2 +
    wearZ * wearZ * 1.8 +
    tensionZ * tensionZ * 1.2
  );

  // Sigmoidal calibration to [0, 1] range: 0.5 threshold represents anomaly alert
  const score = 1 / (1 + Math.exp(-1.4 * (mahalanobisDist - 2.2)));
  return Math.min(1.0, Math.max(0.0, Number(score.toFixed(3))));
}

/**
 * Model 2: Deep Autoencoder Reconstruction Error Emulator
 * Best suited for: Multichannel temporal sensor stream validation.
 * Healthy operating patterns have low reconstruction MSE (<0.08). Unseen harmonics spike error.
 */
export function calculateAutoencoderError(
  sensors: StationSensors,
  baseline: StationSensors
): number {
  const feats = extractFeatures(sensors, baseline);
  
  // Reconstruction error simulates non-linear bottleneck latent representation loss
  const vibLoss = Math.pow(Math.max(0, feats.vibRatio - 1.0), 2.2);
  const tempLoss = Math.pow(Math.max(0, feats.tempDelta / 15.0), 2.0);
  const currLoss = Math.pow(Math.abs(feats.currentRatio - 1.0), 2.1);
  const aeLoss = Math.pow(Math.max(0, feats.aeRatio - 1.0), 1.9);

  const mse = (vibLoss * 0.35 + tempLoss * 0.25 + currLoss * 0.2 + aeLoss * 0.2);
  return Math.min(2.5, Math.max(0.01, Number(mse.toFixed(3))));
}

/**
 * Model 3: Random Forest / Gradient Boosted Multi-Class Fault Classifier
 * Best suited for: Root-cause identification once an anomaly is triggered.
 */
export function classifyFailureMode(
  sensors: StationSensors,
  baseline: StationSensors,
  stationType: string,
  activeFault: FaultType = 'NONE'
): {
  predictedClass: string;
  probability: number;
  contributingFeatures: { name: string; impact: number }[];
} {
  // 1. If an actual fault is actively present or injected on this station, accurately identify and classify it!
  if (activeFault && activeFault !== 'NONE') {
    switch (activeFault) {
      case 'SPINDLE_BEARING_VIBRATION':
      case 'BEARING_INNER_RACE_FAULT':
        return {
          predictedClass: 'Spindle Bearing Inner/Outer Race Fatigue & Roller Spall',
          probability: 0.96,
          contributingFeatures: [
            { name: 'Vibration RMS Velocity (ISO 10816 Zone C/D)', impact: 0.58 },
            { name: 'Impact Crest Factor Spike (>3.0)', impact: 0.28 },
            { name: 'Acoustic Emission High Harmonics', impact: 0.14 },
          ],
        };
      case 'SPINDLE_THERMAL_EXPANSION':
      case 'SPINDLE_OVERHEAT_LUB_FAIL':
        return {
          predictedClass: 'Spindle Bearing Thermal Breakdown (Lubrication Starvation)',
          probability: 0.95,
          contributingFeatures: [
            { name: 'Spindle Bearing Core Temperature (>65°C)', impact: 0.60 },
            { name: 'Frictional Motor Load Current', impact: 0.25 },
            { name: 'Viscous Shear Resistance', impact: 0.15 },
          ],
        };
      case 'CHIP_CONVEYOR_CLOG':
        return {
          predictedClass: 'Chip Evacuation Flute Clog & Spindle Overload',
          probability: 0.93,
          contributingFeatures: [
            { name: 'Motor Load Current Spike', impact: 0.55 },
            { name: 'Flute Backpressure Vibration', impact: 0.30 },
            { name: 'Acoustic Grinding Bursts', impact: 0.15 },
          ],
        };
      case 'TOOL_FLANK_WEAR':
        return {
          predictedClass: 'Tool Flank Wear & Edge Chipping (ISO 3685 VB)',
          probability: 0.97,
          contributingFeatures: [
            { name: 'Flank Wear Land Growth (VB)', impact: 0.50 },
            { name: 'High-Frequency Acoustic Bursts', impact: 0.32 },
            { name: 'Cutting Force Motor Torque', impact: 0.18 },
          ],
        };
      case 'BELT_SLIP_AND_TENSION_LOSS':
        return {
          predictedClass: 'Conveyor Belt Slippage & Drive Tension Loss',
          probability: 0.97,
          contributingFeatures: [
            { name: 'Take-Up Pulley Tension Drop (<380N)', impact: 0.65 },
            { name: 'Tachometer Drive Ripple', impact: 0.22 },
            { name: 'Roller Friction Thermal Dissipation', impact: 0.13 },
          ],
        };
      case 'ROLLER_BEARING_OVERHEAT':
        return {
          predictedClass: 'Conveyor Idler Roller Overheat & Bearing Seizure',
          probability: 0.92,
          contributingFeatures: [
            { name: 'Idler Roller Shell Temp', impact: 0.58 },
            { name: 'Rolling Element Friction', impact: 0.27 },
            { name: 'Axle Vibration Harmonic', impact: 0.15 },
          ],
        };
      case 'CONVEYOR_MOTOR_OVERLOAD':
        return {
          predictedClass: 'Conveyor Motor Overload & Gearbox Inverter Trip',
          probability: 0.94,
          contributingFeatures: [
            { name: 'Motor Stator Amperage', impact: 0.64 },
            { name: 'Conveyor Load Friction', impact: 0.22 },
            { name: 'Drive Efficiency Loss', impact: 0.14 },
          ],
        };
      case 'OPTICAL_LENS_FOULED':
        return {
          predictedClass: 'Optical Laser Metrology Lens Contamination',
          probability: 0.95,
          contributingFeatures: [
            { name: 'Photodiode Beam Attenuation', impact: 0.65 },
            { name: 'Optical Dispersion Noise', impact: 0.22 },
            { name: 'Calibration Deviation', impact: 0.13 },
          ],
        };
      case 'GAUGE_CALIBRATION_DRIFT':
        return {
          predictedClass: 'Metrology Gauge Zero-Point Calibration Drift',
          probability: 0.93,
          contributingFeatures: [
            { name: 'Laser Micrometer Zero Bias', impact: 0.60 },
            { name: 'Thermal Anvil Expansion', impact: 0.25 },
            { name: 'Reference Standard Variance', impact: 0.15 },
          ],
        };
      case 'PROBE_ACTUATOR_RESPONSE_LAG':
        return {
          predictedClass: 'CMM Tactile Probe Actuator Response Lag',
          probability: 0.91,
          contributingFeatures: [
            { name: 'Solenoid Extension Latency', impact: 0.55 },
            { name: 'Pneumatic Actuator Friction', impact: 0.30 },
            { name: 'Inspection Cycle Time Deviation', impact: 0.15 },
          ],
        };
      case 'TORQUE_DRIVER_OUT_OF_SPEC':
        return {
          predictedClass: 'Digital Nutrunner Fastening Torque Calibration Excursion',
          probability: 0.96,
          contributingFeatures: [
            { name: 'Fastening Torque Cell Transducer Error', impact: 0.65 },
            { name: 'Angle Encoder Variance', impact: 0.20 },
            { name: 'Motor Current Ripple', impact: 0.15 },
          ],
        };
      case 'PNEUMATIC_PRESSURE_DROP':
        return {
          predictedClass: 'Assembly Pneumatic Supply Pressure Drop (<5.0 bar)',
          probability: 0.95,
          contributingFeatures: [
            { name: 'Regulator Manifold Pressure Delta', impact: 0.68 },
            { name: 'Clamp Actuation Time', impact: 0.20 },
            { name: 'Flow Velocity Deficit', impact: 0.12 },
          ],
        };
      case 'OPERATOR_ASSEMBLY_BOTTLENECK':
        return {
          predictedClass: 'Ergonomic Assembly Cell Pace Bottleneck',
          probability: 0.88,
          contributingFeatures: [
            { name: 'Cycle Time vs Takt Ratio', impact: 0.58 },
            { name: 'Buffer Inflow Backlog', impact: 0.28 },
            { name: 'Operator Fatigue Index', impact: 0.14 },
          ],
        };
      case 'SEALER_HEATER_ELEMENT_FAULT':
        return {
          predictedClass: 'Packaging Heat Sealer Thermal Resistance Fault',
          probability: 0.94,
          contributingFeatures: [
            { name: 'Nichrome Heating Element Temp', impact: 0.62 },
            { name: 'Thermocouple Feedback Discrepancy', impact: 0.24 },
            { name: 'Film Weld Integrity Risk', impact: 0.14 },
          ],
        };
      case 'BARCODE_SCANNER_MISREAD':
        return {
          predictedClass: 'Laser Barcode Serialization Scanner Optical Misread',
          probability: 0.91,
          contributingFeatures: [
            { name: 'Barcode Scan Contrast Level', impact: 0.60 },
            { name: 'Raster Frequency Drift', impact: 0.25 },
            { name: 'Label Alignment Offset', impact: 0.15 },
          ],
        };
      case 'STRAPPING_DISPENSER_JAM':
        return {
          predictedClass: 'Automated Polypropylene Strapping Dispenser Jam',
          probability: 0.93,
          contributingFeatures: [
            { name: 'Tension Wheel Stall Torque', impact: 0.60 },
            { name: 'Feed Track Optical Interruption', impact: 0.25 },
            { name: 'Motor Current Lock', impact: 0.15 },
          ],
        };
      case 'DELIVERY_TRAFFIC_CONGESTION':
        return {
          predictedClass: 'Raw Material Delivery Transport Traffic Congestion',
          probability: 0.90,
          contributingFeatures: [
            { name: 'Carrier ETA Window Delay', impact: 0.70 },
            { name: 'Dock Weighbridge Idle State', impact: 0.20 },
            { name: 'Staging Buffer Depletion', impact: 0.10 },
          ],
        };
      case 'STORAGE_HUMIDITY_EXCURSION':
        return {
          predictedClass: 'Buffer Storage Rack Moisture Surge (>65% RH)',
          probability: 0.94,
          contributingFeatures: [
            { name: 'Relative Humidity Sensor Spike', impact: 0.65 },
            { name: 'Dew Point Proximity', impact: 0.22 },
            { name: 'Surface Oxidation Risk', impact: 0.13 },
          ],
        };
      case 'INFEED_CHUTE_INDEXING_STALL':
        return {
          predictedClass: 'Infeed Chute Optical Indexing Latch Stall',
          probability: 0.92,
          contributingFeatures: [
            { name: 'Optical Beam-Break Latch Block', impact: 0.62 },
            { name: 'Pneumatic Pusher Timeout', impact: 0.24 },
            { name: 'Escapement Chute Queue', impact: 0.14 },
          ],
        };
      case 'MOTOR_WINDING_OVERCURRENT':
        return {
          predictedClass: 'Motor Stator Overcurrent & Drive Inverter Fault',
          probability: 0.95,
          contributingFeatures: [
            { name: 'Stator Phase Current Spike', impact: 0.68 },
            { name: 'Thermal Dissipation Deficit', impact: 0.20 },
            { name: 'Torque Ripple', impact: 0.12 },
          ],
        };
      default:
        break;
    }
  }

  // 2. Unsupervised / heuristic classification based on live sensor stream patterns
  const feats = extractFeatures(sensors, baseline);
  const isConveyor = stationType.includes('transporter');
  const isCnc = stationType.includes('cnc');

  // Critical ISO 10816 Alarm or severe crest factor
  if (sensors.vibrationRms > 4.5 || feats.crestFactor > 2.8) {
    return {
      predictedClass: 'Bearing Inner/Outer Race Spalling (ISO 10816 Zone C/D Alarm)',
      probability: 0.91,
      contributingFeatures: [
        { name: 'Vibration RMS Velocity', impact: 0.55 },
        { name: 'Impact Crest Factor', impact: 0.30 },
        { name: 'Bearing Pass Frequencies (BPFI)', impact: 0.15 },
      ],
    };
  }

  // Severe thermal breakdown
  if (feats.tempDelta > 20 && feats.currentRatio > 1.25) {
    return {
      predictedClass: 'Spindle Bearing Thermal Breakdown (Lubrication Starvation)',
      probability: 0.92,
      contributingFeatures: [
        { name: 'Spindle Temperature Rise', impact: 0.52 },
        { name: 'Frictional Motor Load', impact: 0.32 },
        { name: 'Viscosity Shearing', impact: 0.16 },
      ],
    };
  }

  // Severe conveyor slip
  if (isConveyor && (feats.tensionDelta > 60 || (sensors.conveyorTension ?? 450) < 380)) {
    return {
      predictedClass: 'Conveyor Belt Slippage & Drive Tension Loss',
      probability: 0.94,
      contributingFeatures: [
        { name: 'Belt Tension Loss', impact: 0.65 },
        { name: 'Motor Drive Ripple', impact: 0.22 },
        { name: 'Roller Friction Temp', impact: 0.13 },
      ],
    };
  }

  // Severe tool wear (critical threshold)
  if (isCnc && (feats.toolWear >= 0.28 || (sensors.toolWearIndex ?? 0) >= 0.28)) {
    const vb = (sensors.toolWearIndex ?? feats.toolWear).toFixed(2);
    return {
      predictedClass: `Critical Tool Flank Wear (ISO 3685 VB: ${vb}mm - Replacement Due)`,
      probability: 0.96,
      contributingFeatures: [
        { name: 'Flank Wear Land Growth (VB)', impact: 0.55 },
        { name: 'Cutting Force Motor Torque', impact: 0.28 },
        { name: 'Acoustic Emission Bursts', impact: 0.17 },
      ],
    };
  }

  // Moderate / Progressive tool flank wear (Advisory progression)
  if (isCnc && (feats.toolWear >= 0.14 || (sensors.toolWearIndex ?? 0) >= 0.14)) {
    const vb = (sensors.toolWearIndex ?? feats.toolWear).toFixed(2);
    return {
      predictedClass: `Tool Flank Wear - Advisory Progression (VB: ${vb}mm)`,
      probability: 0.86,
      contributingFeatures: [
        { name: 'Flank Land Progression', impact: 0.50 },
        { name: 'Micro-Chipping Friction', impact: 0.30 },
        { name: 'Acoustic AE Intensity', impact: 0.20 },
      ],
    };
  }

  // Moderate dynamic unbalance (ISO 10816 Zone B - advisory)
  if (sensors.vibrationRms > 2.8) {
    return {
      predictedClass: 'Dynamic Mechanical Unbalance (ISO 10816 Zone B Advisory)',
      probability: 0.83,
      contributingFeatures: [
        { name: 'Vibration RMS Velocity', impact: 0.60 },
        { name: 'Shaft 1X/2X Harmonics', impact: 0.25 },
        { name: 'Foundation Alignment', impact: 0.15 },
      ],
    };
  }

  // Thermal dissipation elevation
  if (feats.tempDelta > 12 || sensors.temperature > 52.0) {
    return {
      predictedClass: `Elevated Thermal Gradient (Delta-T: +${feats.tempDelta.toFixed(1)}°C)`,
      probability: 0.82,
      contributingFeatures: [
        { name: 'Spindle/Motor Heat Retention', impact: 0.58 },
        { name: 'Coolant Flow Velocity Deficit', impact: 0.26 },
        { name: 'Ambient Dissipation Lag', impact: 0.16 },
      ],
    };
  }

  // Conveyor tension micro-relaxation
  if (isConveyor && (feats.tensionDelta > 25 || (sensors.conveyorTension ?? 450) < 425)) {
    return {
      predictedClass: 'Conveyor Belt Tension Relaxation (Take-Up Pulley Wear)',
      probability: 0.84,
      contributingFeatures: [
        { name: 'Belt Static Tension Loss', impact: 0.62 },
        { name: 'Drive Pulley Friction Delta', impact: 0.24 },
        { name: 'Idler Roller Drag', impact: 0.14 },
      ],
    };
  }

  if (feats.currentRatio > 1.35 || sensors.motorCurrent > 15.0) {
    return {
      predictedClass: 'Motor Stator Overcurrent & Drive Inverter Fault',
      probability: 0.94,
      contributingFeatures: [
        { name: 'Stator Phase Current Spike', impact: 0.68 },
        { name: 'Thermal Dissipation Deficit', impact: 0.20 },
        { name: 'Torque Ripple', impact: 0.12 },
      ],
    };
  }

  return {
    predictedClass: 'Nominal Operating Condition',
    probability: 0.97,
    contributingFeatures: [
      { name: 'Vibration RMS within ISO 10816-3 Zone A', impact: 0.35 },
      { name: 'Operating Temperature Stable', impact: 0.35 },
      { name: 'Nominal Current Draw', impact: 0.30 },
    ],
  };
}

/**
 * Model 4: Tuned Weibull Hazard Rate & Remaining Useful Life (RUL) Regressor
 * Computes operating hours remaining before reaching catastrophic failure threshold.
 */
export function estimateRUL(
  anomalyScore: number,
  toolWearIndex: number,
  vibrationRms: number,
  isConveyor: boolean,
  activeFault: FaultType = 'NONE',
  operatingHours: number = 0
): number {
  // Catastrophic failure thresholds (immediate shutdown)
  if (toolWearIndex >= 0.35 || vibrationRms >= 7.5 || anomalyScore >= 0.95) {
    return 0.0;
  }

  // Active failure emergency degradation
  if (activeFault && activeFault !== 'NONE') {
    switch (activeFault) {
      case 'SPINDLE_BEARING_VIBRATION':
      case 'BEARING_INNER_RACE_FAULT':
        return Number(Math.max(2.0, Math.min(18.0, 36.0 - Math.max(0, vibrationRms - 3.0) * 6.0)).toFixed(1));
      case 'SPINDLE_THERMAL_EXPANSION':
      case 'SPINDLE_OVERHEAT_LUB_FAIL':
        return Number(Math.max(1.5, Math.min(14.0, 28.0 - anomalyScore * 20.0)).toFixed(1));
      case 'BELT_SLIP_AND_TENSION_LOSS':
      case 'ROLLER_BEARING_OVERHEAT':
      case 'CONVEYOR_MOTOR_OVERLOAD':
        return Number(Math.max(3.0, Math.min(22.0, 35.0 - anomalyScore * 22.0)).toFixed(1));
      case 'TOOL_FLANK_WEAR':
        return Number(Math.max(1.0, Math.min(45.0, (0.35 - toolWearIndex) / 0.005)).toFixed(1));
      default:
        return Number(Math.max(4.0, Math.min(24.0, 32.0 * (1.0 - anomalyScore))).toFixed(1));
    }
  }

  // Nominal progressive degradation based on elapsed operating hours and stress
  const baseOperatingLife = isConveyor ? 650.0 : 450.0;
  const toolPenalty = (toolWearIndex / 0.35) * 110.0;
  const vibPenalty = Math.max(0, vibrationRms - 1.5) * 22.0;
  const stressPenalty = anomalyScore * 45.0;
  const cycleHours = operatingHours % 300.0;
  const hoursRemaining = baseOperatingLife - cycleHours * 1.0 - toolPenalty - vibPenalty - stressPenalty;

  return Math.max(15.0, Number(hoursRemaining.toFixed(1)));
}

/**
 * Generates prescriptive maintenance instructions based on ML diagnosis
 */
export function getPrescriptiveAction(
  predictedClass: string,
  rulHours: number,
  stationName: string
): string {
  if (predictedClass.includes('Tool Flank')) {
    return `Schedule carbide insert replacement on ${stationName}. Flank wear reached advisory. Estimated window: ${rulHours} hrs before dimensional scrap occurs.`;
  }
  if (predictedClass.includes('Bearing')) {
    return `Perform precision vibration FFT spectrum inspection on ${stationName}. Check ISO 10816 Zone C alarm. Re-grease or swap deep-groove ball bearings within ${rulHours} hrs.`;
  }
  if (predictedClass.includes('Belt Slippage')) {
    return `Inspect conveyor drive motor on ${stationName}. Check optical tachometer slip & adjust take-up pulley tension to 450N. Window: ${rulHours} hrs.`;
  }
  if (predictedClass.includes('Thermal')) {
    return `Emergency coolant purge & oil circulation check on ${stationName}. Spindle bearing lubrication starved. Shut down if temperature exceeds 75°C.`;
  }
  if (predictedClass.includes('Motor')) {
    return `Perform Megger insulation resistance test & verify drive inverter current limits on ${stationName}.`;
  }
  if (predictedClass.includes('Lens') || predictedClass.includes('Metrology')) {
    return `Perform optical isopropyl alcohol cleaning on ${stationName} laser receiver and verify micrometer calibration standard.`;
  }
  if (predictedClass.includes('Pneumatic') || predictedClass.includes('Torque')) {
    return `Inspect pneumatic manifold regulator pressure and verify torque transducer calibration using master strain gauge.`;
  }
  if (predictedClass.includes('Sealer') || predictedClass.includes('Packaging')) {
    return `Inspect heating element resistance and verify optical barcode verification contrast calibration.`;
  }
  if (predictedClass.includes('Storage') || predictedClass.includes('Humidity')) {
    return `Engage climate-controlled dehumidification cycle in buffer zone. Verify ambient humidity returns below 50% RH.`;
  }
  return `Station operating normally. Continue scheduled predictive monitoring. Next routine inspection in ${rulHours} hrs.`;
}

/**
 * Full Pipeline: Ingests raw sensors and outputs consolidated ML inference
 */
export function runPredictivePipeline(
  sensors: StationSensors,
  stationType: string,
  stationName: string,
  activeFault: FaultType = 'NONE',
  operatingHours: number = 0
): MLDetectionResult {
  const category = stationType.includes('cnc')
    ? 'cnc'
    : stationType.includes('transporter')
    ? 'transporter'
    : stationType.includes('assembly') || stationType.includes('packaging')
    ? 'assembly'
    : 'general';

  const baseline = NOMINAL_BASELINES[category];
  const isoScore = calculateIsolationForestScore(sensors, baseline);
  const aeError = calculateAutoencoderError(sensors, baseline);
  
  // Combined calibrated anomaly score (spikes if active fault is present)
  let combinedScore = Math.min(1.0, isoScore * 0.65 + Math.min(1.0, aeError / 1.2) * 0.35);
  if (activeFault && activeFault !== 'NONE') {
    combinedScore = Math.max(0.65, combinedScore);
  }
  const isAnomaly = combinedScore >= 0.45;

  const classification = classifyFailureMode(sensors, baseline, stationType, activeFault);
  const isConveyor = stationType.includes('transporter');
  const rulHours = estimateRUL(combinedScore, sensors.toolWearIndex || 0, sensors.vibrationRms, isConveyor, activeFault, operatingHours);
  const prescriptiveAction = getPrescriptiveAction(classification.predictedClass, rulHours, stationName);

  return {
    anomalyScore: Number(combinedScore.toFixed(3)),
    isAnomaly,
    isolationForestScore: isoScore,
    autoencoderReconstructionError: aeError,
    predictedFailureClass: classification.predictedClass,
    predictedFailureProb: Number((classification.probability * 100).toFixed(1)),
    remainingUsefulLifeHours: rulHours,
    modelConfidence: Number((Math.min(99.4, 88 + (1 - combinedScore) * 10)).toFixed(1)),
    prescriptiveAction,
    contributingFeatures: classification.contributingFeatures,
  };
}

/**
 * Model Comparison Matrix Guide for Student & Mentor Documentation
 */
export interface MLModelSpec {
  name: string;
  category: 'Anomaly Detection' | 'Fault Classification' | 'Remaining Useful Life (RUL)';
  algorithm: string;
  suitabilityScore: number; // 1-10
  bestUsedFor: string;
  strengths: string[];
  limitations: string[];
  inputFeatures: string[];
  matlabToolboxEquivalent: string;
  pythonImplementation: string;
}

export const ML_MODELS_GUIDE: MLModelSpec[] = [
  {
    name: 'Isolation Forest (iForest)',
    category: 'Anomaly Detection',
    algorithm: 'Ensemble Partitioning Trees',
    suitabilityScore: 9.6,
    bestUsedFor: 'Unsupervised detection of rare anomalies across multi-sensor factory telemetry (vibration + current + temp).',
    strengths: [
      'Does not require labeled failure data (crucial in manufacturing where machines rarely break).',
      'Linear time complexity O(n); runs effortlessly on edge microcontrollers / Raspberry Pi / MATLAB.',
      'Handles multi-dimensional feature correlation without heavy normalization.',
    ],
    limitations: [
      'Cannot classify the exact failure root cause; only tells you an anomaly occurred.',
      'Sensitivity threshold must be tuned to avoid false alarms during normal load transitions.',
    ],
    inputFeatures: ['Vibration RMS', 'Spindle Temperature', 'Motor Current', 'Acoustic Emission'],
    matlabToolboxEquivalent: 'MATLAB Statistics and Machine Learning Toolbox: isolationForest()',
    pythonImplementation: 'sklearn.ensemble.IsolationForest(contamination=0.03, n_estimators=100)',
  },
  {
    name: 'Deep Autoencoders (Reconstruction Loss)',
    category: 'Anomaly Detection',
    algorithm: 'Deep Bottleneck Neural Network (MLP / Conv1D / LSTM)',
    suitabilityScore: 9.3,
    bestUsedFor: 'Continuous time-series sensor streams with complex cyclical vibrations and harmonic patterns.',
    strengths: [
      'Learns subtle non-linear physical interactions between feed rate, spindle RPM, and motor current.',
      'Reconstruction Mean Squared Error (MSE) provides a continuous, highly calibrated degradation index.',
      'Can process raw high-frequency accelerometer waveforms directly via 1D Convolutional Autoencoder.',
    ],
    limitations: [
      'Requires GPU or neural accelerator for training.',
      'Higher latency than tree-based models if deployed on low-cost microcontrollers.',
    ],
    inputFeatures: ['Vibration Time Series', 'Harmonic Fast Fourier Transform (FFT) Bins', 'Acoustic Emission Spectrogram'],
    matlabToolboxEquivalent: 'Deep Learning Toolbox: trainAutoencoder() or dlnetwork()',
    pythonImplementation: 'PyTorch / TensorFlow Keras: Sequential([Dense(32, activation="relu"), Dense(8), Dense(32), Dense(n)])',
  },
  {
    name: 'Random Forest & XGBoost Multi-Class',
    category: 'Fault Classification',
    algorithm: 'Gradient Boosted Decision Trees / Random Forest',
    suitabilityScore: 9.5,
    bestUsedFor: 'Pinpointing the exact physical defect (Bearing Spall vs Tool Wear vs Belt Slack vs Lubrication Loss).',
    strengths: [
      'Highest benchmark classification accuracy (>96%) on tabular sensor feature extractions.',
      'Feature importance ranking (SHAP values) explains why the model made a prediction (mentor requirement!).',
      'Extremely robust to outliers and missing sensor packets.',
    ],
    limitations: [
      'Requires historical training data containing labeled failure run-to-failure records (e.g. NASA C-MAPSS or IMS bearing dataset).',
    ],
    inputFeatures: ['Crest Factor', 'Kurtosis', 'Vibration RMS', 'Flank Wear Index', 'Belt Tension', 'Current THD'],
    matlabToolboxEquivalent: 'Statistics and Machine Learning Toolbox: TreeBagger() or fitcensemble()',
    pythonImplementation: 'xgboost.XGBClassifier(n_estimators=150, max_depth=6, learning_rate=0.05)',
  },
  {
    name: 'Weibull Proportional Hazards & Exponential RUL',
    category: 'Remaining Useful Life (RUL)',
    algorithm: 'Parametric Survival Analysis & Exponential Degradation Tracking',
    suitabilityScore: 9.1,
    bestUsedFor: 'Predicting hours/cycles until component reaches catastrophic failure boundary.',
    strengths: [
      'Gives maintenance teams a clear operational countdown (e.g., "14.2 hours remaining").',
      'Directly answers the fundamental question of predictive maintenance: "When should we shut down?"',
      'Provides confidence intervals (90% lower/upper bounds) for risk-averse aerospace/automotive parts.',
    ],
    limitations: [
      'Requires establishing critical safety thresholds (e.g. ISO 10816 Zone D threshold: 7.1 mm/s).',
    ],
    inputFeatures: ['Cumulative Operating Hours', 'Degradation Trajectory Slope', 'Temperature Stress Factor'],
    matlabToolboxEquivalent: 'Predictive Maintenance Toolbox: exponentialDegradationModel() & wblfit()',
    pythonImplementation: 'lifelines.WeibullFitter() or scipy.stats.weibull_min',
  },
];
