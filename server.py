import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='.')
CORS(app)

DATA_FILE = 'data.json'

def load_data():
    if not os.path.exists(DATA_FILE):
        return {"lists": {}}
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {"lists": {}}

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

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
        return jsonify({"error": "List id and name are required"}), 400

    data["lists"][list_id] = {
        "id": list_id,
        "name": list_name,
        "todos": todos
    }

    save_data(data)
    return jsonify({"success": True, "list": data["lists"][list_id]})

@app.route('/api/lists/<list_id>', methods=['DELETE'])
def delete_list(list_id):
    data = load_data()
    if list_id in data["lists"]:
        del data["lists"][list_id]
        save_data(data)
        return jsonify({"success": True})
    return jsonify({"error": "List not found"}), 404

if __name__ == '__main__':
    # Use standard host 0.0.0.0 to make it accessible to localtunnel
    app.run(host='0.0.0.0', port=3000, debug=True)