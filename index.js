const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch')
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const parseString = require('xml2js');

require('dotenv').config()

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define the Twilio credentials and phone number
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const twilioPhoneNumber = process.env.TWILIO_PHONE;

// Set up your OpenAI API key and model
const OPENAI_API_KEY = process.env.OPEN_AI_KEY;
const OPENAI_MODEL = process.env.OPEN_AI_MODEL;

// Listen for incoming messages on the /whatsapp endpoint
app.post('/whatsapp', async (req, res) => {
  const incomingMsg = req.body.Body;
  console.log(req.body)
  // Use OpenAI's ChatGPT to generate a response
  const response = await fetch(`https://api.openai.com/v1/engines/${OPENAI_MODEL}/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      prompt: incomingMsg,
      max_tokens: 150,
      n: 1,
      stop: '\n',
    }),
  });
  const responseData = await response.json();
  console.log(responseData)
  let chatGPTResponse = responseData.choices[0].text;
  let isEmpty=false
  if(chatGPTResponse===''){
    isEmpty=true
    chatGPTResponse='Please wait for some time we cannot process your request for some time'
  }
  console.log('after alteration : '+chatGPTResponse)

  // Send a response back to the user
  const twiml = new MessagingResponse();
  twiml.message(chatGPTResponse);
  let message = ''
  // console.log(twiml.toString())
  var parser = new parseString.Parser();
  parser.parseString(twiml, (err, data) => {
    if(isEmpty){
      message = chatGPTResponse
    }else{
      message = data['Response']['Message'][0]
    }
  })

  // Use the Twilio API to send the response
  client.messages.create({
    from: `whatsapp:${twilioPhoneNumber}`,
    to: `whatsapp:${req.body.From}`,
    body: `${message}`
  });

  // Send a response to acknowledge receipt of the message
  res.status(200).send('Message received');
});

// Start the server
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});