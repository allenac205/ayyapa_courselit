## Local Setup Guide (Windows) – Web App Only

This guide explains how to run the **Courselit web app** on a **Windows laptop**.  
For now, this covers only the **main Node.js app** (no AI/FastAPI service).

---

## 1. Install Required Tools

### 1.1 Install Git

- Download Git for Windows from `https://git-scm.com/download/win`.
- Run the installer and accept the default options.

### 1.2 Install Node.js (LTS)

- Go to `https://nodejs.org`.
- Download and install the **LTS** version for Windows.
- After installation, open **Command Prompt** and verify:

```bash
node -v
npm -v
```

### 1.3 Install pnpm

Try using **Corepack** first (recommended):

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

If `corepack` is not available, install pnpm globally:

```bash
npm install -g pnpm
pnpm -v
```

### 1.4 Install MongoDB Community Server

- Go to `https://www.mongodb.com/try/download/community`.
- Download the **MSI** for Windows and install with default options.
- Make sure the option **“Run MongoDB as a service”** is enabled.
- After installation, MongoDB will run on `mongodb://localhost:27017` by default.

---

## 2. Clone the Project

Choose a folder where you want to keep the code, then in **Command Prompt**:

```bash
cd C:\Users\YourName\Documents
git clone <REPO_URL> courselit
cd courselit
```

Replace `<REPO_URL>` with the actual Git repository URL you are given.

---

## 3. Install Dependencies

From the **project root** (`courselit` folder):

```bash
pnpm install
```

This installs dependencies for all workspaces, including the web app.

---

## 4. Configure Environment Variables for the Web App

1. Move into the web app folder:

    ```bash
    cd apps\web
    ```

2. If you see a file like `.env.example` or `.env.local.example`, copy it to `.env.local`. For example:

    ```bash
    copy .env.example .env.local
    ```

3. Open `.env.local` in a text editor and make sure the MongoDB connection string points to your local Mongo:

    ```env
    MONGODB_URI=mongodb://localhost:27017/<your_database_name>
    ```

    Replace `<your_database_name>` with the database name expected by the app.

4. Go back to the project root when you are done:

    ```bash
    cd ..\..
    ```

---

## 5. Ensure MongoDB Is Running

MongoDB is usually started automatically as a Windows service. To confirm:

- Open the **Services** app in Windows.
- Find **MongoDB** in the list and check that its status is **Running**.

If it is not running, right-click it and choose **Start**.

---

## 6. Run the Web App in Development Mode

From the **project root** (`courselit` folder):

```bash
cd apps\web
pnpm dev
```

- Wait for the dev server to start.
- Open a browser and go to:

`http://localhost:3000`

You should now see the Courselit web app running locally.

---

## 7. Quick Summary for Students

1. Install **Git**, **Node.js LTS**, **pnpm**, and **MongoDB Community Server** on Windows.
2. Clone the repo:

    ```bash
    git clone <REPO_URL> courselit
    cd courselit
    pnpm install
    ```

3. In `apps/web`, create `.env.local` (from the example file if present) and set `MONGODB_URI` to `mongodb://localhost:27017/<your_database_name>`.
4. From the project root, run:

    ```bash
    cd apps\web
    pnpm dev
    ```

5. Open `http://localhost:3000` in the browser.
