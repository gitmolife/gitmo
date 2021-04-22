<template>
    <div>
			<MkFolder>
				<template #header><Fa :icon="faBtc"/> CryptoWallet Overview</template>

			<div class="ftskorzw wide _section" v-if="wallet">
				<div class="contents">

					<MkContainer :body-togglable="true" class="_gap">
						<template #header><Fa :icon="faInfoCircle"/> Wallet Info - OHM</template>

						<div class="zbcjwnqg" v-size="{ max: [550, 1000] }">
							<div class="stats">
								<div class="_panel">
									<div style="width: 30%;">
										<small>Account</small>
										<b><img src="/static-assets/client/coin/ohmie128.png" style="height: 42px;" /></b>
									</div>
									<div style="width: 70%;">
										<dl class="total">
											<dt>Balance</dt>
											<dd>{{ number(parseFloat(wallet.balance.total) + parseFloat(wallet.balance.pending)) }}</dd>
										</dl>
										<dl class="diff">
											<dt>Pending</dt>
											<dd>{{ number(wallet.balance.pending) }}</dd>
										</dl>
										<dl class="diff">
											<dt>Available</dt>
											<dd>{{ number(wallet.balance.total) }}</dd>
										</dl>
									</div>
								</div>
								<div class="_panel">
									<div style="width: 30%;">
										<small>System</small>
										<b><img src="/static-assets/client/coin/ohm100.png" style="height: 42px;" /></b>
									</div>
									<div style="width: 70%;">
										<dl class="total">
											<dt>Status</dt>
											<dd v-bind:style="{ color: statusColor}">{{ wallet.server.status }}</dd>
										</dl>
										<dl class="diff">
											<dt>Synced</dt>
											<dd>{{ wallet.server.synced ? "Yes" : "No" }}</dd>
										</dl>
										<dl class="diff">
											<dt>Height</dt>
											<dd class="monospace">{{ wallet.server.synced ? number(wallet.server.height) : 'Pending..' }}</dd>
										</dl>
									</div>
								</div>
							</div>
						</div>
					</MkContainer>

					<MkContainer :body-togglable="true" class="_gap">
						<template #header><Fa :icon="faTachometerAlt"/> Wallet Control - OHM</template>
						<div class="_content">
							<div class="_keyValue"><b>Balance</b><span class="monospace" style="font-size: 1.07em;">{{ wallet.balance.total }} OHM</span></div>
						</div>
						<div class="_content">
							<div class="_keyValue"><b>Tipping Balance</b><span class="monospace" style="font-size: 1.07em;">{{ wallet.balance.tipping }} <Fa :icon="faOm"/></span></div>
							<div class="_keyValue"><b>Network Balance</b><span class="monospace" style="font-size: 1.07em;">{{ wallet.balance.network }} OHM</span></div>
						</div>
						<div class="_content">
							<div class="_keyValue"><b>Network Deposit</b><span class="monospace"><a @click="showAddress()">{{ wallet.account }}</a></span></div>
							<div class="_keyValue"><b>Site Tipping</b><span><a @click="showTransfer()"><Fa :icon="faExchangeAlt"/> Internal Transfer</a></span></div>
							<div class="_keyValue"><b>Transfer External</b><span><a @click="showWithdraw()"><Fa :icon="faBoxOpen"/> Withdraw Offsite</a></span></div>
							<div class="_keyValue" style="margin-top: 5px;"><b>Help</b><span><a @click="showHelp()"><Fa :icon="faQuestionCircle"/> Usage FAQ</a></span></div>
						</div>
					</MkContainer>

					<MkContainer :body-togglable="true" :scrollable="true" class="_gap" style="max-height: 400px;">
						<template #header><Fa :icon="faDatabase"/> Action History</template>
						<div class="_content" v-if="wallet.walletHist">
							<table class="hist-table" style="border-collapse: collapse; width: 100%;">
								<tr style="opacity: 0.76;">
									<th style="text-align: left; padding: 1px 0px 8px 0; width: 29%;">DateTime</th>
									<th style="text-align: left; padding: 1px 6px 8px 0; font-size: 0.94em; width: 6%;">Type</th>
									<th style="text-align: right; padding: 1px 8px 8px 22px; width: 22%;">Amount</th>
									<th style="text-align: center; padding: 1px 20px 8px 4px;">Action</th>
									<th style="text-align: left; padding: 1px 2px 8px 0;">TxID</th>
								</tr>
								<tr v-for="table in wallet.walletHist" :key="table[0]">
									<th style="width: 29%; text-align: left; padding: 1px 2px 2px 0; word-break: break-all; font-size: 13px;" class="monospace">{{ table[3].replace(',', '') }}</th>
									<td style="width: 6%; padding: 1px 6px 2px 0; text-align: left;" class="monospace">{{ table[1] }}</td>
									<td v-if="table[1] !== 'SYNC'" style="width: 22%; text-align: right; padding: 1px 8px 2px 22px;" class="monospace"><span v-html="prefixAmt(table[4],table[1])"></span>{{ table[4].replace('-', '').replace('~', '') }}</td>
									<td v-if="table[1] === 'SYNC'" style="width: 22%; text-align: right; padding: 1px 8px 2px 22px;" class="monospace"><span v-html="prefixAmt(table[4],table[1])"></span><span class="strikeout">{{ table[4].replace('-', '').replace('~', '') }}</span></td>
									<td style="padding: 1px 6px 2px 8px; opacity: 0.8; text-align: center" class="monospace">{{ table[2] }}<span v-if="table[1] === 'SYNC'" title="Change from Transfer"><Fa :icon="faCheckCircle"/></span></td>
									<td style="padding: 1px 0px 2px 0; font-size: 11px;" class="monospace">
										<a v-if="table[5].length === 64" @click="showDetail(table[5])" target="_blank" title="View on Explorer">{{ table[5].substr(0, 14) + '..' }}</a>
										<span v-if="table[5].length !== 64">{{ table[5] }}</span>
									</td>
								</tr>
							</table>
						</div>
					</MkContainer>

				</div>
    	</div>
			</MkFolder>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import parseAcct from '@/misc/acct/parse';
import Progress from '@client/scripts/loading';
import { faBoxOpen, faDatabase, faInfoCircle, faTachometerAlt, faTicketAlt, faExchangeAlt, faOm, faQuestionCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { faBtc } from '@fortawesome/free-brands-svg-icons';
import { query as urlQuery } from '../../../prelude/url';
import MkButton from '@client/components/ui/button.vue';
import MkSelect from '@client/components/ui/select.vue';
import MkInput from '@client/components/ui/input.vue';
import MkContainer from '@client/components/ui/container.vue';
import MkFolder from '@client/components/ui/folder.vue';
import { acct as getAcct } from '../../filters/user';
import number from '../../filters/number';
import * as os from '@client/os';

export default defineComponent({
  components: {
		MkButton,
		MkSelect,
		MkInput,
		MkContainer,
		MkFolder,
		Progress,
  },

  props: {
		acct: {
			type: String,
			required: true
		},
  },

  data() {
    return {
			user: null,
			error: null,
      wallet: null,
			faBtc, faOm, faTachometerAlt, faInfoCircle, faBoxOpen, faDatabase, faExchangeAlt, faQuestionCircle, faCheckCircle
    };
  },

	watch: {
		acct: 'fetch'
	},

  created() {
    this.fetch();
		this.updatePoll();
  },

  methods: {
    getAcct,

		async showAddress() {
			os.modalPageWindow("/my/wallet/address");
		},
		async showTransfer() {
			os.modalPageWindow("/my/wallet/transfer");
		},
		async showWithdraw() {
			os.modalPageWindow("/my/wallet/withdraw");
		},
		async showHelp() {
			os.modalPageWindow("/my/wallet/help");
		},
    fetch() {
      Progress.start();
      os.api('wallet/show').then(wallet => {
        //console.log(wallet);
        this.wallet = wallet;
				this.colorize();
      }).catch(e => {
        this.error = e;
      }).finally(() => {
        Progress.done();
      });
    },
		colorize() {
			if (this.wallet.server.status == "Online") {
				this.statusColor = "#11c711";
			} else if (this.wallet.server.status == "Offline") {
				this.statusColor = "#e64747";
			} else {
				this.statusColor = "orangered";
			}
		},
		prefixAmt(amount, type) {
			if (amount.indexOf('~') >= 0) {
				return '<span style="color: #ebb331">~</span>';
			}
			let amt = parseFloat(amount);
			if (amt < 0) {
				if (type === 'SITE') {
					return '<span style="color: #8832e3;">-</span>';
				} else if (type === 'TIP') {
					return '<span style="color: #e37332;">-</span>';
				} else {
					return '<span style="color: #e34c32;">-</span>';
				}
			} else if (amt > 0) {
				if (type === 'IN+') {
					return '<span style="color: #36d9d3;">+</span>';
				} else if (type === 'TIP') {
					return '<span style="color: #32e388;">+</span>';
				} else {
					return '<span style="color: #32e34f;">+</span>';
				}
			}
		},

		updatePoll() {
			let vm = this;
			setInterval(function () {
				vm.fetch();
			}, 95500);
		},

		showDetail(txid: string) {
			let url = this.wallet.explorer + 'tx/' + txid;
			window.open(url, '_blank');
			//os.modalPageWindow('/my/wallet/tx/' + txid);
		},

		number,
  }

});
</script>

<style lang="scss" scoped>

.monospace {
  font-family: Lucida Console, Courier, monospace;
	font-size: 0.85em;
}

._keyValue {
	margin-bottom: 4px;
}

.hist-table tr {
	border-bottom: 1px dotted lightgray;
}
.hist-table th {
  border-bottom: 1px solid lightgray;
}

.strikeout {
	text-decoration: line-through;
	opacity: 0.92;
}

.zbcjwnqg {
	&.max-width_1000px {
		> .stats {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: 1fr;
		}
	}

	&.max-width_550px {
		> .stats {
			grid-template-columns: 1fr;
			grid-template-rows: 1fr 1fr;
		}
	}

	> .stats {
	display: grid;
	grid-template-columns: 1fr 1fr;
	grid-template-rows: 1fr;
	gap: var(--margin);
	margin-bottom: var(--margin);
	font-size: 90%;

		> div {
			display: flex;
			box-sizing: border-box;
			padding: 16px 20px;

			> div {
				width: 60%;
				background-color: rgba(237, 239, 242, 0.22);
				border-radius: 1px;
				padding: 4px 10px;

				&:first-child {
					> b {
						display: block;

						> [data-icon] {
							width: 16px;
							margin-right: 8px;
						}

						> img {
							border-radius: 8px;
							overflow: hidden;
							transition: all 0.25s;
						}

						> :hover {
							transform: scale(1.07, 1.02);
    					transition: transform 0.25s;
						}
					}

					> small {
						margin-left: 1px;
						opacity: 0.8;
					}
				}

				&:last-child {
					> dl {
						display: flex;
						margin: 0;
						line-height: 1.5em;

						> dt,
						> dd {
							width: 50%;
							margin: 0;
						}

						> dd {
							text-overflow: ellipsis;
							overflow: hidden;
							white-space: nowrap;
						}

						&.total {
							> dt,
							> dd {
								font-weight: bold;
							}
						}

						&.diff.inc {
							> dd {
								color: #82c11c;

								&:before {
									content: "+";
								}
							}
						}
					}
				}
			}
		}
	}
}

</style>
