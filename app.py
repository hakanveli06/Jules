import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='static')
CORS(app)

# Use DATABASE_URL environment variable if provided (for external DBs or persistent disks later)
# If not, fallback to a local 'data.json' file (which will be wiped on Render's ephemeral free tier, but works for testing)
DATABASE_FILE = os.environ.get('DATABASE_URL', 'data.json')

def load_data():
    if not os.path.exists(DATABASE_FILE):
        return {"lists": {}}
    try:
        with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {"lists": {}}

def save_data(data):
    try:
        with open(DATABASE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving data: {e}")
        return False

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/api/lists', methods=['GET'])
def get_lists():
    data = load_data()
    return jsonify(data)

@app.route('/api/lists', methods=['POST'])
def save_list():
    data = load_data()
    req_data = request.json

    list_id = req_data.get('id')
    list_name = req_data.get('name')
    todos = req_data.get('todos', [])

    if not list_id or not list_name:
        return jsonify({"error": "List id and name are required", "success": False}), 400

    data["lists"][list_id] = {
        "id": list_id,
        "name": list_name,
        "todos": todos
    }

    if save_data(data):
        return jsonify({"success": True, "list": data["lists"][list_id]})
    else:
        return jsonify({"error": "Failed to save data to file", "success": False}), 500

@app.route('/api/lists/<list_id>', methods=['DELETE'])
def delete_list(list_id):
    data = load_data()
    if list_id in data["lists"]:
        del data["lists"][list_id]
        if save_data(data):
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Failed to save deletion to file", "success": False}), 500
    return jsonify({"error": "List not found", "success": False}), 404

if __name__ == '__main__':
    # Local development server
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)