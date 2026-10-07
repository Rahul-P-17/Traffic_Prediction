# Setup

1. `cd ml-service && pip install -r requirements.txt`
2. `python3 scripts/build_pipeline.py`   (from project root — regenerates pipeline_output.json with real metrics)
3. `cd ml-service && uvicorn app.main:app --port 8000`
4. `cd backend && npm install && npm run build && DEMO_MODE=true ML_SERVICE_URL=http://127.0.0.1:8000 node dist/server.js`
5. `cd frontend && npm install && npm run dev` → http://localhost:5173
