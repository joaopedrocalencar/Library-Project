const express = require("express");
const exphbs = require("express-handlebars");
const fs = require("fs");
const path = require("path");
const session = require('express-session');


const app = express();
const HTTP_PORT = process.env.PORT || 3000;

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 180000 }, //3 minutes
}))

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.engine("hbs", exphbs.engine({ extname: ".hbs", defaultLayout: "main" }));
app.set("view engine", "hbs");


app.get("/", (req, res) => {
  res.render("landing");
});

app.get("/signin", (req, res) => {
  res.render("signin", { error: "" });
});

app.post("/signin", (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, "users.json")));
  if (!users[username]) {
    return res.render("signin", { error: "Not a registered username" });
  }

  if (users[username] !== password) {
    return res.render("signin", { error: "Invalid password" });
  }

  req.session.user = username;
  res.redirect("/home");
});

app.get("/home", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  res.render("home", {
    user: req.session.user,
    books: [
      "The Hobbit",
      "Don Quixote",
      "The Little Prince",
      "The Great Gatsby",
      "To Kill a Mockingbird",
      "The Lord of the Rings",
      "One Hundred Years of Solitude",
      "The Catcher in the Rye",
      "Pride and Prejudice",
      "The Alchemist",
      "The Lord of The Flies",
      "A Tale of Two Cities",
    ],
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
