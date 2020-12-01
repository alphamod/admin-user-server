const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    hash: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true
    },
    role: [{
        type: String,
        enum:["user","admin"]
    }]
});

userSchema.pre('save', function(next){
    if (this.role.length === 0) {
        this.role.push("user");
        next();
    }
});

const UserData = mongoose.model('userData', userSchema);
module.exports = UserData;