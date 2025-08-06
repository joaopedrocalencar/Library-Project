const express = require("express");
const exphbs = require("express-handlebars");
const fs = require("fs");
const path = require("path");
const session = require('express-session');
const randomstring = require("randomstring");
const connectDB = require('./db');
const RedisStore = require("connect-redis")(session);
const Redis = require("ioredis");
const borrowReturnRoutes = require("./borrowReturn")


require('dotenv').config();

const HTTP_PORT = process.env.PORT || 3000;
const app = express();
const sessionSecret = process.env.SESSION_SECRET;

redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

const redisStore = new RedisStore({
  client: redisClient,
  prefix: "redisLibrary",
});

app.use(session({
  store: redisStore,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 180000, //3 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.engine("hbs", exphbs.engine({
  extname: ".hbs",
  defaultLayout: "main",
  partialsDir: path.join(__dirname, "views", "partials")
}));

app.set("view engine", "hbs");

function checkUser(req, res, next) {
  if (!req.session.user) {
    if (req.session.wasLoggedIn) {
      return res.redirect("/signin?expired=true");
    } else {
      return res.redirect("/");
    }
  }
  next();
}

borrowReturnRoutes(app, checkUser);

app.get("/", (req, res) => {
  res.render("landing");
});

app.get("/signin", (req, res) => {
  res.render("signin", { error: "" });
});

app.post("/signin", async (req, res) => {
  const { username, password } = req.body;

  const usersPath = path.resolve(__dirname, "users.json");
  const users = JSON.parse(fs.readFileSync(usersPath));

  if (!users[username]) {
    return res.render("signin", { error: "Not a registered username" });
  }

  if (users[username].password !== password) {
    return res.render("signin", { error: "Invalid password" });
  }

  const db = await connectDB();
  const client = await db.collection("clients").findOne({ Username: username });

  if (!client) {
    return res.render("signin", { error: "Email not found in database" })
  }

  req.session.user = username;
  req.session.wasLoggedIn = true;

  res.redirect("/home");
});



app.get("/home", checkUser, async (req, res) => {
  const db = await connectDB();
  const books = await db.collection("books").find().toArray();
  const client = await db.collection("clients").findOne({ Username: req.session.user });

  const borrowedIDByUser = client.IDBooksBorrowed || [];

  const borrowedBooks = books.filter(book => borrowedIDByUser.includes(book._id));

  const booksAvailable = books.filter(book => book.available);


  res.render("home", {
    user: req.session.user,
    availableBooks: booksAvailable.map(book => ({ id: book._id, title: book.title })),
    borrowedBooks: borrowedBooks.map(book => ({ id: book._id, title: book.title }))
  });

});


app.get("/signout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  })
});


/*
if (process.env.NODE_ENV !== 'production') {
  app.listen(HTTP_PORT, () => {
    console.log(`Listening on port ${HTTP_PORT}`);
  });
}
*/

module.exports = app;
