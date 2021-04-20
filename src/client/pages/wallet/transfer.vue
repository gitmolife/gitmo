<template>
    <div>

			<MkFolder>
				<template #header><Fa :icon="faBtc"/> CryptoWallet Transfer</template>
				<div class="contents">

					<MkContainer :body-togglable="true" class="_gap">
						<template #header><Fa :icon="faCartArrowDown"/> Network Transfer - <span class="monospace">OM <Fa :icon="faLongArrowAltRight"/> OHM</span></template>

						<div class="_content">
							<div class="_keyValue"><b>Current Tipping Balance</b><span class="monospace" style="font-size: 1.07em;">{{ bal_tip }} OM</span></div>
						</div>
						<div class="_content">
							<div class="_keyValue">
								<b>Convert OM Amount</b>
								<MkInput v-model:value="amountN" style="margin: 0; flex: 1;"><span class="monospace">Amount Network Wallet</span></MkInput>
							</div>
						</div>
						<div v-if="response_ohm_ok || response_ohm_pend || response_ohm_error" class="resp-div">
							<span class="resp-text-ack">{{ response_ohm_ok }}</span>
							<span class="resp-text-pend">{{ response_ohm_pend }}</span>
							<span class="resp-text-nack">{{ response_ohm_error }}</span>
						</div>
						<div class="info-div">
							<span class="info-text">This will convert OM into OHM.  Your Network balance will increase.</span>
						</div>
						<div style="width: 67%; margin: auto; padding-bottom: 20px; margin-bottom: 20px; text-shadow: -1px 1px 5px #777777;">
							<MkButton full @click="doTransfer('ohm')" style="color: black; background-color: #eda737; font-weight: 700;"><Fa :icon="faCaretSquareUp"/> Confirm Convert to OHM</MkButton>
						</div>
					</MkContainer>

          <MkContainer :body-togglable="true" class="_gap">
            <template #header><Fa :icon="faOm"/> Tipping Transfer - <span class="monospace">OHM <Fa :icon="faLongArrowAltRight"/> OM</span></template>

            <div class="_content">
              <div class="_keyValue"><b>Current Network Balance</b><span class="monospace" style="font-size: 1.07em;">{{ bal_net }} OHM</span></div>
            </div>
            <div class="_content">
              <div class="_keyValue">
								<b>Convert OHM Amount</b>
                <MkInput v-model:value="amountT" style="margin: 0; flex: 1;"><span class="monospace">Amount Tip Wallet</span></MkInput>
              </div>
            </div>
						<div v-if="response_om_ok || response_om_pend || response_om_error" class="resp-div">
							<span class="resp-text-ack">{{ response_om_ok }}</span>
							<span class="resp-text-pend">{{ response_om_pend }}</span>
							<span class="resp-text-nack">{{ response_om_error }}</span>
						</div>
						<div class="info-div">
							<span class="info-text">This will convert OHM into OM.  Your Network balance will decrease.</span>
						</div>
            <div id="conf-btn" style="width: 67%; margin: auto; padding-bottom: 20px; margin-bottom: 20px; text-shadow: -1px 1px 4px #777777;">
              <MkButton full @click="doTransfer('om')" style="color: black; background-color: #4897f7; font-weight: 700;"><Fa :icon="faCaretSquareDown"/> Confirm Convert to OM</MkButton>
            </div>
          </MkContainer>

		    </div>
			</MkFolder>

    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import Progress from '@client/scripts/loading';
import { faOm, faLongArrowAltRight, faCartArrowDown, faCaretSquareUp, faCaretSquareDown } from '@fortawesome/free-solid-svg-icons';
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
			bal_tip: '0',
			bal_net: '0',
			amountT: null,
			amountN: null,
			error: null,
			activated: false,
			response_ohm_error: null,
			response_ohm_pend: null,
			response_ohm_ok: null,
			response_om_error: null,
			response_om_pend: null,
			response_om_ok: null,
			faBtc, faOm, faLongArrowAltRight, faCartArrowDown, faCaretSquareUp, faCaretSquareDown
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
      os.api('wallet/balance').then(balances => {
        //console.log(balances);
				this.bal_tip = parseFloat(balances.tipping);
				this.bal_net = parseFloat(balances.network);
      }).catch(e => {
        this.error = e;
      }).finally(() => {
        Progress.done();
      });
    },

		doTransfer(type: string) {
			if (this.activated) {
				if (type === 'ohm') {
					this.response_ohm_error = 'Already Busy.. ' + (this.error ? 'Error' : '');
				} else {
					this.response_om_error = 'Already Busy.. ' + (this.error ? 'Error' : '');
				}
				return;
			}
			let amount = this.amountT ? this.amountT : this.amountN;
			if (parseFloat(amount) <= 0) {
				if (type === 'ohm') {
					this.response_ohm_error = 'Invalid Number Entered for Action..';
				} else {
					this.response_om_error = 'Invalid Number Entered for Action..';
				}
				return;
			}
			Progress.start();
			this.activated = true;
			this.error = null;
			this.amountT = null;
			this.amountN = null;
			this.response_ohm_error = null;
			this.response_ohm_pend = null;
			this.response_ohm_ok = null;
			this.response_om_error = null;
			this.response_om_pend = null;
			this.response_om_ok = null;
			if (type === 'ohm') {
				this.response_ohm_pend = 'Processing Request..';
			} else {
				this.response_om_pend = 'Processing Request..';
			}
			os.api('wallet/transfer', { type, amount }).then(resp => {
				this.response_ohm_error = null;
				this.response_ohm_pend = null;
				this.response_ohm_ok = null;
				this.response_om_error = null;
				this.response_om_pend = null;
				this.response_om_ok = null;
				if (resp.error) {
					//console.log(resp.error);
					if (type === 'ohm') {
						this.response_ohm_pend = "Error."
						this.response_ohm_error = resp.error;
					} else {
						this.response_om_pend = "Error."
						this.response_om_error = resp.error;
					}
					//this.timeoutUpdateAck(type, '', amount);
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
					if (type === 'ohm') {
						this.response_ohm_ok = "Action Attempt...";
						this.response_ohm_pend = "Processing.. Please Wait."
						this.bal_tip = number(parseFloat(this.bal_tip) - parseFloat(amount));
					} else {
						this.response_om_ok = "Action Attempt...";
						this.response_om_pend = "Processing.. Please Wait."
						this.bal_net = number(parseFloat(this.bal_net) - parseFloat(amount));
					}
					this.timeoutUpdateAck(type, resp.data, amount);
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
				vm.response_ohm_error = null;
				vm.response_ohm_pend = null;
				vm.response_ohm_ok = null;
				vm.response_om_error = null;
				vm.response_om_pend = null;
				vm.response_om_ok = null;
				os.api('wallet/job', { jobId, jobData }).then(resp => {
					let json = JSON.parse(resp);
					if (!json.error) {
						let data = JSON.parse(json.data);
						//console.log(data);
						if (!data.error) {
							let res = JSON.parse(data.data);
							console.log(res.txid);
							if (type === 'ohm') {
								let bn = parseFloat(vm.bal_net);
								vm.bal_net = number(bn + parseFloat(amount));
								vm.response_ohm_ok = "Action Confirmed Process Success. " + res.txid.substring(0, 22) + "..";
							} else {
								let bt = parseFloat(vm.bal_tip);
								vm.bal_tip = number(bt + parseFloat(amount));
								vm.response_om_ok = "Action Confirmed Process Success. " + res.txid.substring(0, 22) + "..";
							}
						} else {
							console.log(data.error);
							if (type === 'ohm') {
								vm.response_ohm_error = "Internal Error! " + data.error;
								vm.bal_tip = number(parseFloat(vm.bal_tip) + parseFloat(amount)); // add back
							} else {
								vm.response_om_error = "Internal Error! " + data.error;
								vm.bal_net = number(parseFloat(vm.bal_net) + parseFloat(amount)); // add back
							}
						}
						setTimeout(function () {
							vm.response_ohm_error = null;
							vm.response_ohm_pend = null;
							vm.response_ohm_ok = null;
							vm.response_om_error = null;
							vm.response_om_pend = null;
							vm.response_om_ok = null;
						}, 33000);
					} else {
						console.log(json.error);
						if (type === 'ohm') {
							vm.response_ohm_error = "Internal Error Occurred!";
							vm.bal_tip = number(parseFloat(vm.bal_tip) + parseFloat(amount)); // add back
						} else {
							vm.response_om_error = "Internal Error Occurred!";
							vm.bal_net = number(parseFloat(vm.bal_net) + parseFloat(amount)); // add back
						}
					}
	      }).catch(e => {
	        vm.error = e;
					console.log(e);
	      }).finally(() => {
	        Progress.done();
					vm.activated = false;
	      });
      }, 16400);
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
