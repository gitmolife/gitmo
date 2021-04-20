<template>
    <div>

			<MkFolder>
				<template #header><Fa :icon="faBtc"/> CryptoWallet Transfer</template>
				<div class="contents">

					<MkContainer :body-togglable="true" class="_gap">
						<template #header><Fa :icon="faBoxOpen"/> Wallet Withdraw - OHM</template>

						<div class="_content">
							<div class="_keyValue"><b>Current Balance</b><span class="monospace" style="font-size: 1.07em;">{{ wallet.network }} OHM</span></div>
						</div>
						<div class="_content">
							<div class="_keyValue">
								<b><MkInput v-model:value="address" style="margin: 0; flex: 1;"><span class="monospace">External Public Address</span></MkInput></b>
								<MkInput v-model:value="amount" style="margin: 0; flex: 1;"><span class="monospace">Withdraw Amount</span></MkInput>
							</div>
						</div>
						<div v-if="response.ok || response.pend || response.error" class="resp-div">
							<span class="resp-text-pend">{{ response.pend }}</span>
							<span class="resp-text-ack">{{ response.ok }}</span>
							<span class="resp-text-nack">{{ response.error }}</span>
						</div>
						<div class="info-div">
							<span class="info-text">This will move OHM off site.  Your Network balance will decrease.</span>
						</div>
						<div style="width: 67%; margin: auto; padding-bottom: 20px; margin-bottom: 30px;">
							<MkButton full primary @click="doWithdraw()"><Fa :icon="faExternalLinkSquareAlt"/> Confirm Withdraw</MkButton>
						</div>
					</MkContainer>

		    </div>
			</MkFolder>

    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import Progress from '@client/scripts/loading';
import { faBoxOpen, faExternalLinkSquareAlt, faOm } from '@fortawesome/free-solid-svg-icons';
import { faBtc } from '@fortawesome/free-brands-svg-icons';
import { query as urlQuery } from '../../../prelude/url';
import MkButton from '@client/components/ui/button.vue';
import MkInput from '@client/components/ui/input.vue';
import MkContainer from '@client/components/ui/container.vue';
import MkFolder from '@client/components/ui/folder.vue';
import number from '../../filters/number';
import * as os from '@client/os';


export default defineComponent({
  components: {
			MkButton, MkInput, MkContainer, MkFolder, Progress,
  },

  props: {

  },

  data() {
    return {
			address: "",
			amount: "",
			error: null,
      wallet: "",
			response: {
				error: null,
				pend: null,
				ok: null,
			},
			faBtc, faOm, faExternalLinkSquareAlt,
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
        //console.log(wallet);
        this.wallet = wallet;
      }).catch(e => {
        this.error = e;
      }).finally(() => {
        Progress.done();
      });
    },

		doWithdraw(): void {
			if (this.activated) {
				this.response.error = 'Already Busy.. ' + (this.error ? 'Error' : '');
				return;
			}
			let address = this.address;
			let amount = this.amount;
			if (parseFloat(amount) <= 0) {
				this.response.error = 'Invalid Number Entered for Action..';
				return;
			}
			Progress.start();
			this.activated = true;
			this.error = null;
			this.amount = null;
			this.response.ok = null;
			this.response.pend = null;
			this.response.error = null;
			this.response.ok = "Attempting Action...";
			os.api('wallet/withdraw', { address, amount }).then(resp => {
				this.address = null;
				this.response.ok = null;
				this.response.pend = null;
				this.response.error = null;
				if (resp.error) {
					//console.log(resp.error);
					this.response.pend = "An Error Occurred!"
					this.response.error = resp.error;
					//this.timeoutUpdateAck('', amount);
					let vm = this;
					vm.activated = false;
					setTimeout(function () {
						vm.response_ohm_error = null;
						vm.response_ohm_pend = null;
						vm.response_ohm_ok = null;
						vm.response_om_error = null;
						vm.response_om_pend = null;
						vm.response_om_ok = null;
					}, 22000);
				} else {
					//console.log(resp.data);
					this.response.pend = "Processing.. Please Wait."
					this.wallet.network = number(parseFloat(this.wallet.network) - parseFloat(amount));
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
				vm.response.ok = null;
				vm.response.pend = null;
				vm.response.error = null;
				os.api('wallet/job', { jobId, jobData }).then(resp => {
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
								let nbal = parseFloat(vm.wallet.network) + parseFloat(amount);
								vm.wallet.network = number(nbal);
								vm.response.error = "Internal Error - " + data.error;
							}
						} else {
							//console.log("ERROR!");
							console.error(json.error);
							let nbal = parseFloat(vm.wallet.network) + parseFloat(amount);
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
					vm.activated = false;
				});
			}, 5600);
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

</style>
