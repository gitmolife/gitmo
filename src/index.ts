/**
 * Misskey Entry Point!
 */

Error.stackTraceLimit = Infinity;

require('events').EventEmitter.defaultMaxListeners = 128;
require('dotenv').config({path: './.config/.env'});

import boot from './boot';

export default function() {
	return boot();
}
