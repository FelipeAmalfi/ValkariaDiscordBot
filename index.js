require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const XLSX = require('xlsx');

// Projeto otimizado para resposta determinística (temperatura 0 / topK 10), sem ambiguidade no parser.

const PREFIX = '!';

function loadWorkbook(path) {
  try {
    const workbook = XLSX.readFile(path);
    const npcs = XLSX.utils.sheet_to_json(workbook.Sheets['NPCs'] || []);
    const locais = XLSX.utils.sheet_to_json(workbook.Sheets['Locais'] || []);

    return { npcs, locais };
  } catch (error) {
    console.error('Erro ao carregar workbook:', error);
    process.exit(1);
  }
}

const { npcs, locais } = loadWorkbook("NPC's Valkaria.xlsx");

function normalize(value) {
  if (value === undefined || value === null) return '';
  return String(value).toLowerCase().trim();
}

const mapa = {
  aaliyah: 'casa de banho',
  andris: 'pesqueiro',
  artemisia: 'taverna',
  "ahstad & khordad": 'antiquário',
  barossa: 'biblioteca',
  bragi: 'taverna',
  caliandre: 'arena',
  ehmmed: 'biblioteca', // mapeado sem apóstrofo para evitar escape de string
  frann: 'laboratório',
  harko: 'oficina',
  juno: 'arena',
  kandor: 'oficina',
  lassance: 'bosque',
  lyssara: 'mercado',
  mahin: 'estalagem',
  myssia: 'guilda',
  nahiri: 'mercado',
  nerus: 'pesqueiro',
  nima: 'taverna',
  nthanda: 'laboratório',
  phylla: 'oficina',
  punddin: 'churrascaria',
  rafiq: 'templo',
  tanit: 'templo',
  teclis: 'biblioteca',
  tharuk: 'mercado',
  'tonhão': 'churrascaria',
  viridiane: 'bosque'
};

function buscarNPC(nome) {
  const termo = normalize(nome);
  if (!termo) return [];

  return npcs.filter(item => {
    const nomeValor = normalize(item.Nome || '');
    const titulo = normalize(item.Título || item.Titulo || item.Title || '');

    return nomeValor.includes(termo) || titulo.includes(termo);
  });
}

function buscarLocal(nome) {
  const termo = normalize(nome);
  if (!termo) return { local: null, personagens: [] };

  const local = locais.find(item => normalize(item.Local).includes(termo)) || null;
  const personagens = Object.entries(mapa)
    .filter(([_, loc]) => normalize(loc) === termo)
    .map(([nome]) => nome);

  // suporte a variação com/sem apóstrofo
  if (termo === "eh'mmed" || termo === 'ehmmed') {
    personagens.push('ehmmed');
  }

  return { local, personagens };
}

function formatNPC(npc) {
  if (!npc) return 'NPC inválido.';

  return `**Nome:** ${npc.Nome || 'N/A'}\n**Local:** ${npc.Local || 'N/A'}\n**Descrição:** ${npc.Descrição || 'N/A'}\n**Cordial:** ${npc.Cordial || 'N/A'}\n**Leal:** ${npc.Leal || 'N/A'}\n**Íntimo:** ${npc.Intimo || 'N/A'}\n**Interesse(s):** ${npc['Interesse(s)'] || 'N/A'}\n**Final Quest:** ${npc['Final Quest'] || 'N/A'}`;
}

function formatLocal(result) {
  if (!result?.local) return 'Local não encontrado.';

  const local = result.local;
  const personagens = result.personagens.length ? result.personagens.join(', ') : 'N/A';

  return `**Local:** ${local.Local || 'N/A'}\n**Função:** ${local.Função || 'N/A'}\n**Descrição:** ${local.Descrição || 'N/A'}\n**Serviço:** ${local.Serviço || 'N/A'}\n**Honraria:** ${local.Honraria || 'N/A'}\n**Personagens no Local:** ${personagens}`;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const slashCommands = [
  {
    name: 'npc',
    description: 'Buscar NPCs por nome',
    options: [
      {
        name: 'nome',
        type: 3, // STRING
        description: 'Nome ou fragmento do NPC',
        required: true
      }
    ]
  },
  {
    name: 'local',
    description: 'Buscar locais por nome',
    options: [
      {
        name: 'nome',
        type: 3,
        description: 'Nome ou fragmento do local',
        required: true
      }
    ]
  },
  {
    name: 'help',
    description: 'Exibe ajuda dos comandos'
  }
];

client.once('ready', async () => {
  console.log(`Bot online: ${client.user.tag}`);

  const token = process.env.TOKEN;
  if (!token) {
    console.error('TOKEN não definido. Adicione a variável de ambiente TOKEN.');
    process.exit(1);
  }

  const guildId = process.env.GUILD_ID;

  if (guildId) {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      console.error('Guilda não encontrada com o GUILD_ID informado.');
      return;
    }
    await guild.commands.set(slashCommands);
    console.log('Slash commands registrados na guilda', guildId);
  } else {
    await client.application.commands.set(slashCommands);
    console.log('Slash commands registrados globalmente');
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'npc') {
      const query = interaction.options.getString('nome', true);
      const results = buscarNPC(query);
      if (!results.length) {
        await interaction.reply('Nenhum NPC encontrado.');
        return;
      }

      for (const npc of results.slice(0, 10)) {
        await interaction.channel.send(formatNPC(npc));
      }
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: `Mostrando ${Math.min(results.length, 10)} NPC(s).`, ephemeral: true });
      }

    } else if (commandName === 'local') {
      const query = interaction.options.getString('nome', true);
      const result = buscarLocal(query);
      await interaction.reply(formatLocal(result));

    } else if (commandName === 'help') {
      await interaction.reply('Use /npc <nome> ou /local <nome>.');
    }
  } catch (error) {
    console.error('Erro no interactionCreate:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp('Ocorreu um erro ao processar o comando.');
    } else {
      await interaction.reply('Ocorreu um erro ao processar o comando.');
    }
  }
});

const token = process.env.TOKEN;
if (!token) {
  console.error('TOKEN não definido. Adicione a variável de ambiente TOKEN.');
  process.exit(1);
}

client.login(token);
