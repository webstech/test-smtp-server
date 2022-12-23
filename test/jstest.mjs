/**
 * JS Module version of index.ts for testing.
 *
 * Changes to tests in index.ts should also be done here to ensure comerage.
 *
 *
 * This should be run using npm to make the package.json values
 * available as env vars.
 */

import { Command } from "commander/esm.mjs";
import { createTransport } from "nodemailer";
import { testSmtpServer } from "../build/lib/test-smtp-server.js";

const commander = new Command();

commander
  .version(process.env.npm_package_version || "1.0.0")
  .usage("[options]")
  .description(`Run tests for ${process.env.npm_package_name}`)
  .option("--debug", "Trace extra scum messages")
  .option("--port <number>", "port to use for SMTP server.", undefined)
  .option("--host <host>", "SMTP server host name or IP address.", "localhost")
  .parse(process.argv);

const commandOptions = commander.opts();

const serverOptions = {};

if (commandOptions.debug) {
  serverOptions.debug = console.log;
}

(async () => {
  const smtpserver = new testSmtpServer(serverOptions);
  smtpserver.startServer();         // start listening

  const smtpOptions = {
    smtpUser: "from@example.com",
    smtpPass: "secrets",
    smtpHost: commandOptions.host,
    smtpPort: commandOptions.port || smtpserver.getPort(),
  };

  const email = {
    from: smtpOptions.smtpUser,
    to: "someone@server.com",
    subject: "first test",
    text: "Check it out!"
  };

  const messageId = [];   // for validation

  messageId.push(await sendMail(email, smtpOptions));

  email.subject = "second test";
  messageId.push(await sendMail(email, smtpOptions));

  const mails = smtpserver.getEmails();

  // validate/dump emails

  if (mails.length) {
    let entry = 0;

    for (const mail of mails) {
      console.log(`Checking mail entry <${entry}>`);
      console.log(mail.envelope);
      const parsed = await mail.getParsed();

      if (parsed.messageId !== messageId[entry]) {
        throw new Error(`Messageids do not match for email ${entry} <${
          parsed.messageId}> <${messageId[entry]}>`);
      }

      console.log(JSON.stringify(parsed, null, 2));
      entry++;
    }
  } else {
    throw new Error("No emails captured when expected");
  }

  smtpserver.stopServer();          // terminate server

})().catch((reason) => {
  console.log(`Caught error ${reason}:\n${reason.stack}\n`);
  process.exit(1);
});

/**
 * Send an email via nodemailer.
 *
 * @param mail document with an email to send
 * @param smtpOptions possible host/port/user info
 * @returns message id
 */
async function sendMail(mail,
  smtpOptions) {
  const transportOpts = {
    auth: {
      pass: smtpOptions.smtpPass,
      user: smtpOptions.smtpUser,
    },
    port: smtpOptions.smtpPort,
    host: smtpOptions.smtpHost,
    secure: true,
    tls: {
      rejectUnauthorized: false
    }
  };

  return new Promise((resolve, reject) => {
    const transporter = createTransport(transportOpts);

    transporter.sendMail(mail, (error, info) => {
      if (error) {
        reject(error);
      } else {
        resolve(info.messageId);
      }
    });
  });
}
