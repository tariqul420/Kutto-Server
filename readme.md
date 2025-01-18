# Kutto Backend

This is the backend server for the **Kutto** application, a pet adoption platform. The server handles authentication, pet management, adoption requests, donation campaigns, and other backend functionalities using `Node.js`, `Express.js`, `MongoDB`, and `JWT`.

## 🚀 Project Overview

- **Framework**: Node.js
- **Database**: MongoDB
- **Authentication**: JWT with cookies
- **Environment Variables**: Managed using `.env` file

## 🚀 Live Links

- **Client Repo:** [_github/tariqul420/kutto-client_](https://github.com/Programming-Hero-Web-Course4/b10a12-client-side-tariqul420.git)
- **Server Repo:** [_github/tariqul420/kutto-server_](https://github.com/Programming-Hero-Web-Course4/b10a12-server-side-tariqul420.git)
- **Live Site:** [_Kutto.com_](https://kutto-0.web.app)
- **Alternate Live Site:** [_Kutto-2.com_](https://kutto-0.firebaseapp.com)

---

## 📜 Features

### 🔐 Authentication

- JWT-based authentication.
- Secure cookie storage for tokens.
- Login and logout endpoints.

### 🐾 Pet Management

- Add, update, delete, and fetch pets.
- Fetch pets based on adoption status.

### 🏠 Adoption Requests

- Request adoption for pets.
- Fetch and manage adoption requests.

### 💰 Donation Management

- Create, update, and manage donation campaigns.
- Fetch donation history and manage refunds.

### 🔧 Middleware

- `verifyToken`: Verifies the JWT token for protected routes.
- `verifyAdmin`: Ensures that the user is an admin before accessing certain endpoints.

---

## 🛠 Technology Used

- **Node.js**: Backend framework.
- **Express.js**: Web server.
- **MongoDB**: Database.
- **JWT**: Authentication.
- **dotenv**: Environment variable management.
- **cors**: Cross-Origin Resource Sharing.
- **cookie-parser**: For handling cookies.

---

## 🔗 Endpoints

### Common Endpoints

- **POST `/jwt`**: Generate JWT token.
- **GET `/logout`**: Clear JWT token.
- **POST `/users`**: Save User Mongodb

### Common & Secure

- **PATCH `/users/:email`**: Update user profile.
- **GET `/users/role/:email`**: Get user role.
- **POST `/create-payment-intent`**: Create payment intent.
- **POST `/save-payment-history`**: Save payment history.

### Public Endpoints

- **GET `/all-pets`**: Fetch all pets.
- **GET `/donation-campaign`**: Fetch all donation campaign.
- **GET `/pets/:id`**: Fetch single pet details.
- **GET `/donation-details/:id`**: Fetch single donation details.
- **GET `/suggestion-donation-campaign`**: Fetch 3 suggestion donation campaign.
- **GET `/pets-category/:category`**: Fetch all single pet category.

### Protected Endpoints User (Require JWT)

- **POST `/add-pet`**: Add a new pet to the database.
- **GET `/my-pets/:email`**: Get all pets added by a specific user.
- **PATCH `/adopt-pet/:id`**: Update the adoption status of a pet.
- **POST `/adoption-request`**: Post an adoption request for a pet.
- **GET `/adoption-request/:email`**: Get all adoption requests for a specific user.
- **POST `/create-donation`**: Create a new donation campaign.
- **GET `/my-donation/:email`**: Get all donation campaigns created by a specific user.
- **GET `/my-donation-history/:email`**: Get the donation history of a specific user.
- **PATCH `/refund-donation/:id`**: Refund the donation amount for a specific campaign.
- **PUT `/update-donation-campaign/:id`**: Update details of a donation campaign.

### Admin Endpoints (Require Admin Role)

- **GET `/users`**: Get all users (except the current logged-in user).
- **PATCH `/user-role-update/:email`**: Update the role of a user to "admin" and set their status to "verified".
- **GET `/all-pet-admin`**: Get all pet data for admin (including adoption status).
- **PATCH `/adoption-status-admin/:id`**: Update the adoption status of a pet (admin only).
- **GET `/all-donation-campaign-admin`**: Get all donation campaigns for admin.
- **DELETE `/donation-campaign-admin/:id`**: Delete a donation campaign (admin only).

### Admin & User Both Endpoints

- **PATCH `/donation-status/:id`**: Update the status of a donation campaign (User & Admin).
- **DELETE `/delete-pet/:id`**: Delete a pet from the database (User & Admin).
- **PUT `/update-pets/:id`**: Update pet details (User & Admin).

---

## 🛠 Installation

### Prerequisites

- **Node.js** and **npm** installed
- **MongoDB** connection string

---

### Client Side Setup

1. Clone the client-side repository:

   ```bash
   git clone https://github.com/Programming-Hero-Web-Course4/b10a12-client-side-tariqul420.git
   cd b10a12-client-side-tariqul420
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the project in a code editor:
   ```bash
   code .
   ```
5. Add the `.env` file in the root directory and include the following environment variables:
   ```bash
   VITE_API_KEY=_____________________________
   VITE_AUTH_DOMAIN=_________________________
   VITE_PROJECT_ID=__________________________
   VITE_STORAGE_BUCKET=______________________
   VITE_MESSAGE_SENDER_ID=___________________
   VITE_APP_ID=______________________________
   VITE_MEASUREMENT_ID=______________________
   VITE_IMGBB_API_KEY=_______________________
   VITE_SERVER_API_URL=______________________
   VITE_STRIPE_CLIENT_SECRET=________________
   ```
   > **Note:** Replace the `VITE_API_KEY` and `VITE_AUTH_DOMAIN`, along with other placeholders, with actual values.

### Server Side Setup

1. Clone the client-side repository:

   ```bash
   git clone https://github.com/Programming-Hero-Web-Course4/b10a12-server-side-tariqul420.git
   cd b10a12-server-side-tariqul420
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   node index.js
   ```

   --- OR ---

   ```bash
   nodemon index.js
   ```

4. Open the project in a code editor:
   ```bash
   code .
   ```
5. Add the `.env` file in the root directory and include the following environment variables:
   ```bash
   DATABASE_USERNAME=________________________
   DATABASE_PASSWORD=________________________
   ACCESS_TOKEN_SECRET=______________________
   STRIPE_SECRET_KEY=________________________
   ```
   > **Note:** Replace the `index.js` file's `mongo_uri` and the `.env` file's `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `ACCESS_TOKEN_SECRET` and `STRIPE_SECRET_KEY` with actual values.

## 🧑‍💻 Authors

- Tariqul Islam (Lead Developer)
- Lead Developer & Maintainer
- Connect with me on [_GitHub_](https://github.com/tariqul420) & [_Facebook_](https://www.facebook.com/tariqul.islam.fb)
