import { request } from './base.js';
import type { DashboardData } from '../types/index.js';

export async function getDashboard(): Promise<DashboardData> {
  return request('/api/dashboard');
}
