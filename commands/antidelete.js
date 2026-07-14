const antideleteModule = require('../events/antidelete');

module.exports = {
    name: 'antidelete',
    aliases: ['antidel'],
    category: 'owner',
    execute: async ({ sock, msg, args, jid }) => {
        await antideleteModule.command(sock, msg, args, jid);
    },
};
