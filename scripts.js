$(document).ready(function () {
});


mapboxgl.accessToken = 'pk.eyJ1IjoiZ3NlcHVsdmVkYTk2IiwiYSI6ImNrYTQ2cm9wMjBtM2IzZG12eWFmNm1zMW0ifQ.w4BLAhSp5wKs4LrRQmBbTg';
var map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/dark-v10',
	center: [-94.64, 37.68],
	zoom: 4,
	minZoom: 3,
	maxZoom: 10
});

function formatData() {
	formattedData = []
	for (var key of Object.keys(data)) {
		var objectToAdd = { 'fips' : key, 'claims' : data[key]['claims'], 'sites' : data[key]['sites']} ;
		//console.log(objectToAdd);
		formattedData.push(objectToAdd);
	}
	return formattedData;
}



function drawMap() {

	newData = formatData();

	var newCountyExpression = ['match', ['get', 'fips']];

	newData.forEach(function (row) {
		number = (row['claims'])
		var color = (number > 0) ? "#2b8cbe" : "#ece7f2";
		newCountyExpression.push(row['fips'], color);
	});

	newCountyExpression.push('rgba(255,255,255,1)');

	map.setPaintProperty('counties', 'fill-color', newCountyExpression)
}


map.on('load', function () {
	map.addSource('county-lines', {
		type: 'vector',
		url: 'mapbox://gsepulveda96.countylines'
	});

	map.addSource('state-lines', {
		type: 'vector',
		url: 'mapbox://gsepulveda96.statelines'
	});

	//console.log(map.getStyle().layers);
	// Add layer from the vector tile source with countyData-driven style


	map.addLayer({
		'id': 'counties',
		'type': 'fill',
		'source': 'county-lines',
		'source-layer': 'county-lines',
		'paint': {
			'fill-outline-color': '#ffffff',
		}
	}, 'road-minor-low');

	map.addLayer({
		'id': 'statelines',
		'type': 'line',
		'source': 'state-lines',
		'source-layer': 'state-lines',
		'paint': {
			'line-color': '#000000',
			'line-width': 1
		}
	}), 'state-label';

	drawMap()

	//mortalButtonSelected = false;
	//reloadData(mortalButtonSelected)

	map.on('mousemove', 'counties', function (e) {
		map.getCanvas().style.cursor = 'pointer';
		var coordinates = e.features[0].geometry.coordinates.slice();
		// Single out the first found feature.
		while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
			coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
		}
		var feature = e.features[0];
		selectedCounty = formattedData.filter(county => county.fips === feature.properties.fips);

		document.getElementById("info-box").innerHTML = (feature.properties.NAME + ' County' + '</br>' +
			'FIPS: ' + feature.properties.fips + '</br>' +
			'Claims: ' + selectedCounty[0]['claims'] + '</br>' +
			'Sites: ' + selectedCounty[0]['sites'])
	});

	map.on('mouseleave', 'counties', function () {
		map.getCanvas().style.cursor = '';
		document.getElementById("info-box").innerHTML = "Hover over the map to see info"
	});

	map.dragRotate.disable();

});