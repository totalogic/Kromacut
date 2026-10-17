import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { fitToBed } from '../src/lib/bedFit.ts';
import {
    filterOwnedByCost,
    matchNearestOwned,
    type OwnedFilament,
} from '../src/lib/ownedFilaments.ts';
import { importSpoolCard, writeSpoolCard } from '../src/lib/spoolCard.ts';

const red: OwnedFilament = {
    id: 'red',
    name: 'Red PLA',
    hex: '#FF0000',
    cost: 19.99,
    vendor: 'Bambu Lab',
    type: 'PLA',
    settingsId: 'Bambu PLA Basic @BBL X1C',
};

const blue: OwnedFilament = {
    id: 'blue',
    name: 'Blue PLA',
    hex: '#0000FF',
    cost: 24.99,
    vendor: 'Bambu Lab',
    type: 'PLA',
    settingsId: 'Bambu PLA Basic @BBL X1C',
};

const silk: OwnedFilament = {
    id: 'silk',
    name: 'Silk Gold',
    hex: '#FFD700',
    cost: 29.99,
    vendor: 'Bambu Lab',
    type: 'PLA',
    settingsId: 'Bambu PLA Silk @BBL X1C',
};

test('fitToBed maps a plate to millimeters without stretching', () => {
    const fit = fitToBed({
        opaqueWidthPx: 1000,
        opaqueHeightPx: 500,
        bedWidthMm: 220,
        bedHeightMm: 220,
        marginMm: 5,
    });

    assert.equal(fit.ok, true);
    if (!fit.ok) return;
    assert.equal(fit.limitedBy, 'width');
    assert.equal(fit.pixelSize, 0.21);
    assert.equal(fit.modelWidthMm, 210);
    assert.equal(fit.modelHeightMm, 105);
});

test('fitToBed rejects a plate that is only margin', () => {
    const fit = fitToBed({
        opaqueWidthPx: 100,
        opaqueHeightPx: 100,
        bedWidthMm: 8,
        bedHeightMm: 8,
        marginMm: 5,
    });

    assert.equal(fit.ok, false);
    if (fit.ok) return;
    assert.equal(fit.reason, 'invalid-bed');
});

test('cost range keeps owned spools on the inclusive edges', () => {
    const pool = filterOwnedByCost([red, blue, silk], 19.99, 24.99);
    assert.deepEqual(
        pool.map((spool) => spool.id),
        ['red', 'blue']
    );
});

test('nearest hex match stays inside the owned cost range', () => {
    const result = matchNearestOwned(['#EE0000', '#EEEE00'], [red, blue, silk], 19.99, 24.99);

    assert.equal(result.matches[0]?.spool.id, 'red');
    assert.equal(result.matches[1], undefined);
    assert.deepEqual(result.unmatched, ['#EEEE00']);
});

test('spool card round-trips owned colors and costs', async () => {
    const bytes = await writeSpoolCard([red, silk]);
    const imported = await importSpoolCard(bytes);

    assert.equal(imported.length, 2);
    assert.equal(imported[0]?.name, 'Red PLA');
    assert.equal(imported[0]?.hex, '#FF0000');
    assert.equal(imported[0]?.cost, 19.99);
    assert.equal(imported[1]?.settingsId, 'Bambu PLA Silk @BBL X1C');
});

test('spool card import reads a slicer project settings file', async () => {
    const zip = new JSZip();
    zip.file(
        'Metadata/project_settings.config',
        JSON.stringify({
            filament_colour: ['#112233', '#AABBCC'],
            filament_settings_id: ['Bambu PLA Basic @BBL X1C', 'Bambu PLA Basic @BBL X1C'],
            filament_vendor: ['Bambu Lab', 'Bambu Lab'],
            filament_type: ['PLA', 'PLA'],
            filament_cost: ['12.50', '18'],
        })
    );

    const imported = await importSpoolCard(await zip.generateAsync({ type: 'uint8array' }));
    assert.equal(imported.length, 2);
    assert.equal(imported[0]?.hex, '#112233');
    assert.equal(imported[0]?.cost, 12.5);
    assert.equal(imported[1]?.name, 'Bambu PLA Basic @BBL X1C');
});
