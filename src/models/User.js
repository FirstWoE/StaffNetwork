var mongoose = require('mongoose')
const schema = new mongoose.Schema({
    discordId: 'string',
    username: 'string',
    fweP: 'string',
    avatar: 'string',
    userLevel: 'string',
    adminLevel: 'string',
    currentTheme: 'string',
    robloxID: 'string',
    fundsExported: 'string',
    recentFunds: 'string',
    fundTimeout: 'string'
});


module.exports = mongoose.model('User', schema);