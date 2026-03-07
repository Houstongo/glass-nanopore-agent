export function formatAngleDiff(angleDiffDeg) {
    if (typeof angleDiffDeg !== 'number' || Number.isNaN(angleDiffDeg)) {
        return '--';
    }

    return angleDiffDeg.toFixed(1);
}

