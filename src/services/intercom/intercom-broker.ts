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
const _SITE_VERBOSE_DEBUG_ = process.env.SITE_VERBOSE_DEBUG;

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
import Logger from '../logger';
import { getConnection } from 'typeorm';

let CA_CERTIFICATE_FILE: string;
let SERVER_PRIVATE_KEY_FILE: string;
let SERVER_CERTIFICATE_FILE: string;
let CLIENT_PRIVATE_KEY_FILE: string;
let CLIENT_CERTIFICATE_FILE: string;

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
  private logger: Logger;
  private verbose: boolean;
  private ready: boolean = false;
  constructor(logger: Logger) {
    this.verbose = _SITE_VERBOSE_DEBUG_ as string === 'true' ? true : false;
    this.logger = logger;
    this.logger.debug(`Starting site '${_SITE_INTERCOM_ID_}' ...`);
    let SSL_CONF: Intercom2_SSL_2WayConf | null = null;
    if (Number(_INTERCOM_MODE_) === 2) {
      try {
        this.logger.info(`Setup SSL for site '${_SITE_INTERCOM_ID_}' ...`);
        setupSSL(String(_INTERCOM_SITENAME_));
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
    this.ic = new Intercom2(SSL_CONF, logger);
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
    this.logger.info(`Setup site '${_SITE_INTERCOM_ID_}' on port '${_SITE_INTERCOM_PORT_}' ...`);
    this.setup();
    this.ready = true;
  }

  public parseFromIntString(
    intString: string,
    precision: number
  ): string {
    let length = intString.length;
    let integers = '0';
    let decimals = '0';
    if (length > precision) {
      integers = intString.substring(0, length - precision);
      decimals = intString.substring(length - precision, length);
    } else {
      integers = '0';
      decimals = '';
      for (let i = 0; i < precision; i++) {
        if (i <= length - 1) {
          decimals += intString.substring(i, i + 1);
        } else {
          decimals = '0' + decimals;
        }
      }
    }
    return `${integers}.${decimals}`;
  }

  private setup() {
    this.ic.configMsgHandler(
      NOTIFY,
      async (
        sender: Intercom2_EndPoint,
        rxData: string,
        sendReply: (txData: string) => void
      ) => {
        if (this.verbose) {
          this.logger.info(
            NOTIFY + ': ' + sender.getContext() + ' sent "' + rxData + '".'
          );
        } else {
          this.logger.info(
            NOTIFY + ': ' + sender.getContext() + ' ACK.'
          );
        }
        var json = JSON.parse(rxData);
        // Get Tx if Exists..
        const txe = await getConnection()
          .createQueryBuilder()
          .select("user_wallet_tx")
          .from('user_wallet_tx')
          .where("user_wallet_tx.txid = :txid", { txid: json.txid })
          .getCount() > 0;

        // Create Tx Entry..
        if (!txe) {
          await getConnection()
            .createQueryBuilder()
            .insert()
            .into('user_wallet_tx')
            .values({
              userId: null,
              txid: json.txid,
              address: "",
              coinType: 0,
              txtype: 1,
              confirms: json.confirmations,
            })
            .execute();
          this.logger.debug("Received New TxID: \'" + json.txid + "\' with \'" + json.confirmations + "\' confirmations.");
        } else {
          // Update Tx Entry Status...
          await getConnection()
            .createQueryBuilder()
            .update('user_wallet_tx')
            .set({ confirms: json.confirmations })
            .where("user_wallet_tx.txid = :txid", { txid: json.txid })
            .execute();
          this.logger.debug("Updated Seen TxID: \'" + json.txid + "\' with \'" + json.confirmations + "\' confirmations.");
        }

        // Get Tx if Exists..
        const tx = await getConnection()
          .createQueryBuilder()
          .select("user_wallet_tx")
          .from('user_wallet_tx')
          .where("user_wallet_tx.txid = :txid", { txid: json.txid })
          .getOne();
        if (tx === undefined) {
          // Error
          this.logger.error("tx is null on lookup..");
        }

        // Check Job
        if (tx !== undefined && json.confirmations >= 1) {
          var inputs: Map<string, { userId: string; balance: string; }> = new Map<string, { userId: string; balance: string; }>();
          for (var bal of json.inputs) {
            // Get Address if Exists..
            const address = await getConnection()
              .createQueryBuilder()
              .select("user_wallet_address")
              .from('user_wallet_address')
              .where("user_wallet_address.address = :addr", { addr: bal.address })
              .getOne();
            let userId = address != undefined ? address.userId : null;
            if (userId != null) {
              let addr: string = address.address;
              inputs.set(addr, { userId, balance: bal.value, vout: bal.vout });
            }
          }
          var users: Map<string, { userId: string; balance: string; }> = new Map<string, { userId: string; balance: string; }>();
          for (var bal of json.outputs) {
            // Get Address if Exists..
            const address = await getConnection()
              .createQueryBuilder()
              .select("user_wallet_address")
              .from('user_wallet_address')
              .where("user_wallet_address.address = :addr", { addr: bal.address })
              .getOne();
            //console.log(JSON.stringify(address));
            let userId = address != undefined ? address.userId : null;
            if (userId != null) {
              //this.logger.info("Address Located for \'" + userId + "\' ... from TxID \'" + json.txid + "\' Vout \'" + bal.vout + "\'");
              let addr: string = address.address;
              users.set(addr, { userId, balance: bal.value, vout: bal.vout });
            }
          }

          // Iterate over matched vouts to users..
          for (var usr of users.keys()) {
            let bal = parseFloat(this.parseFromIntString(users.get(usr).balance, 8));
            let uid = users.get(usr).userId;
            let vout = users.get(usr).vout;
            var t = 3;
            if (usr in inputs.keys()) {
              t = 13;
            }
            var txl = await getConnection()
              .createQueryBuilder()
              .select("user_wallet_tx")
              .from('user_wallet_tx')
              .where("user_wallet_tx.txid = :txid", { txid: json.txid })
              .andWhere("user_wallet_tx.address = :addr", { addr: usr })
              .getOne();
            if (txl === undefined) {
              // Add Tx Entry...
              await getConnection()
                .createQueryBuilder()
                .insert()
                .into('user_wallet_tx')
                .values({
                  userId: uid,
                  txid: json.txid,
                  vout: vout,
                  address: usr,
                  coinType: 0,
                  txtype: t,
                  confirms: json.confirmations,
                  processed: json.confirmations >= 5 ? 2 : 1,
                  amount: bal,
                })
                .execute();
              txl = await getConnection()
                .createQueryBuilder()
                .select("user_wallet_tx")
                .from('user_wallet_tx')
                .where("user_wallet_tx.txid = :txid", { txid: json.txid })
                .andWhere("user_wallet_tx.address = :addr", { addr: usr })
                .getOne();
              this.logger.debug("Added Record for TxID: \'" + json.txid + "::" + vout + "\' with \'" + json.confirmations + "\' confirmations and bal \'" + bal + "\' to user \'" + uid + "\'");
            }
            if (txl === undefined) {
              continue;
            }
            if (txl.confirms >= 1 && !txl.complete) {
              //this.logger.debug("Updated Record for TxID: \'" + json.txid + "\' with \'" + json.confirmations + "\' confirmations and bal " + bal);
              if (txl.txtype < 10 || txl.txtype === 13) {
                // Update Tx Entry...
                await getConnection()
                  .createQueryBuilder()
                  .update('user_wallet_tx')
                  .set({
                    //userId: uid,
                    vout: vout,
                    processed: json.confirmations >= 5 ? 3 : 2,
                    complete: json.confirmations >= 5,
                    amount: bal,
                  })
                  .where("user_wallet_tx.txid = :txid", { txid: json.txid })
                  .andWhere("user_wallet_tx.address = :addr", { addr: usr })
                  .execute();
              } else {
                // Update Tx Entry...
                await getConnection()
                  .createQueryBuilder()
                  .update('user_wallet_tx')
                  .set({
                    vout: vout,
                    processed: json.confirmations >= 5 ? 3 : 2,
                  })
                  .where("user_wallet_tx.txid = :txid", { txid: json.txid })
                  .andWhere("user_wallet_tx.address = :addr", { addr: usr })
                  .execute();
              }
            }
            if (txl.txtype === 10 || txl.txtype === 20) {
              //this.logger.debug("Internal Transfer from site: " + json.txid);
              continue;
            }
            if (txl.txtype === 11 || txl.txtype === 13 || txl.txtype === 21) {
              //this.logger.debug("Internal Transfer to site: " + json.txid);
              continue;
            }
            if (!txl.complete && json.confirmations >= 5) {
              // Get current Balance..
              const userBalance = await getConnection()
                .createQueryBuilder()
                .select("user_wallet_address")
                .from('user_wallet_address')
                .where('user_wallet_address."userId" = :uid', { uid: uid })
                .getOne();
              // Update Balance..
              let ibal: number = parseFloat(userBalance.balance);
              let nbal: number = bal + ibal;
              await getConnection()
                .createQueryBuilder()
                .update('user_wallet_address')
                .set({ balance: nbal })
                .where('user_wallet_address."userId" = :uid', { uid: uid })
                .execute();
              // Update Tx Entry Status...
              await getConnection()
                .createQueryBuilder()
                .update('user_wallet_tx')
                .set({ complete: true })
                .where("user_wallet_tx.txid = :txid", { txid: json.txid })
                .execute();
              this.logger.info("Balance Updated for \'" + uid + "\' ... Added \'" + ibal + "\' to user account! New total: \'" + nbal + "\'");
            } else {
              this.logger.debug("Checked Pending TxID: \'" + json.txid + "::" + vout + "\' with \'" + json.confirmations + "\' confirmations.");
            }
          }
        }

        if (json.confirmations >= 6) {
          var syncs: Map<string, { userId: string; balance: string; }> = new Map<string, { userId: string; balance: string; }>();
          for (var bal of json.balances) {
            // Get Address if Exists..
            const address = await getConnection()
              .createQueryBuilder()
              .select("user_wallet_address")
              .from('user_wallet_address')
              .where("user_wallet_address.address = :addr", { addr: bal.address })
              .getOne();
            //console.log(JSON.stringify(address));
            let userId = address != undefined ? address.userId : null;
            if (userId != null) {
              //this.logger.info("Address Located for \'" + userId + "\' ... from validated TxID \'" + json.txid + "\'");
              syncs.set(address.address, { userId, balance: bal.balance });
            }
          }
          for (var usr of syncs.keys()) {
            let bal = parseFloat(this.parseFromIntString(syncs.get(usr).balance, 8));
            let uid = syncs.get(usr).userId;
            const txl = await getConnection()
              .createQueryBuilder()
              .select("user_wallet_tx")
              .from('user_wallet_tx')
              .where("user_wallet_tx.txid = :txid", { txid: json.txid })
              .andWhere("user_wallet_tx.address = :addr", { addr: usr })
              .getOne();
            if (json.confirmations >= 6 && txl.complete) {
              // Get current Balance..
              const userBalance = await getConnection()
                .createQueryBuilder()
                .select("user_wallet_address")
                .from('user_wallet_address')
                .where('user_wallet_address."userId" = :uid', { uid: uid })
                .getOne();
              // Audit Balance..
              let ibal: number = parseFloat(userBalance.balance);
              let dbal: number = bal - ibal;
              if (dbal !== 0) {
                await getConnection()
                  .createQueryBuilder()
                  .update('user_wallet_address')
                  .set({ balance: bal })
                  .where('user_wallet_address."userId" = :uid', { uid: uid })
                  .execute();
                this.logger.warn("Balance Audited for \'" + uid + "\' ... Updated amount \'" + bal + "\' for user account. Delta total: \'" + dbal.toFixed(8) + "\'");
              }
            }
          }
          await getConnection()
            .createQueryBuilder()
            .delete("user_wallet_tx")
            .from('user_wallet_tx')
            .where("user_wallet_tx.txid = :txid", { txid: json.txid })
            .andWhere("user_wallet_tx.txtype = :type", { type: 1 })
            .execute();
        }

        sendReply('Received NOTIFY');
      }
    );

    this.ic.configMsgHandler(
      HEARTBEAT,
      async (
        sender: Intercom2_EndPoint,
        rxData: string,
        sendReply: (txData: string) => void
      ) => {
        if (this.verbose) {
          this.logger.info(
            HEARTBEAT + ': ' + sender.getContext() + ' sent "' + rxData + '".'
          );
        } else {
          this.logger.info(
            HEARTBEAT + ': ' + sender.getContext() + ' ACK.'
          );
        }
        var json = JSON.parse(rxData);
        const status = await getConnection()
          .createQueryBuilder()
          .select("type")
          .from('user_wallet_status')
          .where("user_wallet_status.type = :type", { type: json.coin })
          .getCount() > 0;
        if (status) {
          getConnection()
            .createQueryBuilder()
            .update('user_wallet_status')
            .set({
              online: json.online,
              synced: json.synced,
              crawling: json.crawling,
              blockheight: json.blockheight,
              blockhash: json.bestBlockHash,
              blocktime: json.blocktime,
              updatedAt: new Date(),
             })
             .where("user_wallet_status.type = :type", {type: json.coin})
             .execute();
        } else {
          getConnection()
            .createQueryBuilder()
            .insert()
            .into('user_wallet_status')
            .values({
              type: json.coin,
              online: json.online,
              synced: json.synced,
              crawling: json.crawling,
              blockheight: json.blockheight,
              blockhash: json.bestBlockHash,
              blocktime: json.blocktime,
            })
            .execute();
        }
        sendReply('Received HEARTBEAT');
      }
    );
    this.ic.startReceiving((e: Error | null) => {
      if (e) {
        this.logger.error(e);
        process.exit(1);
      }
    });
  }

  public isReady(): boolean {
    return this.ready;
  }

  public getId(): number {
    return this.ic.getOwnId();
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
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
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
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
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
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
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
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
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
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
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
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
          }
        }
      }
    );
  }

  // parameter is a wallet account as string
  public getNewAddress(id: string, cb: (error: Error | null, data: any) => void ) {
    this.ic.sendMsg(
      this.wallet,
      NEW_ADDRESS,
      id,
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
          cb(e, null);
        } else {
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              //this.logger.error(new Error(json.message));
              throw new Error(json.message);
            } else {
              //this.logger.info(rxData);
              cb(null, json.message);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              cb(null, rxData);
            } else {
              //this.logger.error(e);
              cb(e, null);
            }
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
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
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
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
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
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
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
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
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
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
          }
        }
      }
    );
  }

  // parameter is a TransactionRequest object @see interface/TransactionRequest
  public sendFunds(request: TransactionRequest, cb: (error: Error | null, data: any) => void) {
    this.ic.sendMsg(
      this.wallet,
      SEND_FUNDS,
      JSON.stringify(request),
      (e: Error | null, rxData: string) => {
        if (e) {
          this.logger.error(e);
          cb(e, null);
        } else {
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              //this.logger.error(new Error(json.message));
              throw new Error(json.message);
            } else {
              //this.logger.info(rxData);
              cb(null, rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              //this.logger.error(rxData);
              cb(null, rxData);
            } else {
              //this.logger.error(e);
              cb(e, null);
            }
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
          let json;
          try {
            json = JSON.parse(rxData);
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
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
            if (json != undefined && json.isError === true) {
              this.logger.error(new Error(json.message));
            } else {
              this.logger.info(rxData);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              this.logger.error(rxData);
            } else {
              this.logger.error(e);
            }
          }
        }
      }
    );
  }
}
