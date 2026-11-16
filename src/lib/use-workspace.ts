'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { INITIAL_WORKSPACE, type Classroom, type Settings, type Workspace, type SavedReport } from './data';
import { validClass, validSettings } from './validation';

const STORAGE_KEY = 'sijill-ahmed-workspace-v1';
const PENDING_KEY = 'sijill-ahmed-pending-v1';
export type SaveState = 'loading' | 'saved' | 'saving' | 'local' | 'error';
function isWorkspace(value: unknown): value is Workspace {
  const w = value as Workspace;
  return !!w && validSettings(w.settings) && Array.isArray(w.classrooms) && w.classrooms.length > 0 && w.classrooms.length <= 30 && w.classrooms.every(validClass);
}
function mergeWorkspaces(local: Workspace, remote: Workspace): Workspace {
  return {
    settings: Date.parse(local.settings.updatedAt) > Date.parse(remote.settings.updatedAt) ? local.settings : remote.settings,
    classrooms: remote.classrooms.map(c => {
      const saved = local.classrooms.find(item => item.id === c.id);
      return saved && Date.parse(saved.updatedAt) > Date.parse(c.updatedAt) ? saved : c;
    }),
  };
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(INITIAL_WORKSPACE);
  const [saveState, setSaveState] = useState<SaveState>('loading');
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const workspaceRef = useRef(workspace);
  const dirtyRef = useRef(new Set<string>());
  const revisions = useRef(new Map<string, number>());
  const inFlight = useRef(new Map<string, { revision: number; promise: Promise<boolean> }>());
  const storageAvailable = useRef(true);
  const cloudConnected = useRef(false);

  const persist = useCallback((value: Workspace) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      localStorage.setItem(PENDING_KEY, JSON.stringify([...dirtyRef.current]));
      storageAvailable.current = true;
      return true;
    } catch { storageAvailable.current = false; return false; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let local = INITIAL_WORKSPACE;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isWorkspace(parsed)) local = parsed;
      }
      const pending: unknown = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
      if (Array.isArray(pending)) {
        dirtyRef.current = new Set(pending.filter((id): id is string => typeof id === 'string' && (id === 'settings' || local.classrooms.some(c => c.id === id))));
      }
    } catch { storageAvailable.current = false; }
    workspaceRef.current = local;
    // Hydrate from external browser storage after the initial render commits.
    void Promise.resolve().then(() => {
      if (!cancelled) { setWorkspace(local); setDirty([...dirtyRef.current]); }
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    (async () => {
      try {
        const response = await fetch('/api/workspace', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Unavailable');
        const remote: unknown = await response.json();
        if (!isWorkspace(remote)) throw new Error('Invalid data');
        if (cancelled) return;
        cloudConnected.current = true;
        const merged = mergeWorkspaces(workspaceRef.current, remote);
        workspaceRef.current = merged;
        setWorkspace(merged);
        persist(merged);
        setSaveState(dirtyRef.current.size ? 'saving' : 'saved');
      } catch {
        if (!cancelled) {
          cloudConnected.current = false;
          setSaveState(dirtyRef.current.size ? 'saving' : local !== INITIAL_WORKSPACE ? 'local' : 'error');
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [persist]);

  const change = useCallback((ids: string[], updater: (current: Workspace) => Workspace) => {
    const next = updater(workspaceRef.current);
    workspaceRef.current = next;
    for (const id of ids) {
      revisions.current.set(id, (revisions.current.get(id) || 0) + 1);
      dirtyRef.current.add(id);
    }
    setWorkspace(next);
    setDirty([...dirtyRef.current]);
    const stored = persist(next);
    setSaveState(stored ? 'saving' : 'local');
  }, [persist]);

  const updateClass = useCallback((classroom: Classroom) => {
    const updated = { ...classroom, updatedAt: new Date().toISOString() };
    change([classroom.id], current => ({ ...current, classrooms: current.classrooms.map(c => c.id === updated.id ? updated : c) }));
  }, [change]);
  const updateClasses = useCallback((classrooms: Classroom[]) => {
    const stamp = new Date().toISOString();
    const updated = classrooms.map(c => ({ ...c, updatedAt: stamp }));
    change(updated.map(c => c.id), current => ({ ...current, classrooms: current.classrooms.map(c => updated.find(item => item.id === c.id) || c) }));
  }, [change]);
  const updateSettings = useCallback((settings: Settings) => {
    const updated = { ...settings, updatedAt: new Date().toISOString() };
    change(['settings'], current => ({ ...current, settings: updated }));
  }, [change]);
  const replaceWorkspace = useCallback((next: Workspace) => {
    const stamp = new Date().toISOString();
    const ids = ['settings', ...new Set([...workspaceRef.current.classrooms.map(c => c.id), ...next.classrooms.map(c => c.id)])];
    change(ids, current => ({
      settings: { ...next.settings, updatedAt: stamp },
      classrooms: current.classrooms.map(c => {
        const restored = next.classrooms.find(item => item.id === c.id);
        return restored ? { ...restored, updatedAt: stamp } : c;
      }),
    }));
  }, [change]);

  const flush = useCallback(async (ids: string[]): Promise<boolean> => {
    const results = await Promise.all(ids.map(id => {
      const revision = revisions.current.get(id) || 0;
      const previous = inFlight.current.get(id);
      if (previous?.revision === revision) return previous.promise;
      const current = workspaceRef.current;
      const body = id === 'settings' ? current.settings : current.classrooms.find(c => c.id === id);
      if (!body) { dirtyRef.current.delete(id); return Promise.resolve(true); }
      const promise = (async () => {
        try {
          const response = await fetch(id === 'settings' ? '/api/settings' : '/api/classrooms', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          });
          if (!response.ok) { cloudConnected.current = false; return false; }
          const saved = await response.json() as { updatedAt: string };
          cloudConnected.current = true;
          if (revisions.current.get(id) === revision) {
            const latest = workspaceRef.current;
            const next = id === 'settings' ? { ...latest, settings: { ...latest.settings, updatedAt: saved.updatedAt } } : {
              ...latest, classrooms: latest.classrooms.map(c => c.id === id ? { ...c, updatedAt: saved.updatedAt } : c),
            };
            workspaceRef.current = next;
            setWorkspace(next);
            dirtyRef.current.delete(id);
            persist(next);
          }
          return true;
        } catch { cloudConnected.current = false; return false; }
        finally { if (inFlight.current.get(id)?.revision === revision) inFlight.current.delete(id); }
      })();
      inFlight.current.set(id, { revision, promise });
      return promise;
    }));
    setDirty([...dirtyRef.current]);
    const ok = results.every(Boolean) && (ids.length > 0 || cloudConnected.current);
    setSaveState(ok ? (dirtyRef.current.size ? 'saving' : 'saved') : storageAvailable.current ? 'local' : 'error');
    if (ok) setLastSaved(new Date());
    return ok;
  }, [persist]);

  useEffect(() => {
    if (!ready || !dirty.length) return;
    const timer = setTimeout(() => { void flush(dirty); }, 850);
    return () => clearTimeout(timer);
  }, [workspace, dirty, ready, flush]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current.size && !storageAvailable.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const createSnapshot = useCallback(async (title: string, pages: number, classroom?: Classroom) => {
    const current = workspaceRef.current;
    const payload: Workspace = { settings: current.settings, classrooms: classroom ? [current.classrooms.find(c => c.id === classroom.id) || classroom] : current.classrooms };
    const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, pages, payload }) });
    if (!response.ok) throw new Error('snapshot');
    return await response.json() as SavedReport;
  }, []);

  return { workspace, saveState, ready, dirty, lastSaved, updateClass, updateClasses, updateSettings, replaceWorkspace, flush, createSnapshot };
}
