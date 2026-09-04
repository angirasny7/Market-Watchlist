import { apiClient } from './apiClient';
import { HistoricalDigest } from '../types/digest';

export class DigestService {
  async fetchDigests(search?: string): Promise<HistoricalDigest[] | null> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await apiClient.get<HistoricalDigest[]>(`/digests${qs}`);

    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async fetchDigestById(id: string): Promise<HistoricalDigest | null> {
    const res = await apiClient.get<HistoricalDigest>(`/digests/${id}`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async markDigestRead(id: string): Promise<boolean> {
    const res = await apiClient.patch(`/digests/${id}/read`);
    return res.success;
  }

  async viewDigest(id: string): Promise<boolean> {
    const res = await apiClient.patch(`/digests/${id}/view`);
    return res.success;
  }
}

export const digestService = new DigestService();
