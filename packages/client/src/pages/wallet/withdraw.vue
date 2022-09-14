<template>
		<div>

			<MkFolder>
				<template #header><i class="fab fa-btc"></i> CryptoWallet Transfer</template>
				<div class="contents">

					<MkContainer :foldable="true">
						<template #header><i class="fas fa-box-open"></i> Wallet Withdraw - OHM</template>

						<div class="_content rowEntry rowMain">
							<div class="_keyValue"><b>Current Balance</b><span class="monospace" style="font-size: 1.07em;">{{ wallet.network }} OHM</span></div>
						</div>
						<div class="_content rowEntry">
							<div class="_keyValue">
								<b><MkInput v-model:value="address" style="margin: 0; flex: 1;"><span class="monospace">External Public Address</span></MkInput></b>
								<MkInput v-model:value="amount" style="margin: 0; flex: 1;"><span class="monospace">Withdraw Amount</span></MkInput>
							</div>
						</div>
						<div class="_content rowEntry">
							<div v-if="response.ok || response.pend || response.error" class="resp-div">
								<span class="resp-text-pend">{{ response.pend }}</span>
								<span class="resp-text-ack">{{ response.ok }}</span>
								<span class="resp-text-nack">{{ response.error }}</span>
							</div>
							<div class="info-div" style="margin-bottom: 2px;">
								<span class="info-text">This will move OHM off site. Your Network balance will decrease. Network fees apply..</span>
							</div>
							<div style="width: 67%; margin: auto; padding-bottom: 2px; margin-bottom: 16px;">
								<MkButton full primary @click="doWithdraw()"><i class="fas fa-external-link-square-alt"></i> Confirm Withdraw</MkButton>
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
				title: 'CryptoWallet Withdraw',
			},
			address: "",
			amount: "",
			error: null,
			wallet: {
				network: null,
				balance: null,
			},
			activated: false,
			response: {
				error: '',
				pend: '',
				ok: '',
			},
		};
	},

	watch: {

	},

	created() {
		this.fetch();
	},

	methods: {

		fetch(): void {
			Progress.start();
			os.api('wallet/balance').then(wallet => {
				(this.wallet as any) = wallet;
			}).catch(e => {
				this.error = e;
			}).finally(() => {
				Progress.done();
			});
		},

		clearMessages() {
			this.response.ok = '';
			this.response.pend = '';
			this.response.error = '';
		},

		async doWithdraw(): Promise<void> {
			if (this.activated) {
				this.response.error = 'Already Busy.. ' + (this.error ? 'Error' : '');
				return;
			}
			let address = this.address;
			let amount = this.amount;
			if (!amount || Number(amount) <= 0) {
				this.response.error = 'Invalid Number Entered for Action..';
				return;
			}
			let text: string = 'Do you want to withdraw ' + amount + ' OHM?';
			let res: { canceled: boolean } = await os.dialog({
				type: 'question',
				title: "Confirm Withdraw?",
				text: text,
				showCancelButton: true,
			}) as { canceled: boolean };
			if (res.canceled) {
				return;
			}
			Progress.start();
			this.activated = true;
			this.error = null;
			this.amount = '';
			this.clearMessages();
			this.response.ok = "Attempting Action...";
			os.api('wallet/withdraw', { address, amount }).then( (resp: any)  => {
				this.address = '';
				this.clearMessages();
				if (resp.error) {
					//console.log(resp.error);
					this.response.pend = "An Error Occurred!"
					this.response.error = resp.error;
					let vm = this;
					vm.activated = false;
					setTimeout(function () {
						vm.clearMessages();
					}, 22000);
				} else {
					//console.log(resp.data);
					this.response.pend = "Processing.. Please Wait."
					this.wallet.network = number(Number(this.wallet.network) - Number(amount));
					this.timeoutUpdateAck(resp.data, amount);
				}
			}).catch(e => {
				this.error = e;
				console.log(e);
			}).finally(() => {
				Progress.done();
			});
		},

		timeoutUpdateAck(jobData: string, amount: string): void {
			let vm = this;
			setTimeout(function () {
				Progress.start();
				let jobId: string = 'WITHDRAW_FINAL';
				vm.clearMessages();
				os.api('wallet/job', { jobId, jobData }).then( (resp: any) => {
					try {
						let json = JSON.parse(resp);
						//console.log(json);
						if (!json.error) {
							let data = JSON.parse(json.data);
							if (!data.error) {
								let res = JSON.parse(data.data);
								console.log(res.txid);
								vm.response.ok = "Action Confirmed with Success. " + res.txid.substr(0, 22) + "..";
							} else {
								let nbal = Number(vm.wallet.network) + Number(amount);
								vm.wallet.network = number(nbal);
								vm.response.error = "Internal Error - " + data.error;
							}
						} else {
							console.error(json.error);
							let nbal = Number(vm.wallet.network) + Number(amount);
							vm.wallet.network = number(nbal);
							if (json.error === 'Invalid') {
								vm.response.error = "Internal Error - Job Not Found!";
							} else {
								vm.response.error = "Internal Error!";
							}
						}
					} catch (e) {
						console.error(e);
						vm.response.error = "Internal Error!";
					}
				}).catch(e => {
					vm.error = e;
					console.error(e);
				}).finally(() => {
					Progress.done();
					vm.clearMessages();
					vm.activated = false;
				});
			}, 4600);
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
	margin-bottom: 20px;
}

</style>
