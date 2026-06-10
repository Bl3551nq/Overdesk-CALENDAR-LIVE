export type ImpactType = 'High' | 'Medium' | 'Low' | 'Holiday' | 'Non-Econ';

export interface FxEvent {
  title: string;
  country: string;
  date: string; // ISO format with timezone offset like '2026-05-17T23:30:00+01:00'
  impact: ImpactType;
  forecast?: string;
  previous?: string;
  actual?: string;
}

export interface SoundOption {
  key: string;
  label: string;
}
