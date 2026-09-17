# UserManage - Modern Angular SaaS Platform

A responsive, feature-rich Angular web application built with a modern UI design system, REST API integration, authentication, role-based authorization, user management CRUD, multiple image upload with product-style magnifier, Google Drive-style file and folder management, reactive forms, guards, and interceptors.

Powered by **JSON Server** as the mock REST API backend (`db.json`).

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Application

You will need two terminals running simultaneously:

```bash
# Terminal 1: Start JSON Server Mock REST API (Port 3000)
npm run api

# Terminal 2: Start Angular Dev Server (Port 4200)
npm start
```

Open your browser at **`http://localhost:4200`**.

---

## 🔑 Demo Accounts & Credentials

The Login screen features a dynamic role selector with username/email fields:

| Role         | Role Selector | Identifier                                    | Password       | Destination                                                                           |
| :----------- | :------------ | :-------------------------------------------- | :------------- | :------------------------------------------------------------------------------------ |
| **Admin**    | `Admin`       | `admin` _(Username)_ or `admin@gmail.com`     | `Admin@123`    | Admin Dashboard, User Management CRUD, Image Gallery, Drive Explorer, Profile         |
| **Manager**  | `Manager`     | `manager` _(Username)_ or `manager@gmail.com` | `Manager@123`  | Manager Dashboard, Team Directory (read-only), Image Gallery, Drive Explorer, Profile |
| **Employee** | `Employee`    | `employee@gmail.com` _(Email)_                | `Employee@123` | Employee Dashboard, Personal Image Gallery & Magnifier, Personal Drive Files, Profile |

> 💡 **Public Registration:** New users can register via the **Sign Up** page (`/signup`), which automatically assigns the `employee` role and enables immediate login.

---

## 📖 Comprehensive Documentation

For the complete architectural design guide, database schema breakdown, reusable component catalog, and service lifecycle descriptions, please see [**`PROJECT_DOCUMENTATION.md`**](file:///d:/user-managment/PROJECT_DOCUMENTATION.md).

---

## 🧪 Testing & Verification

```bash
# Run unit test suite (Vitest)
npm test -- --watch=false

# Run production build
npm run build
```
