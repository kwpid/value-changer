require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const http = require('http');

// Get environment variables from Railway
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const PORT = process.env.PORT || 3000;

// Validate required environment variables
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error('Missing required environment variables. Please set DISCORD_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID in Railway.');
    process.exit(1);
}

// Create a simple HTTP server to keep the service alive
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Discord bot is running!');
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

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
            .setRequired(true))
    .addStringOption(option =>
        option.setName('reason')
            .setDescription('Reason for the value change')
            .setRequired(true));

const itemReleaseCommand = new SlashCommandBuilder()
    .setName('itemrelease')
    .setDescription('Post an item release embed')
    .addStringOption(option =>
        option.setName('itemname')
            .setDescription('Name of the item')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('rarity')
            .setDescription('Rarity of the item')
            .setRequired(true)
            .addChoices(
                { name: 'Common', value: 'common' },
                { name: 'Uncommon', value: 'uncommon' },
                { name: 'Rare', value: 'rare' },
                { name: 'Epic', value: 'epic' },
                { name: 'Legendary', value: 'legendary' },
                { name: 'Limited', value: 'limited' }
            ))
    .addNumberOption(option =>
        option.setName('value')
            .setDescription('Value of the item')
            .setRequired(true))
    .addNumberOption(option =>
        option.setName('stock')
            .setDescription('Stock of the item')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('image')
            .setDescription('URL of the item image')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('case')
            .setDescription('Which case the item will be in')
            .setRequired(true));

// Register the command
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        
        // Check if the bot has the necessary permissions
        const guild = await client.guilds.fetch(GUILD_ID);
        const botMember = await guild.members.fetch(CLIENT_ID);
        
        if (!botMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
            console.error('Bot does not have Administrator permissions. Please add the bot with Administrator permissions.');
            return;
        }

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: [command.toJSON(), itemReleaseCommand.toJSON()] },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
        if (error.code === 50001) {
            console.error('Missing Access error: The bot does not have the necessary permissions. Please:');
            console.error('1. Remove the bot from your server');
            console.error('2. Re-add the bot using this link:');
            console.error(`https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`);
        }
    }
    console.log(`Logged in as ${client.user.tag}!`);
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    // Check if user has admin permissions or the specific role
    const member = interaction.member;
    const hasAdminPermission = member.permissions.has(PermissionsBitField.Flags.Administrator);
    const hasRequiredRole = member.roles.cache.has('1380720990920642620');

    if (!hasAdminPermission && !hasRequiredRole) {
        return interaction.reply({ 
            content: 'You do not have permission to use this command. Only administrators and users with the required role can use this command.',
            ephemeral: true 
        });
    }

    if (interaction.commandName === 'valuechange') {
        const itemName = interaction.options.getString('itemname');
        const changeType = interaction.options.getString('change_type');
        const currentValue = interaction.options.getNumber('current_value');
        const newValue = interaction.options.getNumber('new_value');
        const imageUrl = interaction.options.getString('image_url');
        const referenceLink = interaction.options.getString('reference_link');
        const reason = interaction.options.getString('reason');

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
            .setDescription(`**Change:** ${changeType === 'raise' ? '<:arrow:1380661740962054276>' : '<:arrow:1380661729700216994>'} ${changeType.charAt(0).toUpperCase() + changeType.slice(1)}\n\n**Old Value:** ${formattedCurrent} (${formattedCurrentShort})\n**New Value:** ${formattedNew} (${formattedNewShort})\n**Raise/Lower:** ${difference >= 0 ? '+' : ''}${formattedDifference} (${difference >= 0 ? '+' : ''}${formattedDifferenceShort})\n\n**Reason:** ${reason}`)
            .setThumbnail(imageUrl)
            .setURL(referenceLink);

        await interaction.reply({ embeds: [embed] });
    } else if (interaction.commandName === 'itemrelease') {
        const itemName = interaction.options.getString('itemname');
        const rarity = interaction.options.getString('rarity');
        const value = interaction.options.getNumber('value');
        const stock = interaction.options.getNumber('stock');
        const imageUrl = interaction.options.getString('image');
        const caseName = interaction.options.getString('case');

        // Format the value
        const formattedValue = value.toLocaleString();
        const formattedValueShort = formatNumber(value);

        // Format stock display
        const stockDisplay = stock >= 999 ? 'Inf' : stock.toString();

        // Set color based on rarity
        const rarityColors = {
            'common': '#00ff00',      // Green
            'uncommon': '#00ffff',    // Light Blue
            'rare': '#0000ff',        // Dark Blue
            'epic': '#800080',        // Dark Purple
            'legendary': '#ffd700',   // Gold
            'limited': '#ff69b4'      // Pink
        };

        const embed = new EmbedBuilder()
            .setTitle(`${itemName} | ${caseName}`)
            .setColor(rarityColors[rarity])
            .setDescription(`**Rarity:** ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}\n\n**Value:** ${formattedValue} (${formattedValueShort})\n**Stock:** ${stockDisplay}`)
            .setThumbnail(imageUrl);

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
