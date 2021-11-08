#!/usr/bin/env node

import { Command } from "commander";
import { createTransport, SendMailOptions } from "nodemailer";
import * as SMTPTransport from "nodemailer/lib/smtp-transport";
// reminder: file extension must be provided.
import { testSmtpServer, testSmtpServerOptions } from
  "../lib/test-smtp-server.js";

interface ISMTPOptions {
  smtpHost: string | undefined;
  smtpOpts?: string | undefined;
  smtpPass: string;
  smtpPort: number | undefined;
  smtpUser: string;
}

const commander = new Command();

commander
  .version(process.env.npm_package_version || "1.0.0")
  .usage("[options]")
  .description(`Run tests for ${process.env.npm_package_name}`)
  .option("--debug", "Trace extra scum messages")
  .option("--port <number>", "port to use for SMTP server.", undefined)
  .option("--host <host>", "SMTP server host name or IP address.", "localhost")
  .parse(process.argv);

interface commanderOptions {
  debug: boolean | undefined;
  host: string | undefined;
  port: number | undefined;
}

const commandOptions = commander.opts<commanderOptions>();

const serverOptions: testSmtpServerOptions = {};

if (commandOptions.debug) {
  serverOptions.debug = console.log;
}

(async (): Promise<void> => {
  const smtpserver = new testSmtpServer(serverOptions);
  smtpserver.startServer();         // start listening

  const smtpOptions: ISMTPOptions = {
    smtpUser: "from@example.com",
    smtpPass: "secrets",
    smtpHost: commandOptions.host,
    smtpPort: commandOptions.port || smtpserver.getPort(),
  };

  const email: SendMailOptions = {
    from: smtpOptions.smtpUser,
    to: "someone@server.com",
    subject: "first test",
    text: "Check it out!"
  };

    const messageId: string[] = [];   // for validation

  messageId.unshift(await sendMail(email, smtpOptions));

  email.subject = "second test";
  messageId.unshift(await sendMail(email, smtpOptions));

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
})().catch((reason: Error) => {
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
async function sendMail(
  mail: SendMailOptions,
  smtpOptions: ISMTPOptions
): Promise<string> {
  const transportOpts: SMTPTransport.Options = {
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

  return new Promise<string>((resolve, reject) => {
    const transporter = createTransport(transportOpts);

    transporter.sendMail(mail, (error, info: { messageId: string }): void => {
      if (error) {
        reject(error);
      } else {
        resolve(info.messageId);
      }
    });
  });
}
