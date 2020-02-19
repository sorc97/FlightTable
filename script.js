'use strict'

// Constants
const API = 'https://data-live.flightradar24.com/zones/fcgi/feed.js?bounds=56.84,55.27,33.48,41.48';
const DATA_UPDATE_TIME = 4000;
// Elements variables
const table = document.querySelector('.flight-table');
const tbody = table.querySelector('tbody');

// Table components
class Row {
  constructor(id, data) {
    const rowElement = document.createElement('tr');
    rowElement.dataset.id = id;
    rowElement.addEventListener('click', toggleActiveRow);

    if(localStorage[id]) {
      rowElement.classList.add('active');
    }

    // Create cells 
    data.forEach(item => {
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

const toggleActiveRow = e => {
  const target = e.target;
  const activeRow = target.closest('tr');

  if(activeRow.classList.contains('active')) {
    activeRow.classList.remove('active');  
    localStorage.removeItem(activeRow.dataset.id);
    return;
  }
  
  activeRow.classList.add('active');  
  localStorage.setItem(activeRow.dataset.id, true);
}

// Data handling
const fetchData = async (url) => {
  const response = await fetch(url);
  const data = await response.json();

  console.log(data);
  return handleResponse(data);
}

// Get only necessary data
const getEssentialData = (arr = []) => ({ 
  flightNumber: arr[16],
  heading: arr[3],
  speed: arr[5],
  height: arr[4],
  coords: `${arr[1]} <br> ${arr[2]}`,
  airportCods: `${arr[11]} - ${arr[12]}`,
  distanceToDME: +arr[6],
})

const handleResponse = (obj = {}) => {
  let newObj = {};

  for (let key in obj) {
    if (key === 'full_count' || key === 'version') {
      continue;
    }

    const essentialData = getEssentialData(obj[key]);
    newObj[key] = Object.values(essentialData);
  }

  return newObj;
}

// Table elements creation

const createRow = (id, data) => {
  const row = new Row(id, data);
  tbody.append(row);
}

const createInitialRows = async () => {
  const data = await fetchData(API);

  for (let key in data) {
    createRow(key, data[key]);
  }
}

// Table updating

const updateData = async () => {
  const data = await fetchData(API);

  updateRows(data);
  insertNewRows(data);

  console.log(data);
}

const updateRows = (data = {}) => {
  const rows = document.querySelectorAll('tr[data-id]');

  rows.forEach(row => {
    const rowId = row.dataset.id;

    if (rowId in data) {
      updateCells(row, data[rowId]);
      return;
    }

    row.remove();
    localStorage.removeItem(rowId);
  });
}

const updateCells = (row, newData = []) => {
  const currentCells = row.querySelectorAll('td');  //Get all cells in the row

  currentCells.forEach((cell, i) => {
    if (cell.innerHTML !== newData[i]) {  // Update cell if necessary
      cell.innerHTML = newData[i];
    }
  })
}

const insertNewRows = (data = {}) => {
  const rows = document.querySelectorAll('tr[data-id]');
  let rowsId = new Set();
  rows.forEach(
    row => rowsId = rowsId.add(row.dataset.id)
  )

  for (let key in data) {
    if (!rowsId.has(key)) {
      const row = new Row(key, data[key]);
      tbody.append(row);
      console.log('NEW ROW', row);
    }
  }
}

setInterval(() => {
  updateData();
}, DATA_UPDATE_TIME);

createInitialRows();