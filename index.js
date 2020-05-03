const express = require("express");
const app = express();
const db = require("./utils/db");
const hb = require("express-handlebars");
const { hash, compare } = require("./utils/bcrypt.js");
const cookieSession = require("cookie-session");
const csurf = require("csurf");

let sessionSecret;
if (process.env.SESSION_SECRET) {
    sessionSecret = process.env.SESSION_SECRET;
} else {
    sessionSecret = require("./secrets").SESSION_SECRET;
}

app.use(
    cookieSession({
        secret: sessionSecret,
        maxAge: 1000 * 60 * 60 * 24 * 14,
    })
);

// configure express to use express-hb
app.engine("handlebars", hb());
app.set("view engine", "handlebars");

/// middleware
app.use(
    express.urlencoded({
        extended: false,
    })
);

//csurf always AFTER urlencoded and cookie-session
app.use(csurf());

app.use(express.static("./public"));

app.use((req, res, next) => {
    // deny framing this page:
    res.set("x-frame-options", "DENY");
    //make every request have a csrfToken: (*)
    res.locals.csrfToken = req.csrfToken();
    next();
});

const requireLoggedOutUser = (req, res, next) => {
    if (req.session.userId) {
        res.redirect("/petition");
    } else {
        next();
    }
};

const requireLoggedInUser = (req, res, next) => {
    if (!req.session.userId) {
        res.redirect("/login");
    } else {
        next();
    }
};

const requireSignature = (req, res, next) => {
    if (!req.session.signed) {
        res.redirect("/petition");
    } else {
        next();
    }
};

const requireNoSignature = (req, res, next) => {
    if (req.session.signed) {
        res.redirect("/petition/signed");
    } else {
        next();
    }
};

const requireComingFromRegister = (req, res, next) => {
    if (req.headers.referer == undefined) {
        res.redirect("/profile/edit");
    } else {
        next();
    }
};

app.get("/", requireLoggedOutUser, requireNoSignature, (req, res) => {
    res.render("welcome", {
        layout: "main",
    });
});

app.get("/petition", requireLoggedInUser, requireNoSignature, (req, res) => {
    res.render("home", {
        layout: "main",
    });
});

app.post("/petition", requireLoggedInUser, requireNoSignature, (req, res) => {
    db.submitSignature(req.session.userId, req.body.signature)
        .then(() => {
            // set cookie
            req.session.signed = true;
            res.redirect("/petition/signed");
        })
        .catch((err) => {
            console.log("error in submitsignature: ", err);
            res.render("home", {
                layout: "main",
                error: true,
            });
        });
});

app.post(
    "/petition/signed",
    requireLoggedInUser,
    requireSignature,
    (req, res) => {
        db.deleteSign(req.session.userId)
            .then(() => {
                req.session.signed = false;
                res.redirect("/petition");
            })
            .catch((e) => {
                console.log("error in deleteSign: ", e);
                res.render("thank-you", {
                    layout: "main",
                    error: true,
                });
            });
    }
);

app.get("/register", requireLoggedOutUser, (req, res) => {
    res.render("registration", {
        layout: "main",
    });
});

app.post("/register", requireLoggedOutUser, (req, res) => {
    hash(req.body.pass)
        .then((hashedPw) => {
            db.insertNewUser(
                req.body.first,
                req.body.last,
                req.body.email,
                hashedPw
            )
                .then((result) => {
                    // set cookie
                    req.session.userId = result.rows[0].id;
                    res.redirect("/profile");
                })
                .catch((e) => {
                    console.log("error in creating new user:", e);
                    res.render("registration", {
                        layout: "main",
                        error: true,
                    });
                });
        })
        .catch((e) => {
            console.log("error in post register hash:", e);
            res.render("registration", {
                layout: "main",
                error: true,
            });
        });
});

app.get(
    "/profile",
    requireLoggedInUser,
    requireComingFromRegister,
    (req, res) => {
        if (req.session.userId) {
            res.render("profile", {
                layout: "main",
            });
        } else {
            res.redirect("/register");
        }
    }
);

app.post(
    "/profile",
    requireLoggedInUser,
    requireComingFromRegister,
    (req, res) => {
        if (req.body.url && !req.body.url.startsWith("http" || "https")) {
            res.render("profile", {
                layout: "main",
                urlError: true,
            });
        } else {
            db.submitProfile(
                req.body.age,
                req.body.city,
                req.body.url,
                req.session.userId
            )
                .then(() => {
                    res.redirect("/petition");
                })
                .catch((e) => {
                    console.log("error in submitProfile: ", e);
                    res.render("profile", {
                        layout: "main",
                        error: true,
                    });
                });
        }
    }
);

app.get("/profile/edit", requireLoggedInUser, (req, res) => {
    db.getProfile(req.session.userId)
        .then((result) => {
            res.render("edit-profile", {
                layout: "main",
                userProfile: result.rows[0],
            });
        })
        .catch((e) => {
            console.log("error in getProfile: ", e);
            res.render("edit-profile", {
                layout: "main",
                error: true,
            });
        });
});

app.post("/profile/edit", requireLoggedInUser, (req, res) => {
    if (req.body.url && !req.body.url.startsWith("http" || "https")) {
        db.getProfile(req.session.userId)
            .then((result) => {
                res.render("edit-profile", {
                    layout: "main",
                    urlError: true,
                    userProfile: result.rows[0],
                });
            })
            .catch((e) => {
                console.log("error in getProfile: ", e);
                res.render("edit-profile", {
                    layout: "main",
                    error: true,
                });
            });
    } else if (req.body.pass == "") {
        db.updateUserNoPw(
            req.body.first,
            req.body.last,
            req.body.email,
            req.session.userId
        ).then(() => {
            db.updateProfile(
                req.body.age,
                req.body.city,
                req.body.url,
                req.session.userId
            )
                .then(() => {
                    res.render("edit-profile", {
                        layout: "main",
                        success: true,
                    });
                })
                .catch((e) => {
                    console.log("error from updateProfile: ", e);
                    res.render("edit-profile", {
                        layout: "main",
                        reloadError: true,
                    });
                })
                .catch((e) => {
                    console.log("error from updateUserNoPw: ", e);
                    res.render("edit-profile", {
                        layout: "main",
                        reloadError: true,
                    });
                });
        });
    } else {
        console.log("new pass in input");
        hash(req.body.pass)
            .then((hashedPw) => {
                db.updateUser(
                    req.body.first,
                    req.body.last,
                    req.body.email,
                    hashedPw,
                    req.session.userId
                )
                    .then(() => {
                        db.updateProfile(
                            req.body.age,
                            req.body.city,
                            req.body.url,
                            req.session.userId
                        )
                            .then(() => {
                                res.redirect("/profile/edit");
                            })
                            .catch((e) => {
                                console.log("error in updateProfile: ", e);
                                res.render("edit-profile", {
                                    layout: "main",
                                    reloadError: true,
                                });
                            });
                    })
                    .catch((e) => {
                        console.log("error in updateUser: ", e);
                        res.render("edit-profile", {
                            layout: "main",
                            reloadError: true,
                        });
                    });
            })
            .catch((e) => {
                console.log("error in hash - profile edit: ", e);
                res.render("edit-profile", {
                    layout: "main",
                    reloadError: true,
                });
            });
    }
});

app.get("/login", requireLoggedOutUser, (req, res) => {
    res.render("login", {
        layout: "main",
    });
});

app.post("/login", requireLoggedOutUser, (req, res) => {
    db.getHashedPw(req.body.email)
        .then((results) => {
            compare(req.body.pass, results.rows[0].pass).then((matchValue) => {
                if (matchValue) {
                    // set cookie
                    req.session.userId = results.rows[0].id;
                    // get signature id
                    db.getSignature(req.session.userId)
                        .then((result) => {
                            if (result.rows[0] != undefined) {
                                req.session.signed = true;
                            } else {
                                req.session.signed = false;
                            }
                            res.redirect("/petition");
                        })
                        .catch((e) => {
                            console.log("error in catch login post", e);
                        });
                } else {
                    res.render("login", {
                        layout: "main",
                        error: true,
                    });
                }
            });
        })
        .catch((e) => {
            console.log("error comparing passwords:", e);
            // render error msg
            res.render("login", {
                layout: "main",
                error: true,
            });
        })
        .catch((e) => {
            console.log("error in getting password from db:", e);
            // render error msg
            res.render("login", {
                layout: "main",
                error: true,
            });
        });
});

app.get(
    "/petition/signed",
    requireLoggedInUser,
    requireSignature,
    (req, res) => {
        db.getSigners()
            .then((result) => {
                let signersLength = result.rows.length;
                db.getSignature(req.session.userId)
                    .then((result) => {
                        let sign = result.rows[0].signature;
                        res.render("thank-you", {
                            layout: "main",
                            signersLength,
                            sign,
                        });
                    })
                    .catch((e) => {
                        console.log("error in get signature: ", e);
                    });
            })
            .catch((err) => {
                console.log("error in getsigners: ", err);
            });
    }
);

app.get(
    "/petition/signers",
    requireLoggedInUser,
    requireSignature,
    (req, res) => {
        db.getSigners()
            .then((result) => {
                let signersArr = result.rows;
                res.render("signers", {
                    layout: "main",
                    signersArr,
                    helpers: {
                        cutTimeStr(str) {
                            str += "";
                            return str.substr(0, 21);
                        },
                    },
                });
            })
            .catch((err) => {
                console.log("error in getsigners: ", err);
            });
    }
);

app.get(
    "/petition/signers/:city",
    requireLoggedInUser,
    requireSignature,
    (req, res) => {
        db.getSignersByCity(req.params.city)
            .then((result) => {
                let signersArr = result.rows;
                res.render("signers", {
                    layout: "main",
                    signersArr,
                    city: req.params.city,
                    helpers: {
                        cutTimeStr(str) {
                            str += "";
                            return str.substr(0, 21);
                        },
                    },
                });
            })
            .catch((e) => {
                console.log("error in getSignersByCity: ", e);
            });
    }
);

app.get("/logout", requireLoggedInUser, (req, res) => {
    req.session = null;
    res.redirect("/");
});

app.listen(process.env.PORT || 8080, () => {
    console.log("petition server running...");
});
