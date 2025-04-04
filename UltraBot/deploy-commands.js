require("dotenv").config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const { SlashCommandBuilder } = require("discord.js");

// **📌 بررسی مقداردهی متغیرهای محیطی**
const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("❌ خطا: متغیرهای محیطی (.env) مقداردهی نشده‌اند!");
    process.exit(1);
}

console.log("📌 CLIENT_ID:", CLIENT_ID);
console.log("📌 GUILD_ID:", GUILD_ID);

// **📌 تعریف دستورات `/`**
const commands = [
    new SlashCommandBuilder()
        .setName("say")
        .setDescription("Ersal Message")
        .addStringOption(option => 
            option.setName("message")
                .setDescription("Matn Message")
                .setRequired(true)
        ),
].map(command => command.toJSON());

// **📌 ارسال دستورات به دیسکورد**
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        console.log("🔄 در حال ثبت دستورات `/`...");
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("✅ دستورات با موفقیت ثبت شدند!");
    } catch (error) {
        console.error("❌ خطا در ثبت دستورات:", error);
    }
})();
