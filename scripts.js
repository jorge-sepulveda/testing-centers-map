$(document).ready(function () {
	getStats()
});


var formattedData;
mapboxgl.accessToken = 'pk.eyJ1IjoiZ3NlcHVsdmVkYTk2IiwiYSI6ImNrYTQ2cm9wMjBtM2IzZG12eWFmNm1zMW0ifQ.w4BLAhSp5wKs4LrRQmBbTg';
var map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/dark-v10',
	center: [-94.64, 37.68],
	zoom: 4,
	minZoom: 3,
	maxZoom: 10
});


function reloadData(mortalButtonSelected) {
	dateToLoad = moment($("#mapdate").val()).format('YYYY-MM-DD').toString();
	console.log('loading ' + dateToLoad);
	currentDateSelected = dateToLoad
	console.log(currentDateSelected)

	stateURL = 'https://raw.githubusercontent.com/jorge-sepulveda/covid-time-map/master/src/pyscraper/outputFiles/states/' + currentDateSelected + '.json'
	countyURL = 'https://raw.githubusercontent.com/jorge-sepulveda/covid-time-map/master/src/pyscraper/outputFiles/counties/' + currentDateSelected + '.json'
	$.when(
		$.getJSON(countyURL, function (data) {
			countyData = data;
		}),
		$.getJSON(stateURL, function (data) {
			stateData = data;
		})
	).then(function (cData, sData) {
		if (cData && sData) {
			mortalButtonSelected ? drawDeathMap() : drawCasesMap();
		} else {
			alert('something went horribly wrong')
		}
	});
}


function getStats(){
	$.when(
		$.getJSON("https://nodes.geoservices.tamu.edu/api/covid/counties/stats", function (statdata) {
			data = statdata;
		})
	).then(function (statData) {
		if (statData) {
			formatData(statData);
		} else {
			alert('something went horribly wrong')
		}
	});
}

function formatData(responseData) {
	formattedData = [];
	for (var key of Object.keys(responseData)) {
		var objectToAdd = { 'fips' : key, 'claims' : responseData[key]['claims'], 'sites' : responseData[key]['sites']} ;
		//console.log(objectToAdd);
		formattedData.push(objectToAdd);
	}
}

function drawMap(buttonCheck) {
	//console.log('in draw map')
	//console.log(formattedData)
	key = (buttonCheck === true) ? 'sites' : 'claims'
	colorSchemes = (buttonCheck === true) ? [ '#756bb1','#efedf5'] : ['#2b8cbe', '#ece7f2']

	var newCountyExpression = ['match', ['get', 'fips']];
	formattedData.forEach(function (row) {
		number = (row[key])
		var color = (number > 0) ? colorSchemes[0] : colorSchemes[1];
		newCountyExpression.push(row['fips'], color);
	});
	newCountyExpression.push('rgba(255,255,255,1)');
	map.setPaintProperty('counties', 'fill-color', newCountyExpression)
}

function reloadSidebar(fipsCode, countyName) {
	urlEndpoint = 'https://nodes.geoservices.tamu.edu/api/covid/sites/county/' + fipsCode

	$.when(
		$.getJSON(urlEndpoint, function (sites) {
			stuff = sites;
		})
	).then(function (siteData) {
		if (siteData.length > 0) {
			$('#data-display').empty();
			$('#data-display').append('<p>Sites in ' + siteData[0].location.county + ' County, ' + siteData[0].location.state + '</p>');
			siteData.forEach(function(site) {
				var stringToBuild = ('<ul><li><b>' + site.info.locationName +  '</b></li>'+
										 '<li>' + site.info.locationPhoneNumber +'</ul>');
				$('#data-display').append(stringToBuild);
				console.log(site);
			});
			
		} else {
			$('#data-display').empty();
			$('#data-display').append('<p>No sites in this county</p>');
		}
	});

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
	}, 'road-motorway-trunk');

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

	map.on('click', 'counties', function (e) {
		var coordinates = e.features[0].geometry.coordinates.slice();
		// Single out the first found feature.
		while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
			coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
		}
		var feature = e.features[0];
		selectedCounty = formattedData.filter(county => county.fips === feature.properties.fips);

		fipsCode  = feature.properties.fips
		console.log(fipsCode)
		reloadSidebar(fipsCode)
	})
	
	//Toggle County Button
	var claimsiteButton = document.createElement('a');
	claimsiteButton.href = '#';
	claimsiteButton.className = ''
	claimsiteButton.textContent = 'Toggle Claims/Sites'

	claimsiteButton.onclick = function (e) {
		e.preventDefault();
		e.stopPropagation();

		if (this.className === '') {
			this.className = 'active';
			buttonSelected = true;
			drawMap(buttonSelected);
			document.getElementById('claims-legend').style.display = 'none';
			document.getElementById('sites-legend').style.display = 'block';
		} else {
			mortalButtonSelected = false;
			this.className = ''
			buttonSelected = false;
			drawMap(buttonSelected);
			document.getElementById('claims-legend').style.display = 'block';
			document.getElementById('sites-legend').style.display = 'none';
		}
	}
	var layers = document.getElementById('menu');
	layers.appendChild(claimsiteButton);
});