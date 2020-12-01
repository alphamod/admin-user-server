const express = require("express");
const cors = require('cors');
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const mongoURI = require('./db.config');
const authConfig = require("./auth.config");
const UserModel = require('./model/userModel');
const EmailModel = require('./model/emailModel');
const { secret } = require("./auth.config");

const app = express();
const PORT = process.env.PORT || '4000';

mongoose.connect(mongoURI.mongoURI, { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true });

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Authentication middleware
const Authenticate = (req, res, next) => {
    console.log("Authentication");
    // console.log(req.header('x-access-token'));
    let incomingToken = req.header('x-access-token');
    if (!incomingToken) {
        console.log("no token recieved");
        return res.status(403).send({ message: "No token provided" });
    }
    jwt.verify(incomingToken, authConfig.secret, (err, decoded) => {
        console.log(decoded);
        if (decoded !== undefined) {
            req.userID = decoded.id;
            next();
        } else {
            res.status(401).send({ message: "Unauthorized Request" });
        }
    });
}

// register
app.post("/register", (req, res) => {
    const { email, password } = req.body;
    console.log('---------------------Req body---------\n\n')
    console.log(req.body);
    console.log('---------------------Req---------\n\n')
    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            console.log(err);
        } else {
            bcrypt.hash(password, salt, (err, hash) => {
                if (err) {
                    res.status(500).send({ message: "something went wrong at our end." });
                } else {
                    const userModel = new UserModel({
                        email, hash
                    });
                    userModel.save((err, data) => {
                        if (err) {
                            if (err.code === 11000) {
                                res.status(400).send({ message: "Email already registered!" });
                            }
                        } else {
                            console.log(data);
                            res.send({ message: "User successfully registered! You can login now." })
                        }
                    });
                }
            });
        }
    });
});
// login
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    console.log(req.body)
    UserModel.findOne({ email }, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            if (result != null) {
                const { email, hash, role, _id, isActive } = result;
                console.log(result);
                if (isActive) {
                    bcrypt.compare(password, hash, (err, isValidPass) => {
                        console.log(isValidPass);
                        if (err) {
                            console.log(err);
                        } else {
                            if (isValidPass) {
                                const accessToken = jwt.sign({ id: _id }, secret, { expiresIn: '1h' });
                                res.status(200).send({ email, _id, accessToken, role, isActive });
                            } else {
                                res.status(401).send({ message: "Invalid password" })
                            }
                        }
                    });
                } else {
                    res.status(403).send({ message: "Deactivated User! Contact admin to Activate." });
                }
            } else {
                res.status(404).send({ message: "User not found" });
            }
        }
    });
});

// admin dashboard pagination
app.get("/admin/pagination/:page", Authenticate, (req, res) => {
    console.log("pagination runs");
    if (req.userID !== "5fc293b49967002bec497518") {
        res.status(401).send({ message: "Unauthorized Request" });
    } else {   
        const skipUsers = (parseInt(req.params.page)-1)*10;
        UserModel.find({ _id: { $ne: req.userID } }, null, { skip: skipUsers, limit: 10 }, (err, dbResponse) => {
            if (err) {
                console.log(err);
            } else {   
                console.log(dbResponse);
                res.status(200).send(dbResponse);
            }
        })
    }
})

// activating & deactivating users
app.get("/user/user-activation/:userId/:activate", Authenticate, (req, res) => {
    console.log("activationAPI");
    const { activate, userId } = req.params;
    const activateBool = (activate === "true");
    console.log(`Activate: ${activate}`);
    UserModel.findByIdAndUpdate({_id:userId}, { isActive: !activateBool }, (err, response) => {
        if (err) {
            console.log(err);
        } else {
            console.log("\n\n======active state response==\n\n")
            console.log(response.isActive);
            console.log(response);
            if (!response.isActive) {
                res.send({ message: `User ${response.email} is successfully activated`, newActive:!response.isActive });
            } else {
                res.send({ message: `User ${response.email} is successfully deactivated`, newActive:!response.isActive });
            }
        }
    });
});

// email notification
app.post("/user/email-notify/:userId", Authenticate, (req, res) => {
    const { toContacts, fromUser } = req.body;
    console.log("email notification")
    const mail = {
        from: fromUser,
        to: toContacts,
        subject: "MERN Admin User App",
        html: "<h1>Greetings From MERN App</h1><br><br><h5>This is an email notification from MERN Admin-User App</h5><br><p>Regards,<br>MERN App Team</p>"
    };

    const mailer = nodemailer.createTransport(authConfig.mailSender);
    mailer.sendMail(mail, (err, info) => {
        if (err) {
            console.log(err);
        } else {
            console.log(info);
            const emailModel = new EmailModel({
                from: req.params.userId,
                to: toContacts,
                sentOn: Date.now()
            });
            emailModel.save((err, data) => {
                if (err) {
                    console.log(err);
                } else {

                    console.log(data);
                    res.status(200).send({ message: "Email sent Successfully! Refresh Page to send more emails." });
                }
            });
        }
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
