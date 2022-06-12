/**
 * Copyright 2020 Google LLC.
 * SPDX-License-Identifier: Apache-2.0
 */

// Define a region of interest.
var geometry = ee.Geometry.Polygon(
  [[[-73.16191843371962, -37.8098361104156],
    [-73.16191843371962, -39.593041263040206],
    [-71.14043405871962, -39.593041263040206],
    [-71.14043405871962, -37.8098361104156]]], null, false);

// Display the region of interest.
Map.centerObject(geometry);
Map.addLayer(geometry);

// Filter image collection 1 and reduce to max.
var sentinel2a = ee.ImageCollection("COPERNICUS/S2")
  .filterDate('2016-10-01', '2017-03-31')
  .filterBounds(geometry)
  .filterMetadata("CLOUDY_PIXEL_PERCENTAGE",'Less_Than', 5)
  .max();

// Filter image collection 2 and reduce to median.
var sentinel2b = ee.ImageCollection("COPERNICUS/S2")
  .filterDate('2018-10-01', '2019-03-31')
  .filterBounds(geometry)
  .filterMetadata("CLOUDY_PIXEL_PERCENTAGE",'Less_Than', 5)
  .median();

// Calculate difference between two dates of normalized difference (DNDVI).
var normDif1 = sentinel2a.normalizedDifference(['B8', 'B4']);
var normDif2 = sentinel2b.normalizedDifference(['B8', 'B4']);
var dndvi = normDif1.subtract(normDif2);

// Calculate a histogram of DNDVI using a region reduction with the
// `autoHistogram()` reducer. Note that scale is set to 1000 so that the
// operation will not time out while interactive in the Code Editor browser.
// If you have a large region and a small scale, see the below section on
// exporting the result as an asset to avoid time out errors.
var hist = dndvi.reduceRegion({
  reducer: ee.Reducer.autoHistogram(),
  geometry: geometry,
  scale: 1000,
  bestEffort: true,
});

// #############################################################################
// ### HISTOGRAM CHART USING ARRAYS ###
// #############################################################################

// The result of the region reduction by `autoHistogram` is an array. Get the
// array and cast it as such for good measure.
var histArray = ee.Array(hist.get('nd'));
print(histArray)
// Subset the values that represent the bottom of the bins and project to
// a single dimension. Result is a 1-D array.
var binBottom = histArray.slice(1, 0, 1).project([0]);
print(binBottom)
// Subset the values that represent the number of pixels per bin and project to
// a single dimension. Result is a 1-D array.
var nPixels = histArray.slice(1, 1, null).project([0]);
print(nPixels)
// Chart the two arrays using the `ui.Chart.array.values` function.
var histColumnFromArray = ui.Chart.array.values({
  array:nPixels,
  axis: 0,
  xLabels: binBottom})
  .setChartType('ColumnChart');
print(histColumnFromArray);


// #############################################################################
// ### HISTOGRAM CHART USING A FEATURE COLLECTION ###
// #############################################################################

// Cast the histogram table array as a list.
var histList = histArray.toList();
print(histList)
// Map over the list to create a list of features per bin and set respective
// bin bottom and number of pixels properties.
var featureList = histList.map(function(bin) {
  bin = ee.List(bin);
  var props = {
    binBottom: ee.Number(bin.get(0)),
    nPixels: ee.Number(bin.get(1))
  };
  return ee.Feature(geometry, props);
});

// Convert the feature list to a feature collection.
var featureCol = ee.FeatureCollection(featureList);

// #############################################################################
// OPTIONALLY EXPORT THE FEATURE COLLECTION

// If your region reduction times out in the browser, export the above
// feature collection as an asset. When it completes, start a new script
// that imports it and then chart it using the options following. Here is
// an example of exporting the region as an asset:

Export.table.toAsset({
  collection: featureCol,
  description: 'histogram_table',
  assetId: 'histogram_table'
});

// #############################################################################

// Chart histogram from the constructed feature collection as a line chart.
var histLineFromFc = ui.Chart.feature.byFeature({
  features: featureCol,
  xProperty: 'binBottom',
  yProperties: ['nPixels']})
  .setChartType('LineChart');
print(histLineFromFc);

// Chart histogram from the constructed feature collection as a column chart.
var histColumnFromFc = ui.Chart.feature.byFeature({
  features: featureCol,
  xProperty: 'binBottom',
  yProperties: ['nPixels']})
  .setChartType('ColumnChart');
print(histColumnFromFc); 
