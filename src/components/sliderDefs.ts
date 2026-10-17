export type SliderDef = {
    key: string;
    labelKey: string;
    helpKey: string;
    min: number;
    max: number;
    step: number;
    default: number;
    unit?: string;
    unitKey?: string;
};

export const SLIDER_DEFS: SliderDef[] = [
    {
        key: 'exposure',
        labelKey: 'adjustments.exposure',
        helpKey: 'adjustments.help.exposure',
        min: -3,
        max: 3,
        step: 0.01,
        default: 0,
        unitKey: 'adjustments.stops',
    },
    {
        key: 'contrast',
        labelKey: 'adjustments.contrast',
        helpKey: 'adjustments.help.contrast',
        min: -100,
        max: 100,
        step: 1,
        default: 0,
        unit: '%',
    },
    {
        key: 'highlights',
        labelKey: 'adjustments.highlights',
        helpKey: 'adjustments.help.highlights',
        min: -100,
        max: 100,
        step: 1,
        default: 0,
        unit: '%',
    },
    {
        key: 'shadows',
        labelKey: 'adjustments.shadows',
        helpKey: 'adjustments.help.shadows',
        min: -100,
        max: 100,
        step: 1,
        default: 0,
        unit: '%',
    },
    {
        key: 'whites',
        labelKey: 'adjustments.whites',
        helpKey: 'adjustments.help.whites',
        min: -100,
        max: 100,
        step: 1,
        default: 0,
        unit: '%',
    },
    {
        key: 'blacks',
        labelKey: 'adjustments.blacks',
        helpKey: 'adjustments.help.blacks',
        min: -100,
        max: 100,
        step: 1,
        default: 0,
        unit: '%',
    },
    {
        key: 'saturation',
        labelKey: 'adjustments.saturation',
        helpKey: 'adjustments.help.saturation',
        min: -100,
        max: 100,
        step: 1,
        default: 0,
        unit: '%',
    },
    {
        key: 'vibrance',
        labelKey: 'adjustments.vibrance',
        helpKey: 'adjustments.help.vibrance',
        min: -100,
        max: 100,
        step: 1,
        default: 0,
        unit: '%',
    },
    {
        key: 'hue',
        labelKey: 'adjustments.hue',
        helpKey: 'adjustments.help.hue',
        min: -180,
        max: 180,
        step: 1,
        default: 0,
        unitKey: 'adjustments.degrees',
    },
    {
        key: 'temperature',
        labelKey: 'adjustments.temperature',
        helpKey: 'adjustments.help.temperature',
        min: -100,
        max: 100,
        step: 1,
        default: 0,
        unit: '',
    },
    {
        key: 'tint',
        labelKey: 'adjustments.tint',
        helpKey: 'adjustments.help.tint',
        min: -100,
        max: 100,
        step: 1,
        default: 0,
        unit: '',
    },
    {
        key: 'clarity',
        labelKey: 'adjustments.clarity',
        helpKey: 'adjustments.help.clarity',
        min: -100,
        max: 100,
        step: 1,
        default: 0,
        unit: '',
    },
];

export default SLIDER_DEFS;
