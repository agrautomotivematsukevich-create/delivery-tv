export type Lang = 'RU' | 'EN_CN';
export type UserRole = 'OPERATOR' | 'LOGISTIC' | 'ADMIN';

export interface User {
  user: string;
  name: string;
  role: UserRole;
}

export interface DashboardData {
  status: string;
  done: number;
  total: number;
  nextId: string;
  nextTime: string;
  activeList: Array<{
    id: string;
    start: string;
    zone?: string;
  }>;
}

export interface Task {
  id: string;
  time: string;
  status: 'WAIT' | 'ACTIVE' | 'DONE';
  type?: string;
  pallets?: number;
  phone?: string;
}

export interface TaskAction {
  id: string;
  type: 'start' | 'finish';
}

export interface Issue {
  id: string;
  description: string;
  photos: string[];
  author: string;
  timestamp: string;
}

export interface TaskInput {
  id: string;
  time: string;
  pallets?: number;
  phone?: string;
}

export interface PlanRow {
  rowIndex: number;
  lot: string;
  ws: string;
  pallets: string;
  id: string;
  phone: string;
  eta: string;
}

export type TranslationSet = typeof TRANSLATIONS.RU;
