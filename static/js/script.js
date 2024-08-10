document.addEventListener('DOMContentLoaded', function () {
    let chartData = [];
    let chart;

    fetch('/get_chart_data')
        .then(response => response.json())
        .then(data => {
            chartData = data;
            drawChart();
            updateLatestPrice();
            updateBalance();
        });

    function drawChart() {
        const ctx = document.getElementById('chart').getContext('2d');
        if (chart) {
            chart.destroy();
        }

        const formattedData = chartData.map(d => ({
            x: new Date(d.Date),
            o: parseFloat(d.Open),
            h: parseFloat(d.High),
            l: parseFloat(d.Low),
            c: parseFloat(d.Close)
        }));

        const minPrice = Math.min(...formattedData.map(d => d.l));
        const maxPrice = Math.max(...formattedData.map(d => d.h));
        const padding = (maxPrice - minPrice) * 0.1;

        chart = new Chart(ctx, {
            type: 'candlestick',
            data: {
                datasets: [{
                    label: 'BTC/USD',
                    data: formattedData
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM d'
                            }
                        },
                        ticks: {
                            source: 'data'
                        }
                    },
                    y: {
                        position: 'right',
                        min: minPrice - padding,
                        max: maxPrice + padding,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                return [
                                    'Open: $' + point.o.toLocaleString(),
                                    'High: $' + point.h.toLocaleString(),
                                    'Low: $' + point.l.toLocaleString(),
                                    'Close: $' + point.c.toLocaleString()
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    function updateLatestPrice() {
        const latestData = chartData[chartData.length - 1];
        document.getElementById('latest-price').textContent = `$${parseFloat(latestData.Close).toLocaleString()}`;
    }

    function updateBalance() {
        fetch('/get_balance')
            .then(response => response.json())
            .then(data => {
                document.getElementById('balance').textContent = `$${data.balance.toLocaleString()}`;
            });
    }

    document.getElementById('chart').addEventListener('click', function(event) {
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const xValue = chart.scales.x.getValueForPixel(x);
        const yValue = chart.scales.y.getValueForPixel(y);
        
        const entryIndex = chartData.findIndex(d => new Date(d.Date) >= xValue);
        document.getElementById('entry_index').value = entryIndex;
        document.getElementById('entry_price').value = yValue.toFixed(2);
    });

    document.getElementById('evaluateButton').addEventListener('click', function () {
        const positionType = document.getElementById('position_type').value;
        const entryIndex = parseInt(document.getElementById('entry_index').value, 10);
        const stopLevel = parseFloat(document.getElementById('stop_level').value);
        const takeProfitLevel = parseFloat(document.getElementById('take_profit_level').value);
        const betAmount = parseFloat(document.getElementById('bet_amount').value);

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
                bet_amount: betAmount
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error); });
            }
            return response.json();
        })
        .then(data => {
            let resultText = `Result: ${data.result}\n`;
            resultText += `Entry Price: $${parseFloat(data.entry_price).toLocaleString()}\n`;
            if (data.exit_price) {
                resultText += `Exit Price: $${parseFloat(data.exit_price).toLocaleString()}\n`;
                resultText += `Percentage Change: ${data.percentage_change.toFixed(2)}%\n`;
                resultText += `Profit/Loss: $${data.profit_loss.toFixed(2)}\n`;
                resultText += `New Balance: $${data.new_balance.toLocaleString()}`;
            }
            document.getElementById('result').innerText = resultText;
            document.getElementById('error').innerText = '';
            updateBalance();
        })
        .catch(err => {
            document.getElementById('result').innerText = '';
            document.getElementById('error').innerText = `Error: ${err.message}`;
        });
    });
});