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

app.post("/signin", (req, res) => {
  const { username, password } = req.body;
  const usersPath = path.join(__dirname, "users.json");
  const users = JSON.parse(fs.readFileSync(usersPath));

  if (!users[username]) {
    return res.render("signin", { error: "Not a registered username" });
  }

  if (users[username].password !== password) {
    return res.render("signin", { error: "Invalid password" });
  }

  req.session.user = username;
  req.session.wasLoggedIn = true;
  req.session.borrowedBooks = users[username].borrowedBooks || [];

  res.redirect("/home");
});

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

app.post("/borrow", checkUser, (req, res) => {
  const selectedBooks = req.body.books;
  if (!selectedBooks) return res.redirect("/home");

  const booksPath = path.join(__dirname, "books.json");
  const usersPath = path.join(__dirname, "users.json");

  const books = JSON.parse(fs.readFileSync(booksPath));
  const users = JSON.parse(fs.readFileSync(usersPath));
  const username = req.session.user;

  const selected = Array.isArray(selectedBooks) ? selectedBooks : [selectedBooks];

  // Ensure user has a borrowedBooks array
  if (!Array.isArray(users[username].borrowedBooks)) {
    users[username].borrowedBooks = [];
  }

  const updatedBooks = books.map(book => {
    if (selected.includes(book.title) && book.available) {
      book.available = false;
      if (!users[username].borrowedBooks.includes(book.title)) {
        users[username].borrowedBooks.push(book.title);
      }
    }
    return book;
  });

  req.session.borrowedBooks = users[username].borrowedBooks;
  fs.writeFileSync(booksPath, JSON.stringify(updatedBooks, null, 2));
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

  res.redirect("/home");
});


app.post("/return", checkUser, (req, res) => {
  const selectedBooks = req.body.books;
  if (!selectedBooks) return res.redirect("/home");

  const booksPath = path.join(__dirname, "books.json");
  const usersPath = path.join(__dirname, "users.json");

  const books = JSON.parse(fs.readFileSync(booksPath));
  const users = JSON.parse(fs.readFileSync(usersPath));
  const username = req.session.user;

  const selected = Array.isArray(selectedBooks) ? selectedBooks : [selectedBooks];

  if (!Array.isArray(users[username].borrowedBooks)) {
    users[username].borrowedBooks = [];
  }

  const updatedBooks = books.map(book => {
    if (selected.includes(book.title)) {
      book.available = true;
      users[username].borrowedBooks = users[username].borrowedBooks.filter(
        title => title !== book.title
      );
    }
    return book;
  });

  req.session.borrowedBooks = users[username].borrowedBooks;
  fs.writeFileSync(booksPath, JSON.stringify(updatedBooks, null, 2));
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

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
