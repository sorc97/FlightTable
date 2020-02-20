'use strict'
// Constants
const API = 'https://data-live.flightradar24.com/zones/fcgi/feed.js?bounds=56.84,55.27,33.48,41.48';
const DATA_UPDATE_TIME = 4000;
const DME_LAT = 55.410307;
const DME_LON = 37.902451;
// Elements variables
const table = document.querySelector('.flight-table');
const tbody = table.querySelector('tbody');
const sortableCaption = document.querySelector('th[sortable]');
// Sort variables
const sortIndex = sortableCaption.cellIndex;
let currentSort = 'byLowRange';

// Table components
class Row {
  constructor(id, data) {
    const rowElement = document.createElement('tr');
    rowElement.id = id;  // Bind unique id for DOM element
    rowElement.addEventListener('click', toggleActiveRow);  // Selection handler

    if (localStorage[id]) {  // Make element active after page refreshing
      rowElement.classList.add('active');
    }

    data.forEach(item => {  // Create cells based on data
      const cell = new Cell(item);
      rowElement.append(cell);
    })

    return rowElement;
  }
}

class Cell {
  constructor(cellData) {
    const cellElement = document.createElement('td');
    cellElement.innerHTML = cellData;

    return cellElement;
  }
}

// Row selection
const toggleActiveRow = e => {
  const target = e.target;
  const activeRow = target.closest('tr');  // Find closest row element

  if (activeRow.classList.contains('active')) {  // Disable active element
    activeRow.classList.remove('active');
    localStorage.removeItem(activeRow.id);
    return;
  }
  // Set active element
  activeRow.classList.add('active');
  localStorage.setItem(activeRow.id, true);
}

// Sort selection
const handleSortSelect = e => {
  const rowElements = tbody.querySelectorAll('tr');
  const caption = e.target.closest('th');
  const rowsArray = Array.from(rowElements);  // Make array based on rows collection

  currentSort = (currentSort === 'byLowRange') ? 'byHighRange' : 'byLowRange';  // Set current sort
  caption.className = (currentSort === 'byLowRange') ? 'low' : 'heigh';  // Apply styles

  sortRows(rowsArray);
}

sortableCaption.addEventListener('click', handleSortSelect);  // Sort handler

// Get data from api
const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    const data = await response.json();

    return handleResponse(data);  // Return filtered data
  } catch (e) {
    console.error(e);
  }
}

// Get only necessary data
const getEssentialData = (arr = []) => ({
  flightNumber: arr[16] || '-',
  heading: `${arr[3]}&deg;`,
  speed: arr[5],
  height: arr[4],
  coords: `${arr[1]}<br>${arr[2]}`,
  airportCods: `${arr[11]} - ${arr[12]}`,
  distanceToDME: getDistanceFromLatLonInKm(DME_LAT, DME_LON, arr[1], arr[2]),
})

// Calculate range to DME
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = degToRad(lat2 - lat1);  // Degrees to radius below
  var dLon = degToRad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return Math.round(d);
}

function degToRad(deg) {
  return deg * (Math.PI / 180)
}

// Make new data based on response
const handleResponse = (obj = {}) => {
  let filteredData = {};

  for (let key in obj) {
    if (key === 'full_count' || key === 'version') {  // Remove unnecessary fields
      continue;
    }

    const essentialData = getEssentialData(obj[key]);
    filteredData[key] = Object.values(essentialData);  // Make array from data object
  }

  return filteredData;
}

// Create initial table
const createInitialRows = async () => {
  const data = await fetchData(API);
  let rows = [];

  for (let key in data) {  // For each data element create a row
    const newRow = new Row(key, data[key]);
    rows = [...rows, newRow];  // Insert new row to rows array
  }

  sortRows(rows);  // Sort all rows
}

// Sort all rows and append to the table
function sortRows(rows = []) {
  let sortFunc = null;

  switch (currentSort) {  // Sort function choosing
    case 'byLowRange':
      sortFunc = (a, b) => b.cells[sortIndex].innerHTML - a.cells[sortIndex].innerHTML
      break;

    case 'byHighRange':
      sortFunc = (a, b) => a.cells[sortIndex].innerHTML - b.cells[sortIndex].innerHTML
      break;
  }

  rows.sort(sortFunc);  // Sort rows with current sort function
  tbody.append(...rows);  // Append sorted rows to the table
}

// Table updating
const updateData = async () => {
  const data = await fetchData(API);

  updateRows(data);
  // insertNewRows(data);
}

const updateRows = (data = {}) => {
  const rows = tbody.querySelectorAll('tr');

  // Update current rows
  rows.forEach(row => {
    const rowId = row.id;

    if (rowId in data) {  // When data contains existing row, update this row
      updateCells(row, data[rowId]);
      return;
    }
    // When data not contains row, remove this row
    row.remove();
    localStorage.removeItem(rowId);
  });

  const updatedRows = insertNewRows(rows, data);
  sortRows(updatedRows);
}

const updateCells = (row, newData = []) => {
  const currentCells = row.querySelectorAll('td');  //Get all cells in the row

  currentCells.forEach((cell, i) => {
    if (cell.innerHTML !== newData[i]) {  // Update cell if necessary
      cell.innerHTML = newData[i];
    }
  })
}

const insertNewRows = (rowElements, data = {}) => {
  let rowsArray = Array.from(rowElements);
  let rowsId = new Set();

  rowsArray.forEach(  // Make collection of existing rows id
    row => rowsId = rowsId.add(row.id)
  )

  for (let key in data) {
    if (!rowsId.has(key)) {  // When new id was found, create a new row element
      let newRow = new Row(key, data[key]);
      rowsArray = [...rowsArray, newRow];
    }
  }

  return rowsArray;
}

setInterval(() => {
  updateData();
}, DATA_UPDATE_TIME);

createInitialRows();