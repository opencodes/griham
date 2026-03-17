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

pm2 list
pm2 logs my-app
pm2 restart my-app
pm2 stop my-app
pm2 save
pm2 startup
