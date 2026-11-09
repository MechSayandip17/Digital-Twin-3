export type EmployeeRole =
  | 'CNC_MACHINIST'
  | 'ASSEMBLY_TECH'
  | 'QC_INSPECTOR'
  | 'MAINTENANCE_ENGINEER'
  | 'MATERIAL_HANDLER'
  | 'LINE_SUPERVISOR';

export type EmployeeShift = 'SHIFT_1_DAY' | 'SHIFT_2_SWING' | 'SHIFT_3_NIGHT';

export type EmployeeStatus = 'ACTIVE' | 'ON_BREAK' | 'TRAINING' | 'OFF_SHIFT';

export interface Employee {
  id: string;
  employeeId: string; // e.g. "EMP-1001"
  name: string;
  role: EmployeeRole;
  assignedStationId: string; // Station ID, line ID, or 'ALL'
  shift: EmployeeShift;
  skillCertification: string;
  hourlyWage: number; // INR (₹) per hour
  efficiencyRating: number; // 0.8x to 1.3x multiplier
  status: EmployeeStatus;
  hireDate: string;
}

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    employeeId: 'ME-OPR-4412',
    name: 'Rajesh Sharma',
    role: 'CNC_MACHINIST',
    assignedStationId: 'cnc_lathe',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'NIMS CNC Turning Master Level II',
    hourlyWage: 385.0, // ₹385/hr
    efficiencyRating: 1.15,
    status: 'ACTIVE',
    hireDate: '2022-03-15',
  },
  {
    id: 'emp-2',
    employeeId: 'ME-MNT-8891',
    name: 'Priyanka Banerjee',
    role: 'MAINTENANCE_ENGINEER',
    assignedStationId: 'ALL',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Vibration Analyst ISO 18436-2 Cat III',
    hourlyWage: 440.0, // ₹440/hr
    efficiencyRating: 1.2,
    status: 'ACTIVE',
    hireDate: '2021-10-30',
  },
  {
    id: 'emp-3',
    employeeId: 'ME-QAC-3309',
    name: 'Anirban Sengupta',
    role: 'QC_INSPECTOR',
    assignedStationId: 'qc_rm1',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'ASQ Certified Quality Inspector (CQI)',
    hourlyWage: 410.0, // ₹410/hr
    efficiencyRating: 1.2,
    status: 'ACTIVE',
    hireDate: '2021-08-01',
  },
  {
    id: 'emp-admin-1',
    employeeId: 'CHIEF-ENG-01',
    name: 'Sayandip Mallick',
    role: 'LINE_SUPERVISOR',
    assignedStationId: 'ALL',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Chief Manufacturing Systems Architect & Six Sigma Master Black Belt',
    hourlyWage: 750.0,
    efficiencyRating: 1.3,
    status: 'ACTIVE',
    hireDate: '2020-01-01',
  },
  {
    id: 'emp-admin-2',
    employeeId: '2023MEB003',
    name: 'Nilesh Banik',
    role: 'MAINTENANCE_ENGINEER',
    assignedStationId: 'ALL',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Plant Reliability Engineering & ISO 10816 Vibration Master',
    hourlyWage: 600.0,
    efficiencyRating: 1.25,
    status: 'ACTIVE',
    hireDate: '2021-05-10',
  },
  {
    id: 'emp-admin-3',
    employeeId: '2023MEB015',
    name: 'Soumyajit Chakraborty',
    role: 'LINE_SUPERVISOR',
    assignedStationId: 'ALL',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Discrete Event SCADA & Lean Operations Specialist',
    hourlyWage: 600.0,
    efficiencyRating: 1.25,
    status: 'ACTIVE',
    hireDate: '2021-06-15',
  },
  {
    id: 'emp-admin-4',
    employeeId: '2023MEB019',
    name: 'Chitrayan Biswas',
    role: 'QC_INSPECTOR',
    assignedStationId: 'ALL',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'CMM Metrology & ISO 9001 Lead Quality Auditor',
    hourlyWage: 600.0,
    efficiencyRating: 1.25,
    status: 'ACTIVE',
    hireDate: '2021-07-20',
  },
  {
    id: 'emp-4',
    employeeId: 'TASL-OPR-881',
    name: 'Vikram Verma',
    role: 'CNC_MACHINIST',
    assignedStationId: 'cnc_milling',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Mastercam 5-Axis Aerospace Milling Certified',
    hourlyWage: 370.0,
    efficiencyRating: 1.1,
    status: 'ACTIVE',
    hireDate: '2023-01-10',
  },
  {
    id: 'emp-5',
    employeeId: 'ME-OPR-4413',
    name: 'Maria Santos',
    role: 'CNC_MACHINIST',
    assignedStationId: 'cnc_shaping',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'AGMA Gear Hobbing & Shaping Standard',
    hourlyWage: 360.0,
    efficiencyRating: 1.05,
    status: 'ACTIVE',
    hireDate: '2023-06-22',
  },
  {
    id: 'emp-6',
    employeeId: 'ME-ASM-9021',
    name: 'Karan Verma',
    role: 'ASSEMBLY_TECH',
    assignedStationId: 'final_assembly',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Aerospace Mechanical Assembly Level 4',
    hourlyWage: 340.0,
    efficiencyRating: 1.15,
    status: 'ACTIVE',
    hireDate: '2023-04-05',
  },
  {
    id: 'emp-7',
    employeeId: 'ME-PKG-6110',
    name: 'Deepak Kumar',
    role: 'ASSEMBLY_TECH',
    assignedStationId: 'packaging',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Automated Packaging & Barcode Serialization',
    hourlyWage: 295.0,
    efficiencyRating: 1.0,
    status: 'ACTIVE',
    hireDate: '2024-07-12',
  },
];
