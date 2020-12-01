const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const emailSchema = new Schema({
    from: {
        type: Schema.Types.ObjectId,
        ref: "userData",
        required: true
    },
    to: {
        type: String,
        required: true
    },
    sentOn: {
        type: Date,
        required: true
    }
});

const EmailData = mongoose.model('emailData', emailSchema);
module.exports = EmailData;