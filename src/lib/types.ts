export interface TripInput {
  departureTZ: string;
  arrivalTZ: string;
  departureDate: string; // YYYY-MM-DD
  departureTime: string; // HH:MM
  arrivalDate: string; // YYYY-MM-DD
  arrivalTime: string; // HH:MM
  normalSleepStart: string; // HH:MM
  normalWakeTime: string; // HH:MM
  strategy: 'pre-flight' | 'in-flight' | 'post-flight';
  includeMelatonin: boolean;
  preDays: number; // typically 3
}

export type BlockType = 'seek-light' | 'avoid-light' | 'sleep' | 'melatonin';

export interface TimeBlock {
  type: BlockType;
  startHour: number; // 0-24
  endHour: number; // 0-24
  label: string;
  note?: string;
}

export interface ScheduleDay {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Day -3 (Pre-flight)"
  blocks: TimeBlock[];
}

export interface FlightSegment {
  type: 'eye-mask' | 'cabin-light' | 'melatonin' | 'stay-awake';
  startMinute: number;
  endMinute: number;
  label: string;
}

export interface CalculationResult {
  deltaHours: number;
  direction: 'east' | 'west';
  totalAdjustmentDays: number;
  schedule: ScheduleDay[];
  flightPlan: FlightSegment[];
}

export interface AppState {
  inputs: TripInput;
  result: CalculationResult | null;
  activeTab: 'timeline' | 'flight-plan' | 'calendar';
  isCalculating: boolean;
}

export interface City {
  name: string;
  tz: string;
  country: string;
  code: string;
}
