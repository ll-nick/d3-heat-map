url = 'https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json'
const fetchJson = fetch(url).then(response => response.json())


fetchJson.then(dataset => {
    let options = {}
    options.width = 940
    options.height = 600
    options.padding = 90

    const plotter = new HeatMapPlotter(dataset, options)
    plotter.plot()

})