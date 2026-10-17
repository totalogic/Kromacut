import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleCard } from '@/components/CollapsibleCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BED_PRESETS, fitToBed } from '../lib/bedFit';
import type { ImageDimensions } from '../hooks/useSwatches';
import {
    DEFAULT_SPOOL_SETTINGS_ID,
    loadBedFitProcess,
    loadOwnedFilaments,
    matchNearestOwned,
    saveBedFitProcess,
    saveOwnedFilaments,
    type BedFitProcessSettings,
    type OwnedFilament,
} from '../lib/ownedFilaments';
import { importSpoolCard, writeSpoolCard } from '../lib/spoolCard';
import { saveBlobToFile } from '../hooks/saveBlobToFile';

type Step = 'spools' | 'card' | 'process';

function newSpool(): OwnedFilament {
    return {
        id: `spool-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: 'PLA',
        hex: '#FFFFFF',
        cost: 20,
        vendor: 'Bambu Lab',
        type: 'PLA',
        settingsId: DEFAULT_SPOOL_SETTINGS_ID,
    };
}

export default function BedFitPanel({
    imageDimensions,
    onPixelSizeChange,
    targetHexes,
}: {
    imageDimensions: ImageDimensions | null;
    onPixelSizeChange: (pixelSize: number) => void;
    targetHexes: string[];
}) {
    const { t } = useTranslation('printing');
    const fileRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<Step>('spools');
    const [spools, setSpools] = useState<OwnedFilament[]>(() => loadOwnedFilaments());
    const [process, setProcess] = useState<BedFitProcessSettings>(() => loadBedFitProcess());
    const [notice, setNotice] = useState<string | null>(null);

    const updateSpools = (next: OwnedFilament[]) => {
        setSpools(next);
        saveOwnedFilaments(next);
    };
    const updateProcess = (next: BedFitProcessSettings) => {
        setProcess(next);
        saveBedFitProcess(next);
    };

    const bed = BED_PRESETS.find((preset) => preset.id === process.bedId) ?? BED_PRESETS[0];
    const bedWidthMm = bed.id === 'custom' ? process.customWidthMm : bed.widthMm;
    const bedHeightMm = bed.id === 'custom' ? process.customHeightMm : bed.heightMm;
    const fit = useMemo(() => {
        if (!imageDimensions) return null;
        return fitToBed({
            opaqueWidthPx: imageDimensions.opaqueWidth || imageDimensions.width,
            opaqueHeightPx: imageDimensions.opaqueHeight || imageDimensions.height,
            bedWidthMm,
            bedHeightMm,
            marginMm: process.marginMm,
        });
    }, [bedHeightMm, bedWidthMm, imageDimensions, process.marginMm]);
    const match = useMemo(
        () => matchNearestOwned(targetHexes, spools, process.costMin, process.costMax),
        [process.costMax, process.costMin, spools, targetHexes]
    );

    const applyFit = () => {
        if (!fit || !fit.ok) {
            setNotice(t('bedFit.fitFailed'));
            return;
        }
        onPixelSizeChange(fit.pixelSize);
        setNotice(t('bedFit.rebuildFirst'));
    };

    const importCard = async (file: File) => {
        try {
            const imported = await importSpoolCard(new Uint8Array(await file.arrayBuffer()));
            if (imported.length === 0) {
                setNotice(t('bedFit.importFailed'));
                return;
            }
            updateSpools(imported);
            setNotice(t('bedFit.imported', { count: imported.length }));
            setStep('spools');
        } catch {
            setNotice(t('bedFit.importFailed'));
        }
    };

    const exportCard = async () => {
        try {
            const bytes = await writeSpoolCard(spools);
            await saveBlobToFile(new Blob([bytes], { type: 'model/3mf' }), {
                defaultFileName: 'kromacut-spool-card.3mf',
                extension: '3mf',
                filterName: '3MF',
            });
        } catch {
            setNotice(t('bedFit.exportFailed'));
        }
    };

    return (
        <CollapsibleCard id="bed-fit" title={t('bedFit.title')} subtitle={t('bedFit.subtitle')}>
            <div className="space-y-3">
                <label className="block space-y-1 text-xs">
                    <span>{t('bedFit.bed')}</span>
                    <select
                        data-testid="bed-fit-select"
                        aria-label={t('bedFit.bed')}
                        className="h-9 w-full rounded-md border bg-background px-2"
                        value={process.bedId}
                        onChange={(event) => updateProcess({ ...process, bedId: event.target.value })}
                    >
                        {BED_PRESETS.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                                {preset.name}
                            </option>
                        ))}
                    </select>
                </label>
                <div className="flex flex-wrap gap-2">
                    {(['spools', 'card', 'process'] as const).map((item) => (
                        <Button
                            key={item}
                            type="button"
                            size="sm"
                            variant={step === item ? 'default' : 'outline'}
                            onClick={() => setStep(item)}
                        >
                            {t(
                                item === 'spools'
                                    ? 'bedFit.stepSpools'
                                    : item === 'card'
                                      ? 'bedFit.stepCard'
                                      : 'bedFit.stepProcess'
                            )}
                        </Button>
                    ))}
                </div>

                {step === 'spools' && (
                    <div className="space-y-3">
                        {spools.length === 0 && (
                            <p className="text-xs text-muted-foreground">{t('bedFit.emptyLibrary')}</p>
                        )}
                        {spools.map((spool) => (
                            <div key={spool.id} className="grid grid-cols-2 gap-2">
                                <Input
                                    aria-label={t('bedFit.name')}
                                    value={spool.name}
                                    onChange={(event) =>
                                        updateSpools(
                                            spools.map((item) =>
                                                item.id === spool.id
                                                    ? { ...item, name: event.target.value }
                                                    : item
                                            )
                                        )
                                    }
                                />
                                <Input
                                    aria-label={t('bedFit.hex')}
                                    value={spool.hex}
                                    onChange={(event) =>
                                        updateSpools(
                                            spools.map((item) =>
                                                item.id === spool.id
                                                    ? { ...item, hex: event.target.value }
                                                    : item
                                            )
                                        )
                                    }
                                />
                                <Input
                                    aria-label={t('bedFit.cost')}
                                    type="number"
                                    value={spool.cost}
                                    onChange={(event) =>
                                        updateSpools(
                                            spools.map((item) =>
                                                item.id === spool.id
                                                    ? { ...item, cost: Number(event.target.value) }
                                                    : item
                                            )
                                        )
                                    }
                                />
                                <Input
                                    aria-label={t('bedFit.presetId')}
                                    value={spool.settingsId}
                                    onChange={(event) =>
                                        updateSpools(
                                            spools.map((item) =>
                                                item.id === spool.id
                                                    ? { ...item, settingsId: event.target.value }
                                                    : item
                                            )
                                        )
                                    }
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        updateSpools(spools.filter((item) => item.id !== spool.id))
                                    }
                                >
                                    {t('bedFit.remove')}
                                </Button>
                            </div>
                        ))}
                        <Button type="button" size="sm" onClick={() => updateSpools([...spools, newSpool()])}>
                            {t('bedFit.addSpool')}
                        </Button>
                    </div>
                )}

                {step === 'card' && (
                    <div className="flex flex-wrap gap-2">
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".3mf,application/zip"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void importCard(file);
                                event.target.value = '';
                            }}
                        />
                        <Button type="button" size="sm" onClick={() => fileRef.current?.click()}>
                            {t('bedFit.importCard')}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => void exportCard()}>
                            {t('bedFit.exportCard')}
                        </Button>
                    </div>
                )}

                {step === 'process' && (
                    <div className="space-y-3">
                        {process.bedId === 'custom' && (
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    aria-label={t('bedFit.widthMm')}
                                    type="number"
                                    value={process.customWidthMm}
                                    onChange={(event) =>
                                        updateProcess({
                                            ...process,
                                            customWidthMm: Number(event.target.value),
                                        })
                                    }
                                />
                                <Input
                                    aria-label={t('bedFit.heightMm')}
                                    type="number"
                                    value={process.customHeightMm}
                                    onChange={(event) =>
                                        updateProcess({
                                            ...process,
                                            customHeightMm: Number(event.target.value),
                                        })
                                    }
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                            <Input
                                aria-label={t('bedFit.marginMm')}
                                type="number"
                                value={process.marginMm}
                                onChange={(event) =>
                                    updateProcess({ ...process, marginMm: Number(event.target.value) })
                                }
                            />
                            <Input
                                aria-label={t('bedFit.costMin')}
                                type="number"
                                value={process.costMin}
                                onChange={(event) =>
                                    updateProcess({ ...process, costMin: Number(event.target.value) })
                                }
                            />
                            <Input
                                aria-label={t('bedFit.costMax')}
                                type="number"
                                value={process.costMax}
                                onChange={(event) =>
                                    updateProcess({ ...process, costMax: Number(event.target.value) })
                                }
                            />
                        </div>
                        <label className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={process.enabled}
                                onChange={(event) =>
                                    updateProcess({ ...process, enabled: event.target.checked })
                                }
                            />
                            <span>{t('bedFit.useOnExport')}</span>
                        </label>
                        <p className="text-xs text-muted-foreground">{t('bedFit.stlNote')}</p>
                        {fit?.ok && (
                            <p className="text-xs">
                                {t('bedFit.modelSize', {
                                    width: fit.modelWidthMm.toFixed(1),
                                    height: fit.modelHeightMm.toFixed(1),
                                })}
                            </p>
                        )}
                        <Button type="button" size="sm" onClick={applyFit}>
                            {t('bedFit.fitBed')}
                        </Button>
                        <div className="space-y-1 text-xs">
                            {targetHexes.length === 0 && <p>{t('bedFit.noTargets')}</p>}
                            {match.pool.length === 0 && <p>{t('bedFit.noSpools')}</p>}
                            {match.matches.map((item) => (
                                <p key={`${item.targetHex}-${item.spool.id}`}>
                                    {item.targetHex} {'->'} {item.spool.name}{' '}
                                    {t('bedFit.deltaE', { value: item.deltaE.toFixed(1) })}
                                </p>
                            ))}
                            {match.unmatched.map((hex) => (
                                <p key={hex}>
                                    {hex} {t('bedFit.unmatched')}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
                {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
            </div>
        </CollapsibleCard>
    );
}
