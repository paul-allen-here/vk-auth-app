const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    vkontakte: {
        id           : String,
        token        : String,
        email        : String,
        name         : String,
        friends      : Array
    },
});


module.exports = mongoose.model('User', UserSchema);