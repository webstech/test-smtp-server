# Test SMTP Server

Test SMTP Server is a lightweight wrapper for
[smtp-server](<https://nodemailer.com/extras/smtp-server/>).
It is primarily intended for development and testing.  The test code can start the server, run email tests and then validate the email contents.  It can replace the use of external fake SMTP services which may have availablility issues.

All received emails are stored in an array in the order received.  The emails
may be viewed as raw data or a parsed object that is easily examined.

## Getting Started

### Prerequisites

Tested on Node v16 with npm v7.

### Installation

```sh
npm install test-smtp-server --save-dev
```

### Usage

See [test code](
https://github.com/webstech/test-smtp-server/blob/main/test/index.ts) for an example.

```js
import { testSmtpServer } from "test-smtp-server";

(async (): Promise<void> => {
  const smtpserver = new testSmtpServer();
  await smtpserver.startServer();   // start listening

  // send some emails capturing ids ..
  messageId.push( await sendMail(email, smtpOptions));

  // get emails in sent order
  const mails = smtpserver.getEmails();

  // validate/dump emails

  if (mails.length) {
    let entry = 0;
    for (const mail of mails) {
      console.log(`Checking mail entry <${entry}>`);
      console.log(mail.envelope);
      const parsed = await mail.getParsed();
      if (parsed.messageId !== messageId[entry]) {
        throw new Error(`Messageids do not match for email ${
          entry} <${parsed.messageId}> <${messageId[entry]}>`);
      }

      console.log(parsed);
      entry++;
    }
  } else {
    throw new Error("No emails captured when expected");
  }

  await smtpserver.stopServer();    // terminate server
```

### Security

The server is started as secure but that may not be possible in the testing
environment.  If the server does not have a valid certificate, the connection
will fail from the client side. Some clients
(e.g. nodemailer/SMTP-Transport options) allow connections to non-secure
servers.  Node allows connections through an
environment variable that turns off certificate authorization checking.  See
[node_tls_reject_unauthorizedvalue](
https://nodejs.org/api/cli.html#node_tls_reject_unauthorizedvalue)
for more information.  This may be insecure if other ports are used.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
