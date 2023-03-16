import { create } from 'venom-bot';
import express from 'express';
import fileUpload from 'express-fileupload';
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

create({
  session: 'chat-gpt',
  multidevice: true,
})
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
