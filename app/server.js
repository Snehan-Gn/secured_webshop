require('dotenv').config({ path: '../.env' });

const express = require("express");
const path = require("path");
const https = require("https"); // AJOUT : Module natif HTTPS
const fs = require("fs");       // AJOUT : Pour lire tes fichiers de certificat

const app = express();

// Middleware pour parser le corps des requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// --- Routes API ---
const authRoute    = require("./routes/Auth");
const profileRoute = require("./routes/Profile");
const adminRoute   = require("./routes/Admin");

app.use("/api/auth",    authRoute);
app.use("/api/profile", profileRoute);
app.use("/api/admin",   adminRoute);

// --- Routes pages ---
const homeRoute = require("./routes/Home");
const userRoute = require("./routes/User");

app.use("/", homeRoute);
app.use("/user", userRoute);

app.get("/login",    (_req, res) => res.sendFile(path.join(__dirname, "views", "login.html")));
app.get("/register", (_req, res) => res.sendFile(path.join(__dirname, "views", "register.html")));
app.get("/profile",  (_req, res) => res.sendFile(path.join(__dirname, "views", "profile.html")));
app.get("/admin",    (_req, res) => res.sendFile(path.join(__dirname, "views", "admin.html")));

app.get("/test",     (_req, res) => res.send("db admin: root, pwd : root"));

// ---------------------------------------------------------------
// CONFIGURATION HTTPS
// ---------------------------------------------------------------

const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, "server.key")),
    cert: fs.readFileSync(path.join(__dirname, "server.cert"))
};

const PORT = 8080; 
https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`✅ Serveur sécurisé démarré sur https://localhost:${PORT}`);
});