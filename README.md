# DSA Tracker (MERN)

A full-stack tracker for the **NeetCode 150 + Striver Master DSA** list (269 unique problems, 17 patterns), built from your Excel sheet.

**Features**
- Sign up / log in (JWT + bcrypt). Login with username or email.
- Tick problems as solved. Dashboard, tracker and friends views all update instantly.
- Private notes per problem.
- Filter by pattern, list (NeetCode / Striver / shared), status, and search problem titles or your notes.
- Friends, like in games: search a username, send a request, they accept. Friends can see **only your progress** (solved problems, never your notes). Friends leaderboard included.
- Dark (but soft) theme, responsive for mobile.

**Stack:** MongoDB Atlas (free) · Express · React (Vite) · Node.

---

## 1. Create a free MongoDB database (Atlas)

1. Sign up at https://www.mongodb.com/cloud/atlas/register and create a free **M0** cluster.
2. **Database Access** -> Add a user (username + password). Remember them.
3. **Network Access** -> Add IP address -> **Allow access from anywhere** (`0.0.0.0/0`). Needed for hosting later.
4. **Database** -> Connect -> Drivers -> copy the connection string. It looks like  
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/`  
   Add the database name before the `?`:  
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/dsa-tracker?retryWrites=true&w=majority`  
   (If your password has special characters like `@` or `#`, URL-encode them.)

## 2. Run locally

```bash
cd dsa-tracker
npm run setup                          # installs root, server and client dependencies
cp server/.env.example server/.env     # then edit server/.env
npm run dev
```

In `server/.env` set `MONGODB_URI` (from step 1) and `JWT_SECRET` (any long random string).

- App: http://localhost:5173
- API: http://localhost:5000

The 269 questions are loaded into MongoDB automatically the first time the server starts (safe to restart; it never touches user progress). You can also run `npm run seed`.

## 3. Deploy on Vercel (two projects: API + website)

Push the repo to GitHub, then create **two** Vercel projects from the same repo.

**Backend (API)** - Root Directory `server`, Framework "Other". Environment variables: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (the frontend URL, no trailing slash). `server/vercel.json` and `server/api/index.js` already wire Express to Vercel.

**Frontend** - Root Directory `client`, Framework "Vite". Environment variable: `VITE_API_URL` = `https://<your-api>.vercel.app/api`. `client/vercel.json` already handles page refreshes on routes like `/tracker`.

Deploy the backend first, then the frontend, then set `CLIENT_URL` on the backend and redeploy it. In Atlas -> Network Access, allow `0.0.0.0/0`.

*Alternative:* one service on Render (build `npm run build`, start `npm start`, env `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`). Express serves the built React app itself.

---

## Project structure

```
server/
  app.js               Express app (no listen). server.js runs it locally, api/index.js on Vercel
  config/db.js         MongoDB connection
  models/              User, Question, Progress, Friendship
  routes/auth.js       register, login, me
  routes/tracker.js    GET questions+progress, PATCH done/note
  routes/friends.js    search, request, accept, remove, friend progress
  scripts/seedQuestions.js  upserts questions from data/questions.json
  data/questions.json  Your Excel sheet converted to JSON
client/
  src/context/         Auth, Tracker (shared progress state), Toasts
  src/pages/           Auth, Dashboard, Tracker, Friends, FriendProfile
```

## API summary

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Create account / log in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/tracker` | All questions + your done/notes |
| PATCH | `/api/tracker/:id` | `{ done?, note? }` |
| GET | `/api/friends/search?q=` | Find users by username prefix |
| POST | `/api/friends/request` | `{ username }` send request (auto-accepts if they already asked you) |
| GET | `/api/friends` | Friends, leaderboard data, incoming and outgoing requests |
| POST | `/api/friends/:id/accept` | Accept a request |
| DELETE | `/api/friends/:id` | Decline, cancel or unfriend |
| GET | `/api/friends/:username/progress` | A friend's progress (friends only, no notes) |

## Editing the question list

Edit `server/data/questions.json` and restart the server. Questions are matched by `number`, so existing progress is kept.
