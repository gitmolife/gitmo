<template>
		<div>
			<MkFolder>
				<template #header><i class="fab fa-btc"></i> CryptoWallet Transfer</template>
				<div class="contents" styyle="margin-bottom: 20px;">

					<MkContainer :foldable="true">
						<template #header><i class="fas fa-om"></i> Tipping - <span class="monospace">OHM</span></template>

						<div class="_content">
							<div class="_keyValue"><b>Current Tipping Balance</b><span class="monospace" style="font-size: 1.07em;">{{ bal_tip }} OHM</span></div>
						</div>
						<div class="_content">
							<div class="_keyValue">
								<b>Send Tip to: <span style="opacity=0.80; padding: 7px; font-size: 1.07em;">{{ otherName }}</span></b>
								<MkInput v-model:value="amount" style="margin: 0; flex: 1;"><span class="monospace">Amount Tip</span></MkInput>
							</div>
						</div>
						<div v-if="response_om_ok || response_om_pend || response_om_error" class="resp-div">
							<span class="resp-text-pend">{{ response_om_pend }}</span>
							<span class="resp-text-ack">{{ response_om_ok }}</span>
							<span class="resp-text-nack">{{ response_om_error }}</span>
						</div>
						<div class="info-div">
							<span class="info-text">This will 'tip' OHM to another user. Your Tipping balance will decrease.</span>
						</div>
						<div id="conf-btn" style="width: 67%; margin: auto; padding-bottom: 20px; margin-bottom: 4px; text-shadow: -1px 1px 4px #777777;">
							<MkButton full primary @click="doTip()" style="color: black; background-color: #48f7c3; font-weight: 700;">Confirm and Process Tip <i class="fas fa-money-bill-wave-alt"></i></MkButton>
						</div>
					</MkContainer>

				</div>
			</MkFolder>
		</div>
</template>

<script lang="ts">
import { defineComponent, } from 'vue';
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
		otherId: {
			type: String,
			required: true
		},
		otherName: {
			type: String,
			required: true
		},
	},

	data() {
		return {
			[symbols.PAGE_INFO]: {
				title: 'CryptoWallet Tip',
			},
			otherId: this.$props.otherId,
			bal_tip: '0',
			amount: null,
			error: null,
			activated: false,
			response_om_error: null,
			response_om_pend: null,
			response_om_ok: null,
		};
	},

	watch: {

	},

	created() {
		this.fetch();
	},

	methods: {

		fetch() {
			Progress.start();
			os.api('wallet/balance').then(balances => {
				//console.log(balances);
				this.bal_tip = Number(balances.tipping);
				//this.bal_net = Number(balances.network);
			}).catch(e => {
				this.error = e;
				this.response_om_error = "Error Fetching Balance!";
			}).finally(() => {
				Progress.done();
			});
		},

		doTip() {
			const tmin = 0.00100000;
			if (this.activated) {
				this.response_om_pend = "Tip Processing.. Busy!";
				return;
			}
			try {
				if (this.amount === null || !this.amount || Number(this.amount) <= 0) {
					this.response_om_pend = "Input Number must be valid and above zero.";
					return;
				}
				if (!this.isNumeric(this.amount)) {
					this.response_om_pend = "Input Amount must be valid number greater than \'" + tmin + "\' coins.";
					return;
				}
			} catch (e) {
				this.response_om_pend = "Input cannot be parsed to Number..";
				return;
			}
			if (Number(this.amount) <= tmin) {
				this.response_om_pend = "Sorry, Amount must be above \'" + tmin + "\' coins.";
				return;
			}
			if (Number(this.amount) > 10000000) {
				this.response_om_pend = "Number too high.. Please use a smaller amount.";
				return;
			}
			if (Number(this.bal_tip) - Number(this.amount) <= 0 || Number(this.amount) > Number(this.bal_tip)) {
				this.response_om_pend = "Amount greater than your available balance.	Please use a smaller amount.";
			}
			Progress.start();
			this.activated = true;
			let other: string = this.otherId;
			let amount: string = this.amount;
			this.response_om_error = null;
			this.response_om_ok = null;
			this.response_om_pend = "Tip Processing..";
			os.api('wallet/tip', { other, amount }).then(resp => {
				this.bal_tip = resp.ourUser;
				this.amount = null;
				this.response_om_ok = "Send \'" + amount + "\' to \'" + this.otherName + "\' Processed Complete.";
				this.dispose();
			}).catch(e => {
				this.error = e;
				console.error(e);
				this.response_om_error = "Tip Error!";
			}).finally(() => {
				Progress.done();
				this.activated = false;
			});
		},

		isNumeric(val: any): boolean {
			return !(val instanceof Array) && (val - Number(val) + 1) >= 0;
		},

		dispose() {
			console.log("> disposing modal..");
			os.success();
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
	font-style: bold;
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
