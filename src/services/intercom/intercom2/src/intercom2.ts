/*
 * Copyright 2021 Cryptech Services
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
 */

 ////////////////////////////////////////////////////////////////////////////////
// intercom2.ts by loma oopaloopa



import fs = require("fs");
import dns = require("dns");
import { LookupAddress } from "dns";
import http = require("http");
import { IncomingMessage, ServerResponse } from "http";
import https = require("https");
import { RequestOptions, ServerOptions } from "https";

import express = require("express");
import { Request, Response } from "express-serve-static-core";
import IPAddress = require("ip-address");

import { lhttp_read, lhttp_write } from "./lib/lhttp/lhttp";
import { NmsPart } from "./lib/lhttp/nms";

export
    {
    Intercom2,
    Intercom2_SSL_Conf,
    Intercom2_SSL_2WayConf,
    Intercom2_SSL_SimpleConf,
    Intercom2_EndPoint,
    Intercom2_Error,
    Intercom2_UnconfiguredMsgIdError,
    Intercom2_UnconfiguredEndPointError,
    Intercom2_NetworkTimeoutError,
    Intercom2_DNSLookupError,
    Intercom2_NotSSLError,
    Intercom2_ImposterError,
    INTERCOM2_URI
    };



////////////////////////////////////////////////////////////////////////////////



const INTERCOM2_URI          = "/intercom2/";
const REQUEST_TIMEOUT_MILLIS = 60*1000;
const CH_DOT                 = ".".charCodeAt(0);
const CH_ZERO                = "0".charCodeAt(0);
const CH_NINE                = "9".charCodeAt(0);



////////////////////////////////////////////////////////////////////////////////



class Intercom2_Error extends Error
    {
    public constructor(errorMsg : string)
        {
        super(errorMsg);
        }
    }



class Intercom2_UnconfiguredMsgIdError extends Intercom2_Error
    {
    private msgId : string | null;

    public constructor(msgId : string)
        {
        super(`Intercom2: An unconfigured msgId has been received: ${msgId}`);
        this.msgId = msgId;
        }

    public getMsgId() : string | null
        {
        return this.msgId;
        }
    }



class Intercom2_UnconfiguredEndPointError extends Intercom2_Error
    {
    public constructor()
        {
        super("Intercom2: A message has been received from an unconfigured end point. (Incorrect intercom id?)");
        }
    }



class Intercom2_NetworkTimeoutError extends Intercom2_Error
    {
    private msgId : string | null;
    private protocollessURL : string | null;

    public constructor(msgId : string, protocollessURL : string)
        {
        super(`Intercom2: Network timeout sending ${msgId} message to ${protocollessURL} at ${REQUEST_TIMEOUT_MILLIS / 1000} seconds.`);
        this.msgId = msgId;
        this.protocollessURL = protocollessURL;
        }

    public getMsgId() : string | null
        {
        return this.msgId;
        }

    public getProtocollessURL() : string | null
        {
        return this.protocollessURL;
        }
    }



class Intercom2_DNSLookupError extends Intercom2_Error
    {
    private id : number;
    private host : string;

    public constructor(id : number, host : string, errMsg : string)
        {
        super(`Intercom2: DNS lookup error for host ${host} at intercom2 id ${id}. ${errMsg}`);
        this.id = id;
        this.host = host;
        }

    public getIntercomId() : number
        {
        return this.id;
        }

    public getHost() : string
        {
        return this.host;
        }
    }



class Intercom2_NotSSLError extends Intercom2_Error
    {
    private ipAddr : string;

    public constructor(remoteIPAddr : string)
        {
        super(`Intercom2: IP address ${remoteIPAddr} has attempted a non SSL connection.`);
        this.ipAddr = remoteIPAddr;
        }

    public getOffendingIPAddr() : string
        {
        return this.ipAddr;
        }
    }



class Intercom2_ImposterError extends Intercom2_Error
    {
    private id : number;
    private ipAddr : string;

    public constructor(id : number, remoteIPAddr : string)
        {
        super(`Intercom2: Imposter! IP address ${remoteIPAddr} doesn't match what was given to configEndPoint() for intercom2 endpoint id ${id}.`);
        this.id = id;
        this.ipAddr = remoteIPAddr;
        }

    public getIntercomId() : number
        {
        return this.id;
        }

    public getImposterIpAddress() : string
        {
        return this.ipAddr;
        }
    }



////////////////////////////////////////////////////////////////////////////////



function defaultErrorHandler(e : Error) : void
    {
    console.log("Intercom2: defaultErrorHandler() invoked, error dump follows");
    console.log(e);
    throw e;
    }



////////////////////////////////////////////////////////////////////////////////



interface Intercom2_EndPoint
    {
    getId()              : number;
    getContext()         : any;
    getHost()            : string;
    getIPAddress()       : string;
    getPort()            : number;
    getProtocollessURL() : string;
    }



class EndPoint implements Intercom2_EndPoint
    {
    public id : number = 0;
    public context : any = null;
    public host : string = "";
    public ipAddr : string = "";
    public uri : string = "";
    public port : number = 0;
    public ipAddrs : Map<string, boolean> = new Map<string, boolean>(); // avoiding Set<> for compatability with a greater number of versions of Javascript.
    public dnsLookupDone : boolean = false;
    public dnsLookupDoneHandlers : (() => any)[] = [ ];
    public errorHandler : (e : Error) => any = defaultErrorHandler;

    public constructor(id : number)
        {
        this.id = id;
        }

    public getId() : number
        {
        return this.id;
        }

    public getContext() : any
        {
        return this.context;
        }

    public getHost() : string
        {
        return this.host;
        }

    public getIPAddress() : string
        {
        return this.ipAddr;
        }

    public getPort() : number
        {
        return this.port;
        }

    public getProtocollessURL() : string
        {
        return this.port ? `${this.host}:${this.port}${this.uri}` : `${this.host}${this.uri}`;
        }

    public url(useSSL : boolean) : string
        {
        return `${useSSL ? "https" : "http"}://${this.getProtocollessURL()}`;
        }

    public startDNSLookup(host : string) : void
        {
        this.host = host;
        this.ipAddr = "";
        const options =
            {
            family:   0,
            all:      true,
            verbatim: true
            };
        dns.lookup(host, options, (e : Error | null, addresses : string | LookupAddress[]) : void =>
            {
            if (e)
                this.errorHandler(new Intercom2_DNSLookupError(this.id, this.host, e.message));
            else
                {
                for (const a of addresses as LookupAddress[])
                    {
                    switch (a.family)
                        {
                        case 4: this.addIP4(a.address); break;
                        case 6: this.addIP6(a.address); break;
                        }
                    }
                }
            this.dnsLookupDone = true;
            if (!this.ipAddr) this.errorHandler(new Intercom2_DNSLookupError(this.id, this.host, `DNS unable to lookup hostname ${this.host}`));
            for (const handler of this.dnsLookupDoneHandlers) handler();
            this.dnsLookupDoneHandlers = [ ];
            });
        }

    public addDNSLookupDoneHandler(handler : () => any) : void
        {
        this.dnsLookupDoneHandlers[this.dnsLookupDoneHandlers.length] = handler;
        }

    private addIP4(addr : string) : void
        {
        addr = new IPAddress.Address4(addr).correctForm();
        if (!this.ipAddr) this.ipAddr = addr;
        if (addr == "127.0.0.1")
            this.addLoopbackIPs();
        else
            {
            const wrappedA = new IPAddress.Address6(`::${addr}`).correctForm().toUpperCase();
            const wrappedB = `::FFFF:${wrappedA.substr(2)}`;
            this.ipAddrs.set(addr, true);
            this.ipAddrs.set(wrappedA, true);
            this.ipAddrs.set(wrappedB, true);
            }
        }

    private addIP6(addr : string) : void
        {
        addr = new IPAddress.Address6(addr).correctForm().toUpperCase();
        if (!this.ipAddr) this.ipAddr = addr;
        if (!addr.startsWith("::") || addr == "::")
            this.ipAddrs.set(addr, true);
        else if (addr == "::FFFF:7F00:1" || addr == "::7F00:1" || addr == "::1")
            this.addLoopbackIPs();
        else
            {
            const parts = addr.substr(2).split(":");
            switch (parts.length)
                {
                case 1:
                    this.addIP4Wrapped6("0", parts[0]);
                    break;
                case 2:
                    this.addIP4Wrapped6(parts[0], parts[1]);
                    break;
                case 3:
                    if (parts[0] == "FFFF")
                        this.addIP4Wrapped6(parts[1], parts[2]);
                    else
                        this.ipAddrs.set(addr, true);
                    break;
                default:
                    this.ipAddrs.set(addr, true);
                    break;
                }
            }
        }

    private addIP4Wrapped6(hi : string, lo : string) : void
        {
        if (hi == "0")
            this.ipAddrs.set(new IPAddress.Address6(`::${lo}`).correctForm().toUpperCase(), true);
        else
            this.ipAddrs.set(new IPAddress.Address6(`::${hi}:${lo}`).correctForm().toUpperCase(), true);
        this.ipAddrs.set(new IPAddress.Address6(`::FFFF:${hi}:${lo}`).correctForm().toUpperCase(), true);
        }

    private addLoopbackIPs() : void
        {
        this.ipAddrs.set("127.0.0.1", true);
        this.ipAddrs.set("::FFFF:7F00:1", true);
        this.ipAddrs.set("::7F00:1", true);
        this.ipAddrs.set("::1", true);
        }

    public hasIPAddress(addr : string) : boolean
        {
        addr = this.addressIsIP4(addr) ? new IPAddress.Address4(addr).correctForm() : new IPAddress.Address6(addr).correctForm().toUpperCase();
        if (this.ipAddrs.has(addr))
            {
            this.ipAddr = addr;
            return true;
            }
        else
            return false;
        }

    private addressIsIP4(ipAddr : string) : boolean
        {
        const len = ipAddr.length;
        let digitCount = 0;
        let n = 0;
        let dotCount = 0;
        for (let i = 0; i < len; i++)
            {
            const ch = ipAddr.charCodeAt(i);
            if (ch == CH_DOT)
                {
                if (dotCount == 3 || digitCount == 0) return false;
                digitCount = 0;
                n = 0;
                dotCount++;
                }
            else if (CH_ZERO <= ch && ch <= CH_NINE)
                {
                digitCount++;
                n = 10*n + ch - CH_ZERO;
                if (n > 255) return false;
                }
            else
                return false;
            }
        return dotCount == 3 && digitCount > 0;
        }
    
    public makeWebRequestOpts(sslConf : Intercom2_SSL_Conf | null, byteLen : number, uriExtension : string | null) : RequestOptions
        {
        let opts : RequestOptions =
            {
            hostname: this.host,
            path:     uriExtension ? this.uri + uriExtension : this.uri,
            method:   "POST",
            headers:
                {
                "Content-Type":   "text/plain; charset=UTF-8",
                "Content-Length": byteLen
                }
            };
        if (this.port) opts["port"] = this.port;
        if (sslConf) sslConf.setClientCredentials(opts);
        return opts;
        }
    }



////////////////////////////////////////////////////////////////////////////////



interface Intercom2_SSL_Conf
    {
    getServerCredentials() : ServerOptions;
    getClientCredentials() : RequestOptions;
    setServerCredentials(opts : ServerOptions) : void;
    setClientCredentials(opts : RequestOptions) : void;
    }



class Intercom2_SSL_2WayConf implements Intercom2_SSL_Conf
    {
    private serverCreds : ServerOptions = { ca: [ ], key: "", cert: "" };
    private clientCreds : RequestOptions = { ca: [ ], key: "", cert: "" };

    public setPassphrase(passphrase : string) : Intercom2_SSL_2WayConf
        {
        this.serverCreds["passphrase"] = this.clientCreds["passphrase"] = passphrase;
        return this;
        }

    public setServerPassphrase(passphrase : string) : Intercom2_SSL_2WayConf
        {
        this.serverCreds["passphrase"] = passphrase;
        return this;
        }

    public setClientPassphrase(passphrase : string) : Intercom2_SSL_2WayConf
        {
        this.clientCreds["passphrase"] = passphrase;
        return this;
        }

    public addRootCert(certFile : string) : Intercom2_SSL_2WayConf
        {
        const certStr = fs.readFileSync(certFile, "utf8");
        (this.serverCreds.ca as string[]).push(certStr);
        (this.clientCreds.ca as string[]).push(certStr);
        return this;
        }

    public setServerCert(keyFile : string, certFile : string) : Intercom2_SSL_2WayConf
        {
        this.serverCreds.key = fs.readFileSync(keyFile, "utf8");
        this.serverCreds.cert = fs.readFileSync(certFile, "utf8");
        return this;
        }

    public setClientCert(keyFile : string, certFile : string) : Intercom2_SSL_2WayConf
        {
        this.clientCreds.key = fs.readFileSync(keyFile, "utf8");
        this.clientCreds.cert = fs.readFileSync(certFile, "utf8");
        return this;
        }

    public getServerCredentials() : ServerOptions
        {
        return this.serverCreds as ServerOptions;
        }

    public getClientCredentials() : RequestOptions
        {
        return this.clientCreds as RequestOptions;
        }

    public setServerCredentials(opts : ServerOptions) : void
        {
        opts["ca"] = this.serverCreds.ca;
        if (this.serverCreds.passphrase) opts["passphrase"] = this.serverCreds.passphrase;
        opts["key"] = this.serverCreds.key;
        opts["cert"] = this.serverCreds.cert;
        }

    public setClientCredentials(opts : RequestOptions) : void
        {
        opts["ca"] = this.clientCreds.ca;
        if (this.clientCreds.passphrase) opts["passphrase"] = this.clientCreds.passphrase;
        opts["key"] = this.clientCreds.key;
        opts["cert"] = this.clientCreds.cert;
        }
    }



class Intercom2_SSL_SimpleConf implements Intercom2_SSL_Conf
    {
    private serverCreds : ServerOptions = { key: "", cert: "" };
    private clientCreds : RequestOptions = { rejectUnauthorized: false, agent: false };

    public setPassphrase(passphrase : string) : Intercom2_SSL_SimpleConf
        {
        this.serverCreds["passphrase"] = passphrase;
        return this;
        }

    public setServerPassphrase(passphrase : string) : Intercom2_SSL_SimpleConf
        {
        this.serverCreds["passphrase"] = passphrase;
        return this;
        }

    public setServerCert(keyFile : string, certFile : string) : Intercom2_SSL_SimpleConf
        {
        this.serverCreds.key = fs.readFileSync(keyFile, "utf8");
        this.serverCreds.cert = fs.readFileSync(certFile, "utf8");
        return this;
        }

    public getServerCredentials() : ServerOptions
        {
        return this.serverCreds;
        }

    public getClientCredentials() : RequestOptions
        {
        return this.clientCreds;
        }

    public setServerCredentials(opts : ServerOptions) : void
        {
        opts["key"] = this.serverCreds.key;
        if (this.serverCreds.passphrase) opts["passphrase"] = this.serverCreds.passphrase;
        opts["cert"] = this.serverCreds.cert;
        }

    public setClientCredentials(opts : RequestOptions) : void
        {
        opts["rejectUnauthorized"] = this.clientCreds.rejectUnauthorized;
        opts["agent"] = this.clientCreds.agent;
        }
    }



////////////////////////////////////////////////////////////////////////////////



class Intercom2
    {
    private sslConf : Intercom2_SSL_Conf | null = null;
    private app = express();
    private ownUriExtension = "";
    private ownPort = 0;
    private ownId = 0;
    private msgsById : Map<string, (sender : Intercom2_EndPoint, rxData : string, sendReply : (txData : string) => void) => any> = new Map<string, (sender : Intercom2_EndPoint, rxData : string, sendReply : (txData : string) => void) => any>();
    private endPointsById : Map<number, EndPoint> = new Map<number, EndPoint>();

    public constructor(sslConf : Intercom2_SSL_Conf | null = null)
        {
        this.sslConf = sslConf;
        }

    public configSelf(id : number, port : number) : void
        {
        if (id <= 0) throw new Error("Intercom2: Only positive id values are allowed.");
        this.ownUriExtension = `?${id}`;
        this.ownPort = port;
        this.ownId = id;
        }

    public getOwnPort() : number
        {
        return this.ownPort;
        }

    public getOwnId() : number
        {
        return this.ownId;
        }

    public configEndPoint(id : number, context : any, host : string, port : number, errorHandler : (e : Error) => any) : Intercom2_EndPoint
        {
        if (id <= 0) throw new Error("Intercom2: Only positive id values are allowed.");
        const ep = this.findOrMakeEndPoint(id);
        ep.context = context;
        ep.uri = INTERCOM2_URI;
        ep.port = port;
        ep.errorHandler = errorHandler;
        ep.startDNSLookup(host);
        return ep;
        }

    public configMsgHandler(msgId : string, msgHandler : (sender : Intercom2_EndPoint, rxData : string, sendReply : (txData : string) => void) => any) : void
        {
        this.msgsById.set(msgId, msgHandler);
        }

    private findOrMakeEndPoint(id : number) : EndPoint
        {
        let ep : EndPoint | undefined = this.endPointsById.get(id);
        if (!ep)
            {
            ep = new EndPoint(id);
            this.endPointsById.set(id, ep);
            }
        return ep!;
        }

    public startReceiving(eventHandler : (e : Error | null) => any) : void
        {
        this.app.post(INTERCOM2_URI, (req : Request, res : Response) : void  =>
            {
            if (this.sslConf && !req.secure)
                {
                res.end();
                eventHandler(new Intercom2_NotSSLError(req.connection.remoteAddress!));
                }
            this.endPointFromReq(req, eventHandler, (ep : EndPoint | null) : void =>
                {
                if (!ep)
                    res.end();
                else
                    {
                    const immediateData = NmsPart.readMany(req, 2, "utf8", (e : Error | null, data : NmsPart[]) : void =>
                        {
                        this.msgReceived(res, ep, e, data);
                        });
                    if (immediateData) this.msgReceived(res, ep, null, immediateData);
                    }
                });
            });
        const server = this.sslConf ? https.createServer(this.sslConf.getServerCredentials(), this.app) : http.createServer(this.app);
        server.on("error", (e : Error) : void =>
            {
            eventHandler(e);
            });
        server.listen(this.ownPort, () : void =>
            {
            const protocol = this.sslConf ? "https" : "http";
            console.log(`Intercom2: ID ${this.ownId} listening at ${protocol}://localhost:${this.ownPort}${INTERCOM2_URI}`);
            eventHandler(null);
            });
        }

    private endPointFromReq(req : IncomingMessage, eventHandler : (e : Error | null) => any, endPointFound : (ep : EndPoint | null) => any) : void
        {
        const uri1 : string | undefined = req.url;
        if (!uri1)
            {
            eventHandler(new Error("Intercom2: Incomming web service request has no url property(!)"));
            endPointFound(null);
            return;
            }
        const uri = uri1 as string;
        const qpos = uri.indexOf("?");
        const ep  = this.endPointsById.get(qpos < 0 ? 0 : Number.parseInt(uri.substr(qpos + 1)));
        if (!ep)
            {
            const e = new Intercom2_UnconfiguredEndPointError();
            eventHandler(e);
            endPointFound(null);
            }
        else
            this.imposterCheck(ep, req, endPointFound);
        }

    private imposterCheck(ep : EndPoint, req : IncomingMessage, endPointFound : (ep : EndPoint | null) => any) : void
        {
        if (ep.ipAddr)
            this.actualImposterCheck(ep, req, endPointFound);
        else
            ep.addDNSLookupDoneHandler(() : void => { this.actualImposterCheck(ep, req, endPointFound); });
        }

    private actualImposterCheck(ep : EndPoint, req : IncomingMessage, endPointFound : (ep : EndPoint | null) => any) : void
        {
        const remoteIPAddr = req.connection.remoteAddress!;
        if (ep.hasIPAddress(remoteIPAddr))
            endPointFound(ep);
        else
            {
            ep.errorHandler(new Intercom2_ImposterError(ep.id, remoteIPAddr));
            endPointFound(null);
            }
        }

    private msgReceived(res : ServerResponse, ep : EndPoint, e : Error | null, msgData : NmsPart[]) : void
        {
        if (e)
            {
            res.end();
            ep.errorHandler(e);
            return;
            }
        const msgHandler = this.msgsById.get(msgData[0].toString());
        if (!msgHandler)
            {
            res.end();
            ep.errorHandler(new Intercom2_UnconfiguredMsgIdError(msgData[0].toString()));
            return;
            }
        let hadError = false;
        res.on("error", (e : Error) : void =>
            {
            hadError = true;
            if (e) ep.errorHandler(e);
            });
        msgHandler(ep, msgData[1].toString(), (txData : string) : void =>
            {
            if (!hadError && txData.length > 0)
                {
                const replyBuf = Buffer.from(txData, "utf8");
                res.setHeader("Content-Length", replyBuf.byteLength);
                lhttp_write(res, [ replyBuf ], null, true, (e : Error | null) : void =>
                    {
                    if (e) ep.errorHandler(e);
                    });
                }
            else
                res.end();
            });
        }

    public sendMsg(recipient : Intercom2_EndPoint, msgId : string, txData : string | null, replyReceived : (e : Error | null, rxData : string) => any) : void
        {
        const ep : EndPoint = recipient as EndPoint;
        const msgIdBuf = Buffer.from(msgId, "utf8");
        const msgIdPart = new NmsPart([ msgIdBuf ], msgIdBuf.byteLength);
        const dataBuf = Buffer.from(txData ? txData : "", "utf8");
        const dataPart = new NmsPart([ dataBuf ], dataBuf.byteLength);
        const opts = ep.makeWebRequestOpts(this.sslConf, msgIdPart.writeLen() + dataPart.writeLen(), this.ownUriExtension);
        let done = false;
        const httpX = this.sslConf ? https : http;
        const req = httpX.request(opts, (res : IncomingMessage) : void =>
            {
            const immediateResult = lhttp_read(res, 0, "utf8", (e : Error | null, data : string | Buffer[]) : void =>
                {
                complete(e, data as string);
                });
            if (immediateResult) complete(null, immediateResult as string);
            });
        req.on("error", (e : Error) : void =>
            {
            complete(e, "");
            });
        req.setTimeout(REQUEST_TIMEOUT_MILLIS, () : void =>
            {
            complete(new Intercom2_NetworkTimeoutError(msgId, ep.getProtocollessURL()), "");
            req.abort();
            });
        NmsPart.writeMany(req, [ msgIdPart, dataPart ], null, true, (e : Error | null) : void =>
            {
            if (e) complete(e, "");
            });

        function complete(e : Error | null, replyStr : string) : void
            {
            if (!done)
                {
                done = true;
                replyReceived(e, replyStr);
                }
            }
        }
    }
