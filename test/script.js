document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];

    if (file) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                displayTable(results.data);
            },
            error: function(err) {
                console.error('Error parsing CSV:', err);
            }
        });
    }
});

function displayTable(data) {
    const container = document.getElementById('table-container');
    container.innerHTML = ''; // Clear previous content

    if (data.length === 0) {
        container.innerHTML = '<p>No data found in CSV file.</p>';
        return;
    }

    const table = document.createElement('table');
    const headers = Object.keys(data[0]);

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');

    data.forEach(rowData => {
        const row = document.createElement('tr');

        headers.forEach(header => {
            const cell = document.createElement('td');
            cell.textContent = rowData[header] || '';
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}
