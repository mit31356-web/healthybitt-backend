import os
import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types

app = Flask(__name__)

# Enable CORS cleanly for cross-origin frontend requests
CORS(app, resources={r"/*": {"origins": "*", "methods": ["POST", "OPTIONS"], "allow_headers": ["Content-Type"]}})

DATABASE_FILE = "healthybitt.db"

# ==========================================================
# DATABASE INITIALIZATION
# ==========================================================
def init_db():
    """Creates the SQLite database tables automatically if they don't exist."""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    # 1. Create Users Profile Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            weight_kg REAL,
            target_calories INTEGER
        )
    ''')
    
    # 2. Create 30-Day Diet Plans Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS diet_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            day_number INTEGER,
            meal_type TEXT,
            food_items TEXT,
            is_customized BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    conn.commit()
    conn.close()

init_db()

# ==========================================================
# MODERN MULTI-KEY ROTATION LOGIC (STABLE GA VERSION)
# ==========================================================
API_KEYS_POOL = [
    "AQ.Ab8RN6JtkoHbUtgaMiwBceaE_jGOPL7jOVJF_3sCq5xFSUh18A",
    "AQ.Ab8RN6JNsp8nFFkk3dDYyoyCsWdXpoMVwsRQ0z-Khg0Optq6Qg",
    "AQ.Ab8RN6KnMVczBVIinC4SPLjexkFjveBe9Sc3PAyUuVmZQGPI5w",
    "AQ.Ab8RN6KDPPHf-d2vNzwmx1vNT147TDlf68oZ487ihIKQo9_nvg"
]

def analyze_image_with_key_rotation(image_bytes, mime_type):
    """Loops through the AQ key pool using standard content generation structures."""
    active_keys = [k.strip() for k in API_KEYS_POOL if k.strip()]
    if not active_keys:
        raise Exception("Configuration Error: No API keys present in pool.")

    last_error = None
    for key in active_keys:
        try:
            # Initialize stable genai client instance with your modern AQ. token
            client = genai.Client(api_key=key)
            
            prompt = "Return the nutritional breakdown exactly in this text format..."
            
            # Form image part bytes content payload structure natively
            image_part = types.Part.from_bytes(
                data=image_bytes,
                mime_type=mime_type,
            )
            
            # Execute standard content block analysis call
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[prompt, image_part]
            )
            return response.text
            
        except Exception as e:
            last_error = str(e)
            if "429" in last_error or "RESOURCE_EXHAUSTED" in last_error or "401" in last_error:
                print(f"Key slot starting with {key[:10]} dropped. Rotating to fallback slot...")
                continue
            else:
                raise e

    raise Exception(f"All API key communication channels dropped. Status: {last_error}")


@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    if request.method == 'OPTIONS':
        return '', 200
        
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
        
    file = request.files['image']
    mime_type = file.content_type
    image_bytes = file.read()
    
    try:
        analysis_result = analyze_image_with_key_rotation(image_bytes, mime_type)
        return jsonify({'result': analysis_result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==========================================================
# USER PROFILE & 30-DAY DIET ROUTES
# ==========================================================

@app.route('/profile', methods=['POST'])
def save_or_update_profile():
    data = request.json
    user_id = data.get('user_id')
    name = data.get('name')
    weight = data.get('weight_kg')
    target_cals = data.get('target_calories')
    
    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400

    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO users (id, name, weight_kg, target_calories)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            weight_kg=excluded.weight_kg,
            target_calories=excluded.target_calories
    ''', (user_id, name, weight, target_cals))
    
    cursor.execute('SELECT COUNT(*) FROM diet_plans WHERE user_id = ?', (user_id,))
    if cursor.fetchone()[0] == 0:
        for day in range(1, 31):
            for meal in ['Breakfast', 'Lunch', 'Dinner']:
                cursor.execute('''
                    INSERT INTO diet_plans (user_id, day_number, meal_type, food_items)
                    VALUES (?, ?, ?, ?)
                ''', (user_id, day, meal, f"Standard healthy {meal} targets"))
                
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'Profile and 30-day timeline initialized.'}), 200


@app.route('/diet/<user_id>', methods=['GET'])
def get_diet_plan(user_id):
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT day_number, meal_type, food_items, is_customized FROM diet_plans WHERE user_id = ? ORDER BY day_number ASC', (user_id,))
    rows = cursor.fetchall()
    conn.close()
    
    diet_plan_list = [dict(row) for row in rows]
    return jsonify({'user_id': user_id, 'diet_plan': diet_plan_list}), 200


@app.route('/diet/customize', methods=['POST'])
def customize_meal():
    data = request.json
    user_id = data.get('user_id')
    day = data.get('day_number')
    meal_type = data.get('meal_type')
    new_food = data.get('food_items')
    
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE diet_plans 
        SET food_items = ?, is_customized = 1
        WHERE user_id = ? AND day_number = ? AND meal_type = ?
    ''', (new_food, user_id, day, meal_type))
    
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': f'Day {day} {meal_type} updated successfully!'}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)