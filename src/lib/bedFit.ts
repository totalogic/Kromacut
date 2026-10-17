export const MIN_PIXEL_SIZE_MM = 0.01;
export const MAX_PIXEL_SIZE_MM = 10;

export type BedPreset = {
    id: string;
    name: string;
    widthMm: number;
    heightMm: number;
};

export const BED_PRESETS: readonly BedPreset[] = [
    { id: 'bambu-256', name: 'Bambu 256', widthMm: 256, heightMm: 256 },
    { id: 'a1-mini', name: 'A1 mini', widthMm: 180, heightMm: 180 },
    { id: 'prusa-mk4', name: 'Prusa MK4', widthMm: 250, heightMm: 210 },
    { id: 'ender-220', name: 'Ender 220', widthMm: 220, heightMm: 220 },
    { id: 'custom', name: 'Custom', widthMm: 0, heightMm: 0 },
];

export type BedFitRequest = {
    opaqueWidthPx: number;
    opaqueHeightPx: number;
    bedWidthMm: number;
    bedHeightMm: number;
    marginMm: number;
};

export type BedFitResult =
    | {
          ok: true;
          pixelSize: number;
          modelWidthMm: number;
          modelHeightMm: number;
          limitedBy: 'width' | 'height';
          usableWidthMm: number;
          usableHeightMm: number;
      }
    | {
          ok: false;
          reason: 'invalid-bed' | 'invalid-image' | 'pixel-size-out-of-range';
      };

export function fitToBed(request: BedFitRequest): BedFitResult {
    const usableWidthMm = request.bedWidthMm - request.marginMm * 2;
    const usableHeightMm = request.bedHeightMm - request.marginMm * 2;
    if (
        !Number.isFinite(usableWidthMm) ||
        !Number.isFinite(usableHeightMm) ||
        usableWidthMm <= 0 ||
        usableHeightMm <= 0
    ) {
        return { ok: false, reason: 'invalid-bed' };
    }
    if (
        !Number.isFinite(request.opaqueWidthPx) ||
        !Number.isFinite(request.opaqueHeightPx) ||
        request.opaqueWidthPx <= 0 ||
        request.opaqueHeightPx <= 0
    ) {
        return { ok: false, reason: 'invalid-image' };
    }

    const widthScale = usableWidthMm / request.opaqueWidthPx;
    const heightScale = usableHeightMm / request.opaqueHeightPx;
    const limitedBy = widthScale <= heightScale ? 'width' : 'height';
    const pixelSize = Math.min(widthScale, heightScale);
    if (pixelSize < MIN_PIXEL_SIZE_MM || pixelSize > MAX_PIXEL_SIZE_MM) {
        return { ok: false, reason: 'pixel-size-out-of-range' };
    }

    return {
        ok: true,
        pixelSize,
        modelWidthMm: request.opaqueWidthPx * pixelSize,
        modelHeightMm: request.opaqueHeightPx * pixelSize,
        limitedBy,
        usableWidthMm,
        usableHeightMm,
    };
}
