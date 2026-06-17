// =========================
// MUSIC SELECTION HANDLER
// =========================
module.exports = {
    event: 'messages.upsert',
    execute: async (sock, { messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            
            const body = msg.message.conversation ||
                        msg.message.extendedTextMessage?.text ||
                        '';

            if (!body) return;

            // Vérifier si c'est un nombre
            const number = parseInt(body.trim());
            if (isNaN(number) || number < 1) return;

            // Vérifier s'il y a une sélection en attente
            if (!global.musicSelections) return;
            
            const selectionKey = from + '_' + sender;
            const selection = global.musicSelections.get(selectionKey);
            
            if (!selection) return;
            
            const { results, provider } = selection;
            
            if (number > results.length) {
                await sock.sendMessage(from, {
                    text: '❌ Invalid number. Choose between 1 and ' + results.length
                });
                return;
            }

            // Sélection effectuée
            const selectedVideo = results[number - 1];
            
            // Nettoyer la sélection
            clearTimeout(selection.timeout);
            global.musicSelections.delete(selectionKey);

            // =========================
            // ENVOYER LA CHANSON SÉLECTIONNÉE
            // =========================
            await sock.sendMessage(from, {
                react: { text: '🎵', key: msg.key }
            });

            const songMessage = '╭━━━━❲ NOW PLAYING ❳━━━━╮\n' +
                '┃\n' +
                '┃  🎵 Title: ' + selectedVideo.title + '\n' +
                '┃  👤 Artist: ' + (selectedVideo.author || 'Unknown') + '\n' +
                '┃  ⏱️ Duration: ' + (selectedVideo.duration || 'Unknown') + '\n' +
                '┃  👁️ Views: ' + (selectedVideo.views || 'Unknown') + '\n' +
                '┃  🔗 Link: ' + selectedVideo.url + '\n' +
                '┃\n' +
                '┃  📡 Source: ' + provider + '\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
                '━━━━━━━━━━━━━━━\n' +
                '_©CybernovA_';

            await sock.sendMessage(from, {
                text: songMessage,
                contextInfo: {
                    mentionedJid: [from],
                    forwardingScore: 540,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: 'CybernovA',
                        serverMessageId: 195
                    }
                }
            });

            // Envoyer la miniature si disponible
            if (selectedVideo.thumbnail) {
                try {
                    await sock.sendMessage(from, {
                        image: { url: selectedVideo.thumbnail },
                        caption: '🎵 ' + selectedVideo.title + '\n👤 ' + (selectedVideo.author || 'Unknown')
                    });
                } catch (error) {
                    console.error('Thumbnail error:', error.message);
                }
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: msg.key }
            });

        } catch (error) {
            console.error('Music selection error:', error);
        }
    }
};
