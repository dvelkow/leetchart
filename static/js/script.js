document.addEventListener('DOMContentLoaded', function () {
    let chartData = [];
    let chart;

    fetch('/get_chart_data')
        .then(response => response.json())
        .then(data => {
            chartData = data;
            drawChart();
            fetchSummaryStatistics();
        });

    function drawChart() {
        const labels = chartData.map(data => data.Date);
        const values = chartData.map(data => data.Close);

        const ctx = document.getElementById('chart').getContext('2d');
        if (chart) {
            chart.destroy();
        }

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Closing Prices',
                    data: values,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Price'
                        }
                    }
                }
            }
        });
    }

    function fetchSummaryStatistics() {
        fetch('/summary_statistics')
            .then(response => response.json())
            .then(data => {
                document.getElementById('summary').innerText = `
                    Total Entries: ${data.total_entries}, 
                    Max Close: ${data.max_close}, 
                    Min Close: ${data.min_close}, 
                    Average Close: ${data.average_close.toFixed(2)},
                    Latest Date: ${data.latest_date},
                    Earliest Date: ${data.earliest_date}
                `;
            });
    }

    document.getElementById('evaluateButton').addEventListener('click', function () {
        const positionType = document.getElementById('position_type').value;
        const entryIndex = parseInt(document.getElementById('entry_index').value, 10);
        const stopLevel = parseFloat(document.getElementById('stop_level').value);
        const takeProfitLevel = parseFloat(document.getElementById('take_profit_level').value);
        const stake = parseFloat(document.getElementById('stake').value);

        fetch('/evaluate_position', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                position_type: positionType,
                entry_index: entryIndex,
                stop_level: stopLevel,
                take_profit_level: takeProfitLevel,
                stake: stake
            })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error); });
                }
                return response.json();
            })
            .then(data => {
                const result = data.result;
                document.getElementById('result').innerText = `Result: ${result}`;
                if (result === 0) {
                    document.getElementById('result').innerText += ' (No action taken)';
                }
                document.getElementById('error').innerText = '';  // Clear previous errors
            })
            .catch(err => {
                document.getElementById('result').innerText = '';
                document.getElementById('error').innerText = `Error: ${err.message}`;
            });
    });

    document.getElementById('lastEntriesButton').addEventListener('click', function () {
        const n = parseInt(document.getElementById('lastEntriesCount').value, 10);
        fetch(`/last_entries/${n}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error); });
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('lastEntriesResult').innerText = `Last ${n} Entries: ${JSON.stringify(data, null, 2)}`;
            })
            .catch(err => {
                document.getElementById('error').innerText = `Error: ${err.message}`;
            });
    });

    document.getElementById('averagePriceButton').addEventListener('click', function () {
        const startIndex = parseInt(document.getElementById('averageStartIndex').value, 10);
        const endIndex = parseInt(document.getElementById('averageEndIndex').value, 10);
        fetch(`/average_price/${startIndex}/${endIndex}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error); });
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('averagePriceResult').innerText = `Average Price: ${data.average_price}`;
            })
            .catch(err => {
                document.getElementById('averagePriceResult').innerText = '';
                document.getElementById('error').innerText = `Error: ${err.message}`;
            });
    });
});