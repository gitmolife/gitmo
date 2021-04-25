<template>
		<div style="margin-top: 7px; margin-bottom: 30px;">
			<MkContainer :foldable="true" class="_gap">
				<template #header><i class="fas fa-binoculars"></i> Wallet Explorer - OHM</template>

				<div class="rowEntry rowMain explore-info">
					<div class="_content">
						<div class="_keyValue"><b>Transaction ID</b><span class="monospace" style="font-size: 0.84em;"><a @click="showExp(tx.txid)">{{ tx.txid }}</a></span></div>
					</div>
					<div class="_content">
						<div class="_keyValue"><b>Blockhash</b><span class="monospace" style="font-size: 0.80em;">{{ tx.blockhash }}</span></div>
					</div>
					<div v-if="tx.time" class="_content">
						<div class="_keyValue"><b>Date Time</b><span class="monospace" style="font-size: 0.92em;">{{ tx.time }}</span></div>
					</div>
					<div class="_content">
						<div class="_keyValue" style="font-size: 0.94em;"><b>Confirmations</b><span class="monospace" style="font-size: 0.92em;">{{ tx.confirms }}</span></div>
					</div>
					<div v-if="tx.size > 0" class="_content">
						<div class="_keyValue" style="font-size: 0.94em;"><b>Tx Size</b><span class="monospace" style="font-size: 0.92em;">{{ tx.size }} bytes</span></div>
					</div>
					<div v-if="tx.vins.length > 0" class="_content">
						<div class="_keyValue" style="margin-top: 8px; border-top: 1px solid rgba(131, 131, 131, 0.22);">
							<div class="_entryHeader"><b>Inputs:</b></div>
							<div class="_entryItems" style="font-size: 0.94">
								<div class="_valueItem" v-for="vin in tx.vins" :key="vin.vout">
									<div class="_keyValue"><b>Index</b><span class="monospace" style="font-size: 0.94em;">{{ vin.vout }}</span></div>
									<div v-if="vin.txid" class="_keyValue"><b>TxID</b><span class="monospace" style="font-size: 0.80em;">
										<a @click="showTx(vin.txid)" style="font-style: italic;">{{ vin.txid }}</a></span>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div v-if="tx.vouts.length > 0"  class="_content">
						<div class="_keyValue" style="margin-top: 8px; border-top: 1px solid rgba(131, 131, 131, 0.22);">
							<div class="_entryHeader"><b>Outputs:</b></div>
							<div class="_entryItems" style="font-size: 0.95">
								<div class="_valueItem" v-for="vout in tx.vouts" :key="vout.n">
									<div class="_keyValue"><b>Index</b><span class="monospace" style="font-size: 0.94em;">{{ vout.n }}</span></div>
									<div class="_keyValue"><b>Value</b><span class="monospace" style="font-size: 0.92em;">+{{ vout.value }}</span></div>
									<div v-if="vout.scriptPubKey" class="_keyValue">
										<b>Address</b>
										<span v-if="vout.site" class="monospace" style="font-size: 0.88em;">{{ vout.scriptPubKey.addresses[0] }} (Site)</span>
										<span v-else-if="vout.mine" class="monospace" style="font-size: 0.88em;">{{ vout.scriptPubKey.addresses[0] }} (You)</span>
										<span v-else class="monospace" style="font-size: 0.88em;">{{ vout.scriptPubKey.addresses[0] }}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div v-if="tx.prevTx" class="explore-back">
						<div class="_content">
							<div class="_keyValue" style="font-size: 0.88em;">
								<b style="opacity: 0.87;"><i class="fas fa-step-backward"></i> Previous TxID:</b>
								<span class="monospace" style="font-size: 0.77em; opacity: 0.72;"><a @click="showTx(tx.prevTx)">{{ tx.prevTx }}</a></span>
							</div>
						</div>
					</div>
				</div>

			</MkContainer>
		</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import parseAcct from '@/misc/acct/parse';
import MkContainer from '@client/components/ui/container.vue';
import MkFolder from '@client/components/ui/folder.vue';
import Progress from '@client/scripts/loading';
import { query as urlQuery } from '../../../prelude/url';
import * as symbols from '@client/symbols';
import * as os from '@client/os';

export default defineComponent({
	components: {
		MkContainer, MkFolder, Progress,
	},

	props: {
		txid: {
			type: String,
			required: false
		},
	},

	data() {
		return {
			[symbols.PAGE_INFO]: {
				title: 'CryptoWallet Explorer',
			},
			tx: {
				time: "",
				txid: "",
				blockhash: "",
				confirms: 0,
				size: 0,
				vins: [],
				vouts: [],
				prevTx: "",
			},
		};
	},

	created() {
		this.fetch();
	},

	methods: {

		fetch() {
			this.getTx(this.txid);
		},

		async showTx(txid: string) {
			this.tx.prevTx = this.tx.txid;
			window.history.pushState('', '', '/my/wallet/explore/tx/' + txid);
			this.getTx(txid);
		},

		async showExp(txid: string) {
			await os.dialog({
				type: 'question',
				title: 'Open Block Explorer.. Continue?',
				text: 'This will open the OHM Block Explorer and take you to an external site.',
				showCancelButton: true,
			}).then(async ({ canceled }) => {
				if (!canceled) {
					window.open('http://explore.ohmcoin.org/tx/' + txid, '_blank')
				}
			})
		},

		async getTx(txid: string) {
			if (!txid || txid.length != 64) {
				this.tx.txid = "INVALID TxID!";
				this.tx.blockhash = "N/A";
				return;
			}
			Progress.start();
			let res = await os.api('wallet/explore', { txid: txid }).finally(() => {
				Progress.done();
			});
			if (res && 'txid' in res) {
				this.tx.txid = res.txid;
				this.tx.time = new Date(Number(res.time) * 1000).toISOString().split('.')[0].replace('T', ' ');
				this.tx.blockhash = res.blockhash;
				this.tx.confirms = res.confirmations;
				this.tx.size = res.size;
				this.tx.vins = res.vin;
				this.tx.vouts = res.vout;
			} else {
				this.tx.txid = "NOT FOUND!";
				this.tx.blockhash = "N/A";
			}
    },

	}

});
</script>

<style lang="scss" scoped>
.monospace {
	font-family: Lucida Console, Courier, monospace;
}

.rowEntry {
	border-bottom: 1px solid rgba(161, 161, 161, 0.08);
	padding-left: 10px;
	padding-right: 10px;
	padding-top: 8px;
	padding-bottom: 2px;
}
.rowMain {
	border-bottom: 1px solid rgba(161, 161, 161, 0.22);
	padding-top: 13px;
	padding-bottom: 5px;
}

.explore-back {
	border-top: 2px solid rgba(161, 161, 161, 0.08);

	> ._content {
		padding-top: 2px;

		> ._keyValue {
			display: table;
			width: -webkit-fill-available;

			> b {
				/*width: 20%;*/
				display: table-row;
			}

			> span {
				width: 80%;
				white-space: nowrap;
				display: table-cell;
			}
			> span:hover {
				opacity: 0.95;
				color: green;
			}
		}
	}
}

.explore-info {
	margin-bottom: 10px;
	overflow: hidden;

	> .divbar {
		border-top: 1px solid rgba(161, 161, 161, 0.20);
		padding-top: 3px;
	}

	> ._content {
		> ._keyValue {
			display: table;
			width: -webkit-fill-available;
			padding-top: 2px;

			> b {
				padding-right: 5px;
				display: table-cell;
				width: 21%;
			}

			> span {
				display: table-cell;
				width: 79%;
			}

			> div, ._entryHeader {
				display: table-cell;
				padding-right: 5px;
				margin-top: 10px;
				min-width: 80px;
				width: 10%;
			}

			> ._entryItems {
				display: table-cell;
				padding-top: 2px;
				margin-top: 13px;
				width: 90%;

				> ._valueItem {
					display: table;
					padding-right: 10px;
					margin-bottom: 10px;
					border-bottom: 1px solid rgba(161, 161, 161, 0.16);

					> div {
						display: table-row;

						> b {
							display: table-cell;
							min-width: 72px;
							width: 20%;
							padding-right: 2px;
							text-align: right;
							opacity: 0.74;
						}

						> span {
							white-space: nowrap;
							display: table-cell;
							padding-left: 12px;
							margin-left: 4px;
							width: 80%;
						}
					}
				}
			}
		}
	}
}
</style>
