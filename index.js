import { create } from 'venom-bot';
import express from 'express';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import * as dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';

dotenv.config();

/* Agora podemos chamar nossas variáveis de ambiente
 * process.env.OPENAI_KEY
 * process.env.ORGANIZATION_ID
 * process.env.PHONE_NUMBER
 */
const configuration = new Configuration({
  organization: process.env.ORGANIZATION_ID,
  apiKey: process.env.OPENAI_KEY,
});
/*
getDavinciResponse() será para fazer chamadas para o davinci-003 que
 irá gerar as respostas em texto

*/
const openai = new OpenAIApi(configuration);

const getDavinciResponse = async clientText => {
  const options = {
    model: 'text-davinci-003', // Modelo GPT a ser usado
    prompt: clientText, // Texto enviado pelo usuário
    temperature: 1, // Nível de variação das respostas geradas, 1 é o máximo
    max_tokens: 4000, // Quantidade de tokens (palavras) a serem retornadas pelo bot, 4000 é o máximo
  };

  try {
    const response = await openai.createCompletion(options);
    let botResponse = '';
    response.data.choices.forEach(({ text }) => {
      botResponse += text;
    });
    return `Chat GPT 🤖\n\n ${botResponse.trim()}`;
  } catch (e) {
    return `❌ OpenAI Response Error: ${e.response.data.error.message}`;
  }
};

/*
 DALL-E getDalleResponse() que irá gerar nossas imagens:
*/

const getDalleResponse = async clientText => {
  const options = {
    prompt: clientText, // Descrição da imagem
    n: 1, // Número de imagens a serem geradas
    size: '1024x1024', // Tamanho da imagem
  };

  try {
    const response = await openai.createImage(options);
    return response.data.data[0].url;
  } catch (e) {
    return `❌ OpenAI Response Error: ${e.response.data.error.message}`;
  }
};

/*
commands(), será para mapear os comandos que chegam como input do usuário
*/
const commands = (client, message) => {
  const iaCommands = {
    davinci3: '/bot',
    dalle: '/img',
  };

  let firstWord = message.text.substring(0, message.text.indexOf(' '));

  switch (firstWord) {
    case iaCommands.davinci3:
      const question = message.text.substring(message.text.indexOf(' '));
      getDavinciResponse(question).then(response => {
        /*
         * Faremos uma validação no message.from
         * para caso a gente envie um comando
         * a response não seja enviada para
         * nosso próprio número e sim para
         * a pessoa ou grupo para o qual eu enviei
         */
        client.sendText(
          message.from === process.env.BOT_NUMBER ? message.to : message.from,
          response
        );
      });
      break;

    case iaCommands.dalle:
      const imgDescription = message.text.substring(message.text.indexOf(' '));
      getDalleResponse(imgDescription, message).then(imgUrl => {
        client.sendImage(
          message.from === process.env.PHONE_NUMBER ? message.to : message.from,
          imgUrl,
          imgDescription,
          'Imagem gerada pela IA DALL-E 🤖'
        );
      });
      break;
  }
};

// cria servidor
const app = express();

app.use(express.json()); //parser used for requests via post,
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    debug: false,
  })
);

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname,
  });
});

// inicia a sessão

create(
  {
    session: 'chat-gpt',
    multidevice: true,
  },

  (base64Qr, asciiQR, attempts, urlCode) => {
    //console.log(asciiQR); // Optional to log the QR in the terminal
    var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
      response = {};
    if (matches.length !== 3) {
      return new Error('Invalid input string');
    }

    response.type = matches[1];
    response.data = new Buffer.from(matches[2], 'base64');

    var imageBuffer = response;

    fs.writeFile(
      'out.png',
      imageBuffer['data'],

      'binary',

      function (err) {
        if (err != null) {
          console.log(err);
        }
      }
    );
  }
)
  .then(client => start(client))
  .catch(erro => {
    console.log(erro);
  });

async function start(client) {
  const port = '8000';

  var server = app.listen(port);
  console.log('Server berjalan pada port %s', server.address().port);
  //sendText
  app.post('/send-message', function (req, res) {
    console.log('Mengirim pesan ke ');
    client
      .sendText(req.body.number, req.body.message)
      .then(result => {
        console.log('Result: ', result); //return object success
        res.json({ status: 'success', response: 'message sent successfully' });
      })
      .catch(erro => {
        console.error('Error when sending: ', erro); //return object error
      });
    client.onAnyMessage(message => commands(client, message));

    /*
            client
                .sendText(req.body.number, req.body.message)
                .then((result) => {
             res.json({status: 'success', response: 'message sent successfully'});
                })
                .catch((erro) => {
                    res.json({status: 'error', response: 'The number is not registered'});
                });
                */
  });

  //auto reply

  client.onMessage(async msg => {
    try {
      if (msg.body == '!ping') {
        // Send a new message to the same chat
        client.sendText(msg.from, 'pong');
      } else if (msg.body == 'hai') {
        // Send a new message to the same chat
        client.sendText(msg.from, 'hallo');
      } else if (msg.body == '!ping reply') {
        // Send a new message as a reply to the current one
        client.reply(msg.from, 'pong', msg.id.toString());
      }
    } catch (e) {
      console.log(e);
    }
  });

  client.onStateChange(state => {
    console.log('State changed: ', state);
    if ('CONFLICT'.includes(state)) client.useHere();
    if ('UNPAIRED'.includes(state)) console.log('logout');
  });
}
