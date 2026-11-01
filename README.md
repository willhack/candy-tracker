# Candy Tracker

A playful candy collection tracker for your Halloween haul. The React + TypeScript app runs locally with a small Node API and a SQLite database stored in `data/candy-tracker.sqlite`.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually <http://localhost:5173>). The API runs on port 3001 and Vite proxies `/api` requests to it.

Add a candy name and piece count. Adding a name already in the collection adds those pieces to its count. In the collection list, use the +/− buttons or edit a count directly; zero is allowed when updating.

## Production build

```sh
npm run build
NODE_ENV=production npm start
```

The production server serves the built app and API on port 3001. Set `PORT` to change the server port, or set `CANDY_DB_PATH` to choose another SQLite file. The default database is local to this project and is ignored by Git.

## Checks

```sh
npm run typecheck
npm run build
```
