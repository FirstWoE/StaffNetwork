require('dotenv').config()
const express = require('express')
const app = express()

const webhook = require("webhook-discord")
const Hook = new webhook.Webhook("https://canary.discord.com/api/webhooks/879836780461969428/NDPyLsCqgjfWNTU-Uxz-ysyZCwpfq6-IDror9riVN2FQH7Uhm0gbvPdz0grY4wRMwoiY")

var mongoose = require('mongoose')
var User = require('./models/User')
var Announcement = require('./models/Announcement')

var session = require('express-session')
var passport = require('passport')
var DiscordStrategy = require('passport-discord').Strategy
    , refresh = require('passport-oauth2-refresh');

var path = require('path')
const multer = require('multer');
var ejs = require('ejs')
var fs = require('fs')
var chalk = require('chalk')
var noblox = require('noblox.js')


var scopes = ['identify'];
const PORT = process.env.PORT || 5001

app.use(express.urlencoded({extended: true}))
app.use(express.json())

try {
    var db = mongoose.connect('mongodb+srv://admin:Yux$8b76@livenetwork1.kdjqu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', {useNewUrlParser: true, dbName: 'staffNetwork'});
    console.log('success connection');
}
catch (error) {
    console.log('Error connection: ' + error);
}

app.use('/_assets_', express.static(path.join(__dirname, '/../public')));

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads');
    },

    // By default, multer removes file extensions so let's add them back
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(id, done) {
    done(null, id);
});
var discordStrat = new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
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
    const currentUser = await noblox.setCookie(process.env.ACCOUNT_COOKIE) 
    console.log(`Logged in as ${currentUser.UserName} [${currentUser.UserID}]`)

    // Do everything else, calling functions and the like.
    this.groupFunds = await noblox.getGroupFunds(11519763)
}

function checkAuth(requiresRender = true, render = "notReq", hiddenPage = false, neededRank = "0", announcementPage = false, payout = false){
    return function(req, res, next) {
        if(req.isAuthenticated()){
            User.find({ discordId: req.user[0].discordId }, function(err,user) {
                Announcement.find({}, function(err,announcement){
                    req.logIn(user, function(error) {
                        if (!error) {
                            console.log('user information updated')
                        }
                        if(requiresRender && announcementPage == true){
                            return res.render(path.join(__dirname, render), { user: user, announcement: announcement });
                        }
                        if(requiresRender && payout){
                            var groupFundsTakeOut = this.groupFunds
                            return res.render(path.join(__dirname, render), { user: user, announcement: announcement });
                        }
                        if(hiddenPage && user[0].adminLevel == neededRank && requiresRender){
                            console.log(user[0].adminLevel)
                            res.render(path.join(__dirname, render), { user: user })
                        } else if(hiddenPage && user[0].adminLevel !== neededRank && requiresRender == false){
                            console.log(user[0].adminLevel)
                            return res.redirect('/Network/Home')
                        }
                    });
                })
            })
            return next();
        } else {
            return res.redirect('/')
        }
    }
}

app.get('/', passport.authenticate('discord'))

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
app.get('/Network/Settings', checkAuth(true, '/../src/views/Network/Settings'), function(req, res) {})
app.get('/Network/Store', checkAuth(true, '/../src/views/Network/Store'), function(req, res) {})

app.get('/Admin.Network/Home', checkAuth(true, '/../src/views/Admin.Network/Home', true, 'admin'), function(req, res) {})
app.get('/Admin.Network/Announce', checkAuth(true, '/../src/views/Admin.Network/Announce', true, 'admin'), function(req, res) {})


let upload = multer({ storage: storage })
app.post('/Backend/UpdateSettings', checkAuth(false) && upload.single('avatar'), function(req, res){
    var fileExt = req.file.filename.split(".")
    if(fileExt[1] == "gif"){
        User.find({ discordId: req.user[0].discordId }, function(err,user) {
            console.log(user[0].userLevel)
            if(user[0].userLevel == 0){
                Hook.err("Panel",`Error when dealing with ${req.user[0].username}'s request. They were not high enough level to successfully change their avatar!`)
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
        res.status(412).send({ error: 'Oops, looks like your balance is insufficient! :(' })
    } else if(req.user[0].currentTheme == themeName) {
        res.status(302).send({ error: 'You already own it!' })
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
                }
            }
        )
    }
})

app.post('/Backend/UpgradeUser', checkAuth(false), async function(req,res) {
    if(req.user[0].userLevel == 1){
        return res.status(302).send({ error: 'You already own it!' })
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

app.post('/Backend/Payment', checkAuth(false), async function(req,res) {
    
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