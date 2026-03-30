
---


```md
# 📌 Account Management API (ExpressJS + MySQL)

This project is a **RESTful API built using ExpressJS** that handles user account management including authentication and email functionality.

---

## 🚀 Features

- User Registration
- User Login (JWT Authentication)
- User Logout
- Email Sending via SMTP (Gmail)
- MySQL Database Integration
- File Upload Support (uploads folder)

---

## 🛠️ Tech Stack

- **Backend:** Node.js + ExpressJS
- **Database:** MySQL (XAMPP / phpMyAdmin)
- **Authentication:** JSON Web Token (JWT)
- **Email Service:** Nodemailer (SMTP - Gmail)
- **Testing Tool:** Postman

---

## 📁 Project Structure

```

activity17_backend/
│
├── uploads/               # Uploaded files storage
├── account18_db.sql      # Database SQL file
├── index.js              # Main server file
├── mailer.js             # Email configuration
├── package.json
├── package-lock.json
└── README.md

````

---

## ⚙️ Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/anthonyjames-nabasca/activity17_backend.git
cd activity17_backend
````

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

3. Import the provided SQL file:

```
account18_db.sql
```

---

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

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

⚠️ **IMPORTANT (For Instructor):**

* This project is configured for **local testing only**
* If email does not send:

  * Ensure Gmail App Password is correct
  * Ensure SMTP access is enabled

---

### 5. Run the Server

```bash
node index.js
```

or if using nodemon:

```bash
npx nodemon index.js
```

---

### ✅ Server URL

```
http://localhost:5000
```

---

## 📮 API Endpoints (Postman)

### 🔹 Register

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

### 🔹 Login

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

### 🔹 Logout

**POST**

```
http://localhost:5000/api/logout
```

---

### 🔹 Example Protected Route

**GET**

```
http://localhost:5000/api/profile
```

**Headers:**

```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 🔐 Authentication Flow

1. User registers
2. User logs in
3. Server returns JWT Token
4. Token is used for protected routes

---

## 📧 Email Configuration

* Uses **Gmail SMTP**
* Configured inside `mailer.js`
* Sends emails (verification / notifications)

---

## 🧪 Testing Instructions

1. Open **Postman**
2. Select request type (POST/GET)
3. Enter API URL
4. Go to **Body → raw → JSON**
5. Paste sample JSON
6. Click **Send**

---

## 📦 Submission Notes

* `.env` file is included for testing
* SQL file is provided (`account18_db.sql`)
* API tested using Postman screenshots (submitted separately)

---

## 📜 License

For **educational purposes only**

---

## 👨‍💻 Author

**Anthony James Nabasca**
MSIT Student

```
```
