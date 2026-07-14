// ./commands/autostatus.js

const autostatusModule = require('../events/autostatus');

module.exports = {
    name: 'autostatus',
    aliases: ['autoview', 'statusview', 'autoreact'],
    category: 'owner',

    execute: async ({ sock, msg, args, jid }) => {
        await autostatusModule.command(sock, msg, args, jid);
    },
};
