import { getApiUrl, getSession, saveSession, clearSession } from './storage';

export interface Device {
  id: number | string;
  name: string;
  ip: string;
  vendor?: string;
  model?: string;
  category?: string;
  subcategory?: string;
  status: 'online' | 'offline' | 'warning';
  uptime?: string;
  branch?: string;
  location?: string;
  description?: string;
  last_seen?: string;
  cpu_load?: number;
  cpuLoad?: number;
  mem_used?: number;
  mem_total?: number;
}

export interface TrunkPort {
  device_id: number;
  device_name: string;
  interface_name: string;
  status: 'up' | 'down';
  description?: string;
}

export interface DashboardMetrics {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  warning_devices: number;
  active_alerts: number;
  avg_cpu_load: number | null;
  devices_with_cpu: number;
  down_trunks: TrunkPort[];
  top_devices: Device[];
}

export interface InventoryMeta {
  categories: string[];
  branches: string[];
}

export interface TopologyVersion {
  id?: string | number;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  actor?: string;
  editor?: string;
  reason?: string;
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function buildHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session) {
    headers['x-user-name'] = session.username;
    if (session.role?.trim()) {
      headers['x-user-role'] = session.role.trim();
    }
  }
  return headers;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = await getApiUrl();
  if (!baseUrl) {
    throw new Error('API URL is empty. Open Settings and set a valid server URL.');
  }

  try {
    new URL(baseUrl);
  } catch {
    throw new Error('API URL is invalid. Open Settings and enter a valid URL.');
  }

  const headers = await buildHeaders();
  const url = `${baseUrl}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: { ...headers, ...(options?.headers as Record<string, string>) },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      if (response.status === 401) {
        await clearSession();
        throw new ApiError(401, 'Session expired. Please log in again.');
      }
      if (response.status === 403) {
        throw new ApiError(403, 'Access denied for your role.');
      }
      throw new ApiError(response.status, text || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new Error('Request timed out. Check the API URL in Settings.');
    }
    throw new Error(`Cannot connect to server. Check the API URL in Settings.`);
  }
}

export async function getInventory(): Promise<Device[]> {
  const data = await apiFetch<{ devices?: Device[] } | Device[]>('/api/inventory');
  if (Array.isArray(data)) return data;
  return (data as { devices?: Device[] }).devices ?? [];
}

export async function getInventoryMeta(): Promise<InventoryMeta> {
  const data = await apiFetch<{
    categories?: string[];
    branches?: string[];
  }>('/api/inventory/meta');
  return {
    categories: data.categories ?? [],
    branches: data.branches ?? [],
  };
}

export async function getTopologyVersions(): Promise<TopologyVersion[]> {
  const data = await apiFetch<{ versions?: TopologyVersion[] } | TopologyVersion[]>('/api/topology/versions');
  if (Array.isArray(data)) return data;
  return data.versions ?? [];
}

export async function undoTopology(payload?: { versionId?: string | number; reason?: string }): Promise<{ ok: boolean; message?: string }> {
  return apiFetch<{ ok?: boolean; message?: string }>('/api/topology/undo', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  }).then((res) => ({ ok: Boolean(res.ok ?? true), message: res.message }));
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [inventory, raw] = await Promise.all([
    getInventory(),
    apiFetch<{
      devices?: Array<{
        id: string | number;
        name: string;
        ip: string;
        branch?: string;
        category?: string;
        cpuLoad?: number | null;
        trunks?: Array<{
          ifName?: string;
          description?: string;
          operStatus?: number;
        }>;
      }>;
      trunkSummary?: {
        down?: number;
      };
      cpuSummary?: {
        avgCpuLoad?: number | null;
        devicesWithCpu?: number | null;
      };
    }>('/api/metrics/dashboard'),
  ]);

  const totalDevices = inventory.length;
  const onlineDevices = inventory.filter((d) => d.status === 'online').length;
  const warningDevices = inventory.filter((d) => d.status === 'warning').length;
  const offlineDevices = inventory.filter((d) => d.status === 'offline').length;

  const downTrunks: TrunkPort[] = (raw.devices ?? []).flatMap((dev) =>
    (dev.trunks ?? [])
      .filter((trunk) => Number(trunk.operStatus ?? 2) !== 1)
      .map((trunk) => ({
        device_id: Number(dev.id) || 0,
        device_name: dev.name,
        interface_name: trunk.ifName || 'unknown',
        status: 'down' as const,
        description: trunk.description || '',
      }))
  );

  const inventoryById = new Map(inventory.map((d) => [String(d.id), d]));
  const topDevices: Device[] = (raw.devices ?? []).map((dev) => {
    const existing = inventoryById.get(String(dev.id));
    const cpu = typeof dev.cpuLoad === 'number' ? dev.cpuLoad : null;
    return {
      ...(existing ?? {
        id: dev.id,
        name: dev.name,
        ip: dev.ip,
        status: 'offline' as const,
        branch: dev.branch,
        category: dev.category,
      }),
      cpu_load: cpu ?? existing?.cpu_load,
      cpuLoad: cpu ?? existing?.cpuLoad,
    };
  });

  const avgCpuLoad =
    typeof raw.cpuSummary?.avgCpuLoad === 'number' ? raw.cpuSummary.avgCpuLoad : null;
  const devicesWithCpu =
    typeof raw.cpuSummary?.devicesWithCpu === 'number' ? raw.cpuSummary.devicesWithCpu : 0;

  return {
    total_devices: totalDevices,
    online_devices: onlineDevices,
    offline_devices: offlineDevices,
    warning_devices: warningDevices,
    active_alerts: Number(raw.trunkSummary?.down ?? 0) + offlineDevices + warningDevices,
    avg_cpu_load: avgCpuLoad,
    devices_with_cpu: devicesWithCpu,
    down_trunks: downTrunks,
    top_devices: (topDevices.length ? topDevices : inventory).slice(0, 20),
  };
}

export async function login(
  username: string,
  password: string,
): Promise<{ success: boolean; role: string }> {
  const baseUrl = await getApiUrl();
  if (!baseUrl) {
    throw new Error('API URL is empty. Open Settings and set a valid server URL.');
  }

  try {
    new URL(baseUrl);
  } catch {
    throw new Error('API URL is invalid. Open Settings and enter a valid URL.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ApiError(response.status, 'Invalid credentials');
    }

    const data = (await response.json()) as {
      role?: string;
      user?: { role?: string; user_role?: string; type?: string };
    };
    const role = (data.role ?? data.user?.role ?? data.user?.user_role ?? data.user?.type ?? '').trim();

    await saveSession({ username, role });
    return { success: true, role: role || 'unknown' };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new Error('Request timed out.');
    }
    throw new Error('Cannot connect to server.');
  }
}

export async function logout(): Promise<void> {
  await clearSession();
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await apiFetch('/api/health');
    return { ok: true, message: 'Connection successful' };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export { ApiError };
