# Rolls

### The Disposable Camera App

**Rolls** is a social photography app inspired by the experience of disposable cameras.

Instead of treating every photo as an individual piece of content, Rolls organizes photography around shared experiences. Users create collaborative photo rolls, invite friends to contribute, and capture moments together in a more intentional way than traditional social media.

The goal is to bring some of the anticipation, imperfection, and shared experience of disposable photography into a modern mobile app.

---

## Features

* 📸 **Collaborative Rolls** — Create photo rolls and invite friends to contribute
* 👥 **Social Profiles** — Follow other users and discover their photography
* 📰 **Social Feed** — See activity and photos from people you follow
* ❤️ **Likes & Comments** — Interact with photos and rolls
* 💬 **Messaging** — Communicate with other users within the app
* 🔔 **Notifications** — Stay updated on interactions and activity
* 🔒 **Privacy Controls** — Control who can view and contribute to rolls
* 📱 **Cross-Platform** — Built for both iOS and Android

---

## Built With

* **React Native** — Cross-platform mobile application
* **TypeScript / JavaScript** — Application development
* **Supabase** — Backend infrastructure
* **PostgreSQL** — Application database
* **Supabase Auth** — Authentication and account management
* **Supabase Storage** — Photo and media storage
* **iOS & Android** — Native mobile deployment

---

## Product & Development

Rolls is an independently developed product spanning product strategy, UX, mobile development, backend architecture, and social functionality.

The project includes systems for:

* User authentication and account management
* User profiles and social relationships
* Collaborative photo rolls
* Photo capture, storage, and retrieval
* Likes and comments
* Messaging
* Notifications
* Public and private content
* Database permissions and access controls
* Deep linking and password recovery

The product continues to evolve as new social photography and collaborative experiences are developed and tested.

---

## How Rolls Works

### 1. Create a Roll

Start a new roll around a trip, event, group of friends, or everyday experience.

### 2. Invite Friends

Multiple people can contribute photos to the same roll.

### 3. Capture the Experience

Photos become part of the shared roll rather than isolated posts.

### 4. Experience It Together

Rolls become collections of moments captured from multiple perspectives.

---

## Project Structure

```text
Rolls_App/
├── android/          # Android application
├── ios/              # iOS application
├── src/              # Application source
├── supabase/         # Supabase/backend configuration
├── docs/             # Development and project documentation
├── scripts/          # Development utilities
├── README.md
└── package.json
```

Additional technical and implementation documentation can be found in [`/docs`](./docs).

---

## Local Development

### Requirements

* Node.js 20+
* npm
* Xcode for iOS development
* Android Studio for Android development
* A Supabase project

### Installation

Clone the repository:

```bash
git clone https://github.com/andrewpbaldwinii/Rolls_App.git
cd Rolls_App
```

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Add your Supabase project configuration:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

The `.env` file is excluded from Git and should not be committed.

Start the development server:

```bash
npm start
```

Run the application:

```bash
npm run ios
```

or:

```bash
npm run android
```

Additional setup instructions are available in [`/docs/setup`](./docs/setup).

---

## Security

Sensitive credentials and production secrets should never be committed to the repository.

The application uses environment variables for configuration and Supabase security controls for backend access.

See [`SECURITY.md`](./SECURITY.md) for additional security and pre-production considerations.

---

## Status

🚧 **Active Development**

Rolls is currently under active development. Features, architecture, and user experiences may change as the product continues to evolve.

---

## About the Project

Rolls started with a simple question:

**What would a disposable camera feel like if it were designed as a social app today?**

The project explores a different approach to social photography—one centered around shared experiences and collections of moments rather than individual posts, follower counts, and constant content optimization.

---

**Built by Andrew Baldwin**
