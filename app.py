from flask import Flask, render_template, request, jsonify
import pandas as pd

app = Flask(__name__)

df = pd.read_csv('charts_data/chart.csv')
df['Date'] = pd.to_datetime(df['Date'])

balance = 1000

@app.route('/')
def index():
    global balance
    balance = 1000  
    return render_template('index.html')

@app.route('/get_chart_data')
def get_chart_data():
    data = df.to_dict(orient='records')
    return jsonify(data)

@app.route('/evaluate_position', methods=['POST'])
def evaluate_position():
    global balance
    data = request.json
    position_type = data.get('position_type')
    entry_index = data.get('entry_index')
    stop_level = data.get('stop_level')
    take_profit_level = data.get('take_profit_level')
    bet_amount = data.get('bet_amount')

    if not all(isinstance(i, (int, float)) for i in (entry_index, stop_level, take_profit_level, bet_amount)):
        return jsonify({'error': 'Invalid input types'}), 400

    if entry_index < 0 or entry_index >= len(df):
        return jsonify({'error': 'Invalid entry index'}), 400
    
    if position_type == 'long' and (stop_level >= take_profit_level):
        return jsonify({'error': 'For long positions, stop level must be less than take profit level'}), 400
    elif position_type == 'short' and (stop_level <= take_profit_level):
        return jsonify({'error': 'For short positions, stop level must be greater than take profit level'}), 400

    if bet_amount <= 0 or bet_amount > balance:
        return jsonify({'error': 'Invalid bet amount'}), 400

    slice_df = df.iloc[entry_index:].copy()
    entry_price = slice_df.iloc[0]['Close']

    result = 'Open'
    exit_price = None

    for _, row in slice_df.iterrows():
        if position_type == 'long':
            if row['Low'] <= stop_level:
                result = 'Loss'
                exit_price = stop_level
                break
            elif row['High'] >= take_profit_level:
                result = 'Profit'
                exit_price = take_profit_level
                break
        elif position_type == 'short':
            if row['High'] >= stop_level:
                result = 'Loss'
                exit_price = stop_level
                break
            elif row['Low'] <= take_profit_level:
                result = 'Profit'
                exit_price = take_profit_level
                break

    if exit_price:
        price_difference = exit_price - entry_price if position_type == 'long' else entry_price - exit_price
        percentage_change = (price_difference / entry_price) * 100
        profit_loss = bet_amount * (percentage_change / 100)
        balance += profit_loss
    else:
        profit_loss = 0

    return jsonify({
        'result': result,
        'entry_price': entry_price,
        'exit_price': exit_price,
        'position_type': position_type,
        'percentage_change': percentage_change if exit_price else None,
        'profit_loss': profit_loss,
        'new_balance': balance
    })

@app.route('/get_balance')
def get_balance():
    global balance
    return jsonify({'balance': balance})

if __name__ == '__main__':
    app.run(debug=True)