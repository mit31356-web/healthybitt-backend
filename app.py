import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize Gemini Client (make sure your API key is pasted here)
client = genai.Client(api_key="AQ.Ab8RN6LWSEYKuZJbWroft05shbLkfH_lrwW4Kp4JdfB5BPJiGw")
@app.route('/analyze', methods=['POST', 'OPTIONS']) # 👈 Make sure 'OPTIONS' is added here
def analyze_food():
    # 👇 ADD THESE 3 LINES RIGHT HERE 👇
    if request.method == 'OPTIONS':
        return '', 200

    user_name = request.form.get('user_name', 'Unknown User')
    print(f"📢 [TRAFFIC] User '{user_name}' is scanning a meal right now!")
    
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
        
    # ... rest of your code remains exactly the same
@app.route('/analyze', methods=['POST'])
def analyze_food():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
        
    image_file = request.files['image']
    image_bytes = image_file.read()

    try:
        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=image_file.content_type,
        )

        # We ask Gemini to return structured data covering all health metrics
        prompt = (
            "Analyze the food in this image and provide a comprehensive health breakdown. "
            "You must format your response EXACTLY like the template below. Do not use markdown, bold text, or symbols. "
            "Just plain text lines:\n\n"
            "Food: [Name]\n"
            "Calories: [Number] kcal\n"
            "Protein: [Number]g\n"
            "Carbs: [Number]g\n"
            "Fats: [Number]g\n"
            "Sugar: [Number]g\n"
            "Sodium: [Number]mg\n"
            "Fiber: [Number]g\n"
            "Vitamins: [Key vitamins present]\n"
            "Allergens: [List potential allergens or None]\n"
            "HealthScore: [Number from 1 to 100]\n"
            "Verdict: [One short sentence on how healthy this is and a tip]"
        )

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[image_part, prompt]
        )

        return jsonify({"result": response.text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)