// ./commands/weather.js

const axios = require('axios');

const STYLE = {
    forwardingScore: 350,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363425394543602@newsletter',
        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
        serverMessageId: 202,
    },
};

module.exports = {
    name: 'weather',
    aliases: ['meteo', 'climate'],
    category: 'tools',

    async execute({ sock, msg, args, jid }) {
        const city = args.join(' ');

        if (!city || city.trim().length < 2) {
            return sock.sendMessage(jid, {
                text:
                    '🌤️ *Weather*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.weather <city>\n\n' +
                    '✨ *Examples:*\n' +
                    '.weather Paris\n' +
                    '.weather New York\n' +
                    '.weather Tokyo',
                contextInfo: STYLE,
            }, { quoted: msg });
        }

        try { await sock.sendMessage(jid, { react: { text: '🌤️', key: msg.key } }); } catch (_) {}

        try {
            // Open-Meteo API (gratuit, pas de clé)
            const geoRes = await axios.get(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
                { timeout: 10000 }
            );

            if (!geoRes.data?.results?.length) throw new Error('City not found');

            const location = geoRes.data.results[0];

            const weatherRes = await axios.get(
                `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
                { timeout: 10000 }
            );

            const current = weatherRes.data.current_weather;
            const daily = weatherRes.data.daily;

            await sock.sendMessage(jid, {
                text:
                    '🌤️ *Weather Report*\n\n' +
                    `📍 *City:* ${location.name}, ${location.country}\n` +
                    `🌡️ *Temp:* ${current.temperature}°C\n` +
                    `💨 *Wind:* ${current.windspeed} km/h\n` +
                    `📊 *Max:* ${daily.temperature_2m_max[0]}°C\n` +
                    `📉 *Min:* ${daily.temperature_2m_min[0]}°C\n\n` +
                    '⚡ _Zenitsu Weather_',
                contextInfo: STYLE,
            }, { quoted: msg });

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ weather error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            await sock.sendMessage(jid, {
                text: '❌ City not found. Try a different name.',
                contextInfo: STYLE,
            }, { quoted: msg });
        }
    },
};
