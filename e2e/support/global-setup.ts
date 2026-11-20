import { API_URL } from './api';

export default async function globalSetup() {
  const deadline = Date.now() + 60_000;
  let last = '';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) return;
      last = `status ${res.status}`;
    } catch (e) {
      last = String(e);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Backend ${API_URL}/health not ready: ${last}. Is the stack up (npm run dev)?`);
}
