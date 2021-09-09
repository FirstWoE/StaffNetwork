var mongoose = require('mongoose')
const schema = new mongoose.Schema({
    fromUser: 'string',
    itemName: 'string',
    points: 'string',
    image: 'string'
});


module.exports = mongoose.model('LogWork', schema);