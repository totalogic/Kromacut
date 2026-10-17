import { deltaE2000 } from './colorDifference.ts';

export const OWNED_FILAMENT_STORAGE_KEY = 'kromacut:owned-filaments';
export const BED_FIT_PROCESS_KEY = 'kromacut:bed-fit-process';
export const DEFAULT_SPOOL_SETTINGS_ID = 'Bambu PLA Basic @BBL X1C';
export const MAX_SPOOL_DELTA_E = 20;

export type OwnedFilament = {
    id: string;
    name: string;
    hex: string;
    cost: number;
    vendor: string;
    type: string;
    settingsId: string;
};

export type SpoolMatch = {
    targetHex: string;
    spool: OwnedFilament;
    deltaE: number;
};

export type SpoolMatchResult = {
    matches: SpoolMatch[];
    unmatched: string[];
    pool: OwnedFilament[];
};

export function filterOwnedByCost(
    spools: readonly OwnedFilament[],
    costMin: number,
    costMax: number
): OwnedFilament[] {
    const low = Math.min(costMin, costMax);
    const high = Math.max(costMin, costMax);
    return spools.filter(
        (spool) => Number.isFinite(spool.cost) && spool.cost >= low && spool.cost <= high
    );
}

function normalizeHexColor(hex: string | undefined, fallback: string): string {
    if (!hex) return fallback;
    const value = hex.startsWith('#') ? hex : `#${hex}`;
    return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fallback;
}

function hexToRgb(hex: string): [number, number, number] | null {
    const normalized = normalizeHexColor(hex, '');
    if (!/^#[0-9A-F]{6}$/.test(normalized)) return null;
    return [
        Number.parseInt(normalized.slice(1, 3), 16),
        Number.parseInt(normalized.slice(3, 5), 16),
        Number.parseInt(normalized.slice(5, 7), 16),
    ];
}

export function matchNearestOwned(
    targets: readonly string[],
    owned: readonly OwnedFilament[],
    costMin: number,
    costMax: number
): SpoolMatchResult {
    const pool = filterOwnedByCost(owned, costMin, costMax);
    const matches: SpoolMatch[] = [];
    const unmatched: string[] = [];

    for (const target of targets) {
        const targetHex = normalizeHexColor(target, target);
        const targetRgb = hexToRgb(targetHex);
        let best: SpoolMatch | null = null;
        if (targetRgb) {
            for (const spool of pool) {
                const spoolRgb = hexToRgb(spool.hex);
                if (!spoolRgb) continue;
                const deltaE = deltaE2000(targetRgb, spoolRgb);
                if (!best || deltaE < best.deltaE) {
                    best = { targetHex, spool, deltaE };
                }
            }
        }
        if (!best || best.deltaE > MAX_SPOOL_DELTA_E) {
            unmatched.push(targetHex);
        } else {
            matches.push(best);
        }
    }

    return { matches, unmatched, pool };
}

export type BedFitProcessSettings = {
    enabled: boolean;
    costMin: number;
    costMax: number;
    bedId: string;
    marginMm: number;
    customWidthMm: number;
    customHeightMm: number;
};

export const DEFAULT_BED_FIT_PROCESS: BedFitProcessSettings = {
    enabled: false,
    costMin: 0,
    costMax: 30,
    bedId: 'bambu-256',
    marginMm: 5,
    customWidthMm: 256,
    customHeightMm: 256,
};

function readStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStorage(key: string, value: string) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Ignore private-mode and quota failures.
    }
}

export function loadOwnedFilaments(): OwnedFilament[] {
    const raw = readStorage(OWNED_FILAMENT_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.flatMap((entry) => {
            if (!entry || typeof entry !== 'object') return [];
            const spool = entry as Partial<OwnedFilament>;
            const hex = normalizeHexColor(spool.hex, '');
            if (!hex || typeof spool.id !== 'string') return [];
            return [
                {
                    id: spool.id,
                    name: spool.name?.trim() || hex,
                    hex,
                    cost: Number.isFinite(spool.cost) ? Number(spool.cost) : 0,
                    vendor: spool.vendor?.trim() || 'Bambu Lab',
                    type: spool.type?.trim() || 'PLA',
                    settingsId: spool.settingsId?.trim() || DEFAULT_SPOOL_SETTINGS_ID,
                },
            ];
        });
    } catch {
        return [];
    }
}

export function saveOwnedFilaments(spools: readonly OwnedFilament[]) {
    writeStorage(OWNED_FILAMENT_STORAGE_KEY, JSON.stringify(spools));
}

export function loadBedFitProcess(): BedFitProcessSettings {
    const raw = readStorage(BED_FIT_PROCESS_KEY);
    if (!raw) return { ...DEFAULT_BED_FIT_PROCESS };
    try {
        const parsed = JSON.parse(raw) as Partial<BedFitProcessSettings>;
        return {
            enabled: parsed.enabled === true,
            costMin: Number.isFinite(parsed.costMin) ? Number(parsed.costMin) : 0,
            costMax: Number.isFinite(parsed.costMax) ? Number(parsed.costMax) : 30,
            bedId: parsed.bedId || DEFAULT_BED_FIT_PROCESS.bedId,
            marginMm: Number.isFinite(parsed.marginMm) ? Number(parsed.marginMm) : 5,
            customWidthMm: Number.isFinite(parsed.customWidthMm)
                ? Number(parsed.customWidthMm)
                : 256,
            customHeightMm: Number.isFinite(parsed.customHeightMm)
                ? Number(parsed.customHeightMm)
                : 256,
        };
    } catch {
        return { ...DEFAULT_BED_FIT_PROCESS };
    }
}

export function saveBedFitProcess(settings: BedFitProcessSettings) {
    writeStorage(BED_FIT_PROCESS_KEY, JSON.stringify(settings));
}
