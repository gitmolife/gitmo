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
						<div class="resp-div">
							<span class="resp-text-ack">{{ response.ok }}</span>
							<span class="resp-text-pend">{{ response.pend }}</span>
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
			this.response.ok = "Action Attempt...";
			os.api('wallet/withdraw', { address, amount }).then(resp => {
				this.address = null;
				//this.response.ok = null;
				this.response.pend = null;
				this.response.error = null;
				if (resp.error) {
					//console.log(resp.error);
					this.timeoutUpdateAck('', amount);
					this.response.pend = "Error!"
					this.response.ok = resp.error;
				} else {
					//console.log(resp.data);
					this.timeoutUpdateAck(resp.data, amount);
					this.response.pend = "Processing.. Please Wait."
					this.wallet.network = number(parseFloat(this.wallet.network) - parseFloat(amount));
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
				let jobId: string = 'TRANSFER_FINAL';
				vm.response.ok = null;
				vm.response.pend = null;
				vm.response.error = null;
				os.api('wallet/job', { jobId, jobData }).then(resp => {
					let json = JSON.parse(resp);
					console.log(json);
					if (!json.error) {
						let data = JSON.parse(json.data);
						console.log(data.txid);
						this.wallet.network = number(parseFloat(this.wallet.network) + parseFloat(amount));
						vm.response.ok = "Action Confirmed with Success. " + data.txid.substring(0, 22) + "..";
					} else {
						vm.response.error = "Internal Error! " + JSON.parse(json.error.split(': ')[1]).message;
						vm.wallet.network = number(parseFloat(vm.wallet.network) + parseFloat(amount));
					}
				}).catch(e => {
					vm.error = e;
					console.log(e);
				}).finally(() => {
					Progress.done();
					vm.activated = false;
				});
			}, 4400);
		},

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
