# 📌 Account Management API (ExpressJS + MySQL)

This project is a **RESTful API built using ExpressJS** that handles account management functionalities such as:

* User Registration
* User Login
* User Logout
* JWT Authentication
* Email Sending (SMTP)
* MySQL Database Integration

It is designed for academic purposes and can be tested using **Postman**.

---

## 🚀 Features

* 🔐 Secure authentication using **JWT (JSON Web Token)**
* 🗄️ MySQL database integration
* 📧 Email sending using SMTP (Gmail)
* 🔑 Environment-based configuration using `.env`
* ⚡ RESTful API endpoints

---

## 🛠️ Tech Stack

* **Backend:** Node.js + ExpressJS
* **Database:** MySQL (XAMPP / phpMyAdmin)
* **Authentication:** JWT
* **Email Service:** SMTP (Gmail)
* **Testing Tool:** Postman

---

## 📁 Project Structure

```
project-folder/
│
├── node_modules/
├── routes/
├── controllers/
├── config/
├── .env
├── package.json
├── server.js / index.js
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Setup Database

1. Open **phpMyAdmin (XAMPP)**
2. Create database:

```sql
CREATE DATABASE account17_db;
```

3. Import your SQL file (if provided)

---

### 4. Configure Environment Variables

Create a `.env` file in the root folder and paste:

```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=account17_db

JWT_SECRET=my_super_secret_key_123

APP_BASE_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173

MAIL_FROM=anthonyjames.nabasca@nmsc.edu.ph
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=anthonyjames.nabasca@nmsc.edu.ph
SMTP_PASS=httf tjuh rqzx ugak
```

---

⚠️ **IMPORTANT NOTE (for Instructor):**

* This `.env` is configured for **local testing only**
* If email sending fails, make sure:

  * Gmail **App Password** is valid
  * Less secure apps / SMTP is allowed

---

### 5. Run the Server

```bash
npm start
```

or (if using nodemon):

```bash
npm run dev
```

---

### ✅ Server will run at:

```
http://localhost:5000
```

---

## 📮 API Endpoints (Postman Testing)

### 🔹 1. Register User

**POST**

```
http://localhost:5000/api/register
```

**Body (JSON):**

```json
{
  "username": "testuser",
  "email": "test@gmail.com",
  "password": "123456",
  "fullname": "Test User"
}
```

---

### 🔹 2. Login

**POST**

```
http://localhost:5000/api/login
```

**Body:**

```json
{
  "email": "test@gmail.com",
  "password": "123456"
}
```

---

### 🔹 3. Logout

**POST**

```
http://localhost:5000/api/logout
```

---

### 🔹 4. Protected Route (Example)

**GET**

```
http://localhost:5000/api/profile
```

👉 Requires Authorization Header:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 🔐 Authentication Flow

1. User registers
2. User logs in
3. Server returns **JWT Token**
4. Token is used for protected routes

---

## 📧 Email Functionality

* Uses **SMTP (Gmail)**
* Sends emails such as:

  * Verification
  * Notifications (if implemented)

---

## 🧪 Testing Guide (Postman)

1. Open Postman
2. Select request type (POST/GET)
3. Enter API URL
4. Go to **Body → raw → JSON**
5. Paste sample JSON
6. Click **Send**

---

## 📌 Notes for Instructor

* `.env` file is included for easy setup
* Database should be created manually before running
* API tested using Postman screenshots (included separately)

---

## 📜 License

This project is for **educational purposes only**.

---

## 👨‍💻 Author

**Anthony James B. Nabasca**
MSIT Student – Specialization Course

---
