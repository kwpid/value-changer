require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Get environment variables from Railway
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

// Validate required environment variables
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error('Missing required environment variables. Please set DISCORD_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID in Railway.');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Command definition
const command = new SlashCommandBuilder()
    .setName('valuechange')
    .setDescription('Post a value change embed')
    .addStringOption(option =>
        option.setName('itemname')
            .setDescription('Name of the item')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('change_type')
            .setDescription('Type of change')
            .setRequired(true)
            .addChoices(
                { name: 'Raise', value: 'raise' },
                { name: 'Lower', value: 'lower' }
            ))
    .addNumberOption(option =>
        option.setName('current_value')
            .setDescription('Current value of the item')
            .setRequired(true))
    .addNumberOption(option =>
        option.setName('new_value')
            .setDescription('New value of the item')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('image_url')
            .setDescription('URL of the item image')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('reference_link')
            .setDescription('Discord message reference link')
            .setRequired(true));

// Register the command
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: [command.toJSON()] },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
    console.log(`Logged in as ${client.user.tag}!`);
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'valuechange') {
        const itemName = interaction.options.getString('itemname');
        const changeType = interaction.options.getString('change_type');
        const currentValue = interaction.options.getNumber('current_value');
        const newValue = interaction.options.getNumber('new_value');
        const imageUrl = interaction.options.getString('image_url');
        const referenceLink = interaction.options.getString('reference_link');

        // Calculate the difference
        const difference = newValue - currentValue;
        const formattedDifference = difference.toLocaleString();
        const formattedDifferenceShort = formatNumber(difference);

        // Format the values
        const formattedCurrent = currentValue.toLocaleString();
        const formattedNew = newValue.toLocaleString();
        const formattedCurrentShort = formatNumber(currentValue);
        const formattedNewShort = formatNumber(newValue);

        const embed = new EmbedBuilder()
            .setTitle(itemName)
            .setColor(changeType === 'raise' ? '#00ff00' : '#ff0000')
            .setDescription(`**Change:** <:arrow:1380661740962054276> ${changeType.charAt(0).toUpperCase() + changeType.slice(1)}\n\n**Old Value:** ${formattedCurrent} (${formattedCurrentShort})\n**New Value:** ${formattedNew} (${formattedNewShort})\n**Raise/Lower:** ${difference >= 0 ? '+' : ''}${formattedDifference} (${difference >= 0 ? '+' : ''}${formattedDifferenceShort})`)
            .setThumbnail(imageUrl)
            .setFooter({ text: `Reference Message` })
            .setURL(referenceLink);

        await interaction.reply({ embeds: [embed] });
    }
});

// Helper function to format numbers (e.g., 1000000 -> 1M)
function formatNumber(num) {
    const absNum = Math.abs(num);
    if (absNum >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (absNum >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

client.login(TOKEN); 
