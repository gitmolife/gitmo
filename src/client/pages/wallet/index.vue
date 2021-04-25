<template>
		<div>
			<MkFolder>
				<template #header><i class="fab fa-btc"></i> CryptoWallet Overview</template>
			<div class="_section" v-if="wallet && history">

				<MkContainer :foldable="true" class="_gap">
					<template #header><i class="fas fa-info-circle"></i> Wallet Info - OHM</template>

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
										<dd>{{ number(Number(wallet.balance.total) + Number(history.balance.pending)) }}</dd>
									</dl>
									<dl class="diff">
										<dt>Pending</dt>
										<dd>{{ number(history.balance.pending) }}</dd>
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

				<MkContainer :foldable="true" class="_gap">
					<template #header><i class="fas fa-gamepad"></i> Wallet Control - OHM</template>
					<div class="_content zbcjwnqg" v-size="{ max: [550, 1000] }">
						<div class="rowEntry rowMain">
							<div class="_keyValue"><b>Balance</b><span class="monospace" style="font-size: 1.07em;">{{ wallet.balance.total }} OHM</span></div>
						</div>
						<div class="rowEntry rowMain">
							<div class="_keyValue"><b>Tipping Balance</b><span class="monospace" style="font-size: 1.07em;">{{ wallet.balance.tipping }} <i class="fas fa-om"></i></span></div>
							<div class="_keyValue"><b>Network Balance</b><span class="monospace" style="font-size: 1.07em;">{{ wallet.balance.network }} OHM</span></div>
							<div v-if="history" class="_keyValue"><b>Pending Balance</b><span class="monospace" style="font-size: 1.07em;">{{ history.balance.pending }} OHM</span></div>
						</div>
						<div class="rowEntry">
							<div class="_keyValue"><b>Network Deposit</b><span class="monospace"><a @click="showAddress()">{{ wallet.account }}</a></span></div>
						</div>
						<div class="rowEntry" style="font-size: 0.95em;">
							<div class="_keyValue"><b>Site Tipping</b><span><a @click="showTransfer()"><i class="fas fa-exchange-alt"></i> Internal Transfer</a></span></div>
							<div class="_keyValue"><b>Transfer External</b><span><a @click="showWithdraw()"><i class="fas fa-box-open"></i> Withdraw Offsite</a></span></div>
						</div>
						<div class="rowEntry">
							<div class="_keyValue"><b>Help</b><span><a @click="showHelp()"><i class="fas fa-question-circle"></i> Usage Info</a></span></div>
							<div class="_keyValue"><b>Historical Actions</b><span><a href="/my/wallet/history/">View Tx Logs</a></span></div>
						</div>
					</div>
				</MkContainer>

				<MkContainer v-if="history" :foldable="true" :scrollable="true" class="_gap" style="max-height: 280px;">
					<template #header><i class="fas fa-atlas"></i> Action History</template>
					<div class="_content rowEntry" v-if="history.history">
						<MkWalletHistory :walletHistory="history.history" :confRequire="wallet.confRequire">
						</MkWalletHistory>
					</div>
				</MkContainer>

			</div>
			</MkFolder>
		</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import parseAcct from '@/misc/acct/parse';
import Progress from '@client/scripts/loading';
import { query as urlQuery } from '../../../prelude/url';
import MkButton from '@client/components/ui/button.vue';
import MkSelect from '@client/components/ui/select.vue';
import MkInput from '@client/components/ui/input.vue';
import MkContainer from '@client/components/ui/container.vue';
import MkFolder from '@client/components/ui/folder.vue';
import MkWalletHistory from '@client/components/wallet-history.vue';
import { acct as getAcct } from '../../filters/user';
import number from '../../filters/number';
import * as symbols from '@client/symbols';
import * as os from '@client/os';

export default defineComponent({
	components: {
		MkButton,
		MkSelect,
		MkInput,
		MkContainer,
		MkFolder,
		Progress,
		MkWalletHistory,
	},

	props: {
		acct: {
			type: String,
			required: true
		},
	},

	data() {
		return {
			[symbols.PAGE_INFO]: {
				title: 'CryptoWallet',
			},
			error: null,
			wallet: null,
			history: {
				balance: {
					pending: 0,
				},
				history: [],
				confRequire: 9,
			},
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

		async fetch() {
			this.error = null;
			Progress.start();
			await os.api('wallet/dashboard').then(wallet => {
				this.wallet = wallet;
				this.colorize();
			}).catch(e => {
				this.error = e;
				//console.error(e);
			}).finally(() => {
				Progress.done();
			});
			Progress.start();
			await os.api('wallet/history', { limit: 50 }).then(history => {
				this.history = history;
			}).catch(e => {
				this.error = e;
				//console.error(e);
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

		updatePoll() {
			let vm = this;
			setInterval(function () {
				vm.fetch();
			}, 95500);
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
