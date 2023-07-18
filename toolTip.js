class Tooltip {
    constructor() {
        this.tooltip = d3.select('#chart-container')
            .append('div')
            .attr('id', 'tooltip')
            .style('opacity', 0)
    }

    showTooltip(content, x, y, dataYear) {
        this.tooltip
            .html(content)
            .attr('data-year', dataYear)
            .style('opacity', 0.9)
            .style('left', x + 'px')
            .style('top', y + 'px');
    }

    hideTooltip() {
        this.tooltip.style('opacity', 0);
    }
}