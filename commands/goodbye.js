
// ./commands/goodbye.js
const goodbyeModule = require('../events/goodbye');

module.exports = {
    name: 'goodbye',
    execute: async ({ sock, msg, args, jid }) => {
        await goodbyeModule.command(sock, msg, args, jid);
    }
};
