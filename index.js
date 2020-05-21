const dotenv = require("dotenv");
dotenv.config();

const THIS_AT_CODE = "<@U014DM74125>";
const THIS_AT_CODE2 = "U014DM74125";

const ANK_AT_CODE = "U013AE6G4BX";

const { App } = require("@slack/bolt");
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

const axios = require("axios");
const api = axios.create({ baseURL: "https://ankbot.net/api/" });
(async() => {
    // Start your app
    const port = process.env.PORT || 3000
    await app.start(port);
    console.log(`Started GMBL on port ${port}`);

    app.event("app_mention", async({ event, context }) => {
        console.log(event);
        const { text, user, channel, ts } = event;
        const words = text.trim().split(" ");

        const reply = t => sendMessage(channel, t, ts);

        if (words[0] == THIS_AT_CODE && user != ANK_AT_CODE) {
            if (words.length == 1 || words.length > 2) {
                return reply(
                    "Type `@gmbl` and an amount of SnekCoin to gamble and start your slow descent into homelessness and depression."
                );
            }

            const command = words[1];

            const payerBalance = (await api.get(`balance?id=${user}`)).data.value;
            const botBalance = (await api.get(`balance?id=${THIS_AT_CODE2}`)).data
                .value;

            if (!isNumber(command)) return reply("Um, that's not a number.");

            if (payerBalance < command)
                return reply(
                    "You can't gamble more SnekCoin than you have, you thief!"
                );

            const random = Math.random();

            if (gainLoss()) {
                // If you are gaining money
                const amount = random * command;
                if (amount > botBalance) {
                    amount = botBalance;
                    const msg = `You gained ${botBalance} SnekCoin! You could've had more but I'm running a little low on SnekCoin myself, so maybe you'd consider donating?`;
                    await api.post("transfer", {
                        payer: user,
                        receiver: THIS_AT_CODE2,
                        amount,
                        key: process.env.ANK_API_KEY
                    });
                    return reply(msg);
                } else {
                    await api.post("transfer", {
                        payer: user,
                        receiver: THIS_AT_CODE2,
                        amount,
                        key: process.env.ANK_API_KEY
                    });
                    const msg = `You gained ${amount} SnekCoin!`;
                    return reply(msg);
                }
            } else {
                // you're losing money
                const amount = random * command * -1;
                await api.post("transfer", {
                    payer: user,
                    receiver: THIS_AT_CODE2,
                    amount,
                    key: process.env.ANK_API_KEY
                });
                if (payerBalance == amount) {
                    const msg = "You lost it all. Tough.";
                    return reply(msg);
                } else {
                    const msg = `You lost ${amount} SnekCoin. Tough.`;
                    return reply(msg);
                }
            }
        }
    });
})();

// Utils
function isHandle(handle) {
    return handle.match(/<@.*>/) !== null;
}

function isNumber(str) {
    if (typeof str != "string") return false; // we only process strings!
    // could also coerce to string: str = ""+str
    return !isNaN(str) && !isNaN(parseFloat(str));
}

function handleToId(handle) {
    return handle.substring(2, handle.length - 1);
}

function sendMessage(channel, text, thread_ts = null, blocks = null) {
    return new Promise(async(res, rej) => {
        try {
            res(
                await app.client.chat.postMessage({
                    token: process.env.SLACK_BOT_TOKEN,
                    channel,
                    text,
                    thread_ts,
                    blocks
                })
            );
        } catch (error) {
            console.error(error);
            rej(error);
        }
    });
}

function gainLoss() {
    // Returns true if you are gaining money, returns false if you are losing it.
    const x = Math.floor(Math.random() * 2);
    if (x < 0.5) {
        return false;
    } else {
        return true;
    }
}

function getInfo(user) {
    return new Promise(async(res, rej) => {
        try {
            res(
                await app.client.users.info({
                    token: process.env.SLACK_BOT_TOKEN,
                    user
                })
            );
        } catch (error) {
            console.error(error);
            rej(error);
        }
    });
}