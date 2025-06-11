# medical_app_v1_backend

This repository contains the backend code for the Medical App v1, a Node.js/Express-based REST API for managing medical centers, patients, test catalogs, bookings, and user authentication.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **User Authentication:** JWT-based login/signup for users, superadmins, and medical centers.
- **Medical Centre Management:** Add, edit, verify, and list medical centers.
- **Test Catalog:** Manage test catalogs and assign tests to centers.
- **Patient Management:** Add patients, addresses, and prescriptions.
- **Booking System:** Booking creation, summary, and order management.
- **Input Validation:** Strong validation using Joi schemas.
- **File Uploads:** Prescription and logo uploads with Multer and (optionally) Cloud storage.
- **Role-Based Access:** Middleware for user and superadmin access control.

---

## Tech Stack

- **Node.js** & **Express.js**
- **PostgreSQL** (via `pg`)
- **JWT** for authentication
- **bcrypt** for password hashing
- **Joi** for schema validation
- **Multer** for file uploads

---

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- PostgreSQL database
- npm

### Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/OfficialAnubrata/medical_app_v1_backend.git
    cd medical_app_v1_backend
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Set up environment variables:**  
   Create a `.env` file in the root directory (see [Environment Variables](#environment-variables)).

4. **Run database migrations** (if any).

5. **Start the development server:**
    ```bash
    npm run dev
    ```
    Or for production:
    ```bash
    npm start
    ```

---

## Environment Variables

Create a `.env` file in the root directory with the following variables (example):

```
DATABASE_URL=
# Authetication config
JWT_SECRET = 
JWT_EXPIRY_TIME=
REFESH_TOKEN_SECRET= 

# Nodemailer config
NODEMAILER_GMAIL=
NODEMAILER_GMAIL_PASS=

# cloudnary config
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_SECRET=
CLOUDINARY_API_KEY=
```

---
 
**All endpoints require JWT authorization in headers.**  
Refer to route files in `src/routes/` for details.

---

## Project Structure

```
src/
  controllers/      # Route handlers (business logic)
  middlewares/      # JWT, Multer, etc.
  routes/           # Express route definitions
  utils/            # Utilities (logger, response, etc.)
  validators/       # Joi schemas for request validation
  config/           # DB and app config
  ...
```

---

## Contributing

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.
