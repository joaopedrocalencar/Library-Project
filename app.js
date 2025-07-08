const express = require("express");
const exphbs = require("express-handlebars");
const fs = require("fs");
const path = require("path");
const session = require('express-session');
const randomstring = require("randomstring");


const app = express();
const HTTP_PORT = process.env.PORT || 3000;



app.use(session({
  secret: randomstring.generate(),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 180000 }, //3 minutes
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
    return res.redirect("/signin");
  }
  next();
};

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
  req.session.borrowedBooks = [];
  res.redirect("/home");
});

app.get("/home", checkUser, (req, res) => {
  const books = JSON.parse(fs.readFileSync(path.join(__dirname, "books.json")));


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

app.post("/borrow", checkUser, (req, res) => {
  const selectedBooks = req.body.books;
  if (!selectedBooks) return res.redirect("/home");

  const booksData = JSON.parse(fs.readFileSync(path.join(__dirname, "books.json")));

  const updatedBooks = booksData.map(book => {
    const isSelected = Array.isArray(selectedBooks)
      ? selectedBooks.includes(book.title)
      : selectedBooks === book.title;

    if (isSelected) {
      book.available = false;

      if (!req.session.borrowedBooks.includes(book.title)) {
        req.session.borrowedBooks.push(book.title);
      }
    }

    return book;
  });

  fs.writeFileSync(
    path.join(__dirname, "books.json"),
    JSON.stringify(updatedBooks, null, 2)
  );

  res.redirect("/home");
});


app.get("/signout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  })
});

app.listen(HTTP_PORT, () => {
  console.log(`Listening on port ${HTTP_PORT}`);
});
