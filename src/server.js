require('dotenv').config()
const express = require('express')
const app = express()

const webhook = require("webhook-discord")
const Hook = new webhook.Webhook("url")

var mongoose = require('mongoose')
var User = require('./models/User')
var Announcement = require('./models/Announcement')

var session = require('express-session')
var passport = require('passport')
var DiscordStrategy = require('passport-discord').Strategy

var path = require('path')
const multer = require('multer');
var ejs = require('ejs')
var fs = require('fs')
var chalk = require('chalk')
var noblox = require('noblox.js')
const LogWork = require('./models/LogWork')


var scopes = ['identify'];
const PORT = process.env.PORT || 5001

app.use(express.urlencoded({extended: true}))
app.use(express.json())

try {
    var db = mongoose.connect('dbConnection', {useNewUrlParser: true, dbName: 'staffNetwork'});
    console.log('success connection');
}
catch (error) {
    console.log('Error connection: ' + error);
}

app.use('/_assets_', express.static(path.join(__dirname, 'public')));

passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(id, done) {
    done(null, id);
});
var discordStrat = new DiscordStrategy({
    clientID: "CID",
    clientSecret: "CS",
    callbackURL: "/discord/auth",
    scope: scopes
},
function(accessToken, refreshToken, profile, cb) {
    User.find({ discordId: profile.id }, function(err,user) {
        return cb(err, user);
    })
})
passport.use(discordStrat)

app.use(session({
    secret: 'amogus',
    resave: true,
    saveUninitialized: true
}));


app.set('view engine', 'ejs');

app.use(passport.initialize());
app.use(passport.session());

async function startApp(){
    const currentUser = await noblox.setCookie("ID") 
    console.log(`Logged in as ${currentUser.UserName} [${currentUser.UserID}]`)
    console.log(`Opened on port ${process.env.PORT}`)
}

function checkAuth(requiresRender = true, render = "notReq", hiddenPage = false, neededRank = "0", announcementPage = false, payout = false, logPage = false){
    return function(req, res, next) {
        if(req.isAuthenticated()){
            User.find({ discordId: req.user[0].discordId }, function(err,user) {
                Announcement.find({}, function(err,announcement){
                    LogWork.find({}, function(err, logs){
                        req.logIn(user, async function(error) {
                            if (!error) {
                                console.log('user information updated')
                            }
                            if(requiresRender && announcementPage == false && payout == false && hiddenPage == false){
                                console.log("[FWE Logs] RENDERING1")
                                return res.render(path.join(__dirname, render), { user: user });
                            } else
                            if(requiresRender && announcementPage == true){
                                console.log("[FWE Logs] RENDERING2")
                                return res.render(path.join(__dirname, render), { user: user, announcement: announcement });
                            } else 
                            if(requiresRender && payout){
                                console.log("[FWE Logs] RENDERING3")
                                var groupFunds = await noblox.getGroupFunds("11519763")
                                var getRev = await noblox.getGroupRevenueSummary("11519763", "Year")
                                var robloxUser = await noblox.getUsernameFromId(req.user[0].robloxID)
                                var pendingRobux = getRev.pendingRobux
                                var groupFundsTakeOut = (groupFunds / 4)
    
                                console.log(robloxUser)
    
                                return res.render(path.join(__dirname, render), { user: user, takeableGF: groupFundsTakeOut, groupFunds: groupFunds, pendingRobux: pendingRobux, robloxUser: robloxUser })
                            } else
                            if(hiddenPage && user[0].adminLevel == neededRank && requiresRender && logPage == false){
                                console.log("[FWE Logs] RENDERING4")
                                console.log(user[0].adminLevel)
                                res.render(path.join(__dirname, render), { user: user })
                            } else 
                            if(hiddenPage && user[0].adminLevel !== neededRank && requiresRender == false){
                                console.log("[FWE Logs] RENDERING5")
                                console.log(user[0].adminLevel)
                                return res.redirect('/Network/Home')
                            } else
                            if(hiddenPage && user[0].adminLevel == neededRank && requiresRender && logPage == true){
                                console.log(logs)
                                return res.render(path.join(__dirname, render), { user: user, logs: logs })
                            }
                        });
                    })
                })
            })
            return next();
        } else {
            return res.redirect('/')
        }
    }
}

app.get('/', (req, res) => {
    if(!req.user) {
        res.redirect('/discord/auth')
    } else {
        res.redirect('/Network/Home')
    }
})

app.get('/discord/auth', passport.authenticate('discord', {
    failureRedirect: '/'
}), function(req, res) {
    Hook.info("Panel",`Someone has successfully authenticated into the panel.`)
    res.redirect('/Network/Home') // Successful auth
});

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/Network/Home', checkAuth(true, '/../src/views/Network/Home', false, '0', true), function(req, res) {})
app.get('/Network/Payout', checkAuth(true, '/../src/views/Network/Payout', false, '0', false, true), function(req, res) {})
app.get('/Network/Settings', checkAuth(true, '/../src/views/Network/Settings', false, '0', false, false), function(req, res) {})
app.get('/Network/Store', checkAuth(true, '/../src/views/Network/Store'), function(req, res) {})

app.get('/Admin.Network/Home', checkAuth(true, '/../src/views/Admin.Network/Home', true, 'admin', false), function(req, res) {})
app.get('/Admin.Network/Announce', checkAuth(true, '/../src/views/Admin.Network/Announce', true, 'admin', false), function(req, res) {})
app.get('/Admin.Network/ReadLogs', checkAuth(true, '/../src/views/Admin.Network/ReadLogs', true, 'admin', false, false, true), function(req, res) {})


let upload = multer({ storage: multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads');
    },

    // By default, multer removes file extensions so let's add them back
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
}) })
app.post('/Backend/UpdateSettings', checkAuth(false) && upload.single('avatar'), function(req, res){
    var fileExt = req.file.filename.split(".")
    if(fileExt[1] == "gif"){
        User.find({ discordId: req.user[0].discordId }, function(err,user) {
            console.log(user[0].userLevel)
            if(user[0].userLevel == 0){
                Hook.err("Panel",`Error when dealing with ${req.user[0].username}'s request. They were not high enough level to successfully change their avatar!`)
            // } else {
                let doc = User.updateOne({ discordId: req.user[0].discordId }, { avatar: req.file.filename },
                    function (err, docs) {
                        if (err){
                            Hook.err("Panel",`Error when dealing with ${req.user[0].username}'s request. Details are attached below: ${err}`)
                            console.log(err)
                        }
                        else{
                            Hook.info("Panel",`${req.user[0].username} has changed their profile picture.`)
                        }
                    })
            }
        })
    } else {
        let doc = User.updateOne({ discordId: req.user[0].discordId }, { avatar: req.file.filename },
            function (err, docs) {
                if (err){
                    Hook.err("Panel",`Error when dealing with ${req.user[0].username}'s request. Details are attached below: ${err}`)
                    console.log(err)
                }
                else{
                    Hook.info("Panel",`${req.user[0].username} has changed their profile picture.`)
                }
            })
    }

        return res.redirect('/Network/Home')
})

app.post('/Backend/Purchase', checkAuth(false), async function(req,res){
    var price = req.body.price
    var themeName = req.body.themename
    if(price > req.user[0].fweP){
        res.status(404).send({ error: 'Oops, looks like your balance is insufficient! :(' })
    } else if(req.user[0].currentTheme == themeName) {
        res.status(404).send({ error: 'You already own it!' })
    } else {
        let amountTakeAway = parseInt(req.user[0].fweP) - parseInt(price)
        let stringATA = amountTakeAway.toString()
        let doc = User.updateOne({ discordId: req.user[0].discordId }, { fweP: stringATA, currentTheme: themeName },
            function (err, docs) {
                if (err){
                    Hook.err("Panel",`Error when dealing with ${req.user[0].username}'s request. Details are attached below: ${err}`)
                    console.log(err)
                }
                else{
                    Hook.success("Panel",`${req.user[0].username} has successfully bought a new theme!`)
                    res.redirect('/')
                }
            }
        )
    }
})

app.post('/Backend/UpgradeUser', checkAuth(false), async function(req,res) {
    if(req.user[0].userLevel == 1){
        return res.status(404).send({ error: 'You already own it!' })
    } else {
        let doc = User.updateOne({ discordId: req.user[0].discordId }, { userLevel: '1' },
            function (err, docs) {
                if (err){
                    Hook.err("Panel",`Error when dealing with ${req.user[0].username}'s request. Details are attached below: ${err}`)
                    console.log(err)
                }
                else{
                    Hook.success("Panel",`${req.user[0].username} has successfully upgraded their account!`)
                }
            })
    }
})

app.post('/Backend/UploadNewLog', checkAuth(false) && upload.single('IOI'), async function(req,res) {
    let doc = new LogWork({ fromUser: req.user[0].robloxID, itemName: req.body.itemName, points: req.body.points, image: req.file.filename })
    doc.save(function (err) {
        if (err) return Hook.err("Panel",`Uh oh! An error: ${err}`)
        Hook.success("Panel",`New log request!`)
        res.redirect('/');
    });
})

app.post('/Backend/AcceptLog', checkAuth(false, 'notReq', true, 'admin'), async function(req,res) {
    var pointsToGive = parseInt(req.user[0].fweP) + parseInt(req.body.fwePG)
    let doc = User.updateOne({ discordId: req.user[0].discordId }, { fweP: pointsToGive },
            function (err, docs) {
                if (err){
                    Hook.err("Panel",`Error when dealing with ${req.user[0].username}'s request. Details are attached below: ${err}`)
                    console.log(err)
                }
                else{
                    LogWork.deleteOne({ fromUser: req.user[0].robloxID }, function (err) {
                        Hook.success("Panel",`${req.user[0].username} request has been accepted!`)
                        res.redirect('/')
                    });
                }
            })
})

app.post('/Backend/DenyLog', checkAuth(false, 'notReq', true, 'admin'), async function(req,res) {
    LogWork.deleteOne({ fromUser: req.user[0].robloxID }, function (err) {
        Hook.err("Panel",`${req.user[0].username} request has been denied!`)
        res.redirect('/')
    });
})

app.post('/Backend/SetPayoutUser', checkAuth(false), async function(req,res) {
    let doc = User.updateOne({ discordId: req.user[0].discordId }, { robloxID: req.body.ID },
            function (err, docs) {
                if (err){
                    Hook.err("Panel",`Error when dealing with ${req.user[0].username}'s request. Details are attached below: ${err}`)
                    res.redirect('/')
                    console.log(err)
                }
                else{
                    Hook.success("Panel",`${req.user[0].username} has successfully set their new ID! ID: ${req.body.ID}`)
                    res.redirect('/Network/Payout')
                }
            })
    
})

app.post('/Backend/Payout', checkAuth(false), async function(req,res) {
    var robuxRequesting = parseInt(req.body.robuxRequest) / 25
    Hook.info("Payout", `New request opened by ${req.user[0].username} requesting ${robuxRequesting} robux. Processing request.`)

    var newFWEPoint = parseInt(req.user[0].fweP - robuxRequesting)
    if(newFWEPoint <= 0)
    {
        return res.redirect('/')
    }
    let doc = User.updateOne({ discordId: req.user[0].discordId }, { fweP: newFWEPoint },
        function (err, docs) {
            if (err){
                Hook.err("Payout",`Error when dealing with ${req.user[0].username}'s request. Details are attached below: ${err}`)
                res.redirect('/')
                console.log(err)
            }
            else{
                // Make payout
                noblox.groupPayout("11519763", req.user[0].robloxID, robuxRequesting)
                Hook.success("Payout", `Request opened by ${req.user[0].username} has been successfully finished!`)
                res.redirect(req.get('referer'))
            }
        })
})

app.post('/Backend/AddAnnouncement', checkAuth(false, 'notReq', true, 'admin'), async function(req,res) {
    console.log(req.body)
    let doc = new Announcement({ announcement: req.body.announcement, description: req.body.description, link: req.body.link })
    doc.save(function (err) {
        if (err) return Hook.err("Panel",`Uh oh! An error: ${err}`)
        Hook.success("Panel",`New announcement posted!`)
        res.redirect(req.get('referer'));
    });
})

app.listen(PORT, (req,res) => {
    startApp()
})
