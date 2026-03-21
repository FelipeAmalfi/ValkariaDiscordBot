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
  tonhao: 'churrascaria', // mapeado sem c/til para evitar problema de key
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

function cleanLabel(value) {
  if (!value && value !== 0) return 'N/A';
  const text = String(value)
    .replace(/\s*\([^)]*\)/g, '') // remove texto entre parênteses
    .trim()
    .replace(/\.+$/g, '') // remove pontos finais em excesso
    .trim();
  return text || 'N/A';
}

function formatNPC(npc) {
  if (!npc) return 'NPC inválido.';

  const cordialValue = cleanLabel(npc.Cordial || npc['Cordial (1 a 3 PA)'] || npc['cordial']);
  const lealValue = cleanLabel(npc.Leal || npc['Leal (4 a 6 PA)'] || npc['leal']);
  const intimoValue = cleanLabel(
    npc['Íntimo'] || npc['íntimo'] || npc.Intimo || npc['Intimo'] || npc['Íntimo (7 PA).'] || npc['Intimo (7 PA)']
  );

  const nome = cleanLabel(npc.Nome || 'N/A');
  const local = cleanLabel(npc.Local || 'N/A');
  const descricao = cleanLabel(npc.Descrição || npc.Descricao || 'N/A');

  return `**Nome:** ${nome}\n**Local:** ${local}\n**Descrição:** ${descricao}\n**Cordial (1 a 3 PA):** ${cordialValue}\n**Leal (4 a 6 PA):** ${lealValue}\n**Íntimo (7 PA):** ${intimoValue}`;
}

function buscarBonus(termo) {
  const normalizedTermo = normalize(termo);
  if (!normalizedTermo) return [];

  return npcs.reduce((matches, npc) => {
    const nome = npc.Nome || npc.nome || 'N/A';
    const campos = [
      { key: 'Cordial (1 a 3 PA)', type: 'Cordial' },
      { key: 'Leal (4 a 6 PA)', type: 'Leal' },
      { key: 'Íntimo (7 PA)', type: 'Íntimo' }
    ];

    campos.forEach(campo => {
      const valor = cleanLabel(npc[campo.key] || '');
      if (valor !== 'N/A' && normalize(valor).includes(normalizedTermo)) {
        matches.push(`${nome} - Tipo do Bonus(${campo.type}): ${valor}`);
      }
    });

    return matches;
  }, []);
}

function formatLocal(result) {
  if (!result?.local) return 'Local não encontrado.';

  const local = result.local;
  const localName = cleanLabel(local.Local || local.Local || 'N/A');
  const funcao = cleanLabel(local.Função || local.Funcao || 'N/A');
  const descricao = cleanLabel(local.Descrição || local.Descricao || 'N/A');
  const servico = cleanLabel(local.Serviço || local.Servico || 'N/A');
  const honraria = cleanLabel(local.Honraria || 'N/A');
  const personagens = result.personagens.length ? result.personagens.join(', ') : 'N/A';

  return `**Local:** ${localName}\n**Função:** ${funcao}\n**Descrição:** ${descricao}\n**Serviço:** ${servico}\n**Honraria:** ${honraria}\n**Personagens no Local:** ${personagens}`;
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
  },
  {
    name: 'bonus',
    description: 'Buscar bônus por texto parcial em cordial, leal ou íntimo',
    options: [
      {
        name: 'texto',
        type: 3, // STRING
        description: 'Texto parcial a buscar nos bônus',
        required: true
      }
    ]
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

    } else if (commandName === 'bonus') {
      const texto = interaction.options.getString('texto', true);
      const resultados = buscarBonus(texto);

      if (!resultados.length) {
        await interaction.reply('Nenhum bônus encontrado para o texto informado.');
        return;
      }

      const resposta = resultados.slice(0, 10).join('\n');
      await interaction.reply(resposta);

    } else if (commandName === 'help') {
      await interaction.reply('Use /npc <nome>, /local <nome>, /bonus <texto>');
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
