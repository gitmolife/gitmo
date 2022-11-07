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
// lhttp by loma oopaloopa



import { IncomingMessage, ServerResponse, ClientRequest } from "http";
import { StringDecoder } from "string_decoder";

export { lhttp_read, lhttp_write, lhttp_byteLen };



///////////////////////////////////////////////////////////////////////////////



/**
 * On a client read len bytes from the server's HTTP response, or on a server read len bytes from the client's HTTP request.
 * Or read all the way to the end of the reponse/request data by passing 0 for the len parameter.
 * If chan.setEncoding() has been called to set a string encoding for the request/response then lhttp_read() won't work correctly.
 * If an encoding's given then it's used to provide the data read as a string, otherwise it's provided as an array of node.js Buffer objects.
 * Note that the length is in bytes as distinct from string characters.
 * If the requested length has already been read from the network then doneCallback() isn't called, instead the data's returned immediately.
 * Otherwise lhttp_read() returns null and doneCallback()'s called later to indicate completeion.
 * If doneCallback() is called and something went wrong then the e parameter contains an Error object.
 * If e is null, then the data read is in doneCallback()'s data parameter, and msgEnded is set to true if lhttp_read() detected the end of the message.
 * If the message ends before the requested length is read then lhttp_read() returns less than the requested length.
 * Check the length of the data returned to watch for this.
 * Note that the request/response has a boolean property complete which will be true if a complete HTTP message has been received successfully.
 *
 * @param {IncomingMessage} chan Where to read from (an HTTP response object on a client, or an HTTP request object on a server).
 * @param {number} len The number of bytes to read, or 0 to read all the way to the end of the message. (Note, not the number of string characters).
 * @param {(BufferEncoding | null)} encoding If an encoding's given it's used to return the data as a string, otherwise it's returned as an array of node.js Buffer objects.
 * @param {((e : Error | null, msgEnded : boolean, data : Buffer[] | string) => any)} doneCallback The function to be called when the read completes if lhttp_read() returned null.
 * @returns {(Buffer[] | string | null)} If the requested length has already been read from the network then return the read data, otherwise return null.
 */
function lhttp_read(chan : IncomingMessage, len : number, encoding : BufferEncoding | null, doneCallback : (e : Error | null, data : Buffer[] | string, msgEnded : boolean) => any) : Buffer[] | string | null
    {
    const chunks : Buffer[] = [ ];
    let str = "";
    const originalLen = len;
    if (len <= 0) len = Number.MAX_SAFE_INTEGER;
    const decoder = encoding ? new StringDecoder(encoding) : null;
    let done = false;
    chan.on("readable", onReadable);
    if (receive())
        {
        chan.off("readable", onReadable);
        return tidyUpAndGetData();
        }
    else
        {
        chan.on("error", onError);
        chan.on("aborted", onAborted);
        chan.on("close", onClose);
        chan.on("end", onEnd);
        return null;
        }

    function onReadable()
        {
        if (!done && receive()) complete(null, false);
        }

    function onError(e : Error) : void
        {
        if (!done) complete(e, false);
        }

    function onAborted() : void
        {
        if (!done) complete(new Error("lhttp_read() aborted before complete length read."), false);
        }

    function onClose() : void
        {
        if (!done) complete(new Error("lhttp_read() closed before complete length read."), false);
        }

    function onEnd() : void
        {
        if (!done) complete(originalLen > 0 && len > 0 ? new Error("lhttp_read() ended before complete length read.") : null, true);
        }

    function receive() : boolean
        {
        while (len)
            {
            let rdLen = chan.readableLength;
            if (rdLen < 8) rdLen = 8;
            if (rdLen > len) rdLen = len;
            const cnk = chan.read(rdLen);
            if (!cnk) return false;
            len -= cnk.length;
            if (encoding)
                str += decoder!.write(cnk);
            else
                chunks.push(cnk);
            }
        return true;
        }

    function complete(e : Error | null, msgEnded : boolean) : void
        {
        chan.off("readable", onReadable);
        chan.off("error", onError);
        chan.off("aborted", onAborted);
        chan.off("close", onClose);
        chan.off("end", onEnd);
        doneCallback(e, tidyUpAndGetData(), msgEnded);
        }

    function tidyUpAndGetData() : Buffer[] | string
        {
        done = true;
        if (encoding)
            {
            str += decoder!.end();
            return str;
            }
        else
            return chunks;
        }
    }

/**
 * Write data to a client's HTTP request or to a server's HTTP response.
 * After successful completion of an lhttp_write() with sendEnd false it's safe to call chan.write() or chan.end();
 * lhttp_write() assumes that the dataChunks array has a length of at least 1, and that every chunk has a byte length of at least 1 byte.
 * If these assumptions aren't satisfied then lhttp_write() won't work correctly.
 * Data chunks that are node.js Buffer objects are written unencoded, as is.
 * Data chunks that are strings are encoded with the given encoding when written.
 * If all the chunks can be sent immediately then doneCallback() isn't called, and lhttp_write() returns true to indicate successful completion of the write.
 * If lhttp_write() must wait to send some chunks then it returns false, and doneCallback() is called later to indicate completion.
 * If doneCallback() is called and something went wrong then the e parameter contains an Error object.
 * Otherwise (if e is null) the write has completed successfully.
 *
 * @param {(ClientRequest | ServerResponse)} chan Where to write to (an HTTP request object on a client, or an HTTP response object on a server).
 * @param {((Buffer | string)[])} dataChunks The data to be written.
 * @param {(BufferEncoding | null)} encoding The encoding for writing strings, can be null if all the chunks are node.js Buffer objects.
 * @param {boolean} sendEnd If true complete the HTTP message after the last data has been written, otherwise leave the HTTP message open for more sending.
 * @param {((e : Error | null) => any)} doneCallback The function to be called when the write completes (if lhttp_write() returns false).
 * @returns {boolean} Return true if the write completed immediately, otherwise return false and use doneCallback() to indicate write completion.
 */
function lhttp_write(chan : ClientRequest | ServerResponse, dataChunks : (Buffer | string)[], encoding : BufferEncoding | null, sendEnd : boolean, doneCallback : (e : Error | null) => any) : boolean
    {
    let done = false;
    chan.on("drain", onDrain);
    if (send())
        {
        chan.off("drain", onDrain);
        done = true;
        return true;
        }
    else
        {
        chan.on("close", onClose);
        chan.on("error", onError);
        return false;
        }

    function onDrain() : void
        {
        if (!done)
            {
            if (dataChunks.length)
                {
                if (send()) complete();
                }
            else
                complete();
            }
        }

    function onClose() : void
        {
        if (!done) complete(new Error("lhttp_write() closed before transmission compeleted."));
        }

    function onError(e : Error) : void
        {
        if (!done) complete(e);
        }

    function send() : boolean
        {
        if (!chan.writable) return false;
        let result = true;
        while (result && dataChunks.length)
            {
            const cnk = dataChunks.shift();
            if (sendEnd && !dataChunks.length)
                {
                result = true;
                if (typeof cnk === 'string' && encoding)
                    chan.end(cnk, encoding);
                else
                    chan.end(cnk);
                }
            else
                {
                if (typeof cnk === 'string' && encoding)
                    result = chan.write(cnk, encoding);
                else
                    result = chan.write(cnk);
                }
            }
        return result;
        }

    function complete(e : Error | null = null) : void
        {
        done = true;
        chan.off("drain", onDrain);
        chan.off("close", onClose);
        chan.off("error", onError);
        doneCallback(e);
        }
    }

/**
 * Return the total byte length of the given data chunks.
 * The total byte length is the value required for the Content-Length HTTP header.
 *
 * @param {((Buffer | string)[])} dataChunks The data chunks to find the total byte length of.
 * @param {(BufferEncoding | null)} encoding The encoding for computing the byte length of any string data chunks, can be null if all the chunks are Buffers.
 * @returns {number} The total byte length of all the data chunks.
 */
function lhttp_byteLen(dataChunks : (Buffer | string)[], encoding : BufferEncoding | null) : number
    {
    let len = 0;
    for (const cnk of dataChunks)
        {
        if (typeof cnk === 'string')
            len += encoding ? Buffer.byteLength(cnk, encoding) : Buffer.byteLength(cnk);
        else
            len += cnk.length;
        }
    return len;
    }
