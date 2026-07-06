// ./commands/group-notify.js
const groupNotifyModule = require('../events/group-notify');

module.exports = {
    name: 'group-notify',
    execute: async ({ sock, msg, args, jid }) => {
        await groupNotifyModule.command(sock, msg, args, jid);
    }
};
