/**
 * Formatting utilities for the Prometheus Dashboard
 */

export const formatFin = (val: number, isIndian: boolean = false) => {
    if (!val) return isIndian ? '0.0 Cr' : '0.00B';
    return isIndian
        ? (val / 1e7).toFixed(1) + ' Cr'
        : (val / 1e9).toFixed(2) + 'B';
};

export const formatPrice = (val: any) => {
    if (typeof val !== 'number') return val || '---';
    return val.toFixed(2);
};

export const formatMktCap = (val: any, isIndian: boolean = false) => {
    if (typeof val !== 'number') return val || '---';
    return formatFin(val, isIndian);
};

export const formatPercent = (val: number) => {
    if (val == null) return '---';
    return (val * 100).toFixed(1) + '%';
};

export const formatPay = (val: number, isIndian: boolean = false) => {
    if (!val) return '---';
    if (isIndian) return `₹${(val / 1e7).toFixed(2)} Cr`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    return `$${(val / 1e3).toFixed(1)}K`;
};

export const formatVal = (val: number, isIndian: boolean = false) => {
    if (!val) return 'Gift/Grant';
    if (isIndian) return `₹${(val / 1e7).toFixed(2)} Cr`;
    return `$${(val / 1e6).toFixed(1)}M`;
};
