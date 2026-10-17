import JSZip from 'jszip';
import { MINIMAL_PROJECT_SETTINGS } from './slicerDefaults.ts';
import { DEFAULT_SPOOL_SETTINGS_ID, type OwnedFilament } from './ownedFilaments.ts';

const OWNED_SPOOLS_PATH = 'Metadata/owned_spools.json';
const PROJECT_SETTINGS_PATH = 'Metadata/project_settings.config';

function normalizeHexColor(hex: string | undefined, fallback: string): string {
    if (!hex) return fallback;
    const value = hex.startsWith('#') ? hex : `#${hex}`;
    return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function stringAt(value: unknown, index: number, fallback: string): string {
    if (!Array.isArray(value)) return fallback;
    const entry = value[index];
    return typeof entry === 'string' && entry.trim() ? entry : fallback;
}

function numberAt(value: unknown, index: number): number {
    if (!Array.isArray(value)) return Number.NaN;
    const entry = value[index];
    const parsed = typeof entry === 'number' ? entry : Number(entry);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function spoolFromRecord(value: unknown, index: number): OwnedFilament | null {
    const record = asRecord(value);
    if (!record) return null;
    const hex = normalizeHexColor(
        typeof record.hex === 'string' ? record.hex : undefined,
        ''
    );
    if (!hex) return null;
    const cost = typeof record.cost === 'number' ? record.cost : Number(record.cost);
    return {
        id: typeof record.id === 'string' && record.id ? record.id : `spool-${index + 1}`,
        name: typeof record.name === 'string' && record.name.trim() ? record.name : hex,
        hex,
        cost: Number.isFinite(cost) ? cost : 0,
        vendor:
            typeof record.vendor === 'string' && record.vendor.trim() ? record.vendor : 'Bambu Lab',
        type: typeof record.type === 'string' && record.type.trim() ? record.type : 'PLA',
        settingsId:
            typeof record.settingsId === 'string' && record.settingsId.trim()
                ? record.settingsId
                : DEFAULT_SPOOL_SETTINGS_ID,
    };
}

function spoolsFromProjectSettings(value: unknown): OwnedFilament[] {
    const record = asRecord(value);
    if (!record) return [];
    const colours = record.filament_colour;
    if (!Array.isArray(colours)) return [];
    return colours.flatMap((colour, index) => {
        const hex = normalizeHexColor(typeof colour === 'string' ? colour : undefined, '');
        if (!hex) return [];
        const settingsId = stringAt(record.filament_settings_id, index, DEFAULT_SPOOL_SETTINGS_ID);
        return [
            {
                id: `imported-${index + 1}`,
                name: settingsId,
                hex,
                cost: numberAt(record.filament_cost, index) || 0,
                vendor: stringAt(record.filament_vendor, index, 'Bambu Lab'),
                type: stringAt(record.filament_type, index, 'PLA'),
                settingsId,
            },
        ];
    });
}

export async function writeSpoolCard(spools: readonly OwnedFilament[]): Promise<Uint8Array> {
    const zip = new JSZip();
    const colours = spools.map((spool) => spool.hex);
    const projectSettings = {
        ...MINIMAL_PROJECT_SETTINGS,
        filament_colour: colours,
        filament_settings_id: spools.map((spool) => spool.settingsId),
        filament_vendor: spools.map((spool) => spool.vendor),
        filament_type: spools.map((spool) => spool.type),
        filament_cost: spools.map((spool) => spool.cost.toString()),
    };
    zip.file(OWNED_SPOOLS_PATH, JSON.stringify(spools, null, 2));
    zip.file(PROJECT_SETTINGS_PATH, JSON.stringify(projectSettings, null, 2));
    zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
 <Default Extension="json" ContentType="application/json"/>
 <Override PartName="/Metadata/project_settings.config" ContentType="application/json"/>
</Types>`
    );
    zip.file(
        '_rels/.rels',
        `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/Metadata/project_settings.config" Id="rel-settings" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`
    );
    return zip.generateAsync({ type: 'uint8array' });
}

export async function importSpoolCard(bytes: Uint8Array): Promise<OwnedFilament[]> {
    const zip = await JSZip.loadAsync(bytes);
    const owned = zip.file(OWNED_SPOOLS_PATH);
    if (owned) {
        const parsed = JSON.parse(await owned.async('string')) as unknown;
        if (Array.isArray(parsed)) {
            return parsed.flatMap((entry, index) => {
                const spool = spoolFromRecord(entry, index);
                return spool ? [spool] : [];
            });
        }
    }
    const project = zip.file(PROJECT_SETTINGS_PATH);
    if (!project) return [];
    return spoolsFromProjectSettings(JSON.parse(await project.async('string')));
}
