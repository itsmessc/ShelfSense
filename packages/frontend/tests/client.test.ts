import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../src/types/index.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after setting up mock
const { getItems, createItem } = await import('../src/api/client.js');

beforeEach(() => {
  mockFetch.mockReset();
});

describe('API client - happy path', () => {
  it('getItems returns data array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 1, name: 'Oats' }], total: 1 }),
    });

    const result = await getItems();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Oats');
    expect(mockFetch).toHaveBeenCalledWith('/api/items', expect.any(Object));
  });

  it('getItems with search filter appends query param', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [], total: 0 }),
    });

    await getItems({ search: 'coffee' });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('search=coffee');
  });
});

describe('API client - edge cases', () => {
  it('throws ApiError on 404 response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Item not found' }),
    });

    let caught: ApiError | undefined;
    try {
      await getItems();
    } catch (e) {
      caught = e as ApiError;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught?.status).toBe(404);
    expect(caught?.message).toBe('Item not found');
  });

  it('throws ApiError on 400 for invalid create payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'name is required' }),
    });

    await expect(
      createItem({ name: '', quantity: 0, unit: 'kg', category: '', expiry_date: null, reorder_threshold: 0 })
    ).rejects.toThrow('name is required');
  });
});
