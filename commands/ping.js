module.exports = {
    name: 'ping',

    execute: async ({ sock, msg }) => {
        const from = msg.key.remoteJid

        const start = Date.now()

        await sock.sendMessage(from, {
            react: { text: "⚡", key: msg.key }
        });
        const end = Date.now()
        const speed = end - start
        const message = `
⚡ *Zenitsu Mini* ⚡

🏓 Response Speed: ${speed}ms
`.trim();

    // Newsletter context
        const contextInfo = {
          externalAdReply: {
            title: "𝙯𝙚𝙣𝙞𝙩𝙨𝙪 𝙈𝙄𝙉𝙄 • PING",
            body: `Response: ${speed}ms`,
            thumbnailUrl: 'https://chat.whatsapp.com/FPE3RV3sH5iGTjlSP7N8Fw',
            sourceUrl: 'https://iili.io/CEfM5Gf.jpg',
            mediaType: 1,
            renderLargerThumbnail: false
          },
          forwardingScore: 54,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363425394543602@newsletter",
            newsletterName: "모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟",
            serverMessageId: 202
          }
        };

        await sock.sendMessage(
          from,
          {
            text: message,
            contextInfo: contextInfo
          },
          {
            quoted: msg
          }
        );
    }
}
