# 🚀 QueueLess AI - Backend

Smart Queue Management System with JWT + Firebase Hybrid Authentication, AI Features, and Multi-Channel Notifications.

## 🛠️ Tech Stack

- **Node.js** + Express.js
- **MongoDB** + Mongoose
- **JWT** for authentication
- **Firebase Admin SDK** (Google OAuth only)
- **Socket.IO** for real-time updates
- **Groq AI** (Llama 3.1)
- **Resend** for emails
- **OneSignal** for push notifications

## 📦 Installation

```bash
npm install
```

## ⚙️ Configuration

1. Copy `.env.example` to `.env`
2. Fill in all environment variables:
   - MongoDB Atlas URI
   - JWT_SECRET (min 32 characters)
   - Firebase Admin SDK credentials
   - Groq API key
   - Resend API key
   - OneSignal credentials
   - Frontend URL for CORS

## 🚀 Running Locally

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register with email/password
- `POST /login` - Login with email/password
- `POST /google` - Google OAuth authentication
- `POST /logout` - Logout user
- `GET /me` - Get current user
- `PUT /profile` - Update profile

### User Routes (`/api/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `POST /ai/chat` - AI chat assistant
- `GET /notifications/settings` - Get notification preferences
- `PUT /notifications/settings` - Update notification preferences
- `POST /notifications/register-device` - Register OneSignal device
- `GET /notifications/history` - Get notification history

### Admin Routes (`/api/admin`)
- Hospital/Bank/Salon CRUD operations
- Queue management
- Analytics & dashboard
- AI insights

### Appointment Routes (`/api/appointments`)
- Book, view, update, cancel appointments
- Track queue position

## 🗄️ Database Migration

If migrating from old Firebase-only auth:

```bash
# Drop old uid index
node drop-old-index.js

# Migrate users to new schema
node migrate-users.js
```

## 🔐 Authentication Flow

### Email/Password:
1. User registers → Password hashed with bcrypt
2. User logs in → Backend verifies password
3. Backend generates JWT token
4. Token sent to frontend (stored in localStorage)
5. All requests include: `Authorization: Bearer <token>`

### Google OAuth:
1. User clicks "Sign in with Google"
2. Firebase handles OAuth popup
3. Frontend sends Firebase UID + email to backend
4. Backend creates/finds user
5. Backend generates JWT token
6. Token sent to frontend

## 🌍 Deployment (Render)

1. Push to GitHub
2. Create Web Service on Render
3. Connect GitHub repository
4. Set environment variables
5. Deploy!

**Build Command**: `npm install`  
**Start Command**: `npm start`

## 📝 Environment Variables for Render

Set these in Render dashboard:

```
PORT=5000
NODE_ENV=production
JWT_SECRET=<generate-strong-secret>
ADMIN_REGISTRATION_CODE=<your-admin-code>
MONGODB_URI=<mongodb-atlas-uri>
FIREBASE_PROJECT_ID=<firebase-project-id>
FIREBASE_PRIVATE_KEY=<firebase-private-key>
FIREBASE_CLIENT_EMAIL=<firebase-client-email>
GROQ_API_KEY=<groq-api-key>
RESEND_API_KEY=<resend-api-key>
ONESIGNAL_APP_ID=<onesignal-app-id>
ONESIGNAL_REST_API_KEY=<onesignal-rest-api-key>
FRONTEND_URL=<your-frontend-url>
```

## 🔒 Security Notes

- Never commit `.env` files
- Use strong JWT_SECRET (min 32 characters)
- Change ADMIN_REGISTRATION_CODE in production
- Whitelist Render IPs in MongoDB Atlas: `0.0.0.0/0`
- Enable HTTPS (Render provides this automatically)

## 📚 Documentation

See [AUTHENTICATION_GUIDE.md](../AUTHENTICATION_GUIDE.md) for detailed authentication documentation.

## 🤝 Contributing

This is a private project. For issues or questions, contact the repository owner.

## 📄 License

Private - All Rights Reserved

---

**Built with ❤️ for QueueLess AI**

<!-- Last updated: 2024 -->
# Force redeploy 
