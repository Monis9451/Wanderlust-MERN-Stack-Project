const express = require("express");
const app = express();
const mongoose = require("mongoose");
const port = 8080;
const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const Listing = require("./models/listing.js")
const Review = require("./models/review.js")
const path = require("path")
const methodOverride = require("method-override")
const ejsMate = require("ejs-mate")
const wrapAsync = require("./utils/wrapAsync.js")
const ExpressError = require("./utils/ExpressError.js")
const {listingSchema, reviewSchema} = require("./schema.js")
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.set("views", path.join(__dirname, "views"));
app.use(methodOverride("_method"));
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")))

async function main(){
    await mongoose.connect(MONGO_URL);
};
main().then(()=>{console.log("Connection successfull")}).catch((err)=>{console.log(`Following error is occurring in connection: ${err}`)});

//List validate function
const validateListing = (req, res, next)=>{
    let {error} = listingSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400, errMsg);
    }else{
        next();
    }
}

//Review validate function
const validateReview = (req, res, next)=>{
    let {error} = reviewSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400, errMsg);
    }else{
        next();
    }
}

//Root
app.get("/", (req, res)=>{
    res.send("Hey, I'm root!");
});

//Index route
app.get("/listing", wrapAsync(async(req, res)=>{
    let allListings = await Listing.find();
    res.render("listing/index", {allListings})
}))

//New route
app.get("/listing/new", (req, res)=>{
    res.render('listing/new.ejs')
})

//Show route
app.get("/listing/:id", wrapAsync(async(req, res)=>{
    let {id} = req.params;
    const listData = await Listing.findById(id).populate("reviews");
    res.render("listing/show",{listData})
}))

//Create route
    app.post("/listing", validateListing, wrapAsync(async(req, res, next)=>{
        await Listing.create(req.body.listing);
        res.redirect("/listing");
    }))

//Edit route
app.get("/listing/:id/edit", wrapAsync(async(req, res)=>{
    let {id} = req.params;
    let data = await Listing.findById(id);
    res.render("listing/edit", {data});
}))

//Update route
app.patch("/listing/:id", wrapAsync(async(req, res)=>{
    let {id} = req.params;
    await Listing.findByIdAndUpdate(id, req.body.listing);
    res.redirect(`/listing/${id}`);
}))

//Delete route
app.delete("/listing/:id", wrapAsync(async(req, res)=>{
    let {id} = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listing");
}))

//Reviews
//Post route
app.post("/listing/:id/reviews", validateReview, wrapAsync(async(req, res)=>{
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();
    res.redirect(`/listing/${req.params.id}`);
}))

//Delete route
app.delete("/listing/:id/reviews/:reviewId", wrapAsync(async(req, res)=>{
    let {id, reviewId} = req.params;
    await Listing.findByIdAndUpdate(id, {$pull:{reviews: reviewId}});
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/listing/${id}`);
}))

app.all("*", (req, res, next)=>{
    next(new ExpressError(404, "Page Not Found"));
})

// Server error handler
app.use((err, req, res, next)=>{
    let {statusCode=500, message="Something went wrong"} = err;
    res.status(statusCode).render("listing/error",{err})
    // res.status(statusCode).send(message);
})

// app.get("/testListing", async(req, res)=>{
//     await Listing.create({
//         title:"My new villa",
//         description:"By the beach",
//         price:1200,
//         location:"Okara, Punjab",
//         country:"Pakistan"
//     })
//     .then((res)=>{console.log(res)})
//     res.send("Testing successfull")
// });'

app.listen(port, ()=>{
    console.log("Port 8080 is listening");
});