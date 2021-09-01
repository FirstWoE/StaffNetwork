var mongoose = require('mongoose')
const schema = new mongoose.Schema({
    announcement: 'string',
    description: 'string'
});


module.exports = mongoose.model('Announcement', schema);