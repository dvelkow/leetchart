from flask import Flask, render_template, request, jsonify
import pandas as pd

app = Flask(__name__)

# Load chart data once and convert date to datetime object for consistency
df = pd.read_csv('charts_data/chart.csv')
df['Date'] = pd.to_datetime(df['Date'])  # Ensure the date is a datetime object

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_chart_data')
def get_chart_data():
    data = df.to_dict(orient='records')
    return jsonify(data)

@app.route('/evaluate_position', methods=['POST'])
def evaluate_position():
    data = request.json
    position_type = data.get('position_type')
    entry_index = data.get('entry_index')
    stop_level = data.get('stop_level')
    take_profit_level = data.get('take_profit_level')
    stake = data.get('stake')

    # Validate input data types
    if not all(isinstance(i, (int, float)) for i in (entry_index, stop_level, take_profit_level, stake)):
        return jsonify({'error': 'Invalid input types'}), 400

    # Validate entry index
    if entry_index < 0 or entry_index >= len(df):
        return jsonify({'error': 'Invalid entry index'}), 400
    
    # Ensure stop and take profit levels are valid
    if stop_level >= take_profit_level:
        return jsonify({'error': 'Stop level must be less than take profit level'}), 400

    # Dynamically determine the range to evaluate
    slice_df = df.iloc[entry_index:min(entry_index + 10, len(df))].copy()

    # Initialize result and position status
    result = 0
    position_active = True

    # Loop through the relevant slice of data to evaluate position
    for index, row in slice_df.iterrows():
        if position_active:
            if position_type == 'long':
                if row['Low'] <= stop_level:
                    result = -stake  # Stop loss triggered
                    position_active = False
                elif row['High'] >= take_profit_level:
                    result = stake  # Take profit triggered
                    position_active = False
            elif position_type == 'short':
                if row['High'] >= stop_level:
                    result = -stake  # Stop loss triggered
                    position_active = False
                elif row['Low'] <= take_profit_level:
                    result = stake  # Take profit triggered
                    position_active = False

    # Return the result of the evaluation
    return jsonify({'result': result, 'position_type': position_type, 'stake': stake})

# New endpoint to retrieve summary statistics
@app.route('/summary_statistics')
def summary_statistics():
    stats = {
        'total_entries': len(df),
        'max_close': df['Close'].max(),
        'min_close': df['Close'].min(),
        'average_close': round(df['Close'].mean(), 2),  # Round for consistency
        'latest_date': df['Date'].max().strftime('%Y-%m-%d'),  # Latest date
        'earliest_date': df['Date'].min().strftime('%Y-%m-%d')  # Earliest date
    }
    return jsonify(stats)

# New endpoint for the last N entries
@app.route('/last_entries/<int:n>', methods=['GET'])
def last_entries(n):
    if n < 1:  # Ensure n is at least 1
        return jsonify({'error': 'Invalid number of entries requested'}), 400
    last_n_entries = df.tail(n).to_dict(orient='records')
    return jsonify(last_n_entries)

# New endpoint for getting average price over a period
@app.route('/average_price/<int:start_index>/<int:end_index>', methods=['GET'])
def average_price(start_index, end_index):
    if start_index < 0 or end_index >= len(df) or start_index >= end_index:
        return jsonify({'error': 'Invalid index range'}), 400
    average = round(df['Close'][start_index:end_index].mean(), 2)
    return jsonify({'average_price': average})

if __name__ == '__main__':
    app.run(debug=False)  # Set debug to False for production