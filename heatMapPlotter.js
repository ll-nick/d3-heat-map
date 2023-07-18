class HeatMapPlotter {
    constructor(dataset, options) {
        // Store input
        if (!dataset || !options || !options.width || !options.height || !options.padding) {
            throw new Error('Invalid parameters: dataset and options with width, height, and padding are required.');
        }
        this.dataset = dataset
        this.width = options.width
        this.height = options.height
        this.padding = options.padding

        // Constants
        this.legendRectHeight = 30
        this.legendRectWidth = 30
        this.legendNumRects = 9
        this.yearParser = d3.timeParse('%Y')
        this.monthParser = d3.timeParse('%m')
        this.yearFormat = d3.timeFormat('%Y');
        this.monthFormat = d3.timeFormat('%B');

        this.#createXScale()
        this.#createYScale()
        this.#createColorScale()
        this.#createHTMLElements()

    }

    plot() {
        this.#createTitle()
        this.#createDescription()
        this.#createAxes()
        this.#createLegend()
        this.#plotData()
        this.#moveAxesToForeground()
    }

    #temp(variance) {
        return this.dataset.baseTemperature + variance
    }

    #maxTemp() {
        return d3.max(this.dataset.monthlyVariance, d => this.#temp(d.variance))
    }

    #minTemp() {
        return d3.min(this.dataset.monthlyVariance, d => this.#temp(d.variance))
    }

    #createXScale() {
        const years = this.dataset.monthlyVariance.map(d => this.yearParser(d.year))
        this.xScale = d3.scaleTime()
            .domain(d3.extent(years))
            .range([this.padding, this.width - this.padding])
    }

    #createYScale() {
        const months = this.dataset.monthlyVariance.map(d => d.month)
        this.yScale = d3.scaleLinear()
            .domain([d3.max(months) + 0.5, d3.min(months)])
            .range([this.height - this.padding, this.padding])
    }

    #createColorScale() {
        this.colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
            .domain([this.#maxTemp(), this.#minTemp()]);
    }

    #createHTMLElements() {
        this.tooltip = new Tooltip();

        this.svg = d3.select('#chart-container')
            .append('svg')
            .attr('viewBox', '0 0 ' + this.width + ' ' + this.height)
    }

    #createTitle() {
        this.svg.append('text')
            .attr('x', (this.width / 2))
            .attr('y', 0)
            .attr('text-anchor', 'middle')
            .attr('id', 'title')
            .text('Monthly Global Land-Surface Temperature');
    }
    #createDescription() {
        const years = this.dataset.monthlyVariance.map(d => this.yearParser(d.year))
        const minYear = d3.min(years)
        const maxYear = d3.max(years)

        this.svg.append('text')
            .attr('x', (this.width / 2))
            .attr('y', this.padding / 2)
            .attr('text-anchor', 'middle')
            .attr('id', 'description')
            .text(this.yearFormat(minYear) + ' - ' + this.yearFormat(maxYear) + ': base temperature ' + this.dataset.baseTemperature + '°C');
    }

    #createAxes() {
        let xAxis = d3.axisBottom(this.xScale)
            .tickFormat(this.yearFormat)
            .ticks(d3.timeYear.every(10))
            .tickSizeOuter(0)
        this.svg.append('g')
            .attr('transform', 'translate(0, ' + (this.height - this.padding) + ')')
            .attr('id', 'x-axis')
            .call(xAxis)
        this.svg.append('text')
            .attr('id', 'x-axis-label')
            .attr('transform', 'translate(' + (this.width / 2) + ',' + (this.height - this.padding + 40) + ')')
            .text('Years')

        let yAxis = d3.axisLeft(this.yScale)
            .tickFormat(month => this.monthFormat(this.monthParser(month)))
            .tickSizeOuter(0)
        this.svg.append('g')
            .attr('transform', 'translate(' + this.padding + ', 0)')
            .attr('id', 'y-axis')
            .call(yAxis)
        this.svg.append('text')
            .attr('id', 'y-axis-label')
            .attr('transform', 'translate(' + (this.padding - 70) + ',' + this.height / 2 + ') rotate(-90)')
            .text('Months')
    }

    #createLegend() {
        const legend = this.svg.append('g')
            .attr('id', 'legend')
            .attr('transform', 'translate(' + this.padding + ',' + this.height * 0.95 + ')');

        // Add colored rects
        legend.selectAll('.legend-rect')
            .data(d3.range(this.legendNumRects))
            .enter()
            .append('rect')
            .attr('x', (d, i) => i * this.legendRectWidth)
            .attr('y', 0)
            .attr('width', this.legendRectWidth)
            .attr('height', this.legendRectHeight)
            .attr('stroke', 'black')
            .attr('class', 'legend-rect')
            .style('fill', d => this.colorScale(d3.quantile([this.#minTemp(), this.#maxTemp()], d / (this.legendNumRects - 1))));

        // Add legend axis
        const tempScale = d3.scaleLinear()
            .domain([this.#minTemp(), this.#maxTemp()])
            .range([0, this.legendRectWidth * this.legendNumRects]);
        const legendAxis = d3.axisBottom(tempScale)
            .ticks(this.legendNumRects / 2)
            .tickFormat(d3.format('.2f'))
        legend.append('g')
            .attr('transform', 'translate(0, ' + this.legendRectHeight + ')')
            .attr('id', 'legend-axis')
            .call(legendAxis);
    }

    #plotData() {
        const rectWidth = this.xScale(this.yearParser('2001')) - this.xScale(this.yearParser('2000'))
        const rectHeight = this.yScale('2') - this.yScale('1')
        this.svg.selectAll('.cell')
            .data(this.dataset.monthlyVariance)
            .enter()
            .append('rect')
            .attr('x', d => this.xScale(this.yearParser(d.year)))
            .attr('y', d => this.yScale(d.month) - rectHeight / 2)
            // The tests except months to be in [0,11] where the data is in [1,12]
            .attr('data-month', d => d.month - 1)
            .attr('data-year', d => d.year)
            .attr('data-temp', d => this.#temp(d.variance))
            .attr('width', rectWidth)
            .attr('height', rectHeight)
            .attr('fill', d => this.colorScale(this.#temp(d.variance)))
            .attr('class', 'cell')
            .on('mouseover', (event, d) => {
                const tooltipContent = this.yearFormat(this.yearParser(d.year)) +
                    ' - ' +
                    this.monthFormat(this.monthParser(d.month)) +
                    '<br>' +
                    this.#temp(d.variance).toFixed(2) + '°C' +
                    '<br>' +
                    (d.variance > 0 ? '+' : '') +
                    d.variance.toFixed(2) + '°C'
                this.tooltip.showTooltip(tooltipContent, event.x, event.y, d.year);
            })
            .on('mouseout', (e) => {
                this.tooltip.hideTooltip();
            })
    }

    #moveAxesToForeground() {
        d3.select('#x-axis').raise()
        d3.select('#y-axis').raise()
    }
}