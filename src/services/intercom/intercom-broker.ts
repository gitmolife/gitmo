/*
 * Copyright 2020-2021 Cryptech Services
 *
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 *
 */

const _INTERCOM_MODE_ = process.env.INTERCOM_MODE;
const _INTERCOM_ID_ = process.env.INTERCOM_ID;
const _INTERCOM_PORT_ = process.env.INTERCOM_PORT;
const _INTERCOM_SITENAME_ = process.env.INTERCOM_SITENAME;
const _INTERCOM_PASSPHRASE_ = process.env.INTERCOM_PASSPHRASE;
const _SITE_INTERCOM_ID_ = process.env.SITE_INTERCOM_ID;
const _SITE_INTERCOM_PORT_ = process.env.SITE_INTERCOM_PORT;
const _SITE_INTERCOM_HOST_ = process.env.SITE_INTERCOM_HOST;

import {
  ADDRESSES,
  ADDRESS_BALANCE,
  BEST_BLOCK_HASH,
  CRAWL,
  HEARTBEAT,
  ID_BALANCE,
  INFO,
  NEW_ADDRESS,
  NOTIFY,
  REINDEX,
  REPLAY,
  RESCAN,
  RESTART,
  RESYNC,
  SEND_FUNDS,
  START,
  STOP,
} from './message-id';
import TransactionRequest from './transaction-request';
import {
  Intercom2,
  Intercom2_EndPoint,
  Intercom2_SSL_2WayConf,
} from './intercom2/src/intercom2';

let CA_CERTIFICATE_FILE;
let SERVER_PRIVATE_KEY_FILE;
let SERVER_CERTIFICATE_FILE;
let CLIENT_PRIVATE_KEY_FILE;
let CLIENT_CERTIFICATE_FILE;

function setupSSL(site: string) {
  const path = require('path');
  CA_CERTIFICATE_FILE = path.join(__dirname, '..', '..', '..', '.config', 'cert', 'CA.pem');
  SERVER_PRIVATE_KEY_FILE = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '.config',
    'cert',
    site,
    'server.key'
  );
  SERVER_CERTIFICATE_FILE = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '.config',
    'cert',
    site,
    'server.pem'
  );
  CLIENT_PRIVATE_KEY_FILE = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '.config',
    'cert',
    site,
    'client.key'
  );
  CLIENT_CERTIFICATE_FILE = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '.config',
    'cert',
    site,
    'client.pem'
  );
}

export default class IntercomBroker {
  private ic: Intercom2;
  private wallet: Intercom2_EndPoint;
  private logger: object;
  constructor(logger: object) {
    this.logger = logger;
    this.logger.info(`Starting Broker for site '${_SITE_INTERCOM_ID_}' ...`);
    let SSL_CONF: Intercom2_SSL_2WayConf | null = null;
    if (Number(_INTERCOM_MODE_) === 2) {
      try {
        this.logger.info(`Setup Broker SSL for site '${_SITE_INTERCOM_ID_}' ...`);
        setupSSL(_INTERCOM_SITENAME_);
        this.logger.debug(`Using CA Cert file '${CA_CERTIFICATE_FILE}'`);
        SSL_CONF = new Intercom2_SSL_2WayConf()
          .setPassphrase(_INTERCOM_PASSPHRASE_ as string)
          .addRootCert(CA_CERTIFICATE_FILE)
          .setServerCert(SERVER_PRIVATE_KEY_FILE, SERVER_CERTIFICATE_FILE)
          .setClientCert(CLIENT_PRIVATE_KEY_FILE, CLIENT_CERTIFICATE_FILE);
      } catch (e) {
        this.logger.error(e);
        process.exit(1);
      }
    }
    this.ic = new Intercom2(SSL_CONF);
    this.ic.configSelf(
      Number(_SITE_INTERCOM_ID_),
      Number(_SITE_INTERCOM_PORT_)
    );

    this.wallet = this.ic.configEndPoint(
      Number(_INTERCOM_ID_),
      'wallet',
      _SITE_INTERCOM_HOST_ as string,
      Number(_INTERCOM_PORT_),
      (e: Error) => {
        this.logger.error(e);
      }
    );
    this.logger.debug(`Setup Broker for site '${_SITE_INTERCOM_ID_}' on port '${_SITE_INTERCOM_PORT_}' ...`);
    this.setup();
  }

  private setup() {
    this.ic.configMsgHandler(
      NOTIFY,
      (
        sender: Intercom2_EndPoint,
        rxData: string,
        sendReply: (txData: string) => void
      ) => {
        this.logger.info(
          NOTIFY + ': ' + sender.getContext() + ' sent "' + rxData + '".'
        );
        sendReply('Recieved NOTIFY');
      }
    );

    this.ic.configMsgHandler(
      HEARTBEAT,
      (
        sender: Intercom2_EndPoint,
        rxData: string,
        sendReply: (txData: string) => void
      ) => {
        this.logger.info(
          HEARTBEAT + ': ' + sender.getContext() + ' sent "' + rxData + '".'
        );
        sendReply('Recieved HEARTBEAT');
      }
    );
    this.ic.startReceiving((e: Error | null) => {
      if (e) {
        this.logger.error(e);
        process.exit(1);
      }
    });
  }

  public start() {
    this.ic.sendMsg(
      this.wallet,
      START,
      null,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }

  public stop() {
    this.ic.sendMsg(
      this.wallet,
      STOP,
      null,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }

  public restart() {
    this.ic.sendMsg(
      this.wallet,
      RESTART,
      null,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }

  public reindex() {
    this.ic.sendMsg(
      this.wallet,
      REINDEX,
      null,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }

  public resync() {
    this.ic.sendMsg(
      this.wallet,
      RESYNC,
      null,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }

  public rescan() {
    this.ic.sendMsg(
      this.wallet,
      RESCAN,
      null,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }

  // parameter is a wallet account as string
  public getNewAddress(id: string) {
    this.ic.sendMsg(
      this.wallet,
      NEW_ADDRESS,
      id,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }
  // parameter is a wallet account as string
  public getAddresses(id: string) {
    this.ic.sendMsg(
      this.wallet,
      ADDRESSES,
      `${id}`,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }

  // parameter is a wallet address as string
  public addressBalance(address: string) {
    this.ic.sendMsg(
      this.wallet,
      ADDRESS_BALANCE,
      address,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }
  // parameter is a wallet account as string
  public idBalance(id: string) {
    this.ic.sendMsg(
      this.wallet,
      ID_BALANCE,
      id,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }

  public bestBlockHash() {
    this.ic.sendMsg(
      this.wallet,
      BEST_BLOCK_HASH,
      null,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }

  public info() {
    this.ic.sendMsg(
      this.wallet,
      INFO,
      null,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }

  // parameter is a TransactionRequest object @see interface/TransactionRequest
  public sendFunds(request: TransactionRequest) {
    this.ic.sendMsg(
      this.wallet,
      SEND_FUNDS,
      JSON.stringify(request),
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }

  // parameter is a transaction id as string
  public replay(txid: string) {
    this.ic.sendMsg(
      this.wallet,
      REPLAY,
      txid,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json = JSON.parse(rxData);
          if (json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }

  // parameter is a blockhash or height integer as a string
  public crawl(block: string) {
    this.ic.sendMsg(
      this.wallet,
      CRAWL,
      block,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
        } else {
          let json;
          try {
            json = JSON.parse(rxData);
          } catch (e) {}
          if (json != undefined && json.isError === true) {
            this.logger.error(new Error(json.message));
          } else {
            this.logger.info(rxData);
          }
        }
      }
    );
  }
}
