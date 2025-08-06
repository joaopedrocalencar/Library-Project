const connectDB = require("./db");
module.exports = function borrowReturnRoutes(app, checkUser) {
    app.post("/borrow", checkUser, async (req, res) => {
        const selectedBooks = req.body.books;
        if (!selectedBooks) return res.redirect("/home");
        const db = await connectDB();
        const booksCollection = await db.collection("books");
        const clientsCollection = await db.collection("clients");
        const username = req.session.user;

        const selected = Array.isArray(selectedBooks) ? selectedBooks.map(Number) : [Number(selectedBooks)];

        //turn borrowed book unavailable
        await booksCollection.updateMany(
            { _id: { $in: selected }, available: true },
            { $set: { available: false } }
        );

        //add book to the array of borrowed books
        await clientsCollection.updateOne(
            { Username: username },
            { $addToSet: { IDBooksBorrowed: { $each: selected } } }
        );

        res.redirect("/home");
    });


    app.post("/return", checkUser, async (req, res) => {
        const selectedBooks = req.body.books;
        if (!selectedBooks) return res.redirect("/home");

        const db = await connectDB();
        const booksCollection = await db.collection("books");
        const clientsCollection = await db.collection("clients");

        const username = req.session.user;
        const client = await clientsCollection.findOne({ Username: username });

        const selected = Array.isArray(selectedBooks) ? selectedBooks.map(Number) : [Number(selectedBooks)];


        //turn available returned books
        await booksCollection.updateMany(
            { _id: { $in: selected } },
            { $set: { available: true } }
        );

        //remove book from the array of borrowed books
        await clientsCollection.updateOne(
            { Username: username },
            { $pull: { IDBooksBorrowed: { $in: selected } } }
        );

        res.redirect("/home");
    });
    console.log("borrowReturn route exported successfully")
}