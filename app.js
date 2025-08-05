const express = require("express");
const exphbs = require("express-handlebars");
const fs = require("fs");
const path = require("path");
const session = require('express-session');
const randomstring = require("randomstring");
const connectDB = require('./db');
const RedisStore = require("connect-redis").RedisStore;
const Redis = require("ioredis");
const borrowReturnRoutes = require("./borrowReturn")



require('dotenv').config();
const HTTP_PORT = process.env.PORT || 3000;

const app = express();

borrowReturnRoutes(app, checkUser);

const sessionSecret = process.env.SESSION_SECRET || (() => {
  randomstring.generate();
  console.log("Couldn't connect to redis, using randomstring generator for session secret");
})();

redisClient = new Redis(process.env.REDIS_URL);

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
}))

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


app.get("/", (req, res) => {
  res.render("landing");
});

app.get("/signin", (req, res) => {
  res.render("signin", { error: "" });
});

app.post("/signin", async (req, res) => {
  const { username, password } = req.body;

  const usersPath = path.join(__dirname, "users.json");
  const users = JSON.parse(fs.readFileSync(usersPath));

  if (!users[username]) {
    return res.render("signin", { error: "Not a registered username" });
  }

  if (users[username].password !== password) {
    return res.render("signin", { error: "Invalid password" });
  }

  const db = await connectDB();
  const client = await db.collection("clients").findOne({ username });

  if (!client) {
    return res.render("signin", { error: "Email not found in database" })
  }

  req.session.user = username;
  req.session.wasLoggedIn = true;

  res.redirect("/home");
});

//mongodb books and users testing
app.get('/books', async (req, res) => {
  const db = await connectDB();
  const books = await db.collection('books').find().toArray();
  res.json(books);
});
app.get('/users', async (req, res) => {
  const db = await connectDB();
  const users = await db.collection('users').find().toArray();
  res.json(users);
})

app.get("/home", checkUser, (req, res) => {
  const books = JSON.parse(fs.readFileSync(path.join(__dirname, "books.json")));
  const booksAvailable = books.filter(book => book.available);
  const borrowedBooks = books.filter(book => !book.available && req.session.borrowedBooks.includes(book.title)
  );

  res.render("home", {
    user: req.session.user,
    availableBooks: booksAvailable.map(book => book.title),
    borrowedBooks: borrowedBooks.map(book => book.title)
  });

});


app.get("/signout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  })
});

app.listen(HTTP_PORT, () => {
  console.log(`Listening on port ${HTTP_PORT}`);
});
