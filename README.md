# Community Issue Reporting

A React/Vite frontend with a Flask backend for reporting and managing community issues.

## Production deployment on Render

This repository is configured so Render can build the React frontend and then start Flask, with Flask serving the generated frontend.

- Build: `pip install -r backend/requirements.txt && cd frontend && npm ci && npm run build`
- Start: `gunicorn --chdir backend --bind 0.0.0.0:$PORT app:app`
- The producti0n API is relative to the same origin (`/api`), so no hard-coded localhost URL is used.
- `render.yaml` contains the deployment configuration.

## Local development

Backend:

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Frontend (in a second terminal):

```bash
cd frontend
npm install
npm run dev
```

The Vite development server proxies `/api` and `/uploads` to Flask on port 5000.

## Important
Data and uploaded files are stored on the server filesystem. On hosted platforms with ephemeral disks, those files can be lost when the service is redeployed/restarted. For persistent production data, use a managed database and object storage.
