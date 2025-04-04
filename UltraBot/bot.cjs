const moment = require("moment-timezone");
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require("discord.js");
const axios = require("axios");
const keep_alive = require('./keep_alive.js')
require("dotenv").config(); // مقداردهی متغیرهای .env

// 🎯 مقداردهی `client`
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers, // 🔴 این خط باید باشد!
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// **📌 متغیرهای اصلی**
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = 1342088490963177584;
const CHANNEL_ID = process.env.CHANNEL_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const ALLOWED_ROLES = process.env.ALLOWED_ROLES?.split(",") || [];

console.log("📌 CLIENT_ID:", CLIENT_ID);
console.log("📌 GUILD_ID:", GUILD_ID);

let statusIndex = 0;
let lastMessageId = null; // برای ذخیره پیام آخر در کانال

// **📌 بروزرسانی استاتوس و ارسال پیام**
async function updateStatusAndSendMessage(guild) {
    if (!guild) {
        console.error("❌ Guild is undefined");
        return;
    }

    const role = guild.roles.cache.get(ROLE_ID);
    const memberCount = role ? role.members.size : guild.memberCount;

    const statuses = [
        { type: ActivityType.Watching, text: `${memberCount} Members` },
        { type: ActivityType.Listening, text: "DevBy: RezaSajjadian" }
    ];

    if (!client.user) {
        console.log("❌ client.user Meghdar Dahi Nashode!");
        return;
    }

    const currentStatus = statuses[statusIndex];
    console.log(`🔄 Status Be : ${currentStatus.text} Taghir Kard`);

    client.user.setActivity(currentStatus.text, { type: currentStatus.type });

    statusIndex = (statusIndex + 1) % statuses.length;
}

// **📌 پردازش دستورات `/` (Slash Commands)**
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    try {
        const { commandName, options } = interaction;

        if (commandName === "embed") {
            const color = options.getString("color");
            const author = options.getString("author");
            const url = options.getString("url");
            const thumbnail = options.getString("thumbnail");
            const icon = options.getString("icon");
            const footer = options.getString("footer");
            const title = options.getString("title");
            const description = options.getString("description");
            const content = options.getString("content");
            const image = options.getString("image");

            try {
                const embedMessage = new EmbedBuilder()
                    .setColor(color)
                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setURL(url)
                    .setThumbnail(thumbnail)
                    .setTitle(title)
                    .setDescription(description)
                    .setImage(image)
                    .setFooter({ text: interaction.channel.name })
                    .setTimestamp();

                await interaction.reply({ embeds: [embedMessage] });
            } catch (error) {
                console.error("Error dar embed:", error);
                await interaction.reply({ content: "❌ Error dar sakhte embed. Lotfan dobare talash konid.", ephemeral: true });
            }
            return;
        }

        if (commandName === "cmd-access") {
            const commandName = options.getString("command_name");
            const option = options.getString("option");
            const role = options.getRole("role");
            const image = options.getAttachment("image");

            const embed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle("Command Access Management")
                .setTimestamp();

            if (image) embed.setImage(image.url);

            switch(option) {
                case "add_role":
                    if (!role) {
                        await interaction.reply({ content: "❌ Role Ra Entekhab Konid!", ephemeral: true });
                        return;
                    }
                    embed.setDescription(`✅ Role ${role} Be Command \`${commandName}\` Ezafe Shod.`);
                    break;
                    
                case "remove_role":
                    if (!role) {
                        await interaction.reply({ content: "❌ Role Ra Entekhab Konid!", ephemeral: true });
                        return;
                    }
                    embed.setDescription(`🗑️ Role ${role} Az Command \`${commandName}\` Hazf Shod.`);
                    break;
                    
                case "list_access":
                    embed.setDescription(`📋 List Dastresi Baraye Command \`${commandName}\`:\n\nHich Role Tanizm Nashode.`);
                    break;
            }

            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (commandName === "help") {
        const helpEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("📋 List Command Haye Bot")
            .setDescription("List Command Haye Ghabele Estefade:")
            .addFields(
                { name: "/help", value: "Namayesh List Command Ha", inline: false },
                { name: "/react [message_link] [emoji]", value: "Ezafe Kardan Reaction Be Yek Payam", inline: false },
                { name: "/config [title] [description] [color]", value: "Sakhte Embed Ba Tanzimate Delkhah", inline: false }
            )
            .setFooter({ text: "Ultra RolePlay Bot" })
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
        return;
    }

    if (commandName === "react") {
            const messageLink = options.getString("message_link");
            const emoji = options.getString("emoji");

            try {
                // Extract message ID, channel ID, and guild ID from message link
                const linkParts = messageLink.split("/");
                const messageId = linkParts.pop();
                const channelId = linkParts.pop();
                const guildId = linkParts.pop();

                const channel = await client.channels.fetch(channelId);
                const message = await channel.messages.fetch(messageId);

                await message.react(emoji);
                await interaction.reply({ content: "✅ Reaction Ezafe Shod!", flags: 64 });
            } catch (error) {
                console.error("Error adding reaction:", error);
                await interaction.reply({ content: "❌ Nemitavanam reaction ra ezafe konam. Link ya emoji eshtebah ast.", flags: 64 });
            }
        }
    } catch (error) {
        console.error("❌ Error Dar Ejraye Dastor:", error);
        if (!interaction.replied) {
            await interaction.reply({ content: "❌ Yek Error Rokh Dad!", flags: 64 }).catch(() => { });
        }
    }
});


// **📌 اتصال به سرور بعد از آماده شدن**
client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    let guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
        console.error("❌ Guild not found in cache, trying to fetch...");
        try {
            guild = await client.guilds.fetch(GUILD_ID);
        } catch (error) {
            console.error("❌ Error fetching guild:", error);
            return;
        }
    }

    console.log(`📌 Found Guild: ${guild.name}`);

    setTimeout(() => updateStatusAndSendMessage(guild), 5000);
    setInterval(() => updateStatusAndSendMessage(guild), 35000);

    await sendServerStatsMessage();
    setInterval(sendServerStatsMessage, 60000);
});

// 📌 تابع ارسال امبد به کانال خاص
async function sendServerStatsMessage() {
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) return console.error("❌ Channel Yaft Nashod.");

    const guild = channel.guild;
    if (!guild) return console.error("❌ Guild Yaft Nashod.");

    // دریافت رول خاص
    const role = guild.roles.cache.get(ROLE_ID);
    const memberCount = role ? role.members.size : guild.memberCount; // اگر رول پیدا نشد، کل اعضای سرور نمایش داده می‌شوند

    const tehranTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tehran",
        dateStyle: "full",
        timeStyle: "medium"
    }).format(new Date());

    const embed = new EmbedBuilder()
        .setTitle("Ultra RolePlay")
        .setColor("#8B0000") // رنگ قرمز تیره
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
            { name: " 𝙎𝙚𝙧𝙫𝙚𝙧 𝙋𝙡𝙖𝙮𝙚𝙧𝙨 :", value: `Online 🟢`, inline: true },
            { name: " 𝘿𝙞𝙨𝙘𝙤𝙧𝙙 𝙈𝙚𝙢𝙗𝙚𝙧 :", value: `**${memberCount}** Members`, inline: true },
            { name: "***Server Info***", value: "<:mgr:1350824596101791744> 𝙉𝙖𝙢𝙚 𝙎𝙚𝙧𝙫𝙚𝙧 : Ultra RolePlay \n<:mgw:1350824407634808942> 𝙂𝙖𝙢𝙚 𝙈𝙖𝙨𝙩𝙚𝙧:<@992518866100043876> <@933636420097146880>\n<:mgp:1350824578049380545>  𝙈𝙖𝙣𝙖𝙜𝙚𝙧: <@925670254045188106>\n", inline: false }
        )
        .setFooter({
            text: `🕔 Last Updating: ${tehranTime}`,
            iconURL: guild.iconURL({ dynamic: true }) || null
        })
        .setTimestamp();

    // 🔴 حذف آخرین پیام ارسال‌شده قبل از ارسال پیام جدید
    const messages = await channel.messages.fetch({ limit: 10 }); // دریافت آخرین ۱۰ پیام چنل
    const botMessages = messages.filter(m => m.author.id === client.user.id); // پیدا کردن پیام‌های بات

    if (botMessages.size > 0) {
        await Promise.all(botMessages.map(msg => msg.delete())); // حذف همه پیام‌های قبلی بات
        console.log("🗑 Tamami Message Haye Ghabli Pak Shod.");
    }

    try {
        // حذف پیام‌های قبلی
        const messages = await channel.messages.fetch({ limit: 10 }); // دریافت آخرین ۱۰ پیام چنل
        const botMessages = messages.filter(m => m.author.id === client.user.id); // پیدا کردن پیام‌های بات

        if (botMessages.size > 0) {
            await Promise.all(botMessages.map(msg => msg.delete())); // حذف همه پیام‌های قبلی بات
            console.log("🗑 Tamami Message Haye Ghabli Pak Shod.");
        }

        // **ارسال فقط یک پیام جدید و ذخیره `lastMessageId`**
        const sentMessage = await channel.send({ embeds: [embed] });
        lastMessageId = sentMessage.id;

        console.log("✅ Embed Ersal Shod.");
    } catch (error) {
        console.error("❌ Error Dar Ersal Embed:", error);
    }


    try {
        if (lastMessageId) {
            const lastMessage = await channel.messages.fetch(lastMessageId).catch(() => null);
            if (lastMessage) {
                await lastMessage.edit({ embeds: [embed] });
                console.log("✅ Message Ghabli Update Shod.");
                return;
            }
        }
        // ارسال پیام جدید
        // const sentMessage = await channel.send({ embeds: [embed] });
        lastMessageId = sentMessage.id;
        console.log("✅ Message Jadid Ersal Shod.");
    } catch (error) {
        console.error("❌ Error Dar Ersal Embed:", error);
    }
}


// **📌 متغیر چنل‌های ری‌اکشن**
const REACTION_CHANNEL_IDS = process.env.REACTION_CHANNEL_IDS?.split(",") || []; // آی‌دی چنل‌های خاص برای ری‌اکشن
const REACTION_EMOJIS = ["<:tp:1350860503727079584>"]; // لیست ایموجی‌های موردنظر

// 📌 ری‌اکشن خودکار به پیام‌ها در چنل‌های خاص
client.on("messageCreate", async (message) => {
    // بررسی چنل‌های خاص و اطمینان از اینکه پیام از طرف بات ارسال نشده است
    if (REACTION_CHANNEL_IDS.includes(message.channel.id) && !message.author.bot) {
        try {
            for (const emoji of REACTION_EMOJIS) {
                await message.react(emoji);
            }
            console.log(`✅ React Ha Be Message Dar Channel ${message.channel.name} Ezafe Shod: ${message.id}`);
        } catch (error) {
            console.error("❌ Error Dar Ezafe Kardan React:", error);
        }
    }
});



const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const { SlashCommandBuilder } = require("discord.js");

async function registerCommands() {
    const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;
    if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
        console.error("❌ Error: Moteghayer Haye Mohiti Vared Nashode!");
        return;
    }

    const commands = [
        new SlashCommandBuilder()
            .setName("react")
            .setDescription("Add reaction to a message")
            .addStringOption(option =>
                option.setName("message_link")
                    .setDescription("Link payam")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("emoji")
                    .setDescription("Emoji baraye reaction")
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName("help")
            .setDescription("Namayesh List Command Ha"),
        
        new SlashCommandBuilder()
            .setName("embed")
            .setDescription("Sakhte Embed Ba Tamami Option Ha")
            .addStringOption(option =>
                option.setName("color")
                    .setDescription("Range Embed")
                    .setRequired(true)
                    .addChoices(
                        { name: 'Ghermez', value: '#FF0000' },
                        { name: 'Abi', value: '#0000FF' },
                        { name: 'Sabz', value: '#00FF00' },
                        { name: 'Zard', value: '#FFFF00' },
                        { name: 'Banafsh', value: '#800080' },
                        { name: 'Narenji', value: '#FFA500' },
                        { name: 'Meshki', value: '#000000' },
                        { name: 'Sefid', value: '#FFFFFF' }
                    )
            )
            .addStringOption(option =>
                option.setName("title")
                    .setDescription("Title Of Your Embed")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("description")
                    .setDescription("Description Of Your Embed")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("content")
                    .setDescription("Content Of Your Embed")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("image")
                    .setDescription("Image Of Your Embed")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("more_url")
                    .setDescription("[+More] URL Embed")
                    .setRequired(false)
            )
            .addStringOption(option =>
                option.setName("more_thumbnail")
                    .setDescription("[+More] URL Thumbnail")
                    .setRequired(false)
            )
            .addStringOption(option =>
                option.setName("more_content")
                    .setDescription("[+More] Content Of Your Embed")
                    .setRequired(false)
            ),
        new SlashCommandBuilder()
            .setName("cmd-access")
            .setDescription("Manage Command Access")
            .addStringOption(option =>
                option.setName("command_name")
                    .setDescription("Name Commandi Ke Mikhahid Control Konid")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("option")
                    .setDescription("Option Control Command")
                    .setRequired(true)
                    .addChoices(
                        { name: 'Add Role', value: 'add_role' },
                        { name: 'Remove Role', value: 'remove_role' },
                        { name: 'List Access', value: 'list_access' }
                    )
            )
            .addRoleOption(option =>
                option.setName("role")
                    .setDescription("Role Mored Nazar")
                    .setRequired(false)
            )
            .addAttachmentOption(option =>
                option.setName("image")
                    .setDescription("Tasvir Baraye Embed")
                    .setRequired(false)
            ),
        new SlashCommandBuilder()
            .setName("autorole")
            .setDescription("Manage Auto-Role System")
            .addSubcommand(subcommand =>
                subcommand
                    .setName("roles")
                    .setDescription("Add A Role To Auto Roles")
                    .addRoleOption(option =>
                        option.setName("role")
                            .setDescription("Role Mored Nazar")
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("remove")
                    .setDescription("Remove A Role From Auto Roles")
                    .addRoleOption(option =>
                        option.setName("role")
                            .setDescription("Role Mored Nazar")
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("toggle")
                    .setDescription("Turn On/Off Auto-Role System")
            ),
    ].map(command => command.toJSON());

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        console.log("🔄 Dar Hal Sabt Commands `/`...");
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("✅ Commands Ha Save Shod!");
    } catch (error) {
        console.error("❌ Error Dar Sat Commands", error);
    }
}

// 📌 ثبت دستورات هنگام استارت بات
registerCommands();



/////WelComer
client.on("guildMemberAdd", async (member) => {
    console.log(`✅ عضو جدید وارد شد: ${member.user.tag}`);

    const channelId = process.env.WELCOME_CHANNEL_ID;
    if (!channelId) {
        console.error("❌ مقدار WELCOME_CHANNEL_ID در .env مشخص نشده است!");
        return;
    }

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) {
        console.error(`❌ کانال خوش‌آمدگویی (${channelId}) یافت نشد!`);
        return;
    }

    try {
        console.log(`✅ ارسال پیام خوش‌آمدگویی به کانال: ${channel.name}`);

        // 🔹 ارسال پیام متنی قبل از امبد
        await channel.send(` **<@${member.user.id}>** Welcome To **${member.guild.name}** 🌟 \n `);

        // 🟣 ارسال پیام امبد خوش‌آمدگویی
        const embed = new EmbedBuilder()
            .setTitle(`👋 WelCome ${member.user.username}!`)
            .setDescription(`Lahezat Khobi Dar **${member.guild.name}** Baraye Shoma Arezomandim ! ❤️\n\n **Baraye Moshahede Va Etela Az Akhbar Server https://discord.com/channels/1342086447355793490/1342088547104063488 Check Konid <:tp:1350860503727079584> **`)
            .setColor("#800040")
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: ` ${member.guild.name}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        console.log("✅ پیام خوش‌آمدگویی ارسال شد.");
    } catch (error) {
        console.error("❌ خطا در ارسال پیام خوش‌آمدگویی:", error);
    }
});


// **📌 اجرای بات**
client.login(process.env.TOKEN);
