<template>
		<div>

			<MkFolder>
				<template #header><i class="fab fa-btc"></i> CryptoWallet Transfer</template>
				<div class="contents">

					<MkContainer :foldable="true">
						<template #header><i class="fas fa-cart-arrow-down"></i> Network Transfer - <span class="monospace">OM <i class="fas fa-long-arrow-alt-right"></i> OHM</span></template>

						<div class="_content rowEntry rowMain">
							<div class="_keyValue"><b>Current Tipping Balance</b><span class="monospace" style="font-size: 1.07em;">{{ bal_tip }} OM</span></div>
						</div>
						<div class="_content rowEntry">
							<div class="_keyValue ">
								<b>Convert OM Amount</b>
								<MkInput v-model:value="amountN" style="margin: 0; flex: 1;"><span class="monospace">Amount Network Wallet</span></MkInput>
							</div>
						</div>
						<div class="_content rowEntry">
							<div v-if="response_ohm_ok || response_ohm_pend || response_ohm_error" class="resp-div">
								<span class="resp-text-ack">{{ response_ohm_ok }}</span>
								<span class="resp-text-pend">{{ response_ohm_pend }}</span>
								<span class="resp-text-nack">{{ response_ohm_error }}</span>
							</div>
							<div class="info-div">
								<span class="info-text">This will convert OM into OHM. Your Network balance will increase.</span>
							</div>
							<div class="info-div" style="margin-bottom: 2px;">
								<span class="info-text">A network fee of about 0.00001000 OHM may be applied to this transfer.</span>
							</div>
							<div style="width: 67%; margin: auto; padding-bottom: 2px; margin-bottom: 20px; text-shadow: -1px 1px 5px #777777;">
								<MkButton full @click="doTransfer('ohm')" style="color: black; background-color: #eda737; font-weight: 700;"><i class="fas fa-caret-square-up"></i> Confirm Convert to OHM</MkButton>
							</div>
						</div>
					</MkContainer>

					<MkContainer :foldable="true" class="_gap">
						<template #header><i class="fas fa-om"></i> Tipping Transfer - <span class="monospace">OHM <i class="fas fa-long-arrow-alt-right"></i> OM</span></template>

						<div class="_content rowEntry rowMain">
							<div class="_keyValue"><b>Current Network Balance</b><span class="monospace" style="font-size: 1.07em;">{{ bal_net }} OHM</span></div>
						</div>
						<div class="_content rowEntry">
							<div class="_keyValue">
								<b>Convert OHM Amount</b>
								<MkInput v-model:value="amountT" style="margin: 0; flex: 1;"><span class="monospace">Amount Tip Wallet</span></MkInput>
							</div>
						</div>
						<div class="_content rowEntry">
							<div v-if="response_om_ok || response_om_pend || response_om_error" class="resp-div">
								<span class="resp-text-ack">{{ response_om_ok }}</span>
								<span class="resp-text-pend">{{ response_om_pend }}</span>
								<span class="resp-text-nack">{{ response_om_error }}</span>
							</div>
							<div class="info-div">
								<span class="info-text">This will convert OHM into OM. Your Network balance will decrease.</span>
							</div>
							<div class="info-div" style="margin-bottom: 4px;">
								<span class="info-text">A network fee of about 0.00001000 OHM may be applied to this transfer.</span>
							</div>
							<div id="conf-btn" style="width: 67%; margin: auto; padding-bottom: 2px; margin-bottom: 20px; text-shadow: -1px 1px 4px #777777;">
								<MkButton full @click="doTransfer('om')" style="color: black; background-color: #4897f7; font-weight: 700;"><i class="fas fa-caret-square-down"></i> Confirm Convert to OM</MkButton>
							</div>
						</div>
					</MkContainer>

				</div>
			</MkFolder>

		</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Progress from '@client/scripts/loading';
import MkButton from '@client/components/ui/button.vue';
import MkInput from '@client/components/ui/input.vue';
import MkContainer from '@client/components/ui/container.vue';
import MkFolder from '@client/components/ui/folder.vue';
import number from '../../filters/number';
import * as symbols from '@client/symbols';
import * as os from '@client/os';


export default defineComponent({
	components: {
			MkButton, MkInput, MkContainer, MkFolder, Progress,
	},

	props: {

	},

	data() {
		return {
			[symbols.PAGE_INFO]: {
				title: 'CryptoWallet Transfer',
			},
			bal_tip: '0',
			bal_net: '0',
			amountT: null,
			amountN: null,
			error: null,
			activated: false,
			response_ohm_error: '',
			response_ohm_pend: '',
			response_ohm_ok: '',
			response_om_error: '',
			response_om_pend: '',
			response_om_ok: '',
		};
	},

	watch: {

	},

	created() {
		this.fetch();
		this.updatePoll();
	},

	methods: {

		fetch() {
			Progress.start();
			os.api('wallet/balance').then( (balances: any) => {
				(this.bal_tip as any) = Number(balances.tipping);
				(this.bal_net as any) = Number(balances.network);
			}).catch(e => {
				this.error = e;
			}).finally(() => {
				Progress.done();
			});
		},

		clearMessages() {
			this.response_ohm_error = '';
			this.response_ohm_pend = '';
			this.response_ohm_ok = '';
			this.response_om_error = '';
			this.response_om_pend = '';
			this.response_om_ok = '';
		},

		async doTransfer(type: string) {
			if (this.activated) {
				if (type === 'ohm') {
					this.response_ohm_error = 'Already Busy.. ' + (this.error ? 'Error' : '');
				} else {
					this.response_om_error = 'Already Busy.. ' + (this.error ? 'Error' : '');
				}
				return;
			}
			let amount: string | null = this.amountT ? this.amountT : this.amountN;
			if (!amount || Number(amount) <= 0) {
				if (type === 'ohm') {
					this.response_ohm_error = 'Invalid Number Entered for Action..';
				} else {
					this.response_om_error = 'Invalid Number Entered for Action..';
				}
				return;
			}
			let text: string;
			if (type === 'ohm') {
				text = 'Do you want to transfer ' + amount + ' OM to OHM?';
			} else {
				text = 'Do you want to transfer ' + amount + ' OHM to OM?';
			}
			let res: { canceled: boolean } = await os.dialog({
				type: 'question',
				title: "Confirm Transfer?",
				text: text,
				showCancelButton: true,
			}) as { canceled: boolean };
			if (res.canceled) {
				return;
			}
			Progress.start();
			this.activated = true;
			this.error = null;
			this.amountT = null;
			this.amountN = null;
			this.clearMessages();
			if (type === 'ohm') {
				this.response_ohm_pend = 'Processing Request..';
			} else {
				this.response_om_pend = 'Processing Request..';
			}
			os.api('wallet/transfer', { type, amount }).then( (resp: any) => {
				this.clearMessages();
				if (resp.error) {
					//console.log(resp.error);
					if (type === 'ohm') {
						this.response_ohm_pend = "Error."
						this.response_ohm_error = resp.error;
					} else {
						this.response_om_pend = "Error."
						this.response_om_error = resp.error;
					}
					let vm = this;
					vm.activated = false;
					setTimeout(function () {
						vm.clearMessages();
					}, 7300);
				} else {
					//console.log(resp.data);
					if (type === 'ohm') {
						this.response_ohm_ok = "Action Attempt...";
						this.response_ohm_pend = "Processing.. Please Wait."
						this.bal_tip = number(Number(this.bal_tip) - Number(amount));
					} else {
						this.response_om_ok = "Action Attempt...";
						this.response_om_pend = "Processing.. Please Wait."
						this.bal_net = number(Number(this.bal_net) - Number(amount));
					}
					this.timeoutUpdateAck(type, resp.data, amount!);
				}
			}).catch(e => {
				this.error = e;
				if (type === 'ohm') {
					this.response_ohm_error = 'Internal Error Occurred.';
				} else {
					this.response_om_error = 'Internal Error Occurred.';
				}
			}).finally(() => {
				Progress.done();
			});
		},

		timeoutUpdateAck(type: string, jobData: string, amount: string) {
			let vm = this;
			setTimeout(function () {
				Progress.start();
				let jobId: string = 'TRANSFER_FINAL';
				vm.clearMessages();
				os.api('wallet/job', { jobId, jobData }).then( (resp: any) => {
					let json = JSON.parse(resp);
					if (!json.error) {
						let data = JSON.parse(json.data);
						//console.log(data);
						if (!data.error) {
							let res = JSON.parse(data.data);
							console.log(res.txid);
							if (type === 'ohm') {
								let bn = Number(vm.bal_net);
								vm.bal_net = number(bn + Number(amount));
								vm.response_ohm_ok = "Action Confirmed Process Success. " + res.txid.substring(0, 22) + "..";
							} else {
								let bt = Number(vm.bal_tip);
								vm.bal_tip = number(bt + Number(amount));
								vm.response_om_ok = "Action Confirmed Process Success. " + res.txid.substring(0, 22) + "..";
							}
						} else {
							console.log(data.error);
							if (type === 'ohm') {
								vm.response_ohm_error = "Internal Error! " + data.error;
								vm.bal_tip = number(Number(vm.bal_tip) + Number(amount)); // add back
							} else {
								vm.response_om_error = "Internal Error! " + data.error;
								vm.bal_net = number(Number(vm.bal_net) + Number(amount)); // add back
							}
						}
						setTimeout(function () {
							vm.clearMessages();
						}, 33000);
					} else {
						console.log(json.error);
						if (type === 'ohm') {
							vm.response_ohm_error = "Internal Error Occurred!";
							vm.bal_tip = number(Number(vm.bal_tip) + Number(amount)); // add back
						} else {
							vm.response_om_error = "Internal Error Occurred!";
							vm.bal_net = number(Number(vm.bal_net) + Number(amount)); // add back
						}
					}
				}).catch(e => {
					vm.error = e;
					console.log(e);
				}).finally(() => {
					Progress.done();
					vm.activated = false;
				});
			}, 6400);
		},

		updatePoll() {
			let vm = this;
			setInterval(function () {
				vm.fetch();
			}, 93000);
		},

		number,
	}

});
</script>

<style lang="scss" scoped>

.monospace {
	font-family: Lucida Console, Courier, monospace;
}
.info-div {
	width: 72%;
	margin: auto;
	text-align: center;
	line-height: 1;
	opacity: 0.72;
}
.info-text {
	font-size: 11px;
	font-style: italic;
}
.resp-div {
	width: 72%;
	margin: auto;
	text-align: center;
	margin-bottom: 7px;
	font-size: 15px;
}
.resp-text-ack {
	color: green;
	padding: 3px;
}
.resp-text-nack {
	color: red;
	padding: 3px;
}
.resp-text-pend {
	color: orange;
	padding: 3px;
}
.rowEntry {
	border-bottom: 1px solid rgba(161, 161, 161, 0.08);
	padding-left: 10px;
	padding-right: 10px;
	padding-top: 12px;
	padding-bottom: 2px;
}
.rowMain {
	border-bottom: 1px solid rgba(161, 161, 161, 0.18);
	padding-top: 15px;
	padding-bottom: 5px;
}

</style>
