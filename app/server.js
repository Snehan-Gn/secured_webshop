require("dotenv").config({ path: "../.env" });

const express = require("express");
const path = require("path");
const https = require("https");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

app.use(express.static(path.join(__dirname, "public")));

const authRoute = require("./routes/Auth");
const profileRoute = require("./routes/Profile");
const adminRoute = require("./routes/Admin");

app.use("/api/auth", authRoute);
app.use("/api/profile", profileRoute);
app.use("/api/admin", adminRoute);

const homeRoute = require("./routes/Home");
const userRoute = require("./routes/User");

app.use("/", homeRoute);
app.use("/user", userRoute);

app.get("/login", (_req, res) =>
  res.sendFile(path.join(__dirname, "views", "login.html")),
);
app.get("/register", (_req, res) =>
  res.sendFile(path.join(__dirname, "views", "register.html")),
);
app.get("/profile", (_req, res) =>
  res.sendFile(path.join(__dirname, "views", "profile.html")),
);
app.get("/admin", (_req, res) =>
  res.sendFile(path.join(__dirname, "views", "admin.html")),
);

const PORT = process.env.PORT || 8080;
const keyPath = path.join(__dirname, "server.key");
const certPath = path.join(__dirname, "server.cert");

function loadSslOptions() {
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error("Certificats HTTPS introuvables (server.key, server.cert dans app/).");
    console.error("Générez-les avec openssl depuis le dossier app/ (voir README).");
    process.exit(1);
  }
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

const sslOptions = loadSslOptions();

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Serveur HTTPS démarré sur https://localhost:${PORT}`);
});
