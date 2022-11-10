/*
 * Copyright 2019 Cryptech Services
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



///////////////////////////////////////////////////////////////////////////////
// nms.ts by loma oopaloopa



import { IncomingMessage, ServerResponse, ClientRequest } from "http";
import { StringDecoder } from "string_decoder";

import { lhttp_read, lhttp_write, lhttp_byteLen } from "./lhttp";

export { NmsPart, NMS_HDR_LEN };



///////////////////////////////////////////////////////////////////////////////



/** The byte length of an NMS message header */
const NMS_HDR_LEN      = 32;
/** @ignore */
const NMS_PART_HDR_STR = "\r\n$partLength:";
/** @ignore */
const NMS_PART_HDR_BUF = Buffer.from(NMS_PART_HDR_STR, "utf8");
/** @ignore */
const NMS_PART_HDR_LEN = NMS_PART_HDR_BUF.length;

/** @ignore */
const ZEROS            = "0000000000000000000000000000";
/** @ignore */
const CHAR_CODE_0      = "0".charCodeAt(0);
/** @ignore */
const CHAR_CODE_A      = "A".charCodeAt(0);
/** @ignore */
const CHAR_CODE_a      = "a".charCodeAt(0);
/** @ignore */
const CHAR_CODE_CR     = "\r".charCodeAt(0);
/** @ignore */
const CHAR_CODE_LF     = "\n".charCodeAt(0);



///////////////////////////////////////////////////////////////////////////////



/**
 * See Overall_Message_Structure.txt for the specification implimented by class NmsPart.
 * That spec describes dividing a network message into parts.
 * NmsPart provides methods for sending and recieving the message parts.
 * Each part is represented by an instance of class NmsPart.
 *
 * @class NmsPart
 */
class NmsPart
    {
    /**
     * Contains the data transmitted over the network.
     * If you change the contents then you must update the byteLen before sending the part out over the network.
     * If the new byte length is not known use NmsPart's instance method setByteLenFromContents() to set byteLen directly from the contents.
     *
     * @type {((Buffer | string)[] | string | null)}
     * @memberof NmsPart
     */
    contents : (Buffer | string)[] | string | null = null;
    /**
     * Contains the byte length of the contents, taking in to account the encoding to be used for strings.
     * It does NOT include the length of the part header sent over the network in front of the contents.
     * Note that this may be different from the contents length in string characters.
     * If you change the contents then you must update the byteLen before sending the part out over the network.
     * If the new byte length is not known use NmsPart's instance method setByteLenFromContents() to set byteLen directly from the contents.
     *
     * @type {number}
     * @memberof NmsPart
     */
    byteLen : number = 0;

    /**
     * Creates an instance of NmsPart.
     * To make an empty NmsPart ready to read from the network use new NmsPart().
     * To make NmsParts ready to write to the network pass the contents as the 1st parameter, and either a numeric byte length or a Buffer encoding (utf8, etc.) for the 2nd parameter.
     * For example new NmsPart([ "data1", "data2" ], "utf8").
     * If the contents consists solely of node.js Buffer objects then the 2nd parameter can be ommitted.
     * If the byte length is known in advance it can be passed as a number for the 2nd parameter.
     * For example new NmsPart("gobledegook", 11).
     * This saves the time the constructor would otherwise take calculating the byte length.
     * If you change the contents you must simultaneously update the byte length.
     * If the new byte length is not known use NmsPart's instance method setByteLenFromContents() to set the byte length directly from the contents.
     * 
     * @param {((Buffer | string)[] | string | null)} contents The contents of the message part.
     * @param {(number | BufferEncoding)} byteLenOrEncoding The byte length of the contents, or a buffer encoding for use in calculating the byte length.
     * @memberof NmsPart
     */
    constructor(contents : (Buffer | string)[] | string | null = null, byteLenOrEncoding : number | BufferEncoding = -1)
        {
        this.contents = contents;
        if (!this.contents)
            this.byteLen = 0;
        else if (typeof byteLenOrEncoding === "number")
            {
            if (byteLenOrEncoding < 0)
                this.setByteLenFromContents();
            else
                this.byteLen = byteLenOrEncoding;
            }
        else
            this.setByteLenFromContents(byteLenOrEncoding);
        }

    /**
     * Read 1 or more parts from the network, providing the data as an array of NmsPart objects in the order in which they're recieved.
     * If chan.setEncoding() has been called to set a string encoding for the request/response then readMany() won't work correctly.
     * If the OS has already read sufficient data from the network then readMany() returns the read as an array of NmsPart objects.
     * Otherwise it returns null, and indicates completion by calling the doneCallback parameter.
     * Note that doneCallback is only called if readMany() returns null.
     * doneCallback()'s 1st paraemter (e) is null if everything went OK, otherwise it contains an Error object.
     * The 2nd parameter (msgEnded) is true if the end of the network message was detected.
     * The 3rd parameter contains the array of NmsPart objects read from the network.
     *
     * @static
     * @param {IncomingMessage} chan Where to read from (an HTTP response object on a client, or an HTTP request object on a server).
     * @param {number} partCount The number of parts to read, or 0 to read parts all the way to the end of the message.
     * @param {(BufferEncoding | null)} encoding Pass an encoding to recieve each part's data as a string, or null for raw data as bytes in Buffers.
     * @param {((e : Error | null, data : NmsPart[]) => any, msgEnded : boolean)} doneCallback The function to be called when all the parts have been read, if readMany() returned null.
     * @returns {(NmsPart[] | null)} If enough data has already been read from the network then return the array of NmsPart, otherwise return null.
     * @memberof NmsPart
     */
    static readMany(chan : IncomingMessage, partCount : number, encoding : BufferEncoding | null, doneCallback : (e : Error | null, data : NmsPart[], msgEnded : boolean) => any) : NmsPart[] | null
        {
        const originalPartCount = partCount;
        let parts : NmsPart[];
        if (partCount <= 0)
            {
            parts = [ ];
            partCount = Number.MAX_SAFE_INTEGER;
            }
        else
            parts = new Array(partCount);
        let i = 0;
        return readSome();

        function readSome() : NmsPart[] | null
            {
            let result = true;
            while (result && partCount--)
                {
                const pt = new NmsPart();
                result = pt.read(chan, encoding, (e : Error | null, msgEnded : boolean, immediateEnd : boolean) : void =>
                    {
                    if (e)
                        {
                        if (immediateEnd) e = originalPartCount > 0 && partCount ? new Error("NmsPart.readMany() ended before all parts read.") : null;
                        doneCallback(e, parts, msgEnded);
                        }
                    else
                        {
                        addPart(pt);
                        if (msgEnded || !partCount)
                            {
                            if (originalPartCount > 0 && partCount) e = new Error("NmsPart.readMany() ended before all parts read.");
                            doneCallback(e, parts, msgEnded);
                            }
                        else if (readSome())
                            doneCallback(null, parts, false);
                        }
                    });
                if (result) addPart(pt);
                }
            return result ? parts : null;
            }

        function addPart(pt : NmsPart) : void
            {
            if (originalPartCount > 0)
                parts[i++] = pt;
            else
                parts.push(pt);
            }
        }

    /**
     * Read a part from the network.
     * If chan.setEncoding() has been called to set a string encoding for the request/response then read() won't work correctly.
     * After the read completes the NmsPart's contents property's set to the data read, and the byteLen property's set to its byte length.
     * If the network's already delivered sufficient bytes then the read completes at once and read() returns true.
     * If it must wait for more data from the network read() returns false, and indicates completion by calling doneCallback.
     * Note that doneCallback is only called if read() returns false.
     * doneCallback()'s 1st paraemter (e) is null if everything went OK, otherwise it contains an Error object.
     * The 2nd parameter (msgEnded) is true if the end of the network message was detected.
     * The 3rd parameter (immediateEnd) is true if the message ended right at the start, before reading even the 1st byte of the part header, otherwise it's false.
     * Note that e is NOT null when immediateEnd is true.
     *
     * @param {IncomingMessage} chan Where to read from (an HTTP response object on a client, or an HTTP request object on a server).
     * @param {(BufferEncoding | null)} encoding Pass an encoding to recieve the data as a string, or null for raw data as bytes in Buffers.
     * @param {((e : Error | null, msgEnded : boolean, immediateEnd : boolean) => any)} doneCallback The function to be called when the part has been read, if read() returned false.
     * @returns {boolean} Return true if the read's already completed and the data's present, false if you must wait for doneCallback() for completion.
     * @memberof NmsPart
     */
    read(chan : IncomingMessage, encoding : BufferEncoding | null, doneCallback : (e : Error | null, msgEnded : boolean, immediateEnd : boolean) => any) : boolean
        {
        this.contents = null;
        this.byteLen = 0;
        const readMessage = () : Buffer[] | string | null =>
            {
            return lhttp_read(chan, this.byteLen, encoding, (e : Error | null, data : Buffer[] | string, msgEnded : boolean) : void =>
                {
                this.contents = data;
                doneCallback(e, msgEnded, false);
                });
            };
        const result = lhttp_read(chan, NMS_HDR_LEN, null, (e : Error | null, data : Buffer[] | string, msgEnded : boolean) : void =>
            {
            if (e)
                doneCallback(e, msgEnded, msgEnded && !data.length);
            else
                {
                this.byteLen = NmsPart.validateHdr(data as Buffer[]);
                if (this.byteLen < 0)
                    {
                    this.byteLen = 0;
                    doneCallback(new Error("NmsPart.read() invalid NMS part header syntax."), msgEnded, false);
                    }
                else if (this.byteLen == 0)
                    doneCallback(null, msgEnded, false);
                else if (msgEnded)
                    doneCallback(new Error("NmsPart.read() ended before part read."), msgEnded, msgEnded && !data.length);
                else
                    {
                    this.contents = readMessage();
                    if (this.contents) doneCallback(null, false, false);
                    }
                }
            });
        if (result)
            {
            this.byteLen = NmsPart.validateHdr(result as Buffer[]);
            if (this.byteLen < 0)
                {
                this.byteLen = 0;
                process.nextTick(() : void => { doneCallback(new Error("NmsPart.read() invalid NMS part header syntax."), false, false); });
                }
            else if (this.byteLen == 0)
                return true;
            else
                {
                this.contents = readMessage();
                if (this.contents) return true;
                }
            }
        return false;
        }

    /** @ignore */
    static validateHdr(hdr : Buffer[]) : number
        {
        let iByte : number = 0;
        let iBuf : number = 0;
        let buf : Buffer = hdr[iBuf];
        if (!buf.length && !advance()) return -1;
        let len = 0;
        let i = 0;
        while (i < NMS_PART_HDR_LEN) if (hdr[iBuf][iByte] != NMS_PART_HDR_BUF[i++] || !advance()) return -1;
        while (i < NMS_PART_HDR_LEN + 16)
            {
            const ch = hdr[iBuf][iByte];
            if (ch == CHAR_CODE_0)
                {
                if (!advance()) return -1;
                i++;
                }
            else
                break;
            }
        while (i < NMS_PART_HDR_LEN + 16)
            {
            const ch = hdr[iBuf][iByte];
            if (!advance()) return -1;
            i++;
            let digit : number;
            if (ch >= CHAR_CODE_a)
                {
                digit = 0xA + ch - CHAR_CODE_a;
                if (digit > 0xF) return -1;
                }
            else if (ch >= CHAR_CODE_A)
                {
                digit = 0xA + ch - CHAR_CODE_A;
                if (digit > 0xF) return -1;
                }
            else if (ch >= CHAR_CODE_0)
                {
                digit = ch - CHAR_CODE_0;
                if (digit > 9) return -1;
                }
            else
                return -1;
            len = 0x10*len + digit;
            }
        return hdr[iBuf][iByte] == CHAR_CODE_CR && advance() && hdr[iBuf][iByte] == CHAR_CODE_LF ? len : -1;

        function advance() : boolean
            {
            if (++iByte < buf.length) return true;
            iByte = 0;
            for ( ; ; )
                {
                iBuf++;
                if (iBuf >= hdr.length) return false;
                buf = hdr[iBuf];
                if (buf.length) return true;
                }
            }
        }

    /**
     * Return the total byte length of all the NmsPart in the parts array.
     * The total byte length is the value required for the Content-Length HTTP header.
     * It includes the byte length of each part's header, as well as the byte lengths of each part's contents taking in to account the encoding to be used for strings. 
     * writeManyLen() requires that all the NmsPart objects have the correct value for their byteLen properties.
     * If necessary NmsPart's instance method setByteLenFromContents() can be used to set a part's byteLen directly from its contents.
     *
     * @static
     * @param {NmsPart[]} parts The array of NmsPart for which to return the total byte length.
     * @returns {number} The total byte length.
     * @memberof NmsPart
     */
    static writeManyLen(parts : NmsPart[]) : number
        {
        let len = 0;
        for (const pt of parts) len += pt.writeLen();
        return len;
        }

    /**
     * Send 1 or more parts over the network.
     * writeMany() requires that all the NmsPart objects have the correct value for their byteLen properties.
     * If necessary NmsPart's instance method setByteLenFromContents() can be used to set a part's byteLen directly from its contents.
     * If all the parts can be sent imediately then writeMany() returns true, and the write has completed when it returns.
     * Otherwise writeMany() returns false and indicates completion by calling doneCallback.
     * Note that doneCallback is only called if writeMany() returned false.
     * If something went wrong then the Error object is passed as a parameter to doneCallback, otherwise, if all went well, then this parameter's null.
     *
     * @static
     * @param {(ClientRequest | ServerResponse)} chan Where to write to (an HTTP request object on a client, or an HTTP response object on a server).
     * @param {NmsPart[]} parts The array of NmsPart to send, in the order in which they should be sent.
     * @param {(BufferEncoding | null)} encoding The encoding for writing strings, can be null if all the data is in node.js Buffer objects.
     * @param {boolean} sendEnd If true complete the HTTP message after the last data has been written, otherwise leave the HTTP message open for more sending.
     * @param {((e : Error | null) => any)} doneCallback The function to be called when all the parts have been sent, if writeMany() returned false.
     * @returns {boolean} True if the write completed before writeMany() returned, and false if you must wait for doneCallback for completion.
     * @memberof NmsPart
     */
    static writeMany(chan : ClientRequest | ServerResponse, parts : NmsPart[], encoding : BufferEncoding | null, sendEnd : boolean, doneCallback : (e : Error | null) => any) : boolean
        {
        if (parts.length == 0)
            {
            if (sendEnd) chan.end();
            return true;
            }
        let i = 0;
        return writeSome();

        function writeSome() : boolean
            {
            let result = true;
            while (result && i < parts.length)
                {
                result = parts[i].write(chan, encoding, (i == parts.length - 1 ? sendEnd : false), (e : Error | null) : void =>
                    {
                    if (e || i == parts.length)
                        doneCallback(e);
                    else if (writeSome())
                        doneCallback(null);
                    });
                i++;
                }
            return result;
            }
        }

    /**
     * Return the total byte length of the part.
     * The total byte length is the value required for the Content-Length HTTP header.
     * It includes the byte length of the part's header, as well as the byte lengths of the part's contents taking in to account the encoding to be used for strings. 
     * writeLen() requires that the NmsPart have the correct value for its byteLen property.
     * If necessary the instance method setByteLenFromContents() can be used to set the byteLen directly from the contents.
     *
     * @returns {number} The part's total byte length.
     * @memberof NmsPart
     */
    writeLen() : number
        {
        return this.byteLen + NMS_HDR_LEN;
        }

    /**
     * Send the part over the network.
     * write() requires that the NmsPart have the correct value for its byteLen property.
     * If necessary the instance method setByteLenFromContents() can be used to set the byteLen directly from the contents.
     * If the part can be sent imediately then write() returns true, and the write has completed when it returns.
     * Otherwise write() returns false and indicates completion by calling doneCallback.
     * Note that doneCallback is only called if write() returned false.
     * If something went wrong then the Error object is passed as a parameter to doneCallback, otherwise, if all went well, then this parameter's null.
     *
     * @param {(ClientRequest | ServerResponse)} chan Where to write to (an HTTP request object on a client, or an HTTP response object on a server).
     * @param {(BufferEncoding | null)} encoding The encoding for writing strings, can be null if all the data is in node.js Buffer objects.
     * @param {boolean} sendEnd If true complete the HTTP message after the last data has been written, otherwise leave the HTTP message open for more sending.
     * @param {((e : Error | null) => any)} doneCallback The function to be called when the part has been sent, if write() returned false.
     * @returns {boolean} True if the write completed before write() returned, and false if you must wait for doneCallback for completion.
     * @memberof NmsPart
     */
    write(chan : ClientRequest | ServerResponse, encoding : BufferEncoding | null, sendEnd : boolean, doneCallback : (e : Error | null) => any) : boolean
        {
        const writeData = (this.byteLen && this.contents) ? (typeof this.contents === "string" ? [ this.contents ] : this.contents) : null;
        if (lhttp_write(chan, [ NmsPart.makeHdrBuffer(this.byteLen) ], null, (writeData ? false : sendEnd), hdrSent))
            return writeData ? lhttp_write(chan, writeData, encoding, sendEnd, doneCallback) : true;
        else
            return false;
    
        function hdrSent(e : Error | null) : void
            {
            if (e)
                doneCallback(e);
            else if (writeData)
                {
                if (lhttp_write(chan, writeData, encoding, sendEnd, doneCallback)) doneCallback(null);
                }
            else
                doneCallback(null);
            }
        }

    /** @ignore */
    static makeHdrBuffer(partLen : number) : Buffer
        {
        const buf = Buffer.allocUnsafe(NMS_HDR_LEN);
        let i = NMS_PART_HDR_LEN;
        NMS_PART_HDR_BUF.copy(buf, 0, 0, i);
        const hex = partLen.toString(16);
        let leadingZeros = NMS_HDR_LEN - (i + hex.length + 2);
        while (leadingZeros--) buf[i++] = CHAR_CODE_0;
        buf.fill(hex, i, NMS_HDR_LEN - 2);
        buf[NMS_HDR_LEN - 2] = CHAR_CODE_CR;
        buf[NMS_HDR_LEN - 1] = CHAR_CODE_LF;
        return buf;
        }
    
    /** @ignore */
    static makeHdrString(partLen : number) : string
        {
        const hex = partLen.toString(16);
        const leadingZeros = NMS_HDR_LEN - (NMS_PART_HDR_STR.length + hex.length + 2);
        return NMS_PART_HDR_STR.concat(ZEROS.substr(0, leadingZeros), hex, "\r\n");
        }

    /**
     * Set the NmsPart's byteLen property according to its contents property.
     *
     * @param {(BufferEncoding | null)} encoding The encoding to use when computing the byte length of strings, can be null if all the data is in node.js Buffer objects.
     * @returns {NmsPart} The same NmsPart object as it's called on.
     * @memberof NmsPart
     */
    setByteLenFromContents(encoding : BufferEncoding | null = null) : NmsPart
        {
        if (!this.contents)
            this.byteLen = 0;
        else if (typeof this.contents === "string")
            this.byteLen = encoding ? Buffer.byteLength(this.contents, encoding) : Buffer.byteLength(this.contents);
        else if (!this.contents.length)
            this.byteLen = 0;
        else
            this.byteLen = lhttp_byteLen(this.contents, encoding);
        return this;
        }

    /**
     * Get the contents of the NmsPart object as a string.
     *
     * @param {(BufferEncoding | null)} encoding The encoding to use when converting a node.js Buffer object to a string, can be null if all the data is in strings.
     * @returns {string} The contents of the NmsPart object as a string.
     * @memberof NmsPart
     */
    toString(encoding : BufferEncoding | null = null) : string
        {
        if (!this.contents)
            return "";
        else if (typeof this.contents === "string")
            return this.contents;
        else if (!this.contents.length)
            return "";
        else
            {
            const decoder = encoding ? new StringDecoder(encoding) : new StringDecoder();
            let result = "";
            for (const cnk of this.contents)
                {
                if (typeof cnk === "string")
                    result += cnk;
                else
                    result += decoder.write(cnk);
                }
            result += decoder.end();
            return result;
            }
        }

    /**
     * Get the contents of the NmsPart object as a block of bytes in a node.js Buffer object.
     *
     * @param {(BufferEncoding | null)} encoding The string encoding to use, can be null if all the data is in node.js Buffer objects.
     * @returns {Buffer} The contents of the NmsPart object as a block of bytes.
     * @memberof NmsPart
     */
    toBuffer(encoding : BufferEncoding | null = null) : Buffer
        {
        if (!this.contents)
            return Buffer.allocUnsafe(0);
        else if (typeof this.contents === "string")
            return encoding ? Buffer.from(this.contents, encoding) : Buffer.from(this.contents);
        else if (!this.contents.length)
            return Buffer.allocUnsafe(0);
        else if (this.contents.length == 1 && typeof this.contents[0] !== "string")
            return this.contents[0] as Buffer;
        else
            {
            let i = 0;
            const buf = Buffer.allocUnsafe(this.byteLen);
            for (const cnk of this.contents)
                {
                if (typeof cnk === "string")
                    {
                    if (encoding)
                        i += buf.write(cnk, i, encoding);
                    else
                        i += buf.write(cnk, i);
                    }
                else
                    i += cnk.copy(buf, i);
                }
            return buf;
            }
        }
    }