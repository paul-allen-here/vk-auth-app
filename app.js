require("dotenv").config();
const axios = require('axios');
const express = require("express");
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport')
const session = require('express-session');

const connectDB = require('./config/bd');

const User = require('./models/user');

const PORT = process.env.PORT || 3000;
const app = express();

// Connect DB
connectDB();

const VKONTAKTE_APP_ID = 7290461;
const VKONTAKTE_APP_SECRET = "uo1bb2h3t5uGtwzyMkwT";

app.use(session({
    secret: 'secretHere',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

const VKontakteStrategy = require('passport-vkontakte').Strategy;

passport.use(new VKontakteStrategy({
    clientID:     VKONTAKTE_APP_ID, // VK.com docs call it 'API ID', 'app_id', 'api_id', 'client_id' or 'apiId'
    clientSecret: VKONTAKTE_APP_SECRET,
    callbackURL:  `https://young-river-68462.herokuapp.com/auth/vkontakte/callback`
  },
  (accessToken, refreshToken, params, profile, done) => {
    User.findOne({ 'vkontakte.id': profile.id }, async (err, user) => {
        if (err) return done(err);
        if (user) {
            return done(null, user);
        }
        else {
            // if there is no user found with that facebook id, create them
            let newUser = new User();
            // set all of the facebook information in our user model
            newUser.vkontakte.id = profile.id;
            newUser.vkontakte.token = accessToken;
            newUser.vkontakte.name  = profile.displayName;
            if (typeof profile.emails != 'undefined' && profile.emails.length > 0) {
                newUser.vkontakte.email = profile.emails[0].value;
            }
            
            let url = `https://api.vk.com/method/friends.get?order=random&count=5&fields=name&access_token=${accessToken}&v=5.103`;
            let request = await axios.get(url);
            newUser.vkontakte.friends = request.data.response.items;

            // save our user to the database
            newUser.save((err) => {
                if (err) throw err;
                return done(null, newUser);
            });
        }
    });
  }
));

app.get('/auth/vkontakte',
  passport.authenticate('vkontakte', { 
        scope: ['status', 'email', 'friends', 'notify'],
        display: 'page'
    }
));

app.get('/auth/vkontakte/callback',
  passport.authenticate('vkontakte', { failureRedirect: '/' }),
  async (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

app.get('/', (req, res) => {
    if (req.session.passport) {
        req.session.passport.user._id;
        User.findOne({ _id: req.session.passport.user._id }, async (err, user) => {
            if (err) {
                return done(err);
            } else {
                res.render('home', {user});
            }
            req.session.cookie.id = user._id;
        });
    } else if (req.session.cookie.id) {
        User.findOne({ _id: req.session.cookie.id }, async (err, user) => {
            if (err) {
                return done(err);
            } else {
                res.render('home', {user});
            }
            req.session.cookie.id = user._id;
        });
    }
    else {
        res.render('login');
    }
});

app.get('/destroy', (req, res) => {
    req.session.destroy((err) => {
        res.clearCookie('connect.sid');
        res.redirect('/')
    })
});

passport.serializeUser((user, done) => {
    done(null, user);
});
  
passport.deserializeUser((user, done) => {
    done(null, user);
});

// Init middleware
app.use(cors());

app.set('view engine', 'ejs');
app.use(express.static("public"));

app.listen(PORT, () => {
    console.log("Server started on port ", PORT);
});
