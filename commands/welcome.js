
// ./commands/welcome.js
const welcomeModule = require('../events/welcome');

module.exports = {
    name: 'welcome',
    execute: async ({ sock, msg, args, jid }) => {
        await welcomeModule.command(sock, msg, args, jid);
    }
};
