# Mock Backend (JSON Server)

This directory contains the mock REST API backend powered by [JSON Server](https://github.com/typicode/json-server).

## Files

- `db.json` — The main database file containing mock datasets for users, images, drive files, and folders.
- `package.json` — Package configuration and scripts for running the mock server.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

The mock API server will be available at:

- **Base URL**: `http://localhost:3000`
- **Users**: `http://localhost:3000/users`
- **Images**: `http://localhost:3000/images`
- **Drive Nodes**: `http://localhost:3000/driveNodes`

### Running from Project Root

You can also run the mock backend directly from the workspace root:

```bash
npm run api
```
