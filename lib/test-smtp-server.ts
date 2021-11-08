import { SMTPServer, SMTPServerEnvelope } from "smtp-server";
import { simpleParser, SimpleParserOptions, ParsedMail } from "mailparser";
import { Writable, Readable } from "stream";

/**
 * Class to describe an email.  The `envelope` contains the SMTP routing
 * information.  This may not match the `to/cc/bcc` information in the
 * email contaents.  The buffer contains the raw email content.  To easily
 * access parts of the email, `getParsed` should be used.
 */
export class eMail {
  envelope: SMTPServerEnvelope;
  buffer: Buffer | null = null;
  length = 0;
  constructor(envelope: SMTPServerEnvelope, buffer: Buffer) {
    this.envelope = envelope;
    this.buffer = buffer;
  }

  /**
   * Return a parsed email as formatted by `simpleParser`.
   *
   * @returns Promise<ParsedMail>  See
   * https://nodemailer.com/extras/mailparser/ for the structure.
   */
  async getParsed(): Promise<ParsedMail> {
    if (this.buffer) {
      const stream = Readable.from(this.buffer);
      const options: SimpleParserOptions = {
        skipHtmlToText: true,
        skipTextLinks : true,
        skipTextToHtml: true

      }
      return simpleParser(stream, options);
    } else {
      throw new Error("Empty email buffer");
    }
  }
}

/**
 * testSmtpServer optional parameters
 */
export type testSmtpServerOptions = {
  /** the port number to use (default: 1025) */
  smtpPort?: number;

  /** logging function like console.log() */
  debug?: (message?: unknown, ...optionalParams: any[]) => void;
}

/**
 * Create a testSmtpServer.  This provides a wrapper to SMTPServer that
 * can be used for testing.  The emails are stored in an array that
 * can be examined to validate the content.
 */
export class testSmtpServer {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private debug = (_message?: unknown, ..._optionalParams: any[]) => {};
  private emails: eMail[] = [];
  private isDebugging = false;
  private port: number;
  private server: SMTPServer;

  public constructor(options?: testSmtpServerOptions | undefined) {
    this.port = 1025;
    if (options) {
      if (options.smtpPort) {
        this.port = options.smtpPort;
      }

      if (options.debug) {
        this.debug = options.debug;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;              // preserve for use in other objects
    this.server = new SMTPServer({
      authOptional: true,
      onConnect(session, callback) {
        if (session.remoteAddress !== "127.0.0.1") {
          return callback(new Error("Only connections from localhost allowed"));
        }

        return callback();          // Accept the connection
      },

      onAuth(auth, _session, callback) {
        that.debug(`SMTP login for user: ${auth.username}`);
        callback(null, { user: auth.username });
      },

      onData(stream, session, callback) {
        const buffers: Buffer[] = [];
        const writer = new Writable({
          write(data: Buffer, _encoding, writerCallback) {
            buffers.push(data);
            writerCallback();
          },
        });
        stream.pipe(writer);
        stream.on("end", () => {
          const buffer = Buffer.concat(buffers);
          const email = new eMail(session.envelope, buffer);
          that.emails.unshift(email);

          if (that.isDebugging) {
            that.debug(JSON.stringify(email,
              (key: string, value: unknown): unknown => {
                if ("buffer" === key) {
                  return buffer.toString();
                } else {
                  return value;
                }
              }, 2));
          }
          callback();
        });
      },
      secure: true,
    });
  }

  /**
   * Clear the set of emails.
   *
   * @returns number of emails deleted
   */
   public clearEmails(): number {
    const count = this.emails.length;
    this.emails.length = 0;
    return count;
  }

  /**
   * Retrieve the set of emails in order from latest to oldest.
   *
   * @returns array of eMail objects
   */
   public getEmails(): eMail[] {
    return this.emails;
  }

  /**
   * Query for the port number used by the server.
   *
   * @returns the port number being used
   */
  public getPort(): number {
    return this.port;
  }

  /** Start the server */
  public startServer(): void {
    this.server.listen(this.port);
  }

  /** Stop the server */
  public stopServer(): void {
    this.server.close();
  }
}
