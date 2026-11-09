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
    employeeId: 'EMP-1001',
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
    employeeId: 'EMP-1002',
    name: 'Maria Santos',
    role: 'CNC_MACHINIST',
    assignedStationId: 'cnc_milling',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Mastercam 5-Axis Milling Certified',
    hourlyWage: 370.0, // ₹370/hr
    efficiencyRating: 1.1,
    status: 'ACTIVE',
    hireDate: '2023-01-10',
  },
  {
    id: 'emp-3',
    employeeId: 'EMP-1003',
    name: 'Amit Patel',
    role: 'CNC_MACHINIST',
    assignedStationId: 'cnc_shaping',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'AGMA Gear Hobbing & Shaping Standard',
    hourlyWage: 360.0, // ₹360/hr
    efficiencyRating: 1.05,
    status: 'ACTIVE',
    hireDate: '2023-06-22',
  },
  {
    id: 'emp-4',
    employeeId: 'EMP-1004',
    name: 'Sarah Jenkins',
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
    id: 'emp-5',
    employeeId: 'EMP-1005',
    name: 'Vikram Joshi',
    role: 'QC_INSPECTOR',
    assignedStationId: 'qc_rm2',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Zeiss CMM Metrology Specialist',
    hourlyWage: 395.0, // ₹395/hr
    efficiencyRating: 1.1,
    status: 'ACTIVE',
    hireDate: '2022-11-14',
  },
  {
    id: 'emp-6',
    employeeId: 'EMP-1006',
    name: 'Kenji Sato',
    role: 'QC_INSPECTOR',
    assignedStationId: 'qc_rm3',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Optical Surface Roughness & Hardness Testing',
    hourlyWage: 380.0, // ₹380/hr
    efficiencyRating: 1.05,
    status: 'ACTIVE',
    hireDate: '2024-02-18',
  },
  {
    id: 'emp-7',
    employeeId: 'EMP-1007',
    name: 'Karan Verma',
    role: 'ASSEMBLY_TECH',
    assignedStationId: 'final_assembly',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Aerospace Mechanical Assembly Level 4',
    hourlyWage: 340.0, // ₹340/hr
    efficiencyRating: 1.15,
    status: 'ACTIVE',
    hireDate: '2023-04-05',
  },
  {
    id: 'emp-8',
    employeeId: 'EMP-1008',
    name: 'Deepak Kumar',
    role: 'ASSEMBLY_TECH',
    assignedStationId: 'packaging',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Automated Packaging & Barcode Serialization',
    hourlyWage: 295.0, // ₹295/hr
    efficiencyRating: 1.0,
    status: 'ACTIVE',
    hireDate: '2024-07-12',
  },
  {
    id: 'emp-9',
    employeeId: 'EMP-1009',
    name: 'Sanjay Deshmukh',
    role: 'LINE_SUPERVISOR',
    assignedStationId: 'ALL',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Six Sigma Black Belt & Lean Manufacturing',
    hourlyWage: 480.0, // ₹480/hr
    efficiencyRating: 1.25,
    status: 'ACTIVE',
    hireDate: '2020-05-19',
  },
  {
    id: 'emp-10',
    employeeId: 'EMP-1010',
    name: 'Priya Sharma',
    role: 'MAINTENANCE_ENGINEER',
    assignedStationId: 'ALL',
    shift: 'SHIFT_1_DAY',
    skillCertification: 'Vibration Analyst ISO 18436-2 Cat III',
    hourlyWage: 440.0, // ₹440/hr
    efficiencyRating: 1.2,
    status: 'ACTIVE',
    hireDate: '2021-10-30',
  },
];
