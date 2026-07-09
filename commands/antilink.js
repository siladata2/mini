// ./commands/antilink.js

const antilinkModule = require('../events/antilink');

module.exports = {
    name: 'antilink',
    aliases: ['antilinks', 'nolinks', 'nolink'],
    category: 'group',

    execute: async ({ sock, msg, args, jid }) => {
        await antilinkModule.command(sock, msg, args, jid);
    },
};

