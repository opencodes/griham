# Run Forever
```
pm2 start npm --name "my-app" -- run dev
```
Great — since you already have **PM2 installed** and your app runs with:

```bash
npm run dev
npm run dev -- --host 0.0.0.0
cd /codebase/griham/frontend$ 
$ pm2 start npm --name "griham-ui" -- run dev -- --host
```

you can run it with PM2 like this 👇

---

## ✅ Run `npm run dev` with PM2

```bash
pm2 start npm --name "my-app" -- run dev
```

👉 Breakdown:

* `pm2 start npm` → tells PM2 to run npm
* `--name "my-app"` → your app name in PM2
* `-- run dev` → runs `npm run dev`

---

## 🔍 Check Status

```bash
pm2 list
```

---

## 📜 View Logs (very useful)

```bash
pm2 logs my-app
```

---

## 🔄 Restart / Stop

```bash
pm2 restart my-app
pm2 stop my-app
```

---

## 💾 Save for Auto Restart (VERY IMPORTANT)

```bash
pm2 save
pm2 startup
```

---

## ⚠️ Important Note (About `dev` mode)

Most `npm run dev` scripts use:

* `nodemon`
* hot reload
* development configs

👉 This is **NOT recommended for production**

---

## 🚀 Better (Production Way)

Check your `package.json`:

If you have:

```json
"scripts": {
  "start": "node app.js",
  "dev": "nodemon app.js"
}
```

👉 Then use:

```bash
pm2 start npm --name "my-app" -- start
```

---

## 🔥 Pro Setup (Best Practice)

If your entry file is `app.js`:

```bash
pm2 start app.js --name my-app
```

---

## 🧠 Tip (If using Next.js / Vite / React backend)

Tell me your stack (Next.js / Express / NestJS / Vite etc.), I’ll give you the **exact production-grade PM2 setup** 🚀
