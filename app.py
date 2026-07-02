import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types

app = Flask(__name__)
# Enable CORS cleanly for cross-origin mobile requests
CORS(app, resources={r"/*": {"origins": "*", "methods": ["POST", "OPTIONS"], "allow_headers": ["Content-Type"]}})

# Initialize Gemini Client using the secure cloud environment variable
# CHANGE THIS LINE FROM:
# client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# TO THIS SINGLE SAFE LINE:
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", "AQ.Ab8RN6LWSEYKuZJbWroft05shbLkfH_lrwW4Kp4JdfB5BPJiGw"))

@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze_food():
    # Handle the browser's preflight OPTIONS request instantly
    if request.method == 'OPTIONS':
        return '', 200

    user_name = request.form.get('user_name', 'Unknown User')
    print(f"📢 [TRAFFIC] User '{user_name}' is scanning a meal right now!")

    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
        
    image_file = request.files['image']
    image_bytes = image_file.read()

    try:
        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=image_file.content_type,
        )

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
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)