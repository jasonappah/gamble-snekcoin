const dotenv = require('dotenv')
dotenv.config()

const ANK_AT_CODE = '<@A013UALFNAJ>'

const { App } = require('@slack/bolt')
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
})

const axios = require('axios')
const api = axios.create({ baseURL: 'https://ankbot.net/api/' });
(async() => {
    // Start your app
    await app.start(3000)
    console.log('Started Ank bot')


    app.event('app_mention', async({ event, context }) => {
        console.log(event)
        const { text, user, channel, ts } = event
        const words = text.trim().split(' ')

        const reply = t => sendMessage(channel, t, ts)

        if (words[0] !== ANK_AT_CODE)
            return reply('Type `@gmbl` and an amount of SnekCoin to gamble to start your slow descent into homelessness and depression.')

        const command = words[1]

        const payerBalance = (await api.get(`balance?id=${user}`)).data.value

        if (!isNumber(command))
            return reply('Um, that\'s not a number.')

        if (payerBalance < command)
            return reply('You can\'t gamble more SnekCoin than you have, you thief!')

        random = Math.random()

        if (gainLoss()) {
            // If you are gaining money
            amount = random * command
            await api.post('transfer', {
                payer: user,
                receiver: ANK_AT_CODE,
                amount,
                key: process.env.ANK_API_KEY
            })
            msg = `You gained ${amount} SnekCoin!`
            return reply(msg)
        } else { // you're losing money
            amount = random * command * -1
            await api.post('transfer', {
                payer: user,
                receiver: ANK_AT_CODE,
                amount,
                key: process.env.ANK_API_KEY
            })
            if (payerBalance == amount)
                msg = 'You lost it all. Tough.'
            else
                msg = `You lost ${amount} SnekCoin. Tough.`
            return reply(msg)
        }



        switch (command) {
            case 'gamble':
                {
                    let userToGetBalance
                    if (words[2]) {
                        userToGetBalance = words[2]
                        if (!isHandle(userToGetBalance))
                            return reply('Specify the user properly this time with `@`!')
                        userToGetBalance = userToGetBalance.substring(2, userToGetBalance.length - 1)
                    } else {
                        userToGetBalance = user
                    }

                    const balance = (await api.get(`balance?id=${userToGetBalance}`)).data.value
                    const startingAmount = (await api.get('starting-amount')).data.value
                    return reply(
                        balance < 300 ?
                        `<@${userToGetBalance}>, you have only ${balance} SnekCoin™ you peasant! Get more!` :
                        balance == startingAmount ?
                        `<@${userToGetBalance}> has never interacted with the SnekCoin™ economy, having only ${startingAmount} SnekCoin™! Go, stimulate my economy!` :
                        balance < 1200 ?
                        `${userToGetBalance} is a comfortable middle-class SnekCoiner with ${balance} SnekCoin™` :
                        `<@${userToGetBalance}> is part of the dirty bourgeoisie with ${balance} SnekCoin™! Proletariats, beat 'em up!`,
                    )
                }
            case 'pay':
                {
                    let receiver = words[2]
                    if (!isHandle(receiver))
                        return reply('This handle you gave me is trash garbage check it again and send it back!')

                    receiver = handleToId(receiver)

                    const amount = Number(words[3])
                    if (amount == 0)
                        return reply('Stop wasting my time!')

                    if (amount < 0)
                        return reply('Stop at once you thief!')

                    try {
                        await api.post('transfer', {
                            payer: user,
                            receiver,
                            amount,
                            key: process.env.ANK_API_KEY
                        })
                    } catch (err) {
                        console.log(err)
                        return reply('You don\'t have enough SnekCoin™ to complete this transaction you peasant!')
                    }

                    const payerBalance = (await api.get(`balance?id=${user}`)).data.value
                    const receiverBalance = (await api.get(`balance?id=${receiver}`)).data.value

                    return reply(`Successfully transferred ${amount} SnekCoin™ from <@${user}> (${payerBalance}) to <@${receiver}> (${receiverBalance})`)
                }
            case 'leaderboard':
                {
                    const lower = words[2] ? Number(words[2]) : 1
                    const upper = words[3] ? Number(words[3]) : 10

                    if (isNaN(lower))
                        return reply('Hey you innumeric baffoon the lower range isn\'t even a number what are you doing')

                    if (isNaN(upper))
                        return reply('Hey you innumeric baffoon the upper range isn\'t even a number what are you doing')

                    const users = (await api.get(`users?lower=${lower}&upper=${upper}`)).data
                    const blocks = [{
                        "type": "section",
                        "text": {
                            "text": `SnekCoin™ Leaderboard [${lower} - ${upper}]`,
                            "type": "mrkdwn"
                        },
                        "fields": [{
                                "type": "mrkdwn",
                                "text": "*SnekCoiner™*"
                            },
                            {
                                "type": "mrkdwn",
                                "text": "*SnekCoin™*"
                            }
                        ]
                    }]

                    for (let i = 0; i < users.length; i++) {
                        const userData = await getInfo(users[i].userId)
                        blocks.push({
                            "type": "section",
                            "fields": [{
                                    "type": "plain_text",
                                    "text": `#${i + lower}. ${userData.user.profile.display_name}`
                                },
                                {
                                    "type": "plain_text",
                                    "text": String(users[i].balance)
                                }
                            ]
                        })
                    }
                    console.log(JSON.stringify(blocks))

                    return sendMessage(channel, '', '', blocks)
                }
            case 'help':
                {
                    const helpBlocks = [{
                            "type": "section",
                            "text": {
                                "text": "Hello, I\'m Ank (<http://ankbot.net|ankbot.net>)! I\'m a good friend of Snek and I primarily manage SnekCoin™, the #1 currency! Run a command with `@ank [command] [args]`. I have the following:",
                                "type": "mrkdwn"
                            },
                            "fields": [
                                { "type": "mrkdwn", "text": "*balance* [@user]" },
                                { "type": "plain_text", "text": "Get your SnekCoin™ balance (don't specify @user) or someone else's" }
                            ]
                        },
                        {
                            "type": "section",
                            "fields": [
                                { "type": "mrkdwn", "text": "*pay @user 10*" },
                                { "type": "plain_text", "text": "Pay an amount of SnekCoin™ to @user" }
                            ]
                        },
                        {
                            "type": "section",
                            "fields": [
                                { "type": "mrkdwn", "text": "*leaderboard [lower] [upper]*" },
                                { "type": "plain_text", "text": "Get wealthiest users between two indexes (inclusive and starts at 1)." }
                            ]
                        },
                        {
                            "type": "section",
                            "fields": [
                                { "type": "mrkdwn", "text": "*help*" },
                                { "type": "plain_text", "text": "Get help!" }
                            ]
                        }
                    ]
                    return sendMessage(channel, '', '', helpBlocks)
                }
            default:
                {
                    return reply('That command isn\'t even valid what are you doing?!')
                }
        }

    })
})()

// Utils
function isHandle(handle) {
    return handle.match(/<@.*>/) !== null
}

function isNumber(str) {
    if (typeof str != "string") return false // we only process strings!
        // could also coerce to string: str = ""+str
    return !isNaN(str) && !isNaN(parseFloat(str))
}

function handleToId(handle) {
    return handle.substring(2, handle.length - 1)
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
                    blocks,
                })
            )
        } catch (error) {
            console.error(error);
            rej(error)
        }
    })
}

function gainLoss() {
    // Returns true if you are gaining money, returns false if you are losing it.
    x = Math.floor(Math.random() * 2);
    if (x < 0.5)
        return False
    return True
}

function getInfo(user) {
    return new Promise(async(res, rej) => {
        try {
            res(
                await app.client.users.info({
                    token: process.env.SLACK_BOT_TOKEN,
                    user
                })
            )
        } catch (error) {
            console.error(error);
            rej(error)
        }
    })
}