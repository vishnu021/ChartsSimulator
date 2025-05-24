export const margin = { left: 50, right: 50, top: 10, bottom: 30 };

export const colors = {
    candleUp:   "#00C853",
    candleDown: "#D50000",
    line:       "#2E7D32",
    maxima:     "#1B5E20",
    minima:     "#B71C1C",
    grid:       "#CCCCCC",
};

export const markerProps = {
    maxima: { fill: colors.maxima, stroke: colors.maxima, radius: 4 },
    minima: { fill: colors.minima, stroke: colors.minima, radius: 4 },
};

export const axisProps = {
    showGrid:         true,
    gridStroke:       colors.grid,
    gridStrokeOpacity: 0.5,
};
